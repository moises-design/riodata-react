import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { fetchSavedIds, saveCompany, unsaveCompany, logActivity } from '../lib/db'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const CITY_COORDS = {
  'Laredo':[-99.5075,27.5036],'McAllen':[-98.2301,26.2034],'Edinburg':[-98.1633,26.3017],
  'Mission':[-98.3251,26.2159],'Pharr':[-98.1847,26.1939],'Harlingen':[-97.6961,26.1906],
  'Brownsville':[-97.4975,25.9017],'Hidalgo':[-98.2602,26.1009],'Reynosa':[-98.2977,26.0852],
  'Matamoros':[-97.5032,25.8692],'San Antonio':[-98.4936,29.4241],'Houston':[-95.3698,29.7604],
}

const SECTOR_COLORS = {
  Construction:'bg-[#E3F0F1] text-[#1A6B72]',
  Energy:'bg-[#F2E8E3] text-[#B8431E]',
  Manufacturing:'bg-[#EDE8F8] text-[#5B3FA6]',
  Logistics:'bg-[#FBF4E3] text-[#B07D1A]',
  Technology:'bg-[#E3F0F1] text-[#1A5CB8]',
  Healthcare:'bg-[#E4F0EA] text-[#2A6B43]',
  Government:'bg-[#E3F0F1] text-[#1A6B72]',
}

function Skeleton({ className = '' }) {
  return <div className={`bg-[#E8E4DF] rounded animate-pulse ${className}`} />
}

