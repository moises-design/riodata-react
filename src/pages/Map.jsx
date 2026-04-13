import { useEffect, useRef, useState } from 'react'
import { sb } from '../lib/supabase'

const MAPBOX_TOKEN = 'pk.eyJ1IjoibW9pc2VzdmlzdGF0ZWNoIiwiYSI6ImNtbnhsZ3V1aDAzbTUycnBxamNicWdqNTMifQ.IRiCCZH2dXnwWuhJK-QBnQ'

const CITY_COORDS = {
    'Laredo':[-99.5075,27.5036],'Nuevo Laredo':[-99.5161,27.4763],
    'McAllen':[-98.2301,26.2034],'Edinburg':[-98.1633,26.3017],
    'Mission':[-98.3251,26.2159],'Pharr':[-98.1847,26.1939],
    'Harlingen':[-97.6961,26.1906],'Brownsville':[-97.4975,25.9017],
    'Hidalgo':[-98.2602,26.1009],'Reynosa':[-98.2977,26.0852],
    'Matamoros':[-97.5032,25.8692],'Río Bravo':[-98.0833,26.0833],
    'Rio Bravo':[-98.0833,26.0833],'Valle Hermoso':[-97.6597,25.6731],
}

const SECTOR_COLORS = {
    'Construction':'#1A6B72','Energy':'#B8431E','Manufacturing':'#5B3FA6',
    'Logistics':'#B07D1A','Technology':'#1A5CB8','default':'#5C5C54'
}

