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

function assertSemanticDemo(html, output, requireForm = true) {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<html lang="es-PE">/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, 'Demo IDs must be unique');
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(uniqueIds.has(match[1]), `Missing demo anchor: ${match[1]}`);
  }
  for (const match of html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)) {
    assert.ok(match[1].startsWith('/_astro/'), 'Demo images must be local');
    assert.ok(existsSync(join(output, match[1])), `Missing demo image: ${match[1]}`);
    assert.match(match[0], /width="\d+"/);
    assert.match(match[0], /height="\d+"/);
    assert.match(match[0], /alt="[^"]+"/);
  }
  if (requireForm) {
    assert.match(html, /<form[^>]+onsubmit="return false"/);
    assert.match(html, /No envía ni guarda información/);
    assert.match(html, /type="email"[^>]+required/);
    assert.match(html, /role="status" aria-live="polite"/);
  } else assert.doesNotMatch(html, /<form\b/);
  assert.match(html, /Datos de ejemplo/);
  assert.doesNotMatch(html, /href="(?:mailto:|tel:|https:\/\/wa\.me)/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|fetch\(/);
}

function assertNotIndexable(html) {
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json|property="og:url"/);
}

function serviceOptions(html) {
  const select = html.match(/<select\b[^>]*name="service"[^>]*>([\s\S]*?)<\/select>/)?.[1];
  assert.ok(select, 'Service selector must exist');
  return [...select.matchAll(/<option\b[^>]*>([^<]*)<\/option>/g)].map((match) => match[1]);
}

function normalizeVisibleBody(html) {
  const body = html.includes('<body>') ? html.match(/<body>([\s\S]*?)<\/body>/)?.[1] : html;
  assert.ok(body);
  return body.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/\sdata-astro-cid-[a-z0-9]+(?:="[^"]*")?/gi, '');
}

function normalizeVisibleMain(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main);
  return normalizeVisibleBody(main);
}

function normalizeHistoricalHome(html, route) {
  const body = normalizeVisibleBody(html);
  if (route === 'demo2') return body.replace('<a href="/demo2/servicios/">Servicios</a>', '');
  return body.replace(`href="/${route}/servicios/"`, 'href="#servicios"');
}

function assertLocalDestinations(output) {
  const pages = ['/', '/demo1/', '/demo2/', '/demo3/', '/demo1/servicios/', '/demo2/servicios/', '/demo3/servicios/'];
  for (const page of pages) {
    const html = readFileSync(join(output, page, 'index.html'), 'utf8');
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;
      const target = new URL(href, `https://preview.invalid${page}`);
      const file = target.pathname.endsWith('/') ? join(output, target.pathname, 'index.html') : join(output, target.pathname);
      assert.ok(existsSync(file), `Missing destination ${href} from ${page}`);
      if (target.hash) {
        const destination = readFileSync(file, 'utf8');
        assert.ok(destination.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `Missing fragment ${href} from ${page}`);
      }
    }
  }
}

function assertServicePages(output) {
  const categories = [
    'Auditoría financiera y tributaria',
    'Outsourcing contable y financiero',
    'Gestión laboral y administración de planillas',
    'Implementación y optimización de procesos contables',
    'Regularización contable y tributaria',
    'Consultoría en sistemas de gestión contable (ERP)',
    'Diagnóstico contable y tributario',
  ];
  for (const variant of [1, 2, 3]) {
    const home = `/demo${variant}/`;
    const html = readFileSync(join(output, home, 'servicios', 'index.html'), 'utf8');
    assertSemanticDemo(html, output, false);
    assertNotIndexable(html);
    assertConfirmedBrand(html);
    for (const category of categories) assert.ok(html.includes(`>${category}</h2>`), `Missing detailed service: ${category}`);
    for (const id of ['auditoria', 'outsourcing', 'planillas', 'procesos', 'regularizacion', 'erp', 'diagnostico']) {
      assert.match(html, new RegExp(`id="${id}"`));
      assert.match(html, new RegExp(`href="#${id}"`));
    }
    assert.equal((html.match(/>Alcance del servicio<\/h3>/g) || []).length, 6);
    assert.equal((html.match(/>Valor para tu empresa<\/h3>/g) || []).length, 6);
    assert.match(html, /GRATUITO/);
    assert.match(html, /Solicitar diagnóstico gratuito/);
    assert.ok(html.includes(`href="${home}#contacto"`));
    assert.ok(html.includes(`href="${home}"`));
    assert.match(html, /T-Registro, PLAME/);
    assert.match(html, /Diseñamos, implementamos, revisamos y mejoramos/);
    assert.match(html, /Plan de acción con prioridades concretas/);
    assert.match(html, new RegExp(`class="services-page service-demo${variant}"`));
    assert.doesNotMatch(html, /Big ?Four|ISO 9001|garantizamos|href="(?:mailto:|tel:)/i);
    const landing = readFileSync(join(output, home, 'index.html'), 'utf8');
    assert.ok(landing.includes(`href="${home}servicios/"`), `Home must link its own services page: ${home}`);
  }
  assertLocalDestinations(output);
}

function assertConfirmedBrand(html) {
  assert.match(html, /property="og:site_name" content="J&amp;J CONSULTORES Y AUDITORES"/);
  assert.match(html, /<title>[^<]*J&amp;J CONSULTORES Y AUDITORES<\/title>/);
  assert.match(html, /name="description" content="[^"]*J&amp;J CONSULTORES Y AUDITORES/);
  assert.match(html, /href="\/jj-favicon.svg"/);
  assert.equal((html.match(/aria-label="J&(?:amp;)?J CONSULTORES Y AUDITORES, inicio"/g) || []).length, 2, 'Header and footer must expose the full confirmed name');
  assert.match(html, /class="jj-brand light"/);
  assert.doesNotMatch(html, /Identidad (?:comercial )?provisional/);
  assert.match(html, /Vista previa|vista previa/);
  assert.match(html, /Datos de ejemplo|Contactos de ejemplo/);
}

