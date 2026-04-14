import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { sb } from '../lib/supabase'
import { fetchBorderWaitTimes } from '../lib/apis'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

// ─── Static data ───────────────────────────────────────────────────────────────

const CITY_COORDS = {
  'Laredo':       [-99.5075, 27.5036],
  'Nuevo Laredo': [-99.5161, 27.4763],
  'McAllen':      [-98.2301, 26.2034],
  'Edinburg':     [-98.1633, 26.3017],
  'Mission':      [-98.3251, 26.2159],
  'Pharr':        [-98.1847, 26.1939],
  'Harlingen':    [-97.6961, 26.1906],
  'Brownsville':  [-97.4975, 25.9017],
  'Hidalgo':      [-98.2602, 26.1009],
  'Reynosa':      [-98.2977, 26.0852],
  'Matamoros':    [-97.5032, 25.8692],
  'Rio Bravo':    [-98.0833, 26.0833],
  'Río Bravo':    [-98.0833, 26.0833],
  'Valle Hermoso':[-97.6597, 25.6731],
  'San Juan':     [-98.1558, 26.1895],
  'Weslaco':      [-97.9903, 26.1595],
}

const SECTOR_COLORS = {
  Construction: '#1A6B72',
  Energy:       '#B8431E',
  Manufacturing:'#5B3FA6',
  Logistics:    '#B07D1A',
  Technology:   '#1A5CB8',
  Healthcare:   '#2A6B43',
  Government:   '#5C5C54',
  default:      '#888780',
}

const SECTORS = ['Construction', 'Energy', 'Manufacturing', 'Logistics', 'Technology', 'Healthcare', 'Government']

const BORDER_CROSSINGS = [
  { id: '230404', label: 'World Trade Bridge',  coords: [-99.4985, 27.5234], area: 'Laredo',      focus: 'commercial' },
  { id: '230401', label: 'Gateway to Americas', coords: [-99.5128, 27.4955], area: 'Laredo',      focus: 'passenger'  },
  { id: '230402', label: 'Juárez–Lincoln',       coords: [-99.5001, 27.4820], area: 'Laredo',      focus: 'passenger'  },
  { id: '230502', label: 'Pharr International', coords: [-98.1826, 26.1700], area: 'McAllen',     focus: 'commercial' },
  { id: '230501', label: 'Hidalgo–Reynosa',      coords: [-98.2672, 26.0950], area: 'McAllen',     focus: 'passenger'  },
  { id: '535503', label: 'Los Indios',           coords: [-97.7510, 26.0521], area: 'Brownsville', focus: 'commercial' },
  { id: '535504', label: 'Gateway Intl',         coords: [-97.5125, 25.9036], area: 'Brownsville', focus: 'passenger'  },
  { id: '535502', label: 'Veterans Intl',        coords: [-97.4985, 25.9145], area: 'Brownsville', focus: 'mixed'      },
]

const INDUSTRIAL_PARKS = [
  { name: 'Sharyland Business Park',    coords: [-98.2845, 26.2150], city: 'McAllen'     },
  { name: 'McAllen Foreign Trade Zone', coords: [-98.2301, 26.1950], city: 'McAllen'     },
  { name: 'Laredo Industrial Park',     coords: [-99.4850, 27.5100], city: 'Laredo'      },
  { name: 'South Texas ISD Tech Park',  coords: [-98.2420, 26.1800], city: 'McAllen'     },
  { name: 'Port of Brownsville',        coords: [-97.4610, 25.9900], city: 'Brownsville' },
  { name: 'Boca Chica Industrial',      coords: [-97.1581, 25.9976], city: 'Boca Chica'  },
  { name: 'Pharr Intl Bridge Zone',     coords: [-98.1826, 26.1600], city: 'Pharr'       },
]

function waitColor(mins) {
  if (mins == null) return '#888780'
  if (mins <= 15)   return '#2A6B43'
  if (mins <= 30)   return '#B07D1A'
  return '#B8431E'
}

function jitter(base, index) {
  const angle  = (index * 137.5) * Math.PI / 180
  const radius = Math.min(0.02 + Math.floor(index / 8) * 0.015, 0.08)
  return [base[0] + Math.cos(angle) * radius, base[1] + Math.sin(angle) * radius]
}

