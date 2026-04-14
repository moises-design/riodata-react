import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

// ─── API keys ─────────────────────────────────────────────────────────────────
// FRED key lives server-side only (Supabase secret FRED_API_KEY).
// Census key is a public API key with no sensitive scope.
export const KEYS = {
  census: '543f503e7e8366c26065cdd212d9f7fd37a5a2e1',
}

const FRED_PROXY = `${SUPABASE_URL}/functions/v1/fred-proxy`
const BLS_PROXY  = `${SUPABASE_URL}/functions/v1/bls-proxy`
const CBP_PROXY  = `${SUPABASE_URL}/functions/v1/cbp-proxy`

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
  mcallen_ur:      'LAUMT483258000000003',  // fixed: 32580 not 22580
  laredo_ur:       'LAUMT482970000000003',
  brownsville_ur:  'LAUMT481518000000003',
}

export async function fetchFRED(seriesId, limit = 8) {
  const ckey = `rd_fred_${seriesId}`
  const cached = getCache(ckey)
  if (cached) {
    console.log(`[FRED] cache hit: ${seriesId} (${cached.length} obs)`)
    return cached
  }

  const url = new URL(FRED_PROXY)
  url.searchParams.set('series_id', seriesId)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('sort_order', 'desc')

  console.log(`[FRED] fetching: ${seriesId}`)
  // fred-proxy is deployed with --no-verify-jwt (public proxy).
  // The FRED API key stays server-side as a Supabase secret.
  const res = await fetch(url.toString())
  const json = await res.json()
  console.log(`[FRED] response for ${seriesId} (HTTP ${res.status}):`, json)

  if (!json.observations) {
    console.error(`[FRED] no observations for ${seriesId}:`, json)
    throw new Error(`FRED proxy: ${seriesId} — ${json.error_message ?? json.error ?? 'no observations field'}`)
  }

  const data = json.observations
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
  console.log(`[FRED] parsed ${seriesId}: ${data.length} valid observations, latest: ${data[0]?.date} = ${data[0]?.value}`)

  if (!data.length) {
    console.warn(`[FRED] ${seriesId} returned 0 non-missing observations — series may not exist or have no data`)
    throw new Error(`FRED proxy: ${seriesId} — 0 valid observations`)
  }

  setCache(ckey, data, 4 * 60 * 60 * 1000) // 4 hours
  return data
}

export async function fetchFREDRegional() {
  const ckey = 'rd_fred_regional_v3' // bumped: RGMP10530 → RGMP32580
  const cached = getCache(ckey)
  if (cached) {
    console.log('[FRED] regional cache hit, keys:', Object.keys(cached))
    return cached
  }

  const results = await Promise.allSettled(
    Object.entries(FRED_SERIES).map(([k, id]) => fetchFRED(id, 8).then(d => [k, d]))
  )

  const mapped = {}
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      const [k, d] = r.value
      mapped[k] = d
    } else {
      console.error('[FRED] series failed:', r.reason?.message)
    }
  })

  console.log('[FRED] fetchFREDRegional result — succeeded:', Object.keys(mapped), '| failed:', results.filter(r => r.status === 'rejected').length)

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
  if (cached) {
    console.log('[CBP] cache hit, crossings:', cached.flatMap(g => g.crossings).length)
    return cached
  }

  console.log('[CBP] fetching from proxy:', CBP_PROXY)
  const res = await fetch(CBP_PROXY)
  console.log('[CBP] proxy response status:', res.status, res.ok)
  if (!res.ok) throw new Error(`CBP ${res.status}`)
  const all = await res.json()
  console.log('[CBP] raw records:', Array.isArray(all) ? all.length : typeof all,
    '— sample port_numbers:', Array.isArray(all) ? all.slice(0,3).map(p => p.port_number) : all)
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
  mcallen_ur:       'LAUMT483258000000003',  // fixed: 32580 not 22580
  laredo_ur:        'LAUMT482970000000003',
  brownsville_ur:   'LAUMT481518000000003',
}

