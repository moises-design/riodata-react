import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../lib/supabase'

export default function Home() {
    const [counts, setCounts] = useState({ companies: 0, projects: 0 })

    useEffect(() => {
        async function loadCounts() {
            const { count: cc } = await sb.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active')
            const { count: pc } = await sb.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
            setCounts({ companies: cc || 0, projects: pc || 0 })
        }
        loadCounts()
    }, [])

    return (
        <div>
            {/* HERO */}
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ minHeight: 'calc(100vh - 56px)' }}>
                <div className="flex flex-col justify-center px-6 sm:px-14 py-10 sm:py-16">
                    <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-4 flex items-center gap-2">
                        <span className="w-4 h-px bg-[#B8431E]"></span>
                        South Texas + Northern Mexico · Free Regional Platform
                    </div>
                    <h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight tracking-tight text-[#0F0F0E] mb-4">
                        Building the next great
                        <em className="block not-italic font-light text-[#B8431E]">American metro.</em>
                    </h1>
                    <p className="text-base text-[#5C5C54] leading-relaxed max-w-md mb-8">
                        From Laredo to Brownsville and across Northern Mexico — one free platform to connect businesses, develop the workforce, and compete with the biggest cities in the country.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                        <Link to="/onboarding" className="px-6 py-3 bg-[#1A6B72] text-white rounded-lg font-semibold text-sm hover:bg-[#155960] transition-all">
                            Get Started Free →
                        </Link>
                        <Link to="/analytics" className="px-6 py-3 border border-[#E2DDD6] text-[#0F0F0E] rounded-lg font-medium text-sm hover:border-[#0F0F0E] transition-all">
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

                {/* RIGHT PANEL */}
                <div className="bg-[#0F0F0E] hidden md:flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '32px 32px' }}></div>
                    <div className="relative z-10 p-10 w-full">
                        <div className="text-xs font-bold tracking-widest text-white/30 uppercase mb-4">Live Regional Activity</div>
                        {[
                            { name: 'Dominion Construction', sub: 'Laredo, TX · Construction', badge: 'READY', color: 'bg-green-900/40 text-green-400' },
                            { name: 'APTIV Reynosa', sub: 'Reynosa, TAM · Manufacturing', badge: 'IMMEX', color: 'bg-purple-900/40 text-purple-400' },
                            { name: 'Port of Brownsville LNG Ph.3', sub: '$420M opportunity · Open', badge: 'ENERGY', color: 'bg-teal-900/40 text-teal-400' },
                            { name: 'CBI Group Logistics', sub: 'Laredo · Customs / Freight', badge: 'SAM', color: 'bg-yellow-900/40 text-yellow-400' },
                            { name: 'Workforce Gap: 340 Welders', sub: 'Region-wide shortfall', badge: 'ALERT', color: 'bg-red-900/40 text-red-400' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 border border-white/8 rounded-lg px-4 py-3 mb-2">
                                <div>
                                    <div className="text-sm font-semibold text-white/90">{item.name}</div>
                                    <div className="text-xs text-white/40 mt-0.5">{item.sub}</div>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${item.color}`}>{item.badge}</span>
                            </div>
                        ))}
                        <div className="mt-4 pt-3 border-t border-white/6 flex justify-between">
                            <span className="text-xs text-white/25">12 counties · 3 metros · 2 countries</span>
                            <span className="text-xs text-white/40 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Live
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* STATS */}
            <div className="px-6 sm:px-14 py-12 sm:py-20 bg-white">
                <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#B8431E]"></span>The Opportunity
                </div>
                <h2 className="font-serif text-4xl font-bold tracking-tight text-[#0F0F0E] mb-3">We have everything it takes.<br />We just need the infrastructure.</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E2DDD6] border border-[#E2DDD6] rounded-xl overflow-hidden mt-10">
                    {[
                        ['$370B', 'Annual Cross-Border Trade', 'More than any other U.S. land border crossing.'],
                        ['38%', 'Younger Than 25', 'One of the youngest regional workforces in the nation.'],
                        ['$9.3B', 'Active Project Pipeline', 'LNG, data centers, manufacturing — seeking local companies.'],
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

            {/* PILLARS */}
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

            {/* CTA */}
            <div className="px-6 sm:px-14 py-12 sm:py-20 bg-white">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="font-serif text-4xl font-bold tracking-tight text-[#0F0F0E] mb-4">Ready to build the region together?</h2>
                    <p className="text-[#5C5C54] mb-8">Join 500+ companies already on the platform. It's free, takes 8 minutes, and opens doors to real opportunities.</p>
                    <div className="flex gap-4 justify-center">
                        <Link to="/onboarding" className="px-8 py-4 bg-[#1A6B72] text-white rounded-lg font-semibold hover:bg-[#155960] transition-all">
                            Get Started Free
                        </Link>
                        <Link to="/directory" className="px-8 py-4 border border-[#E2DDD6] text-[#0F0F0E] rounded-lg font-medium hover:border-[#0F0F0E] transition-all">
                            Browse Directory
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}