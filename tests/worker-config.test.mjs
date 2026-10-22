import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';

const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));

test('the active configuration targets the existing Worker and its contact handler', () => {
  assert.equal(config.name, 'auditores');
  assert.equal(config.main, 'worker/contact.mjs');
  assert.ok(existsSync(new URL(`../${config.main}`, import.meta.url)));
  assert.equal(config.assets.directory, './dist');
  assert.equal(config.assets.binding, 'ASSETS');
  assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
  assert.equal(config.assets.not_found_handling, undefined);
  assert.equal(config.routes, undefined);
  assert.equal(config.route, undefined);
  assert.equal(config.workers_dev, false);
});

test('publishing the handler does not enable email or embed runtime credentials', () => {
  assert.equal(config.keep_vars, true);
  assert.deepEqual(config.vars, { CONTACT_ENABLED: 'false', CONTACT_ORIGIN: 'https://jjconsultores.pe' });
  assert.equal(config.vars.RESEND_FROM, undefined);
  for (const name of ['RESEND_API_KEY', 'TURNSTILE_SECRET_KEY', 'PUBLIC_TURNSTILE_SITE_KEY']) {
    assert.equal(JSON.stringify(config).includes(name), false);
  }
});

test('both required throttles have separate valid namespaces and bounded limits', () => {
  assert.deepEqual(config.ratelimits.map((binding) => binding.name), ['CONTACT_IP_LIMITER', 'CONTACT_GLOBAL_LIMITER']);
  assert.equal(new Set(config.ratelimits.map((binding) => binding.namespace_id)).size, 2);
  for (const binding of config.ratelimits) {
    assert.match(binding.namespace_id, /^[1-9]\d+$/);
    assert.equal(binding.simple.period, 60);
    assert.ok(binding.simple.limit > 0 && binding.simple.limit <= 30);
  }
});