export async function fetchBLS() {
  const ckey = 'rd_bls_v4'
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

// Monthly US LNG export volumes — all terminals, last 12 months
export async function fetchEIALNG() {
  const ckey   = 'rd_eia_lng_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  const rows = await eiaFetch(
    'natural-gas/move/lngexports/data/',
    'frequency=monthly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=48',
  )

  // EIA returns one row per terminal per period — aggregate to US monthly total.
  // Exclude any summary row (duoarea === "NUS") to avoid double-counting if present.
  const hasSummary = rows.some(r => r.duoarea === 'NUS')
  const source     = hasSummary ? rows.filter(r => r.duoarea === 'NUS') : rows

  const byPeriod = {}
  source.forEach(r => {
    if (!byPeriod[r.period]) byPeriod[r.period] = { period: r.period, value: 0, units: r.units ?? 'MMcf' }
    byPeriod[r.period].value += (parseFloat(r.value) || 0)
  })

  const data = Object.values(byPeriod)
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 12)
    .reverse() // oldest → newest for chart

  setCache(ckey, data, 24 * 60 * 60 * 1000) // 24 hours
  return data
}

// Monthly Texas dry natural gas production (MMcf)
export async function fetchEIATXGas() {
  const ckey   = 'rd_eia_txgas_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  const rows = await eiaFetch(
    'natural-gas/prod/sum/data/',
    'frequency=monthly&data[0]=value&facets[duoarea][]=STX&sort[0][column]=period&sort[0][direction]=desc&length=12',
  )

  const data = rows.map(r => ({ period: r.period, value: parseFloat(r.value) || 0, units: r.units ?? 'MMcf' }))
  setCache(ckey, data, 24 * 60 * 60 * 1000)
  return data
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
    else console.error('[IPEDS] failed:', r.reason?.message)
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

// ─── Dallas Federal Reserve ───────────────────────────────────────────────────
// Primary source: Dallas Fed series published on FRED (via our fred-proxy).
// Bonus: also tries Dallas Fed direct APIs — silently falls back if CORS-blocked.
//
// FRED series used:
//   TEXLEAD   — Texas Leading Index (monthly, Dallas Fed via FRED)
//   DALTBSOI  — Texas Business Activity Index (monthly diffusion, Dallas Fed TBOS)
//   TXRSALES  — Texas Total Retail Sales (monthly, Census/State)
//   EXPMX     — U.S. Exports to Mexico (monthly, millions $, Census)
export const DALLAS_FRED_SERIES = {
  tli:     'TEXLEAD',
  tbos:    'DALTBSOI',
  retail:  'TXRSALES',
  exports: 'EXPMX',
}

export async function fetchDallasFed() {
  const ckey = 'rd_dallasfed_v1'
  const cached = getCache(ckey)
  if (cached) return cached

  // Fetch all four FRED series through our proxy (reliable)
  const fredResults = await Promise.allSettled(
    Object.entries(DALLAS_FRED_SERIES).map(([k, id]) =>
      fetchFRED(id, 14).then(d => ({ key: k, data: d }))
    )
  )

  const mapped = { source: 'fred' }
  fredResults.forEach(r => {
    if (r.status === 'fulfilled') mapped[r.value.key] = r.value.data
    else console.warn('[DallasFed] FRED series failed:', r.reason?.message)
  })

  if (!Object.keys(mapped).some(k => k !== 'source')) {
    throw new Error('All Dallas Fed series failed')
  }

  // Bonus: try Dallas Fed direct TLI API (public, no auth).
  // May be CORS-blocked in the browser — silently fall back to FRED data.
  try {
    const ac = new AbortController()
    const t  = setTimeout(() => ac.abort(), 4000)
    const res = await fetch('https://www.dallasfed.org/api/tli/latest', { signal: ac.signal })
    clearTimeout(t)
    if (res.ok) {
      const json = await res.json()
      const rows = (json?.data ?? json?.Results ?? []).filter(r => r.value != null)
      if (rows.length >= 6) {
        // Normalize to same shape as FRED observations (newest-first)
        const sorted = [...rows].sort((a, b) =>
          (b.date || b.period || '').localeCompare(a.date || a.period || '')
        )
        mapped.tli    = sorted.slice(0, 14).map(r => ({
          date:  r.date || r.period || '',
          value: parseFloat(r.value),
        }))
        mapped.source = 'dallas_fed'
        console.log('[DallasFed] TLI from direct API:', mapped.tli.length, 'obs')
      }
    }
  } catch (e) {
    console.log('[DallasFed] direct API unavailable (expected if CORS-blocked):', e.message)
  }

  setCache(ckey, mapped, 4 * 60 * 60 * 1000) // 4 hours
  return mapped
}
