// BLS API proxy — keeps the API key server-side.
// Deploy:  npx supabase functions deploy bls-proxy --no-verify-jwt
// Secret:  npx supabase secrets set BLS_API_KEY=<your_key>
//          (Free key: https://www.bls.gov/developers/home.htm)
//
// Without a key: 25 queries/day per IP.
// With a key:    500 queries/day per IP + net_changes / pct_changes fields.
//
// Client sends:  GET ?series_id=<comma-separated>&startyear=YYYY&endyear=YYYY
// Proxy builds:  POST to BLS v2 timeseries endpoint with key injected.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  try {
    const { searchParams } = new URL(req.url)
    const seriesParam = searchParams.get("series_id")

    if (!seriesParam) {
      return new Response(
        JSON.stringify({ error: "series_id query param is required (comma-separated for multiple)" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    const seriesid  = seriesParam.split(",").map(s => s.trim()).filter(Boolean)
    const startyear = searchParams.get("startyear") ?? String(new Date().getFullYear() - 3)
    const endyear   = searchParams.get("endyear")   ?? String(new Date().getFullYear())

    const body: Record<string, unknown> = { seriesid, startyear, endyear }

    // Inject key if available — falls back gracefully to keyless (25/day limit)
    const BLS_KEY = Deno.env.get("BLS_API_KEY")
    if (BLS_KEY) body.registrationkey = BLS_KEY

    const blsRes = await fetch(BLS_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })

    const data = await blsRes.json()

    return new Response(JSON.stringify(data), {
      status:  blsRes.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }
})
