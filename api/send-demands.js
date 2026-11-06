/* Sending worker for released demand letters (email only).
   Vercel serverless function. Does nothing unless ALL of these hold:
     - env REAL_CASES_SEND_ENABLED === 'true'
     - database flag app_flags.real_cases_enabled = true
     - the caller is authorised (CRON_SECRET bearer or a signed-in staff member)
     - the letter has status RELEASED (customer approved + staff released) and an active mandate
   Post and fax letters are NOT sent here; staff send them by hand and record proof in the staff screen.

   Two sender identities:
     - Stage 1 (kind INITIAL_DEMAND, reveals_forderbar = false): written in the customer's name. Display name is the
       customer's name, sent from a NEUTRAL address (MAIL_FROM_NEUTRAL), replies to MAIL_REPLY_TO_NEUTRAL.
       No Forderbar name or address appears in the headers.
     - Stage 2 (kind INKASSO_DEMAND, reveals_forderbar = true): Forderbar as Inkassodienstleister,
       sent from MAIL_FROM_FORDERBAR (an address on a verified forderbar.de sending domain).

   Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
   Per stage:    MAIL_FROM_NEUTRAL + MAIL_REPLY_TO_NEUTRAL (stage 1), MAIL_FROM_FORDERBAR (+ optional MAIL_REPLY_TO) (stage 2)
   Optional env: CRON_SECRET */
const crypto = require('crypto');

const ANON_KEY = 'sb_publishable_5qaJkw9dQtYhcQBHF_JDVQ_BgTTFCc2';

function env(name) { return process.env[name] || ''; }

async function sb(path, opt) {
  opt = opt || {};
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(env('SUPABASE_URL') + path, Object.assign({}, opt, {
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, opt.headers || {})
  }));
  const text = await r.text();
  if (!r.ok) throw new Error('supabase ' + r.status + ': ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function authorised(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return false;
  const secret = env('CRON_SECRET');
  if (secret && safeEqual(h, 'Bearer ' + secret)) return true;
  // otherwise the bearer must be a staff member's Supabase session token
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/rpc/forderbar_is_staff', {
    method: 'POST', headers: { apikey: ANON_KEY, Authorization: h, 'Content-Type': 'application/json' }, body: '{}'
  });
  return r.ok && (await r.json()) === true;
}

function cleanName(n) {
  // display names go into a mail header: strip anything that could break or inject headers
  return String(n || '').replace(/[\r\n"<>,;:\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function senderFor(letter) {
  if (letter.reveals_forderbar) {
    const from = env('MAIL_FROM_FORDERBAR');
    if (!from) return null;
    return { from: from, reply_to: env('MAIL_REPLY_TO') || undefined };
  }
  const addr = env('MAIL_FROM_NEUTRAL'), reply = env('MAIL_REPLY_TO_NEUTRAL');
  const name = cleanName(letter.customer_name);
  if (!addr || !reply || !name) return null;
  return { from: name + ' <' + addr + '>', reply_to: reply };
}

async function sendEmail(letter, sender) {
  const payload = { from: sender.from, to: [letter.recipient_email], subject: letter.subject, text: letter.body };
  if (sender.reply_to) payload.reply_to = sender.reply_to;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env('RESEND_API_KEY'),
      'Content-Type': 'application/json',
      'Idempotency-Key': 'demand-' + letter.id // a retry can never send the same letter twice
    },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error('resend ' + r.status + ': ' + JSON.stringify(data).slice(0, 200));
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  if (env('REAL_CASES_SEND_ENABLED') !== 'true') return res.status(503).json({ error: 'sending disabled (REAL_CASES_SEND_ENABLED)' });
  for (const n of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY']) {
    if (!env(n)) return res.status(500).json({ error: 'missing env ' + n });
  }
  try {
    if (!(await authorised(req))) return res.status(401).json({ error: 'unauthorised' });
    const flag = await sb('/rest/v1/app_flags?key=eq.real_cases_enabled&select=enabled');
    if (!flag || !flag[0] || flag[0].enabled !== true) return res.status(503).json({ error: 'real cases disabled in database' });

    const letters = await sb('/rest/v1/demand_letters?status=eq.RELEASED&channel=eq.EMAIL&select=id,recipient_email,subject,body,customer_name,reveals_forderbar&order=staff_released_at.asc&limit=20');
    const manual = await sb('/rest/v1/demand_letters?status=eq.RELEASED&channel=in.(POST,FAX)&select=id');
    const out = { sent: 0, failed: 0, skipped_missing_sender_config: 0, waiting_manual_post_fax: manual.length, errors: [] };

    for (const l of letters) {
      const sender = senderFor(l);
      if (!sender) { out.skipped_missing_sender_config++; continue; } // stays RELEASED until the sender settings exist
      let ok = false, proof = null, reason = null;
      try {
        proof = { provider: 'resend', sender: l.reveals_forderbar ? 'forderbar' : 'customer-name', result: await sendEmail(l, sender) };
        ok = true;
      } catch (e) { reason = String(e.message || e).slice(0, 300); }
      await sb('/rest/v1/rpc/forderbar_mark_demand_sent', {
        method: 'POST',
        body: JSON.stringify({ p_letter_id: l.id, p_success: ok, p_proof: proof, p_reason: reason })
      });
      if (ok) out.sent++; else { out.failed++; out.errors.push({ id: l.id, reason: reason }); }
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).slice(0, 300) });
  }
};
