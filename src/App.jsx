import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Directory from './pages/Directory'
import CompanyProfile from './pages/CompanyProfile'
import Opportunities from './pages/Opportunities'
import Analytics from './pages/Analytics'
import Workforce from './pages/Workforce'
import About from './pages/About'
import Onboarding from './pages/Onboarding'
import Map from './pages/Map'
import Profile from './pages/Profile'
import Membership from './pages/Membership'
import ResetPassword from './pages/ResetPassword'
import Nav from './components/Nav'
import MobileNav from './components/MobileNav'

function App() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-16 md:pb-0">
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/companies/:id" element={<CompanyProfile />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/workforce" element={<Workforce />} />
        <Route path="/about" element={<About />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/map" element={<Map />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
      <MobileNav />
    </div>
  )
}

export default App
