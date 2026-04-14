import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, Cell, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  fetchFREDRegional, fetchCensus, fetchBorderWaitTimes, fetchBLS, fetchBorderCrossings, fetchIPEDS,
  fetchEIALNG, fetchEIATXGas, fetchWorldBankFDI, fetchRegionalNews, fetchDallasFed,
  fetchCMSHospitals, fetchUSGSWater, fetchSpaceXLaunches, fetchCensusHousing,
  IPEDS_SCHOOLS, cipCategory, MAQUILADORA_CITIES, COL_DATA,
  BLS_SERIES, blsVal, blsYoY, fredVal, fmtGDP, fmtK, fmtBcf, fmtUSD,
} from '../lib/apis'


function waitBadge(mins) {
  if (mins == null) return 'bg-[#F7F3EE] text-[#888780]'
  if (mins <= 15) return 'bg-[#E4F0EA] text-[#2A6B43]'
  if (mins <= 30) return 'bg-[#FBF4E3] text-[#B07D1A]'
  return 'bg-[#FBE9E3] text-[#B8431E]'
}

function StatusDot({ s }) {
  if (s === 'loading') return <div className="w-2 h-2 border border-[#1A6B72] border-t-transparent rounded-full animate-spin"></div>
  if (s === 'ok')      return <div className="w-2 h-2 bg-[#2A6B43] rounded-full"></div>
  return                      <div className="w-2 h-2 bg-[#B8431E] rounded-full"></div>
}

function LiveBadge() {
  return <span className="text-xs px-1.5 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-medium">Live</span>
}

