import { useState, useEffect } from 'react'
import { fetchBLS } from '../lib/apis'

const TABS = ['Overview', 'Job Demand', 'Certifications', 'Education Pipeline', 'Federal Contracts']

function latestVal(data, id) {
  const s = data?.[id]
  return s?.[0] ? parseFloat(s[0].value) : null
}

function yoy(data, id) {
  const s = data?.[id]
  if (!s || s.length < 13) return null
  const curr = parseFloat(s[0].value)
  const prev = parseFloat(s[12].value)
  return (((curr - prev) / prev) * 100).toFixed(1)
}

function fmtJobs(n) {
  if (!n) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toLocaleString()
}

function fmtAmt(n) {
  if (!n) return '—'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + n.toLocaleString()
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function Workforce() {
  const [tab, setTab] = useState('Overview')
  const [bls, setBls] = useState(null)
  const [blsStatus, setBlsStatus] = useState('loading')
  const [blsPeriod, setBlsPeriod] = useState('')

  useEffect(() => {
    fetchBLS()
      .then(data => {
        setBls(data)
        const first = Object.values(data)[0]
        if (first?.[0]) setBlsPeriod(`${first[0].periodName} ${first[0].year}`)
        setBlsStatus('ok')
      })
      .catch(() => setBlsStatus('error'))
  }, [])

  return (
    <div className="px-4 sm:px-14 py-8 sm:py-12">
      <div className="text-xs font-bold tracking-widest text-[#B8431E] uppercase mb-2 flex items-center gap-2">
        <span className="w-4 h-px bg-[#B8431E]"></span>Talent Pipeline
      </div>

      {/* HEADER: title + BLS badge */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#0F0F0E] mb-2">Workforce Intelligence</h1>
            <p className="text-sm text-[#5C5C54]">Skills gaps, certifications, and career pathways matched to regional employer demand.</p>
          </div>
          {/* BLS badge — visible on desktop only inline; on mobile it falls below */}
          <div className="pb-1 sm:text-right sm:flex-shrink-0">
            {blsStatus === 'loading' && (
              <div className="flex items-center gap-2 text-xs text-[#5C5C54]">
                <div className="w-4 h-4 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
                Loading BLS data...
              </div>
            )}
            {blsStatus === 'ok' && (
              <div className="text-xs text-[#5C5C54] flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#2A6B43] rounded-full"></span>
                BLS data · {blsPeriod}
              </div>
            )}
            {blsStatus === 'error' && (
              <div className="text-xs text-[#B8431E] flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#B8431E] rounded-full"></span>
                BLS offline · showing estimates
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 mb-8">
        <div className="flex gap-0 border-b border-[#E2DDD6] min-w-max px-4 sm:px-0 sm:min-w-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t ? 'text-[#0F0F0E] border-[#0F0F0E]' : 'text-[#5C5C54] border-transparent hover:text-[#0F0F0E]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Overview' && <OverviewTab bls={bls} blsStatus={blsStatus} />}
      {tab === 'Job Demand' && <JobDemandTab bls={bls} blsStatus={blsStatus} />}
      {tab === 'Certifications' && <CertificationsTab />}
      {tab === 'Education Pipeline' && <EducationPipelineTab />}
      {tab === 'Federal Contracts' && <FederalContractsTab />}
    </div>
  )
}

// ─── OVERVIEW TAB ──────────────────────────────────────────────────────────────

function OverviewTab({ bls, blsStatus }) {
  const mcallen = latestVal(bls, 'SMU4832580000000001')
  const laredo = latestVal(bls, 'SMU4829700000000001')
  const brownsville = latestVal(bls, 'SMU4815180000000001')
  const totalEmp = mcallen && laredo && brownsville ? (mcallen + laredo + brownsville) * 1000 : null
  const mcallenUR = latestVal(bls, 'LAUMT482258000000003')
  const laredoUR = latestVal(bls, 'LAUMT482970000000003')
  const live = blsStatus === 'ok'

  const kpis = [
    { val: totalEmp ? fmtJobs(totalEmp) : '612K*', label: 'Total Regional Jobs', sub: live ? 'Live BLS data' : 'Estimate', live },
    { val: '1,775', label: 'Unfilled Positions', sub: 'Across all sectors', live: false },
    { val: '14', label: 'Critical Skill Gaps', sub: 'High-demand occupations', live: false },
    { val: mcallenUR ? mcallenUR.toFixed(1) + '%' : '4.8%*', label: 'McAllen Unemployment', sub: live ? 'BLS LAU series' : 'Estimate', live },
  ]

  const metros = [
    { name: 'McAllen-Edinburg-Mission', emp: mcallen ? fmtJobs(mcallen * 1000) : '~332,000', ur: mcallenUR ? mcallenUR.toFixed(1) + '%' : null, tag: 'Largest MSA', color: '#1A6B72' },
    { name: 'Laredo', emp: laredo ? fmtJobs(laredo * 1000) : '~118,000', ur: laredoUR ? laredoUR.toFixed(1) + '%' : null, tag: 'Trade Hub', color: '#B07D1A' },
    { name: 'Brownsville-Harlingen', emp: brownsville ? fmtJobs(brownsville * 1000) : '~162,000', ur: null, tag: 'Port Region', color: '#B8431E' },
  ]

  const trendData = bls?.['SMU4832580000000001']?.slice(0, 12).reverse() ?? []

  const sectors = [
    { id: 'SMU4832580650000001', label: 'Education & Health', icon: '🏥' },
    { id: 'SMU4832580900000001', label: 'Government', icon: '🏛️' },
    { id: 'SMU4832580400000001', label: 'Trade & Transport', icon: '🚛' },
    { id: 'SMU4832580600000001', label: 'Professional & Biz', icon: '💼' },
    { id: 'SMU4832580300000001', label: 'Manufacturing', icon: '🏭' },
    { id: 'SMU4832580200000001', label: 'Construction', icon: '🏗️' },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
            <div className="flex items-start justify-between mb-1">
              <div className="font-serif text-3xl font-bold text-[#0F0F0E]">{k.val}</div>
              {k.live && <span className="text-xs px-1.5 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-medium">Live</span>}
            </div>
            <div className="text-xs text-[#5C5C54] mt-1">{k.label}</div>
            <div className="text-xs text-[#888780] mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="font-semibold text-sm mb-1">Employment by Metro Area</div>
          <div className="text-xs text-[#5C5C54] mb-5">Total nonfarm employment · BLS State & Metro Series</div>
          <div className="space-y-4">
            {metros.map(m => (
              <div key={m.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 rounded" style={{ background: m.color }}></div>
                  <div>
                    <div className="text-sm font-semibold text-[#0F0F0E]">{m.name}</div>
                    <div className="text-xs text-[#5C5C54]">{m.emp} workers</div>
                  </div>
                </div>
                <div className="text-right">
                  {m.ur && <><div className="text-sm font-bold text-[#0F0F0E]">{m.ur}</div><div className="text-xs text-[#5C5C54]">unemployed</div></>}
                  <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{ background: m.color + '18', color: m.color }}>{m.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="font-semibold text-sm mb-1">McAllen Employment Trend</div>
          <div className="text-xs text-[#5C5C54] mb-4">Total nonfarm employment (thousands) · BLS</div>
          {trendData.length > 0 ? (
            <>
              <div className="h-32 flex items-end gap-1">
                {trendData.map((d, i) => {
                  const val = parseFloat(d.value)
                  const vals = trendData.map(x => parseFloat(x.value))
                  const min = Math.min(...vals), max = Math.max(...vals)
                  const pct = ((val - min) / (max - min || 1)) * 75 + 25
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#1A6B72] rounded-t opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${pct}%` }}></div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-[#888780]">
                <span>{trendData[0]?.periodName?.slice(0, 3)} {trendData[0]?.year}</span>
                <span>{trendData[trendData.length - 1]?.periodName?.slice(0, 3)} {trendData[trendData.length - 1]?.year}</span>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center bg-[#F7F3EE] rounded-lg">
              <div className="text-xs text-[#888780]">{blsStatus === 'loading' ? 'Loading trend data...' : 'Trend chart requires BLS data'}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div className="font-semibold text-sm">Key Sector Employment — McAllen MSA</div>
          {live && <span className="text-xs px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-medium">Live BLS</span>}
        </div>
        <div className="text-xs text-[#5C5C54] mb-5">Current employment by supersector · BLS State & Metro Employment</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {sectors.map(s => {
            const val = latestVal(bls, s.id)
            return (
              <div key={s.id} className="border border-[#E2DDD6] rounded-lg p-4">
                <div className="text-xl mb-2">{s.icon}</div>
                <div className="font-serif text-xl font-bold text-[#0F0F0E]">{val ? fmtJobs(val * 1000) : '—'}</div>
                <div className="text-xs text-[#5C5C54] mt-0.5">{s.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-[#0F0F0E] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-serif text-xl sm:text-2xl font-bold text-white mb-2">Are you a university or EDC?</div>
          <div className="text-sm text-white/50">Full workforce intelligence dashboard with API data, grant-ready reports, and custom program ROI analysis.</div>
        </div>
        <a href="/onboarding" className="sm:flex-shrink-0 sm:ml-8 px-6 py-3 bg-[#1A6B72] text-white rounded-xl font-semibold text-sm hover:bg-[#155960] text-center">
          Learn About Licensing →
        </a>
      </div>
    </div>
  )
}

// ─── JOB DEMAND TAB ────────────────────────────────────────────────────────────

function JobDemandTab({ bls, blsStatus }) {
  const live = blsStatus === 'ok'

  const occupations = [
    { label: 'CDL / Commercial Drivers', gap: 480, wage: '$52K', growth: '+8.2%', sector: 'Logistics', color: '#B8431E' },
    { label: 'Welders & Fabricators', gap: 340, wage: '$48K', growth: '+6.1%', sector: 'Manufacturing', color: '#B8431E' },
    { label: 'IT / Cybersecurity', gap: 290, wage: '$72K', growth: '+15.3%', sector: 'Technology', color: '#B07D1A' },
    { label: 'RNs / Clinical Staff', gap: 180, wage: '$65K', growth: '+11.2%', sector: 'Healthcare', color: '#2A6B43' },
    { label: 'Electricians', gap: 220, wage: '$58K', growth: '+5.8%', sector: 'Construction', color: '#B8431E' },
    { label: 'Pipefitters', gap: 195, wage: '$56K', growth: '+4.9%', sector: 'Energy', color: '#5C5C54' },
    { label: 'Civil Engineers', gap: 140, wage: '$82K', growth: '+9.4%', sector: 'Infrastructure', color: '#B07D1A' },
    { label: 'HVAC Technicians', gap: 110, wage: '$46K', growth: '+4.2%', sector: 'Construction', color: '#5C5C54' },
    { label: 'Customs Brokers', gap: 95, wage: '$54K', growth: '+7.1%', sector: 'Trade', color: '#1A6B72' },
    { label: 'Data Analysts', gap: 85, wage: '$68K', growth: '+18.4%', sector: 'Technology', color: '#B07D1A' },
  ]
  const maxGap = Math.max(...occupations.map(o => o.gap))

  const sectors = [
    { id: 'SMU4832580650000001', label: 'Education & Health', color: '#2A6B43' },
    { id: 'SMU4832580900000001', label: 'Government', color: '#1A6B72' },
    { id: 'SMU4832580400000001', label: 'Trade & Transport', color: '#B07D1A' },
    { id: 'SMU4832580600000001', label: 'Professional & Biz', color: '#B8431E' },
    { id: 'SMU4832580300000001', label: 'Manufacturing', color: '#5C5C54' },
    { id: 'SMU4832580200000001', label: 'Construction', color: '#888780' },
  ]
  const sectorVals = sectors.map(s => latestVal(bls, s.id) || 0)
  const maxSector = Math.max(...sectorVals, 100)

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="font-semibold text-sm mb-1">Top In-Demand Occupations</div>
          <div className="text-xs text-[#5C5C54] mb-5">Estimated unfilled positions across the region</div>
          {occupations.map(o => (
            <div key={o.label} className="flex items-center gap-3 mb-2.5">
              <div className="text-xs text-[#5C5C54] w-40 flex-shrink-0 truncate">{o.label}</div>
              <div className="flex-1 h-4 bg-[#F7F3EE] rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${(o.gap / maxGap) * 100}%`, background: o.color }}></div>
              </div>
              <div className="text-xs font-bold w-8 text-right">{o.gap}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="font-semibold text-sm mb-1">Occupation Details</div>
          <div className="text-xs text-[#5C5C54] mb-5">Wage, growth rate, and sector</div>
          <div className="space-y-1">
            {occupations.map(o => (
              <div key={o.label} className="flex items-center justify-between py-2 border-b border-[#F7F3EE] last:border-0 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#0F0F0E] truncate">{o.label}</div>
                  <div className="text-xs text-[#5C5C54]">{o.sector}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#0F0F0E]">{o.wage}</div>
                    <div className="text-xs text-[#5C5C54]">avg</div>
                  </div>
                  <span className="text-xs font-bold text-[#2A6B43] bg-[#E4F0EA] px-2 py-0.5 rounded">{o.growth}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div className="font-semibold text-sm">Sector Employment — McAllen MSA</div>
          {live && <span className="text-xs px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-medium">Live BLS</span>}
        </div>
        <div className="text-xs text-[#5C5C54] mb-5">Current nonfarm employment by supersector with year-over-year change</div>
        <div className="space-y-3">
          {sectors.map((s, i) => {
            const val = sectorVals[i]
            const change = yoy(bls, s.id)
            return (
              <div key={s.id} className="flex items-center gap-2 sm:gap-4">
                <div className="text-xs text-[#5C5C54] w-28 sm:w-36 flex-shrink-0 truncate">{s.label}</div>
                <div className="flex-1 h-5 bg-[#F7F3EE] rounded overflow-hidden min-w-0">
                  <div className="h-full rounded transition-all" style={{ width: val ? `${(val / maxSector) * 100}%` : '30%', background: s.color, opacity: val ? 1 : 0.25 }}></div>
                </div>
                <div className="text-xs font-bold w-12 sm:w-16 text-right flex-shrink-0">{val ? fmtJobs(val * 1000) : '—'}</div>
                {change && (
                  <div className={`hidden sm:block text-xs font-semibold w-12 text-right flex-shrink-0 ${parseFloat(change) >= 0 ? 'text-[#2A6B43]' : 'text-[#B8431E]'}`}>
                    {parseFloat(change) >= 0 ? '+' : ''}{change}%
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {blsStatus === 'error' && (
          <div className="mt-4 text-xs text-[#888780] bg-[#F7F3EE] rounded-lg p-3">
            BLS API unavailable — employment bars are scaled estimates. Live data will appear when the API is accessible.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Nearshoring Surge', desc: 'Manufacturing migration from Asia to Mexico is driving a +18% YoY increase in demand for production supervisors and quality engineers across the border corridor.', icon: '🏭' },
          { title: 'Digital Skills Gap', desc: 'IT and cybersecurity roles go unfilled for an average of 89 days. CompTIA+ and AWS-certified workers command 35% wage premiums in the region.', icon: '💻' },
          { title: 'Infrastructure Boom', desc: 'SpaceX, LNG terminals, and grid expansion are driving unprecedented demand for licensed electricians, pipefitters, and civil engineers through 2027.', icon: '⚡' },
        ].map(c => (
          <div key={c.title} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
            <div className="text-2xl mb-3">{c.icon}</div>
            <div className="font-semibold text-sm text-[#0F0F0E] mb-2">{c.title}</div>
            <div className="text-xs text-[#5C5C54] leading-relaxed">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CERTIFICATIONS TAB ────────────────────────────────────────────────────────

function CertificationsTab() {
  const certs = [
    { cert: 'CDL Class A', time: '4–6 weeks', salary: '$52K', demand: 'Very High', dc: 'bg-red-50 text-red-700', roi: 'Very High', cost: '$3,500–$7,000', provider: 'Laredo College, STC' },
    { cert: 'AWS Certified Welding', time: '8–12 weeks', salary: '$48K', demand: 'Very High', dc: 'bg-red-50 text-red-700', roi: 'High', cost: '$2,000–$4,000', provider: 'UTRGV, STC' },
    { cert: 'NCCER Electrical', time: '12 weeks', salary: '$55K', demand: 'High', dc: 'bg-orange-50 text-orange-700', roi: 'High', cost: '$1,500–$3,000', provider: 'STC, Laredo College' },
    { cert: 'OSHA 10 / 30', time: '1–2 weeks', salary: '+$8K', demand: 'High', dc: 'bg-orange-50 text-orange-700', roi: 'Very High', cost: '$150–$300', provider: 'Multiple providers' },
    { cert: 'C-TPAT / Customs', time: '2 weeks', salary: '$54K', demand: 'High', dc: 'bg-orange-50 text-orange-700', roi: 'High', cost: '$500–$1,200', provider: 'Laredo College' },
    { cert: 'HVAC EPA 608', time: '6 weeks', salary: '$46K', demand: 'Medium', dc: 'bg-yellow-50 text-yellow-700', roi: 'Medium', cost: '$800–$2,000', provider: 'STC, Laredo' },
    { cert: 'CompTIA Security+', time: '10–14 weeks', salary: '$72K', demand: 'High', dc: 'bg-orange-50 text-orange-700', roi: 'Very High', cost: '$800–$2,000', provider: 'UTRGV, Online' },
    { cert: 'AWS Cloud Practitioner', time: '6–8 weeks', salary: '$68K', demand: 'High', dc: 'bg-orange-50 text-orange-700', roi: 'Very High', cost: '$300–$800', provider: 'Online' },
    { cert: 'PMP Certification', time: '12–16 weeks', salary: '$88K', demand: 'Medium', dc: 'bg-yellow-50 text-yellow-700', roi: 'High', cost: '$500–$1,500', provider: 'UTRGV, PMI' },
    { cert: 'Licensed Electrician (TX)', time: '4 years', salary: '$62K', demand: 'Very High', dc: 'bg-red-50 text-red-700', roi: 'Very High', cost: 'Apprenticeship', provider: 'IBEW Local' },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['$2,100', 'Avg Credential Cost', 'Across fast-track programs'],
          ['94 days', 'Avg Time-to-Hire', 'For certified candidates'],
          ['89%', 'Placement Rate', '6-month post-credential'],
          ['$18K', 'Avg Wage Premium', 'vs. uncredentialed workers'],
        ].map(([val, label, sub]) => (
          <div key={label} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
            <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{val}</div>
            <div className="text-xs text-[#5C5C54] mt-1">{label}</div>
            <div className="text-xs text-[#888780] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="font-semibold text-sm mb-1">Fast-Track Certifications</div>
        <div className="text-xs text-[#5C5C54] mb-5">Highest ROI credentials for regional employers · sorted by demand</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2DDD6]">
                {['Certification', 'Duration', 'Avg Salary', 'Cost', 'Demand', 'ROI', 'Local Provider'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certs.map(c => (
                <tr key={c.cert} className="border-b border-[#F7F3EE] hover:bg-[#FDFCFB]">
                  <td className="py-3 pr-4 font-semibold text-[#0F0F0E]">{c.cert}</td>
                  <td className="py-3 pr-4 text-xs text-[#5C5C54]">{c.time}</td>
                  <td className="py-3 pr-4 font-semibold text-[#0F0F0E]">{c.salary}</td>
                  <td className="py-3 pr-4 text-xs text-[#5C5C54]">{c.cost}</td>
                  <td className="py-3 pr-4"><span className={`text-xs font-bold px-2 py-1 rounded ${c.dc}`}>{c.demand}</span></td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-bold ${c.roi === 'Very High' ? 'text-[#2A6B43]' : c.roi === 'High' ? 'text-[#1A6B72]' : 'text-[#B07D1A]'}`}>{c.roi}</span>
                  </td>
                  <td className="py-3 text-xs text-[#5C5C54]">{c.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'TWC Training Grants', desc: 'Texas Workforce Commission grants cover up to 100% of training costs for qualified workers. Contact Workforce Solutions offices in McAllen, Laredo, or Brownsville.', icon: '💰' },
          { title: 'Industry Apprenticeships', desc: 'Joint apprenticeship programs with local employers provide paid training paths for electrical, pipefitting, and CDL certifications — no upfront cost.', icon: '🤝' },
          { title: 'Stackable Credentials', desc: 'OSHA 10 → OSHA 30 → Safety Manager. CDL Class B → Class A → Tanker Endorsement. Build credential stacks that unlock higher-wage roles progressively.', icon: '📚' },
        ].map(c => (
          <div key={c.title} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
            <div className="text-2xl mb-3">{c.icon}</div>
            <div className="font-semibold text-sm text-[#0F0F0E] mb-2">{c.title}</div>
            <div className="text-xs text-[#5C5C54] leading-relaxed">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── EDUCATION PIPELINE TAB ────────────────────────────────────────────────────

// TEA district data — Texas Education Agency public accountability reports
const TEA_DISTRICTS = [
  { name: 'Edinburg CISD',    county: 'Hidalgo',  enrollment: 32_000, gradRate: 88, collegeReady: 64 },
  { name: 'McAllen ISD',      county: 'Hidalgo',  enrollment: 23_000, gradRate: 93, collegeReady: 71 },
  { name: 'Brownsville ISD',  county: 'Cameron',  enrollment: 46_000, gradRate: 86, collegeReady: 62 },
  { name: 'Laredo ISD',       county: 'Webb',     enrollment: 24_000, gradRate: 87, collegeReady: 58 },
  { name: 'United ISD',       county: 'Webb',     enrollment: 42_000, gradRate: 91, collegeReady: 68 },
  { name: 'PSJA ISD',         county: 'Hidalgo',  enrollment: 32_000, gradRate: 89, collegeReady: 65 },
]

// Census ACS 5-year — % population 25+ with bachelor's degree or higher
const ATTAINMENT = [
  { name: "Hidalgo Co.", pct: 15, color: '#1A6B72', isRGV: true  },
  { name: "Cameron Co.", pct: 17, color: '#B07D1A', isRGV: true  },
  { name: "Webb Co.",    pct: 18, color: '#B8431E', isRGV: true  },
  { name: "Texas",       pct: 32, color: '#5C5C54', isRGV: false },
  { name: "US",          pct: 35, color: '#888780', isRGV: false },
]

// College Scorecard hardcoded fallback — DEMO_KEY is rate-limited; fallback from 2022 data
const SCORECARD_FALLBACK = [
  { id: 228769, name: 'UTRGV',              size: 29_200, gradRate4yr: 0.40, medianDebt: 18_500, earnings10yr: 42_000 },
  { id: 228431, name: 'TAMIU',              size:  8_100, gradRate4yr: 0.38, medianDebt: 16_000, earnings10yr: 41_000 },
  { id: 372423, name: 'South Texas College',size: 34_000, gradRate4yr: null, gradRateLT4yr: 0.22, medianDebt: 8_200, earnings10yr: 35_000 },
]

function EducationPipelineTab() {
  const [scorecard,       setScorecard]       = useState(null)
  const [scorecardStatus, setScorecardStatus] = useState('loading')

  useEffect(() => {
    const ids    = '228769,228431,372423'
    const fields = [
      'id', 'school.name',
      'latest.student.size',
      'latest.completion.completion_rate_4yr_150nt',
      'latest.completion.completion_rate_less_than_4yr_150nt',
      'latest.aid.median_debt.completers.overall',
      'latest.earnings.10_yrs_after_entry.median',
    ].join(',')
    fetch(`https://api.collegescorecard.ed.gov/v1/schools?id=${ids}&fields=${fields}&api_key=DEMO_KEY`)
      .then(r => r.json())
      .then(d => {
        const results = d.results || []
        if (results.length) { setScorecard(results); setScorecardStatus('ok') }
        else setScorecardStatus('error')
      })
      .catch(() => setScorecardStatus('error'))
  }, [])

  const scorecardRows = scorecard ?? SCORECARD_FALLBACK

  const schools = [
    { school: 'UTRGV', location: 'Edinburg / Brownsville', type: 'R2 University', grads: '8,200', programs: ['Engineering', 'Computer Science', 'Business', 'Healthcare', 'Biomedical'], match: '72%', matchColor: 'text-[#B07D1A]', note: 'Only R2 research university in deep South Texas' },
    { school: 'Laredo College', location: 'Laredo, TX', type: 'Community College', grads: '2,100', programs: ['CDL Training', 'Welding', 'HVAC', 'Nursing', 'Customs Ops'], match: '89%', matchColor: 'text-[#2A6B43]', note: 'Highest employer match rate in the region' },
    { school: 'South Texas College', location: 'McAllen, TX', type: 'Community College', grads: '4,800', programs: ['Manufacturing Tech', 'IT', 'Business', 'Allied Health', 'Electrical'], match: '81%', matchColor: 'text-[#2A6B43]', note: "Largest community college by enrollment in RGV" },
    { school: 'Texas A&M International', location: 'Laredo, TX', type: 'University', grads: '1,400', programs: ['International Business', 'Engineering', 'Criminal Justice', 'Psychology'], match: '65%', matchColor: 'text-[#B07D1A]', note: 'Strong international trade and logistics focus' },
    { school: 'UT Health RGV', location: 'McAllen, TX', type: 'Medical School', grads: '320', programs: ['Medicine (MD)', 'Nursing', 'Public Health', 'Pharmacy'], match: '94%', matchColor: 'text-[#2A6B43]', note: 'First medical school in RGV — addresses critical healthcare gap' },
    { school: 'Texas Southmost College', location: 'Brownsville, TX', type: 'Community College', grads: '1,800', programs: ['Welding', 'Cosmetology', 'Automotive', 'Office Tech', 'Nursing Asst'], match: '77%', matchColor: 'text-[#B07D1A]', note: 'Strongest trade & vocational enrollment' },
  ]

  const pipeline = [
    { year: '2021', grads: 14200 },
    { year: '2022', grads: 16100 },
    { year: '2023', grads: 17800 },
    { year: '2024', grads: 18620 },
  ]
  const maxGrads = Math.max(...pipeline.map(p => p.grads))

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['18,620', 'Annual Graduates', 'Across all regional institutions'],
          ['6', 'Partner Institutions', 'University + community college'],
          ['79%', 'Avg Employer Match', 'Programs aligned to demand'],
          ['42%', 'STEM Enrollment', 'STEM + trade programs share'],
        ].map(([val, label, sub]) => (
          <div key={label} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
            <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{val}</div>
            <div className="text-xs text-[#5C5C54] mt-1">{label}</div>
            <div className="text-xs text-[#888780] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="font-semibold text-sm mb-1">Annual Graduate Output — Regional Pipeline</div>
        <div className="text-xs text-[#5C5C54] mb-5">Total graduates from partner institutions</div>
        <div className="h-28 flex items-end gap-8">
          {pipeline.map(p => (
            <div key={p.year} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs font-bold text-[#0F0F0E]">{(p.grads / 1000).toFixed(1)}K</div>
              <div className="w-full bg-[#1A6B72] rounded-t" style={{ height: `${(p.grads / maxGrads) * 72}px` }}></div>
              <div className="text-xs text-[#5C5C54]">{p.year}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {schools.map(s => (
          <div key={s.school} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-serif text-lg font-bold text-[#0F0F0E]">{s.school}</div>
                <div className="text-xs text-[#5C5C54]">📍 {s.location}</div>
              </div>
              <span className="text-xs px-2 py-0.5 bg-[#F7F3EE] border border-[#E2DDD6] rounded text-[#5C5C54] whitespace-nowrap">{s.type}</span>
            </div>
            <div className="text-2xl font-serif font-bold text-[#0F0F0E] mt-3">{s.grads}</div>
            <div className="text-xs text-[#5C5C54] mb-3">Annual graduates</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {s.programs.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 bg-[#F7F3EE] border border-[#E2DDD6] rounded text-[#5C5C54]">{p}</span>
              ))}
            </div>
            <div className="text-xs text-[#888780] italic mb-3">{s.note}</div>
            <div className="flex items-center justify-between pt-2 border-t border-[#E2DDD6]">
              <span className="text-xs text-[#5C5C54]">Employer match rate</span>
              <span className={`text-sm font-bold ${s.matchColor}`}>{s.match}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
        <div className="font-semibold text-sm mb-1">Career Pathway Tracks</div>
        <div className="text-xs text-[#5C5C54] mb-5">High-impact pathways from regional institutions to employer demand</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { track: 'Logistics & Cross-Border Trade', steps: 'CDL Class B (STC) → CDL Class A → C-TPAT → Customs Broker License', outcome: '$62K+ avg salary', time: '6–18 months' },
            { track: 'Industrial Skilled Trades', steps: 'NCCER Core (Laredo College) → Electrical/Pipefitting → Licensed Electrician', outcome: '$58K–$72K avg salary', time: '2–4 years' },
            { track: 'Healthcare & Clinical', steps: 'Allied Health CNA (STC) → LVN → RN (UTRGV) → BSN', outcome: '$48K–$78K avg salary', time: '1–5 years' },
            { track: 'Technology & Cybersecurity', steps: 'CompTIA A+ → Security+ → UTRGV CS degree or AWS certifications', outcome: '$65K–$95K avg salary', time: '1–4 years' },
          ].map(t => (
            <div key={t.track} className="border border-[#E2DDD6] rounded-lg p-4">
              <div className="font-semibold text-sm text-[#0F0F0E] mb-1">{t.track}</div>
              <div className="text-xs text-[#5C5C54] mb-3 leading-relaxed">{t.steps}</div>
              <div className="flex gap-3">
                <span className="text-xs font-bold text-[#2A6B43]">{t.outcome}</span>
                <span className="text-xs text-[#888780]">{t.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Census Education Attainment ── */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mt-4">
        <div className="font-semibold text-sm mb-1">Education Attainment — Bachelor's Degree or Higher</div>
        <div className="text-xs text-[#5C5C54] mb-5">% of population 25+ · Census ACS 5-year estimates</div>
        <div className="space-y-3">
          {ATTAINMENT.map(a => (
            <div key={a.name} className="flex items-center gap-3">
              <div className={`text-xs w-24 flex-shrink-0 font-medium ${a.isRGV ? 'text-[#0F0F0E]' : 'text-[#888780]'}`}>{a.name}</div>
              <div className="flex-1 h-6 bg-[#F7F3EE] rounded overflow-hidden">
                <div className="h-full rounded flex items-center pl-2 transition-all"
                  style={{ width: `${(a.pct / 35) * 100}%`, background: a.color }}>
                  <span className="text-[10px] font-bold text-white">{a.pct}%</span>
                </div>
              </div>
              {a.isRGV && (
                <div className="text-[10px] text-[#B8431E] font-semibold w-16 text-right">
                  {35 - a.pct}pp below US
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#A8A49E] mt-3">Source: US Census Bureau ACS 5-Year Estimates · Table B15003</p>
      </div>

      {/* ── TEA District Data ── */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mt-4">
        <div className="font-semibold text-sm mb-1">K-12 District Data — Texas Education Agency</div>
        <div className="text-xs text-[#5C5C54] mb-4">Enrollment, graduation rate, and college-readiness · TEA Accountability Reports</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2DDD6]">
                {['District', 'County', 'Enrollment', 'Grad Rate', 'College-Ready'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEA_DISTRICTS.map(d => (
                <tr key={d.name} className="border-b border-[#F7F3EE] hover:bg-[#FDFCFB]">
                  <td className="py-3 pr-4 font-semibold text-[#0F0F0E]">{d.name}</td>
                  <td className="py-3 pr-4 text-xs text-[#5C5C54]">{d.county}</td>
                  <td className="py-3 pr-4 font-medium text-[#0F0F0E]">{(d.enrollment / 1000).toFixed(0)}K</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${d.gradRate >= 90 ? 'bg-[#E4F0EA] text-[#2A6B43]' : 'bg-[#FBF4E3] text-[#B07D1A]'}`}>
                      {d.gradRate}%
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-[#F7F3EE] rounded-full overflow-hidden">
                        <div className="h-2 rounded-full bg-[#1A6B72]" style={{ width: `${d.collegeReady}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[#1A6B72]">{d.collegeReady}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[#A8A49E] mt-3">Source: Texas Education Agency · PEIMS enrollment data · 4-year graduation rate</p>
      </div>

      {/* ── College Scorecard ── */}
      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mt-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="font-semibold text-sm">College Scorecard — Regional Universities</div>
            <div className="text-xs text-[#888780] mt-0.5">Student outcomes · US Dept of Education</div>
          </div>
          {scorecardStatus === 'ok' && (
            <span className="text-xs px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-medium">Live</span>
          )}
          {scorecardStatus === 'loading' && (
            <div className="w-3 h-3 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin mt-1" />
          )}
        </div>
        <div className="text-xs text-[#5C5C54] mb-4">Graduation rate · median debt · median earnings 10 yrs after entry</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scorecardRows.map(s => {
            const name     = s.name || s['school.name'] || '—'
            const size     = s.size ?? s['latest.student.size']
            const gr4      = s.gradRate4yr ?? s['latest.completion.completion_rate_4yr_150nt']
            const grLT4    = s.gradRateLT4yr ?? s['latest.completion.completion_rate_less_than_4yr_150nt']
            const gradRate = gr4 ?? grLT4
            const debt     = s.medianDebt ?? s['latest.aid.median_debt.completers.overall']
            const earn     = s.earnings10yr ?? s['latest.earnings.10_yrs_after_entry.median']
            return (
              <div key={s.id} className="border border-[#E2DDD6] rounded-xl p-4">
                <div className="font-semibold text-sm text-[#0F0F0E] mb-3">{name}</div>
                {[
                  { label: 'Enrollment',       val: size    ? `${(size / 1000).toFixed(1)}K students` : '—' },
                  { label: 'Graduation Rate',  val: gradRate ? `${Math.round(gradRate * 100)}%`        : '—' },
                  { label: 'Median Debt',      val: debt    ? `$${(debt / 1000).toFixed(0)}K`         : '—' },
                  { label: 'Earnings (10yr)',  val: earn    ? `$${(earn / 1000).toFixed(0)}K/yr`      : '—' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-[#F7F3EE] last:border-0">
                    <span className="text-xs text-[#5C5C54]">{r.label}</span>
                    <span className="text-xs font-semibold text-[#0F0F0E]">{r.val}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-[#A8A49E] mt-3">
          Source: US Dept of Education College Scorecard API · {scorecardStatus === 'ok' ? 'Live data' : 'Estimated figures'}
        </p>
      </div>
    </div>
  )
}

// ─── FEDERAL CONTRACTS TAB ─────────────────────────────────────────────────────

const USASPENDING_API = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

function FederalContractsTab() {
  const [contracts, setContracts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(USASPENDING_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              award_type_codes: ['A', 'B', 'C', 'D'],
              place_of_performance_locations: [
                { country: 'USA', state: 'TX', city: 'Laredo' },
                { country: 'USA', state: 'TX', city: 'McAllen' },
                { country: 'USA', state: 'TX', city: 'Brownsville' },
                { country: 'USA', state: 'TX', city: 'Edinburg' },
              ],
              time_period: [{ start_date: '2023-01-01', end_date: '2025-12-31' }],
            },
            fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Period of Performance End Date', 'NAICS Description'],
            limit: 15,
            page: 1,
            sort: 'Award Amount',
            order: 'desc',
          })
        })
        const data = await res.json()
        setContracts(data.results || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const staticContracts = [
    { name: 'SpaceX / Boca Chica Launch Site', amount: '$2.89B', agency: 'DoD / NASA', naics: 'Space Vehicle Manufacturing', end: '2027-09-30' },
    { name: 'Cheniere Energy LNG Terminal', amount: '$1.2B', agency: 'DOE', naics: 'Natural Gas Liquefaction', end: '2026-12-31' },
    { name: 'L3Harris Technologies', amount: '$420M', agency: 'DoD', naics: 'Defense Electronics', end: '2026-06-30' },
    { name: 'Zachry Construction Corp.', amount: '$318M', agency: 'CBP / DHS', naics: 'Infrastructure Construction', end: '2025-11-30' },
    { name: 'Dell Technologies', amount: '$240M', agency: 'GSA / DoD', naics: 'Computer Hardware', end: '2026-08-31' },
    { name: 'Hidalgo County Sheriff', amount: '$92M', agency: 'DHS', naics: 'Border Security Services', end: '2025-12-31' },
    { name: 'Laredo Community College', amount: '$48M', agency: 'DoEd', naics: 'Workforce Training', end: '2026-05-31' },
    { name: 'Rio Grande Electric Coop', amount: '$36M', agency: 'USDA RD', naics: 'Electric Power Distribution', end: '2026-03-31' },
  ]

  const agencies = [
    { name: 'DoD / Military', amount: '$4.2B', share: 38, color: '#1A6B72' },
    { name: 'DHS / CBP', amount: '$1.8B', share: 24, color: '#B8431E' },
    { name: 'DOE', amount: '$1.4B', share: 18, color: '#B07D1A' },
    { name: 'GSA / Civilian', amount: '$980M', share: 12, color: '#2A6B43' },
    { name: 'Other', amount: '$620M', share: 8, color: '#888780' },
  ]

  const isLive = contracts?.length > 0

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['$9.3B', 'Active Contract Value', 'South TX region FY2023–2025'],
          ['847', 'Active Awards', 'Federal prime contracts'],
          ['62%', 'Small Biz Share', 'Awards to small business'],
          ['$2.4M', 'Avg Contract Size', 'Among prime awardees'],
        ].map(([val, label, sub]) => (
          <div key={label} className="bg-white border border-[#E2DDD6] rounded-xl p-5">
            <div className="font-serif text-2xl font-bold text-[#0F0F0E]">{val}</div>
            <div className="text-xs text-[#5C5C54] mt-1">{label}</div>
            <div className="text-xs text-[#888780] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="font-semibold text-sm mb-1">Contracts by Federal Agency</div>
          <div className="text-xs text-[#5C5C54] mb-5">Active obligation value by awarding agency</div>
          {agencies.map(a => (
            <div key={a.name} className="flex items-center gap-3 mb-3">
              <div className="text-xs text-[#5C5C54] w-28 flex-shrink-0">{a.name}</div>
              <div className="flex-1 h-5 bg-[#F7F3EE] rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${a.share}%`, background: a.color }}></div>
              </div>
              <div className="text-xs font-bold w-14 text-right">{a.amount}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
          <div className="font-semibold text-sm mb-1">Top Contracting NAICS Codes</div>
          <div className="text-xs text-[#5C5C54] mb-5">Most active sectors for South TX federal awards</div>
          {[
            ['237310', 'Highway / Street Construction', '$1.8B'],
            ['334511', 'Search & Navigation Equipment', '$1.4B'],
            ['336414', 'Guided Missile Manufacturing', '$980M'],
            ['488310', 'Port / Harbor Operations', '$620M'],
            ['541512', 'Computer Systems Design', '$480M'],
            ['561612', 'Security Guard Services', '$195M'],
            ['611691', 'Workforce Training Services', '$210M'],
          ].map(([code, label, amt]) => (
            <div key={code} className="flex items-center justify-between py-2 border-b border-[#F7F3EE] last:border-0">
              <div>
                <div className="text-sm font-semibold text-[#0F0F0E]">{label}</div>
                <div className="text-xs text-[#888780]">NAICS {code}</div>
              </div>
              <div className="text-sm font-bold text-[#0F0F0E]">{amt}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-1">
          <div className="font-semibold text-sm">Recent Contract Awards</div>
          {isLive && <span className="text-xs px-2 py-0.5 bg-[#E4F0EA] text-[#2A6B43] rounded font-medium">USASpending.gov</span>}
        </div>
        <div className="text-xs text-[#5C5C54] mb-5">Federal prime contract awards · South Texas region</div>
        {loading ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-5 h-5 border border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin"></div>
            <span className="text-xs text-[#5C5C54]">Loading USASpending.gov data...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2DDD6]">
                    {['Recipient', 'Amount', 'Agency', 'Sector / NAICS', 'End Date'].map(h => (
                      <th key={h} className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-[#5C5C54]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(isLive ? contracts.slice(0, 12) : staticContracts).map((c, i) => {
                    const name = isLive ? c['Recipient Name'] : c.name
                    const amount = isLive ? fmtAmt(c['Award Amount']) : c.amount
                    const agency = isLive ? c['Awarding Agency'] : c.agency
                    const naics = isLive ? c['NAICS Description'] : c.naics
                    const end = isLive ? c['Period of Performance End Date'] : c.end
                    return (
                      <tr key={i} className="border-b border-[#F7F3EE] hover:bg-[#FDFCFB]">
                        <td className="py-3 pr-4 font-semibold text-[#0F0F0E] max-w-[180px] truncate">{name || '—'}</td>
                        <td className="py-3 pr-4 font-bold text-[#0F0F0E]">{amount}</td>
                        <td className="py-3 pr-4 text-xs text-[#5C5C54]">{agency || '—'}</td>
                        <td className="py-3 pr-4 text-xs text-[#5C5C54]">{naics || '—'}</td>
                        <td className="py-3 text-xs text-[#5C5C54]">{end ? String(end).slice(0, 10) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!isLive && (
              <div className="mt-3 text-xs text-[#888780] bg-[#F7F3EE] rounded-lg p-3">
                {error ? 'USASpending.gov API unavailable — showing regional contract estimates.' : 'Showing representative contract data for the region.'}
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white border border-[#E2DDD6] rounded-xl p-6">
        <div className="font-semibold text-sm mb-1">Government Contracting Certifications</div>
        <div className="text-xs text-[#5C5C54] mb-5">Key certifications for small businesses pursuing federal work in South Texas</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { cert: 'SAM.gov Registration', req: 'Required for all federal contractors', benefit: 'Access to all federal opportunities', color: '#1A6B72' },
            { cert: 'HUBZone Certification', req: 'Business in HUBZone + 35% local hiring', benefit: '10% price preference on federal bids', color: '#2A6B43' },
            { cert: '8(a) Business Development', req: 'Socially/economically disadvantaged', benefit: 'Sole-source contracts up to $4.5M', color: '#B07D1A' },
            { cert: 'SDVOSB', req: 'Service-disabled veteran owner', benefit: '3% contracting goal + set-asides', color: '#B8431E' },
            { cert: 'WOSB Certification', req: 'Women-owned small business', benefit: '5% contracting goal + set-asides', color: '#1A6B72' },
            { cert: 'ISO 9001 / AS9100', req: 'Quality management system', benefit: 'Required for DoD / aerospace work', color: '#5C5C54' },
          ].map(c => (
            <div key={c.cert} className="border border-[#E2DDD6] rounded-lg p-4">
              <div className="font-semibold text-sm mb-1" style={{ color: c.color }}>{c.cert}</div>
              <div className="text-xs text-[#5C5C54] mb-1">{c.req}</div>
              <div className="text-xs font-medium text-[#0F0F0E]">{c.benefit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
