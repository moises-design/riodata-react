import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'

const COLORS = ['#E3F0F1,#1A6B72','#F2E8E3,#B8431E','#FBF4E3,#B07D1A','#E4F0EA,#2A6B43','#EDE8F8,#5B3FA6']

export default function Directory() {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sector, setSector] = useState('')
    const [country, setCountry] = useState('')
    const [selected, setSelected] = useState(null)

    useEffect(() => { loadCompanies() }, [])

    async function loadCompanies(q='', s='', c='') {
        setLoading(true)
        let query = sb.from('companies').select('*').eq('status','active').order('ready_to_work',{ascending:false})
        if (s) query = query.eq('sector', s)
        if (c) query = query.eq('country', c)
        if (q) query = query.or(`legal_name.ilike.%${q}%,city.ilike.%${q}%,description.ilike.%${q}%`)
        const { data } = await query
        setCompanies(data || [])
        setLoading(false)
    }

    function doSearch() { loadCompanies(search, sector, country) }

    return (
        <div>
            {/* HEADER */}
            <div className="bg-[#0F0F0E] px-14 pt-11 pb-0">
                <div className="text-xs font-bold tracking-widest text-[#E87850]/80 uppercase mb-2">Business Directory</div>
                <div className="flex justify-between items-end pb-6 border-b border-white/8">
                    <div>
                        <h1 className="font-serif text-5xl font-bold tracking-tight text-white mb-1">Find Who's Ready to Work</h1>
                        <p className="text-sm text-white/40">{companies.length} verified companies across the region</p>
                    </div>
                    <a href="/onboarding" className="px-4 py-2 bg-[#1A6B72] text-white rounded-lg text-sm font-semibold">+ List Your Business</a>
                </div>
                {/* SEARCH */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 py-5">
                    <input className="md:col-span-2 px-3 py-2.5 bg-white/8 border border-white/12 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#1A6B72]"
                        placeholder="Search by name, service, keyword..." value={search} onChange={e=>setSearch(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&doSearch()} />
                    <select className="px-3 py-2.5 bg-white/8 border border-white/12 rounded-lg text-sm text-white/70 focus:outline-none"
                        value={sector} onChange={e=>{setSector(e.target.value);loadCompanies(search,e.target.value,country)}}>
                        <option value="">All Sectors</option>
                        {['Construction','Energy','Manufacturing','Logistics','Technology','Healthcare','Government'].map(s=><option key={s}>{s}</option>)}
                    </select>
                    <select className="px-3 py-2.5 bg-white/8 border border-white/12 rounded-lg text-sm text-white/70 focus:outline-none"
                        value={country} onChange={e=>{setCountry(e.target.value);loadCompanies(search,sector,e.target.value)}}>
                        <option value="">All Locations</option>
                        <option value="US">Texas (US)</option>
                        <option value="MX">Mexico</option>
                    </select>
                    <button onClick={doSearch} className="px-4 py-2.5 bg-[#1A6B72] text-white rounded-lg text-sm font-semibold hover:bg-[#155960]">Search</button>
                </div>
            </div>

            {/* GRID */}
            <div className="px-14 py-6 bg-[#F7F3EE]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Array(6).fill(0).map((_,i)=>(
                            <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                                <div className="h-2 bg-gray-200 rounded w-1/3 mb-4"></div>
                                <div className="h-2 bg-gray-200 rounded w-full"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {companies.map((c,i) => {
                            const [bg,fg] = COLORS[c.legal_name.charCodeAt(0)%COLORS.length].split(',')
                            return (
                                <div key={c.id} onClick={()=>setSelected(c)}
                                    className="bg-white border border-[#E2DDD6] rounded-xl p-5 cursor-pointer hover:border-[#1A6B72] hover:-translate-y-0.5 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2.5 items-start">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-serif text-base font-bold flex-shrink-0"
                                                style={{background:bg,color:fg}}>{c.legal_name[0]}</div>
                                            <div>
                                                <div className="text-sm font-bold text-[#0F0F0E]">{c.legal_name}</div>
                                                <div className="text-xs text-[#5C5C54] mt-0.5">📍 {c.city}{c.state_province?', '+c.state_province:''} {c.country==='MX'?'🇲🇽':'🇺🇸'}</div>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${c.ready_to_work?'bg-green-600 shadow-[0_0_0_3px_rgba(42,107,67,.15)]':'bg-[#E2DDD6]'}`}></div>
                                    </div>
                                    {c.description && <p className="text-xs text-[#5C5C54] leading-relaxed mb-3 line-clamp-2">{c.description}</p>}
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {(c.services||[]).slice(0,3).map(s=><span key={s} className="text-xs px-2 py-0.5 bg-[#F7F3EE] border border-[#E2DDD6] text-[#5C5C54] rounded">{s}</span>)}
                                        {c.cert_hubzone&&<span className="text-xs px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-semibold">✓ HUBZone</span>}
                                        {c.cert_sam&&<span className="text-xs px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-semibold">✓ SAM</span>}
                                        {c.cert_immex&&<span className="text-xs px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-semibold">✓ IMMEX</span>}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-[#E2DDD6]">
                                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-[#E3F0F1] text-[#1A6B72] rounded">{c.sector||'General'}</span>
                                        <span className="text-xs text-[#1A6B72] font-medium">View →</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* COMPANY MODAL */}
            {selected && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setSelected(null)}>
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>setSelected(null)} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-[#E2DDD6] flex items-center justify-center text-[#5C5C54] hover:bg-[#F7F3EE]">✕</button>
                        <div className="text-xs text-[#1A6B72] font-bold uppercase tracking-wider mb-2">Company Profile</div>
                        <h2 className="font-serif text-2xl font-bold mb-1">{selected.legal_name}</h2>
                        <p className="text-sm text-[#5C5C54] mb-4">📍 {selected.city}{selected.state_province?', '+selected.state_province:''} {selected.country==='MX'?'🇲🇽':'🇺🇸'}</p>
                        <div className="flex gap-2 flex-wrap mb-4">
                            {selected.ready_to_work&&<span className="px-3 py-1 bg-[#E4F0EA] text-[#2A6B43] rounded-full text-xs font-bold">✅ Ready to Work</span>}
                            <span className="px-3 py-1 bg-[#E3F0F1] text-[#1A6B72] rounded-full text-xs font-bold">{selected.sector}</span>
                        </div>
                        {selected.description&&<p className="text-sm text-[#5C5C54] leading-relaxed mb-4">{selected.description}</p>}
                        {selected.services?.length>0&&(
                            <div className="mb-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-2">Services</div>
                                <div className="flex flex-wrap gap-1">{selected.services.map(s=><span key={s} className="text-xs px-2 py-1 bg-[#F7F3EE] border border-[#E2DDD6] rounded text-[#5C5C54]">{s}</span>)}</div>
                            </div>
                        )}
                        {selected.contact_email&&(
                            <a href={`mailto:${selected.contact_email}`} className="block w-full py-3 bg-[#1A6B72] text-white text-center rounded-xl font-semibold text-sm mt-4">
                                📧 Contact {selected.contact_name||'This Company'}
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}