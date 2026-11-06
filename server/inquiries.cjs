'use strict';
const { createHash } = require('node:crypto');
const MAX_BYTES = 16384;
const emailPattern = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const reply = (status, body) => ({ status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, body });
function configuration(env) {
  const origins = (env.INQUIRY_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return { origins, ready: origins.length > 0 && origins.every(s => { try { return new URL(s).origin === s && /^https?:$/.test(new URL(s).protocol); } catch { return false; } }) && ['RESEND_API_KEY','INQUIRY_FROM','INQUIRY_TO','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY'].every(k => !!env[k]) && emailPattern.test(env.INQUIRY_FROM) && emailPattern.test(env.INQUIRY_TO) };
}
async function handleInquiry(request, { env = process.env, fetchImpl = fetch } = {}) {
  const config = configuration(env);
  if (!['GET','POST'].includes(request.method)) return { ...reply(405, { error: 'Method not allowed.' }), headers: { ...reply(405, {}).headers, Allow: 'GET, POST' } };
  if (!config.ready) return reply(503, { error: 'Inquiry service is unavailable. Please contact gkai@pureaiglobal.com directly.' });
  if (request.method === 'GET') return reply(200, { siteKey: env.TURNSTILE_SITE_KEY });
  const origin = request.headers.origin;
  if (!config.origins.includes(origin)) return reply(403, { error: 'This site is not permitted to submit inquiries.' });
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) return reply(415, { error: 'JSON required.' });
  if (Buffer.byteLength(request.body || '') > MAX_BYTES) return reply(413, { error: 'Inquiry is too large.' });
  let data;
  try { data = JSON.parse(request.body); } catch { return reply(400, { error: 'Invalid request.' }); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400, { error: 'Invalid request.' });
  const limits = { name: 160, email: 254, phone: 40, message: 5000, website: 200, token: 2048, requestId: 36, source: 20 };
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof data[key] !== 'string' || data[key].length > limit || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(data[key])) return reply(400, { error: 'Please check the form fields and try again.' });
    data[key] = data[key].trim();
  }
  if (!data.name || !emailPattern.test(data.email) || !data.message || /[\r\n]/.test(data.name + data.phone) || (data.phone && !/^[+\d\s().-]{5,40}$/.test(data.phone)) || data.consent !== true || !['ai-interest','contact'].includes(data.source) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.requestId)) return reply(400, { error: 'Please provide valid contact details, a message and consent.' });
  if (data.website || !data.token) return reply(400, { error: 'Please complete the security check and try again.' });
  try {
    const verification = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: data.token }), signal: AbortSignal.timeout(8000) });
    if (!verification.ok) return reply(503, { error: 'Security verification is unavailable. Please try again later.' });
    const check = await verification.json();
    if (!check.success || check.hostname !== new URL(origin).hostname || check.action !== 'inquiry') return reply(400, { error: 'Security check expired or failed. Please try again.' });
    // Stable payload + request ID prevents duplicate emails when a response is lost.
    const text = `Source: ${data.source}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || 'Not provided'}\nConsent: inquiry follow-up (notice v1)\nReference: ${data.requestId}\n\n${data.message}`;
    const payload = { from: env.INQUIRY_FROM, to: [env.INQUIRY_TO], reply_to: data.email, subject: `Pure AI ${data.source} inquiry`, text };
    const key = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const delivery = await fetchImpl('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `inquiry-${key}` }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    if (!delivery.ok) return reply(502, { error: 'Delivery was not confirmed. Please retry or email gkai@pureaiglobal.com directly.' });
    const accepted = await delivery.json();
    if (typeof accepted.id !== 'string' || !accepted.id) return reply(502, { error: 'Delivery was not confirmed. Please try again.' });
    return reply(202, { accepted: true, reference: data.requestId });
  } catch {
    // Never log visitor fields, provider responses, tokens or credentials.
    return reply(503, { error: 'Delivery could not be confirmed. Your details remain in this form. Please retry or email gkai@pureaiglobal.com directly.' });
  }
}
module.exports = { handleInquiry, MAX_BYTES };
