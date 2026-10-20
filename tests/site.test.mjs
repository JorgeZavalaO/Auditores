import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { resolveSite } from '../config/site.mjs';
import { output as packageOutput, routes, srcsetCandidates, validatePayload } from '../scripts/package-pages-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const pagePaths = ['/', '/nosotros/', '/servicios/'];
const email = 'jzavala@jjconsultores.pe';
const phone = '+51 956 481 871';
const phoneHref = 'tel:+51956481871';

function build(name, environment) {
  const output = join(root, '.astro', 'test-builds', name);
  const result = spawnSync(process.execPath, [cli, 'build', '--outDir', output], {
    cwd: root,
    env: { ...process.env, SITE_URL: '', PUBLIC_LAUNCH_READY: 'false', ...environment },
    encoding: 'utf8', timeout: 120_000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return { output, html: readFileSync(join(output, 'index.html'), 'utf8') };
}

function htmlFiles(directory, base = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path, base) : path.endsWith('.html') ? [relative(base, path).replaceAll('\\', '/')] : [];
  }).sort();
}

function readPages(output) {
  assert.deepEqual(htmlFiles(output), ['index.html', 'nosotros/index.html', 'servicios/index.html']);
  return new Map(pagePaths.map((path) => [path, readFileSync(join(output, path, 'index.html'), 'utf8')]));
}

