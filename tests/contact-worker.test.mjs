import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorker } from '../worker/contact.mjs';
import { contactServices } from '../src/data/contact-options.mjs';

function fixture() {
  const calls = [], limits = [];
  const env = {
    CONTACT_ENABLED: 'true', CONTACT_ORIGIN: 'https://firma.pe',
    RESEND_FROM: 'web@notify.jjconsultores.pe', RESEND_API_KEY: 'private-resend-key',
    TURNSTILE_SECRET_KEY: 'private-turnstile-key',
    CONTACT_IP_LIMITER: { async limit(value) { limits.push(value); return { success: true }; } },
    CONTACT_GLOBAL_LIMITER: { async limit() { return { success: true }; } },
    ASSETS: { async fetch() { return new Response('static page'); } },
  };
  const worker = createWorker(async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return Response.json(url.includes('siteverify')
      ? { success: true, hostname: 'firma.pe', action: 'contact' } : { id: 'mail-id' });
  });
  const data = { name: 'Ana Pérez', company: 'Empresa', email: 'ana@example.com',
    service: contactServices[0], message: 'Consulta', website: '', token: 'valid-token',
    requestId: '6d895004-28f8-4b2f-82f1-681d7440c559' };
  const request = (body = data, headers = {}) => new Request('https://firma.pe/api/contact', {
    method: 'POST', headers: { Origin: 'https://firma.pe', 'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(body),
  });
  return { env, worker, data, request, calls, limits };
}

test('accepted request verifies Turnstile then sends all three fixed recipients and safe Reply-To', async () => {
  const f = fixture();
  const response = await f.worker.fetch(f.request(), f.env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].body.secret, f.env.TURNSTILE_SECRET_KEY);
  assert.equal(f.calls[1].url, 'https://api.resend.com/emails');
  assert.deepEqual(f.calls[1].body.to, ['jzavala@jjconsultores.pe', 'contador44@hotmail.com', 'jzavalaolivares@gmail.com']);
  assert.equal(f.calls[1].body.from, f.env.RESEND_FROM);
  assert.equal(f.calls[1].body.reply_to, f.data.email);
  assert.ok(f.calls[1].body.text.includes(f.data.message));
  assert.equal(f.calls[1].body.html, undefined);
  assert.equal(f.limits.length, 1);
  assert.ok(!f.limits[0].key.includes('192.0.2.1'));
  assert.ok(f.calls[1].options.headers['Idempotency-Key']);
});

test('disabled or incomplete configuration fails closed without outbound requests', async () => {
  for (const key of ['CONTACT_ENABLED', 'CONTACT_ORIGIN', 'RESEND_FROM', 'RESEND_API_KEY',
    'TURNSTILE_SECRET_KEY', 'CONTACT_IP_LIMITER', 'CONTACT_GLOBAL_LIMITER']) {
    const f = fixture(); delete f.env[key];
    const result = await f.worker.fetch(f.request(), f.env);
    assert.equal(result.status, 503, key); assert.equal(f.calls.length, 0);
    assert.ok(!(await result.text()).includes('private-'));
  }
});

test('rejects cross-origin, unsupported methods and body formats without sending', async () => {
  const f = fixture();
  for (const origin of ['https://evil.test', 'null', '']) {
    assert.equal((await f.worker.fetch(f.request(f.data, { Origin: origin }), f.env)).status, 403);
  }
  assert.equal((await f.worker.fetch(new Request('https://firma.pe/api/contact'), f.env)).status, 405);
  assert.equal((await f.worker.fetch(f.request(f.data, { 'Content-Type': 'text/plain' }), f.env)).status, 415);
  assert.equal(f.calls.length, 0);
});

