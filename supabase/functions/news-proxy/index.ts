// Regional Economic News proxy — fetches Google News RSS server-side (CORS bypass).
// Deploy:  npx supabase functions deploy news-proxy --no-verify-jwt
//
// Returns: { articles: Article[], cachedAt: string }
// Article: { title, url, source, publishedAt, summary, category, lang }
//
// Module-level cache keeps the RSS result for 1 hour so we don't hammer Google.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Module-level 1-hour cache
let _cachedData: Article[] | null = null
let _cachedAt = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface Article {
  title: string
  url: string
  source: string
  publishedAt: string
  summary: string
  category: string
  lang: string
}

// Regional keywords — article must contain at least one (case-insensitive)
const REGIONAL_KW = [
  'mcallen', 'laredo', 'brownsville', 'harlingen', 'rgv', 'rio grande',
  'tamaulipas', 'reynosa', 'matamoros', 'nuevo laredo', 'maquiladora',
  'lng', 'border trade', 'border crossing', 'south texas', 'eagle pass',
  'del rio', 'hidalgo', 'texas mexico', 'mexico border',
]

// Category keyword maps
const CATEGORY_MAP: { cat: string; kw: string[] }[] = [
  { cat: 'energy',        kw: ['lng', 'natural gas', 'energy', 'pipeline', 'oil', 'pemex', 'refinery', 'renewable', 'solar'] },
  { cat: 'manufacturing', kw: ['manufacturing', 'maquiladora', 'factory', 'production', 'automotive', 'aerospace', 'assembly'] },
  { cat: 'realestate',    kw: ['real estate', 'housing', 'construction', 'commercial property', 'development', 'warehouse'] },
  { cat: 'trade',         kw: ['trade', 'import', 'export', 'tariff', 'customs', 'freight', 'logistics', 'port', 'cargo', 'truck'] },
]

function assignCategory(text: string): string {
  const t = text.toLowerCase()
  for (const { cat, kw } of CATEGORY_MAP) {
    if (kw.some(k => t.includes(k))) return cat
  }
  return 'general'
}

function isRegional(text: string): boolean {
  const t = text.toLowerCase()
  return REGIONAL_KW.some(k => t.includes(k))
}

/** Naive XML tag extractor — no external deps needed for RSS */
function getTag(xml: string, tag: string): string {
  const open = `<${tag}`
  const close = `</${tag}>`
  const start = xml.indexOf(open)
  if (start === -1) return ''
  const contentStart = xml.indexOf('>', start) + 1
  const end = xml.indexOf(close, contentStart)
  if (end === -1) return ''
  return xml.slice(contentStart, end).replace(/<!\[CDATA\[|\]\]>/g, '').trim()
}

/** Extract all <item> blocks from an RSS feed string */
function parseItems(xml: string): string[] {
  const items: string[] = []
  let pos = 0
  while (true) {
    const start = xml.indexOf('<item>', pos)
    if (start === -1) break
    const end = xml.indexOf('</item>', start)
    if (end === -1) break
    items.push(xml.slice(start, end + 7))
    pos = end + 7
  }
  return items
}

/** Extract the real URL from Google's redirect link */
function extractUrl(rawLink: string): string {
  // Google wraps links: https://news.google.com/rss/articles/...
  // The actual <link> tag in RSS is usually the canonical URL
  // Try to pull from guid first, then link
  const decoded = rawLink.replace(/&amp;/g, '&')
  return decoded
}

function parseRSS(xml: string, lang: string): Article[] {
  const items = parseItems(xml)
  const articles: Article[] = []

  for (const item of items) {
    const title   = getTag(item, 'title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    const link    = getTag(item, 'link') || getTag(item, 'guid')
    const pubDate = getTag(item, 'pubDate')
    const desc    = getTag(item, 'description').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
    const source  = getTag(item, 'source') || (getTag(item, 'source') ? getTag(item, 'source') : 'News')

    // Source name from <source> tag or fallback parse
    let sourceName = 'Google News'
    const srcMatch = item.match(/<source[^>]*>([^<]+)<\/source>/)
    if (srcMatch) sourceName = srcMatch[1].trim()

    if (!title || !link) continue

    const combined = `${title} ${desc}`
    if (!isRegional(combined)) continue

    let publishedAt = ''
    if (pubDate) {
      try { publishedAt = new Date(pubDate).toISOString() } catch { publishedAt = pubDate }
    }

    articles.push({
      title,
      url:         extractUrl(link),
      source:      sourceName,
      publishedAt,
      summary:     desc.slice(0, 200) || title,
      category:    assignCategory(combined),
      lang,
    })
  }
  return articles
}

const RSS_EN = 'https://news.google.com/rss/search?q=McAllen+OR+Laredo+OR+Brownsville+OR+%22Rio+Grande%22+OR+Tamaulipas+OR+%22border+trade%22+OR+maquiladora+OR+%22South+Texas%22&hl=en-US&gl=US&ceid=US:en'
const RSS_ES = 'https://news.google.com/rss/search?q=McAllen+OR+Laredo+OR+Brownsville+OR+%22Rio+Grande%22+OR+Tamaulipas+OR+Reynosa+OR+Matamoros+OR+maquiladora&hl=es-419&gl=MX&ceid=MX:es-419'

async function fetchAndParse(url: string, lang: string): Promise<Article[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RioData/1.0)' } })
  if (!res.ok) throw new Error(`RSS fetch failed: HTTP ${res.status}`)
  const text = await res.text()
  return parseRSS(text, lang)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // Serve from module cache if fresh
    if (_cachedData && Date.now() - _cachedAt < CACHE_TTL) {
      return new Response(
        JSON.stringify({ articles: _cachedData, cachedAt: new Date(_cachedAt).toISOString() }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch both feeds in parallel; tolerate partial failure
    const [enResult, esResult] = await Promise.allSettled([
      fetchAndParse(RSS_EN, 'en'),
      fetchAndParse(RSS_ES, 'es'),
    ])

    const enArticles = enResult.status === 'fulfilled' ? enResult.value : []
    const esArticles = esResult.status === 'fulfilled' ? esResult.value : []

    if (!enArticles.length && !esArticles.length) {
      throw new Error('Both RSS feeds returned no regional articles')
    }

    // Merge, deduplicate by title similarity, sort newest-first, cap at 30
    const all = [...enArticles, ...esArticles]
    const seen = new Set<string>()
    const deduped: Article[] = []
    for (const a of all) {
      const key = a.title.toLowerCase().slice(0, 60)
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(a)
      }
    }

    deduped.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return tb - ta
    })

    const top30 = deduped.slice(0, 30)

    _cachedData = top30
    _cachedAt = Date.now()

    return new Response(
      JSON.stringify({ articles: top30, cachedAt: new Date(_cachedAt).toISOString() }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
