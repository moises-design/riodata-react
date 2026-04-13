import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Directory from './pages/Directory'
import Opportunities from './pages/Opportunities'
import Analytics from './pages/Analytics'
import Workforce from './pages/Workforce'
import About from './pages/About'
import Onboarding from './pages/Onboarding'
import Map from './pages/Map'
import Nav from './components/Nav'

function App() {
  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/workforce" element={<Workforce />} />
        <Route path="/about" element={<About />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/map" element={<Map />} />
      </Routes>
    </div>
  )
}

export default App