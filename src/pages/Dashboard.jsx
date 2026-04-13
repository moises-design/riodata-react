import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'

export default function Dashboard() {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [company, setCompany] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        async function load() {
            const { data: { session } } = await sb.auth.getSession()
            if (!session) { navigate('/'); return }
            setUser(session.user)
            const { data: prof } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
            setProfile(prof)
            const { data: comp } = await sb.from('companies').select('*').eq('contact_email', session.user.email).single()
            setCompany(comp)
            setLoading(false)
        }
        load()
    }, [])

    async function signOut() {
        await sb.auth.signOut()
        navigate('/')
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F7F3EE]">
            <div className="max-w-5xl mx-auto px-6 py-10">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[#5C5C54] mb-1">Dashboard</div>
                        <h1 className="font-serif text-4xl font-bold text-[#0F0F0E]">
                            Welcome, {profile?.full_name || user?.email?.split('@')[0]}
                        </h1>
                    </div>
                    <button onClick={signOut} className="px-4 py-2 border border-[#E2DDD6] rounded-lg text-sm text-[#5C5C54] hover:border-[#0F0F0E] bg-white">
                        Sign Out
                    </button>
                </div>

                {/* COMPANY STATUS */}
                {company ? (
                    <div className="bg-white border border-[#E2DDD6] rounded-2xl p-6 mb-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-[#1A6B72] mb-1">Your Business</div>
                                <h2 className="font-serif text-2xl font-bold text-[#0F0F0E]">{company.legal_name}</h2>
                                <p className="text-sm text-[#5C5C54] mt-1">📍 {company.city}{company.state_province?', '+company.state_province:''} · {company.sector}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${company.status==='active'?'bg-[#E4F0EA] text-[#2A6B43]':'bg-[#FBF4E3] text-[#B07D1A]'}`}>
                                {company.status==='active'?'✅ Active':'⏳ Pending Review'}
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {company.ready_to_work && <span className="px-3 py-1 bg-[#E4F0EA] text-[#2A6B43] rounded-full text-xs font-bold">Ready to Work</span>}
                            {company.cert_sam && <span className="px-3 py-1 bg-[#E3F0F1] text-[#1A6B72] rounded-full text-xs font-bold">SAM</span>}
                            {company.cert_hubzone && <span className="px-3 py-1 bg-[#E3F0F1] text-[#1A6B72] rounded-full text-xs font-bold">HUBZone</span>}
                            {company.cert_immex && <span className="px-3 py-1 bg-[#E3F0F1] text-[#1A6B72] rounded-full text-xs font-bold">IMMEX</span>}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-[#E2DDD6] rounded-2xl p-8 mb-6 text-center">
                        <div className="text-4xl mb-3">🏢</div>
                        <h2 className="font-serif text-xl font-bold mb-2">Register Your Business</h2>
                        <p className="text-sm text-[#5C5C54] mb-4">Get discovered by projects, partners, and buyers across the region.</p>
                        <button onClick={()=>navigate('/onboarding')} className="px-6 py-3 bg-[#1A6B72] text-white rounded-xl font-semibold text-sm">
                            Register Now — Free, 8 minutes →
                        </button>
                    </div>
                )}

                {/* QUICK ACTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        { icon:'🔍', title:'Company Directory', desc:'Search and connect with businesses', path:'/directory' },
                        { icon:'📋', title:'Opportunities', desc:'Browse active project listings', path:'/opportunities' },
                        { icon:'📊', title:'Regional Data', desc:'Analytics and economic intelligence', path:'/analytics' },
                    ].map(a=>(
                        <button key={a.title} onClick={()=>navigate(a.path)}
                            className="bg-white border border-[#E2DDD6] rounded-xl p-5 text-left hover:border-[#1A6B72] hover:-translate-y-0.5 hover:shadow-md transition-all">
                            <div className="text-2xl mb-3">{a.icon}</div>
                            <div className="font-semibold text-sm text-[#0F0F0E]">{a.title}</div>
                            <div className="text-xs text-[#5C5C54] mt-1">{a.desc}</div>
                        </button>
                    ))}
                </div>

                {/* ACCOUNT INFO */}
                <div className="bg-white border border-[#E2DDD6] rounded-2xl p-6">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-4">Account</div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#1A6B72] flex items-center justify-center text-white font-serif text-xl font-bold">
                            {(profile?.full_name||user?.email||'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="font-semibold text-sm">{profile?.full_name||'User'}</div>
                            <div className="text-xs text-[#5C5C54]">{user?.email}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}