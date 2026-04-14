import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'

// ── Auth modal ────────────────────────────────────────────────────────────────
function AuthModal({ initialTab = 'signin', onClose }) {
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
    else     setSuccess('Password reset email sent — check your inbox.')
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-[#E2DDD6] rounded-lg focus:outline-none focus:border-[#1A6B72] focus:ring-1 focus:ring-[#1A6B72]/30 transition bg-white text-[#0F0F0E] placeholder:text-[#B8B4AE]'
  const btnPrimary = 'w-full py-2.5 rounded-lg bg-[#1A6B72] hover:bg-[#155960] text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-[#E2DDD6] overflow-hidden">

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

          {/* Sign In form */}
          {!forgotMode && tab === 'signin' && (
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <input type="email" required placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} className={inputCls} />
              <input type="password" required placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} className={inputCls} />
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
              <input type="password" required placeholder="Password (min 6 characters)" value={password}
                onChange={e => setPassword(e.target.value)} className={inputCls} />
              <input type="password" required placeholder="Confirm password" value={confirm}
                onChange={e => setConfirm(e.target.value)} className={inputCls} />
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

// ── Nav ───────────────────────────────────────────────────────────────────────
export default function Nav() {
  const [user,      setUser]      = useState(null)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [authModal, setAuthModal] = useState(null)   // null | 'signin' | 'signup'
  const navigate = useNavigate()

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await sb.auth.signOut()
    setUser(null)
    navigate('/')
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Account'

  const navLinks = [
    ['Home', '/'],
    ['Analytics', '/analytics'],
    ['Workforce', '/workforce'],
    ['Companies', '/directory'],
    ['Opportunities', '/opportunities'],
    ['About', '/about'],
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/98 backdrop-blur border-b border-[#E2DDD6] h-14 flex items-center px-14 relative">
        <Link to="/" className="font-serif text-xl font-bold text-[#0F0F0E] mr-12 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1A6B72]"></span>
          RioData
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-stretch h-14 gap-0">
          {navLinks.map(([label, path]) => (
            <Link key={path} to={path}
              className="flex items-center px-4 text-sm font-medium text-[#5C5C54] hover:text-[#0F0F0E] border-b-2 border-transparent hover:border-[#1A6B72] transition-all">
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#E3F0F1] text-[#1A6B72] text-sm font-semibold">
                <span className="w-5 h-5 rounded-full bg-[#1A6B72] text-white text-[10px] font-bold flex items-center justify-center select-none">
                  {displayName[0].toUpperCase()}
                </span>
                {displayName}
              </span>
              <button onClick={signOut}
                className="px-3 py-1.5 rounded-md border border-[#E2DDD6] text-sm text-[#5C5C54] hover:border-[#0F0F0E] transition">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setAuthModal('signin')}
                className="px-4 py-1.5 rounded-md border border-[#E2DDD6] text-sm font-medium text-[#0F0F0E] hover:border-[#5C5C54] transition">
                Sign In
              </button>
              <button onClick={() => setAuthModal('signup')}
                className="px-4 py-1.5 rounded-md bg-[#1A6B72] text-white text-sm font-semibold hover:bg-[#155960] transition">
                Join Free
              </button>
            </>
          )}

          {/* Mobile burger */}
          <button className="md:hidden ml-2 text-xl" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="absolute top-14 left-0 right-0 bg-[#0F0F0E] flex flex-col p-4 gap-1 md:hidden z-50 shadow-lg">
            {navLinks.map(([label, path]) => (
              <Link key={path} to={path} onClick={() => setMenuOpen(false)}
                className="py-3 px-4 text-white/70 hover:text-white hover:bg-white/5 rounded-md text-sm font-medium">
                {label}
              </Link>
            ))}
            {!user && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                <button onClick={() => { setMenuOpen(false); setAuthModal('signin') }}
                  className="flex-1 py-2 text-white/70 text-sm border border-white/20 rounded-lg">
                  Sign In
                </button>
                <button onClick={() => { setMenuOpen(false); setAuthModal('signup') }}
                  className="flex-1 py-2 bg-[#1A6B72] text-white text-sm font-semibold rounded-lg">
                  Join Free
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Auth modal — rendered outside nav so z-index stacks correctly */}
      {authModal && (
        <AuthModal
          initialTab={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </>
  )
}
