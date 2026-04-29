import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { fetchBorderWaitTimes, fetchRegionalNews, fetchSpaceXLaunches } from '../lib/apis'

// ─── County / Region cards ────────────────────────────────────────────────────
const COUNTIES = [
    {
        name: 'Hidalgo County',
        flag: '🇺🇸',
        population: '873K',
        seat: 'Edinburg',
        home: 'UTRGV, McAllen International Airport, Pharr International Bridge',
        sectors: ['Healthcare', 'Retail', 'Agriculture', 'Manufacturing'],
        img: '/images/hidalgo.jpeg',
    },
    {
        name: 'Cameron County',
        flag: '🇺🇸',
        population: '422K',
        seat: 'Brownsville',
        home: 'SpaceX Starbase, Port of Brownsville, TSTC',
        sectors: ['Energy/LNG', 'Aerospace', 'Logistics', 'Education'],
        img: '/images/cameron.jpeg',
    },
    {
        name: 'Starr County',
        flag: '🇺🇸',
        population: '65K',
        seat: 'Rio Grande City',
        home: 'Roma International Bridge, Rio Grande City port of entry',
        sectors: ['Agriculture', 'Government', 'Cross-border trade'],
        img: '/images/starr.jpeg',
    },
    {
        name: 'Willacy County',
        flag: '🇺🇸',
        population: '21K',
        seat: 'Raymondville',
        home: 'One of Texas\'s top agricultural producers, Willacy County Airport',
        sectors: ['Agriculture', 'Government', 'Healthcare'],
        img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=80',
    },
]

// ─── Regional leaders ─────────────────────────────────────────────────────────
const LEADERS = [
    { name: 'UTRGV', sub: 'Edinburg / Brownsville', sector: 'University', icon: '🎓', url: 'https://www.utrgv.edu' },
    { name: 'South Texas College', sub: 'McAllen, TX', sector: 'University', icon: '🎓', url: 'https://www.southtexascollege.edu' },
    { name: 'SpaceX Starbase', sub: 'Boca Chica, TX', sector: 'Aerospace', icon: '🚀', url: 'https://www.spacex.com' },
    { name: 'Doctors Hospital at Renaissance', sub: 'Edinburg, TX', sector: 'Healthcare', icon: '🏥', url: 'https://www.dhr-rgv.com' },
    { name: 'HEB', sub: 'McAllen, TX', sector: 'Retail', icon: '🛒', url: 'https://www.heb.com' },
    { name: 'McAllen EDC', sub: 'McAllen, TX', sector: 'Econ Dev', icon: '📈', url: 'https://www.mcallenedc.com' },
    { name: 'Brownsville EDC', sub: 'Brownsville, TX', sector: 'Econ Dev', icon: '📈', url: 'https://www.bedc.com' },
]

const LEADER_SECTOR_COLOR = {
    'University':  'bg-[#EDE8F8] text-[#5B3FA6]',
    'Aerospace':   'bg-[#E3F0F1] text-[#1A6B72]',
    'Healthcare':  'bg-[#E4F0EA] text-[#2A6B43]',
    'Retail':      'bg-[#FBF4E3] text-[#B07D1A]',
    'Econ Dev':    'bg-[#F2E8E3] text-[#B8431E]',
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
    {
        quote: 'RioData gives us the economic intelligence we need to make investment decisions in the RGV faster than any other platform.',
        author: 'Economic Developer',
        org: 'Hidalgo County',
        initials: 'ED',
        color: 'bg-[#1A6B72]',
    },
    {
        quote: 'Finally a platform that understands the binational nature of our region.',
        author: 'Manufacturing Executive',
        org: 'Reynosa',
        initials: 'ME',
        color: 'bg-[#B8431E]',
    },
    {
        quote: 'The border crossing data alone saves us hours every week in logistics planning.',
        author: 'Logistics Manager',
        org: 'South Texas',
        initials: 'LM',
        color: 'bg-[#5B3FA6]',
    },
]