export default function Map() {
    const mapContainer = useRef(null)
    const mapRef = useRef(null)
    const markersRef = useRef([])
    const [companies, setCompanies] = useState([])
    const [filter, setFilter] = useState('')
    const [search, setSearch] = useState('')
    const [stats, setStats] = useState({ total:0, ready:0, tx:0, mx:0 })
    const cityIndex = useRef({})

    useEffect(() => {
        loadMap()
        return () => { if (mapRef.current) mapRef.current.remove() }
    }, [])

    async function loadMap() {
        const mapboxgl = (await import('https://cdn.jsdelivr.net/npm/mapbox-gl@3.2.0/dist/mapbox-gl.js')).default
        mapboxgl.accessToken = MAPBOX_TOKEN
        mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-98.5, 26.4],
            zoom: 8
        })
        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
        mapRef.current.on('load', () => loadCompanies(mapboxgl))
    }

    async function loadCompanies(mapboxgl) {
        const { data } = await sb.from('companies').select('*').eq('status','active').order('ready_to_work',{ascending:false})
        const cos = data || []
        setCompanies(cos)
        setStats({ total:cos.length, ready:cos.filter(c=>c.ready_to_work).length, tx:cos.filter(c=>c.country==='US').length, mx:cos.filter(c=>c.country==='MX').length })
        addMarkers(cos, mapboxgl)
    }

    function getCoords(city, country, index) {
        const base = CITY_COORDS[city]
        if (!base) return country==='MX' ? [-98.5+(Math.random()-.5)*4,26.2+(Math.random()-.5)*2] : [-98.2+(Math.random()-.5)*2,26.3+(Math.random()-.5)*1]
        const angle = (index * 137.5) * Math.PI / 180
        const radius = Math.min(0.02 + Math.floor(index/8)*0.015, 0.08)
        return [base[0]+Math.cos(angle)*radius, base[1]+Math.sin(angle)*radius]
    }

    function addMarkers(cos, mapboxgl) {
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []
        cityIndex.current = {}
        cos.forEach(c => {
            const key = (c.city||'?')+'_'+(c.country||'US')
            cityIndex.current[key] = (cityIndex.current[key]||0)
            const coords = getCoords(c.city, c.country, cityIndex.current[key]++)
            const color = c.ready_to_work ? '#2A6B43' : (SECTOR_COLORS[c.sector]||SECTOR_COLORS.default)
            const el = document.createElement('div')
            el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.3);`
            el.textContent = (c.legal_name||'C')[0]
            const popup = new mapboxgl.Popup({offset:12,closeButton:false,maxWidth:'240px'})
                .setHTML(`<div style="padding:12px;font-family:sans-serif">
                    <div style="font-weight:700;font-size:13px;margin-bottom:3px">${c.legal_name}</div>
                    <div style="font-size:11px;color:#5C5C54;margin-bottom:6px">📍 ${c.city||''} ${c.country==='MX'?'🇲🇽':'🇺🇸'} · ${c.sector||''}</div>
                    ${c.ready_to_work?'<span style="background:#E4F0EA;color:#2A6B43;font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px">✅ Ready</span>':''}
                </div>`)
            const m = new mapboxgl.Marker({element:el,anchor:'center'}).setLngLat(coords).setPopup(popup).addTo(mapRef.current)
            markersRef.current.push(m)
        })
    }

    const filtered = companies.filter(c => {
        if (filter === 'ready') return c.ready_to_work
        if (filter === 'US') return c.country === 'US'
        if (filter === 'MX') return c.country === 'MX'
        if (filter) return c.sector === filter
        return true
    }).filter(c => !search || c.legal_name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase()))

    return (
        <div style={{height:'calc(100vh - 56px)'}} className="flex flex-col">
            {/* FILTER BAR */}
            <div className="bg-[#0F0F0E] px-4 py-2 flex gap-2 flex-wrap items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-white/30">Filter</span>
                {[['All',''],['Ready','ready'],['🇺🇸 Texas','US'],['🇲🇽 Mexico','MX'],['Construction','Construction'],['Energy','Energy'],['Logistics','Logistics'],['Manufacturing','Manufacturing']].map(([label,val])=>(
                    <button key={val} onClick={()=>setFilter(val)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filter===val?'bg-[#1A6B72] text-white border-[#1A6B72]':'border-white/15 text-white/50 hover:text-white hover:border-white/40'}`}>
                        {label}
                    </button>
                ))}
                <div className="ml-auto text-xs text-white/40">{stats.total} companies mapped</div>
            </div>

            {/* MAP + SIDEBAR */}
            <div className="flex flex-1 overflow-hidden">
                <div ref={mapContainer} className="flex-1" />
                <div className="w-72 bg-white border-l border-[#E2DDD6] flex flex-col hidden md:flex">
                    <div className="p-3 border-b border-[#E2DDD6]">
                        <div className="font-serif text-sm font-bold mb-1">Company Directory</div>
                        <div className="text-xs text-[#5C5C54] mb-2">{filtered.length} companies</div>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                            {[['Total',stats.total,'#0F0F0E'],['Ready',stats.ready,'#2A6B43'],['TX',stats.tx,'#1A5CB8'],['MX',stats.mx,'#B8431E']].map(([l,v,c])=>(
                                <div key={l} className="text-center">
                                    <div className="font-serif text-lg font-bold" style={{color:c}}>{v}</div>
                                    <div className="text-xs text-[#5C5C54]">{l}</div>
                                </div>
                            ))}
                        </div>
                        <input className="w-full px-3 py-2 border border-[#E2DDD6] rounded-lg text-xs focus:outline-none focus:border-[#1A6B72]"
                            placeholder="Search companies..." value={search} onChange={e=>setSearch(e.target.value)} />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filtered.map(c=>(
                            <div key={c.id} className="flex items-center gap-2 p-3 border-b border-[#F7F3EE] hover:bg-[#F7F3EE] cursor-pointer">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                    style={{background:c.ready_to_work ? '#2A6B43' : (SECTOR_COLORS[c.sector]||SECTOR_COLORS.default)}}>
                                    {(c.legal_name||'C')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-[#0F0F0E] truncate">{c.legal_name}</div>
                                    <div className="text-xs text-[#5C5C54]">{c.city} {c.country==='MX'?'🇲🇽':'🇺🇸'}</div>
                                </div>
                                {c.ready_to_work && <span className="text-green-500 text-xs">✅</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}