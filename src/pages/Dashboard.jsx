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
import {
  fetchSavedCompanies,
  unsaveCompany,
  fetchWatchlist,
  removeWatch,
  fetchActivity,
  upsertProfile,
  calcSteps,
  ROLES,
  ACTIVITY_CONFIG,
  SECTOR_SNAPSHOT,
  logActivity,
  timeAgo,
} from '../lib/db'

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
  red:    { ring: 'border-red-200 bg-red-50',         text: 'text-red-700',    dot: 'bg-red-500'      },
  yellow: { ring: 'border-amber-200 bg-amber-50',     text: 'text-amber-700',  dot: 'bg-amber-400'    },
  green:  { ring: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500'  },
  blue:   { ring: 'border-[#B8D8DC] bg-[#E3F0F1]',   text: 'text-[#1A6B72]',  dot: 'bg-[#1A6B72]'   },
}

function SectorBadge({ sector }) {
  const cls = SECTOR_COLORS[sector] ?? 'bg-[#E3F0F1] text-[#1A6B72]'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${cls}`}>{sector}</span>
}

function Skeleton({ className = '' }) {
  return <div className={`bg-[#E8E4DF] rounded animate-pulse ${className}`} />
}

const DEMO_OPPS = [
  { id: 1, title: 'Port of Brownsville LNG Phase 3',   sector: 'Energy',     budget: '$420M', location: 'Brownsville, TX', status: 'Open' },
  { id: 2, title: 'Laredo International Bridge Exp.',  sector: 'Government', budget: '$85M',  location: 'Laredo, TX',      status: 'Open' },
  { id: 3, title: 'SpaceX Starbase Facility Expansion',sector: 'Technology', budget: '$220M', location: 'Brownsville, TX', status: 'Open' },
]

const ONBOARDING_DISMISSED_KEY = 'rd_onboarding_dismissed'

// ── component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user,           setUser]           = useState(null)
  const [profile,        setProfile]        = useState(null)
  const [company,        setCompany]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [authModal,      setAuthModal]      = useState(null)

  // sections
  const [stats,          setStats]          = useState(null)
  const [recentOpps,     setRecentOpps]     = useState(null)
  const [savedCos,       setSavedCos]       = useState(null)   // [] once loaded
  const [watchlist,      setWatchlist]      = useState(null)   // [] once loaded
  const [activity,       setActivity]       = useState(null)   // [] once loaded
  const [alerts,         setAlerts]         = useState(null)

  // UI state
  const [digestToggling, setDigestToggling] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => Boolean(localStorage.getItem(ONBOARDING_DISMISSED_KEY))
  )

  const navigate = useNavigate()

  // ── auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init(session) {
      if (!session) { setLoading(false); return }
      setUser(session.user)
      try {
        const [{ data: prof }, { data: comp }] = await Promise.all([
          sb.from('profiles').select('*').eq('id', session.user.id).single(),
          sb.from('companies').select('*').eq('contact_email', session.user.email).single(),
        ])
        setProfile(prof)
        setCompany(comp)
      } catch { /* profile/company may not exist yet */ }
      finally { setLoading(false) }
    }

    sb.auth.getSession().then(({ data: { session } }) => init(session))

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN')  { setAuthModal(null); setLoading(true); init(session) }
      if (event === 'SIGNED_OUT') { setUser(null); setProfile(null); setCompany(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── dashboard data (requires auth) ────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    Promise.allSettled([
      // [0] company count
      sb.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      // [1] opp count
      sb.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      // [2] recent opps
      sb.from('projects').select('id,title,sector,budget,location,status')
        .eq('status', 'active').order('created_at', { ascending: false }).limit(3),
      // [3] saved companies (Supabase)
      fetchSavedCompanies(user.id),
      // [4] watchlist
      fetchWatchlist(user.id),
      // [5] activity feed
      fetchActivity(user.id, 5),
      // [6] CBP wait times
      fetchBorderWaitTimes().catch(() => null),
      // [7] FRED GDP
      fetchFREDRegional().catch(() => null),
      // [8] news
      fetchRegionalNews().catch(() => null),
      // [9] new companies this week
      sb.from('companies').select('*', { count: 'exact', head: true })
        .eq('status', 'active').gte('created_at', weekAgo),
    ]).then(results => {
      const val = (i) => results[i].status === 'fulfilled' ? results[i].value : null
      const ok  = (i) => results[i].status === 'fulfilled'

      // ── Stats ──
      const companyCount = ok(0) ? (val(0).count ?? 269) : 269
      const oppCount     = ok(1) ? (val(1).count ?? null) : null
      const cbpData      = val(6)
      const fredData     = val(7)

      let avgWait = null
      if (cbpData) {
        const waits = cbpData.flatMap(g => g.crossings).filter(c => c.pvWait != null).map(c => c.pvWait)
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

      // ── Recent Opportunities ──
      if (ok(2)) {
        const rows = val(2).data || []
        setRecentOpps(rows.length > 0 ? rows : DEMO_OPPS)
      } else {
        setRecentOpps(DEMO_OPPS)
      }

      // ── Saved Companies ──
      setSavedCos(ok(3) ? (val(3) || []) : [])

      // ── Watchlist ──
      setWatchlist(ok(4) ? (val(4) || []) : [])

      // ── Activity ──
      setActivity(ok(5) ? (val(5) || []) : [])

      // ── Alerts ──
      const newsData   = val(8)
      const newCoCount = ok(9) ? (val(9).count ?? 0) : 0
      const maxWait    = cbpData
        ? Math.max(...cbpData.flatMap(g => g.crossings).filter(c => c.pvWait != null).map(c => c.pvWait), 0)
        : null

      const built = []
      if (avgWait != null) {
        const lvl = avgWait > 45 ? 'red' : avgWait > 25 ? 'yellow' : 'green'
        built.push({
          id: 'border', level: lvl, icon: '🚗',
          title: avgWait > 45 ? 'High Border Wait Times' : avgWait > 25 ? 'Elevated Wait Times' : 'Normal Border Traffic',
          body: `Avg. passenger wait: ${avgWait} min${maxWait && maxWait !== avgWait ? ` · Peak: ${maxWait} min` : ''}`,
        })
      }
      if (newCoCount > 0) {
        built.push({ id: 'newcos', level: 'green', icon: '🏢', title: `${newCoCount} New ${newCoCount === 1 ? 'Business' : 'Businesses'} This Week`, body: 'New companies registered in the RioData directory.' })
      }
      if (newsData?.length) {
        built.push({ id: 'news', level: 'blue', icon: '📰', title: 'Latest Regional News', body: newsData[0].title, link: newsData[0].url })
      }
      built.push({ id: 'market', level: 'green', icon: '📈', title: 'Market Conditions: Growing', body: 'South Texas metros showing positive employment trends Q1 2025.' })
      if (built.length < 4) {
        built.push({ id: 'starbase', level: 'blue', icon: '🚀', title: 'Starbase Launch Activity', body: 'SpaceX Starbase expansion continues — 8 launches projected in 2025.' })
      }
      setAlerts(built)
    })
  }, [user])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── email digest toggle ────────────────────────────────────────────────────
  async function toggleDigest() {
    if (!user || digestToggling) return
    setDigestToggling(true)
    const newVal = !(profile?.email_digest)
    try {
      const updated = await upsertProfile(user.id, { email_digest: newVal })
      setProfile(updated)
    } catch { /* ignore */ }
    finally { setDigestToggling(false) }
  }

  // ── remove saved company ───────────────────────────────────────────────────
  async function handleUnsave(companyId, companyName) {
    await unsaveCompany(user.id, companyId)
    setSavedCos(prev => (prev || []).filter(c => c.id !== companyId))
    logActivity(user.id, 'unsaved_company', companyName, companyId)
  }

  // ── remove watchlist item ─────────────────────────────────────────────────
  async function handleUnwatch(item) {
    await removeWatch(user.id, item.item_type, item.item_id)
    setWatchlist(prev => (prev || []).filter(w => !(w.item_type === item.item_type && w.item_id === item.item_id)))
  }

  // ── dismiss onboarding ─────────────────────────────────────────────────────
  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1')
    setOnboardingDismissed(true)
  }

  // ── loading / unauthenticated ──────────────────────────────────────────────
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
          <button onClick={() => setAuthModal('signin')} className="px-5 py-2.5 border border-[#E2DDD6] rounded-lg text-sm font-medium text-[#0F0F0E] hover:border-[#5C5C54] bg-white transition">Sign In</button>
          <button onClick={() => setAuthModal('signup')} className="px-5 py-2.5 rounded-lg bg-[#1A6B72] text-white text-sm font-semibold hover:bg-[#155960] transition">Join Free</button>
        </div>
      </div>
      {authModal && <AuthModal initialTab={authModal} onClose={() => setAuthModal(null)} />}
    </div>
  )

  // ── derived values ─────────────────────────────────────────────────────────
  const firstName   = profile?.full_name?.split(' ')[0] ?? user.email.split('@')[0]
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const today       = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const alertCount  = alerts?.filter(a => a.level === 'red' || a.level === 'yellow').length ?? 0

  const waitColor = stats?.avgWait == null ? 'text-[#B07D1A]'
    : stats.avgWait > 45 ? 'text-red-600'
    : stats.avgWait > 25 ? 'text-amber-600'
    : 'text-[#2A6B43]'

  const roleInfo = ROLES[profile?.role]

  // Completion fields
  const PROF_FIELDS = ['full_name', 'phone', 'role', 'sector', 'city', 'bio']
  const filledCount   = profile ? PROF_FIELDS.filter(f => profile[f] && String(profile[f]).trim()).length : 0
  const completionPct = Math.round((filledCount / PROF_FIELDS.length) * 100)

  // Onboarding steps
  const savedCount    = savedCos?.length ?? 0
  const watchOppCount = watchlist?.filter(w => w.item_type === 'opportunity').length ?? 0
  const steps         = calcSteps(user, profile, company, savedCount, watchOppCount)
  const stepsDone     = steps.filter(s => s.done).length
  const allDone       = stepsDone === steps.length

  // Sector snapshot
  const snapshot = SECTOR_SNAPSHOT[profile?.sector]

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="text-xs font-medium text-[#888780] mb-1 uppercase tracking-widest">{today}</div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="font-serif text-4xl font-bold text-[#0F0F0E]">Welcome back, {firstName}</h1>
            {roleInfo && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                {roleInfo.icon} {roleInfo.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[#FBF4E3] text-[#B07D1A] border border-[#E8D9A8]">
              ⭐ Explorer
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-[#5C5C54]">South Texas region</span>
            <span className="text-[#D4D0CA]">·</span>
            {alertCount > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {alertCount} active {alertCount === 1 ? 'alert' : 'alerts'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#5C5C54]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                No active alerts
              </span>
            )}
            <span className="text-[#D4D0CA]">·</span>
            <span className="text-emerald-600 font-medium">Market: Growing</span>
          </div>
        </div>

        {/* ── ONBOARDING PROGRESS BAR ─────────────────────────────────────── */}
        {!onboardingDismissed && !allDone && (
          <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-semibold text-sm text-[#0F0F0E] mb-0.5">Get started with RioData</div>
                <div className="text-xs text-[#888780]">{stepsDone} of {steps.length} steps complete</div>
              </div>
              <button onClick={dismissOnboarding} className="text-[#B8B4AE] hover:text-[#5C5C54] text-sm transition ml-4">✕</button>
            </div>
            <div className="w-full bg-[#E8E4DF] rounded-full h-1.5 mb-4">
              <div className="bg-[#1A6B72] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(stepsDone / steps.length) * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {steps.map(step => (
                <div key={step.id} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${step.done ? 'bg-[#E4F0EA] text-[#2A6B43]' : 'bg-[#F7F3EE] text-[#888780]'}`}>
                  <span className="shrink-0">{step.done ? '✅' : '○'}</span>
                  <span className="leading-tight">{step.label}</span>
                  {!step.done && step.href && (
                    <Link to={step.href} className="ml-auto shrink-0 font-semibold text-[#1A6B72] hover:underline">Go →</Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── QUICK STATS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '🏢', label: 'Companies in Directory', sub: 'Verified & active',       value: stats ? stats.companyCount.toLocaleString() : null, color: 'text-[#1A6B72]' },
            { icon: '📋', label: 'Active Opportunities',   sub: 'Open for bids',           value: stats ? (stats.oppCount != null ? String(stats.oppCount) : '—') : null, color: 'text-[#5B3FA6]' },
            { icon: '📊', label: 'Regional GDP',           sub: '3-metro combined',        value: stats ? stats.gdp : null, color: 'text-[#2A6B43]' },
            { icon: '🚗', label: 'Avg Border Wait',        sub: 'Passenger vehicles · live',value: stats ? (stats.avgWait != null ? `${stats.avgWait} min` : '—') : null, color: waitColor },
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
              <div className="text-xs text-[#5C5C54] mt-0.5">📍 {company.city}{company.state_province ? ', ' + company.state_province : ''} · {company.sector}</div>
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

          {/* ─ LEFT (2/3) ─ Saved Companies · Watchlist ─ */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Recent Opportunities */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
                <div className="font-semibold text-sm text-[#0F0F0E]">Recent Opportunities</div>
                <Link to="/opportunities" className="text-xs font-medium text-[#1A6B72] hover:underline">View all →</Link>
              </div>
              {recentOpps === null ? (
                <div className="p-6 flex flex-col gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
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
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded">{o.status || 'Open'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats?.oppCount === 0 && (
                    <div className="px-6 py-3 text-xs text-[#888780] border-t border-[#F7F4F0]">
                      <Link to="/opportunities" className="text-[#1A6B72] hover:underline font-medium">View all opportunities →</Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Saved Companies */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
                <div className="font-semibold text-sm text-[#0F0F0E]">Saved Companies</div>
                <Link to="/directory" className="text-xs font-medium text-[#1A6B72] hover:underline">Browse directory →</Link>
              </div>
              {savedCos === null ? (
                <div className="p-6 flex flex-col gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : savedCos.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="text-2xl mb-2">🔖</div>
                  <div className="text-sm text-[#5C5C54] mb-1">No saved companies yet</div>
                  <Link to="/directory" className="text-xs text-[#1A6B72] hover:underline">Bookmark companies from the directory →</Link>
                </div>
              ) : (
                <div className="divide-y divide-[#F7F4F0]">
                  {savedCos.map(c => (
                    <div key={c.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-[#FDFAF8] transition group">
                      <Link to={`/companies/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#E3F0F1] flex items-center justify-center font-bold text-sm text-[#1A6B72] shrink-0">
                          {(c.legal_name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[#0F0F0E] truncate group-hover:text-[#1A6B72] transition">{c.legal_name}</div>
                          <div className="text-xs text-[#888780]">{c.city}{c.state_province ? ', ' + c.state_province : ''}{c.sector ? ' · ' + c.sector : ''}</div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.ready_to_work && <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded-full">Ready</span>}
                        <button onClick={() => handleUnsave(c.id, c.legal_name)}
                          className="text-xs text-[#B8B4AE] hover:text-red-500 transition px-1" title="Remove bookmark">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Watchlist */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
                <div className="font-semibold text-sm text-[#0F0F0E]">Watchlist</div>
                <Link to="/opportunities" className="text-xs font-medium text-[#1A6B72] hover:underline">Browse opportunities →</Link>
              </div>
              {watchlist === null ? (
                <div className="p-6 flex flex-col gap-3">{[0,1].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : watchlist.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="text-2xl mb-2">⭐</div>
                  <div className="text-sm text-[#5C5C54] mb-1">Nothing in your watchlist</div>
                  <Link to="/opportunities" className="text-xs text-[#1A6B72] hover:underline">Follow opportunities to track them here →</Link>
                </div>
              ) : (
                <div className="divide-y divide-[#F7F4F0]">
                  {watchlist.map(w => (
                    <div key={`${w.item_type}:${w.item_id}`} className="px-6 py-3.5 flex items-center gap-3 hover:bg-[#FDFAF8] transition">
                      <span className="text-lg shrink-0">{w.item_type === 'opportunity' ? '📋' : '🏢'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[#0F0F0E] truncate">{w.item_title}</div>
                        <div className="text-xs text-[#888780] capitalize">{w.item_type} · {timeAgo(w.created_at)}</div>
                      </div>
                      <button onClick={() => handleUnwatch(w)}
                        className="text-xs text-[#B8B4AE] hover:text-red-500 transition px-1 shrink-0" title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ─ RIGHT (1/3) ─ Snapshot · Alerts · Account ─ */}
          <div className="flex flex-col gap-6">

            {/* Personalized Regional Snapshot */}
            {snapshot ? (
              <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#F0EDE8]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#888780]">{profile.sector} Snapshot</div>
                  <div className="font-semibold text-sm text-[#0F0F0E] mt-0.5">{snapshot.title}</div>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {snapshot.items.map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#888780] leading-none mb-0.5">{item.label}</div>
                        <div className="text-sm font-bold text-[#0F0F0E]">{item.value}</div>
                        {item.sub && <div className="text-[11px] text-[#B8B4AE]">{item.sub}</div>}
                      </div>
                      {item.href && (
                        <Link to={item.href} className="text-xs font-semibold text-[#1A6B72] hover:underline shrink-0">→</Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#C8C4BE] rounded-2xl p-5 text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-semibold text-[#0F0F0E] mb-1">Personalized Snapshot</div>
                <div className="text-xs text-[#888780] mb-3">Set your sector in your profile to see tailored regional data.</div>
                <Link to="/profile" className="text-xs text-[#1A6B72] hover:underline font-medium">Update profile →</Link>
              </div>
            )}

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
                <div className="p-4 flex flex-col gap-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
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
                              {a.link ? <a href={a.link} target="_blank" rel="noreferrer" className="hover:underline line-clamp-2">{a.body}</a> : <span className="line-clamp-2">{a.body}</span>}
                            </div>
                          </div>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${s.dot}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Account + Profile Completion */}
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

              {/* Profile completion */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#888780]">Profile completion</span>
                  <span className="font-bold text-[#1A6B72]">{completionPct}%</span>
                </div>
                <div className="w-full bg-[#E8E4DF] rounded-full h-1.5">
                  <div className="bg-[#1A6B72] h-1.5 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                </div>
              </div>

              <div className="space-y-2 pb-4 mb-4 border-b border-[#F0EDE8] text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#888780]">Member since</span>
                  <span className="font-medium text-[#5C5C54]">{memberSince}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#888780]">Saved companies</span>
                  <span className="font-medium text-[#5C5C54]">{savedCos?.length ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#888780]">Watching</span>
                  <span className="font-medium text-[#5C5C54]">{watchlist?.length ?? '—'}</span>
                </div>
              </div>

              {/* Email digest toggle */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-semibold text-[#0F0F0E]">Weekly Digest</div>
                  <div className="text-[11px] text-[#888780]">Email summary every Monday</div>
                </div>
                <button onClick={toggleDigest} disabled={digestToggling}
                  className={`relative w-10 rounded-full transition-colors ${profile?.email_digest ? 'bg-[#1A6B72]' : 'bg-[#D4D0CA]'}`}
                  style={{ height: '22px' }}>
                  <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${profile?.email_digest ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>

              <Link to="/profile"
                className="block w-full py-2 rounded-lg border border-[#E2DDD6] text-xs font-semibold text-center text-[#5C5C54] hover:border-[#1A6B72] hover:text-[#1A6B72] transition">
                Edit Profile →
              </Link>
            </div>

          </div>
        </div>

        {/* ── ACTIVITY FEED ───────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
            <div className="font-semibold text-sm text-[#0F0F0E]">Recent Activity</div>
          </div>
          {activity === null ? (
            <div className="p-6 flex flex-col gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : activity.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-sm text-[#5C5C54]">No activity yet. Save companies and follow opportunities to see your history here.</div>
            </div>
          ) : (
            <div className="divide-y divide-[#F7F4F0]">
              {activity.map((a, i) => {
                const cfg = ACTIVITY_CONFIG[a.action] || { icon: '•', label: a.action }
                return (
                  <div key={i} className="px-6 py-3 flex items-center gap-3 hover:bg-[#FDFAF8] transition">
                    <span className="text-base shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-[#5C5C54]">{cfg.label}</span>
                      {a.detail && <span className="text-xs text-[#888780]"> · {a.detail}</span>}
                    </div>
                    <span className="text-[11px] text-[#B8B4AE] shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── QUICK LINKS ─────────────────────────────────────────────────── */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#888780] mb-4">Quick Links</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: '📊', title: 'Analytics',      desc: 'Economic data & trends',  path: '/analytics'   },
              { icon: '🔍', title: 'Directory',       desc: 'Find & connect',          path: '/directory'   },
              { icon: '📋', title: 'Opportunities',   desc: 'Active bids & listings',  path: '/opportunities'},
              { icon: '🗺️', title: 'Map',             desc: 'Interactive company map', path: '/map'         },
              { icon: '⭐', title: 'Membership',      desc: 'Upgrade your plan',       path: '/membership'  },
            ].map(a => (
              <button key={a.title} onClick={() => navigate(a.path)}
                className="bg-white border border-[#E2DDD6] rounded-xl p-4 text-left hover:border-[#1A6B72] hover:-translate-y-0.5 hover:shadow-md transition-all group">
                <div className="text-2xl mb-2">{a.icon}</div>
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
