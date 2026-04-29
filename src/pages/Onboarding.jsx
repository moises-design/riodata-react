import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'

export default function Onboarding() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [form, setForm] = useState({
        legal_name: '', city: '', state_province: '', country: 'US',
        sector: '', description: '', services: '',
        contact_name: '', contact_email: '', contact_phone: '',
        ready_to_work: false, cert_sam: false, cert_hubzone: false, cert_immex: false,
        password: ''
    })

    function update(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function submit() {
        setLoading(true)
        setError('')
        try {
            const { data: authData, error: authError } = await sb.auth.signUp({
                email: form.contact_email,
                password: form.password,
                options: { data: { full_name: form.contact_name, organization: form.legal_name } }
            })
            if (authError) throw authError

            const userId = authData.user?.id
            if (!userId) throw new Error('Account creation failed — no user ID returned. Please try again.')

            const { error: compError } = await sb.from('companies').insert({
                legal_name: form.legal_name,
                city: form.city,
                state_province: form.state_province,
                country: form.country,
                sector: form.sector,
                description: form.description,
                services: form.services.split(',').map(s => s.trim()).filter(Boolean),
                contact_name: form.contact_name,
                contact_email: form.contact_email,
                contact_phone: form.contact_phone,
                ready_to_work: form.ready_to_work,
                cert_sam: form.cert_sam,
                cert_hubzone: form.cert_hubzone,
                cert_immex: form.cert_immex,
                status: 'pending',
                submitted_by: userId
            })
            if (compError) throw compError
            setStep(4)
        } catch (e) {
            setError(e.message)
        }
        setLoading(false)
    }

    if (step === 4) return (
        <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-12 max-w-md w-full text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="font-serif text-3xl font-bold mb-2">You're listed!</h2>
                <p className="text-sm text-[#5C5C54] mb-6">Your business is now on RioData. Check your email to verify your account.</p>
                <button onClick={() => navigate('/')} className="w-full py-3 bg-[#1A6B72] text-white rounded-xl font-semibold">
                    Back to Home →
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-10 max-w-lg w-full">
                {/* PROGRESS */}
                <div className="flex gap-2 mb-8">
                    {[1,2,3].map(n => (
                        <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-[#1A6B72]' : 'bg-[#E2DDD6]'}`}></div>
                    ))}
                </div>

                {step === 1 && (
                    <div>
                        <h2 className="font-serif text-3xl font-bold mb-1">Your Business</h2>
                        <p className="text-sm text-[#5C5C54] mb-6">Tell us about your company</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Business Name *</label>
                                <input className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                    placeholder="Acme Construction LLC" value={form.legal_name} onChange={e=>update('legal_name',e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">City *</label>
                                    <input className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                        placeholder="Laredo" value={form.city} onChange={e=>update('city',e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Country *</label>
                                    <select className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                        value={form.country} onChange={e=>update('country',e.target.value)}>
                                        <option value="US">United States</option>
                                        <option value="MX">Mexico</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Sector *</label>
                                <select className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                    value={form.sector} onChange={e=>update('sector',e.target.value)}>
                                    <option value="">Select a sector</option>
                                    {['Construction','Energy','Manufacturing','Logistics','Technology','Healthcare','Government','Other'].map(s=>(
                                        <option key={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Description</label>
                                <textarea className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72] h-24 resize-none"
                                    placeholder="What does your company do?" value={form.description} onChange={e=>update('description',e.target.value)} />
                            </div>
                        </div>
                        <button onClick={()=>setStep(2)}
                            disabled={!form.legal_name||!form.city||!form.sector}
                            className="w-full mt-6 py-3 bg-[#1A6B72] text-white rounded-xl font-semibold disabled:opacity-40">
                            Continue →
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h2 className="font-serif text-3xl font-bold mb-1">Capabilities</h2>
                        <p className="text-sm text-[#5C5C54] mb-6">Help projects find you</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Services (comma separated)</label>
                                <input className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                    placeholder="Welding, Steel Fabrication, CNC Machining" value={form.services} onChange={e=>update('services',e.target.value)} />
                            </div>
                            <div className="border border-[#E2DDD6] rounded-xl p-4">
                                <div className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-3">Certifications</div>
                                <div className="space-y-2">
                                    {[
                                        ['cert_sam','SAM.gov Registered','US federal marketplace'],
                                        ['cert_hubzone','HUBZone Certified','Historically Underutilized Business Zone'],
                                        ['cert_immex','IMMEX Certified','Mexico manufacturing program'],
                                    ].map(([field,label,sub])=>(
                                        <label key={field} className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={form[field]} onChange={e=>update(field,e.target.checked)}
                                                className="w-4 h-4 accent-[#1A6B72]" />
                                            <div>
                                                <div className="text-sm font-semibold">{label}</div>
                                                <div className="text-xs text-[#5C5C54]">{sub}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center gap-3 p-4 border border-[#E2DDD6] rounded-xl cursor-pointer hover:border-[#1A6B72]">
                                <input type="checkbox" checked={form.ready_to_work} onChange={e=>update('ready_to_work',e.target.checked)}
                                    className="w-4 h-4 accent-[#1A6B72]" />
                                <div>
                                    <div className="text-sm font-bold text-[#2A6B43]">✅ Ready to Work</div>
                                    <div className="text-xs text-[#5C5C54]">Mark your company as actively seeking projects</div>
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={()=>setStep(1)} className="flex-1 py-3 border border-[#E2DDD6] rounded-xl text-sm font-semibold">← Back</button>
                            <button onClick={()=>setStep(3)} className="flex-1 py-3 bg-[#1A6B72] text-white rounded-xl font-semibold">Continue →</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h2 className="font-serif text-3xl font-bold mb-1">Create Account</h2>
                        <p className="text-sm text-[#5C5C54] mb-6">Free forever. Manage your listing.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Your Name *</label>
                                <input className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                    placeholder="John Smith" value={form.contact_name} onChange={e=>update('contact_name',e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Email *</label>
                                <input type="email" className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                    placeholder="john@company.com" value={form.contact_email} onChange={e=>update('contact_email',e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Phone</label>
                                <input className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                    placeholder="+1 956-000-0000" value={form.contact_phone} onChange={e=>update('contact_phone',e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Password *</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} className="w-full px-4 py-3 pr-12 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                                        placeholder="Min 8 characters" value={form.password} onChange={e=>update('password',e.target.value)} />
                                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#0F0F0E] transition">
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                                <line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={()=>setStep(2)} className="flex-1 py-3 border border-[#E2DDD6] rounded-xl text-sm font-semibold">← Back</button>
                            <button onClick={submit} disabled={loading||!form.contact_email||!form.password}
                                className="flex-1 py-3 bg-[#1A6B72] text-white rounded-xl font-semibold disabled:opacity-40">
                                {loading ? 'Submitting...' : 'Submit →'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}