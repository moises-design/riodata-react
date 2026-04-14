import { useState } from 'react'
import { Link } from 'react-router-dom'

const TIERS = [
  {
    id: 'explorer',
    name: 'Explorer',
    price: { monthly: 0, annual: 0 },
    badge: null,
    color: '#5C5C54',
    bg: '#F7F3EE',
    cta: 'Get Started Free',
    ctaHref: '/signup',
    ctaStyle: 'border',
    features: [
      'Live analytics dashboard (FRED, Census, BLS, Dallas Fed)',
      'Company directory (269+ companies)',
      'Border wait times',
      'Regional news feed',
      'Basic profile',
    ],
  },
  {
    id: 'operator',
    name: 'Operator',
    price: { monthly: 49, annual: 490 },
    badge: null,
    color: '#1A6B72',
    bg: '#E3F0F1',
    cta: 'Start Free Trial',
    ctaHref: null,
    ctaStyle: 'solid',
    features: [
      'Everything in Explorer',
      'Save & bookmark companies',
      'Watchlist with alerts',
      'Export data to CSV',
      'Company profile listing',
      'Weekly email digest',
      'SpaceX Starbase tracker',
    ],
  },
  {
    id: 'investor',
    name: 'Investor',
    price: { monthly: 149, annual: 1490 },
    badge: 'Most Popular',
    color: '#5B3FA6',
    bg: '#EDE8F8',
    cta: 'Start Free Trial',
    ctaHref: null,
    ctaStyle: 'solid',
    features: [
      'Everything in Operator',
      'Cross-border trade intelligence reports',
      'Maquiladora & FDI deep data',
      'University workforce pipeline',
      'Deal flow — early opportunity access',
      'Downloadable PDF regional reports',
      'Dallas Fed economic briefings',
      'Direct company connect',
    ],
  },
  {
    id: 'strategic',
    name: 'Strategic Partner',
    price: { monthly: 499, annual: 4990 },
    badge: 'Best Value',
    color: '#B07D1A',
    bg: '#FBF4E3',
    cta: 'Contact Us',
    ctaHref: 'mailto:hello@riodata.org',
    ctaStyle: 'outline-gold',
    features: [
      'Everything in Investor',
      'Featured homepage + directory placement',
      'API access to RioData data',
      'Custom sector dashboard',
      'Quarterly video economic briefing',
      'White-label reports for clients',
      'Co-branded regional reports',
      'Logo on RioData site',
      'Direct intro to other Strategic Partners',
    ],
  },
]

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes — Operator and Investor plans include a 14-day free trial, no credit card required. You can explore all features before committing.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel your subscription at any time from your account settings. No cancellation fees, ever.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) and ACH bank transfer for annual plans.' },
  { q: 'What is the Strategic Partner tier?', a: 'Strategic Partners get white-glove treatment — co-branded reports, featured placement, API access, and direct introductions to other regional partners. Contact us to discuss your needs.' },
  { q: 'Do you offer discounts for government or nonprofits?', a: 'Yes. Economic development organizations, municipalities, and nonprofits qualify for discounted rates. Email hello@riodata.org.' },
  { q: 'How is RioData different from RioPlex?', a: 'RioPlex charges $2,500–$25,000/year for networking events. RioData gives you live economic intelligence, 269+ companies, real-time border data, and actionable tools — starting free.' },
]

