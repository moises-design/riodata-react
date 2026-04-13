export default function Analytics() {
    return (
        <div className="px-14 py-12">
            <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-2 flex items-center gap-2">
                <span className="w-4 h-px bg-[#B8431E]"></span>Regional Intelligence
            </div>
            <h1 className="font-serif text-5xl font-bold tracking-tight text-[#0F0F0E] mb-2">Analytics</h1>
            <p className="text-sm text-[#5C5C54] mb-10">Live economic data for the South Texas + Northern Mexico corridor.</p>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                {[
                    ['$48.2B','Regional GDP','+3.4%'],
                    ['612K','Total Employment','+2.1%'],
                    ['269','Listed Companies','+54%'],
                    ['$9.3B','Active Pipeline','+8%'],
                    ['14','Critical Skill Gaps','4,200 jobs'],
                ].map(([val,label,sub])=>(
                    <div key={label} className="bg-white border border-[#E2DDD6] rounded-xl p-4">
                        <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{val}</div>
                        <div className="text-xs text-[#5C5C54] mt-1">{label}</div>
                        <div className="text-xs font-semibold text-[#2A6B43] mt-1">{sub}</div>
                    </div>
                ))}
            </div>

            {/* CHARTS PLACEHOLDER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
                    <div className="font-semibold text-sm mb-1">Regional GDP Growth vs National Average</div>
                    <div className="text-xs text-[#5C5C54] mb-4">Annual % growth — South TX corridor outpacing national by 2.1x</div>
                    <div className="h-40 flex items-end gap-2">
                        {[['2019',5.2,3.1],['2020',1.8,0.8],['2021',6.4,4.2],['2022',8.1,5.5],['2023',9.2,6.1],['2024',10.4,6.8]].map(([yr,stx,nat])=>(
                            <div key={yr} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex gap-0.5 items-end" style={{height:'120px'}}>
                                    <div className="flex-1 bg-[#1A6B72] rounded-t" style={{height:`${stx*10}px`}}></div>
                                    <div className="flex-1 bg-[#C8C3BA] rounded-t" style={{height:`${nat*10}px`}}></div>
                                </div>
                                <div className="text-xs text-[#5C5C54]">{yr}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-3">
                        <span className="flex items-center gap-1.5 text-xs text-[#5C5C54]"><span className="w-3 h-3 rounded bg-[#1A6B72]"></span>South TX</span>
                        <span className="flex items-center gap-1.5 text-xs text-[#5C5C54]"><span className="w-3 h-3 rounded bg-[#C8C3BA]"></span>National</span>
                    </div>
                </div>

                <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
                    <div className="font-semibold text-sm mb-1">Pipeline by Sector</div>
                    <div className="text-xs text-[#5C5C54] mb-4">$9.3B total active value</div>
                    {[['Energy/LNG',4200,'#B8431E'],['Construction',2800,'#1A6B72'],['Data Centers',1400,'#B07D1A'],['Industrial',880,'#2A6B43'],['Other',20,'#888780']].map(([label,val,color])=>(
                        <div key={label} className="flex items-center gap-3 mb-2">
                            <div className="text-xs text-[#5C5C54] w-24 flex-shrink-0">{label}</div>
                            <div className="flex-1 h-5 bg-[#F7F3EE] rounded overflow-hidden">
                                <div className="h-full rounded transition-all" style={{width:`${(val/4200)*100}%`,background:color}}></div>
                            </div>
                            <div className="text-xs font-semibold w-14 text-right">${val>=1000?(val/1000).toFixed(1)+'B':val+'M'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
                    <div className="font-semibold text-sm mb-1">Employment by Sector</div>
                    <div className="text-xs text-[#5C5C54] mb-4">612,000 total regional jobs</div>
                    {[['Retail/Trade',112000],['Healthcare',98000],['Logistics',82000],['Construction',74000],['Manufacturing',68000],['Government',61000],['Energy',44000],['Technology',28000]].map(([label,val])=>(
                        <div key={label} className="flex items-center gap-3 mb-2">
                            <div className="text-xs text-[#5C5C54] w-24 flex-shrink-0">{label}</div>
                            <div className="flex-1 h-4 bg-[#F7F3EE] rounded overflow-hidden">
                                <div className="h-full bg-[#1A6B72] rounded" style={{width:`${(val/112000)*100}%`}}></div>
                            </div>
                            <div className="text-xs font-semibold w-10 text-right">{(val/1000).toFixed(0)}K</div>
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
                    <div className="font-semibold text-sm mb-1">Workforce Skills Gap</div>
                    <div className="text-xs text-[#5C5C54] mb-4">Unfilled positions by occupation</div>
                    {[['CDL Drivers',480,'#B8431E'],['Welders',340,'#B8431E'],['IT/Cyber',290,'#B07D1A'],['Electricians',220,'#B8431E'],['Pipefitters',195,'#5C5C54'],['Civil Eng.',140,'#B07D1A'],['HVAC',110,'#5C5C54']].map(([label,val,color])=>(
                        <div key={label} className="flex items-center gap-3 mb-2">
                            <div className="text-xs text-[#5C5C54] w-24 flex-shrink-0">{label}</div>
                            <div className="flex-1 h-4 bg-[#F7F3EE] rounded overflow-hidden">
                                <div className="h-full rounded" style={{width:`${(val/480)*100}%`,background:color}}></div>
                            </div>
                            <div className="text-xs font-semibold w-8 text-right">{val}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TRADE TABLE */}
            <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
                <div className="font-semibold text-sm mb-1">Cross-Border Trade Intelligence</div>
                <div className="text-xs text-[#5C5C54] mb-4">South Texas ports of entry · Monthly volume</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-[#E2DDD6]">
                            <th className="text-left py-2 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">Commodity</th>
                            <th className="text-left py-2 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">Port</th>
                            <th className="text-left py-2 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">Monthly Volume</th>
                            <th className="text-left py-2 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">YoY</th>
                        </tr></thead>
                        <tbody>
                            {[
                                ['Auto Parts & Vehicles','Laredo','$8.4B','+12%',true],
                                ['Petroleum / LNG','Brownsville','$2.1B','+31%',true],
                                ['Electronics / Maquiladora','McAllen','$1.8B','+8%',true],
                                ['Fresh Produce','Hidalgo','$680M','+4%',true],
                                ['Steel & Metals','Laredo','$420M','-6%',false],
                            ].map(([com,port,vol,yoy,up])=>(
                                <tr key={com} className="border-b border-[#F7F3EE]">
                                    <td className="py-3 font-semibold text-[#0F0F0E]">{com}</td>
                                    <td className="py-3 text-[#5C5C54]">{port}</td>
                                    <td className="py-3 font-semibold text-[#0F0F0E]">{vol}</td>
                                    <td className={`py-3 font-semibold ${up ? 'text-[#2A6B43]' : 'text-[#B8431E]'}`}>{yoy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}