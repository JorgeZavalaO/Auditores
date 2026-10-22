import { contactServices } from '../src/data/contact-options.mjs';

const fields = ['name', 'company', 'email', 'service', 'message', 'website', 'token', 'requestId'];
const emailPattern = /^[^\s<>@\x00-\x1f\x7f]+@[^\s<>@\x00-\x1f\x7f]+\.[^\s<>@\x00-\x1f\x7f]+$/;
const uuidPattern = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const reply = (status, code) => Response.json(status === 200 ? { ok: true } : { ok: false, code }, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    ...(status === 405 ? { Allow: 'POST' } : {}), ...(status === 429 ? { 'Retry-After': '60' } : {}) },
});
const digest = async (value) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(value)))].map((byte) => byte.toString(16).padStart(2, '0')).join('');

async function readBody(request) {
  if (!request.body) return null;
  const reader = request.body.getReader(), chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16000) { await reader.cancel(); return 'oversized'; }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch { return null; }
}

function configuration(env) {
  try {
    const origin = new URL(env.CONTACT_ORIGIN);
    return env.CONTACT_ENABLED === 'true' && origin.protocol === 'https:' &&
      origin.origin === env.CONTACT_ORIGIN && env.RESEND_API_KEY && env.TURNSTILE_SECRET_KEY &&
      typeof env.CONTACT_IP_LIMITER?.limit === 'function' &&
      typeof env.CONTACT_GLOBAL_LIMITER?.limit === 'function' &&
      emailPattern.test(env.RESEND_FROM) &&
      /@(?:[a-z\d-]+\.)*jjconsultores\.pe$/i.test(env.RESEND_FROM) ? origin : null;
  } catch { return null; }
}

function validated(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
    Object.keys(body).some((key) => !fields.includes(key)) ||
    fields.some((key) => typeof body[key] !== 'string')) return null;
  const data = Object.fromEntries(fields.map((key) => [key, body[key].trim()]));
  if (!data.name || data.name.length > 100 || !data.company || data.company.length > 150 ||
    /[\x00-\x1f\x7f]/.test(data.name + data.company + data.email) ||
    data.email.length > 254 || !emailPattern.test(data.email) ||
    !contactServices.includes(data.service) || data.message.length > 2000 ||
    data.website || !data.token || data.token.length > 2048 || !uuidPattern.test(data.requestId)) return null;
  return data;
}

export function createWorker(fetcher = globalThis.fetch) {
  return { async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact') {
      return url.pathname.startsWith('/api/') ? reply(404, 'not_found') : env.ASSETS.fetch(request);
    }
    if (request.method !== 'POST') return reply(405, 'method');
    const origin = configuration(env);
    if (!origin) return reply(503, 'unavailable');
    if (request.headers.get('Origin') !== origin.origin || url.origin !== origin.origin) return reply(403, 'origin');
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415, 'format');
    const body = await readBody(request);
    if (body === 'oversized') return reply(413, 'size');
    const data = validated(body);
    if (!data) return reply(422, 'fields');
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return reply(503, 'unavailable');
    try {
      const ipLimit = await env.CONTACT_IP_LIMITER.limit({ key: await digest(ip) });
      if (ipLimit.success !== true) return reply(429, 'limited');
      const globalLimit = await env.CONTACT_GLOBAL_LIMITER.limit({ key: 'contact' });
      if (globalLimit.success !== true) return reply(429, 'limited');
      const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: data.token, remoteip: ip }),
      });
      if (!verification.ok) return reply(503, 'verification_unavailable');
      const challenge = await verification.json();
      if (challenge.success !== true || challenge.hostname !== origin.hostname || challenge.action !== 'contact') return reply(403, 'verification');
      const { name, company, email, service, message, requestId } = data;
      const payload = { from: env.RESEND_FROM,
        to: ['jzavala@jjconsultores.pe', 'contador44@hotmail.com', 'jzavalaolivares@gmail.com'], reply_to: email,
        subject: 'Nueva consulta desde la web de J&J',
        text: `Nombre: ${name}\nEmpresa: ${company}\nCorreo: ${email}\nServicio: ${service}\n\n${message}` };
      const result = await fetcher('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
          'Idempotency-Key': `contact/${requestId}/${await digest(JSON.stringify(payload))}` },
        body: JSON.stringify(payload),
      });
      if (!result.ok) return reply(502, 'delivery');
      const acceptance = await result.json();
      if (typeof acceptance.id !== 'string' || !acceptance.id.trim()) return reply(502, 'delivery');
      return reply(200);
    } catch { return reply(503, 'unavailable'); }
  } };
}

export default createWorker();