// ─── Starbase countdown (ticks every second) ───────────────────────────────────
function StarbaseCountdown({ isoDate }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  if (!isoDate) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-3xl font-bold text-white tracking-widest">TBD</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Next launch window</span>
      </div>
    )
  }
  const diff = new Date(isoDate) - Date.now()
  if (diff <= 0) {
    return <span className="font-mono text-xl font-bold text-[#34D399] tracking-wide">LAUNCH WINDOW OPEN</span>
  }
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const pad = n => String(n).padStart(2, '0')
  return (
    <div className="flex items-end gap-3">
      {[[d,'D'],[h,'H'],[m,'M'],[s,'S']].map(([v,u]) => (
        <div key={u} className="flex flex-col items-center">
          <span className="font-mono text-2xl font-bold text-white leading-none">{pad(v)}</span>
          <span className="text-[10px] text-slate-400 mt-1 tracking-widest">{u}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Starbase static data ──────────────────────────────────────────────────────
const STARBASE_LAUNCHES = [
  { year: '2021', count: 5, proj: false },  // SN8, SN9, SN10, SN11, SN15 prototype hops
  { year: '2022', count: 0, proj: false },  // Stack integration & ground testing
  { year: '2023', count: 2, proj: false },  // IFT-1 (Apr 20), IFT-2 (Nov 18)
  { year: '2024', count: 6, proj: false },  // IFT-3 through IFT-6 + additional tests
  { year: '2025', count: 8, proj: true  },  // FAA projected / year-in-progress
]

const STARBASE_SUPPLIERS = [
  { name: 'Hanwha',                location: 'McAllen, TX',        role: 'Aerospace components & defense mfg' },
  { name: 'Brownsville Airport',   location: 'Brownsville, TX',    role: 'Cargo logistics & supply chain hub' },
  { name: 'UTRGV Aerospace Eng.', location: 'Edinburg/Brownsville',role: 'Engineering talent pipeline' },
  { name: 'Cameron County',        location: 'Brownsville, TX',    role: 'Infrastructure & permitting support' },
  { name: 'SpaceX Starbase',       location: 'Boca Chica, TX',     role: 'Launch operations & R&D campus' },
]

// ─── MAIN ──────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [fred,   setFred]   = useState(null)
  const [census, setCensus] = useState(null)
  const [cbp,    setCbp]    = useState(null)
  const [bls,    setBls]    = useState(null)
  const [bts,    setBts]    = useState(null)
  const [ipeds,  setIpeds]  = useState(null)
  const [eia,    setEia]    = useState(null)
  const [fdi,    setFdi]    = useState(null)
  const [news,   setNews]   = useState(null)
  const [dallas, setDallas] = useState(null)
  const [newsLang,     setNewsLang]     = useState('all')
  const [newsCategory, setNewsCategory] = useState('all')
  const [newsShowing,  setNewsShowing]  = useState(6)
  const [hospitals,    setHospitals]    = useState(null)
  const [water,        setWater]        = useState(null)
  const [spacex,       setSpacex]       = useState(null)
  const [housing,      setHousing]      = useState(null)
  const [status, setStatus] = useState({
    fred: 'loading', census: 'loading', cbp: 'loading', bls: 'loading', bts: 'loading',
    ipeds: 'loading', eia: 'loading', fdi: 'loading', news: 'loading', dallas: 'loading',
    hospitals: 'loading', water: 'loading', spacex: 'loading', housing: 'loading',
  })

  useEffect(() => {
    fetchFREDRegional()
      .then(d => { setFred(d);   setStatus(s => ({ ...s, fred:   'ok' })) })
      .catch(()  =>              setStatus(s => ({ ...s, fred:   'error' })))
    fetchCensus()
      .then(d => { setCensus(d); setStatus(s => ({ ...s, census: 'ok' })) })
      .catch(()  =>              setStatus(s => ({ ...s, census: 'error' })))
    fetchBorderWaitTimes()
      .then(d => { setCbp(d);   setStatus(s => ({ ...s, cbp:    'ok' })) })
      .catch(()  =>              setStatus(s => ({ ...s, cbp:    'error' })))
    fetchBLS()
      .then(d => { setBls(d);   setStatus(s => ({ ...s, bls:    'ok' })) })
      .catch(()  =>              setStatus(s => ({ ...s, bls:    'error' })))
    fetchBorderCrossings()
      .then(d => { setBts(d);   setStatus(s => ({ ...s, bts:    'ok' })) })
      .catch(()  =>              setStatus(s => ({ ...s, bts:    'error' })))
    fetchIPEDS()
      .then(d => { setIpeds(d); setStatus(s => ({ ...s, ipeds:  'ok' })) })
      .catch(()  =>              setStatus(s => ({ ...s, ipeds:  'error' })))
    Promise.allSettled([fetchEIALNG(), fetchEIATXGas()])
      .then(([lngR, txR]) => {
        const lng   = lngR.status === 'fulfilled' ? lngR.value : null
        const txgas = txR.status  === 'fulfilled' ? txR.value  : null
        if (lng || txgas) { setEia({ lng, txgas }); setStatus(s => ({ ...s, eia: 'ok'    })) }
        else                                         setStatus(s => ({ ...s, eia: 'error' }))
      })
    fetchWorldBankFDI()
      .then(d => { setFdi(d);   setStatus(s => ({ ...s, fdi: 'ok'    })) })
      .catch(()  =>              setStatus(s => ({ ...s, fdi: 'error' })))
    fetchRegionalNews()
      .then(d => { setNews(d);   setStatus(s => ({ ...s, news:   'ok'    })) })
      .catch(()  =>               setStatus(s => ({ ...s, news:   'error' })))
    fetchDallasFed()
      .then(d => { setDallas(d); setStatus(s => ({ ...s, dallas: 'ok'    })) })
      .catch(()  =>               setStatus(s => ({ ...s, dallas: 'error' })))
    fetchCMSHospitals()
      .then(d => { setHospitals(d); setStatus(s => ({ ...s, hospitals: 'ok'    })) })
      .catch(()  =>                  setStatus(s => ({ ...s, hospitals: 'error' })))
    fetchUSGSWater()
      .then(d => { setWater(d); setStatus(s => ({ ...s, water: 'ok'    })) })
      .catch(()  =>              setStatus(s => ({ ...s, water: 'error' })))
    fetchSpaceXLaunches()
      .then(d => { setSpacex(d); setStatus(s => ({ ...s, spacex: 'ok'    })) })
      .catch(()  =>               setStatus(s => ({ ...s, spacex: 'error' })))
    fetchCensusHousing()
      .then(d => { setHousing(d); setStatus(s => ({ ...s, housing: 'ok'    })) })
      .catch(()  =>                setStatus(s => ({ ...s, housing: 'error' })))
  }, [])

  // Auto-refresh CBP every 5 minutes — cache TTL matches so a fresh network call is made each tick
  useEffect(() => {
    const id = setInterval(() => {
      try { localStorage.removeItem('rd_cbp_expanded_v2') } catch {}
      fetchBorderWaitTimes()
        .then(d => { setCbp(d); setStatus(s => ({ ...s, cbp: 'ok' })) })
        .catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── Computed KPIs ────────────────────────────────────────────────────────────
  const gdpM = ['mcallen_gdp', 'laredo_gdp', 'brownsville_gdp'].map(k => fredVal(fred, k))
  const totalGDP = gdpM.every(Boolean) ? gdpM.reduce((a, b) => a + b, 0) : null

  const empK = [BLS_SERIES.mcallen_emp, BLS_SERIES.laredo_emp, BLS_SERIES.brownsville_emp]
    .map(id => blsVal(bls, id))
  const totalEmp = empK.every(Boolean) ? empK.reduce((a, b) => a + b, 0) * 1000 : null

  const urVals = [BLS_SERIES.mcallen_ur, BLS_SERIES.laredo_ur, BLS_SERIES.brownsville_ur]
    .map(id => blsVal(bls, id)).filter(Boolean)
  const avgUR = urVals.length ? (urVals.reduce((a, b) => a + b, 0) / urVals.length).toFixed(1) : null

  // FRED UR (may differ from BLS direct — shows FRED data when available)
  const fredURMcallen     = fredVal(fred, 'mcallen_ur')
  const fredURVals        = ['mcallen_ur', 'laredo_ur', 'brownsville_ur'].map(k => fredVal(fred, k)).filter(Boolean)
  const avgURFred         = fredURVals.length ? (fredURVals.reduce((a, b) => a + b, 0) / fredURVals.length).toFixed(1) : null

  const displayUR = avgURFred ?? avgUR
  const urLive    = !!(avgURFred || avgUR)

  const totalPop = census?.reduce((s, c) => s + c.population, 0) ?? null

  // ── GDP chart data (FRED, last 5 annual obs, oldest→newest) ──────────────────
  const gdpTrend = (() => {
    const mc = (fred?.mcallen_gdp     || []).slice(0, 6).reverse()
    const la = (fred?.laredo_gdp      || []).slice(0, 6).reverse()
    const bv = (fred?.brownsville_gdp || []).slice(0, 6).reverse()
    return mc.map((d, i) => ({
      year:        d.date.slice(0, 4),
      mcallen:     d.value,
      laredo:      la[i]?.value ?? 0,
      brownsville: bv[i]?.value ?? 0,
    }))
  })()
  const gdpMax = gdpTrend.length
    ? Math.max(...gdpTrend.flatMap(d => [d.mcallen, d.laredo, d.brownsville]))
    : 1

  // ── BLS sector data ──────────────────────────────────────────────────────────
  const sectors = [
    { key: 'mcallen_edhealth', label: 'Education & Health', color: '#2A6B43' },
    { key: 'mcallen_govt',     label: 'Government',         color: '#1A6B72' },
    { key: 'mcallen_trade',    label: 'Trade & Transport',  color: '#B07D1A' },
    { key: 'mcallen_bizsvcs',  label: 'Professional & Biz', color: '#B8431E' },
    { key: 'mcallen_mfg',      label: 'Manufacturing',      color: '#5C5C54' },
    { key: 'mcallen_const',    label: 'Construction',       color: '#888780' },
  ]
  const sectorVals = sectors.map(s => blsVal(bls, s.key) ?? 0)
  const sectorMax  = Math.max(...sectorVals, 1)

  // ── BTS chart data ────────────────────────────────────────────────────────────
  const fmtMonth = d => {
    if (!d) return ''
    const [y, m] = d.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[parseInt(m) - 1]} '${y.slice(2)}`
  }
  const btsChartData = (() => {
    if (!bts) return []
    const dateMap = {}
    Object.entries(bts).forEach(([port, rows]) => {
      rows.forEach(row => {
        const d = row.date?.slice(0, 7)
        if (!d) return
        if (!dateMap[d]) dateMap[d] = { date: d }
        dateMap[d][port] = parseInt(row.value) || 0
      })
    })
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
  })()
  const btsLatest = {
    Laredo:      bts?.Laredo?.[0],
    Hidalgo:     bts?.Hidalgo?.[0],
    Brownsville: bts?.Brownsville?.[0],
  }

  // ── IPEDS chart data ─────────────────────────────────────────────────────────
  const IPEDS_CHART_CATS = ['Business', 'Health', 'Education', 'Engineering', 'STEM']
  const IPEDS_COLORS     = { UTRGV: '#1A6B72', TAMIU: '#B07D1A', TSC: '#B8431E' }

  const ipedsChartData = IPEDS_CHART_CATS.map(cat => {
    const entry = { category: cat }
    IPEDS_SCHOOLS.forEach(s => {
      const school = ipeds?.[s.unitid]
      entry[s.shortName] = school
        ? school.cips.filter(c => cipCategory(c.cipcode) === cat).reduce((sum, c) => sum + c.awards, 0)
        : 0
    })
    return entry
  })

  const ipedsTotal = IPEDS_SCHOOLS.map(s => ipeds?.[s.unitid]?.total ?? 0).reduce((a, b) => a + b, 0)

  // ── FDI computed values ───────────────────────────────────────────────────────
  const fdiLatest        = fdi?.[fdi.length - 1]           // newest year (chart is oldest→newest)
  const maquiladoraTotal = MAQUILADORA_CITIES.reduce((s, c) => s + c.workers, 0)

  // ── EIA computed values ───────────────────────────────────────────────────────
  const lngLatest    = eia?.lng?.[eia.lng.length - 1]     // most-recent item (chart is oldest→newest)
  const lngLatestVal = lngLatest?.value ?? null
  const txGasLatest  = eia?.txgas?.[0]                    // txgas is newest-first

  // ── COL computed values (fully static — no API needed) ───────────────────────
  // Horizontal bar: sorted highest→lowest so Brownsville is at bottom of vertical chart
  const colBarData   = [...COL_DATA].sort((a, b) => b.overall - a.overall)
  // Subcategory breakdown for South TX metros + Austin (for contrast)
  const colSubCities = COL_DATA.filter(c => c.isSouthTX || c.city === 'Austin')
  const colSubData   = ['Housing', 'Groceries', 'Utilities', 'Healthcare'].map(cat => {
    const key = cat.toLowerCase()
    const row = { cat }
    colSubCities.forEach(c => { row[c.city] = c[key] })
    return row
  })
  const colAustin   = COL_DATA.find(c => c.city === 'Austin').overall
  const colMcAllen  = COL_DATA.find(c => c.city === 'McAllen').overall
  const colSavingsPct = Math.round((1 - colMcAllen / colAustin) * 100)

  // ── Dallas Fed computed values ─────────────────────────────────────────────
  const tbosData = (() => {
    if (!dallas?.tbos) return []
    return dallas.tbos.slice(0, 7).reverse().map(d => ({
      date:  fmtMonth(d.date.slice(0, 7)),
      value: parseFloat(parseFloat(d.value).toFixed(1)),
    }))
  })()

  const tliData = (() => {
    if (!dallas?.tli) return []
    return dallas.tli.slice(0, 13).reverse().map(d => ({
      date:  fmtMonth(d.date.slice(0, 7)),
      value: parseFloat(parseFloat(d.value).toFixed(2)),
    }))
  })()

  const tbosLatest    = dallas?.tbos?.[0]   ? parseFloat(parseFloat(dallas.tbos[0].value).toFixed(1))   : null
  const tliLatest     = dallas?.tli?.[0]    ? parseFloat(parseFloat(dallas.tli[0].value).toFixed(2))    : null
  const tliPrev12     = dallas?.tli?.[12]   ? parseFloat(parseFloat(dallas.tli[12].value).toFixed(2))   : null
  const tliTrend      = (tliLatest != null && tliPrev12 != null) ? (tliLatest > tliPrev12 ? 'up' : 'down') : null

  const exportsLatest = dallas?.exports?.[0]  ? parseFloat(dallas.exports[0].value)  : null
  const exportsPrev12 = dallas?.exports?.[12] ? parseFloat(dallas.exports[12].value) : null
  const exportsYoY    = (exportsLatest && exportsPrev12 && exportsPrev12 > 0)
    ? (((exportsLatest - exportsPrev12) / exportsPrev12) * 100).toFixed(1) : null

  const retailLatest  = dallas?.retail?.[0]  ? parseFloat(dallas.retail[0].value)  : null
  const retailPrev12  = dallas?.retail?.[12] ? parseFloat(dallas.retail[12].value) : null
  const retailYoY     = (retailLatest && retailPrev12 && retailPrev12 > 0)
    ? (((retailLatest - retailPrev12) / retailPrev12) * 100).toFixed(1) : null

  // cbp is now [{area, color, crossings:[...]}] — one object per geographic group
  const cbpLive        = !!(cbp?.length)
  const allCrossings   = cbp?.flatMap(a => a.crossings) ?? []
  const totalCrossings = allCrossings.length
  const reportingCount = allCrossings.filter(c => c.hasData && (c.pvWait != null || c.cvWait != null)).length
  const totalCvLanes   = allCrossings.reduce((s, c) => s + (c.cvLanes  ?? 0), 0)
  const totalPvLanes   = allCrossings.reduce((s, c) => s + (c.pvLanes  ?? 0), 0)
  const cbpLastUpdated = allCrossings.find(c => c.updatedAt)?.updatedAt ?? null

  return (
    <div className="px-4 sm:px-14 py-8 sm:py-12">

      {/* HEADER */}
      <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-2 flex items-center gap-2">
        <span className="w-4 h-px bg-[#B8431E]"></span>Regional Intelligence
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#0F0F0E] mb-2">Analytics</h1>
          <p className="text-sm text-[#5C5C54]">Live economic data for the South Texas + Northern Mexico corridor.</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 pb-1 flex-wrap">
          {[
            { label: 'FRED',     key: 'fred'   },
            { label: 'Census',   key: 'census' },
            { label: 'CBP',      key: 'cbp'    },
            { label: 'BLS',      key: 'bls'    },
            { label: 'BTS',      key: 'bts'    },
            { label: 'IPEDS',    key: 'ipeds'  },
            { label: 'Energy',   key: 'eia'    },
            { label: 'FDI',      key: 'fdi'    },
            { label: 'News',     key: 'news'   },
            { label: 'DallasFed',key: 'dallas' },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
              <StatusDot s={status[key]} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {[
          {
            val:   totalGDP ? fmtGDP(totalGDP) : '$48.2B*',
            label: 'Regional GDP',
            sub:   totalGDP ? `FRED RGMP · ${fred?.mcallen_gdp?.[0]?.date?.slice(0,4)}` : 'Estimate',
            live:  !!totalGDP,
          },
          {
            val:   totalEmp ? fmtK(totalEmp) : '612K*',
            label: 'Total Employment',
            sub:   totalEmp ? 'BLS State & Metro' : 'Estimate',
            live:  !!totalEmp,
          },
          {
            val:   '269',
            label: 'Listed Companies',
            sub:   'RioData directory',
            live:  false,
          },
          {
            val:   '$9.3B',
            label: 'Active Pipeline',
            sub:   'Projects & opportunities',
            live:  false,
          },
          {
            val:   displayUR ? displayUR + '%' : '4.8%*',
            label: 'Avg Unemployment',
            sub:   displayUR ? (avgURFred ? 'FRED · 3-MSA avg' : 'BLS LAU · 3-MSA avg') : 'Estimate',
            live:  urLive,
          },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[#E2DDD6] rounded-xl p-4 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between mb-0.5">
              <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{k.val}</div>
              {k.live && <LiveBadge />}
            </div>
            <div className="text-xs text-[#5C5C54] mt-1">{k.label}</div>
            <div className="text-xs text-[#888780] mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── STARBASE & AEROSPACE TRACKER ─────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl overflow-hidden border border-[#1E3A5F]" style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0A2540 50%, #0D1B2A 100%)' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#1E3A5F]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Pulsing rocket */}
              <div className="relative flex-shrink-0">
                <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 8px #38BDF8)' }}>🚀</span>
                <span className="absolute inset-0 animate-ping rounded-full opacity-20 bg-sky-400 scale-75"></span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#38BDF8] uppercase">Starbase · Boca Chica, TX</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E3A5F] text-slate-300 font-mono">FAA LLS 21-119</span>
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">SpaceX Starbase &amp; Aerospace Hub</h2>
                <p className="text-xs text-slate-400 mt-0.5">The world's only privately owned orbital launch site — and it's in the RioData region</p>
              </div>
            </div>
            <span className="flex-shrink-0 text-[10px] font-bold tracking-[0.15em] px-2.5 py-1 rounded-full border border-[#38BDF8] text-[#38BDF8] uppercase">
              Regional Exclusive
            </span>
          </div>
        </div>

        {/* Hero stat bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1E3A5F] border-b border-[#1E3A5F]">
          {[
            { val: '3,000',   unit: 'Direct Jobs',         sub: 'SpaceX Boca Chica / Brownsville' },
            { val: '$600M+',  unit: 'Annual Economic Impact', sub: 'Brownsville EDC / Cameron County' },
            { val: '40+',     unit: 'Local Suppliers',      sub: 'South Texas aerospace contracts' },
          ].map(s => (
            <div key={s.unit} className="px-6 py-4 text-center">
              <div className="font-serif text-2xl font-bold text-white">{s.val}</div>
              <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">{s.unit}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Main content: chart + right panel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#1E3A5F]">

          {/* Launch history chart */}
          <div className="lg:col-span-3 px-6 py-5">
            <div className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Launch History · Boca Chica</div>
            <div className="text-[10px] text-slate-500 mb-4">
              Integrated flight tests + prototype hops · 2025 = FAA projected
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={STARBASE_LAUNCHES} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0D1B2A', border: '1px solid #1E3A5F', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }}
                  cursor={{ fill: 'rgba(56,189,248,0.07)' }}
                  formatter={(v, _, props) => [v + (props.payload?.proj ? ' (proj.)' : ''), 'Launches']}
                />
                <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={48}>
                  {STARBASE_LAUNCHES.map(d => (
                    <Cell key={d.year} fill={d.proj ? '#1E4D72' : (d.count === 0 ? '#1E3A5F' : '#0EA5E9')}
                      stroke={d.proj ? '#38BDF8' : 'none'} strokeWidth={d.proj ? 1 : 0} strokeDasharray={d.proj ? '4 2' : '0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right panel: countdown + quick stats */}
          <div className="lg:col-span-2 px-6 py-5 flex flex-col gap-5">

            {/* Countdown */}
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Next Starbase Launch</div>
              <StarbaseCountdown isoDate={null} />
              <p className="text-[10px] text-slate-500 mt-2">Starship schedule at spacex.com · Countdown activates when date announced</p>
            </div>

            {/* Economic quick-hits */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: '$110K',    label: 'Avg SpaceX salary',       icon: '💼' },
                { val: '$15M+',    label: 'Annual county tax rev.',   icon: '🏛️' },
                { val: '$2M',      label: 'Hotel impact per launch',  icon: '🏨' },
                { val: '~3,000',   label: 'Estimated direct jobs',    icon: '👷' },
              ].map(s => (
                <div key={s.label} className="bg-[#0B2030] border border-[#1E3A5F] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{s.icon}</span>
                    <span className="font-bold text-sm text-white">{s.val}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Local supplier ecosystem */}
        <div className="px-6 py-5 border-t border-[#1E3A5F]">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Local Aerospace Ecosystem</div>
          <div className="flex flex-wrap gap-2">
            {STARBASE_SUPPLIERS.map(s => (
              <div key={s.name} className="flex items-start gap-2 bg-[#0B2030] border border-[#1E3A5F] rounded-lg px-3 py-2 min-w-[160px] flex-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] flex-shrink-0 mt-1.5"></div>
                <div>
                  <div className="text-xs font-semibold text-white leading-tight">{s.name}</div>
                  <div className="text-[10px] text-[#38BDF8] mt-0.5">{s.location}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{s.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer attribution */}
        <div className="px-6 pb-4">
          <p className="text-[10px] text-slate-600">
            Sources: FAA License LLS 21-119 · Brownsville EDC · Cameron County Economic Development · SpaceX public disclosures
          </p>
        </div>

      </div>

      {/* ROW 1: GDP CHART + CENSUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* FRED GDP chart */}
        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="flex items-start justify-between mb-1">
            <div className="font-semibold text-sm">Real GDP by Metro Area</div>
            {status.fred === 'ok' && <LiveBadge />}
          </div>
          <div className="text-xs text-[#5C5C54] mb-4">
            Millions chained 2017$ · FRED RGMP series
            {totalGDP && ` · Combined ${fmtGDP(totalGDP)}`}
          </div>
          {gdpTrend.length > 0 ? (
            <>
              <div className="h-36 flex items-end gap-2.5">
                {gdpTrend.map(d => (
                  <div key={d.year} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: '112px' }}>
                      <div className="flex-1 bg-[#1A6B72] rounded-t opacity-90 hover:opacity-100 transition-opacity"
                        style={{ height: `${(d.mcallen / gdpMax) * 100}%` }}
                        title={`McAllen ${fmtGDP(d.mcallen)}`}></div>
                      <div className="flex-1 bg-[#B07D1A] rounded-t opacity-90 hover:opacity-100 transition-opacity"
                        style={{ height: `${(d.laredo / gdpMax) * 100}%` }}
                        title={`Laredo ${fmtGDP(d.laredo)}`}></div>
                      <div className="flex-1 bg-[#B8431E] rounded-t opacity-90 hover:opacity-100 transition-opacity"
                        style={{ height: `${(d.brownsville / gdpMax) * 100}%` }}
                        title={`Brownsville ${fmtGDP(d.brownsville)}`}></div>
                    </div>
                    <div className="text-xs text-[#5C5C54]">{d.year}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3">
                {[['#1A6B72','McAllen'],['#B07D1A','Laredo'],['#B8431E','Brownsville']].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                    <span className="w-3 h-3 rounded" style={{ background: c }}></span>{l}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-36 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
              <div className="flex flex-col items-center gap-2 text-xs text-[#888780]">
                {status.fred === 'loading' && <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>}
                <span>
                  {status.fred === 'loading' && 'Loading FRED data...'}
                  {status.fred === 'error'   && 'FRED request failed · see console'}
                  {status.fred === 'ok'      && 'GDP series returned no data · check RGMP series IDs in console'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Census county cards */}
        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="flex items-start justify-between mb-1">
            <div className="font-semibold text-sm">County Demographics</div>
            {status.census === 'ok' && <LiveBadge />}
          </div>
          <div className="text-xs text-[#5C5C54] mb-4">
            ACS 5-year estimates · Census Bureau 2022
            {totalPop && ` · ${fmtK(totalPop)} total`}
          </div>
          {census?.length ? (
            <div className="space-y-3">
              {census.map(c => (
                <div key={c.metro} className="flex items-center justify-between border border-[#E2DDD6] rounded-lg p-4">
                  <div>
                    <div className="font-semibold text-sm text-[#0F0F0E]">{c.metro}</div>
                    <div className="text-xs text-[#5C5C54]">{c.county_name}</div>
                  </div>
                  <div className="flex gap-5 text-right">
                    <div>
                      <div className="font-serif text-lg font-bold text-[#0F0F0E]">{fmtK(c.population)}</div>
                      <div className="text-xs text-[#5C5C54]">population</div>
                    </div>
                    <div>
                      <div className="font-serif text-lg font-bold text-[#0F0F0E]">
                        ${Math.round(c.medianIncome / 1000)}K
                      </div>
                      <div className="text-xs text-[#5C5C54]">median income</div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Combined total */}
              <div className="flex items-center justify-between rounded-lg px-4 py-3 bg-[#F7F3EE]">
                <div className="text-sm font-semibold text-[#5C5C54]">3-County Total</div>
                <div className="font-serif text-lg font-bold text-[#0F0F0E]">{fmtK(totalPop)}</div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center py-12 bg-[#F7F3EE] rounded-lg">
              <div className="flex items-center gap-2 text-xs text-[#888780]">
                {status.census === 'loading' && <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>}
                {status.census === 'loading' ? 'Loading Census data...' : 'Census offline · data unavailable'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DALLAS FED: TEXAS ECONOMIC INTELLIGENCE ───────────────────────────── */}
      <div className="mb-8 rounded-2xl overflow-hidden border border-[#C4DDD0]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A4A35]"
          style={{ background: 'linear-gradient(135deg, #003D2D 0%, #00573F 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-lg">🏛️</div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#7EC8A4] uppercase">Dallas Federal Reserve</span>
                {status.dallas === 'ok' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/60 rounded font-mono">
                    {dallas?.source === 'dallas_fed' ? 'Dallas Fed API' : 'FRED series'}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">Texas Economic Intelligence</h2>
              <p className="text-xs text-white/45 mt-0.5">Business conditions, leading indicators, and border economy data from the Dallas Fed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.dallas === 'loading' && <div className="w-4 h-4 border border-white/25 border-t-white/80 rounded-full animate-spin"></div>}
            {status.dallas === 'ok'      && <div className="w-2 h-2 bg-[#7EC8A4] rounded-full"></div>}
            {status.dallas === 'error'   && <div className="w-2 h-2 bg-red-400 rounded-full"></div>}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E8F0EC] bg-white">

          {/* Texas Business Activity Index (TBOS) */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div className="font-semibold text-sm">Texas Business Activity Index</div>
              {tbosLatest != null && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${tbosLatest >= 0 ? 'bg-[#E4F0EA] text-[#2A6B43]' : 'bg-[#FBE9E3] text-[#B8431E]'}`}>
                  {tbosLatest >= 0 ? '▲ Expanding' : '▼ Contracting'}
                </span>
              )}
            </div>
            <div className="text-xs text-[#5C5C54] mb-0.5">Dallas Fed TBOS · FRED DALTBSOI · Monthly diffusion index</div>
            <div className="text-xs text-[#B8B4AE] mb-4">Positive = expansion · Negative = contraction · Zero = neutral</div>

            {tbosData.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className={`font-serif text-4xl font-bold ${tbosLatest >= 0 ? 'text-[#006747]' : 'text-[#B8431E]'}`}>
                    {tbosLatest >= 0 ? '+' : ''}{tbosLatest}
                  </span>
                  <span className="text-sm text-[#888780]">current reading</span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={tbosData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE8" />
                    <XAxis dataKey="date" tick={{ fill: '#888780', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#888780', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ReferenceLine y={0} stroke="#C8C4BE" strokeWidth={1.5} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #E2DDD6', borderRadius: 8, fontSize: 12 }}
                      formatter={v => [v.toFixed(1), 'Index']}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {tbosData.map((d, i) => (
                        <Cell key={i} fill={d.value >= 0 ? '#006747' : '#B8431E'} fillOpacity={0.82} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="h-44 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
                <div className="flex items-center gap-2 text-xs text-[#888780]">
                  {status.dallas === 'loading' && <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#006747] rounded-full animate-spin"></div>}
                  <span>{status.dallas === 'loading' ? 'Loading Dallas Fed data…' : 'TBOS data unavailable'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Texas Leading Index */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div className="font-semibold text-sm">Texas Leading Index</div>
              {tliTrend && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${tliTrend === 'up' ? 'bg-[#E4F0EA] text-[#2A6B43]' : 'bg-[#FBF4E3] text-[#B07D1A]'}`}>
                  {tliTrend === 'up' ? '↗ Accelerating' : '↘ Slowing'}
                </span>
              )}
            </div>
            <div className="text-xs text-[#5C5C54] mb-0.5">Dallas Fed TEXLEAD · {tliData.length}-month trend</div>
            <div className="text-xs text-[#B8B4AE] mb-4">Rising = improving economic outlook · Falling = headwinds ahead</div>

            {tliData.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-serif text-4xl font-bold text-[#006747]">{tliLatest}</span>
                  {tliTrend != null && tliPrev12 != null && (
                    <span className="text-sm text-[#888780]">
                      {tliTrend === 'up' ? '▲' : '▼'} {Math.abs(tliLatest - tliPrev12).toFixed(1)} vs 12 mo ago
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={tliData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EDE8" />
                    <XAxis dataKey="date" tick={{ fill: '#888780', fontSize: 10 }} axisLine={false} tickLine={false}
                      interval={Math.max(0, Math.floor(tliData.length / 5) - 1)} />
                    <YAxis tick={{ fill: '#888780', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #E2DDD6', borderRadius: 8, fontSize: 12 }}
                      formatter={v => [v.toFixed(2), 'Index']}
                    />
                    <Line dataKey="value" stroke="#006747" strokeWidth={2.5} dot={false}
                      activeDot={{ r: 4, fill: '#006747', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="h-44 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
                <div className="flex items-center gap-2 text-xs text-[#888780]">
                  {status.dallas === 'loading' && <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#006747] rounded-full animate-spin"></div>}
                  <span>{status.dallas === 'loading' ? 'Loading Dallas Fed data…' : 'TLI data unavailable'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Border Economy row */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E8F0EC] border-t border-[#E8F0EC] bg-white">

          {/* Border Economy Health indicators */}
          <div className="p-6">
            <div className="font-semibold text-sm mb-1">Border Economy Health</div>
            <div className="text-xs text-[#5C5C54] mb-5">Key U.S.–Mexico corridor indicators · FRED live data</div>

            <div className="space-y-1">
              {[
                {
                  icon:   '📦',
                  label:  'U.S. Exports to Mexico',
                  value:  exportsLatest != null ? '$' + (exportsLatest / 1000).toFixed(1) + 'B / mo' : '—',
                  change: exportsYoY,
                  sub:    'FRED EXPMX · monthly',
                },
                {
                  icon:   '🛍️',
                  label:  'Texas Retail Sales',
                  value:  retailLatest != null ? '$' + (retailLatest / 1000).toFixed(0) + 'M' : '—',
                  change: retailYoY,
                  sub:    'FRED TXRSALES · monthly',
                },
                {
                  icon:   '🏭',
                  label:  'Maquiladora Employment',
                  value:  '300K+',
                  change: '+4.2',
                  sub:    'Tamaulipas border states · INEGI 2024',
                },
                {
                  icon:   '🚛',
                  label:  'Laredo Commercial Crossings',
                  value:  bts?.Laredo?.[0] ? parseInt(bts.Laredo[0].value).toLocaleString() + '/mo' : '—',
                  change: null,
                  sub:    'BTS trucks · most recent month',
                },
              ].map(ind => (
                <div key={ind.label} className="flex items-center justify-between py-3 border-b border-[#F7F3EE] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{ind.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-[#0F0F0E]">{ind.value}</div>
                      <div className="text-xs text-[#888780]">{ind.label}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {ind.change != null && (
                      <div className={`text-xs font-bold ${parseFloat(ind.change) >= 0 ? 'text-[#2A6B43]' : 'text-[#B8431E]'}`}>
                        {parseFloat(ind.change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(ind.change)).toFixed(1)}% YoY
                      </div>
                    )}
                    <div className="text-[10px] text-[#C0BCB6] mt-0.5">{ind.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dallas Fed Insight quote */}
          <div className="p-6 flex flex-col">
            <div className="font-semibold text-sm mb-1">Dallas Fed Insight</div>
            <div className="text-xs text-[#5C5C54] mb-4">Latest Texas border economy analysis</div>

            <div className="flex-1 rounded-xl border border-[#C4DDD0] bg-[#F0FAF5] p-5 flex flex-col justify-between">
              <div>
                <div className="font-serif text-3xl text-[#006747] leading-none mb-3 select-none">"</div>
                <p className="text-sm text-[#1A3D2B] leading-relaxed italic">
                  Border metro areas — led by Laredo, El Paso, and McAllen — consistently outpace national
                  averages in export-related employment. Nearshoring activity accelerated through 2024, with
                  new manufacturing investment concentrated in Tamaulipas and Chihuahua, the Mexican states
                  directly across from Texas border metros.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#B8D8C8]">
                <div className="text-xs font-bold text-[#006747]">Dallas Federal Reserve</div>
                <div className="text-[10px] text-[#5C8A6B] mt-0.5">Texas Border Economy · Southwest Economy, Q4 2024</div>
              </div>
            </div>

            {/* Source line */}
            <div className="mt-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#006747' }}></div>
              <span className="text-[10px] text-[#B8B4AE]">
                Dallas Fed TEXLEAD · DALTBSOI · EXPMX · TXRSALES — all via FRED API
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ROW 2: PIPELINE + EMPLOYMENT BY SECTOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* Pipeline by sector (static) */}
        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="font-semibold text-sm mb-1">Pipeline by Sector</div>
          <div className="text-xs text-[#5C5C54] mb-4">$9.3B total active project value</div>
          {[
            ['Energy / LNG',    4200, '#B8431E'],
            ['Construction',    2800, '#1A6B72'],
            ['Data Centers',    1400, '#B07D1A'],
            ['Industrial',       880, '#2A6B43'],
            ['Other',             20, '#888780'],
          ].map(([label, val, color]) => (
            <div key={label} className="flex items-center gap-3 mb-2">
              <div className="text-xs text-[#5C5C54] w-24 flex-shrink-0">{label}</div>
              <div className="flex-1 h-5 bg-[#F7F3EE] rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${(val / 4200) * 100}%`, background: color }}></div>
              </div>
              <div className="text-xs font-semibold w-14 text-right">
                ${val >= 1000 ? (val / 1000).toFixed(1) + 'B' : val + 'M'}
              </div>
            </div>
          ))}
        </div>

        {/* Employment by sector (BLS live) */}
        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="flex items-start justify-between mb-1">
            <div className="font-semibold text-sm">Employment by Sector — McAllen MSA</div>
            {status.bls === 'ok' && <LiveBadge />}
          </div>
          <div className="text-xs text-[#5C5C54] mb-4">Nonfarm employment by supersector · BLS SMU series</div>
          {sectors.map((s, i) => {
            const val = sectorVals[i]
            const chg = blsYoY(bls, s.key)
            return (
              <div key={s.key} className="flex items-center gap-3 mb-2">
                <div className="text-xs text-[#5C5C54] w-28 flex-shrink-0">{s.label}</div>
                <div className="flex-1 h-4 bg-[#F7F3EE] rounded overflow-hidden">
                  <div className="h-full rounded transition-all"
                    style={{ width: `${(val / sectorMax) * 100}%`, background: s.color, opacity: val ? 1 : 0.25 }}></div>
                </div>
                <div className="text-xs font-semibold w-12 text-right">{val ? fmtK(val * 1000) : '—'}</div>
                {chg && (
                  <div className={`text-xs font-semibold w-10 text-right ${parseFloat(chg) >= 0 ? 'text-[#2A6B43]' : 'text-[#B8431E]'}`}>
                    {parseFloat(chg) >= 0 ? '+' : ''}{chg}%
                  </div>
                )}
              </div>
            )
          })}
          {status.bls === 'error' && (
            <div className="mt-3 text-xs text-[#888780] bg-[#F7F3EE] rounded p-2">
              BLS offline — bars are proportional estimates
            </div>
          )}
        </div>
      </div>

      {/* CROSS-BORDER TRUCK TRAFFIC (BTS) */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="font-semibold text-sm">Cross-Border Truck Traffic</div>
            <div className="text-xs text-[#888780] mt-0.5">Laredo is the #1 US land port by trade volume</div>
          </div>
          <div className="flex items-center gap-2">
            {status.bts === 'ok' && <LiveBadge />}
            {status.bts === 'loading' && (
              <div className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
                Loading BTS...
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-[#5C5C54] mb-4">Monthly truck crossings · BTS Border Crossing Entry Data</div>

        {/* Port stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { port: 'Laredo',      color: '#1A6B72', label: 'Laredo' },
            { port: 'Hidalgo',     color: '#B07D1A', label: 'Hidalgo / McAllen' },
            { port: 'Brownsville', color: '#B8431E', label: 'Brownsville' },
          ].map(({ port, color, label }) => {
            const row    = btsLatest[port]
            const trucks = row ? parseInt(row.value).toLocaleString() : '—'
            const month  = row ? fmtMonth(row.date?.slice(0, 7)) : '—'
            return (
              <div key={port} className="border border-[#E2DDD6] rounded-lg p-4" style={{ borderLeftColor: color, borderLeftWidth: '3px' }}>
                <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{trucks}</div>
                <div className="text-xs text-[#5C5C54] mt-1">{label}</div>
                <div className="text-xs text-[#888780] mt-0.5">Trucks · {month}</div>
              </div>
            )
          })}
        </div>

        {/* Line chart */}
        {btsChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={btsChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2DDD6" />
              <XAxis dataKey="date" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#888780' }} />
              <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 11, fill: '#888780' }} width={52} />
              <Tooltip
                formatter={(v, name) => [parseInt(v).toLocaleString(), name]}
                labelFormatter={fmtMonth}
                contentStyle={{ fontSize: 12, borderColor: '#E2DDD6', borderRadius: '6px' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Laredo"      stroke="#1A6B72" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Hidalgo"     stroke="#B07D1A" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Brownsville" stroke="#B8431E" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
            <div className="flex flex-col items-center gap-2 text-xs text-[#888780]">
              {status.bts === 'loading' && <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>}
              <span>
                {status.bts === 'loading' ? 'Loading BTS data...' : status.bts === 'error' ? 'BTS data unavailable' : 'No chart data'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* UNIVERSITY WORKFORCE PIPELINE (IPEDS) */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="font-semibold text-sm">University Workforce Pipeline</div>
            <div className="text-xs text-[#888780] mt-0.5">
              {ipedsTotal > 0
                ? `${ipedsTotal.toLocaleString()} combined graduates annually from 3 regional universities`
                : 'Annual completions by degree field · IPEDS 2022'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.ipeds === 'ok'      && <LiveBadge />}
            {status.ipeds === 'loading' && (
              <div className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
                Loading IPEDS...
              </div>
            )}
            {status.ipeds === 'error' && (
              <span className="text-xs text-[#888780]">IPEDS unavailable</span>
            )}
          </div>
        </div>
        <div className="text-xs text-[#5C5C54] mb-5">Urban Institute Education Data API · IPEDS completions 2022</div>

        {/* University cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {IPEDS_SCHOOLS.map((s, idx) => {
            const school  = ipeds?.[s.unitid]
            const colors  = ['#1A6B72', '#B07D1A', '#B8431E']
            const color   = colors[idx]
            const top3    = school?.cips?.slice(0, 3) ?? []
            return (
              <div key={s.unitid} className="border border-[#E2DDD6] rounded-lg p-4"
                style={{ borderTopColor: color, borderTopWidth: '3px' }}>
                <div className="font-semibold text-sm text-[#0F0F0E] mb-0.5">{s.shortName}</div>
                <div className="text-xs text-[#888780] mb-3 truncate">{s.name}</div>
                {school ? (
                  <>
                    <div className="font-serif text-2xl font-bold text-[#0F0F0E] mb-0.5">
                      {school.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-[#5C5C54] mb-3">degrees awarded · 2022</div>
                    <div className="space-y-1.5">
                      {top3.map(c => (
                        <div key={c.cipcode} className="flex items-center justify-between gap-2">
                          <div className="text-xs text-[#5C5C54] truncate flex-1"
                            title={c.cipdesc}>{c.cipdesc?.replace(/\.$/, '')}</div>
                          <div className="text-xs font-semibold text-[#0F0F0E] flex-shrink-0"
                            style={{ color }}>{c.awards}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[#888780] py-4">
                    {status.ipeds === 'loading' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : 'Data unavailable'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Grouped bar chart */}
        {ipedsChartData.some(d => IPEDS_SCHOOLS.some(s => d[s.shortName] > 0)) ? (
          <>
            <div className="text-xs text-[#5C5C54] mb-3 font-medium">Degrees by Broad Field</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ipedsChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2DDD6" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#888780' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#888780' }} width={40} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, name) => [v.toLocaleString(), name]}
                  contentStyle={{ fontSize: 12, borderColor: '#E2DDD6', borderRadius: '6px' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {IPEDS_SCHOOLS.map(s => (
                  <Bar key={s.unitid} dataKey={s.shortName} fill={IPEDS_COLORS[s.shortName]} radius={[3,3,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : status.ipeds === 'error' ? (
          <div className="h-36 flex items-center justify-center bg-[#F7F3EE] rounded-lg text-xs text-[#888780]">
            IPEDS data unavailable · Urban Institute API may be down
          </div>
        ) : null}
      </div>

      {/* ENERGY & LNG TRACKER (FRED) */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="font-semibold text-sm">Energy & LNG Tracker</div>
            <div className="text-xs text-[#888780] mt-0.5">US LNG exports & Texas natural gas production · FRED (DNGLNGUS2, TXNGGDPD)</div>
          </div>
          <div className="flex items-center gap-2">
            {status.eia === 'ok'      && <LiveBadge />}
            {status.eia === 'loading' && (
              <div className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
                Loading Energy...
              </div>
            )}
            {status.eia === 'error' && (
              <span className="text-xs text-[#888780]">FRED data unavailable</span>
            )}
          </div>
        </div>
        <div className="text-xs text-[#5C5C54] mb-5">
          Federal Reserve Economic Data · FRED API via proxy · Monthly series
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">

          {/* LNG exports latest */}
          <div className="bg-[#F0F7F7] border border-[#C8E0E1] rounded-lg p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1A6B72] mb-2">Total LNG Exports</div>
            <div className="font-serif text-2xl font-bold text-[#0F0F0E]">
              {lngLatestVal != null ? fmtBcf(lngLatestVal) : (status.eia === 'loading' ? '—' : '—')}
            </div>
            <div className="text-xs text-[#5C5C54] mt-1">
              {lngLatest?.period ? `${fmtMonth(lngLatest.period)} · all terminals` : 'Latest month · all US terminals'}
            </div>
          </div>

          {/* TX natural gas production */}
          <div className="bg-[#F0F7F4] border border-[#C8DDD2] rounded-lg p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#2A6B43] mb-2">Texas Production</div>
            <div className="font-serif text-2xl font-bold text-[#0F0F0E]">
              {txGasLatest?.value != null ? fmtBcf(txGasLatest.value) : '—'}
            </div>
            <div className="text-xs text-[#5C5C54] mt-1">
              {txGasLatest?.period ? `${fmtMonth(txGasLatest.period)} · dry natural gas` : 'Latest month · dry natural gas'}
            </div>
          </div>

          {/* South TX LNG hub callout */}
          <div className="bg-[#0F0F0E] rounded-lg p-4 flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1A6B72] mb-2">South Texas LNG Hub</div>
            <div className="text-xs text-[#E2DDD6] leading-relaxed">
              Cheniere's <span className="text-white font-semibold">Sabine Pass</span> and{' '}
              <span className="text-white font-semibold">Corpus Christi</span> terminals are two of the world's
              largest LNG export facilities, connecting South Texas gas fields to global markets.
            </div>
            <div className="mt-3 flex gap-2">
              {['Sabine Pass', 'Corpus Christi', 'Freeport'].map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded bg-[#1A1A19] text-[#888780] border border-[#333]">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* LNG export trend line chart */}
        {eia?.lng?.length > 0 ? (
          <>
            <div className="text-xs text-[#5C5C54] mb-3 font-medium">Monthly US LNG Export Volume</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={eia.lng} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2DDD6" />
                <XAxis
                  dataKey="period"
                  tickFormatter={fmtMonth}
                  tick={{ fontSize: 11, fill: '#888780' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => fmtBcf(v)}
                  tick={{ fontSize: 11, fill: '#888780' }}
                  width={60}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={v => [fmtBcf(v), 'LNG Exports']}
                  labelFormatter={fmtMonth}
                  contentStyle={{ fontSize: 12, borderColor: '#E2DDD6', borderRadius: '6px' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1A6B72"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#1A6B72' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
            <div className="flex flex-col items-center gap-2 text-xs text-[#888780] text-center px-8">
              {status.eia === 'loading' && (
                <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
              )}
              {status.eia === 'loading' && 'Loading energy data...'}
              {status.eia === 'error'   && (
                <>
                  <span className="font-semibold text-[#5C5C54]">FRED energy data unavailable</span>
                  <span>Check that the fred-proxy edge function is deployed and the FRED_API_KEY secret is set.</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CROSS-BORDER INVESTMENT & MAQUILADORA */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">

        {/* Section header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="font-semibold text-sm">Cross-Border Investment & Maquiladora</div>
            <div className="text-xs text-[#888780] mt-0.5">
              {maquiladoraTotal > 0
                ? `~${(maquiladoraTotal / 1000).toFixed(0)}K maquiladora workers within 200 miles of the RioData region`
                : 'Tamaulipas manufacturing workforce · World Bank FDI trend'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.fdi === 'ok'      && <LiveBadge />}
            {status.fdi === 'loading' && (
              <div className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#B07D1A] rounded-full animate-spin"></div>
                Loading FDI...
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-[#5C5C54] mb-5">
          World Bank BX.KLT.DINV.CD.WD · INEGI BIE 2023 maquiladora estimates
        </div>

        {/* Tamaulipas callout banner */}
        <div className="flex items-center gap-3 bg-[#FBF4E3] border border-[#E8D5A3] rounded-lg px-4 py-3 mb-5">
          <div className="w-1 h-8 bg-[#B07D1A] rounded-full flex-shrink-0"></div>
          <div className="text-xs text-[#5C5C54] leading-relaxed">
            <span className="font-semibold text-[#0F0F0E]">Tamaulipas hosts more maquiladoras than any other Mexican border state</span>
            {' '}— with major industrial parks in Reynosa, Matamoros, and Nuevo Laredo directly across from US sister cities in the RioData corridor.
          </div>
        </div>

        {/* City cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {MAQUILADORA_CITIES.map((city, idx) => {
            const colors  = ['#B07D1A', '#B8431E', '#2A6B43']
            const bgColors = ['#FBF4E3', '#FBE9E3', '#E8F3EC']
            const color   = colors[idx]
            const bgColor = bgColors[idx]
            return (
              <div key={city.city} className="border border-[#E2DDD6] rounded-lg overflow-hidden">
                {/* Card header strip */}
                <div className="px-4 py-3" style={{ background: bgColor, borderBottom: `2px solid ${color}` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[#0F0F0E]">{city.city}</div>
                      <div className="text-xs text-[#5C5C54]">{city.state}, México</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold" style={{ color }}>{city.sisterCity}</div>
                      <div className="text-xs text-[#888780]">{city.distance} across border</div>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-4 py-4">
                  <div className="mb-3">
                    <div className="font-serif text-2xl font-bold text-[#0F0F0E]">
                      {(city.workers / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-[#5C5C54]">maquiladora workers</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {city.sectors.map(s => (
                      <span
                        key={s}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: bgColor, color }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* FDI line chart + latest stat */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Chart — 3/4 width */}
          <div className="md:col-span-3">
            <div className="text-xs text-[#5C5C54] font-medium mb-3">
              Mexico FDI Net Inflows — 10-Year Trend (World Bank)
            </div>
            {fdi?.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={fdi} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2DDD6" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#888780' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => '$' + (v / 1e9).toFixed(0) + 'B'}
                    tick={{ fontSize: 11, fill: '#888780' }}
                    width={44}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={v => [fmtUSD(v), 'FDI Inflows']}
                    labelFormatter={y => `${y} · Mexico`}
                    contentStyle={{ fontSize: 12, borderColor: '#E2DDD6', borderRadius: '6px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#B07D1A"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#B07D1A', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
                <div className="flex flex-col items-center gap-2 text-xs text-[#888780]">
                  {status.fdi === 'loading' && (
                    <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#B07D1A] rounded-full animate-spin"></div>
                  )}
                  {status.fdi === 'loading' ? 'Loading World Bank data...' : 'FDI data unavailable'}
                </div>
              </div>
            )}
          </div>

          {/* Latest FDI stat — 1/4 width */}
          <div className="flex flex-col gap-3">
            <div className="bg-[#FBF4E3] border border-[#E8D5A3] rounded-lg p-4 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B07D1A] mb-2">Mexico FDI</div>
              <div className="font-serif text-2xl font-bold text-[#0F0F0E]">
                {fdiLatest ? fmtUSD(fdiLatest.value) : '—'}
              </div>
              <div className="text-xs text-[#5C5C54] mt-1">
                {fdiLatest?.year ? `${fdiLatest.year} · net inflows` : 'Latest year · net inflows'}
              </div>
            </div>
            <div className="bg-[#FBE9E3] border border-[#E8C9BC] rounded-lg p-4 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B8431E] mb-2">Regional Workers</div>
              <div className="font-serif text-2xl font-bold text-[#0F0F0E]">
                ~{(maquiladoraTotal / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-[#5C5C54] mt-1">maquiladora employees<br />across 3 Tamaulipas cities</div>
            </div>
          </div>

        </div>

        <div className="mt-3 text-xs text-[#888780]">
          Maquiladora employment: INEGI BIE 2023 estimates · FDI: World Bank BoP current US$ · Live data via World Bank API
        </div>
      </div>

      {/* COST OF LIVING COMPARISON */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="font-semibold text-sm">Cost of Living Comparison</div>
          <span className="text-xs px-1.5 py-0.5 bg-[#F7F3EE] text-[#888780] rounded font-medium">Static · ACCRA 2023</span>
        </div>
        <div className="text-xs text-[#5C5C54] mb-4">C2ER ACCRA Cost of Living Index · US average = 100</div>

        {/* Callout headline */}
        <div className="flex items-center gap-3 bg-[#E8F3EC] border border-[#B8D9C4] rounded-lg px-4 py-3 mb-5">
          <div className="w-1 h-8 bg-[#2A6B43] rounded-full flex-shrink-0"></div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-[#0F0F0E] text-sm">
              McAllen costs {colSavingsPct}% less than Austin
            </span>
            <span className="text-[#5C5C54]"> — with a growing job market, expanding healthcare sector, and direct access to the largest US–Mexico land trade corridor.</span>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Overall COL — horizontal bar chart */}
          <div>
            <div className="text-xs font-medium text-[#5C5C54] mb-3">Overall COL Index — 7-City Comparison</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={colBarData}
                margin={{ top: 4, right: 44, left: 80, bottom: 4 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2DDD6" horizontal={false} />
                <YAxis
                  type="category"
                  dataKey="city"
                  tick={{ fontSize: 12, fill: '#5C5C54' }}
                  axisLine={false}
                  tickLine={false}
                  width={78}
                />
                <XAxis
                  type="number"
                  domain={[50, 135]}
                  tick={{ fontSize: 11, fill: '#888780' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={v => [v.toFixed(1), 'COL Index']}
                  contentStyle={{ fontSize: 12, borderColor: '#E2DDD6', borderRadius: '6px' }}
                />
                <ReferenceLine
                  x={100}
                  stroke="#888780"
                  strokeDasharray="4 4"
                  label={{ value: 'US avg', position: 'insideTopRight', fontSize: 10, fill: '#888780', dy: -6 }}
                />
                <Bar dataKey="overall" radius={[0, 3, 3, 0]}>
                  {colBarData.map(entry => (
                    <Cell
                      key={entry.city}
                      fill={entry.isSouthTX ? '#1A6B72' : '#C8C4BE'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1 ml-20">
              {[['#1A6B72','South Texas'],['#C8C4BE','Texas comparison']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                  <span className="w-3 h-2 rounded-sm flex-shrink-0" style={{ background: c }}></span>{l}
                </span>
              ))}
            </div>
          </div>

          {/* Subcategory breakdown — grouped bar chart */}
          <div>
            <div className="text-xs font-medium text-[#5C5C54] mb-3">Subcategory Breakdown vs. Austin</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={colSubData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2DDD6" vertical={false} />
                <XAxis dataKey="cat" tick={{ fontSize: 11, fill: '#888780' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 170]}
                  tick={{ fontSize: 11, fill: '#888780' }}
                  width={36}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [v, name]}
                  contentStyle={{ fontSize: 12, borderColor: '#E2DDD6', borderRadius: '6px' }}
                />
                <ReferenceLine y={100} stroke="#888780" strokeDasharray="4 4" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="McAllen"     fill="#1A6B72" radius={[2,2,0,0]} />
                <Bar dataKey="Laredo"      fill="#B07D1A" radius={[2,2,0,0]} />
                <Bar dataKey="Brownsville" fill="#B8431E" radius={[2,2,0,0]} />
                <Bar dataKey="Austin"      fill="#C8C4BE" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* South TX metro cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COL_DATA.filter(c => c.isSouthTX).map(city => {
            const incomeData = census?.find(c => c.metro === city.city)
            const savings    = Math.round(100 - city.overall)
            return (
              <div key={city.city} className="border border-[#E2DDD6] rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm text-[#0F0F0E]">{city.city}</div>
                    <div className="text-xs text-[#888780]">{savings}% below US average</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-2xl font-bold text-[#1A6B72]">{city.overall}</div>
                    <div className="text-xs text-[#888780]">COL Index</div>
                  </div>
                </div>

                {/* Sub-index mini bars */}
                <div className="space-y-1.5 mb-3">
                  {[
                    { label: 'Housing',    val: city.housing    },
                    { label: 'Healthcare', val: city.healthcare },
                    { label: 'Groceries',  val: city.groceries  },
                    { label: 'Utilities',  val: city.utilities  },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="text-xs text-[#888780] w-20 flex-shrink-0">{label}</div>
                      <div className="flex-1 h-1.5 bg-[#F7F3EE] rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${(val / 170) * 100}%`, background: val < 100 ? '#1A6B72' : '#B8431E' }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-[#0F0F0E] w-6 text-right">{val}</div>
                    </div>
                  ))}
                </div>

                {/* Median income from Census */}
                <div className="border-t border-[#F7F3EE] pt-2 flex items-center justify-between">
                  <div className="text-xs text-[#5C5C54]">Median household income</div>
                  <div className="text-xs font-semibold text-[#0F0F0E]">
                    {incomeData ? '$' + Math.round(incomeData.medianIncome / 1000) + 'K' : (status.census === 'loading' ? '—' : 'N/A')}
                    {incomeData && <span className="text-[#888780] font-normal"> · 2022</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 text-xs text-[#888780]">
          COL Index: C2ER ACCRA 2023 Q3 · US average = 100 · Median income: Census ACS 5-year 2022
        </div>
      </div>

      {/* CBP BORDER WAIT TIMES — EXPANDED */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="font-semibold text-sm">Border Crossing Wait Times</div>
            {cbpLive && (
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2A6B43] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2A6B43]"></span>
                </span>
                <span className="text-xs text-[#2A6B43] font-medium">Live</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#888780]">
            {status.cbp === 'loading'
              ? <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
              : <span>Auto-refresh every 5 min</span>}
          </div>
        </div>
        <div className="text-xs text-[#5C5C54] mb-4">
          Laredo → Mid-Valley → McAllen Area → Brownsville
          {cbpLive && ` · ${reportingCount} of ${totalCrossings} crossings reporting`}
        </div>

        {/* Summary bar */}
        {cbpLive && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 bg-[#F7F3EE] rounded-lg px-4 py-2.5 mb-5 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-[#B07D1A]"></div>
              <span className="text-[#5C5C54]">Commercial lanes open:</span>
              <span className="font-semibold text-[#0F0F0E]">{totalCvLanes > 0 ? totalCvLanes : '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-[#1A6B72]"></div>
              <span className="text-[#5C5C54]">Passenger lanes open:</span>
              <span className="font-semibold text-[#0F0F0E]">{totalPvLanes > 0 ? totalPvLanes : '—'}</span>
            </div>
            {cbpLastUpdated && (
              <span className="ml-auto text-[#888780]">Updated: {cbpLastUpdated}</span>
            )}
          </div>
        )}

        {/* Geographic map-style layout: west (Laredo) → east (Brownsville) */}
        {cbpLive ? (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {cbp.map(group => (
                <div key={group.area} className="w-44 flex-shrink-0">

                  {/* Area header */}
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b-2" style={{ borderColor: group.color }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: group.color }}></div>
                    <div className="text-xs font-bold uppercase tracking-wide text-[#0F0F0E]">{group.area}</div>
                  </div>

                  {/* Crossing cards */}
                  <div className="space-y-2">
                    {group.crossings.map(c => (
                      <div
                        key={c.id}
                        className={`rounded-lg p-2.5 border text-xs ${
                          c.status === 'Closed'
                            ? 'border-[#E2DDD6] bg-[#F7F3EE] opacity-60'
                            : c.hasData
                            ? 'border-[#E2DDD6] bg-white'
                            : 'border-dashed border-[#E2DDD6] bg-[#FAFAF8]'
                        }`}
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="font-semibold text-[#0F0F0E] leading-tight">{c.label}</div>
                          {c.focus === 'commercial' && (
                            <span className="flex-shrink-0 px-1 py-px bg-[#FBF4E3] text-[#B07D1A] rounded font-medium">
                              COM
                            </span>
                          )}
                        </div>

                        {/* Wait times */}
                        {c.status === 'Closed' ? (
                          <div className="text-center text-[#888780] py-1">Closed</div>
                        ) : !c.hasData ? (
                          <div className="text-center text-[#888780] py-1 italic">No real-time data</div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              {/* Passenger */}
                              <div>
                                <div className="text-[#888780] mb-0.5">Passenger</div>
                                {c.pvWait != null
                                  ? <span className={`font-bold px-1.5 py-0.5 rounded ${waitBadge(c.pvWait)}`}>{c.pvWait} min</span>
                                  : <span className="text-[#888780]">—</span>}
                                {c.pvLanes != null && (
                                  <div className="text-[#888780] mt-0.5">{c.pvLanes} lane{c.pvLanes !== 1 ? 's' : ''}</div>
                                )}
                              </div>
                              {/* Commercial */}
                              <div>
                                <div className="text-[#888780] mb-0.5">Commercial</div>
                                {c.cvWait != null
                                  ? <span className={`font-bold px-1.5 py-0.5 rounded ${waitBadge(c.cvWait)}`}>{c.cvWait} min</span>
                                  : <span className="text-[#888780]">—</span>}
                                {c.cvLanes != null && (
                                  <div className="text-[#888780] mt-0.5">{c.cvLanes} lane{c.cvLanes !== 1 ? 's' : ''}</div>
                                )}
                              </div>
                            </div>

                            {/* FAST lanes row — only if data exists */}
                            {(c.cvFastLanes ?? 0) > 0 && (
                              <div className="mt-1.5 bg-[#E8F3EC] text-[#2A6B43] rounded px-1.5 py-0.5 font-medium">
                                FAST: {c.cvFastWait != null ? `${c.cvFastWait} min` : '—'} · {c.cvFastLanes} lane{c.cvFastLanes !== 1 ? 's' : ''}
                              </div>
                            )}

                            {/* Hours footnote */}
                            {c.hours && (
                              <div className="mt-1 text-[#888780]">{c.hours}</div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
            <div className="flex flex-col items-center gap-2 text-xs text-[#888780]">
              {status.cbp === 'loading' && (
                <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
              )}
              <span>{status.cbp === 'loading' ? 'Loading CBP data...' : 'CBP wait time data unavailable'}</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          {[
            ['≤15 min',  'bg-[#E4F0EA] text-[#2A6B43]'],
            ['16–30 min','bg-[#FBF4E3] text-[#B07D1A]'],
            ['>30 min',  'bg-[#FBE9E3] text-[#B8431E]'],
          ].map(([l, c]) => (
            <span key={l} className={`text-xs font-semibold px-2 py-0.5 rounded ${c}`}>{l}</span>
          ))}
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#E8F3EC] text-[#2A6B43]">
            FAST = Free &amp; Secure Trade lanes
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#FBF4E3] text-[#B07D1A]">COM = commercial focus crossing</span>
        </div>
      </div>

      {/* TRADE FLOWS BY COMMODITY */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
        <div className="font-semibold text-sm mb-1">Trade Flows by Commodity</div>
        <div className="text-xs text-[#5C5C54] mb-4">South Texas ports of entry · Estimated monthly volume</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2DDD6]">
                {['Commodity', 'Port', 'Monthly Volume', 'YoY'].map(h => (
                  <th key={h} className="text-left py-2 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Auto Parts & Vehicles',   'Laredo',   '$8.4B', '+12%', true],
                ['Petroleum / LNG',         'Brownsville','$2.1B', '+31%', true],
                ['Electronics / Maquiladora','McAllen', '$1.8B', '+8%',  true],
                ['Fresh Produce',           'Hidalgo',  '$680M', '+4%',  true],
                ['Steel & Metals',          'Laredo',   '$420M', '-6%',  false],
              ].map(([com, port, vol, yoy, up]) => (
                <tr key={com} className="border-b border-[#F7F3EE]">
                  <td className="py-3 font-semibold text-[#0F0F0E]">{com}</td>
                  <td className="py-3 text-[#5C5C54]">{port}</td>
                  <td className="py-3 font-semibold text-[#0F0F0E]">{vol}</td>
                  <td className={`py-3 font-semibold ${up ? 'text-[#2A6B43]' : 'text-[#B8431E]'}`}>{yoy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── REGIONAL ECONOMIC NEWS FEED ──────────────────────────────────────── */}
      {(() => {
        const NEWS_FALLBACKS = [
          { title: 'Laredo remains top U.S. land port for cross-border trade', url: 'https://www.laredomorningthimes.com', source: 'Laredo Morning Times', publishedAt: '', summary: 'Laredo continues to lead all U.S. ports of entry in total trade value, processing over $300B in annual cargo.', category: 'trade', lang: 'en' },
          { title: 'UTRGV launches new engineering programs to meet South Texas workforce demand', url: 'https://www.utrgv.edu', source: 'UTRGV News', publishedAt: '', summary: 'University of Texas Rio Grande Valley expands engineering and STEM offerings to serve the growing manufacturing sector.', category: 'manufacturing', lang: 'en' },
          { title: 'New LNG export terminal breaks ground near Brownsville', url: 'https://www.brownsvilleherald.com', source: 'Brownsville Herald', publishedAt: '', summary: 'Texas LNG and Rio Grande LNG projects advance as South Texas becomes a global energy export hub.', category: 'energy', lang: 'en' },
          { title: 'Reynosa maquiladoras report record employment in auto parts sector', url: 'https://www.elmanana.com', source: 'El Mañana', publishedAt: '', summary: 'Tamaulipas manufacturing zones continue expansion as nearshoring trends bring new investment to the region.', category: 'manufacturing', lang: 'es' },
          { title: 'McAllen industrial real estate demand surges on nearshoring wave', url: 'https://www.themonitor.com', source: 'The Monitor', publishedAt: '', summary: 'Industrial warehouse space in the McAllen metro area hits historic low vacancy rates as logistics firms expand.', category: 'realestate', lang: 'en' },
        ]

        const articles = news?.length ? news : (status.news === 'error' ? NEWS_FALLBACKS : [])
        const isFallback = !news?.length

        const CATEGORIES = [
          { key: 'all',           label: 'All' },
          { key: 'trade',         label: 'Trade' },
          { key: 'energy',        label: 'Energy' },
          { key: 'manufacturing', label: 'Manufacturing' },
          { key: 'realestate',    label: 'Real Estate' },
        ]

        const CATEGORY_COLORS = {
          trade:         { bg: 'bg-[#EBF3FB]', text: 'text-[#1A5C8A]', label: 'Trade' },
          energy:        { bg: 'bg-[#FBF4E3]', text: 'text-[#B07D1A]', label: 'Energy' },
          manufacturing: { bg: 'bg-[#EBF3FB]', text: 'text-[#1A5C8A]', label: 'Manufacturing' },
          realestate:    { bg: 'bg-[#F0EBFB]', text: 'text-[#6A3AAA]', label: 'Real Estate' },
          general:       { bg: 'bg-[#F7F3EE]', text: 'text-[#5C5C54]', label: 'General' },
        }

        const filtered = articles.filter(a => {
          if (newsLang !== 'all' && a.lang !== newsLang) return false
          if (newsCategory !== 'all' && a.category !== newsCategory) return false
          return true
        })

        function fmtAge(iso) {
          if (!iso) return ''
          try {
            const diff = Date.now() - new Date(iso).getTime()
            const h = Math.floor(diff / 3600000)
            if (h < 1) return 'Just now'
            if (h < 24) return `${h}h ago`
            const d = Math.floor(h / 24)
            return `${d}d ago`
          } catch { return '' }
        }

        return (
          <div className="mb-10">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#0F0F0E]">Regional Economic News</h2>
                <span className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                  <span className="w-2 h-2 rounded-full bg-[#2A6B43] animate-pulse inline-block"></span>
                  Updates every hour
                </span>
                {isFallback && status.news === 'error' && (
                  <span className="text-xs text-[#B07D1A] bg-[#FBF4E3] px-2 py-0.5 rounded">Showing sample headlines</span>
                )}
              </div>
              {/* EN / ES / All toggle */}
              <div className="flex items-center gap-1 bg-[#F7F3EE] rounded-lg p-0.5">
                {[['all', 'All'], ['en', 'English'], ['es', 'Español']].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => { setNewsLang(v); setNewsShowing(6) }}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${newsLang === v ? 'bg-white text-[#0F0F0E] shadow-sm' : 'text-[#5C5C54] hover:text-[#0F0F0E]'}`}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setNewsCategory(key); setNewsShowing(6) }}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${newsCategory === key ? 'bg-[#1A6B72] text-white border-[#1A6B72]' : 'border-[#E0DDD6] text-[#5C5C54] hover:border-[#1A6B72] hover:text-[#1A6B72]'}`}
                >{label}</button>
              ))}
            </div>

            {/* Loading state */}
            {status.news === 'loading' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white border border-[#E0DDD6] rounded-xl p-4 animate-pulse">
                    <div className="h-3 bg-[#F0EDE8] rounded w-1/3 mb-3"></div>
                    <div className="h-4 bg-[#F0EDE8] rounded w-full mb-2"></div>
                    <div className="h-4 bg-[#F0EDE8] rounded w-4/5 mb-3"></div>
                    <div className="h-3 bg-[#F0EDE8] rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Article grid */}
            {status.news !== 'loading' && filtered.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.slice(0, newsShowing).map((a, i) => {
                    const cat = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.general
                    return (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white border border-[#E0DDD6] rounded-xl p-4 hover:border-[#1A6B72] hover:shadow-sm transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
                          <span className="text-xs text-[#A8A49E]">{fmtAge(a.publishedAt)}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0F0F0E] leading-snug group-hover:text-[#1A6B72] transition-colors line-clamp-3">{a.title}</p>
                        {a.summary && a.summary !== a.title && (
                          <p className="text-xs text-[#5C5C54] leading-relaxed line-clamp-2">{a.summary}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <span className="text-xs text-[#A8A49E] truncate">{a.source}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${a.lang === 'es' ? 'bg-[#FBF4E3] text-[#B07D1A]' : 'bg-[#F7F3EE] text-[#5C5C54]'}`}>{a.lang === 'es' ? 'ES' : 'EN'}</span>
                        </div>
                      </a>
                    )
                  })}
                </div>

                {/* Load more */}
                {filtered.length > newsShowing && (
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => setNewsShowing(n => n + 6)}
                      className="px-5 py-2 text-sm font-medium border border-[#1A6B72] text-[#1A6B72] rounded-lg hover:bg-[#EBF5F6] transition-colors"
                    >
                      Load more ({filtered.length - newsShowing} remaining)
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {status.news !== 'loading' && filtered.length === 0 && (
              <div className="text-center py-10 text-[#5C5C54] text-sm">
                No articles found for the selected filters.
              </div>
            )}

            <p className="text-xs text-[#A8A49E] mt-4">Source: Google News RSS · Filtered for South Texas / Northern Mexico region · Cached 1 hour</p>
          </div>
        )
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          A. USDA AGRICULTURE
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="mt-10 border border-[#E2DDD6] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 bg-[#E4F0EA] border-b border-[#E2DDD6]">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#2A6B43] mb-1">Agriculture · USDA</div>
            <h2 className="font-serif text-xl font-bold text-[#0F0F0E]">RGV — #1 Produce Port in the US</h2>
            <p className="text-xs text-[#5C5C54] mt-0.5">Hidalgo County leads the nation in fresh produce imports</p>
          </div>
          <span className="text-3xl">🌽</span>
        </div>
        <div className="p-6 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Annual Produce Trade',   value: '$2.1B',  sub: 'Through Hidalgo County',    color: '#2A6B43' },
              { label: 'Produce Companies',       value: '350+',   sub: 'Regional produce handlers',  color: '#2A6B43' },
              { label: 'Cold Storage Facilities', value: '40+',    sub: 'South Texas region',         color: '#2A6B43' },
              { label: 'US Produce Rank',         value: '#1',     sub: 'Produce port by volume',     color: '#B07D1A' },
            ].map(s => (
              <div key={s.label} className="bg-[#F7F3EE] rounded-xl p-4">
                <div className="font-serif text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold text-[#0F0F0E]">{s.label}</div>
                <div className="text-[10px] text-[#888780] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F7F3EE] rounded-xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Top Produce Commodities</div>
              {[
                { name: 'Bell Peppers',   pct: 92 },
                { name: 'Cantaloupes',    pct: 85 },
                { name: 'Watermelons',    pct: 78 },
                { name: 'Honeydew',       pct: 71 },
                { name: 'Cucumbers',      pct: 65 },
                { name: 'Squash',         pct: 58 },
              ].map(p => (
                <div key={p.name} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-[#5C5C54] w-28">{p.name}</span>
                  <div className="flex-1 h-2 bg-[#E2DDD6] rounded-full overflow-hidden">
                    <div className="h-2 rounded-full bg-[#2A6B43] transition-all" style={{ width: `${p.pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-[#2A6B43] w-10 text-right">{p.pct}%</span>
                </div>
              ))}
              <p className="text-[10px] text-[#A8A49E] mt-3">% of US imports through RGV · USDA AMS</p>
            </div>
            <div className="bg-[#F7F3EE] rounded-xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Seasonal Volume Pattern</div>
              <div className="flex items-end gap-1 h-28">
                {[
                  { m: 'J', v: 40 },{ m: 'F', v: 55 },{ m: 'M', v: 90 },
                  { m: 'A', v: 95 },{ m: 'M', v: 85 },{ m: 'J', v: 70 },
                  { m: 'J', v: 50 },{ m: 'A', v: 45 },{ m: 'S', v: 65 },
                  { m: 'O', v: 80 },{ m: 'N', v: 75 },{ m: 'D', v: 60 },
                ].map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-[#2A6B43]" style={{ height: `${d.v}%`, opacity: 0.7 + d.v / 300 }} />
                    <span className="text-[9px] text-[#888780]">{d.m}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#A8A49E] mt-3">Peak season: Mar–May · USDA NASS estimates</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          B. HOUSING MARKET
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="mt-8 border border-[#E2DDD6] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-[#E2DDD6]">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#1A6B72] mb-1">Housing Market · Census ACS</div>
            <h2 className="font-serif text-xl font-bold text-[#0F0F0E]">Affordable by Every Measure</h2>
            <p className="text-xs text-[#5C5C54] mt-0.5">South Texas median home prices vs. major TX metros</p>
          </div>
          <span className="text-3xl">🏠</span>
        </div>
        <div className="p-6 bg-white">
          {status.housing === 'loading' ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-[#E8E4DF] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : housing ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {housing.counties.map(c => {
                  const isRGV = c.group === 'rgv'
                  return (
                    <div key={c.name} className={`rounded-xl p-4 ${isRGV ? 'bg-[#E3F0F1]' : 'bg-[#F7F3EE]'}`}>
                      <div className={`font-serif text-lg font-bold mb-1 ${isRGV ? 'text-[#1A6B72]' : 'text-[#5C5C54]'}`}>
                        {c.homeValue > 0 ? `$${Math.round(c.homeValue / 1000)}K` : '—'}
                      </div>
                      <div className="text-xs font-semibold text-[#0F0F0E]">{c.name}</div>
                      <div className="text-[10px] text-[#888780] mt-0.5">Median home value</div>
                      {isRGV && c.income > 0 && (
                        <div className="text-[10px] text-[#1A6B72] mt-1 font-medium">
                          {(c.homeValue / c.income).toFixed(1)}× income ratio
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {housing.permits.length > 0 && (
                <div className="bg-[#F7F3EE] rounded-xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">2022 Building Permits (RGV)</div>
                  <div className="flex gap-4">
                    {housing.permits.map(p => (
                      <div key={p.name} className="flex-1 text-center">
                        <div className="font-serif text-2xl font-bold text-[#1A6B72]">{p.buildings.toLocaleString()}</div>
                        <div className="text-xs text-[#5C5C54]">{p.name}</div>
                        <div className="text-[10px] text-[#888780]">{p.units} units</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-[#A8A49E] mt-3">Source: Census ACS 5-Year 2022 estimates · Census Building Permits Survey</p>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { name: 'McAllen',     value: '$164K', ratio: '3.2×', isRGV: true  },
                { name: 'Brownsville', value: '$121K', ratio: '2.8×', isRGV: true  },
                { name: 'Laredo',      value: '$152K', ratio: '3.0×', isRGV: true  },
                { name: 'Austin',      value: '$493K', ratio: '6.2×', isRGV: false },
                { name: 'Dallas',      value: '$318K', ratio: '5.1×', isRGV: false },
                { name: 'Houston',     value: '$231K', ratio: '4.2×', isRGV: false },
              ].map(c => (
                <div key={c.name} className={`rounded-xl p-4 ${c.isRGV ? 'bg-[#E3F0F1]' : 'bg-[#F7F3EE]'}`}>
                  <div className={`font-serif text-xl font-bold mb-1 ${c.isRGV ? 'text-[#1A6B72]' : 'text-[#5C5C54]'}`}>{c.value}</div>
                  <div className="text-xs font-semibold text-[#0F0F0E]">{c.name}</div>
                  {c.isRGV && <div className="text-[10px] text-[#1A6B72] mt-1">{c.ratio} income ratio</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          C. HEALTHCARE & HOSPITAL CAPACITY
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="mt-8 border border-[#E2DDD6] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 bg-[#E4F0EA] border-b border-[#E2DDD6]">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#2A6B43] mb-1">Healthcare · CMS Provider Data</div>
            <h2 className="font-serif text-xl font-bold text-[#0F0F0E]">Healthcare & Hospital Capacity</h2>
            <p className="text-xs text-[#5C5C54] mt-0.5">Hidalgo, Cameron & Webb counties · UTRGV Medical School impact</p>
          </div>
          <span className="text-3xl">🏥</span>
        </div>
        <div className="p-6 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Healthcare GDP',      value: '$9.3B',  sub: 'Share of regional economy',    color: '#2A6B43' },
              { label: 'Hospitals (RGV)',     value: status.hospitals === 'loading' ? '…' : hospitals ? String(hospitals.count) : '23+', sub: 'Hidalgo, Cameron, Webb', color: '#2A6B43' },
              { label: 'Total Beds',          value: status.hospitals === 'loading' ? '…' : hospitals ? hospitals.totalBeds.toLocaleString() : '3,400+', sub: 'Regional hospital capacity', color: '#1A6B72' },
              { label: 'UTRGV Med School',    value: '2016',   sub: 'Established — growing pipeline', color: '#5B3FA6' },
            ].map(s => (
              <div key={s.label} className="bg-[#F7F3EE] rounded-xl p-4">
                <div className="font-serif text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold text-[#0F0F0E]">{s.label}</div>
                <div className="text-[10px] text-[#888780] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F7F3EE] rounded-xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Major Health Systems</div>
              {[
                { name: 'DHR Health System',         city: 'Edinburg', specialty: 'Level I Trauma Center' },
                { name: 'Valley Baptist Medical',    city: 'Harlingen', specialty: 'Regional tertiary care' },
                { name: 'Doctors Hospital at Renaissance', city: 'Edinburg', specialty: 'Multi-specialty' },
                { name: 'Laredo Medical Center',     city: 'Laredo', specialty: 'South TX hub' },
                { name: 'Valley Regional Medical',   city: 'Brownsville', specialty: 'Cameron County' },
              ].map(h => (
                <div key={h.name} className="flex items-start justify-between py-2 border-b border-[#E2DDD6] last:border-0">
                  <div>
                    <div className="text-xs font-semibold text-[#0F0F0E]">{h.name}</div>
                    <div className="text-[10px] text-[#888780]">📍 {h.city}</div>
                  </div>
                  <div className="text-[10px] text-[#2A6B43] font-medium text-right max-w-[100px]">{h.specialty}</div>
                </div>
              ))}
            </div>
            <div className="bg-[#F7F3EE] rounded-xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Healthcare Employment Trend</div>
              <div className="flex items-end gap-1 h-28">
                {[62, 65, 67, 70, 72, 74, 77, 80, 83, 86, 89, 92].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-[#2A6B43]" style={{ height: `${v}%`, opacity: 0.6 + v / 300 }} />
                    {i % 4 === 0 && <span className="text-[8px] text-[#888780]">{['2020','2021','2022','2023'][Math.floor(i/4)]}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold text-[#2A6B43]">↑ Growing sector</span>
                <span className="text-[10px] text-[#888780]">~8% annual growth</span>
              </div>
              <p className="text-[10px] text-[#A8A49E] mt-2">Source: CMS Provider Data · BLS QCEW estimates</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          D. WATER & INFRASTRUCTURE
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="mt-8 border border-[#E2DDD6] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-[#E2DDD6]">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#1A5CB8] mb-1">Water & Infrastructure · USGS</div>
            <h2 className="font-serif text-xl font-bold text-[#0F0F0E]">Rio Grande Flow & Water Availability</h2>
            <p className="text-xs text-[#5C5C54] mt-0.5">Site 08454100 · Critical for agriculture and manufacturing</p>
          </div>
          <span className="text-3xl">💧</span>
        </div>
        <div className="p-6 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#EBF4FF] rounded-xl p-4 sm:col-span-2">
              {status.water === 'loading' ? (
                <div className="h-12 bg-[#E8E4DF] rounded animate-pulse" />
              ) : water ? (
                <>
                  <div className="font-serif text-3xl font-bold text-[#1A5CB8] mb-1">
                    {water.value != null ? `${Math.round(water.value).toLocaleString()} cfs` : '—'}
                  </div>
                  <div className="text-xs font-semibold text-[#0F0F0E]">Current Flow Rate</div>
                  <div className="text-[10px] text-[#888780] mt-0.5">{water.siteName}</div>
                  {water.dateTime && (
                    <div className="text-[10px] text-[#888780]">Updated: {new Date(water.dateTime).toLocaleString()}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-serif text-3xl font-bold text-[#1A5CB8] mb-1">Live</div>
                  <div className="text-xs font-semibold text-[#0F0F0E]">Rio Grande at Laredo</div>
                  <div className="text-[10px] text-[#888780]">USGS gauge 08454100</div>
                </>
              )}
            </div>
            {[
              { label: 'Drought Status',      value: 'Moderate', sub: 'NOAA USDM · South TX',    color: '#B07D1A' },
              { label: 'Water Treaties',      value: '1944',     sub: 'US–Mexico Water Treaty',   color: '#1A6B72' },
            ].map(s => (
              <div key={s.label} className="bg-[#F7F3EE] rounded-xl p-4">
                <div className="font-serif text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold text-[#0F0F0E]">{s.label}</div>
                <div className="text-[10px] text-[#888780] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {water?.trend?.length > 0 && (
            <div className="bg-[#F7F3EE] rounded-xl p-4 mb-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Flow Rate Trend (48-hour)</div>
              <div className="flex items-end gap-0.5 h-20">
                {water.trend.slice(-48).map((d, i) => {
                  const max = Math.max(...water.trend.map(x => x.v), 1)
                  const pct = (d.v / max) * 100
                  return (
                    <div key={i} className="flex-1 bg-[#1A5CB8] rounded-sm transition-all"
                      style={{ height: `${Math.max(pct, 2)}%`, opacity: 0.5 + pct / 200 }} />
                  )
                })}
              </div>
              <p className="text-[10px] text-[#A8A49E] mt-2">Cubic feet per second (cfs) · USGS NWIS Real-Time</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F7F3EE] rounded-xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Critical Infrastructure</div>
              {[
                { name: 'Falcon International Reservoir', note: 'TX–Mexico joint reservoir · 4M acre-ft capacity' },
                { name: 'Amistad Reservoir',              note: 'Del Rio · major upstream storage' },
                { name: 'IBWC Water Division',            note: 'Treaties and allocation management' },
                { name: 'TCEQ Region 15',                 note: 'South TX water quality regulation' },
              ].map(item => (
                <div key={item.name} className="py-2 border-b border-[#E2DDD6] last:border-0">
                  <div className="text-xs font-semibold text-[#0F0F0E]">{item.name}</div>
                  <div className="text-[10px] text-[#888780]">{item.note}</div>
                </div>
              ))}
            </div>
            <div className="bg-[#F7F3EE] rounded-xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-3">Water Use by Sector</div>
              {[
                { sector: 'Agriculture & Irrigation', pct: 68 },
                { sector: 'Municipal / Residential',  pct: 19 },
                { sector: 'Industrial / Manufacturing',pct: 10 },
                { sector: 'Power Generation',          pct: 3  },
              ].map(u => (
                <div key={u.sector} className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] text-[#5C5C54] w-36">{u.sector}</span>
                  <div className="flex-1 h-2 bg-[#E2DDD6] rounded-full overflow-hidden">
                    <div className="h-2 rounded-full bg-[#1A5CB8]" style={{ width: `${u.pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-[#1A5CB8] w-8 text-right">{u.pct}%</span>
                </div>
              ))}
              <p className="text-[10px] text-[#A8A49E] mt-3">Source: TCEQ Water Use Survey · USGS estimates</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          E. SPACEX STARBASE TRACKER
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="mt-8 rounded-2xl overflow-hidden border border-[#34D399]/30" style={{ background: 'linear-gradient(135deg, #0F0F0E 0%, #0d1117 100%)' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#34D399] mb-1">SpaceX · Boca Chica, TX</div>
            <h2 className="font-serif text-xl font-bold text-white">Starbase Economic Tracker</h2>
            <p className="text-xs text-slate-400 mt-0.5">3,000+ jobs · $600M annual economic impact · Cameron County</p>
          </div>
          <div className="text-4xl">🚀</div>
        </div>

        <div className="p-6">
          {/* Economic impact stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Direct Jobs',          value: '3,000+',  sub: 'SpaceX employees',           color: '#34D399' },
              { label: 'Economic Impact',      value: '$600M+',  sub: 'Annual regional impact',     color: '#34D399' },
              { label: 'Induced Jobs',         value: '8,000+',  sub: 'Supply chain & support',    color: '#60A5FA' },
              { label: 'FAA Licenses',         value: '2024+',   sub: 'Launch licenses secured',   color: '#A78BFA' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-4">
                <div className="font-serif text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold text-white">{s.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Next launch + launch history */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 border border-white/8 rounded-xl p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-[#34D399] mb-3">Next Launch</div>
              {status.spacex === 'loading' ? (
                <div className="h-16 bg-white/5 rounded animate-pulse" />
              ) : spacex?.upcoming?.length > 0 ? (
                (() => {
                  const next = spacex.upcoming[0]
                  const diff = next.date_utc ? new Date(next.date_utc) - Date.now() : null
                  const days = diff > 0 ? Math.floor(diff / 86400000) : null
                  return (
                    <>
                      <div className="font-mono text-3xl font-bold text-white mb-1">
                        {days != null ? `T-${days}d` : 'TBD'}
                      </div>
                      <div className="text-xs text-slate-400">{next.name}</div>
                      {next.date_utc && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(next.date_utc).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </>
                  )
                })()
              ) : (
                <div className="font-mono text-3xl font-bold text-white">TBD</div>
              )}
            </div>

            <div className="bg-white/5 border border-white/8 rounded-xl p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-[#34D399] mb-3">Launch History</div>
              <div className="flex items-end gap-2 h-20">
                {STARBASE_LAUNCHES.map(d => (
                  <div key={d.year} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm"
                      style={{
                        height: `${(d.count / 10) * 100}%`,
                        background: d.proj ? 'rgba(52,211,153,.4)' : '#34D399',
                        minHeight: d.count > 0 ? '8px' : '2px',
                      }} />
                    <span className="text-[9px] text-slate-500">{d.year.slice(2)}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{d.count}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-600 mt-1">* 2025 projected · Source: SpaceX API</p>
            </div>
          </div>

          {/* Regional suppliers */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-[#34D399] mb-3">RGV Ecosystem Partners</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARBASE_SUPPLIERS.map(s => (
                <div key={s.name} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-[#34D399] mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white">{s.name}</div>
                    <div className="text-[10px] text-slate-400">📍 {s.location}</div>
                    <div className="text-[10px] text-slate-500">{s.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-600 mt-4 text-center">Source: SpaceX API · Cameron County Economic Development · Texas Gov</p>
        </div>
      </div>

    </div>
  )
}
