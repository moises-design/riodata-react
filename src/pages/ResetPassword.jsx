import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'

export default function ResetPassword() {
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [ready, setReady] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') setReady(true)
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleSubmit = async () => {
        setError(null)
        if (password !== confirm) return setError("Passwords don't match.")
        if (password.length < 8) return setError('Minimum 8 characters.')

        const { error } = await sb.auth.updateUser({ password })
        if (error) return setError(error.message)

        setSuccess(true)
        setTimeout(() => navigate('/dashboard'), 2000)
    }

    if (!ready) return (
        <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-12 max-w-md w-full text-center">
                <div className="text-4xl mb-4">🔐</div>
                <p className="text-sm text-[#5C5C54]">Verifying reset link…</p>
            </div>
        </div>
    )

    if (success) return (
        <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-12 max-w-md w-full text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="font-serif text-3xl font-bold mb-2">Password updated!</h2>
                <p className="text-sm text-[#5C5C54]">Redirecting you to your dashboard…</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-10 max-w-md w-full">
                <h2 className="font-serif text-3xl font-bold mb-1">Set New Password</h2>
                <p className="text-sm text-[#5C5C54] mb-6">Choose a password with at least 8 characters.</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">New Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                            placeholder="Min 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[#5C5C54] mb-1 block">Confirm Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 border border-[#E2DDD6] rounded-xl text-sm focus:outline-none focus:border-[#1A6B72]"
                            placeholder="Repeat password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                        />
                    </div>
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
                    )}
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={!password || !confirm}
                    className="w-full mt-6 py-3 bg-[#1A6B72] text-white rounded-xl font-semibold disabled:opacity-40"
                >
                    Update Password →
                </button>
            </div>
        </div>
    )
}