function assertPageContent(pages, output) {
  const titles = new Set();
  const descriptions = new Set();
  for (const [path, html] of pages) {
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
    assert.match(html, /<html lang="es-PE">/);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title && description, path);
    titles.add(title);
    descriptions.add(description);
    assert.match(html, /J(?:&amp;|&)J CONSULTORES Y AUDITORES/);
    assert.doesNotMatch(html, /href=["']\/demo[123](?:\/|["'])|\bDemo [123]\b|Identidad comercial provisional|contacto@example\.com|\+51 999 999 999/);
    assert.match(html, /href="\/nosotros\/"/);
    assert.match(html, /href="\/servicios\/"/);
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer, path);
    assert.ok(footer.includes(`href="mailto:${email}"`), `${path}: footer email`);
    assert.ok(footer.includes(`href="${phoneHref}"`), `${path}: footer phone`);
    assert.ok(footer.includes(phone), path);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${path}: duplicate IDs`);
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(tag, /alt="[^"]+"/);
      assert.match(tag, /width="\d+"/);
      assert.match(tag, /height="\d+"/);
      assert.match(tag, /src="\/_astro\//);
    }
    for (const [, attribute, value] of html.matchAll(/\b(href|src|srcset)="([^"]+)"/g)) {
      const urls = attribute === 'srcset' ? srcsetCandidates(value).map((candidate) => candidate.url) : [value];
      for (const url of urls) {
        if (/^(?:https?:|mailto:|tel:|data:|\/\/)/.test(url)) continue;
        const resolved = new URL(url.replaceAll('&amp;', '&'), `https://fixture.pe${path}`);
        const target = join(output, decodeURIComponent(resolved.pathname), resolved.pathname.endsWith('/') ? 'index.html' : '');
        assert.ok(existsSync(target), `${path}: unresolved ${attribute} ${url}`);
        if (resolved.hash) {
          const targetHtml = pages.get(resolved.pathname);
          assert.ok(targetHtml?.includes(`id="${decodeURIComponent(resolved.hash.slice(1))}"`), `${path}: missing fragment ${url}`);
        }
      }
    }
    assert.doesNotMatch(html, /fonts\.googleapis|images\.unsplash|localStorage|sessionStorage|fetch\(/);
  }
  assert.equal(titles.size, 3, 'Each intent needs a distinct title');
  assert.equal(descriptions.size, 3, 'Each intent needs a distinct description');
  const home = pages.get('/');
  assert.match(home, /Claridad en tus números/);
  assert.match(home, /class="hero-visual demo1-hero-visual"/);
  assert.match(home, /class="hero-photo demo1-hero-photo"/);
  assert.match(home, /Equipo profesional reunido en una oficina/);
  assert.doesNotMatch(home, /class="hero-caption"/);
  const beforeMain = home.slice(0, home.indexOf('<main'));
  const contact = home.match(/<section id="contacto"[\s\S]*?<\/section>/)?.[0];
  for (const region of [beforeMain, contact]) {
    assert.ok(region?.includes(`href="mailto:${email}"`));
    assert.ok(region?.includes(`href="${phoneHref}"`));
  }
  assert.match(home, /<form[^>]+onsubmit="return false"/);
  assert.match(home, /Formulario de vista previa\. No envía ni guarda información\./);
  assert.match(home, /type="email"[^>]+required/);
  assert.match(home, /role="status" aria-live="polite"/);
  assert.equal((home.match(/<details>/g) || []).length, 5);
  for (const client of ['AQUARA', 'CMFC', 'DELPA', 'ECEL', 'HFP', 'MRTHREE', 'SANTOS', 'TRAIRE', 'VENMATIC', 'VIPE']) {
    assert.equal((home.match(new RegExp(`alt="${client}"`, 'g')) || []).length, 2, client);
  }
  const about = pages.get('/nosotros/');
  assert.doesNotMatch(about, /<form\b/);
  for (const value of ['Integridad', 'Excelencia', 'Compromiso', 'Prevención', 'Confidencialidad', 'Cercanía', 'Innovación', 'Orientación a resultados']) assert.ok(about.includes(value), value);
  assert.match(about, /Jorge Luis Zavala Félix/);
  assert.match(about, /más de 20 años/);
  assert.match(about, /más de 5 años/);
  assert.match(about, /aria-current="page"/);
  const services = pages.get('/servicios/');
  assert.doesNotMatch(services, /<form\b|service-demo[23]/);
  const catalogSource = readFileSync(join(root, 'src/data/serviceCatalog.ts'), 'utf8');
  const serviceIds = [...catalogSource.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(serviceIds.length, 7);
  for (const id of serviceIds) assert.ok(services.includes(`id="${id}"`), id);
  assert.equal((services.match(/class="catalog-service"/g) || []).length, 6);
  assert.match(services, /id="diagnostico"/);
  assert.match(services, /href="\/#contacto"/);
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

test('the primary site preserves all three selected pages and safe preview behavior', () => {
  const { output } = build('preview', {});
  const pages = readPages(output);
  assertPageContent(pages, output);
  for (const html of pages.values()) {
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json|property="og:url"|property="og:image"/);
  }
  assert.equal(readFileSync(join(output, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
  assert.equal(existsSync(join(output, 'sitemap-index.xml')), false);
});

test('launch-ready metadata gives each primary page its own canonical and shares the confirmed business identity', () => {
  const domain = 'https://firma.pe';
  const { output } = build('production', { SITE_URL: domain, PUBLIC_LAUNCH_READY: 'true' });
  const pages = readPages(output);
  assertPageContent(pages, output);
  for (const [path, html] of pages) {
    assert.match(html, /<meta name="robots" content="index, follow">/);
    assert.ok(html.includes(`<link rel="canonical" href="${domain}${path}">`));
    assert.ok(html.includes(`property="og:url" content="${domain}${path}"`));
    assert.match(html, /property="og:image" content="https:\/\/firma\.pe\/_astro\//);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1]);
    assert.equal(schema['@type'], 'ProfessionalService');
    assert.equal(schema['@id'], `${domain}/#business`);
    assert.equal(schema.url, `${domain}/`);
    assert.equal(schema.name, 'J&J CONSULTORES Y AUDITORES');
    assert.equal(schema.email, email);
    assert.equal(schema.telephone, phone);
    assert.equal(schema.hasOfferCatalog.itemListElement.length, 3);
    assert.equal('address' in schema, false);
  }
  assert.match(readFileSync(join(output, 'robots.txt'), 'utf8'), /Allow: \/\nSitemap: https:\/\/firma\.pe\/sitemap-index\.xml/);
  const sitemap = readFileSync(join(output, 'sitemap-0.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).sort(), pagePaths.map((path) => `${domain}${path}`).sort());
  assert.doesNotMatch(sitemap, /demo[123]/);
});

test('approval packaging exports only the three generated pages and cannot inherit launch indexing', async () => {
  const result = spawnSync(process.execPath, [join(root, 'scripts/package-pages-preview.mjs')], {
    cwd: root, env: { ...process.env, SITE_URL: 'https://firma.pe', PUBLIC_LAUNCH_READY: 'true' }, encoding: 'utf8', timeout: 120_000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = await validatePayload(packageOutput);
  assert.deepEqual(report.files.filter((name) => name.endsWith('.html')), [...routes].sort());
  assert.ok(report.files.includes('.nojekyll'));
  const home = readFileSync(join(packageOutput, 'index.html'), 'utf8');
  assert.match(home, /href="\/auditores-preview\/nosotros\/"/);
  assert.match(home, /href="\/auditores-preview\/servicios\/"/);
});
