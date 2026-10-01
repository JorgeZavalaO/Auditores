import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { resolveSite } from '../config/site.mjs';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');

function build(name, environment) {
  const output = join(root, '.astro', 'test-builds', name);
  const result = spawnSync(process.execPath, [cli, 'build', '--outDir', output], {
    cwd: root,
    env: { ...process.env, SITE_URL: '', PUBLIC_LAUNCH_READY: 'false', ...environment },
    encoding: 'utf8',
    timeout: 120_000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return { output, html: readFileSync(join(output, 'index.html'), 'utf8') };
}

test('preview is the safe default, even when only a domain is configured', () => {
  assert.deepEqual(resolveSite({}), { origin: undefined, indexable: false });
  assert.equal(resolveSite({ SITE_URL: 'https://firma.pe' }).indexable, false);
  assert.deepEqual(resolveSite({ SITE_URL: 'https://firma.pe/', PUBLIC_LAUNCH_READY: 'true' }), {
    origin: 'https://firma.pe', indexable: true,
  });
  assert.deepEqual(resolveSite({ SITE_URL: 'https://XN--MAANA-PTA.PE', PUBLIC_LAUNCH_READY: 'true' }), {
    origin: 'https://xn--maana-pta.pe', indexable: true,
  });
  assert.deepEqual(resolveSite({ SITE_URL: 'https://mañana.pe', PUBLIC_LAUNCH_READY: 'true' }), {
    origin: 'https://xn--maana-pta.pe', indexable: true,
  });
});

test('launch configuration rejects missing, local, example and malformed origins', () => {
  const invalid = [
    'not-a-url', 'ftp://firma.pe', 'https://user:password@firma.pe',
    'https://firma.pe/service', 'https://firma.pe/?campaign=demo',
    'https://firma.pe/#section', 'http://localhost:4321', 'http://127.0.0.1',
    'http://[::1]', 'https://example.com', 'https://sub.example.com', 'https://firma.invalid',
    'http://127.0.0.2', 'http://127.1', 'http://2130706433', 'http://0x7f000001',
    'http://0177.0.0.1', 'http://192.168.1.2', 'http://10.0.0.1', 'http://172.16.1.2',
    'https://8.8.8.8', 'https://[2001:4860:4860::8888]', 'http://[fe80::1]',
    'https://example.net', 'https://example.org', 'https://sub.example.net', 'https://sub.example.org',
    'https://firma.test', 'https://firma.local', 'https://firma.localhost', 'https://firma.example',
    'https://firma.internal', 'https://firma', 'https://firma.pe.', 'https://example.org.',
    'https://firma..pe', 'https://bad_host.pe', 'https://-firma.pe', 'https://firma-.pe',
  ];
  for (const url of invalid) {
    assert.throws(() => resolveSite({ SITE_URL: url, PUBLIC_LAUNCH_READY: 'true' }), /SITE_URL/, url);
  }
  assert.throws(() => resolveSite({ PUBLIC_LAUNCH_READY: 'true' }), /SITE_URL/);
});

test('Astro build fails closed for an invalid public origin', () => {
  const result = spawnSync(process.execPath, [cli, 'build'], {
    cwd: root,
    env: { ...process.env, SITE_URL: 'https://firma.pe/servicios', PUBLIC_LAUNCH_READY: 'true' },
    encoding: 'utf8',
    timeout: 120_000,
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /SITE_URL must be an HTTP\(S\) origin/);
});

test('generated preview contains semantic content, local assets and safe demo interactions', () => {
  const { output, html } = build('preview', {});
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<html lang="es-PE">/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json/);
  assert.equal(readFileSync(join(output, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
  assert.ok(!existsSync(join(output, 'sitemap-index.xml')));
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  assert.equal(ids.size, [...html.matchAll(/\bid="([^"]+)"/g)].length, 'IDs must be unique');
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), `Missing anchor: ${match[1]}`);
  for (const client of ['AQUARA', 'CMFC', 'DELPA', 'ECEL', 'HFP', 'MRTHREE', 'SANTOS', 'TRAIRE', 'VENMATIC', 'VIPE']) {
    assert.match(html, new RegExp(`alt="${client}"`));
  }
  assert.equal((html.match(/class="client-logo"/g) || []).length, 10);
  for (const match of html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)) {
    assert.ok(match[1].startsWith('/_astro/'), 'Images must be local');
    assert.ok(existsSync(join(output, match[1])), `Missing image: ${match[1]}`);
    assert.match(match[0], /width="\d+"/);
    assert.match(match[0], /height="\d+"/);
    assert.match(match[0], /alt="[^"]+"/);
  }
  assert.match(html, /fetchpriority="high"/);
  assert.ok(readdirSync(join(output, '_astro')).some((file) => file.endsWith('.woff2')));
  assert.doesNotMatch(html, /https:\/\/(fonts\.googleapis|fonts\.gstatic|images\.unsplash)/);
  assert.doesNotMatch(html, /href="(?:mailto:|tel:|https:\/\/wa\.me)/);
  assert.match(html, /Datos de ejemplo/);
  assert.match(html, /socios cuentan con 20 años de experiencia/);
  assert.match(html, /<form[^>]+onsubmit="return false"/);
  assert.match(html, /No envía ni guarda información/);
  assert.match(html, /type="email"[^>]+required/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.equal((html.match(/<details>/g) || []).length, 5);
  assert.match(html, /aria-controls="primary-navigation" aria-expanded="false"/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|fetch\(/);
});

test('configured production emits matching canonical, social metadata, schema and sitemap', () => {
  const domain = 'https://firma.pe';
  const { output, html } = build('production', { SITE_URL: domain, PUBLIC_LAUNCH_READY: 'true' });
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/firma\.pe\/">/);
  assert.match(html, /property="og:url" content="https:\/\/firma\.pe\/"/);
  assert.match(html, /property="og:image" content="https:\/\/firma\.pe\/_astro\//);
  const schemaText = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
  assert.ok(schemaText);
  const schema = JSON.parse(schemaText);
  assert.equal(schema['@type'], 'ProfessionalService');
  assert.equal(schema.url, `${domain}/`);
  assert.equal(schema.hasOfferCatalog.itemListElement.length, 3);
  assert.ok(!('telephone' in schema) && !('email' in schema) && !('address' in schema));
  assert.doesNotMatch(schemaText, /example\.com|999 999/);
  assert.match(readFileSync(join(output, 'robots.txt'), 'utf8'), /Allow: \/\nSitemap: https:\/\/firma\.pe\/sitemap-index\.xml/);
  assert.match(readFileSync(join(output, 'sitemap-index.xml'), 'utf8'), /https:\/\/firma\.pe\/sitemap-0\.xml/);
  const sitemap = readFileSync(join(output, 'sitemap-0.xml'), 'utf8');
  assert.equal((sitemap.match(/<url>/g) || []).length, 1);
  assert.match(sitemap, /<loc>https:\/\/firma\.pe\/<\/loc>/);
});
