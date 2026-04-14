import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // CMS Provider of Services — hospitals in Texas
    // Filtered server-side to TX general short-term hospitals (PRVDR_CTGRY_SBTYP_CD=01)
    const url =
      'https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0' +
      '?limit=500&filter[STATE]=TX&filter[PRVDR_CTGRY_SBTYP_CD]=01'

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      throw new Error(`CMS upstream: HTTP ${res.status}`)
    }

    const json = await res.json()

    // Filter to RGV / Laredo counties by ZIP prefix server-side
    //   78xxx  = South Texas / RGV
    //   785xx  = Hidalgo County (McAllen area)
    //   786xx  = Cameron County (Brownsville area)
    //   780xx  = Webb County (Laredo)
    const rows = (json.results || []).filter((h: Record<string, string>) => {
      const zip = String(h.ZIP_CD || '')
      return zip.startsWith('785') || zip.startsWith('786') || zip.startsWith('780')
    })

    return new Response(
      JSON.stringify({ results: rows, total: rows.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