export default function CompanyProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const mapContainer = useRef(null)
  const mapRef = useRef(null)

  const [company,   setCompany]   = useState(null)
  const [related,   setRelated]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [userId,    setUserId]    = useState(null)
  const [savedIds,  setSavedIds]  = useState(new Set())
  const [saving,    setSaving]    = useState(false)
  const [claimSent, setClaimSent] = useState(false)

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        fetchSavedIds(session.user.id).then(setSavedIds)
      }
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await sb.from('companies').select('*').eq('id', id).maybeSingle()
      if (err || !data) { setError('Company not found.'); setLoading(false); return }
      setCompany(data)

      // Log view
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) logActivity(session.user.id, 'viewed_company', data.legal_name, data.id)
      })

      // Related companies
      const { data: rel } = await sb.from('companies')
        .select('id, legal_name, city, sector, ready_to_work, country')
        .eq('status', 'active')
        .eq('sector', data.sector)
        .neq('id', data.id)
        .limit(4)
      setRelated(rel || [])
      setLoading(false)
    }
    load()
  }, [id])

  // Mapbox mini-map
  useEffect(() => {
    if (!company || !mapContainer.current) return
    const coords = CITY_COORDS[company.city] || (company.country === 'MX'
      ? [-99.0 + (Math.random() - .5), 26.0 + (Math.random() - .5)]
      : [-98.5 + (Math.random() - .5), 26.3 + (Math.random() - .5)])

    let map
    import('https://cdn.jsdelivr.net/npm/mapbox-gl@3.2.0/dist/mapbox-gl.js').then(m => {
      const mapboxgl = m.default
      mapboxgl.accessToken = MAPBOX_TOKEN
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: coords,
        zoom: 12,
        interactive: false,
      })
      map.on('load', () => {
        new mapboxgl.Marker({ color: '#1A6B72' }).setLngLat(coords).addTo(map)
      })
      mapRef.current = map
    })
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [company])

  async function toggleSave() {
    if (!userId || saving) return
    setSaving(true)
    const isSaved = savedIds.has(company.id)
    if (isSaved) {
      await unsaveCompany(userId, company.id)
      setSavedIds(prev => { const s = new Set(prev); s.delete(company.id); return s })
      logActivity(userId, 'unsaved_company', company.legal_name, company.id)
    } else {
      const ok = await saveCompany(userId, company.id)
      if (ok) {
        setSavedIds(prev => new Set([...prev, company.id]))
        logActivity(userId, 'saved_company', company.legal_name, company.id)
      }
    }
    setSaving(false)
  }

  function claimListing() {
    const subject = encodeURIComponent(`Claim Listing: ${company.legal_name}`)
    const body = encodeURIComponent(`I'd like to claim the listing for ${company.legal_name} (ID: ${company.id}) on RioData.\n\nMy name:\nMy title:\nMy contact:`)
    window.open(`mailto:hello@riodata.org?subject=${subject}&body=${body}`)
    setClaimSent(true)
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Skeleton className="h-4 w-48 mb-8" />
      <div className="bg-white border border-[#E2DDD6] rounded-2xl p-8 mb-6">
        <Skeleton className="h-8 w-64 mb-3" />
        <Skeleton className="h-4 w-40 mb-6" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-center">
      <div className="text-4xl mb-4">🔍</div>
      <h2 className="font-serif text-2xl font-bold text-[#0F0F0E] mb-2">{error}</h2>
      <Link to="/directory" className="text-[#1A6B72] text-sm font-medium hover:underline">← Back to Directory</Link>
    </div>
  )

  const isSaved = savedIds.has(company.id)
  const sectorCls = SECTOR_COLORS[company.sector] || 'bg-[#E3F0F1] text-[#1A6B72]'
  const initials = (company.legal_name || 'C').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-[#888780]">
          <Link to="/directory" className="hover:text-[#1A6B72] transition">Companies</Link>
          <span>/</span>
          <span className="text-[#0F0F0E] font-medium truncate">{company.legal_name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Header Card */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#E3F0F1] flex items-center justify-center font-serif text-xl font-bold text-[#1A6B72] flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F0F0E] leading-tight">{company.legal_name}</h1>
                    <p className="text-sm text-[#5C5C54] mt-1">
                      📍 {company.city}{company.state_province ? ', ' + company.state_province : ''} {company.country === 'MX' ? '🇲🇽' : '🇺🇸'}
                    </p>
                  </div>
                </div>
                {userId && (
                  <button onClick={toggleSave} disabled={saving}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                      isSaved
                        ? 'bg-[#E3F0F1] border-[#B8D8DC] text-[#1A6B72]'
                        : 'border-[#E2DDD6] text-[#5C5C54] hover:border-[#1A6B72] hover:text-[#1A6B72]'
                    }`}>
                    🔖 {isSaved ? 'Saved' : 'Save'}
                  </button>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {company.sector && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${sectorCls}`}>{company.sector}</span>
                )}
                {company.ready_to_work && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E4F0EA] text-[#2A6B43]">✅ Ready to Work</span>
                )}
                {company.cert_sam     && <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E3F0F1] text-[#1A6B72]">✓ SAM</span>}
                {company.cert_hubzone && <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E3F0F1] text-[#1A6B72]">✓ HUBZone</span>}
                {company.cert_immex   && <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E3F0F1] text-[#1A6B72]">✓ IMMEX</span>}
              </div>

              {/* Description */}
              {company.description && (
                <p className="text-sm text-[#5C5C54] leading-relaxed mb-5">{company.description}</p>
              )}

              {/* Services */}
              {company.services?.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-2">Services</div>
                  <div className="flex flex-wrap gap-1.5">
                    {company.services.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 bg-[#F7F3EE] border border-[#E2DDD6] rounded text-[#5C5C54]">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="border-t border-[#F0EDE8] pt-5 flex flex-col sm:flex-row gap-3">
                {company.contact_email && (
                  <a href={`mailto:${company.contact_email}`}
                    className="flex-1 py-3 bg-[#1A6B72] text-white text-center rounded-xl font-semibold text-sm hover:bg-[#155960] transition">
                    📧 Email {company.contact_name || 'This Company'}
                  </a>
                )}
                {company.website && (
                  <a href={company.website.startsWith('http') ? company.website : 'https://' + company.website}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-3 border border-[#E2DDD6] text-[#1A6B72] text-center rounded-xl font-semibold text-sm hover:border-[#1A6B72] hover:bg-[#F0F9FA] transition">
                    🌐 Visit Website
                  </a>
                )}
                {company.phone && (
                  <a href={`tel:${company.phone}`}
                    className="flex-1 py-3 border border-[#E2DDD6] text-[#0F0F0E] text-center rounded-xl font-semibold text-sm hover:bg-[#F7F3EE] transition">
                    📞 {company.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Map Card */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F0EDE8]">
                <div className="text-sm font-semibold text-[#0F0F0E]">Location</div>
                <div className="text-xs text-[#888780] mt-0.5">
                  {company.city}{company.state_province ? ', ' + company.state_province : ''}, {company.country === 'MX' ? 'Mexico' : 'USA'}
                </div>
              </div>
              <div ref={mapContainer} className="h-48 sm:h-64" />
            </div>

            {/* Related Companies */}
            {related.length > 0 && (
              <div className="bg-white border border-[#E2DDD6] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
                  <div className="text-sm font-semibold text-[#0F0F0E]">Related Companies</div>
                  <span className="text-xs text-[#888780]">Same sector & region</span>
                </div>
                <div className="divide-y divide-[#F7F4F0]">
                  {related.map(c => (
                    <Link key={c.id} to={`/companies/${c.id}`}
                      className="flex items-center gap-3 px-6 py-4 hover:bg-[#F7F3EE] transition">
                      <div className="w-9 h-9 rounded-lg bg-[#E3F0F1] flex items-center justify-center font-bold text-[#1A6B72] text-sm flex-shrink-0">
                        {(c.legal_name || 'C')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#0F0F0E] truncate">{c.legal_name}</div>
                        <div className="text-xs text-[#888780]">📍 {c.city} {c.country === 'MX' ? '🇲🇽' : '🇺🇸'}</div>
                      </div>
                      {c.ready_to_work && <span className="text-xs text-[#2A6B43] font-bold shrink-0">✅ Ready</span>}
                      <span className="text-[#1A6B72] text-sm">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-4">

            {/* Company Details Card */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-4">Details</div>
              <div className="flex flex-col gap-3 text-sm">
                {company.sector && (
                  <div className="flex items-start gap-2">
                    <span className="text-[#888780] w-16 shrink-0 text-xs mt-0.5">Sector</span>
                    <span className="font-medium text-[#0F0F0E]">{company.sector}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[#888780] w-16 shrink-0 text-xs mt-0.5">Location</span>
                  <span className="font-medium text-[#0F0F0E]">
                    {company.city}{company.state_province ? ', ' + company.state_province : ''}
                    {company.country === 'MX' ? ', Mexico' : ', TX'}
                  </span>
                </div>
                {company.employee_count && (
                  <div className="flex items-start gap-2">
                    <span className="text-[#888780] w-16 shrink-0 text-xs mt-0.5">Size</span>
                    <span className="font-medium text-[#0F0F0E]">{company.employee_count} employees</span>
                  </div>
                )}
                {company.year_founded && (
                  <div className="flex items-start gap-2">
                    <span className="text-[#888780] w-16 shrink-0 text-xs mt-0.5">Founded</span>
                    <span className="font-medium text-[#0F0F0E]">{company.year_founded}</span>
                  </div>
                )}
                {company.status && (
                  <div className="flex items-start gap-2">
                    <span className="text-[#888780] w-16 shrink-0 text-xs mt-0.5">Status</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${company.status === 'active' ? 'bg-[#E4F0EA] text-[#2A6B43]' : 'bg-[#FBF4E3] text-[#B07D1A]'}`}>
                      {company.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Claim Listing */}
            <div className="bg-[#F7F3EE] border border-[#E2DDD6] rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-2">Is this your business?</div>
              <p className="text-xs text-[#5C5C54] mb-3 leading-relaxed">Claim this listing to update your info, add photos, and respond to inquiries.</p>
              {claimSent ? (
                <div className="text-xs text-[#2A6B43] font-semibold">✅ Request sent! We'll be in touch.</div>
              ) : (
                <button onClick={claimListing}
                  className="w-full py-2.5 border border-[#1A6B72] text-[#1A6B72] rounded-lg text-xs font-semibold hover:bg-[#E3F0F1] transition">
                  Claim This Listing
                </button>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Quick Links</div>
              <div className="flex flex-col gap-1">
                {[
                  ['← Back to Directory', '/directory'],
                  ['View on Map', '/map'],
                  ['Browse Opportunities', '/opportunities'],
                  ['Analytics Dashboard', '/analytics'],
                ].map(([label, path]) => (
                  <Link key={path} to={path}
                    className="text-sm text-[#1A6B72] hover:text-[#155960] hover:underline py-1 transition">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
