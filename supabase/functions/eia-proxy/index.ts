// EIA API proxy — keeps the API key server-side.
// Deploy:  npx supabase functions deploy eia-proxy --no-verify-jwt
// Secret:  npx supabase secrets set EIA_API_KEY=<your_key>
//          (Free key: https://www.eia.gov/opendata/register.php)
//
// Client sends:  ?path=<eia_v2_path>&q=<raw_eia_query_string>
// Proxy builds:  https://api.eia.gov/v2/{path}?api_key={key}&{q}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  const EIA_KEY = Deno.env.get("EIA_API_KEY")
  if (!EIA_KEY) {
    return new Response(
      JSON.stringify({ error: "EIA_API_KEY secret is not set" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")

    if (!path) {
      return new Response(
        JSON.stringify({ error: "path query param is required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    // q holds the raw EIA query string (brackets intact after proxy decodes it)
    const q = searchParams.get("q") ?? ""
    const eiaUrl = `https://api.eia.gov/v2/${path}?api_key=${EIA_KEY}&${q}`

    const eiaRes = await fetch(eiaUrl)
    const data   = await eiaRes.json()

    return new Response(JSON.stringify(data), {
      status:  eiaRes.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }
})