test('server rejects malformed, oversized, injected and invalid fields without outbound effects', async () => {
  for (const change of [{ name: '' }, { company: 'a'.repeat(151) }, { email: 'bad' },
    { email: 'a@b.com\r\nBcc: victim@example.com' }, { name: 'Ana\nHeader' },
    { service: 'unlisted' }, { message: 'a'.repeat(2001) }, { token: '' },
    { token: 'a'.repeat(2049) }, { requestId: 'arbitrary' }, { to: 'victim@example.com' }]) {
    const f = fixture();
    assert.equal((await f.worker.fetch(f.request({ ...f.data, ...change }), f.env)).status, 422);
    assert.equal(f.calls.length, 0);
  }
  for (const raw of ['{', 'null', '[]', ' '.repeat(17000)]) {
    const f = fixture();
    const req = new Request('https://firma.pe/api/contact', { method: 'POST',
      headers: { Origin: 'https://firma.pe', 'Content-Type': 'application/json' }, body: raw });
    assert.ok([400, 413, 422].includes((await f.worker.fetch(req, f.env)).status));
    assert.equal(f.calls.length, 0);
  }
});

test('honeypot and request throttles prevent provider calls', async () => {
  const f = fixture();
  assert.equal((await f.worker.fetch(f.request({ ...f.data, website: 'bot' }), f.env)).status, 422);
  for (const key of ['CONTACT_IP_LIMITER', 'CONTACT_GLOBAL_LIMITER']) {
    const g = fixture(); g.env[key].limit = async () => ({ success: false });
    assert.equal((await g.worker.fetch(g.request(), g.env)).status, 429);
    assert.equal(g.calls.length, 0);
  }
  assert.equal(f.calls.length, 0);
});

test('per-IP rejection does not consume shared contact capacity', async () => {
  const f = fixture(); let globalCalls = 0;
  f.env.CONTACT_IP_LIMITER.limit = async () => ({ success: false });
  f.env.CONTACT_GLOBAL_LIMITER.limit = async () => { globalCalls++; return { success: true }; };
  assert.equal((await f.worker.fetch(f.request(), f.env)).status, 429);
  assert.equal(globalCalls, 0);
  assert.equal(f.calls.length, 0);
});

test('invalid, replayed, wrong-host or wrong-action verification never reaches Resend', async () => {
  for (const verification of [{ success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'evil.test', action: 'contact' },
    { success: true, hostname: 'firma.pe', action: 'login' }]) {
    const f = fixture(); let calls = 0;
    const worker = createWorker(async () => { calls++; return Response.json(verification); });
    assert.equal((await worker.fetch(f.request(), f.env)).status, 403);
    assert.equal(calls, 1);
  }
});

test('provider failures and unavailable bindings return truthful errors without secret reflection', async () => {
  for (const failure of ['network', 'turnstile-http', 'resend-http', 'missing-id', 'limiter']) {
    const f = fixture(); let sends = 0;
    if (failure === 'limiter') f.env.CONTACT_IP_LIMITER.limit = async () => { throw Error('private-value'); };
    const worker = createWorker(async (url) => {
      if (failure === 'network') throw new DOMException('private-value', 'TimeoutError');
      if (url.includes('siteverify')) return failure === 'turnstile-http'
        ? new Response('private-value', { status: 500 })
        : Response.json({ success: true, hostname: 'firma.pe', action: 'contact' });
      sends++;
      return failure === 'resend-http' ? Response.json({ error: 'private-value' }, { status: 429 }) : Response.json({});
    });
    const result = await worker.fetch(f.request(), f.env);
    assert.ok(result.status >= 500, failure);
    assert.ok(!(await result.text()).includes('private-value'));
    assert.ok(sends <= 1);
  }
});

test('stable submission uses stable provider idempotency key despite renewed challenge', async () => {
  const f = fixture();
  await f.worker.fetch(f.request(), f.env);
  await f.worker.fetch(f.request({ ...f.data, token: 'renewed-token' }), f.env);
  assert.equal(f.calls[1].options.headers['Idempotency-Key'], f.calls[3].options.headers['Idempotency-Key']);
});

test('normal static requests retain asset fallback and unknown APIs return 404', async () => {
  const f = fixture();
  assert.equal(await (await f.worker.fetch(new Request('https://firma.pe/nosotros/'), f.env)).text(), 'static page');
  assert.equal((await f.worker.fetch(new Request('https://firma.pe/api/unknown'), f.env)).status, 404);
  assert.equal(f.calls.length, 0);
});