const ALL_FEATURES = [
  { label: 'Live analytics (FRED, Census, BLS)',  tiers: [true, true, true, true]  },
  { label: 'Company directory (269+)',             tiers: [true, true, true, true]  },
  { label: 'Border wait times',                   tiers: [true, true, true, true]  },
  { label: 'Regional news feed',                  tiers: [true, true, true, true]  },
  { label: 'Basic profile',                       tiers: [true, true, true, true]  },
  { label: 'Save & bookmark companies',           tiers: [false,true, true, true]  },
  { label: 'Watchlist with alerts',               tiers: [false,true, true, true]  },
  { label: 'Export data to CSV',                  tiers: [false,true, true, true]  },
  { label: 'Company profile listing',             tiers: [false,true, true, true]  },
  { label: 'Weekly email digest',                 tiers: [false,true, true, true]  },
  { label: 'SpaceX Starbase tracker',             tiers: [false,true, true, true]  },
  { label: 'Cross-border trade intelligence',     tiers: [false,false,true, true]  },
  { label: 'Maquiladora & FDI deep data',         tiers: [false,false,true, true]  },
  { label: 'University workforce pipeline',       tiers: [false,false,true, true]  },
  { label: 'Deal flow — early opportunity access',tiers: [false,false,true, true]  },
  { label: 'Downloadable PDF regional reports',   tiers: [false,false,true, true]  },
  { label: 'Dallas Fed economic briefings',       tiers: [false,false,true, true]  },
  { label: 'Direct company connect',              tiers: [false,false,true, true]  },
  { label: 'Featured homepage + directory',       tiers: [false,false,false,true]  },
  { label: 'API access to RioData data',          tiers: [false,false,false,true]  },
  { label: 'Custom sector dashboard',             tiers: [false,false,false,true]  },
  { label: 'Quarterly video briefing',            tiers: [false,false,false,true]  },
  { label: 'White-label reports',                 tiers: [false,false,false,true]  },
  { label: 'Logo on RioData site',                tiers: [false,false,false,true]  },
]

