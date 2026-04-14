import { useEffect, useState } from 'react'
import { sb } from '../lib/supabase'
import { fetchWatchIds, addWatch, removeWatch, logActivity } from '../lib/db'

const sectorColors = {
    'Energy':        'bg-[#F2E8E3] text-[#B8431E]',
    'Government':    'bg-[#E3F0F1] text-[#1A6B72]',
    'Technology':    'bg-[#EDE8F8] text-[#5B3FA6]',
    'Healthcare':    'bg-[#E4F0EA] text-[#2A6B43]',
    'Manufacturing': 'bg-[#FBF4E3] text-[#B07D1A]',
    'Construction':  'bg-[#E3F0F1] text-[#1A6B72]',
}

const DEMO = [
    { id: 1, title: 'Port of Brownsville LNG Phase 3',   sector: 'Energy',      budget: '$420M', location: 'Brownsville, TX',  status: 'Open', description: 'Seeking licensed civil, mechanical, and electrical contractors for LNG terminal expansion. Local preference applies.', tags: ['Civil','Mechanical','Electrical'] },
    { id: 2, title: 'Laredo International Bridge Expansion', sector: 'Government', budget: '$85M', location: 'Laredo, TX',       status: 'Open', description: 'TxDOT project seeking general contractors for bridge widening and customs plaza expansion.',                         tags: ['General Contractor','Concrete','Steel'] },
    { id: 3, title: 'SpaceX Starbase Facility Expansion',sector: 'Technology',  budget: '$220M', location: 'Brownsville, TX',  status: 'Open', description: 'Infrastructure and facility construction for launch site expansion. Local contractors encouraged to apply.',          tags: ['Construction','Industrial','Electrical'] },
    { id: 4, title: 'Rio Grande Valley Data Center',     sector: 'Technology',  budget: '$180M', location: 'McAllen, TX',      status: 'Open', description: 'New data center construction seeking local contractors for civil work, electrical, and mechanical systems.',          tags: ['Civil','Electrical','HVAC'] },
    { id: 5, title: 'UTRGV Medical School Construction', sector: 'Healthcare',  budget: '$95M',  location: 'Edinburg, TX',     status: 'Open', description: 'New medical education facility. Seeking DBE/HUBZone certified subcontractors for multiple trades.',                   tags: ['Construction','Plumbing','Electrical'] },
    { id: 6, title: 'Nuevo Laredo Industrial Park',      sector: 'Manufacturing',budget: '$65M', location: 'Nuevo Laredo, TAM',status: 'Open', description: 'New maquiladora industrial park seeking construction and infrastructure contractors on both sides of border.',       tags: ['Site Development','Construction','Utilities'] },
]

export default function Opportunities() {
    const [opps,       setOpps]       = useState([])
    const [loading,    setLoading]    = useState(true)
    const [watchIds,   setWatchIds]   = useState(new Set())
    const [userId,     setUserId]     = useState(null)
    const [watchingId, setWatchingId] = useState(null)

    useEffect(() => {
        async function load() {
            const { data: { session } } = await sb.auth.getSession()
            if (session?.user) {
                setUserId(session.user.id)
                fetchWatchIds(session.user.id).then(setWatchIds)
            }
            const { data } = await sb.from('projects').select('*').eq('status', 'active').order('created_at', { ascending: false })
            setOpps(data || [])
            setLoading(false)
        }
        load()
    }, [])

    const display = opps.length > 0 ? opps : DEMO

    async function toggleWatch(e, opp) {
        e.stopPropagation()
        if (!userId) return
        if (watchingId === opp.id) return
        setWatchingId(opp.id)
        const key = `opportunity:${opp.id}`
        const isWatching = watchIds.has(key)
        if (isWatching) {
            await removeWatch(userId, 'opportunity', opp.id)
            setWatchIds(prev => { const s = new Set(prev); s.delete(key); return s })
        } else {
            const ok = await addWatch(userId, 'opportunity', opp.id, opp.title)
            if (ok) {
                setWatchIds(prev => new Set([...prev, key]))
                logActivity(userId, 'watched_opportunity', opp.title, String(opp.id))
            }
        }
        setWatchingId(null)
    }

    return (
        <div>
            <div className="bg-[#0F0F0E] px-4 sm:px-14 pt-8 sm:pt-11 pb-8">
                <div className="text-xs font-bold tracking-widest text-[#E87850]/80 uppercase mb-2">Project Opportunities</div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                    <div>
                        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white mb-1">Active Projects</h1>
                        <p className="text-sm text-white/40">{display.length} open opportunities across the region</p>
                    </div>
                    <button className="sm:flex-shrink-0 px-4 py-2 bg-[#1A6B72] text-white rounded-lg text-sm font-semibold self-start sm:self-auto">+ Post a Project</button>
                </div>
            </div>

            <div className="px-4 sm:px-14 py-8 bg-[#F7F3EE]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array(4).fill(0).map((_,i)=>(
                            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {display.map((o) => {
                            const key = `opportunity:${o.id}`
                            const isWatching = watchIds.has(key)
                            return (
                                <div key={o.id} className="bg-white border border-[#E2DDD6] rounded-xl p-6 hover:border-[#1A6B72] hover:-translate-y-0.5 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${sectorColors[o.sector] || 'bg-[#E3F0F1] text-[#1A6B72]'}`}>
                                            {o.sector}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold px-2 py-1 bg-[#E4F0EA] text-[#2A6B43] rounded">● {o.status || 'Open'}</span>
                                            {userId && (
                                                <button
                                                    onClick={e=>toggleWatch(e, o)}
                                                    disabled={watchingId === o.id}
                                                    className={`text-sm px-2 py-1 rounded border transition font-semibold ${isWatching ? 'bg-[#FBF4E3] border-[#D4B060] text-[#B07D1A]' : 'border-[#E2DDD6] text-[#888780] hover:border-[#B07D1A] hover:text-[#B07D1A]'}`}
                                                    title={isWatching ? 'Unfollow' : 'Follow opportunity'}
                                                >
                                                    {isWatching ? '⭐ Following' : '☆ Follow'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-serif text-lg font-bold text-[#0F0F0E] mb-1">{o.title}</h3>
                                    <p className="text-xs text-[#5C5C54] mb-1">📍 {o.location} · 💰 {o.budget}</p>
                                    <p className="text-sm text-[#5C5C54] leading-relaxed mb-4">{o.description}</p>
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {(o.tags||[]).map(t=>(
                                            <span key={t} className="text-xs px-2 py-0.5 bg-[#F7F3EE] border border-[#E2DDD6] rounded text-[#5C5C54]">{t}</span>
                                        ))}
                                    </div>
                                    <button className="w-full py-2.5 bg-[#1A6B72] text-white rounded-lg text-sm font-semibold hover:bg-[#155960] transition-all">
                                        Express Interest →
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
