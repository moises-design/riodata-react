import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { fetchSavedIds, saveCompany, unsaveCompany, logActivity } from '../lib/db'
import AuthModal from '../components/AuthModal'

const COLORS = ['#E3F0F1,#1A6B72','#F2E8E3,#B8431E','#FBF4E3,#B07D1A','#E4F0EA,#2A6B43','#EDE8F8,#5B3FA6']

export default function Directory() {
    const navigate = useNavigate()
    const [companies,  setCompanies]  = useState([])
    const [loading,    setLoading]    = useState(true)
    const [search,     setSearch]     = useState('')
    const [sector,     setSector]     = useState('')
    const [country,    setCountry]    = useState('')
    const [savedIds,   setSavedIds]   = useState(new Set())
    const [userId,     setUserId]     = useState(null)
    const [savingId,   setSavingId]   = useState(null)
    const [authModal,  setAuthModal]  = useState(null)

    // Load auth + saved IDs on mount
    useEffect(() => {
        sb.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id)
                fetchSavedIds(session.user.id).then(setSavedIds)
            }
        })
        loadCompanies()
    }, [])

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

    async function toggleSave(e, companyId, companyName) {
        e.stopPropagation()
        if (!userId) { setAuthModal('signin'); return }
        if (savingId === companyId) return
        setSavingId(companyId)
        const isSaved = savedIds.has(companyId)
        if (isSaved) {
            await unsaveCompany(userId, companyId)
            setSavedIds(prev => { const s = new Set(prev); s.delete(companyId); return s })
            logActivity(userId, 'unsaved_company', companyName, companyId)
        } else {
            const ok = await saveCompany(userId, companyId)
            if (ok) {
                setSavedIds(prev => new Set([...prev, companyId]))
                logActivity(userId, 'saved_company', companyName, companyId)
            }
        }
        setSavingId(null)
    }

    function openCompany(c) {
        if (userId) logActivity(userId, 'viewed_company', c.legal_name, c.id)
        navigate(`/companies/${c.id}`)
    }

    return (
        <>
            {/* HEADER */}
            <div className="bg-[#0F0F0E] px-4 sm:px-14 pt-8 sm:pt-11 pb-0">
                <div className="text-xs font-bold tracking-widest text-[#E87850]/80 uppercase mb-2">Business Directory</div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-end pb-6 border-b border-white/8 gap-3">
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
            <div className="px-4 sm:px-14 py-6 bg-[#F7F3EE]">
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
                        {companies.map((c) => {
                            const [bg,fg] = COLORS[c.legal_name.charCodeAt(0)%COLORS.length].split(',')
                            const isSaved = savedIds.has(c.id)
                            return (
                                <div key={c.id} onClick={()=>openCompany(c)}
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
                                        <div className="flex items-center gap-2">
                                            {userId && (
                                                <button
                                                    onClick={e=>toggleSave(e, c.id, c.legal_name)}
                                                    disabled={savingId === c.id}
                                                    className={`text-lg leading-none transition-transform hover:scale-110 ${isSaved ? 'text-[#1A6B72]' : 'text-[#D4D0CA] hover:text-[#1A6B72]'}`}
                                                    title={isSaved ? 'Remove bookmark' : 'Save company'}
                                                >
                                                    {isSaved ? '🔖' : '🔖'}
                                                </button>
                                            )}
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${c.ready_to_work?'bg-green-600 shadow-[0_0_0_3px_rgba(42,107,67,.15)]':'bg-[#E2DDD6]'}`}></div>
                                        </div>
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
                                        <span className="text-xs text-[#1A6B72] font-medium">View Profile →</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        {authModal && <AuthModal initialTab={authModal} onClose={() => setAuthModal(null)} />}
        </>
    )
}
