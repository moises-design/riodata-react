import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'
import AuthModal from '../components/AuthModal'
import {
  fetchBorderWaitTimes,
  fetchFREDRegional,
  fetchRegionalNews,
  fredVal,
  fmtGDP,
} from '../lib/apis'

// ── helpers ───────────────────────────────────────────────────────────────────
const SECTOR_COLORS = {
  Energy:        'bg-[#F2E8E3] text-[#B8431E]',
  Government:    'bg-[#E3F0F1] text-[#1A6B72]',
  Technology:    'bg-[#EDE8F8] text-[#5B3FA6]',
  Healthcare:    'bg-[#E4F0EA] text-[#2A6B43]',
  Manufacturing: 'bg-[#FBF4E3] text-[#B07D1A]',
  Construction:  'bg-[#E3F0F1] text-[#1A6B72]',
  Logistics:     'bg-[#F2E8E3] text-[#B8431E]',
}

const ALERT_STYLE = {
  red:    { ring: 'border-red-200 bg-red-50',       text: 'text-red-700',    dot: 'bg-red-500'      },
  yellow: { ring: 'border-amber-200 bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'    },
  green:  { ring: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  blue:   { ring: 'border-[#B8D8DC] bg-[#E3F0F1]', text: 'text-[#1A6B72]',  dot: 'bg-[#1A6B72]'   },
}

function SectorBadge({ sector }) {
  const cls = SECTOR_COLORS[sector] ?? 'bg-[#E3F0F1] text-[#1A6B72]'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${cls}`}>{sector}</span>
}

function Skeleton({ className = '' }) {
  return <div className={`bg-[#E8E4DF] rounded animate-pulse ${className}`} />
}

const DEMO_OPPS = [
  { id: 1, title: 'Port of Brownsville LNG Phase 3',   sector: 'Energy',      budget: '$420M', location: 'Brownsville, TX',  status: 'Open' },
  { id: 2, title: 'Laredo International Bridge Exp.',  sector: 'Government',  budget: '$85M',  location: 'Laredo, TX',        status: 'Open' },
  { id: 3, title: 'SpaceX Starbase Facility Expansion',sector: 'Technology',  budget: '$220M', location: 'Brownsville, TX',  status: 'Open' },
]

// ── component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user,         setUser]         = useState(null)
  const [profile,      setProfile]      = useState(null)
  const [company,      setCompany]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [authModal,    setAuthModal]    = useState(null)

  // dashboard sections
  const [stats,        setStats]        = useState(null)   // {companyCount, oppCount, gdp, avgWait}
  const [recentOpps,   setRecentOpps]   = useState(null)   // null = loading, [] = empty
  const [savedCos,     setSavedCos]     = useState(null)   // {saved: bool, companies: []}
  const [alerts,       setAlerts]       = useState(null)

  const navigate = useNavigate()

  // ── auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load(session) {
      if (!session) { setLoading(false); return }
      setUser(session.user)
      try {
        const [{ data: prof }, { data: comp }] = await Promise.all([
          sb.from('profiles').select('*').eq('id', session.user.id).single(),
          sb.from('companies').select('*').eq('contact_email', session.user.email).single(),
        ])
        setProfile(prof)
        setCompany(comp)
      } catch (err) {
        console.error('Dashboard auth load:', err)
      } finally {
        setLoading(false)
      }
    }

    sb.auth.getSession().then(({ data: { session } }) => load(session))

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') { setAuthModal(null); setLoading(true); load(session) }
      else if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); setCompany(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── dashboard data (after auth) ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    Promise.allSettled([
      // [0] company count
      sb.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      // [1] opp count
      sb.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      // [2] recent opps
      sb.from('projects').select('id,title,sector,budget,location,status').eq('status', 'active')
        .order('created_at', { ascending: false }).limit(3),
      // [3] saved or featured companies
      loadSavedOrFeatured(),
      // [4] CBP wait times
      fetchBorderWaitTimes().catch(() => null),
      // [5] FRED GDP
      fetchFREDRegional().catch(() => null),
      // [6] news
      fetchRegionalNews().catch(() => null),
      // [7] new companies this week
      sb.from('companies').select('*', { count: 'exact', head: true })
        .eq('status', 'active').gte('created_at', weekAgo),
    ]).then(results => {
      const val  = (i) => results[i].status === 'fulfilled' ? results[i].value : null
      const ok   = (i) => results[i].status === 'fulfilled'

      // Stats
      const companyCount = ok(0) ? (val(0).count ?? 269) : 269
      const oppCount     = ok(1) ? (val(1).count ?? null) : null
      const cbpData      = val(4)
      const fredData     = val(5)

      let avgWait = null
      if (cbpData) {
        const waits = cbpData
          .flatMap(g => g.crossings)
          .filter(c => c.pvWait != null)
          .map(c => c.pvWait)
        if (waits.length) avgWait = Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
      }

      let gdp = '$49.5B'
      if (fredData) {
        const m = fredVal(fredData, 'mcallen_gdp')
        const l = fredVal(fredData, 'laredo_gdp')
        const b = fredVal(fredData, 'brownsville_gdp')
        if (m && l && b) gdp = fmtGDP(m + l + b)
      }

      setStats({ companyCount, oppCount, gdp, avgWait })

      // Opportunities
      if (ok(2)) {
        const rows = val(2).data || []
        setRecentOpps(rows.length > 0 ? rows : DEMO_OPPS)
      } else {
        setRecentOpps(DEMO_OPPS)
      }

      // Saved / featured companies
      if (ok(3)) setSavedCos(val(3))
      else        setSavedCos({ saved: false, companies: [] })

      // Alerts
      const newsData    = val(6)
      const newCoCount  = ok(7) ? (val(7).count ?? 0) : 0
      const maxWait     = cbpData
        ? Math.max(...cbpData.flatMap(g => g.crossings).filter(c => c.pvWait != null).map(c => c.pvWait), 0)
        : null

      const built = []

      if (avgWait != null) {
        const lvl = avgWait > 45 ? 'red' : avgWait > 25 ? 'yellow' : 'green'
        const msg = avgWait > 45 ? 'High Border Wait Times' : avgWait > 25 ? 'Elevated Wait Times' : 'Normal Border Traffic'
        built.push({
          id: 'border', level: lvl, icon: '🚗', title: msg,
          body: `Avg. passenger wait: ${avgWait} min${maxWait && maxWait !== avgWait ? ` · Peak: ${maxWait} min` : ''}`,
        })
      }

      if (newCoCount > 0) {
        built.push({
          id: 'newcos', level: 'green', icon: '🏢',
          title: `${newCoCount} New ${newCoCount === 1 ? 'Business' : 'Businesses'} This Week`,
          body: 'New companies registered in the RioData directory.',
        })
      }

      if (newsData?.length) {
        built.push({
          id: 'news', level: 'blue', icon: '📰',
          title: 'Latest Regional News',
          body: newsData[0].title,
          link: newsData[0].url,
        })
      }

      built.push({
        id: 'market', level: 'green', icon: '📈',
        title: 'Market Conditions: Growing',
        body: 'South Texas metros showing positive employment trends Q1 2025.',
      })

      if (built.length < 4) {
        built.push({
          id: 'starbase', level: 'blue', icon: '🚀',
          title: 'Starbase Launch Activity',
          body: 'SpaceX Starbase expansion continues — 8 launches projected in 2025.',
        })
      }

      setAlerts(built)
    })
  }, [user])   // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSavedOrFeatured() {
    let savedIds = []
    try { savedIds = JSON.parse(localStorage.getItem('rd_bookmarks') || '[]') } catch {}

    if (savedIds.length) {
      const { data } = await sb.from('companies').select('*').in('id', savedIds).limit(3)
      if (data?.length) return { saved: true, companies: data }
    }

    const { data } = await sb.from('companies').select('*')
      .eq('status', 'active').eq('ready_to_work', true).limit(3)
    return { saved: false, companies: data || [] }
  }

  // ── sign-out (used only in case nav doesn't cover it) ─────────────────────
  // (Sign Out button removed from dashboard per spec — navbar handles it)

  // ── loading / unauthenticated screens ─────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE]">
      <div className="w-8 h-8 border-2 border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-[#E3F0F1] flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
        <h2 className="font-serif text-2xl font-bold text-[#0F0F0E] mb-2">Sign in to your dashboard</h2>
        <p className="text-sm text-[#5C5C54] mb-6">Track your business, discover opportunities, and access regional intelligence.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setAuthModal('signin')}
            className="px-5 py-2.5 border border-[#E2DDD6] rounded-lg text-sm font-medium text-[#0F0F0E] hover:border-[#5C5C54] bg-white transition">
            Sign In
          </button>
          <button onClick={() => setAuthModal('signup')}
            className="px-5 py-2.5 rounded-lg bg-[#1A6B72] text-white text-sm font-semibold hover:bg-[#155960] transition">
            Join Free
          </button>
        </div>
      </div>
      {authModal && <AuthModal initialTab={authModal} onClose={() => setAuthModal(null)} />}
    </div>
  )

  // ── derived display values ─────────────────────────────────────────────────
  const firstName   = profile?.full_name?.split(' ')[0] ?? user.email.split('@')[0]
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const today       = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const alertCount  = alerts?.filter(a => a.level === 'red' || a.level === 'yellow').length ?? 0

  const waitColor = stats?.avgWait == null ? 'text-[#B07D1A]'
    : stats.avgWait > 45 ? 'text-red-600'
    : stats.avgWait > 25 ? 'text-amber-600'
    : 'text-[#2A6B43]'

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="text-xs font-medium text-[#888780] mb-1 uppercase tracking-widest">{today}</div>
          <h1 className="font-serif text-4xl font-bold text-[#0F0F0E] mb-2">
            Welcome back, {firstName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-[#5C5C54]">McAllen region</span>
            <span className="text-[#D4D0CA]">·</span>
            {alertCount > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                {alertCount} active {alertCount === 1 ? 'alert' : 'alerts'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#5C5C54]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                No active alerts
              </span>
            )}
            <span className="text-[#D4D0CA]">·</span>
            <span className="text-emerald-600 font-medium">Market conditions: Growing</span>
          </div>
        </div>

        {/* ── QUICK STATS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: '🏢', label: 'Companies in Directory', sub: 'Verified & active',
              value: stats ? stats.companyCount.toLocaleString() : null,
              color: 'text-[#1A6B72]',
            },
            {
              icon: '📋', label: 'Active Opportunities', sub: 'Open for bids',
              value: stats ? (stats.oppCount != null ? String(stats.oppCount) : '—') : null,
              color: 'text-[#5B3FA6]',
            },
            {
              icon: '📊', label: 'Regional GDP', sub: '3-metro combined',
              value: stats ? stats.gdp : null,
              color: 'text-[#2A6B43]',
            },
            {
              icon: '🚗', label: 'Avg Border Wait', sub: 'Passenger vehicles · live',
              value: stats ? (stats.avgWait != null ? `${stats.avgWait} min` : '—') : null,
              color: waitColor,
            },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
              <div className="text-xl mb-3">{s.icon}</div>
              {s.value != null
                ? <div className={`font-serif text-2xl font-bold leading-none mb-1 ${s.color}`}>{s.value}</div>
                : <Skeleton className="h-7 w-20 mb-1" />
              }
              <div className="text-xs font-semibold text-[#0F0F0E]">{s.label}</div>
              <div className="text-[11px] text-[#B8B4AE] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── YOUR BUSINESS ───────────────────────────────────────────────── */}
        {company ? (
          <div className="bg-white border border-[#E2DDD6] rounded-2xl px-6 py-5 mb-8 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1A6B72] mb-0.5">Your Business</div>
              <div className="font-serif text-lg font-bold text-[#0F0F0E] truncate">{company.legal_name}</div>
              <div className="text-xs text-[#5C5C54] mt-0.5">
                📍 {company.city}{company.state_province ? ', ' + company.state_province : ''} · {company.sector}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {company.ready_to_work && <span className="px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded-full text-[10px] font-bold">Ready to Work</span>}
                {company.cert_sam      && <span className="px-2 py-0.5 bg-[#E3F0F1] text-[#1A6B72] rounded-full text-[10px] font-bold">SAM</span>}
                {company.cert_hubzone  && <span className="px-2 py-0.5 bg-[#E3F0F1] text-[#1A6B72] rounded-full text-[10px] font-bold">HUBZone</span>}
                {company.cert_immex    && <span className="px-2 py-0.5 bg-[#E3F0F1] text-[#1A6B72] rounded-full text-[10px] font-bold">IMMEX</span>}
              </div>
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${company.status === 'active' ? 'bg-[#E4F0EA] text-[#2A6B43]' : 'bg-[#FBF4E3] text-[#B07D1A]'}`}>
              {company.status === 'active' ? '✅ Active' : '⏳ Pending'}
            </span>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-[#C8C4BE] rounded-2xl px-6 py-5 mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#888780] mb-0.5">Your Business</div>
              <div className="font-semibold text-sm text-[#0F0F0E]">Not listed yet</div>
              <div className="text-xs text-[#888780] mt-0.5">Get discovered by projects, partners, and buyers across the region.</div>
            </div>
            <button onClick={() => navigate('/onboarding')}
              className="shrink-0 px-4 py-2 bg-[#1A6B72] text-white rounded-lg text-sm font-semibold hover:bg-[#155960] transition">
              Register Free →
            </button>
          </div>
        )}

        {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* ─ LEFT COL (2/3) ─ Recent Opps + Saved Companies */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Recent Opportunities */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
                <div className="font-semibold text-sm text-[#0F0F0E]">Recent Opportunities</div>
                <Link to="/opportunities" className="text-xs font-medium text-[#1A6B72] hover:underline">View all →</Link>
              </div>

              {recentOpps === null ? (
                <div className="p-6 flex flex-col gap-3">
                  {[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <div className="divide-y divide-[#F7F4F0]">
                  {recentOpps.map(o => (
                    <div key={o.id} className="px-6 py-4 hover:bg-[#FDFAF8] transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[#0F0F0E] leading-snug truncate">{o.title}</div>
                          <div className="text-xs text-[#888780] mt-0.5">📍 {o.location}{o.budget ? ` · 💰 ${o.budget}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {o.sector && <SectorBadge sector={o.sector} />}
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded">
                            {o.status || 'Open'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved / Featured Companies */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
                <div className="font-semibold text-sm text-[#0F0F0E]">
                  {savedCos?.saved ? 'Saved Companies' : 'Featured Businesses'}
                </div>
                <Link to="/directory" className="text-xs font-medium text-[#1A6B72] hover:underline">Browse all →</Link>
              </div>

              {savedCos === null ? (
                <div className="p-6 flex flex-col gap-3">
                  {[0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : savedCos.companies.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-3xl mb-2">🏢</div>
                  <div className="text-sm text-[#5C5C54] mb-1">No featured businesses yet</div>
                  <Link to="/directory" className="text-xs text-[#1A6B72] hover:underline">Explore the directory →</Link>
                </div>
              ) : (
                <div className="divide-y divide-[#F7F4F0]">
                  {savedCos.companies.map(c => (
                    <div key={c.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-[#FDFAF8] transition">
                      <div className="w-9 h-9 rounded-lg bg-[#E3F0F1] flex items-center justify-center font-bold text-sm text-[#1A6B72] shrink-0">
                        {(c.legal_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[#0F0F0E] truncate">{c.legal_name}</div>
                        <div className="text-xs text-[#888780]">
                          {c.city}{c.state_province ? ', ' + c.state_province : ''}{c.sector ? ' · ' + c.sector : ''}
                        </div>
                      </div>
                      {c.ready_to_work && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded-full shrink-0">Ready</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ─ RIGHT COL (1/3) ─ Alerts + Account */}
          <div className="flex flex-col gap-6">

            {/* Regional Alerts */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F0EDE8] flex items-center justify-between">
                <div className="font-semibold text-sm text-[#0F0F0E]">Regional Alerts</div>
                {alertCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                    {alertCount} alert{alertCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {alerts === null ? (
                <div className="p-4 flex flex-col gap-2">
                  {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-2">
                  {alerts.map(a => {
                    const s = ALERT_STYLE[a.level] || ALERT_STYLE.blue
                    return (
                      <div key={a.id} className={`rounded-xl border p-3 ${s.ring}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm leading-none mt-0.5 shrink-0">{a.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-[11px] font-bold mb-0.5 ${s.text}`}>{a.title}</div>
                            <div className="text-[11px] text-[#5C5C54] leading-relaxed">
                              {a.link
                                ? <a href={a.link} target="_blank" rel="noreferrer" className="hover:underline line-clamp-2">{a.body}</a>
                                : <span className="line-clamp-2">{a.body}</span>
                              }
                            </div>
                          </div>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${s.dot}`}></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Account */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#888780] mb-4">Account</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-[#1A6B72] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[#0F0F0E] truncate">{profile?.full_name || user.email.split('@')[0]}</div>
                  <div className="text-xs text-[#888780] truncate">{user.email}</div>
                </div>
              </div>

              <div className="space-y-2 pb-4 mb-4 border-b border-[#F0EDE8]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888780]">Member since</span>
                  <span className="font-medium text-[#5C5C54]">{memberSince}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888780]">Account status</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>
              </div>

              <button
                className="w-full py-2 rounded-lg border border-[#E2DDD6] text-xs font-semibold text-[#5C5C54] hover:border-[#1A6B72] hover:text-[#1A6B72] transition">
                Edit Profile
              </button>
            </div>

          </div>
        </div>

        {/* ── QUICK LINKS ─────────────────────────────────────────────────── */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#888780] mb-4">Quick Links</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '📊', title: 'Analytics',        desc: 'Economic data & market trends',   path: '/analytics'     },
              { icon: '🔍', title: 'Company Directory', desc: 'Find & connect with businesses',  path: '/directory'     },
              { icon: '📋', title: 'Opportunities',     desc: 'Active project bids & listings',  path: '/opportunities' },
              { icon: '🗺️', title: 'Interactive Map',   desc: 'Regional infrastructure map',     path: '/map'           },
            ].map(a => (
              <button key={a.title} onClick={() => navigate(a.path)}
                className="bg-white border border-[#E2DDD6] rounded-xl p-5 text-left hover:border-[#1A6B72] hover:-translate-y-0.5 hover:shadow-md transition-all group">
                <div className="text-2xl mb-3">{a.icon}</div>
                <div className="font-semibold text-sm text-[#0F0F0E] group-hover:text-[#1A6B72] transition">{a.title}</div>
                <div className="text-xs text-[#B8B4AE] mt-0.5">{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
