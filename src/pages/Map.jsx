import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { fetchBorderWaitTimes } from '../lib/apis'

const MAPBOX_TOKEN = 'pk.eyJ1IjoibW9pc2VzdmlzdGF0ZWNoIiwiYSI6ImNtbnhsZ3V1aDAzbTUycnBxamNicWdqNTMifQ.IRiCCZH2dXnwWuhJK-QBnQ'

const CITY_COORDS = {
  'Laredo':[-99.5075,27.5036],'Nuevo Laredo':[-99.5161,27.4763],
  'McAllen':[-98.2301,26.2034],'Edinburg':[-98.1633,26.3017],
  'Mission':[-98.3251,26.2159],'Pharr':[-98.1847,26.1939],
  'Harlingen':[-97.6961,26.1906],'Brownsville':[-97.4975,25.9017],
  'Hidalgo':[-98.2602,26.1009],'Reynosa':[-98.2977,26.0852],
  'Matamoros':[-97.5032,25.8692],'Río Bravo':[-98.0833,26.0833],
  'Rio Bravo':[-98.0833,26.0833],'Valle Hermoso':[-97.6597,25.6731],
  'San Juan':[-98.1558,26.1895],'Weslaco':[-97.9903,26.1595],
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

const SECTORS = ['Construction','Energy','Manufacturing','Logistics','Technology','Healthcare','Government']

// Border crossing locations [lng, lat]
const BORDER_CROSSINGS = [
  { id: '230404', label: 'World Trade Bridge',   coords: [-99.4985, 27.5234], area: 'Laredo',     focus: 'commercial' },
  { id: '230401', label: 'Gateway to Americas',  coords: [-99.5128, 27.4955], area: 'Laredo',     focus: 'passenger'  },
  { id: '230402', label: 'Juárez–Lincoln',        coords: [-99.5001, 27.4820], area: 'Laredo',     focus: 'passenger'  },
  { id: '230502', label: 'Pharr International',  coords: [-98.1826, 26.1700], area: 'McAllen',    focus: 'commercial' },
  { id: '230501', label: 'Hidalgo–Reynosa',       coords: [-98.2672, 26.0950], area: 'McAllen',    focus: 'passenger'  },
  { id: '535503', label: 'Los Indios',           coords: [-97.7510, 26.0521], area: 'Brownsville', focus: 'commercial' },
  { id: '535504', label: 'Gateway Intl',         coords: [-97.5125, 25.9036], area: 'Brownsville', focus: 'passenger'  },
  { id: '535502', label: 'Veterans Intl',        coords: [-97.4985, 25.9145], area: 'Brownsville', focus: 'mixed'      },
]

// Industrial parks
const INDUSTRIAL_PARKS = [
  { name: 'Sharyland Business Park',    coords: [-98.2845, 26.2150], city: 'McAllen'      },
  { name: 'McAllen Foreign Trade Zone', coords: [-98.2301, 26.1950], city: 'McAllen'      },
  { name: 'Laredo Industrial Park',     coords: [-99.4850, 27.5100], city: 'Laredo'       },
  { name: 'South Texas ISD Tech Park',  coords: [-98.2420, 26.1800], city: 'McAllen'      },
  { name: 'Port of Brownsville',        coords: [-97.4610, 25.9900], city: 'Brownsville'  },
  { name: 'Boca Chica Industrial',      coords: [-97.1581, 25.9976], city: 'Boca Chica'   },
  { name: 'Pharr International Bridge', coords: [-98.1826, 26.1600], city: 'Pharr'        },
]

function waitColor(mins) {
  if (mins == null) return '#888780'
  if (mins <= 15)   return '#2A6B43'
  if (mins <= 30)   return '#B07D1A'
  return '#B8431E'
}

function getCoords(city, country, index) {
  const base = CITY_COORDS[city]
  if (!base) return country === 'MX'
    ? [-98.5 + (Math.random() - .5) * 4, 26.2 + (Math.random() - .5) * 2]
    : [-98.2 + (Math.random() - .5) * 2, 26.3 + (Math.random() - .5) * 1]
  const angle  = (index * 137.5) * Math.PI / 180
  const radius = Math.min(0.02 + Math.floor(index / 8) * 0.015, 0.08)
  return [base[0] + Math.cos(angle) * radius, base[1] + Math.sin(angle) * radius]
}

export default function Map() {
  const navigate = useNavigate()
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])

  const [companies,    setCompanies]    = useState([])
  const [cbpData,      setCbpData]      = useState(null)
  const [sectorFilter, setSectorFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [showParks,    setShowParks]    = useState(false)
  const [stats,        setStats]        = useState({ total:0, ready:0, tx:0, mx:0 })
  const [mapReady,     setMapReady]     = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const cityIndex = useRef({})

  useEffect(() => {
    loadMap()
    fetchBorderWaitTimes().then(setCbpData).catch(() => {})
    return () => { if (mapRef.current) mapRef.current.remove() }
  }, [])

  async function loadMap() {
    const mapboxgl = (await import('https://cdn.jsdelivr.net/npm/mapbox-gl@3.2.0/dist/mapbox-gl.js')).default
    mapboxgl.accessToken = MAPBOX_TOKEN

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:     'mapbox://styles/mapbox/light-v11',
      center:    [-98.5, 26.4],
      zoom:      8,
    })

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    mapRef.current.on('load', () => {
      setMapReady(true)
      loadCompanies(mapboxgl)
      addSpecialPins(mapboxgl)
    })
  }

  async function loadCompanies(mapboxgl) {
    const { data } = await sb.from('companies').select('*').eq('status', 'active').order('ready_to_work', { ascending: false })
    const cos = data || []
    setCompanies(cos)
    setStats({ total: cos.length, ready: cos.filter(c => c.ready_to_work).length, tx: cos.filter(c => c.country === 'US').length, mx: cos.filter(c => c.country === 'MX').length })
    addCompanyMarkers(cos, mapboxgl)
  }

  function addCompanyMarkers(cos, mapboxgl) {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    cityIndex.current  = {}

    cos.forEach(c => {
      const key    = (c.city || '?') + '_' + (c.country || 'US')
      cityIndex.current[key] = (cityIndex.current[key] || 0)
      const coords = getCoords(c.city, c.country, cityIndex.current[key]++)
      const color  = SECTOR_COLORS[c.sector] || SECTOR_COLORS.default

      const el = document.createElement('div')
      el.className = 'company-pin'
      el.dataset.sector = c.sector || ''
      el.dataset.id     = c.id
      el.style.cssText  = `
        width:26px;height:26px;border-radius:50%;
        background:${color};border:2px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:700;color:white;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.25);
        transition: transform .15s;
      `
      el.textContent = (c.legal_name || 'C')[0]
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.25)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

      const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '240px' })
        .setHTML(`
          <div style="padding:12px;font-family:system-ui,sans-serif">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#0F0F0E">${c.legal_name}</div>
            <div style="font-size:11px;color:#5C5C54;margin-bottom:8px">📍 ${c.city || ''} ${c.country === 'MX' ? '🇲🇽' : '🇺🇸'} · ${c.sector || ''}</div>
            ${c.ready_to_work ? '<div style="background:#E4F0EA;color:#2A6B43;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;display:inline-block;margin-bottom:8px">✅ Ready to Work</div>' : ''}
            <a href="/companies/${c.id}" style="display:block;background:#1A6B72;color:white;text-align:center;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;margin-top:2px">View Profile →</a>
          </div>
        `)

      const m = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(mapRef.current)
      markersRef.current.push(m)
    })
  }

  function addSpecialPins(mapboxgl) {
    // SpaceX Starbase pin
    const starbaseEl = document.createElement('div')
    starbaseEl.style.cssText = `
      width:32px;height:32px;border-radius:50%;
      background:#0F0F0E;border:3px solid #34D399;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;cursor:pointer;
      box-shadow:0 0 0 6px rgba(52,211,153,.15), 0 3px 10px rgba(0,0,0,.4);
    `
    starbaseEl.textContent = '🚀'
    const starbasePopup = new mapboxgl.Popup({ offset: 16, closeButton: false, maxWidth: '220px' })
      .setHTML(`
        <div style="padding:12px;background:#0F0F0E;color:white;border-radius:8px;font-family:system-ui">
          <div style="font-size:11px;color:#34D399;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">SpaceX Starbase</div>
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">Boca Chica, TX</div>
          <div style="font-size:11px;color:#94A3B8;margin-bottom:8px">Launch operations & R&D campus</div>
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
    new mapboxgl.Marker({ element: starbaseEl, anchor: 'center' })
      .setLngLat([-97.1581, 25.9976])
      .setPopup(starbasePopup)
      .addTo(mapRef.current)
  }

  // Add/remove border crossing markers when cbpData or showParks changes
  const borderMarkersRef = useRef([])
  const parkMarkersRef   = useRef([])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    import('https://cdn.jsdelivr.net/npm/mapbox-gl@3.2.0/dist/mapbox-gl.js').then(m => {
      const mapboxgl = m.default
      mapboxgl.accessToken = MAPBOX_TOKEN

      // Clear old border markers
      borderMarkersRef.current.forEach(mk => mk.remove())
      borderMarkersRef.current = []

      if (!cbpData) return

      // Build lookup by crossing id
      const lookup = {}
      cbpData.forEach(group => group.crossings.forEach(c => { lookup[c.id] = c }))

      BORDER_CROSSINGS.forEach(bc => {
        const data    = lookup[bc.id]
        const pvWait  = data?.pvWait
        const cvWait  = data?.cvWait
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

        const waitLine = pvWait != null ? `<div style="font-size:11px;color:#5C5C54">🚗 Passenger: <b>${pvWait} min</b></div>` : ''
        const cvLine   = cvWait != null ? `<div style="font-size:11px;color:#5C5C54">🚛 Commercial: <b>${cvWait} min</b></div>` : ''

        const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '220px' })
          .setHTML(`
            <div style="padding:12px;font-family:system-ui">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888780;margin-bottom:3px">Border Crossing</div>
              <div style="font-weight:700;font-size:13px;color:#0F0F0E;margin-bottom:6px">${bc.label}</div>
              ${waitLine}
              ${cvLine}
              ${!waitLine && !cvLine ? '<div style="font-size:11px;color:#888780">Wait time data unavailable</div>' : ''}
              <div style="font-size:10px;color:#B8B4AE;margin-top:6px">${bc.area} · ${bc.focus}</div>
            </div>
          `)

        const mk = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(bc.coords)
          .setPopup(popup)
          .addTo(mapRef.current)
        borderMarkersRef.current.push(mk)
      })
    })
  }, [cbpData, mapReady])

  // Industrial parks layer toggle
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    import('https://cdn.jsdelivr.net/npm/mapbox-gl@3.2.0/dist/mapbox-gl.js').then(m => {
      const mapboxgl = m.default
      mapboxgl.accessToken = MAPBOX_TOKEN

      parkMarkersRef.current.forEach(mk => mk.remove())
      parkMarkersRef.current = []

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
              <div style="font-weight:700;font-size:12px;color:#0F0F0E">${park.name}</div>
              <div style="font-size:11px;color:#5C5C54;margin-top:2px">📍 ${park.city}</div>
            </div>
          `)

        const mk = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(park.coords)
          .setPopup(popup)
          .addTo(mapRef.current)
        parkMarkersRef.current.push(mk)
      })
    })
  }, [showParks, mapReady])

  // Apply sector filter visually
  useEffect(() => {
    document.querySelectorAll('.company-pin').forEach(el => {
      const pinSector = el.dataset.sector || ''
      const show = !sectorFilter || pinSector === sectorFilter
      el.style.opacity = show ? '1' : '0.15'
      el.style.pointerEvents = show ? 'auto' : 'none'
    })
  }, [sectorFilter])

  const filtered = companies.filter(c => {
    if (sectorFilter && c.sector !== sectorFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.legal_name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div style={{ height: 'calc(100vh - 56px)' }} className="flex flex-col">

      {/* FILTER BAR */}
      <div className="bg-[#0F0F0E] px-3 sm:px-4 py-2 flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-white/30 hidden sm:block">Sector</span>
        <button onClick={() => setSectorFilter('')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${!sectorFilter ? 'bg-[#1A6B72] text-white border-[#1A6B72]' : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'}`}>
          All
        </button>
        {SECTORS.map(s => (
          <button key={s} onClick={() => setSectorFilter(s === sectorFilter ? '' : s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${sectorFilter === s ? 'text-white border-[#1A6B72]' : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'}`}
            style={sectorFilter === s ? { background: SECTOR_COLORS[s] || '#1A6B72', borderColor: SECTOR_COLORS[s] } : {}}>
            {s}
          </button>
        ))}

        <button onClick={() => setShowParks(p => !p)}
          className={`ml-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${showParks ? 'bg-[#B07D1A] text-white border-[#B07D1A]' : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'}`}>
          🏭 Industrial Parks
        </button>

        <button onClick={() => setSidebarOpen(o => !o)}
          className="ml-auto md:hidden px-3 py-1 rounded-full text-xs font-medium border border-white/20 text-white/60">
          ☰ List
        </button>

        <div className="hidden sm:block text-xs text-white/40">{stats.total} companies</div>
      </div>

      {/* MAP + SIDEBAR */}
      <div className="flex flex-1 overflow-hidden relative">
        <div ref={mapContainer} className="flex-1" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl p-3 text-xs shadow-lg hidden md:block">
          <div className="font-bold text-[#0F0F0E] mb-2 text-[10px] uppercase tracking-wider">Legend</div>
          {SECTORS.slice(0, 5).map(s => (
            <div key={s} className="flex items-center gap-1.5 mb-1">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[s] }} />
              <span className="text-[#5C5C54]">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#E2DDD6]">
            <span className="text-sm">🚏</span><span className="text-[#5C5C54]">Border Crossing</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm">🚀</span><span className="text-[#5C5C54]">SpaceX Starbase</span>
          </div>
          {showParks && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm">🏭</span><span className="text-[#5C5C54]">Industrial Park</span>
            </div>
          )}
        </div>

        {/* Sidebar — desktop always, mobile toggle */}
        <div className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex w-72 bg-white border-l border-[#E2DDD6] flex-col absolute md:relative right-0 top-0 bottom-0 z-10 shadow-xl md:shadow-none`}>
          <div className="p-3 border-b border-[#E2DDD6]">
            <div className="flex items-center justify-between mb-2">
              <div className="font-serif text-sm font-bold">Companies</div>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#888780] text-lg">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[['Total', stats.total, '#0F0F0E'], ['Ready', stats.ready, '#2A6B43'], ['TX', stats.tx, '#1A5CB8'], ['MX', stats.mx, '#B8431E']].map(([l, v, c]) => (
                <div key={l} className="text-center">
                  <div className="font-serif text-lg font-bold" style={{ color: c }}>{v}</div>
                  <div className="text-[10px] text-[#5C5C54]">{l}</div>
                </div>
              ))}
            </div>
            <input className="w-full px-3 py-2 border border-[#E2DDD6] rounded-lg text-xs focus:outline-none focus:border-[#1A6B72]"
              placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#888780]">No companies match your filters.</div>
            ) : (
              filtered.map(c => (
                <button key={c.id} onClick={() => navigate(`/companies/${c.id}`)}
                  className="w-full flex items-center gap-2 p-3 border-b border-[#F7F3EE] hover:bg-[#F7F3EE] cursor-pointer text-left transition">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: SECTOR_COLORS[c.sector] || SECTOR_COLORS.default }}>
                    {(c.legal_name || 'C')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#0F0F0E] truncate">{c.legal_name}</div>
                    <div className="text-[10px] text-[#5C5C54]">{c.city} {c.country === 'MX' ? '🇲🇽' : '🇺🇸'}</div>
                  </div>
                  {c.ready_to_work && <span className="text-green-500 text-xs flex-shrink-0">✅</span>}
                </button>
              ))
            )}
          </div>

          {/* CBP Border Summary */}
          {cbpData && (
            <div className="p-3 border-t border-[#E2DDD6] bg-[#F7F3EE]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#888780] mb-2">Live Border Waits</div>
              {cbpData.slice(0, 2).map(group => {
                const avg = (() => {
                  const ws = group.crossings.filter(c => c.pvWait != null).map(c => c.pvWait)
                  return ws.length ? Math.round(ws.reduce((a, b) => a + b, 0) / ws.length) : null
                })()
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
