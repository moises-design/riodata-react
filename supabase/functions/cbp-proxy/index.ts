// CBP Border Wait Times proxy.
// Deploy:  npx supabase functions deploy cbp-proxy --no-verify-jwt
//
// CBP currently serves Access-Control-Allow-Origin: * on bwtpublicmod,
// so this proxy is a resilience layer — if CBP tightens CORS in the
// future, the client never needs to change.
//
// Real endpoint (discovered from CBP web app bundle):
//   https://bwt.cbp.gov/api/bwtpublicmod
// The older /api/bwtdata path returns a 404 HTML page.
//
// Wait times are officer-reported (~every 30-60 min), not real-time
// sensor feeds. automation_enabled:"0" for most ports confirms this.
// CBP's own UI labels them "estimated wait times" for the same reason.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const CBP_URL = "https://bwt.cbp.gov/api/bwtpublicmod"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  try {
    const cbpRes = await fetch(CBP_URL, {
      headers: { "Accept": "application/json" },
    })

    if (!cbpRes.ok) {
      return new Response(
        JSON.stringify({ error: `CBP upstream returned HTTP ${cbpRes.status}` }),
        { status: cbpRes.status, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    const data = await cbpRes.json()

    return new Response(JSON.stringify(data), {
      status:  200,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }
})
