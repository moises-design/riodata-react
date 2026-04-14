import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import AuthModal from './AuthModal'

// ── Nav ───────────────────────────────────────────────────────────────────────
export default function Nav() {
  const [user,        setUser]        = useState(null)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [dropOpen,    setDropOpen]    = useState(false)
  const [authModal,   setAuthModal]   = useState(null)   // null | 'signin' | 'signup'
  const dropRef   = useRef(null)
  const navigate  = useNavigate()

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    if (dropOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropOpen])

  async function signOut() {
    setDropOpen(false)
    await sb.auth.signOut()
    setUser(null)
    navigate('/')
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Account'

  const navLinks = [
    ['Home',          '/'],
    ['Analytics',     '/analytics'],
    ['Workforce',     '/workforce'],
    ['Companies',     '/directory'],
    ['Opportunities', '/opportunities'],
    ['About',         '/about'],
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
          {/* Dashboard link — logged-in only */}
          {user && (
            <Link to="/dashboard"
              className="flex items-center px-4 text-sm font-medium text-[#1A6B72] hover:text-[#0F0F0E] border-b-2 border-transparent hover:border-[#1A6B72] transition-all font-semibold">
              Dashboard
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            /* ── Avatar + dropdown ── */
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen(v => !v)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#E3F0F1] text-[#1A6B72] text-sm font-semibold hover:bg-[#D4E9EB] transition select-none"
              >
                <span className="w-5 h-5 rounded-full bg-[#1A6B72] text-white text-[10px] font-bold flex items-center justify-center">
                  {displayName[0].toUpperCase()}
                </span>
                {displayName}
                {/* chevron */}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform duration-150 ${dropOpen ? 'rotate-180' : ''}`}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Dropdown panel */}
              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-[#E2DDD6] rounded-xl shadow-lg overflow-hidden z-[100]">
                  <Link to="/dashboard"
                    onClick={() => setDropOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#0F0F0E] hover:bg-[#F7F3EE] transition">
                    <span className="text-base">📊</span> Dashboard
                  </Link>
                  <Link to="/profile"
                    onClick={() => setDropOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#0F0F0E] hover:bg-[#F7F3EE] transition border-t border-[#F0EDE8]">
                    <span className="text-base">✏️</span> Edit Profile
                  </Link>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#B8431E] hover:bg-[#FBE9E3] transition border-t border-[#F0EDE8]">
                    <span className="text-base">↩</span> Sign Out
                  </button>
                </div>
              )}
            </div>
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
            {user && (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                  className="py-3 px-4 text-[#7EC8D0] hover:text-white hover:bg-white/5 rounded-md text-sm font-semibold">
                  Dashboard
                </Link>
                <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                  <button onClick={() => { setMenuOpen(false); signOut() }}
                    className="flex-1 py-2 text-white/70 text-sm border border-white/20 rounded-lg">
                    Sign Out
                  </button>
                </div>
              </>
            )}
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
