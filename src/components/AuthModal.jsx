import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'

export default function AuthModal({ initialTab = 'signin', onClose }) {
  const [tab,        setTab]        = useState(initialTab)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [forgotMode, setForgotMode] = useState(false)

  // form fields
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [confirm,  setConfirm]  = useState('')

  // password visibility
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const overlayRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function switchTab(t) {
    setTab(t); setError(''); setSuccess(''); setForgotMode(false)
    setEmail(''); setPassword(''); setName(''); setConfirm('')
    setShowPass(false); setShowConfirm(false)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error: err } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      if (err.message.includes('Invalid login credentials')) setError('Incorrect email or password.')
      else if (err.message.includes('Email not confirmed'))  setError('Please confirm your email before signing in.')
      else setError(err.message)
    } else {
      onClose()
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setError(''); setLoading(true)
    const { error: err } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    setLoading(false)
    if (err) setError(err.message)
    else     setSuccess('Check your email to confirm your account.')
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email) { setError('Enter your email address above.'); return }
    setError(''); setLoading(true)
    const { error: err } = await sb.auth.resetPasswordForEmail(email)
    setLoading(false)
    if (err) setError(err.message)
    else     setSuccess('Password reset email sent. Check your inbox.')
  }

  async function handleGoogleSignIn() {
    setError(''); setLoading(true)
    const { error: err } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
    })
    if (err) { setError(err.message); setLoading(false) }
    // on success the browser redirects — no setLoading(false) needed
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-[#E2DDD6] rounded-lg focus:outline-none focus:border-[#1A6B72] focus:ring-1 focus:ring-[#1A6B72]/30 transition bg-white text-[#0F0F0E] placeholder:text-[#B8B4AE]'
  const btnPrimary = 'w-full py-2.5 rounded-lg bg-[#1A6B72] hover:bg-[#155960] text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'

  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
  const EyeOffIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm border border-[#E2DDD6] overflow-hidden pb-safe"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1A6B72]"></span>
            <span className="font-serif font-bold text-[#0F0F0E]">RioData</span>
          </div>
          <button onClick={onClose} className="text-[#888780] hover:text-[#0F0F0E] transition text-lg leading-none">✕</button>
        </div>

        {/* Tabs */}
        {!forgotMode && (
          <div className="flex mx-6 mb-5 bg-[#F7F3EE] rounded-lg p-0.5">
            {[['signin','Sign In'],['signup','Sign Up']].map(([t,l]) => (
              <button key={t} onClick={() => switchTab(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${tab === t ? 'bg-white text-[#0F0F0E] shadow-sm' : 'text-[#5C5C54] hover:text-[#0F0F0E]'}`}>
                {l}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 pb-6">

          {/* Success message */}
          {success && (
            <div className="mb-4 px-3 py-2.5 bg-[#E4F0EA] border border-[#B8D8C8] rounded-lg text-sm text-[#2A6B43]">
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-[#FBE9E3] border border-[#E8C4B8] rounded-lg text-sm text-[#B8431E]">
              {error}
            </div>
          )}

          {/* Forgot password mode */}
          {forgotMode && (
            <>
              <div className="mb-5">
                <h3 className="text-base font-semibold text-[#0F0F0E] mb-1">Reset password</h3>
                <p className="text-xs text-[#888780]">Enter your email and we'll send a reset link.</p>
              </div>
              <form onSubmit={handleForgot} className="flex flex-col gap-3">
                <input type="email" required placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)} className={inputCls} />
                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => { setForgotMode(false); setError(''); setSuccess('') }}
                  className="text-xs text-[#5C5C54] hover:text-[#0F0F0E] text-center transition mt-1">
                  ← Back to Sign In
                </button>
              </form>
            </>
          )}

          {/* Google button — shown on both tabs, not in forgot mode */}
          {!forgotMode && (tab === 'signin' || tab === 'signup') && !success && (
            <>
              <button type="button" onClick={handleGoogleSignIn} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-[#E2DDD6] bg-white hover:bg-[#F7F3EE] text-sm font-medium text-[#0F0F0E] transition disabled:opacity-50 disabled:cursor-not-allowed mb-4">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#E2DDD6]"></div>
                <span className="text-xs text-[#B8B4AE] font-medium">or</span>
                <div className="flex-1 h-px bg-[#E2DDD6]"></div>
              </div>
            </>
          )}

          {/* Sign In form */}
          {!forgotMode && tab === 'signin' && (
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <input type="email" required placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} className={inputCls} />
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)} className={inputCls + ' pr-10'} />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#0F0F0E] transition">
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button type="button" onClick={() => { setForgotMode(true); setError(''); setSuccess('') }}
                className="text-xs text-[#888780] hover:text-[#1A6B72] text-center transition">
                Forgot password?
              </button>
            </form>
          )}

          {/* Sign Up form */}
          {!forgotMode && tab === 'signup' && !success && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-3">
              <input type="text" required placeholder="Full name" value={name}
                onChange={e => setName(e.target.value)} className={inputCls} />
              <input type="email" required placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} className={inputCls} />
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required placeholder="Password (min 6 characters)" value={password}
                  onChange={e => setPassword(e.target.value)} className={inputCls + ' pr-10'} />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#0F0F0E] transition">
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} required placeholder="Confirm password" value={confirm}
                  onChange={e => setConfirm(e.target.value)} className={inputCls + ' pr-10'} />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#0F0F0E] transition">
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          {/* After sign-up success, offer to switch to sign-in */}
          {!forgotMode && tab === 'signup' && success && (
            <button onClick={() => switchTab('signin')}
              className="w-full py-2.5 rounded-lg border border-[#1A6B72] text-[#1A6B72] text-sm font-semibold hover:bg-[#EBF5F6] transition mt-2">
              Go to Sign In
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
