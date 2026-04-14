// Weekly Digest Edge Function
// Deploy: supabase functions deploy weekly-digest --no-verify-jwt
// Cron:   supabase functions schedule weekly-digest "0 13 * * 1"  (Monday 8 AM CST)
//
// Requires env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY  (or remove email section and use Supabase SMTP)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')

Deno.serve(async () => {
  try {
    // ── 1. Fetch users opted in to email digest ────────────────────────────────
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name, sector, email_digest')
      .eq('email_digest', true)

    if (!profiles?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), { status: 200 })
    }

    // ── 2. Fetch digest content (same for everyone, personalization by sector) ─
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: newOpps },
      { data: newCompanies },
      { count: totalOpps },
    ] = await Promise.all([
      sb.from('projects')
        .select('id, title, sector, budget, location')
        .eq('status', 'active')
        .gte('created_at', weekAgo)
        .limit(5),
      sb.from('companies')
        .select('id, legal_name, city, state_province, sector')
        .eq('status', 'active')
        .gte('created_at', weekAgo)
        .limit(5),
      sb.from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

    // ── 3. Look up auth emails for profile IDs ─────────────────────────────────
    // Service role can access auth.admin
    const { data: { users } } = await sb.auth.admin.listUsers()
    const emailMap = Object.fromEntries((users || []).map(u => [u.id, u.email]))

    // ── 4. Send one email per subscriber ──────────────────────────────────────
    let sent = 0
    for (const profile of profiles) {
      const email = emailMap[profile.id]
      if (!email) continue

      const firstName = profile.full_name?.split(' ')[0] ?? email.split('@')[0]

      // Filter opportunities by sector if set
      const sectorOpps = profile.sector
        ? (newOpps || []).filter(o => o.sector === profile.sector)
        : newOpps || []
      const oppsToShow = sectorOpps.length > 0 ? sectorOpps : (newOpps || []).slice(0, 3)

      const html = buildDigestHtml(firstName, oppsToShow, newCompanies || [], totalOpps ?? 0)

      await sendEmail(email, `RioData Weekly: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Regional Digest`, html)
      sent++
    }

    return new Response(JSON.stringify({ sent }), { status: 200 })
  } catch (err) {
    console.error('weekly-digest error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

// ── Email sender (Resend) ─────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) {
    console.log(`[digest] would send to ${to}: ${subject}`)
    return
  }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: 'RioData <digest@riodata.io>',
      to,
      subject,
      html,
    }),
  })
}

// ── HTML template ─────────────────────────────────────────────────────────────
function buildDigestHtml(
  firstName: string,
  opps: Array<{ title: string; sector: string; budget?: string; location?: string }>,
  companies: Array<{ legal_name: string; city?: string; sector?: string }>,
  totalOpps: number,
): string {
  const oppRows = opps.length > 0
    ? opps.map(o => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F0EDE8">
            <strong style="color:#0F0F0E;font-size:14px">${escHtml(o.title)}</strong><br/>
            <span style="color:#888780;font-size:12px">📍 ${escHtml(o.location || '')} · 💰 ${escHtml(o.budget || 'TBD')}</span>
          </td>
        </tr>`).join('')
    : '<tr><td style="padding:10px 0;color:#888780;font-size:13px">No new opportunities this week.</td></tr>'

  const coRows = companies.length > 0
    ? companies.map(c => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F0EDE8">
            <strong style="color:#0F0F0E;font-size:14px">${escHtml(c.legal_name)}</strong><br/>
            <span style="color:#888780;font-size:12px">📍 ${escHtml(c.city || '')} · ${escHtml(c.sector || '')}</span>
          </td>
        </tr>`).join('')
    : '<tr><td style="padding:10px 0;color:#888780;font-size:13px">No new companies this week.</td></tr>'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2DDD6">

        <!-- Header -->
        <tr><td style="background:#0F0F0E;padding:28px 32px">
          <span style="color:#FFFFFF;font-size:20px;font-weight:bold">● RioData</span>
          <span style="color:#888780;font-size:13px;display:block;margin-top:4px">Weekly Regional Digest · South Texas + Northern Mexico</span>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:28px 32px 0">
          <h2 style="margin:0 0 8px;color:#0F0F0E;font-size:22px">Good morning, ${escHtml(firstName)} 👋</h2>
          <p style="margin:0;color:#5C5C54;font-size:14px;line-height:1.6">
            Here's your weekly snapshot of what's happening in the region.
            There are currently <strong>${totalOpps}</strong> active opportunities.
          </p>
        </td></tr>

        <!-- New Opportunities -->
        <tr><td style="padding:24px 32px 0">
          <h3 style="margin:0 0 12px;color:#0F0F0E;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">
            New Opportunities This Week
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0">${oppRows}</table>
        </td></tr>

        <!-- New Companies -->
        <tr><td style="padding:24px 32px 0">
          <h3 style="margin:0 0 12px;color:#0F0F0E;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">
            New Businesses in Directory
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0">${coRows}</table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:28px 32px">
          <a href="https://riodata.io/dashboard"
            style="display:inline-block;background:#1A6B72;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
            View Your Dashboard →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #F0EDE8;background:#FDFCFB">
          <p style="margin:0;color:#B8B4AE;font-size:11px;line-height:1.6">
            You're receiving this because you enabled Weekly Digest in your RioData profile.<br/>
            <a href="https://riodata.io/profile" style="color:#1A6B72;text-decoration:none">Manage notifications</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