export default function Membership() {
  const [annual, setAnnual] = useState(false)
  const [faqOpen, setFaqOpen] = useState(null)

  function price(tier) {
    if (tier.price.monthly === 0) return 'Free'
    const p = annual ? Math.round(tier.price.annual / 12) : tier.price.monthly
    return `$${p}/mo`
  }

  function subPrice(tier) {
    if (tier.price.monthly === 0) return 'Forever free'
    if (annual) return `Billed $${tier.price.annual}/year · Save 2 months`
    return 'Billed monthly'
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB]">

      {/* HERO */}
      <div className="bg-[#0F0F0E] px-6 pt-14 pb-12 text-center">
        <div className="text-xs font-bold tracking-widest text-[#1A6B72] uppercase mb-3">Membership</div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-4 max-w-3xl mx-auto leading-tight">
          Intelligence for the Rio Grande Valley's Next Era
        </h1>
        <p className="text-white/50 text-sm max-w-xl mx-auto mb-8">
          Real economic data, 269+ companies, border intelligence, and opportunity tools — built for everyone from first-time explorers to strategic investors.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 bg-white/8 rounded-full px-4 py-2 border border-white/10">
          <button onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${!annual ? 'bg-white text-[#0F0F0E]' : 'text-white/50 hover:text-white'}`}>
            Monthly
          </button>
          <button onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${annual ? 'bg-white text-[#0F0F0E]' : 'text-white/50 hover:text-white'}`}>
            Annual
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#2A6B43] text-white rounded-full">Save 17%</span>
          </button>
        </div>
      </div>

      {/* TIER CARDS */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map(tier => (
            <div key={tier.id}
              className={`rounded-2xl border flex flex-col relative overflow-hidden ${
                tier.badge === 'Most Popular'
                  ? 'border-[#5B3FA6] shadow-xl shadow-purple-100'
                  : tier.badge === 'Best Value'
                  ? 'border-[#B07D1A] shadow-lg shadow-amber-50'
                  : 'border-[#E2DDD6]'
              } bg-white`}>

              {tier.badge && (
                <div className={`text-center py-1.5 text-[10px] font-bold tracking-widest uppercase ${
                  tier.badge === 'Most Popular' ? 'bg-[#5B3FA6] text-white' : 'bg-[#B07D1A] text-white'
                }`}>
                  {tier.badge}
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: tier.color }}>
                    {tier.id === 'explorer' ? '🔍' : tier.id === 'operator' ? '⚙️' : tier.id === 'investor' ? '💼' : '🌐'}
                  </div>
                  <div className="font-semibold text-sm text-[#0F0F0E]">{tier.name}</div>
                </div>

                <div className="mb-4">
                  <div className="font-serif text-3xl font-bold text-[#0F0F0E]">{price(tier)}</div>
                  <div className="text-xs text-[#888780] mt-0.5">{subPrice(tier)}</div>
                </div>

                <div className="flex flex-col gap-2 mb-6 flex-1">
                  {tier.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#5C5C54]">
                      <span className="text-[#2A6B43] mt-0.5 flex-shrink-0">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {tier.ctaHref ? (
                  <a href={tier.ctaHref}
                    className={`block w-full py-3 rounded-xl text-center text-sm font-semibold transition ${
                      tier.ctaStyle === 'border'
                        ? 'border border-[#E2DDD6] text-[#0F0F0E] hover:border-[#5C5C54]'
                        : tier.ctaStyle === 'outline-gold'
                        ? 'border-2 text-white hover:opacity-90'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={tier.ctaStyle !== 'border' ? { background: tier.color, borderColor: tier.color } : {}}>
                    {tier.cta}
                  </a>
                ) : (
                  <Link to="/signup"
                    className="block w-full py-3 rounded-xl text-center text-sm font-semibold transition text-white hover:opacity-90"
                    style={{ background: tier.color }}>
                    {tier.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Competitor callout */}
        <div className="mt-10 bg-[#0F0F0E] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest text-[#888780] mb-2">Why RioData?</div>
            <p className="text-white text-sm leading-relaxed">
              RioPlex charges <span className="text-[#B8431E] font-bold">$2,500–$25,000/year</span> for networking events.
              RioData gives you live economic intelligence, 269+ companies, real-time border data, and actionable tools —
              <span className="text-[#34D399] font-bold"> starting free.</span>
            </p>
          </div>
          <Link to="/signup"
            className="shrink-0 px-6 py-3 bg-[#1A6B72] text-white rounded-xl text-sm font-semibold hover:bg-[#155960] transition whitespace-nowrap">
            Get Started Free →
          </Link>
        </div>

        {/* Feature comparison table */}
        <div className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-[#0F0F0E] mb-6">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-[#E2DDD6]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F3EE] border-b border-[#E2DDD6]">
                  <th className="text-left px-4 py-3 font-semibold text-[#0F0F0E] w-1/2">Feature</th>
                  {TIERS.map(t => (
                    <th key={t.id} className="text-center px-3 py-3 font-semibold text-xs" style={{ color: t.color }}>
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURES.map((f, i) => (
                  <tr key={i} className={`border-b border-[#F0EDE8] ${i % 2 === 0 ? '' : 'bg-[#FDFCFB]'}`}>
                    <td className="px-4 py-2.5 text-xs text-[#5C5C54]">{f.label}</td>
                    {f.tiers.map((has, ti) => (
                      <td key={ti} className="text-center px-3 py-2.5">
                        {has
                          ? <span className="text-[#2A6B43] text-base">✓</span>
                          : <span className="text-[#D4D0CA] text-base">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="font-serif text-2xl font-bold text-[#0F0F0E] mb-6 text-center">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-[#E2DDD6] rounded-xl overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-[#0F0F0E] hover:bg-[#F7F3EE] transition">
                  {faq.q}
                  <span className={`text-[#1A6B72] text-lg transition-transform duration-200 ${faqOpen === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4 text-sm text-[#5C5C54] leading-relaxed border-t border-[#F0EDE8] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#888780] mb-4">Questions? We're here to help.</p>
          <a href="mailto:hello@riodata.org"
            className="inline-block px-8 py-3 border border-[#1A6B72] text-[#1A6B72] rounded-xl font-semibold text-sm hover:bg-[#E3F0F1] transition">
            Contact Us → hello@riodata.org
          </a>
        </div>
      </div>
    </div>
  )
}
