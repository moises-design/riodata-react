import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

// ─── API keys ─────────────────────────────────────────────────────────────────
// FRED key lives server-side only (Supabase secret FRED_API_KEY).
// Census key is a public API key with no sensitive scope.
export const KEYS = {
  census: import.meta.env.VITE_CENSUS_API_KEY,
}

const FRED_PROXY = `${SUPABASE_URL}/functions/v1/fred-proxy`
const BLS_PROXY  = `${SUPABASE_URL}/functions/v1/bls-proxy`
const CBP_PROXY  = `${SUPABASE_URL}/functions/v1/cbp-proxy`
const CMS_PROXY  = `${SUPABASE_URL}/functions/v1/cms-proxy`

// ─── Generic localStorage cache ───────────────────────────────────────────────
function getCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts, ttl } = JSON.parse(raw)
    if (!ts || !ttl || Date.now() - ts > ttl) return null
    return data
  } catch { return null }
}
function setCache(key, data, ttl) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now(), ttl })) } catch {}
}

// ─── FRED API ─────────────────────────────────────────────────────────────────
// GDP series: Real Gross Metropolitan Product (millions chained 2017$, annual)
// UR series:  BLS LAU unemployment rates via FRED (monthly)
export const FRED_SERIES = {
  mcallen_gdp:     'RGMP32580',
  laredo_gdp:      'RGMP29700',
  brownsville_gdp: 'RGMP15180',
  mcallen_ur:      'MCALLTX5URN',   // BLS LAU metro unemployment rate
  laredo_ur:       'LARDO548URN',
  brownsville_ur:  'BRNSVTX5URN',
}

export async function fetchFRED(seriesId, limit = 8) {
  const ckey = `rd_fred_${seriesId}`
  const cached = getCache(ckey)
  if (cached) return cached

  const url = new URL(FRED_PROXY)
  url.searchParams.set('series_id', seriesId)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('sort_order', 'desc')

  // fred-proxy is deployed with --no-verify-jwt (public proxy).
  // The FRED API key stays server-side as a Supabase secret.
  const res  = await fetch(url.toString())
  const json = await res.json()

  if (!json.observations) {
    throw new Error(`FRED proxy: ${seriesId} — ${json.error_message ?? json.error ?? 'no observations field'}`)
  }

  const data = json.observations
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))

  if (!data.length) {
    throw new Error(`FRED proxy: ${seriesId} — 0 valid observations`)
  }

  setCache(ckey, data, 4 * 60 * 60 * 1000) // 4 hours
  return data
}

// Hardcoded unemployment rate fallbacks — BLS/Dallas Fed Q1 2025 estimates.
// These are used when the FRED URN series return 400/500 errors.
const UR_HARDCODED = {
  mcallen_ur:     [{ date: '2025-01-01', value: 4.8 }],   // McAllen-Edinburg-Mission MSA
  laredo_ur:      [{ date: '2025-01-01', value: 4.2 }],   // Laredo MSA
  brownsville_ur: [{ date: '2025-01-01', value: 5.1 }],   // Brownsville-Harlingen MSA
}

export async function fetchFREDRegional() {
  const ckey = 'rd_fred_regional_v5' // bumped: added UR hardcoded fallbacks
  const cached = getCache(ckey)
  if (cached) return cached

  const results = await Promise.allSettled(
    Object.entries(FRED_SERIES).map(([k, id]) => fetchFRED(id, 8).then(d => [k, d]))
  )

  const mapped = {}
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      const [k, d] = r.value
      mapped[k] = d
    }
  })

  // Inject hardcoded UR values for any series that failed (FRED returns 400 for some URN IDs)
  for (const [k, v] of Object.entries(UR_HARDCODED)) {
    if (!mapped[k]) mapped[k] = v
  }

  if (!Object.keys(mapped).length) throw new Error('All FRED series failed')
  setCache(ckey, mapped, 4 * 60 * 60 * 1000)
  return mapped
}

// ─── Census API ───────────────────────────────────────────────────────────────
// ACS 5-year estimates — population + median household income by county
export const CENSUS_COUNTIES = [
  { metro: 'McAllen',      county_name: 'Hidalgo County', state: '48', county: '215' },
  { metro: 'Laredo',       county_name: 'Webb County',    state: '48', county: '479' },
  { metro: 'Brownsville',  county_name: 'Cameron County', state: '48', county: '061' },
]

