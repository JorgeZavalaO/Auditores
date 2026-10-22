import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/scripts/contact-form.js', import.meta.url), 'utf8');
function browser(fetcher) {
  const listeners = {}, state = { renders: 0, resets: 0 }, status = { textContent: '' };
  const button = { disabled: true, textContent: 'Enviar solicitud' };
  const values = { name: 'Ana', company: 'Empresa', email: 'ana@example.com', service: 'Auditoría', message: 'Consulta', website: '' };
  const form = { dataset: { sitekey: 'public-sitekey', contactMode: 'live' },
    elements: [button], addEventListener(name, handler) { listeners[name] = handler; },
    reportValidity: () => true, querySelector: () => button,
    reset() { state.cleared = true; } };
  const turnstile = { render(selector, options) { assert.equal(selector, '#contact-verification'); state.options = options; state.renders++; return 'widget'; },
    reset() { state.resets++; } };
  const context = { window: { turnstile }, document: { querySelector: (id) => id === '#diagnostic-form' ? form : status },
    FormData: class { constructor() {} entries() { return Object.entries(values); } },
    crypto, AbortSignal, fetch: fetcher, JSON, Array, Object };
  runInNewContext(source, context);
  context.window.jjContactReady();
  const submit = () => listeners.submit({ preventDefault() {} });
  return { context, state, button, form, status, submit };
}

test('live client waits for verification, submits once and reports accepted delivery', async () => {
  let release, calls = 0, body;
  const b = browser(async (url, options) => {
    calls++; assert.equal(url, '/api/contact'); body = JSON.parse(options.body);
    await new Promise((resolve) => { release = resolve; });
    return { ok: true, json: async () => ({ ok: true }) };
  });
  assert.equal(b.button.disabled, true);
  await b.submit(); assert.equal(calls, 0);
  b.state.options.callback('verified-token');
  assert.equal(b.button.disabled, false);
  const pending = b.submit();
  await b.submit(); assert.equal(calls, 1);
  assert.equal(b.button.disabled, true);
  assert.equal(body.token, 'verified-token');
  release(); await pending;
  assert.match(b.status.textContent, /aceptada para envío/);
  assert.equal(b.state.cleared, true);
  assert.equal(b.state.resets, 1);
});

test('client preserves fields and stable submission identity across uncertain failure and retry', async () => {
  const bodies = [];
  const b = browser(async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    if (bodies.length === 1) throw new Error('network');
    return { ok: true, json: async () => ({ ok: true }) };
  });
  b.state.options.callback('first-token'); await b.submit();
  assert.match(b.status.textContent, /No pudimos confirmar/);
  assert.equal(b.state.cleared, undefined);
  assert.equal(b.button.disabled, true);
  b.state.options.callback('second-token'); await b.submit();
  assert.equal(bodies[0].requestId, bodies[1].requestId);
  assert.notEqual(bodies[0].token, bodies[1].token);
});

test('expired challenges and rejected submissions do not show success', async () => {
  const b = browser(async () => ({ ok: false, json: async () => ({ ok: false, code: 'limited' }) }));
  b.state.options.callback('token'); b.state.options['expired-callback']();
  assert.equal(b.button.disabled, true);
  b.state.options.callback('new-token'); await b.submit();
  assert.match(b.status.textContent, /solicitudes/);
  assert.equal(b.state.cleared, undefined);
  b.state.options['error-callback']();
  assert.equal(b.button.disabled, true);
});
