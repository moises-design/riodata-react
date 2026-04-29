export default function About() {
    return (
        <div>
            <div className="bg-[#0F0F0E] px-4 sm:px-14 py-12 sm:py-20">
                <div className="text-xs font-bold tracking-widest text-[#E87850]/80 uppercase mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-[#B8431E]"></span>Our Mission
                </div>
                <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 max-w-3xl">
                    Built for the region.<br />
                    <em className="not-italic text-[#B8431E]">By the region.</em>
                </h1>
                <p className="text-base text-white/50 max-w-xl leading-relaxed">
                    RioData is free economic infrastructure for South Texas and Northern Mexico. No fees, no paywalls, no outside investors telling us what to build.
                </p>
            </div>

            <div className="px-4 sm:px-14 py-12 sm:py-20 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div>
                        <h2 className="font-serif text-3xl font-bold mb-4">Why we built this</h2>
                        <p className="text-sm text-[#5C5C54] leading-relaxed mb-4">
                            The Rio Grande Valley and Laredo corridor moves more cross-border trade than any other land border in the US. $370 billion a year flows through here, yet the businesses, workforce, and institutions that make it happen have no shared platform to connect, grow, and compete.
                        </p>
                        <p className="text-sm text-[#5C5C54] leading-relaxed mb-4">
                            Companies in Reynosa can't find contractors in Laredo. Universities don't know what certifications employers actually need. EDCs pitch investors without real-time data. Projects worth hundreds of millions go to outside companies because local businesses aren't visible.
                        </p>
                        <p className="text-sm text-[#5C5C54] leading-relaxed">
                            RioData fixes that. One platform, both sides of the border, completely free.
                        </p>
                    </div>
                    <div>
                        <h2 className="font-serif text-3xl font-bold mb-4">Who it's for</h2>
                        <div className="space-y-3">
                            {[
                                ['🏢', 'Local Businesses', 'Get discovered by projects, partners, and institutional buyers.'],
                                ['🎓', 'Universities & Colleges', 'Align programs with real employer demand. Show placement data.'],
                                ['🏛️', 'EDCs & Government', 'Pitch investors with live regional data. Track pipeline.'],
                                ['💼', 'Contractors & Suppliers', 'Find opportunities matched to your sector and certifications.'],
                                ['📊', 'Investors & Researchers', 'Access the most detailed cross-border economic data available.'],
                            ].map(([icon, title, desc]) => (
                                <div key={title} className="flex gap-4 p-4 border border-[#E2DDD6] rounded-xl">
                                    <div className="text-2xl">{icon}</div>
                                    <div>
                                        <div className="font-semibold text-sm text-[#0F0F0E]">{title}</div>
                                        <div className="text-xs text-[#5C5C54] mt-0.5">{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-14 py-12 sm:py-16 bg-[#F7F3EE]">
                <h2 className="font-serif text-3xl font-bold mb-8 text-center">The numbers behind the region</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        ['$370B', 'Annual Cross-Border Trade'],
                        ['2.1M', 'Regional Population'],
                        ['94%', 'Bilingual Workforce'],
                        ['38%', 'Under Age 25'],
                        ['315+', 'Manufacturing Companies'],
                        ['$9.3B', 'Active Project Pipeline'],
                        ['12', 'Counties Covered'],
                        ['2', 'Countries, 1 Platform'],
                    ].map(([num, label]) => (
                        <div key={label} className="bg-white border border-[#E2DDD6] rounded-xl p-5 text-center">
                            <div className="font-serif text-3xl font-bold text-[#0F0F0E]">{num}</div>
                            <div className="text-xs text-[#5C5C54] mt-1">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-4 sm:px-14 py-12 sm:py-16 bg-[#0F0F0E] text-center">
                <h2 className="font-serif text-4xl font-bold text-white mb-4">Ready to get listed?</h2>
                <p className="text-sm text-white/40 mb-8">Free. 8 minutes. No credit card.</p>
                <a href="/onboarding" className="px-8 py-4 bg-[#1A6B72] text-white rounded-xl font-semibold hover:bg-[#155960] transition-all">
                    Register Your Business →
                </a>
            </div>
        </div>
    )
}