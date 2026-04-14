// FRED API proxy — keeps the API key server-side.
// Deploy:  npx supabase functions deploy fred-proxy --no-verify-jwt
// Secret:  npx supabase secrets set FRED_API_KEY=<your_key>
//
// --no-verify-jwt makes this a public endpoint; security comes from
// FRED_API_KEY being a server-side secret, not from caller auth.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  const FRED_KEY = Deno.env.get("FRED_API_KEY")
  if (!FRED_KEY) {
    return new Response(
      JSON.stringify({ error: "FRED_API_KEY secret is not set" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const series_id = searchParams.get("series_id")

    if (!series_id) {
      return new Response(
        JSON.stringify({ error: "series_id query param is required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    const limit      = searchParams.get("limit")      ?? "8"
    const sort_order = searchParams.get("sort_order") ?? "desc"

    const fredUrl = new URL("https://api.stlouisfed.org/fred/series/observations")
    fredUrl.searchParams.set("series_id",  series_id)
    fredUrl.searchParams.set("api_key",    FRED_KEY)
    fredUrl.searchParams.set("file_type",  "json")
    fredUrl.searchParams.set("sort_order", sort_order)
    fredUrl.searchParams.set("limit",      limit)

    const fredRes = await fetch(fredUrl.toString())
    const data    = await fredRes.json()

    return new Response(JSON.stringify(data), {
      status:  fredRes.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }
})