function assertPortfolioAndHistoricalDefaults(demoTwo, demoThree) {
  const portfolio = [
    'Auditoría financiera y tributaria',
    'Outsourcing contable y financiero',
    'Gestión laboral y administración de planillas',
    'Implementación y optimización de procesos contables',
    'Regularización contable y tributaria',
    'Consultoría en sistemas de gestión contable (ERP)',
  ];
  const headings = [...demoThree.matchAll(/<h3\b[^>]*>([^<]*)<\/h3>/g)].map((match) => match[1]);
  for (const service of portfolio) assert.ok(headings.includes(service), `Missing service H3: ${service}`);
  assert.ok(headings.includes('Diagnóstico contable y tributario'));
  assert.match(demoThree, /GRATUITO/);
  assert.match(demoThree, /href="\/demo3\/servicios\/"/);
  assert.match(demoThree, /id="servicios"/);
  assert.match(demoThree, /Diseñamos, implementamos y mejoramos procedimientos/);
  assert.deepEqual(serviceOptions(demoThree), ['Selecciona un servicio', ...portfolio, 'Diagnóstico contable y tributario gratuito']);
  assert.match(demoThree, /Conozcamos el contexto de tu empresa y definamos el alcance del servicio que necesitas\./);
  assert.match(demoThree, /placeholder="Cuéntanos qué necesita tu organización"/);
  assert.deepEqual(serviceOptions(demoTwo), [
    'Selecciona una especialidad', 'Auditoría financiera', 'Auditoría tributaria',
    'Control interno y procesos', 'Evaluación del alcance de auditoría',
  ]);
  for (const copy of [
    'Especialidad de interés', 'Contexto del encargo', 'Conversemos sobre tu empresa',
    'Una propuesta a la medida de tu organización.', 'Probar solicitud de propuesta',
    'Formulario de vista previa. No envía ni guarda información.',
    'Datos de ejemplo. Canales no habilitados en esta demostración.',
    'Conozcamos el contexto de tu empresa y definamos el alcance de una evaluación independiente.',
    'placeholder="Cuéntanos qué necesita evaluar tu organización"',
    'Vista previa: la solicitud es válida. No se ha enviado ni guardado información.',
  ]) assert.ok(demoTwo.includes(copy), `Historical contact copy changed: ${copy}`);
  assert.doesNotMatch(demoTwo, /href="#servicios"|Outsourcing contable y financiero/);
}

