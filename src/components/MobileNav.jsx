import { Link, useLocation } from 'react-router-dom'

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function IconAnalytics() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function IconCompanies() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  )
}

function IconMap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconDashboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

const LINKS = [
  { path: '/',            label: 'Home',      Icon: IconHome      },
  { path: '/analytics',   label: 'Analytics', Icon: IconAnalytics },
  { path: '/directory',   label: 'Companies', Icon: IconCompanies },
  { path: '/map',         label: 'Map',       Icon: IconMap       },
  { path: '/dashboard',   label: 'Dashboard', Icon: IconDashboard },
]

export default function MobileNav() {
  const { pathname } = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E2DDD6] flex h-16 safe-area-inset-bottom">
      {LINKS.map(({ path, label, Icon }) => {
        const active = pathname === path || (path !== '/' && pathname.startsWith(path))
        return (
          <Link key={path} to={path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors relative ${
              active ? 'text-[#1A6B72]' : 'text-[#888780]'
            }`}>
            {active && <span className="absolute top-0 left-2 right-2 h-0.5 rounded-b bg-[#1A6B72]" />}
            <Icon />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
