export default function Workforce() {
    return (
        <div className="px-14 py-12">
            <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-2 flex items-center gap-2">
                <span className="w-4 h-px bg-[#B8431E]"></span>Talent Pipeline
            </div>
            <h1 className="font-serif text-5xl font-bold tracking-tight text-[#0F0F0E] mb-2">Workforce Intelligence</h1>
            <p className="text-sm text-[#5C5C54] mb-10">Skills gaps, certifications, and career pathways matched to regional employer demand.</p>

            {/* KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                {[
                    ['612K','Total Regional Jobs'],
                    ['1,775','Unfilled Positions'],
                    ['14','Critical Skill Gaps'],
                    ['94%','Bilingual Workforce'],
                ].map(([val,label])=>(
                    <div key={label} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
                        <div className="font-serif text-3xl font-bold text-[#0F0F0E]">{val}</div>
                        <div className="text-xs text-[#5C5C54] mt-1">{label}</div>
                    </div>
                ))}
            </div>

            {/* TOP DEMAND */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
                    <div className="font-semibold text-sm mb-1">Top In-Demand Occupations</div>
                    <div className="text-xs text-[#5C5C54] mb-4">Unfilled positions across the region</div>
                    {[
                        ['CDL / Commercial Drivers',480,'#B8431E'],
                        ['Welders & Fabricators',340,'#B8431E'],
                        ['IT / Cybersecurity',290,'#B07D1A'],
                        ['Electricians',220,'#B8431E'],
                        ['Pipefitters',195,'#5C5C54'],
                        ['Civil Engineers',140,'#B07D1A'],
                        ['HVAC Technicians',110,'#5C5C54'],
                        ['Customs Brokers',95,'#1A6B72'],
                    ].map(([label,val,color])=>(
                        <div key={label} className="flex items-center gap-3 mb-2.5">
                            <div className="text-xs text-[#5C5C54] w-36 flex-shrink-0">{label}</div>
                            <div className="flex-1 h-4 bg-[#F7F3EE] rounded overflow-hidden">
                                <div className="h-full rounded transition-all" style={{width:`${(val/480)*100}%`,background:color}}></div>
                            </div>
                            <div className="text-xs font-bold w-8 text-right">{val}</div>
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
                    <div className="font-semibold text-sm mb-1">Fast-Track Certifications</div>
                    <div className="text-xs text-[#5C5C54] mb-4">Highest ROI credentials for regional employers</div>
                    {[
                        {cert:'CDL Class A',time:'4–6 weeks',salary:'$52K',demand:'Very High',color:'bg-red-50 text-red-700'},
                        {cert:'AWS Welding',time:'8–12 weeks',salary:'$48K',demand:'Very High',color:'bg-red-50 text-red-700'},
                        {cert:'NCCER Electrical',time:'12 weeks',salary:'$55K',demand:'High',color:'bg-orange-50 text-orange-700'},
                        {cert:'OSHA 30',time:'1 week',salary:'+$8K',demand:'High',color:'bg-orange-50 text-orange-700'},
                        {cert:'C-TPAT / Customs',time:'2 weeks',salary:'$45K',demand:'High',color:'bg-orange-50 text-orange-700'},
                        {cert:'HVAC EPA 608',time:'6 weeks',salary:'$46K',demand:'Medium',color:'bg-yellow-50 text-yellow-700'},
                        {cert:'CompTIA Security+',time:'12 weeks',salary:'$68K',demand:'High',color:'bg-orange-50 text-orange-700'},
                    ].map((c)=>(
                        <div key={c.cert} className="flex items-center justify-between py-2.5 border-b border-[#F7F3EE] last:border-0">
                            <div>
                                <div className="text-sm font-semibold text-[#0F0F0E]">{c.cert}</div>
                                <div className="text-xs text-[#5C5C54]">{c.time} · Avg {c.salary}</div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${c.color}`}>{c.demand}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* EDUCATION PIPELINE */}
            <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
                <div className="font-semibold text-sm mb-1">Regional Education Pipeline</div>
                <div className="text-xs text-[#5C5C54] mb-5">Annual graduates and program alignment with employer demand</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {school:'UTRGV',location:'Edinburg / Brownsville',grads:'8,200',programs:['Engineering','Computer Science','Business','Healthcare'],match:'72%'},
                        {school:'Laredo College',location:'Laredo, TX',grads:'2,100',programs:['CDL Training','Welding','HVAC','Nursing'],match:'89%'},
                        {school:'South Texas College',location:'McAllen, TX',grads:'4,800',programs:['Manufacturing Tech','IT','Business','Allied Health'],match:'81%'},
                    ].map((s)=>(
                        <div key={s.school} className="border border-[#E2DDD6] rounded-xl p-5">
                            <div className="font-serif text-lg font-bold text-[#0F0F0E] mb-1">{s.school}</div>
                            <div className="text-xs text-[#5C5C54] mb-3">📍 {s.location}</div>
                            <div className="text-2xl font-serif font-bold text-[#0F0F0E] mb-1">{s.grads}</div>
                            <div className="text-xs text-[#5C5C54] mb-3">Annual graduates</div>
                            <div className="flex flex-wrap gap-1 mb-3">
                                {s.programs.map(p=><span key={p} className="text-xs px-2 py-0.5 bg-[#F7F3EE] border border-[#E2DDD6] rounded text-[#5C5C54]">{p}</span>)}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[#E2DDD6]">
                                <span className="text-xs text-[#5C5C54]">Employer match rate</span>
                                <span className="text-sm font-bold text-[#2A6B43]">{s.match}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="bg-[#0F0F0E] rounded-2xl p-8 flex items-center justify-between">
                <div>
                    <div className="font-serif text-2xl font-bold text-white mb-2">Are you a university or EDC?</div>
                    <div className="text-sm text-white/50">Get access to the full workforce intelligence dashboard with API data, grant-ready reports, and custom program ROI analysis.</div>
                </div>
                <a href="/onboarding" className="flex-shrink-0 ml-8 px-6 py-3 bg-[#1A6B72] text-white rounded-xl font-semibold text-sm hover:bg-[#155960]">
                    Learn About Licensing →
                </a>
            </div>
        </div>
    )
}