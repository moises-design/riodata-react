import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { path: '/',            label: 'Home',      icon: '🏠' },
  { path: '/analytics',   label: 'Analytics', icon: '📊' },
  { path: '/directory',   label: 'Companies', icon: '🏢' },
  { path: '/map',         label: 'Map',       icon: '🗺️' },
  { path: '/dashboard',   label: 'Dashboard', icon: '👤' },
]

export default function MobileNav() {
  const { pathname } = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E2DDD6] flex h-16 safe-area-inset-bottom">
      {LINKS.map(({ path, label, icon }) => {
        const active = pathname === path || (path !== '/' && pathname.startsWith(path))
        return (
          <Link key={path} to={path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              active ? 'text-[#1A6B72]' : 'text-[#888780]'
            }`}>
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
            {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A6B72]" style={{position:'relative'}} />}
          </Link>
        )
      })}
    </nav>
  )
}
