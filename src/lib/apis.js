import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase'

// ─── API keys ─────────────────────────────────────────────────────────────────
// FRED key lives server-side only (Supabase secret FRED_API_KEY).
// Census key is a public API key with no sensitive scope.
export const KEYS = {
  census: '543f503e7e8366c26065cdd212d9f7fd37a5a2e1',
}

const FRED_PROXY = `${SUPABASE_URL}/functions/v1/fred-proxy`

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
  mcallen_ur:      'LAUMT482258000000003',
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
// Real-time crossing wait times — no key required
const SOUTH_TX_TERMS = ['laredo', 'brownsville', 'mcallen', 'hidalgo', 'pharr', 'progreso', 'anzalduas', 'donna', 'rio grande city']

function parseCBPPort(p) {
  const pvl = p.passenger_vehicle_lanes || {}
  const cvl = p.commercial_vehicle_lanes || {}
  const pvStd = pvl.standard_lanes || pvl.NEXUS_SENTRI_lanes || {}
  const cvStd = cvl.standard_lanes || cvl.FAST_lanes || {}
  const name = p.port_name || p.name || ''
  const nl = name.toLowerCase()
  const city = nl.includes('laredo') ? 'Laredo'
    : nl.includes('brownsville') ? 'Brownsville'
    : (nl.includes('hidalgo') || nl.includes('pharr') || nl.includes('anzalduas') || nl.includes('progreso') || nl.includes('donna')) ? 'McAllen'
    : 'South TX'
  return {
    name,
    city,
    hours: p.hours || p.operating_hours || null,
    pvWait: pvStd.delay_minutes != null ? parseInt(pvStd.delay_minutes) : null,
    cvWait: cvStd.delay_minutes != null ? parseInt(cvStd.delay_minutes) : null,
    pvLanes: pvStd.lanes_open ?? null,
    cvLanes: cvStd.lanes_open ?? null,
    updatedAt: pvStd.update_time || cvStd.update_time || p.date || null,
  }
}

export async function fetchBorderWaitTimes() {
  const ckey = 'rd_cbp_v2'
  const cached = getCache(ckey)
  if (cached) return cached
  const res = await fetch('https://bwt.cbp.dhs.gov/api/bwtapi')
  if (!res.ok) throw new Error(`CBP ${res.status}`)
  const all = await res.json()
  const ports = all
    .filter(p => SOUTH_TX_TERMS.some(t => (p.port_name || '').toLowerCase().includes(t)))
    .map(parseCBPPort)
    .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
  setCache(ckey, ports, 15 * 60 * 1000) // 15 minutes
  return ports
}

// ─── BLS API ──────────────────────────────────────────────────────────────────
// State & Metro Employment (SMU series) + LAU Unemployment — no key required
export const BLS_SERIES = {
  mcallen_emp:      'SMU4832580000000001',
  laredo_emp:       'SMU4829700000000001',
  brownsville_emp:  'SMU4815180000000001',
  mcallen_const:    'SMU4832580200000001',
  mcallen_mfg:      'SMU4832580300000001',
  mcallen_trade:    'SMU4832580400000001',
  mcallen_bizsvcs:  'SMU4832580600000001',
  mcallen_edhealth: 'SMU4832580650000001',
  mcallen_govt:     'SMU4832580900000001',
  mcallen_ur:       'LAUMT482258000000003',
  laredo_ur:        'LAUMT482970000000003',
  brownsville_ur:   'LAUMT481518000000003',
}

export async function fetchBLS() {
  const ckey = 'rd_bls_v2'
  const cached = getCache(ckey)
  if (cached) return cached
  const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seriesid: Object.values(BLS_SERIES), startyear: '2022', endyear: '2024' })
  })
  const json = await res.json()
  if (json.status !== 'REQUEST_SUCCEEDED') throw new Error(json.message?.[0] || 'BLS error')
  const mapped = {}
  json.Results.series.forEach(s => { mapped[s.seriesID] = s.data })
  setCache(ckey, mapped, 6 * 60 * 60 * 1000) // 6 hours
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