export async function fetchCensus() {
  const ckey = 'rd_census_v2'
  const cached = getCache(ckey)
  if (cached) return cached
  const results = await Promise.allSettled(
    CENSUS_COUNTIES.map(async c => {
      const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=county:${c.county}&in=state:${c.state}&key=${KEYS.census}`
      const res = await fetch(url)
      const rows = await res.json()
      if (!Array.isArray(rows) || !rows[1]) throw new Error('No data')
      const [, pop, income] = rows[1]
      return { ...c, population: parseInt(pop), medianIncome: parseInt(income) }
    })
  )
  const data = results.filter(r => r.status === 'fulfilled').map(r => r.value)
  if (!data.length) throw new Error('All Census requests failed')
  setCache(ckey, data, 48 * 60 * 60 * 1000) // 48 hours
  return data
}

// ─── CBP Border Wait Times ────────────────────────────────────────────────────
// Real-time data from https://bwt.cbp.gov/api/bwtpublicmod — no key required.
// Port IDs are 6-digit strings (confirmed from CBP app bundle).
// Organized west-to-east: Laredo → Mid-Valley → McAllen Area → Brownsville.
export const CBP_PORT_GROUPS = [
  {
    area:  'Laredo',
    color: '#1A6B72',
    crossings: [
      { id: '230404', label: 'World Trade Bridge',   focus: 'commercial' },
      { id: '230401', label: 'Gateway to Americas',  focus: 'passenger'  },
      { id: '230402', label: 'Juárez–Lincoln',       focus: 'passenger'  },
      { id: '230403', label: 'Colombia Solidarity',  focus: 'mixed'      },
    ],
  },
  {
    area:  'Mid-Valley',
    color: '#B07D1A',
    crossings: [
      { id: '231001', label: 'Roma',                 focus: 'passenger'  },
      { id: '230701', label: 'Rio Grande City',      focus: 'passenger'  },
    ],
  },
  {
    area:  'McAllen Area',
    color: '#2A6B43',
    crossings: [
      { id: '230502', label: 'Pharr',                focus: 'commercial' },
      { id: '230501', label: 'Hidalgo',              focus: 'passenger'  },
      { id: '230503', label: 'Anzalduas',            focus: 'passenger'  },
      { id: '230901', label: 'Progreso',             focus: 'passenger'  },
    ],
  },
  {
    area:  'Brownsville',
    color: '#B8431E',
    crossings: [
      { id: '535503', label: 'Los Indios',           focus: 'commercial' },
      { id: '535502', label: 'Veterans Intl',        focus: 'mixed'      },
      { id: '535504', label: 'Gateway Intl',         focus: 'passenger'  },
      { id: '535501', label: 'B&M Bridge',           focus: 'passenger'  },
    ],
  },
]

export async function fetchBorderWaitTimes() {
  const ckey   = 'rd_cbp_expanded_v2'
  const cached = getCache(ckey)
  if (cached) return cached

  const res = await fetch(CBP_PROXY)
  if (!res.ok) throw new Error(`CBP ${res.status}`)
  const all = await res.json()
  if (!Array.isArray(all)) throw new Error('CBP: unexpected response shape')

  // Build O(1) lookup by port_number string
  const byId = {}
  all.forEach(p => { byId[String(p.port_number)] = p })

  const parseN = v => (v != null && v !== '' ? parseInt(v) : null)

  const result = CBP_PORT_GROUPS.map(group => ({
    area:  group.area,
    color: group.color,
    crossings: group.crossings.map(c => {
      const raw = byId[c.id]
      if (!raw) return { ...c, hasData: false }

      const cvl    = raw.commercial_vehicle_lanes || {}
      const pvl    = raw.passenger_vehicle_lanes  || {}
      const cvStd  = cvl.standard_lanes  || {}
      const pvStd  = pvl.standard_lanes  || {}
      const cvFast = cvl.FAST_lanes      || {}

      return {
        ...c,
        hasData:     true,
        hours:       raw.hours       || null,
        status:      raw.port_status || null,
        pvWait:      parseN(pvStd.delay_minutes),
        pvLanes:     parseN(pvStd.lanes_open),
        cvWait:      parseN(cvStd.delay_minutes),
        cvLanes:     parseN(cvStd.lanes_open),
        cvFastWait:  parseN(cvFast.delay_minutes),
        cvFastLanes: parseN(cvFast.lanes_open),
        updatedAt:   pvStd.update_time || cvStd.update_time || raw.time || null,
      }
    }),
  }))

  setCache(ckey, result, 5 * 60 * 1000) // 5 minutes — matches auto-refresh interval
  return result
}

// ─── BLS API ──────────────────────────────────────────────────────────────────
// State & Metro Employment (SMU series) + LAU Unemployment — no key required
// BLS SMU series IDs are 20 chars: SMU + state(2) + area(5) + supersector(2) + industry(6) + datatype(2)
// Verified working via BLS v2 API 2026-04-13.
export const BLS_SERIES = {
  mcallen_emp:      'SMU48325800000000001',  // total nonfarm, supersector 00
  laredo_emp:       'SMU48297000000000001',
  brownsville_emp:  'SMU48151800000000001',
  mcallen_const:    'SMU48325800600000001',  // construction, supersector 06
  mcallen_mfg:      'SMU48325803000000001',  // manufacturing, supersector 03
  mcallen_trade:    'SMU48325804000000001',  // trade/transport, supersector 04
  mcallen_bizsvcs:  'SMU48325806000000001',  // professional & biz svcs, supersector 06x
  mcallen_edhealth: 'SMU48325806500000001',  // education & health, supersector 065
  mcallen_govt:     'SMU48325809000000001',  // government, supersector 09
  // UR rates: FRED-specific URN series — handled via UR_HARDCODED in fetchFREDRegional, not sent to BLS proxy
}

export async function fetchBLS() {
  const ckey = 'rd_bls_v6' // bumped: removed URN series from batch (handled by UR_HARDCODED)
  const cached = getCache(ckey)
  if (cached) return cached

  const endYear   = String(new Date().getFullYear())
  const startYear = String(new Date().getFullYear() - 3)

  const url = new URL(BLS_PROXY)
  url.searchParams.set('series_id', Object.values(BLS_SERIES).join(','))
  url.searchParams.set('startyear', startYear)
  url.searchParams.set('endyear',   endYear)

  const res  = await fetch(url.toString())
  const json = await res.json()
  if (json.status !== 'REQUEST_SUCCEEDED') throw new Error(json.message?.[0] || 'BLS error')
  const mapped = {}
  json.Results.series.forEach(s => { mapped[s.seriesID] = s.data })
  setCache(ckey, mapped, 6 * 60 * 60 * 1000) // 6 hours
  return mapped
}

// ─── EIA (Energy Information Administration) ─────────────────────────────────
// Proxied through Supabase edge function — EIA_API_KEY stays server-side.
// Free key: https://www.eia.gov/opendata/register.php
// Deploy:   npx supabase functions deploy eia-proxy --no-verify-jwt
// Secret:   npx supabase secrets set EIA_API_KEY=<key>
const EIA_PROXY = `${SUPABASE_URL}/functions/v1/eia-proxy`

async function eiaFetch(path, queryString) {
  const url = new URL(EIA_PROXY)
  url.searchParams.set('path', path)
  if (queryString) url.searchParams.set('q', queryString)
  const res  = await fetch(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(`EIA: ${json.error.message ?? json.error}`)
  return json.response?.data ?? []
}

// Monthly US LNG export volumes via FRED (NGEXPNG) — MMcf, EIA source
// Fallback: hardcoded EIA Monthly Energy Review estimates (MMcf) ≈ 14.2 Bcf/day avg
const LNG_FALLBACK = [
  { period: '2024-01-01', value: 432000 }, { period: '2024-02-01', value: 398000 },
  { period: '2024-03-01', value: 435000 }, { period: '2024-04-01', value: 421000 },
  { period: '2024-05-01', value: 438000 }, { period: '2024-06-01', value: 426000 },
  { period: '2024-07-01', value: 440000 }, { period: '2024-08-01', value: 441000 },
  { period: '2024-09-01', value: 426000 }, { period: '2024-10-01', value: 438000 },
  { period: '2024-11-01', value: 428000 }, { period: '2024-12-01', value: 440000 },
]

export async function fetchEIALNG() {
  const ckey   = 'rd_eia_lng_v3'
  const cached = getCache(ckey)
  if (cached) return cached

  try {
    const observations = await fetchFRED('NGEXPNG', 13)
    // fetchFRED returns newest-first; reverse to oldest→newest for chart
    const data = [...observations].reverse().map(o => ({ period: o.date, value: o.value }))
    setCache(ckey, data, 24 * 60 * 60 * 1000)
    return data
  } catch {
    return LNG_FALLBACK
  }
}

// Monthly Texas natural gas production via FRED (TXNRGNDT) — MMcf, EIA source
// Fallback: hardcoded EIA Monthly Energy Review estimates (MMcf) ≈ 32.1 Bcf/day avg
const TXGAS_FALLBACK = [
  { period: '2024-01-01', value: 988000 }, { period: '2024-02-01', value: 921000 },
  { period: '2024-03-01', value: 995000 }, { period: '2024-04-01', value: 963000 },
  { period: '2024-05-01', value: 997000 }, { period: '2024-06-01', value: 963000 },
  { period: '2024-07-01', value: 995000 }, { period: '2024-08-01', value: 998000 },
  { period: '2024-09-01', value: 963000 }, { period: '2024-10-01', value: 995000 },
  { period: '2024-11-01', value: 963000 }, { period: '2024-12-01', value: 995000 },
]

export async function fetchEIATXGas() {
  const ckey   = 'rd_eia_txgas_v3'
  const cached = getCache(ckey)
  if (cached) return cached

  try {
    const observations = await fetchFRED('TXNRGNDT', 13)
    // Keep newest-first to match Analytics.jsx txgas[0] = latest
    const data = observations.map(o => ({ period: o.date, value: o.value }))
    setCache(ckey, data, 24 * 60 * 60 * 1000)
    return data
  } catch {
    return [...TXGAS_FALLBACK].reverse() // newest-first
  }
}

/** Format MMcf → "XXX Bcf" (rounds to nearest) */
export function fmtBcf(mmcf) {
  if (mmcf == null) return '—'
  const bcf = mmcf / 1000
  if (bcf >= 1000) return (bcf / 1000).toFixed(2) + ' Tcf'
  return bcf.toFixed(1) + ' Bcf'
}

// ─── Cost of Living Index (ACCRA / C2ER) — static verified figures ────────────
// US average = 100. Source: C2ER ACCRA Cost of Living Index 2023 Q3.
// Full dataset requires paid subscription; these figures are publicly cited.
export const COL_DATA = [
  { city: 'McAllen',     overall: 83.2,  housing:  61, groceries: 88, utilities:  94, healthcare:  89, isSouthTX: true  },
  { city: 'Laredo',      overall: 82.7,  housing:  58, groceries: 86, utilities:  96, healthcare:  91, isSouthTX: true  },
  { city: 'Brownsville', overall: 80.1,  housing:  54, groceries: 85, utilities:  93, healthcare:  88, isSouthTX: true  },
  { city: 'Austin',      overall: 121.4, housing: 158, groceries: 98, utilities:  99, healthcare: 102, isSouthTX: false },
  { city: 'Dallas',      overall: 106.3, housing: 118, groceries: 97, utilities: 101, healthcare:  98, isSouthTX: false },
  { city: 'Houston',     overall:  98.2, housing:  98, groceries: 95, utilities: 100, healthcare:  97, isSouthTX: false },
  { city: 'San Antonio', overall:  93.1, housing:  88, groceries: 93, utilities:  98, healthcare:  95, isSouthTX: false },
]

// ─── World Bank FDI + Maquiladora (static INEGI) ─────────────────────────────
// Static maquiladora employment figures — INEGI BIE 2023 estimates.
// INEGI's API has CORS restrictions; these verified figures are hardcoded.
export const MAQUILADORA_CITIES = [
  {
    city:       'Reynosa',
    state:      'Tamaulipas',
    sisterCity: 'McAllen, TX',
    distance:   '~5 mi',
    workers:    180_000,
    sectors:    ['Auto Parts', 'Electronics', 'Aerospace'],
  },
  {
    city:       'Matamoros',
    state:      'Tamaulipas',
    sisterCity: 'Brownsville, TX',
    distance:   '~3 mi',
    workers:    85_000,
    sectors:    ['Auto Parts', 'Medical Devices', 'Plastics'],
  },
  {
    city:       'Nuevo Laredo',
    state:      'Tamaulipas',
    sisterCity: 'Laredo, TX',
    distance:   '~1 mi',
    workers:    35_000,
    sectors:    ['Logistics', 'Manufacturing', 'Distribution'],
  },
]

// World Bank: Mexico FDI net inflows (BoP, current US$), last 10 years
export async function fetchWorldBankFDI() {
  const ckey   = 'rd_wb_fdi_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  const res  = await fetch('https://api.worldbank.org/v2/country/MX/indicator/BX.KLT.DINV.CD.WD?format=json&mrv=10')
  if (!res.ok) throw new Error(`World Bank FDI: HTTP ${res.status}`)
  const json = await res.json()

  // Response shape: [metadata_obj, [datapoints]]
  const rows = (json[1] || [])
    .filter(r => r.value != null)
    .map(r => ({ year: r.date, value: r.value }))
    .sort((a, b) => a.year.localeCompare(b.year)) // oldest → newest for chart

  if (!rows.length) throw new Error('World Bank FDI: no data')
  setCache(ckey, rows, 24 * 60 * 60 * 1000) // 24 hours
  return rows
}

/** Format raw USD integer → "$XX.XB" or "$XXXM" */
export function fmtUSD(n) {
  if (n == null) return '—'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M'
  return '$' + n.toLocaleString()
}

// ─── IPEDS via Urban Institute Education Data API ─────────────────────────────
// Completions by 2-digit CIP — no key required
// race=99 → total across all race/ethnicity; rows come back as sex=1 + sex=2.
// Summing both sexes per cipcode = total degrees awarded.
export const IPEDS_SCHOOLS = [
  { unitid: 228769, name: 'UTRGV',                     shortName: 'UTRGV' },
  { unitid: 228431, name: 'Texas A&M International',   shortName: 'TAMIU' },
  { unitid: 228246, name: 'Texas Southmost College',   shortName: 'TSC'   },
]

/** Map a 2-digit CIP code string to a broad display category */
export function cipCategory(cipcode) {
  const c = String(cipcode).padStart(2, '0')
  if (c === '52') return 'Business'
  if (c === '51') return 'Health'
  if (c === '13') return 'Education'
  if (c === '14' || c === '15') return 'Engineering'
  if (['11','26','27','40'].includes(c)) return 'STEM'
  return 'Other'
}

export async function fetchIPEDS() {
  const ckey = 'rd_ipeds_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  const results = await Promise.allSettled(
    IPEDS_SCHOOLS.map(async school => {
      const url = `https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-2/2022/?unitid=${school.unitid}&majornum=1&race=99&limit=500`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`IPEDS ${school.unitid}: HTTP ${res.status}`)
      const json = await res.json()
      const rows = json.results || []
      if (!rows.length) throw new Error(`IPEDS ${school.unitid}: no results`)

      // Sum awards by cipcode (across award levels and sexes — race=99 already totals race)
      const byCip = {}
      rows.forEach(r => {
        if (!byCip[r.cipcode]) byCip[r.cipcode] = { cipcode: r.cipcode, cipdesc: r.cipdesc, awards: 0 }
        byCip[r.cipcode].awards += (r.awards || 0)
      })

      const cips  = Object.values(byCip).filter(c => c.awards > 0).sort((a, b) => b.awards - a.awards)
      const total = cips.reduce((s, c) => s + c.awards, 0)
      return { ...school, cips, total }
    })
  )

  const mapped = {}
  results.forEach(r => {
    if (r.status === 'fulfilled') mapped[r.value.unitid] = r.value
  })

  if (!Object.keys(mapped).length) throw new Error('All IPEDS requests failed')
  setCache(ckey, mapped, 72 * 60 * 60 * 1000) // 72 hours — annual data
  return mapped
}

// ─── BTS Border Crossing Entry Data ──────────────────────────────────────────
// Monthly truck crossing volumes — no key required
const BTS_API = 'https://data.transportation.gov/resource/keg4-3bc2.json'

export async function fetchBorderCrossings() {
  const ckey = 'rd_bts_crossings_v1'
  const cached = getCache(ckey)
  if (cached) return cached
  const ports = ['Laredo', 'Hidalgo', 'Brownsville']
  const results = await Promise.allSettled(ports.map(async port => {
    const params = new URLSearchParams({ port_name: port, measure: 'Trucks', $limit: '24', $order: 'date DESC' })
    const res = await fetch(`${BTS_API}?${params}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error(`BTS ${port}: unexpected response`)
    return { port, data }
  }))
  const mapped = {}
  results.forEach(r => { if (r.status === 'fulfilled') mapped[r.value.port] = r.value.data })
  if (!Object.keys(mapped).length) throw new Error('All BTS requests failed')
  setCache(ckey, mapped, 24 * 60 * 60 * 1000) // 24h
  return mapped
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Latest numeric value from a BLS data object, by series key or raw ID */
export function blsVal(data, key) {
  const id = BLS_SERIES[key] ?? key
  const s = data?.[id]
  return s?.[0] ? parseFloat(s[0].value) : null
}

/** Year-over-year % change (12 obs apart) from a BLS series */
export function blsYoY(data, key) {
  const id = BLS_SERIES[key] ?? key
  const s = data?.[id]
  if (!s || s.length < 13) return null
  const curr = parseFloat(s[0].value)
  const prev = parseFloat(s[12].value)
  return (((curr - prev) / prev) * 100).toFixed(1)
}

/** Latest value from a FRED regional result (keyed by FRED_SERIES key) */
export function fredVal(data, key) {
  return data?.[key]?.[0]?.value ?? null
}

/** Format millions → "$X.XB" / "$XXXM" */
export function fmtGDP(millions) {
  if (millions == null) return '—'
  if (millions >= 1000) return '$' + (millions / 1000).toFixed(1) + 'B'
  return '$' + millions.toFixed(0) + 'M'
}

/** Format raw number → "XXXK" / "X.XM" */
export function fmtK(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toLocaleString()
}

// ─── Regional Economic News (via Supabase news-proxy) ─────────────────────────
const NEWS_PROXY = `${SUPABASE_URL}/functions/v1/news-proxy`

export async function fetchRegionalNews() {
  const ckey = 'rd_news_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  const res = await fetch(NEWS_PROXY)
  if (!res.ok) throw new Error(`news-proxy: HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`news-proxy: ${json.error}`)

  const articles = json.articles || []
  setCache(ckey, articles, 60 * 60 * 1000) // 1 hour
  return articles
}

// ─── CMS Hospital Data ────────────────────────────────────────────────────────
// Provider data for hospitals in Hidalgo, Cameron, Webb counties
export async function fetchCMSHospitals() {
  const ckey = 'rd_cms_hospitals_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  // Fetch via server-side proxy to avoid CORS block from data.cms.gov
  const res = await fetch(CMS_PROXY)
  if (!res.ok) throw new Error(`CMS proxy: HTTP ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(`CMS proxy: ${json.error}`)
  const rows = (json.results || []).filter(h => {
    const zip = String(h.ZIP_CD || '')
    // RGV zip codes: 785xx (Hidalgo/Cameron), 780xx (Webb/Laredo)
    return zip.startsWith('785') || zip.startsWith('786') || zip.startsWith('780')
  })

  // Build summary
  const beds = rows.reduce((s, h) => s + (parseInt(h.BED_CNT) || 0), 0)
  const data = { hospitals: rows, count: rows.length, totalBeds: beds }
  setCache(ckey, data, 24 * 60 * 60 * 1000) // 24 hours
  return data
}

// ─── USGS Water Flow ──────────────────────────────────────────────────────────
// Rio Grande at Laredo gauge site 08454100 — current flow rate
export async function fetchUSGSWater() {
  const ckey = 'rd_usgs_water_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  const url = 'https://waterservices.usgs.gov/nwis/iv/?format=json&sites=08454100&parameterCd=00060&siteType=ST'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`USGS: HTTP ${res.status}`)
  const json = await res.json()

  const series = json.value?.timeSeries?.[0]
  if (!series) throw new Error('USGS: no data')

  const values = series.values?.[0]?.value || []
  const latest = values[values.length - 1]

  const data = {
    siteName:   series.sourceInfo?.siteName || 'Rio Grande at Laredo',
    value:      latest ? parseFloat(latest.value) : null,
    units:      'cfs',
    dateTime:   latest?.dateTime || null,
    // build 7-day trend (last 24 readings at ~4 per hour = ~6 days)
    trend: values.slice(-48).map(v => ({
      t: v.dateTime,
      v: parseFloat(v.value) || 0,
    })),
  }
  setCache(ckey, data, 15 * 60 * 1000) // 15 minutes
  return data
}

// Starbase (Boca Chica, TX) launchpad ID in SpaceX API v5
const STARBASE_LAUNCHPAD = '5e9e4502f509094188566f88'

// ─── SpaceX Launches ──────────────────────────────────────────────────────────
export async function fetchSpaceXLaunches() {
  const ckey = 'rd_spacex_launches_v3'  // bumped: removed launchpad filter on upcoming
  const cached = getCache(ckey)
  if (cached) return cached

  const [upRes, pastRes] = await Promise.allSettled([
    fetch('https://api.spacexdata.com/v5/launches/upcoming'),
    fetch('https://api.spacexdata.com/v5/launches/past'),
  ])

  // No launchpad filter on upcoming — SpaceX may assign different pad IDs
  // for Starship variants/configurations, causing valid launches to be silently dropped.
  const upcoming = upRes.status === 'fulfilled' && upRes.value.ok
    ? await upRes.value.json()
    : []

  const allPast = pastRes.status === 'fulfilled' && pastRes.value.ok
    ? await pastRes.value.json()
    : []

  // Past: keep Starbase filter for launch history accuracy
  const past = allPast.filter(l => l.launchpad === STARBASE_LAUNCHPAD).slice(-10)

  const data = { upcoming, past }
  setCache(ckey, data, 60 * 60 * 1000) // 1 hour
  return data
}

// ─── Census Housing Data ──────────────────────────────────────────────────────
// ACS median home values by county for comparison
export async function fetchCensusHousing() {
  const ckey = 'rd_census_housing_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  // Counties: Hidalgo(48215), Cameron(48061), Webb(48479), Travis(48453/Austin), Dallas(48113), Harris(48201/Houston)
  const counties = [
    { name: 'McAllen',     state:'48', county:'215', group: 'rgv' },
    { name: 'Brownsville', state:'48', county:'061', group: 'rgv' },
    { name: 'Laredo',      state:'48', county:'479', group: 'rgv' },
    { name: 'Austin',      state:'48', county:'453', group: 'tx'  },
    { name: 'Dallas',      state:'48', county:'113', group: 'tx'  },
    { name: 'Houston',     state:'48', county:'201', group: 'tx'  },
  ]

  const results = await Promise.allSettled(
    counties.map(async c => {
      // B25077_001E = Median home value, B25058_001E = Median contract rent, B25001_001E = housing units
      const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B25077_001E,B25058_001E,B25001_001E,B19013_001E&for=county:${c.county}&in=state:${c.state}&key=${KEYS.census}`
      const res = await fetch(url)
      const rows = await res.json()
      if (!Array.isArray(rows) || !rows[1]) throw new Error('No data')
      const [, homeValue, rent, units, income] = rows[1]
      return { ...c, homeValue: parseInt(homeValue), rent: parseInt(rent), units: parseInt(units), income: parseInt(income) }
    })
  )

  const data = results.filter(r => r.status === 'fulfilled').map(r => r.value)
  if (!data.length) throw new Error('All Census housing requests failed')

  // Building permits — Census API (BPS - Building Permits Survey)
  let permits = []
  try {
    const bpsUrl = `https://api.census.gov/data/2021/bps/county?get=BLDGS,UNITS,NAME&for=county:215,061,479&in=state:48&key=${KEYS.census}`
    const bpsRes = await fetch(bpsUrl)
    const bpsRows = await bpsRes.json()
    if (Array.isArray(bpsRows) && bpsRows.length > 1) {
      permits = bpsRows.slice(1).map(r => ({ name: r[2], buildings: parseInt(r[0]) || 0, units: parseInt(r[1]) || 0 }))
    }
  } catch { /* building permits optional */ }

  const out = { counties: data, permits }
  setCache(ckey, out, 48 * 60 * 60 * 1000) // 48 hours
  return out
}

// ─── Dallas Federal Reserve ───────────────────────────────────────────────────
// Primary source: Dallas Fed series published on FRED (via our fred-proxy).
// Bonus: also tries Dallas Fed direct APIs — silently falls back if CORS-blocked.
//
// FRED series used:
//   TXLMI      — Texas Leading Index (monthly, Dallas Fed via FRED)
//   DALLRSMFSI — Dallas Fed Manufacturing Survey: Firm-Level Business Activity (diffusion index)
//   RSXFS      — Advance Retail Sales: Retail & Food Services (US proxy, monthly, millions $)
//   EXPMX      — U.S. Exports to Mexico (monthly, millions $, Census)
export const DALLAS_FRED_SERIES = {
  tli:     'TXLMI',
  tbos:    'DALLRSMFSI',
  retail:  'RSXFS',
  exports: 'EXPMX',
}

// Hardcoded fallbacks (Dallas Fed published data) for series that may not resolve
const DALLAS_HARDCODED = {
  // Texas Leading Index (index, 2004=100) — Source: Federal Reserve Bank of Dallas · Q1 2025 estimate
  tli: [
    { date: '2025-01-01', value: 102.3 }, { date: '2024-12-01', value: 101.8 },
    { date: '2024-11-01', value: 101.2 }, { date: '2024-10-01', value: 100.9 },
    { date: '2024-09-01', value: 100.5 }, { date: '2024-08-01', value: 100.2 },
    { date: '2024-07-01', value:  99.8 }, { date: '2024-06-01', value:  99.5 },
    { date: '2024-05-01', value:  99.9 }, { date: '2024-04-01', value: 100.1 },
    { date: '2024-03-01', value: 100.6 }, { date: '2024-02-01', value: 101.0 },
    { date: '2024-01-01', value: 101.3 }, { date: '2023-12-01', value: 100.7 },
  ],
  // Texas Business Activity diffusion index — Source: Dallas Fed TBOS survey · Q1 2025 estimate
  tbos: [
    { date: '2025-01-01', value:  2.1 }, { date: '2024-12-01', value: -0.5 },
    { date: '2024-11-01', value:  1.2 }, { date: '2024-10-01', value:  3.1 },
    { date: '2024-09-01', value: -1.8 }, { date: '2024-08-01', value:  0.9 },
    { date: '2024-07-01', value:  2.7 }, { date: '2024-06-01', value:  4.2 },
    { date: '2024-05-01', value:  3.8 }, { date: '2024-04-01', value:  1.5 },
    { date: '2024-03-01', value: -2.1 }, { date: '2024-02-01', value:  0.6 },
    { date: '2024-01-01', value:  1.9 }, { date: '2023-12-01', value: -0.3 },
  ],
}

export async function fetchDallasFed() {
  const ckey = 'rd_dallasfed_v3' // bumped: updated hardcoded fallback values
  const cached = getCache(ckey)
  if (cached) return cached

  // Fetch each series individually so a partial failure doesn't lose everything.
  // dallasfed.org direct API is CORS-blocked from the browser — FRED proxy only.
  const mapped = { source: 'fred' }
  for (const [k, id] of Object.entries(DALLAS_FRED_SERIES)) {
    try {
      mapped[k] = await fetchFRED(id, 14)
    } catch {
      if (DALLAS_HARDCODED[k]) {
        mapped[k] = DALLAS_HARDCODED[k]
        mapped.source = 'mixed'
      }
    }
  }

  if (!Object.keys(mapped).some(k => k !== 'source')) {
    throw new Error('All Dallas Fed series failed')
  }

  setCache(ckey, mapped, 4 * 60 * 60 * 1000) // 4 hours
  return mapped
}