test('service dark surfaces explicitly override global paragraph colors with accessible contrast', () => {
  const source = readFileSync(join(root, 'src/components/ServicesPage.astro'), 'utf8');
  assert.match(source, /\.service-demo2 \.sp-hero-copy > p \{ color: #e5e9ff; \}/);
  assert.match(source, /\.sp-footer p \{[^}]*color: #d5dcf5;/);
  const luminance = (hex) => {
    const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  for (const [foreground, background] of [['e5e9ff', '0a1267'], ['d5dcf5', '080e45']]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, 'Small paragraph contrast must pass WCAG AA');
  }
});

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
  const demoOne = readFileSync(join(output, 'demo1', 'index.html'), 'utf8');
  const demoTwo = readFileSync(join(output, 'demo2', 'index.html'), 'utf8');
  const demoThree = readFileSync(join(output, 'demo3', 'index.html'), 'utf8');
  for (const demo of [demoOne, demoTwo, demoThree]) {
    assertSemanticDemo(demo, output);
    assertNotIndexable(demo);
  }
  assert.equal(normalizeVisibleMain(demoOne), normalizeVisibleMain(html), 'Root and demo1 must have identical main content');
  assert.match(demoTwo, /<title>Auditoría financiera y tributaria para empresas \| J&amp;J CONSULTORES Y AUDITORES<\/title>/);
  assert.match(demoTwo, /PARA MEDIANAS Y GRANDES EMPRESAS/);
  assert.match(demoTwo, /Una mirada independiente/);
  assert.match(demoTwo, /Solicitar propuesta/);
  assert.match(demoTwo, /Auditoría financiera/);
  assert.match(demoTwo, /Auditoría tributaria/);
  assert.match(demoTwo, /Control interno y procesos/);
  assert.match(demoTwo, /socios cuentan con 20 años de experiencia/);
  assert.match(demoTwo, /id="corporate-proposal-form"/);
  assert.match(demoTwo, /aria-controls="corporate-navigation" aria-expanded="false"/);
  assert.equal((demoTwo.match(/<details[^>]*>/g) || []).length, 3);
  assert.doesNotMatch(demoTwo, /Big ?Four|NIIF|ISO 9001|clientes corporativos líderes/i);
  assert.doesNotMatch(demoTwo, /class="hero-copy"|class="service-card"/);
  assert.match(demoThree, /<title>Auditoría empresarial en Perú \| J&amp;J CONSULTORES Y AUDITORES<\/title>/);
  assert.match(demoThree, /property="og:site_name" content="J&amp;J CONSULTORES Y AUDITORES"/);
  assert.match(demoThree, /<link rel="icon" type="image\/svg\+xml" href="\/jj-favicon.svg"/);
  assert.ok(existsSync(join(output, 'jj-favicon.svg')));
  assert.match(demoThree, /Auditoría que aporta/);
  assert.match(demoThree, /PARA MEDIANAS/);
  assert.match(demoThree, /socios cuentan con 20 años de experiencia/);
  assert.match(demoThree, /aria-controls="editorial-navigation" aria-expanded="false"/);
  assert.match(demoThree, /data-editorial-reveal/);
  assert.match(demoThree, /Ilustración de nuestro enfoque/);
  assert.equal((demoThree.match(/<details[^>]*>/g) || []).length, 3);
  assert.doesNotMatch(demoThree, /Identidad (?:comercial )?provisional|Big ?Four|NIIF|ISO 9001/i);
  assert.doesNotMatch(demoThree, /class="c-hero"|class="hero-copy"/);
  assertPortfolioAndHistoricalDefaults(demoTwo, demoThree);
  const snapshotPath = join(root, '.astro', 'demo3-t4-render-baseline.json');
  if (existsSync(snapshotPath)) {
    const previous = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    for (const [route, current] of Object.entries({ root: html, demo1: demoOne, demo2: demoTwo })) {
      if (route === 'root') assert.equal(normalizeVisibleBody(current), normalizeVisibleBody(previous[route]), 'Historical root changed');
      else assert.equal(normalizeVisibleMain(current), normalizeVisibleMain(previous[route]), `Historical demo main changed: ${route}`);
    }
  }
  for (const demo of [demoOne, demoTwo, demoThree]) assertConfirmedBrand(demo);
  assert.match(html, /property="og:site_name" content="Auditores"/);
  assert.match(html, /href="\/favicon.svg"/);
  const brandSnapshotPath = join(root, '.astro', 'demo-branding-render-baseline.json');
  if (existsSync(brandSnapshotPath)) {
    const previous = JSON.parse(readFileSync(brandSnapshotPath, 'utf8'));
    for (const [route, current] of Object.entries({ root: html, demo3: demoThree })) {
      assert.equal(normalizeHistoricalHome(current, route), normalizeVisibleBody(previous[route]), `Unaffected rendered body changed outside authorized navigation: ${route}`);
      assert.equal(current.match(/<title>(.*?)<\/title>/)?.[1], previous[route].match(/<title>(.*?)<\/title>/)?.[1]);
    }
    for (const [route, current] of Object.entries({ demo1: demoOne, demo2: demoTwo })) {
      assert.equal(normalizeVisibleMain(current), normalizeVisibleMain(previous[route]), `Branding changed service content: ${route}`);
    }
  }
  const servicesSnapshotPath = join(root, '.astro', 'demo-services-render-baseline.json');
  if (existsSync(servicesSnapshotPath)) {
    const previous = JSON.parse(readFileSync(servicesSnapshotPath, 'utf8'));
    assert.equal(normalizeVisibleBody(html), normalizeVisibleBody(previous.root), 'Services changed root');
    for (const [route, current] of Object.entries({ demo1: demoOne, demo2: demoTwo, demo3: demoThree })) {
      assert.equal(normalizeVisibleMain(current), normalizeVisibleMain(previous[route]), `Services changed home content or forms: ${route}`);
      assert.equal(normalizeHistoricalHome(current, route), normalizeHistoricalHome(previous[route], route), `Services changed home outside authorized navigation: ${route}`);
    }
  }
  assertServicePages(output);
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
  assert.doesNotMatch(sitemap, /demo1|demo2|demo3/);
  for (const route of ['demo1', 'demo2', 'demo3']) {
    const demo = readFileSync(join(output, route, 'index.html'), 'utf8');
    assertSemanticDemo(demo, output);
    assertNotIndexable(demo);
    assert.doesNotMatch(demo, /property="og:image"|name="twitter:image"/);
    assertConfirmedBrand(demo);
  }
  assertPortfolioAndHistoricalDefaults(
    readFileSync(join(output, 'demo2', 'index.html'), 'utf8'),
    readFileSync(join(output, 'demo3', 'index.html'), 'utf8'),
  );
  assertServicePages(output);
});
