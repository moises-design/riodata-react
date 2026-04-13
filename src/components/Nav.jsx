import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

export default function Nav() {
    const [user, setUser] = useState(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        sb.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null)
        })
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

    const navLinks = [
        ['Home', '/'],
        ['Analytics', '/analytics'],
        ['Workforce', '/workforce'],
        ['Companies', '/directory'],
        ['Opportunities', '/opportunities'],
        ['About', '/about'],
    ]

    return (
        <nav className="sticky top-0 z-50 bg-white/98 backdrop-blur border-b border-[#E2DDD6] h-14 flex items-center px-14 relative">
            <Link to="/" className="font-serif text-xl font-bold text-[#0F0F0E] mr-12 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1A6B72]"></span>
                RioData
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-stretch h-14 gap-0">
                {navLinks.map(([label, path]) => (
                    <Link
                        key={path}
                        to={path}
                        className="flex items-center px-4 text-sm font-medium text-[#5C5C54] hover:text-[#0F0F0E] border-b-2 border-transparent hover:border-[#1A6B72] transition-all"
                    >
                        {label}
                    </Link>
                ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
                {user ? (
                    <>
                        <Link to="/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#E3F0F1] text-[#1A6B72] text-sm font-semibold">
                            Dashboard
                        </Link>
                        <button onClick={signOut} className="px-3 py-1.5 rounded-md border border-[#E2DDD6] text-sm text-[#5C5C54] hover:border-[#0F0F0E]">
                            Sign Out
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/dashboard" className="px-4 py-1.5 rounded-md border border-[#E2DDD6] text-sm font-medium text-[#0F0F0E] hover:border-[#5C5C54]">
                            Sign In
                        </Link>
                        <Link to="/onboarding" className="px-4 py-1.5 rounded-md bg-[#1A6B72] text-white text-sm font-semibold hover:bg-[#155960]">
                            Join Free
                        </Link>
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
                </div>
            )}
        </nav>
    )
}