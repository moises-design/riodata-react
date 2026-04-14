import { useState, useEffect } from 'react'
import {
  fetchFREDRegional, fetchCensus, fetchBorderWaitTimes, fetchBLS,
  BLS_SERIES, blsVal, blsYoY, fredVal, fmtGDP, fmtK,
} from '../lib/apis'

// CBP static fallback — shown when API is unreachable
const CBP_STATIC = [
  { name: 'Laredo I (Convent St)', city: 'Laredo', pvWait: 25, cvWait: null, hours: '0700-2300' },
  { name: 'World Trade Bridge', city: 'Laredo', pvWait: null, cvWait: 55, hours: '24 hours' },
  { name: 'Lincoln-Juárez International', city: 'Laredo', pvWait: 20, cvWait: null, hours: '0600-2400' },
  { name: 'Veterans International Bridge', city: 'Brownsville', pvWait: 35, cvWait: 50, hours: '0700-2400' },
  { name: 'Gateway International Bridge', city: 'Brownsville', pvWait: 20, cvWait: 40, hours: '0700-2200' },
  { name: 'Pharr-Reynosa Int\'l Bridge', city: 'McAllen', pvWait: 30, cvWait: 35, hours: '0600-2400' },
]

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

// ─── MAIN ──────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [fred,   setFred]   = useState(null)
  const [census, setCensus] = useState(null)
  const [cbp,    setCbp]    = useState(null)
  const [bls,    setBls]    = useState(null)
  const [status, setStatus] = useState({ fred: 'loading', census: 'loading', cbp: 'loading', bls: 'loading' })

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

  const cbpData = cbp?.length ? cbp : CBP_STATIC
  const cbpLive  = !!(cbp?.length)

  return (
    <div className="px-14 py-12">

      {/* HEADER */}
      <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-2 flex items-center gap-2">
        <span className="w-4 h-px bg-[#B8431E]"></span>Regional Intelligence
      </div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-5xl font-bold tracking-tight text-[#0F0F0E] mb-2">Analytics</h1>
          <p className="text-sm text-[#5C5C54]">Live economic data for the South Texas + Northern Mexico corridor.</p>
        </div>
        <div className="flex items-center gap-4 pb-1">
          {[
            { label: 'FRED',   key: 'fred'   },
            { label: 'Census', key: 'census' },
            { label: 'CBP',    key: 'cbp'    },
            { label: 'BLS',    key: 'bls'    },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
              <StatusDot s={status[key]} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
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
          <div key={k.label} className="bg-white border border-[#E2DDD6] rounded-xl p-4">
            <div className="flex items-start justify-between mb-0.5">
              <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{k.val}</div>
              {k.live && <LiveBadge />}
            </div>
            <div className="text-xs text-[#5C5C54] mt-1">{k.label}</div>
            <div className="text-xs text-[#888780] mt-0.5">{k.sub}</div>
          </div>
        ))}
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
              <div className="flex items-center gap-2 text-xs text-[#888780]">
                {status.fred === 'loading' && <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>}
                {status.fred === 'loading' ? 'Loading FRED data...' : 'FRED offline · chart unavailable'}
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

      {/* CBP BORDER WAIT TIMES */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div className="font-semibold text-sm">Border Crossing Wait Times</div>
          <div className="flex items-center gap-2">
            {cbpLive && <LiveBadge />}
            {!cbpLive && status.cbp === 'error' && <span className="text-xs text-[#888780]">Showing estimates</span>}
            {status.cbp === 'loading' && (
              <div className="flex items-center gap-1.5 text-xs text-[#5C5C54]">
                <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
                Loading CBP...
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-[#5C5C54] mb-5">
          South Texas ports of entry · {cbpLive ? 'Real-time' : 'Estimated'} passenger & commercial vehicle wait times
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2DDD6]">
                {['Crossing', 'City', 'Passenger Wait', 'Commercial Wait', 'Hours'].map(h => (
                  <th key={h} className="text-left py-2 pr-6 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cbpData.map((p, i) => (
                <tr key={i} className="border-b border-[#F7F3EE]">
                  <td className="py-3 pr-6 font-semibold text-[#0F0F0E]">{p.name}</td>
                  <td className="py-3 pr-6 text-sm text-[#5C5C54]">{p.city}</td>
                  <td className="py-3 pr-6">
                    {p.pvWait != null
                      ? <span className={`text-xs font-bold px-2 py-1 rounded ${waitBadge(p.pvWait)}`}>{p.pvWait} min</span>
                      : <span className="text-xs text-[#888780]">—</span>}
                  </td>
                  <td className="py-3 pr-6">
                    {p.cvWait != null
                      ? <span className={`text-xs font-bold px-2 py-1 rounded ${waitBadge(p.cvWait)}`}>{p.cvWait} min</span>
                      : <span className="text-xs text-[#888780]">—</span>}
                  </td>
                  <td className="py-3 text-xs text-[#5C5C54]">{p.hours || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cbpLive && cbpData[0]?.updatedAt && (
          <div className="mt-3 text-xs text-[#888780]">Last updated: {cbpData[0].updatedAt}</div>
        )}
        <div className="mt-3 flex gap-4">
          {[['≤15 min','bg-[#E4F0EA] text-[#2A6B43]'],['16–30 min','bg-[#FBF4E3] text-[#B07D1A]'],['>30 min','bg-[#FBE9E3] text-[#B8431E]']].map(([l,c])=>(
            <span key={l} className={`text-xs font-semibold px-2 py-0.5 rounded ${c}`}>{l}</span>
          ))}
        </div>
      </div>

      {/* CROSS-BORDER TRADE TABLE */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
        <div className="font-semibold text-sm mb-1">Cross-Border Trade Intelligence</div>
        <div className="text-xs text-[#5C5C54] mb-4">South Texas ports of entry · Monthly volume</div>
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

    </div>
  )
}
