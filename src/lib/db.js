import { sb } from './supabase'

// ─── Activity (fire-and-forget — never blocks UI) ─────────────────────────────
export function logActivity(userId, action, detail, itemId = null) {
  if (!userId) return
  sb.from('user_activity')
    .insert({ user_id: userId, action, detail, ...(itemId ? { item_id: itemId } : {}) })
    .then(() => {}).catch(() => {})
}

export async function fetchActivity(userId, limit = 5) {
  const { data } = await sb
    .from('user_activity').select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit)
  return data || []
}

// ─── Saved Companies ───────────────────────────────────────────────────────────
export async function fetchSavedCompanies(userId) {
  const { data: rows } = await sb
    .from('saved_companies').select('company_id, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false })
  if (!rows?.length) return []
  const ids = rows.map(r => r.company_id)
  const { data: cos } = await sb
    .from('companies')
    .select('id, legal_name, city, state_province, country, sector, ready_to_work')
    .in('id', ids)
  const atMap = Object.fromEntries(rows.map(r => [r.company_id, r.created_at]))
  return (cos || []).map(c => ({ ...c, savedAt: atMap[c.id] }))
}

export async function fetchSavedIds(userId) {
  if (!userId) return new Set()
  const { data } = await sb.from('saved_companies').select('company_id').eq('user_id', userId)
  return new Set((data || []).map(r => r.company_id))
}

export async function saveCompany(userId, companyId) {
  const { error } = await sb.from('saved_companies').insert({ user_id: userId, company_id: companyId })
  return !error
}

export async function unsaveCompany(userId, companyId) {
  await sb.from('saved_companies').delete().eq('user_id', userId).eq('company_id', companyId)
}

// ─── Watchlist ─────────────────────────────────────────────────────────────────
export async function fetchWatchlist(userId) {
  const { data } = await sb
    .from('watchlist').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false })
  return data || []
}

export async function fetchWatchIds(userId) {
  if (!userId) return new Set()
  const { data } = await sb.from('watchlist').select('item_type, item_id').eq('user_id', userId)
  return new Set((data || []).map(r => `${r.item_type}:${r.item_id}`))
}

export async function addWatch(userId, itemType, itemId, itemTitle) {
  const { error } = await sb.from('watchlist')
    .insert({ user_id: userId, item_type: itemType, item_id: String(itemId), item_title: itemTitle })
  return !error
}

export async function removeWatch(userId, itemType, itemId) {
  await sb.from('watchlist').delete()
    .eq('user_id', userId).eq('item_type', itemType).eq('item_id', String(itemId))
}

// ─── Profile ───────────────────────────────────────────────────────────────────
export async function upsertProfile(userId, updates) {
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select().single()
  if (error) throw error
  return data
}

// ─── Onboarding steps ──────────────────────────────────────────────────────────
export function calcSteps(user, profile, company, savedCount, watchOppCount) {
  return [
    { id: 'email',    label: 'Verify your email',      done: !!user?.email_confirmed_at,                href: null           },
    { id: 'profile',  label: 'Complete your profile',  done: !!(profile?.full_name && profile?.sector), href: '/profile'     },
    { id: 'business', label: 'Register your business', done: !!company,                                 href: '/onboarding'  },
    { id: 'save',     label: 'Save a company',         done: savedCount > 0,                            href: '/directory'   },
    { id: 'watch',    label: 'Follow an opportunity',  done: watchOppCount > 0,                         href: '/opportunities'},
  ]
}

// ─── Role config ───────────────────────────────────────────────────────────────
export const ROLES = {
  business_owner:     { label: 'Business Owner',   color: 'bg-[#E3F0F1] text-[#1A6B72]', icon: '🏢' },
  investor:           { label: 'Investor',          color: 'bg-[#EDE8F8] text-[#5B3FA6]', icon: '💼' },
  economic_developer: { label: 'Econ. Developer',  color: 'bg-[#FBF4E3] text-[#B07D1A]', icon: '📈' },
  government:         { label: 'Government',        color: 'bg-[#E4F0EA] text-[#2A6B43]', icon: '🏛️' },
  student_researcher: { label: 'Researcher',        color: 'bg-[#F2E8E3] text-[#B8431E]', icon: '🎓' },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function timeAgo(iso) {
  if (!iso) return ''
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60e3)    return 'just now'
  if (d < 3600e3)  return `${Math.floor(d / 60e3)}m ago`
  if (d < 86400e3) return `${Math.floor(d / 3600e3)}h ago`
  return `${Math.floor(d / 86400e3)}d ago`
}

export const ACTIVITY_CONFIG = {
  saved_company:       { icon: '🔖', label: 'Saved'           },
  unsaved_company:     { icon: '🗑️', label: 'Removed'         },
  viewed_company:      { icon: '👁️', label: 'Viewed'          },
  watched_company:     { icon: '⭐',  label: 'Watching'        },
  watched_opportunity: { icon: '⭐',  label: 'Following'       },
  updated_profile:     { icon: '✏️',  label: 'Updated profile' },
}

// Sector-specific snapshot content shown on Dashboard
export const SECTOR_SNAPSHOT = {
  Construction: {
    title: 'Construction Sector',
    items: [
      { icon: '🏗️', label: 'Active Pipeline',    value: '$3.2B',   sub: 'Regional construction projects' },
      { icon: '👷', label: 'Sector Employment',  value: '~28K',    sub: 'South Texas est. 2024' },
      { icon: '📋', label: 'Open Opportunities', value: 'View →',  href: '/opportunities' },
    ],
  },
  Energy: {
    title: 'Energy Sector',
    items: [
      { icon: '⚡', label: 'LNG Pipeline',      value: '$4.2B',   sub: 'Active energy projects' },
      { icon: '🛢️', label: 'Port of Brownsville', value: 'LNG Hub', sub: 'Phase 3 underway' },
      { icon: '📊', label: 'Energy Analytics',  value: 'View →',  href: '/analytics' },
    ],
  },
  Manufacturing: {
    title: 'Manufacturing Sector',
    items: [
      { icon: '🏭', label: 'Maquiladora Workers', value: '300K+',  sub: 'Tamaulipas border 2024' },
      { icon: '🔩', label: 'Nearshoring Activity', value: 'Growing', sub: 'New investment 2024' },
      { icon: '🔍', label: 'Find Suppliers',        value: 'View →', href: '/directory' },
    ],
  },
  Logistics: {
    title: 'Logistics Sector',
    items: [
      { icon: '🚛', label: 'Laredo Trucks/mo',   value: '155K+',  sub: 'BTS latest month' },
      { icon: '🚗', label: 'Border Wait Times',  value: 'Live →', href: '/analytics' },
      { icon: '📦', label: 'US–MX Exports',      value: '$30B+',  sub: 'Monthly via EXPMX' },
    ],
  },
  Technology: {
    title: 'Technology Sector',
    items: [
      { icon: '🚀', label: 'Starbase Impact',     value: '$600M+', sub: 'Annual economic impact' },
      { icon: '💻', label: 'Data Centers',        value: '$180M',  sub: 'RGV project pipeline' },
      { icon: '🎓', label: 'UTRGV STEM Grads',    value: 'View →', href: '/analytics' },
    ],
  },
}