// ─── Live activity feed items ─────────────────────────────────────────────────
const ACTIVITY_ITEMS = [
    { name: 'Dominion Construction', sub: 'McAllen, TX · Construction', badge: 'READY', color: 'bg-green-900/40 text-green-400' },
    { name: 'APTIV Reynosa', sub: 'Reynosa, TAM · Manufacturing', badge: 'IMMEX', color: 'bg-purple-900/40 text-purple-400' },
    { name: 'Port of Brownsville LNG Ph.3', sub: '$420M opportunity · Open', badge: 'ENERGY', color: 'bg-teal-900/40 text-teal-400' },
    { name: 'CBI Group Logistics', sub: 'Pharr, TX · Trade / Logistics', badge: 'SAM', color: 'bg-yellow-900/40 text-yellow-400' },
]

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(targetDate) {
    const [left, setLeft] = useState(null)
    useEffect(() => {
        if (!targetDate) return
        const tick = () => {
            const diff = new Date(targetDate) - Date.now()
            if (diff <= 0) { setLeft('Launched'); return }
            const d = Math.floor(diff / 86400000)
            const h = Math.floor((diff % 86400000) / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            setLeft(`${d}d ${h}h ${m}m`)
        }
        tick()
        const id = setInterval(tick, 60000)
        return () => clearInterval(id)
    }, [targetDate])
    return left
}

export default function Home() {
    const [counts,     setCounts]     = useState({ companies: 0, projects: 0 })
    const [avgWait,    setAvgWait]    = useState(null)
    const [newsItem,   setNewsItem]   = useState(null)
    const [spacex,     setSpacex]     = useState(null)

    useEffect(() => {
        // DB counts
        Promise.allSettled([
            sb.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            sb.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]).then(([cc, pc]) => {
            setCounts({
                companies: cc.status === 'fulfilled' ? (cc.value.count ?? 0) : 0,
                projects:  pc.status === 'fulfilled' ? (pc.value.count ?? 0) : 0,
            })
        })

        // Live panel: border + news + SpaceX
        fetchBorderWaitTimes().then(groups => {
            const waits = groups.flatMap(g => g.crossings).filter(c => c.pvWait != null).map(c => c.pvWait)
            if (waits.length) setAvgWait(Math.round(waits.reduce((a, b) => a + b, 0) / waits.length))
        }).catch(() => {})

        fetchRegionalNews().then(articles => {
            if (articles?.[0]) setNewsItem(articles[0])
        }).catch(() => {})

        fetchSpaceXLaunches().then(data => {
            setSpacex(data)
        }).catch(() => {})
    }, [])

    const nextLaunch    = spacex?.upcoming?.[0]
    const countdown     = useCountdown(nextLaunch?.date_utc)
    const waitColor     = avgWait == null ? 'text-white/40' : avgWait > 45 ? 'text-red-400' : avgWait > 25 ? 'text-yellow-400' : 'text-green-400'
    const waitDot       = avgWait == null ? 'bg-white/20' : avgWait > 45 ? 'bg-red-500' : avgWait > 25 ? 'bg-yellow-500' : 'bg-green-500'

    return (
        <div>
            {/* ═══════════════════════════════════════════════════════════════════
                HERO
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ minHeight: 'calc(100vh - 56px)' }}>

                {/* LEFT — hero text with image background */}
                <div
                    className="relative flex flex-col justify-center px-6 sm:px-14 py-10 sm:py-16 bg-cover bg-center"
                    style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600)' }}
                >
                    {/* gradient overlay — keeps text crisp, lets image bleed on right edge */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/97 via-white/94 to-white/75"></div>

                    <div className="relative z-10">
                        <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-4 flex items-center gap-2">
                            <span className="w-4 h-px bg-[#B8431E]"></span>
                            South Texas + Northern Mexico · Free Regional Platform
                        </div>
                        <h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight tracking-tight text-[#0F0F0E] mb-4">
                            Building the next great
                            <em className="block not-italic font-light text-[#B8431E]">American metro.</em>
                        </h1>
                        <p className="text-base text-[#5C5C54] leading-relaxed max-w-md mb-8">
                            Across South Texas and into Northern Mexico, one free platform to connect businesses, develop the workforce, and compete with the biggest cities in the country.
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            <Link to="/onboarding" className="px-6 py-3 bg-[#1A6B72] text-white rounded-lg font-semibold text-sm hover:bg-[#155960] transition-all shadow-sm">
                                Get Started Free →
                            </Link>
                            <Link to="/analytics" className="px-6 py-3 border border-[#E2DDD6] text-[#0F0F0E] rounded-lg font-medium text-sm hover:border-[#0F0F0E] transition-all bg-white/70">
                                View Regional Data
                            </Link>
                        </div>
                        <div className="mt-10 pt-6 border-t border-[#E2DDD6] grid grid-cols-2 sm:flex sm:gap-8 gap-4">
                            {[
                                ['2.1M', 'Population'],
                                ['$48B', 'Regional GDP'],
                                [counts.companies || '—', 'Companies'],
                                [counts.projects || '—', 'Projects'],
                            ].map(([num, label]) => (
                                <div key={label}>
                                    <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{num}</div>
                                    <div className="text-xs uppercase tracking-wider text-[#5C5C54] mt-1">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT — live activity panel */}
                <div className="bg-[#0F0F0E] hidden md:flex items-start justify-center relative overflow-hidden pt-10 pb-6">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '32px 32px' }}></div>
                    <div className="relative z-10 px-10 w-full flex flex-col h-full">
                        <div className="text-xs font-bold tracking-widest text-white/30 uppercase mb-4">Live Regional Activity</div>

                        {/* Activity feed */}
                        {ACTIVITY_ITEMS.map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 border border-white/8 rounded-lg px-4 py-3 mb-2">
                                <div>
                                    <div className="text-sm font-semibold text-white/90">{item.name}</div>
                                    <div className="text-xs text-white/40 mt-0.5">{item.sub}</div>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${item.color}`}>{item.badge}</span>
                            </div>
                        ))}

                        {/* Live indicators row */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {/* Border status */}
                            <div className="bg-white/5 border border-white/8 rounded-lg px-3 py-3">
                                <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-1.5">Border Status</div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${waitDot}`}></span>
                                    <span className={`text-sm font-bold ${waitColor}`}>
                                        {avgWait != null ? `~${avgWait} min` : 'Loading...'}
                                    </span>
                                </div>
                                <div className="text-[10px] text-white/25 mt-0.5">Avg private vehicle</div>
                            </div>

                            {/* SpaceX countdown */}
                            <div className="bg-white/5 border border-white/8 rounded-lg px-3 py-3">
                                <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-1.5">Next Launch</div>
                                <div className="text-sm font-bold text-teal-400 leading-tight">
                                    {countdown ?? (nextLaunch ? 'TBD' : '—')}
                                </div>
                                <div className="text-[10px] text-white/25 mt-0.5 truncate">
                                    {nextLaunch?.name ?? 'No upcoming data'}
                                </div>
                            </div>
                        </div>

                        {/* Latest news */}
                        {newsItem && (
                            <div className="mt-2 bg-white/5 border border-white/8 rounded-lg px-4 py-3">
                                <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-1">Latest News</div>
                                <div className="text-xs text-white/70 leading-snug line-clamp-2">{newsItem.title}</div>
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-white/6 flex justify-between items-center">
                            <span className="text-xs text-white/25">12 counties · 3 metros · 2 countries</span>
                            <span className="text-xs text-white/40 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Live
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                STATS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="px-6 sm:px-14 py-12 sm:py-20 bg-white">
                <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#B8431E]"></span>The Opportunity
                </div>
                <h2 className="font-serif text-4xl font-bold tracking-tight text-[#0F0F0E] mb-3">
                    We have everything it takes.<br />We just need the infrastructure.
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E2DDD6] border border-[#E2DDD6] rounded-xl overflow-hidden mt-10">
                    {[
                        ['$370B', 'Annual Cross-Border Trade', 'More than any other U.S. land border crossing.'],
                        ['38%', 'Younger Than 25', 'One of the youngest regional workforces in the nation.'],
                        ['$9.3B', 'Active Project Pipeline', 'LNG, data centers, manufacturing seeking local companies.'],
                        ['94%', 'Bilingual Workforce', 'Unique advantage for cross-border business operations.'],
                    ].map(([num, title, desc]) => (
                        <div key={title} className="bg-white p-7">
                            <div className="font-serif text-4xl font-bold tracking-tight text-[#0F0F0E] mb-2">{num}</div>
                            <div className="text-sm font-semibold mb-1">{title}</div>
                            <div className="text-xs text-[#5C5C54] leading-relaxed">{desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                OUR REGION — county cards
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="px-6 sm:px-14 py-12 sm:py-20 bg-[#0F0F0E]">
                <div className="text-xs font-bold tracking-widest text-[#E87850]/80 uppercase mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#E87850]"></span>Our Region
                </div>
                <h2 className="font-serif text-4xl font-bold tracking-tight text-white mb-2">
                    Built in and for the Rio Grande Valley.
                </h2>
                <p className="text-sm text-white/40 mb-10 max-w-xl">
                    From the Rio Grande to the Gulf Coast, this is the South Texas region RioData was built to serve.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {COUNTIES.map((c) => (
                        <div key={c.name} className="group relative rounded-2xl overflow-hidden border border-white/8 hover:border-white/20 transition-all">
                            {/* image */}
                            <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${c.img})` }}>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0E] via-[#0F0F0E]/20 to-transparent"></div>
                            </div>
                            {/* content */}
                            <div className="relative bg-[#181816] px-5 py-4 border-t border-white/6">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span>{c.flag}</span>
                                            <span className="font-serif text-base font-bold text-white">{c.name}</span>
                                        </div>
                                        <div className="text-xs text-white/40">Pop. {c.population} · Seat: {c.seat}</div>
                                    </div>
                                </div>
                                <p className="text-xs text-white/50 leading-relaxed mb-3">{c.home}</p>
                                <div className="flex flex-wrap gap-1">
                                    {c.sectors.map(s => (
                                        <span key={s} className="text-[10px] px-2 py-0.5 bg-white/8 border border-white/10 rounded-full text-white/60">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* BINATIONAL ADVANTAGE card — last slot in grid */}
                    <div className="rounded-2xl border border-[#1A6B72]/40 bg-[#1A6B72]/10 px-5 py-6 flex flex-col justify-between">
                        <div>
                            <div className="text-[10px] font-bold tracking-widest text-[#4ECDC4] uppercase mb-3">Binational Advantage</div>
                            <h3 className="font-serif text-lg font-bold text-white mb-2">One market.<br />Two countries.</h3>
                            <p className="text-xs text-white/50 leading-relaxed">
                                The RGV–Tamaulipas corridor moves over $370B in goods annually, more than any land border on Earth. RioData connects both sides.
                            </p>
                        </div>
                        <Link to="/analytics" className="mt-6 text-xs font-bold text-[#4ECDC4] hover:text-white transition-colors">
                            View Trade Analytics →
                        </Link>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                PILLARS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="px-6 sm:px-14 py-12 sm:py-20 bg-[#F7F3EE]">
                <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#B8431E]"></span>What RioData Does
                </div>
                <h2 className="font-serif text-4xl font-bold tracking-tight text-[#0F0F0E] mb-10">Four pillars. One free platform.</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { icon: '🏢', title: 'Business Directory', desc: 'Verified companies with ready-to-work status across every sector.', path: '/directory' },
                        { icon: '📊', title: 'Regional Analytics', desc: 'Live economic data and growth benchmarks for investors and EDCs.', path: '/analytics' },
                        { icon: '🎓', title: 'Workforce & Education', desc: 'Skills gaps, school pipelines, and career pathways matched to demand.', path: '/workforce' },
                        { icon: '🔗', title: 'Project Opportunities', desc: 'Active projects matched to verified local businesses.', path: '/opportunities' },
                        { icon: '✅', title: 'List Your Business', desc: 'Register in 8 minutes. Get discovered. Start winning work.', path: '/onboarding' },
                        { icon: '🌵', title: '100% Free. Always.', desc: 'No fees, no paywalls. This is infrastructure for the region.', path: '/onboarding', dark: true },
                    ].map((p) => (
                        <Link key={p.title} to={p.path}
                            className={`border rounded-xl p-7 transition-all hover:-translate-y-1 hover:shadow-lg ${p.dark ? 'bg-[#0F0F0E] border-[#0F0F0E]' : 'bg-white border-[#E2DDD6] hover:border-[#1A6B72]'}`}>
                            <div className="text-3xl mb-4">{p.icon}</div>
                            <div className={`font-serif text-lg font-bold mb-2 ${p.dark ? 'text-white' : 'text-[#0F0F0E]'}`}>{p.title}</div>
                            <div className={`text-sm ${p.dark ? 'text-white/60' : 'text-[#5C5C54]'}`}>{p.desc}</div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                REGIONAL LEADERS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="px-6 sm:px-14 py-12 sm:py-20 bg-white">
                <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#B8431E]"></span>Regional Leaders
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
                    <h2 className="font-serif text-4xl font-bold tracking-tight text-[#0F0F0E]">
                        Built alongside<br />regional leaders.
                    </h2>
                    <p className="text-sm text-[#5C5C54] max-w-xs sm:text-right">
                        Universities, hospitals, employers, and economic development organizations shaping South Texas.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {LEADERS.map((l) => (
                        <a
                            key={l.name}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-4 border border-[#E2DDD6] rounded-xl p-5 hover:border-[#1A6B72] hover:-translate-y-0.5 hover:shadow-md transition-all"
                        >
                            <div className="text-2xl mt-0.5 flex-shrink-0">{l.icon}</div>
                            <div className="min-w-0">
                                <div className="font-serif font-bold text-[#0F0F0E] text-sm leading-snug mb-0.5 group-hover:text-[#1A6B72] transition-colors">
                                    {l.name}
                                </div>
                                <div className="text-xs text-[#5C5C54] mb-2">📍 {l.sub}</div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${LEADER_SECTOR_COLOR[l.sector] || 'bg-[#E3F0F1] text-[#1A6B72]'}`}>
                                    {l.sector}
                                </span>
                            </div>
                            <div className="ml-auto text-[#888780] group-hover:text-[#1A6B72] transition-colors flex-shrink-0 text-sm mt-0.5">↗</div>
                        </a>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                TESTIMONIALS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="px-6 sm:px-14 py-12 sm:py-20 bg-[#F7F3EE]">
                <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#B8431E]"></span>What People Are Saying
                </div>
                <h2 className="font-serif text-4xl font-bold tracking-tight text-[#0F0F0E] mb-10">
                    The region is taking notice.
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TESTIMONIALS.map((t, i) => (
                        <div key={i} className="bg-white border border-[#E2DDD6] rounded-xl p-7 flex flex-col justify-between">
                            <div>
                                <div className="text-2xl text-[#E2DDD6] font-serif mb-4 leading-none">"</div>
                                <p className="text-sm text-[#0F0F0E] leading-relaxed mb-6 font-medium">
                                    {t.quote}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${t.color}`}>
                                    {t.initials}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-[#0F0F0E]">{t.author}</div>
                                    <div className="text-xs text-[#888780]">{t.org}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                FINAL CTA
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative px-6 sm:px-14 py-16 sm:py-24 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D4A50 0%, #1A6B72 40%, #0F5E6A 70%, #0A3D42 100%)' }}>
                {/* background grid */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '40px 40px' }}></div>
                {/* accent circle */}
                <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
                <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-[#E87850]/10 blur-3xl pointer-events-none"></div>

                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4 flex items-center justify-center gap-2">
                        <span className="w-4 h-px bg-white/30"></span>
                        Join the Platform
                        <span className="w-4 h-px bg-white/30"></span>
                    </div>
                    <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
                        The Rio Grande Valley<br />is open for business.
                    </h2>
                    <p className="text-white/60 mb-10 text-base leading-relaxed">
                        Join {counts.companies > 0 ? `${counts.companies}+` : '269+'} companies already on RioData.<br />Free. Always. No fees, no paywalls.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link
                            to="/onboarding"
                            className="px-8 py-4 bg-white text-[#1A6B72] rounded-lg font-bold text-sm hover:bg-[#F7F3EE] transition-all shadow-lg"
                        >
                            Get Started Free →
                        </Link>
                        <Link
                            to="/analytics"
                            className="px-8 py-4 border border-white/25 text-white rounded-lg font-medium text-sm hover:border-white/60 hover:bg-white/5 transition-all"
                        >
                            View Regional Data
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