function getCoords(city, country, index) {
  const base = CITY_COORDS[city]
  if (!base) {
    return country === 'MX'
      ? [-98.5 + (Math.random() - 0.5) * 4, 26.2 + (Math.random() - 0.5) * 2]
      : [-98.2 + (Math.random() - 0.5) * 2, 26.3 + (Math.random() - 0.5) * 1]
  }
  return jitter(base, index)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Map() {
  const navigate       = useNavigate()
  const containerRef   = useRef(null)
  const mapRef         = useRef(null)
  const compMarkersRef = useRef([])
  const borderMrkRef   = useRef([])
  const parkMrkRef     = useRef([])
  const cityIdx        = useRef({})

  const [companies,    setCompanies]    = useState([])
  const [cbpData,      setCbpData]      = useState(null)
  const [sectorFilter, setSectorFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [showParks,    setShowParks]    = useState(false)
  const [stats,        setStats]        = useState({ total: 0, ready: 0, tx: 0, mx: 0 })
  const [mapLoaded,    setMapLoaded]    = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:     'mapbox://styles/mapbox/light-v11',
      center:    [-98.5, 26.5],
      zoom:      7,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.on('load', () => {
      mapRef.current = map
      setMapLoaded(true)
      loadCompanies(map)
      addSpecialPins(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load companies ──────────────────────────────────────────────────────────
  async function loadCompanies(map) {
    const { data } = await sb.from('companies')
      .select('id,legal_name,city,country,sector,ready_to_work,description')
      .eq('status', 'active')
      .order('ready_to_work', { ascending: false })

    const cos = data || []
    setCompanies(cos)
    setStats({
      total: cos.length,
      ready: cos.filter(c => c.ready_to_work).length,
      tx:    cos.filter(c => c.country === 'US').length,
      mx:    cos.filter(c => c.country === 'MX').length,
    })

    cityIdx.current = {}
    cos.forEach(c => {
      const key = `${c.city || '?'}_${c.country || 'US'}`
      cityIdx.current[key] = (cityIdx.current[key] ?? 0)
      const coords = getCoords(c.city, c.country, cityIdx.current[key]++)
      const color  = SECTOR_COLORS[c.sector] || SECTOR_COLORS.default

      const el = document.createElement('div')
      el.className          = 'company-pin'
      el.dataset.sector     = c.sector || ''
      el.dataset.id         = c.id
      el.style.cssText = `
        width:26px;height:26px;border-radius:50%;
        background:${color};border:2px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:700;color:white;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.25);
        transition:transform .15s;
        user-select:none;
      `
      el.textContent = (c.legal_name || 'C')[0]
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.25)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

      const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '240px' })
        .setHTML(`
          <div style="padding:12px;font-family:system-ui,sans-serif">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#0F0F0E">${escHtml(c.legal_name)}</div>
            <div style="font-size:11px;color:#5C5C54;margin-bottom:8px">
              📍 ${escHtml(c.city || '')} ${c.country === 'MX' ? '🇲🇽' : '🇺🇸'} · ${escHtml(c.sector || '')}
            </div>
            ${c.ready_to_work ? '<div style="background:#E4F0EA;color:#2A6B43;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;display:inline-block;margin-bottom:8px">✅ Ready to Work</div>' : ''}
            <a href="/companies/${c.id}" style="display:block;background:#1A6B72;color:white;text-align:center;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;">View Profile →</a>
          </div>
        `)

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map)

      compMarkersRef.current.push(marker)
    })
  }

  // ── SpaceX Starbase pin ─────────────────────────────────────────────────────
  function addSpecialPins(map) {
    const el = document.createElement('div')
    el.style.cssText = `
      width:32px;height:32px;border-radius:50%;
      background:#0F0F0E;border:3px solid #34D399;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;cursor:pointer;
      box-shadow:0 0 0 6px rgba(52,211,153,.15),0 3px 10px rgba(0,0,0,.4);
    `
    el.textContent = '🚀'

    const popup = new mapboxgl.Popup({ offset: 16, closeButton: false, maxWidth: '220px' })
      .setHTML(`
        <div style="padding:12px;background:#0F0F0E;color:white;font-family:system-ui;border-radius:8px">
          <div style="font-size:11px;color:#34D399;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">SpaceX Starbase</div>
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">Boca Chica, TX</div>
          <div style="font-size:11px;color:#94A3B8;margin-bottom:8px">Launch operations &amp; R&amp;D campus</div>
          <div style="display:flex;gap:8px">
            <div style="text-align:center;flex:1">
              <div style="font-size:16px;font-weight:700;color:#34D399">3K+</div>
              <div style="font-size:9px;color:#94A3B8;text-transform:uppercase">Jobs</div>
            </div>
            <div style="text-align:center;flex:1">
              <div style="font-size:16px;font-weight:700;color:#34D399">$600M</div>
              <div style="font-size:9px;color:#94A3B8;text-transform:uppercase">Impact</div>
            </div>
          </div>
        </div>
      `)

    new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([-97.1570, 25.9969])
      .setPopup(popup)
      .addTo(map)
  }

  // ── Border crossing markers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    borderMrkRef.current.forEach(m => m.remove())
    borderMrkRef.current = []

    // Build fast lookup from CBP data
    const lookup = {}
    if (cbpData) {
      cbpData.forEach(group =>
        group.crossings.forEach(c => { lookup[c.id] = c })
      )
    }

    BORDER_CROSSINGS.forEach(bc => {
      const live    = lookup[bc.id]
      const pvWait  = live?.pvWait ?? null
      const cvWait  = live?.cvWait ?? null
      const bgColor = waitColor(pvWait)

      const el = document.createElement('div')
      el.style.cssText = `
        width:28px;height:28px;border-radius:6px;
        background:${bgColor};border:2px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:13px;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.3);
      `
      el.textContent = '🚏'

      const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '220px' })
        .setHTML(`
          <div style="padding:12px;font-family:system-ui">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888780;margin-bottom:3px">Border Crossing</div>
            <div style="font-weight:700;font-size:13px;color:#0F0F0E;margin-bottom:6px">${escHtml(bc.label)}</div>
            ${pvWait != null ? `<div style="font-size:11px;color:#5C5C54">🚗 Passenger: <b>${pvWait} min</b></div>` : ''}
            ${cvWait != null ? `<div style="font-size:11px;color:#5C5C54">🚛 Commercial: <b>${cvWait} min</b></div>` : ''}
            ${pvWait == null && cvWait == null ? '<div style="font-size:11px;color:#888780">Wait time data unavailable</div>' : ''}
            <div style="font-size:10px;color:#B8B4AE;margin-top:6px">${escHtml(bc.area)} · ${bc.focus}</div>
          </div>
        `)

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(bc.coords)
        .setPopup(popup)
        .addTo(mapRef.current)

      borderMrkRef.current.push(marker)
    })
  }, [cbpData, mapLoaded])

  // ── Industrial park markers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    parkMrkRef.current.forEach(m => m.remove())
    parkMrkRef.current = []

    if (!showParks) return

    INDUSTRIAL_PARKS.forEach(park => {
      const el = document.createElement('div')
      el.style.cssText = `
        width:26px;height:26px;border-radius:4px;
        background:#B07D1A;border:2px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;cursor:pointer;
        box-shadow:0 2px 6px rgba(0,0,0,.25);
      `
      el.textContent = '🏭'

      const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '200px' })
        .setHTML(`
          <div style="padding:10px;font-family:system-ui">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#B07D1A;margin-bottom:3px">Industrial Park</div>
            <div style="font-weight:700;font-size:12px;color:#0F0F0E">${escHtml(park.name)}</div>
            <div style="font-size:11px;color:#5C5C54;margin-top:2px">📍 ${escHtml(park.city)}</div>
          </div>
        `)

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(park.coords)
        .setPopup(popup)
        .addTo(mapRef.current)

      parkMrkRef.current.push(marker)
    })
  }, [showParks, mapLoaded])

  // ── Sector filter — show/hide pins ──────────────────────────────────────────
  useEffect(() => {
    compMarkersRef.current.forEach(m => {
      const el     = m.getElement()
      const sector = el.dataset.sector || ''
      const show   = !sectorFilter || sector === sectorFilter
      el.style.opacity       = show ? '1' : '0.12'
      el.style.pointerEvents = show ? 'auto' : 'none'
    })
  }, [sectorFilter])

  // ── CBP data fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBorderWaitTimes().then(setCbpData).catch(() => {})
  }, [])

  // ── Filtered sidebar list ───────────────────────────────────────────────────
  const filtered = companies.filter(c => {
    if (sectorFilter && c.sector !== sectorFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.legal_name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q)
    }
    return true
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

      {/* FILTER BAR */}
      <div className="bg-[#0F0F0E] px-3 py-2 flex gap-2 items-center overflow-x-auto flex-shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-white/30 hidden sm:block flex-shrink-0">Sector</span>

        <button
          onClick={() => setSectorFilter('')}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            !sectorFilter ? 'bg-[#1A6B72] text-white border-[#1A6B72]'
                          : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'
          }`}>
          All
        </button>

        {SECTORS.map(s => (
          <button
            key={s}
            onClick={() => setSectorFilter(s === sectorFilter ? '' : s)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              sectorFilter === s ? 'text-white' : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'
            }`}
            style={sectorFilter === s
              ? { background: SECTOR_COLORS[s] || '#1A6B72', borderColor: SECTOR_COLORS[s] }
              : {}
            }>
            {s}
          </button>
        ))}

        <button
          onClick={() => setShowParks(p => !p)}
          className={`flex-shrink-0 ml-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            showParks ? 'bg-[#B07D1A] text-white border-[#B07D1A]'
                      : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'
          }`}>
          🏭 Parks
        </button>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:block text-xs text-white/40">{stats.total} companies</span>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="md:hidden px-3 py-1.5 rounded-full text-xs font-semibold border border-white/25 text-white/80 bg-white/10">
            {sidebarOpen ? '✕' : '☰ List'}
          </button>
        </div>
      </div>

      {/* MAP + SIDEBAR */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Map canvas */}
        <div ref={containerRef} className="flex-1 w-full h-full" />

        {/* Legend — desktop only */}
        <div className="absolute bottom-4 left-4 bg-white/92 backdrop-blur rounded-xl p-3 text-xs shadow-lg pointer-events-none hidden md:block z-10">
          <div className="font-bold text-[#0F0F0E] mb-2 text-[10px] uppercase tracking-wider">Legend</div>
          {SECTORS.slice(0, 5).map(s => (
            <div key={s} className="flex items-center gap-1.5 mb-1">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[s] }} />
              <span className="text-[#5C5C54]">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#E2DDD6]">
            <span>🚏</span><span className="text-[#5C5C54]">Border Crossing</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span>🚀</span><span className="text-[#5C5C54]">SpaceX Starbase</span>
          </div>
          {showParks && (
            <div className="flex items-center gap-1.5 mt-1">
              <span>🏭</span><span className="text-[#5C5C54]">Industrial Park</span>
            </div>
          )}
        </div>

        {/* Sidebar — desktop: right panel | mobile: bottom sheet */}
        <div className={[
          'flex flex-col bg-white border-[#E2DDD6] z-20',
          // Mobile: bottom sheet, toggled
          sidebarOpen ? 'flex' : 'hidden',
          'absolute bottom-0 left-0 right-0 border-t shadow-2xl',
          // Desktop: always-visible side panel
          'md:flex md:relative md:bottom-auto md:left-auto md:right-auto',
          'md:w-72 md:border-t-0 md:border-l md:shadow-none',
        ].join(' ')}
          style={{ height: sidebarOpen ? '60%' : undefined }}
        >
          {/* Sidebar header */}
          <div className="p-3 border-b border-[#E2DDD6] flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="font-serif text-sm font-bold text-[#0F0F0E]">Companies</div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-[#888780] hover:text-[#0F0F0E] text-lg leading-none">
                ✕
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[
                ['Total', stats.total, '#0F0F0E'],
                ['Ready', stats.ready, '#2A6B43'],
                ['TX',    stats.tx,    '#1A5CB8'],
                ['MX',    stats.mx,    '#B8431E'],
              ].map(([l, v, c]) => (
                <div key={l} className="text-center">
                  <div className="font-serif text-lg font-bold leading-none" style={{ color: c }}>{v}</div>
                  <div className="text-[10px] text-[#5C5C54] mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            <input
              className="w-full px-3 py-2 border border-[#E2DDD6] rounded-lg text-xs focus:outline-none focus:border-[#1A6B72]"
              placeholder="Search companies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Company list */}
          <div className="flex-1 overflow-y-auto">
            {!mapLoaded ? (
              <div className="p-4 space-y-2">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="h-12 bg-[#F7F3EE] rounded animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#888780]">No companies match your filters.</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-3 border-b border-[#F7F3EE] hover:bg-[#F7F3EE] text-left transition">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: SECTOR_COLORS[c.sector] || SECTOR_COLORS.default }}>
                    {(c.legal_name || 'C')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#0F0F0E] truncate">{c.legal_name}</div>
                    <div className="text-[10px] text-[#5C5C54]">{c.city} {c.country === 'MX' ? '🇲🇽' : '🇺🇸'}</div>
                  </div>
                  {c.ready_to_work && <span className="text-green-500 text-[10px] flex-shrink-0">✅</span>}
                </button>
              ))
            )}
          </div>

          {/* Live border waits footer */}
          {cbpData && (
            <div className="p-3 border-t border-[#E2DDD6] bg-[#F7F3EE] flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#888780] mb-2">Live Border Waits</div>
              {cbpData.slice(0, 3).map(group => {
                const waits = group.crossings.filter(c => c.pvWait != null).map(c => c.pvWait)
                const avg   = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null
                return (
                  <div key={group.area} className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#5C5C54]">{group.area}</span>
                    {avg != null
                      ? <span className="font-bold" style={{ color: waitColor(avg) }}>{avg} min</span>
                      : <span className="text-[#888780]">—</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Tiny HTML escaper to prevent XSS in popup innerHTML
function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
