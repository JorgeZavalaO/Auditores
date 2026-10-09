import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { allowedFile, buildEnvironment, packagePayload, prefix, relocateText, relocateUrl,
  routes, srcsetCandidates, validatePayload } from '../scripts/package-pages-preview.mjs';

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'auditores-pages-'));
  t.after(() => {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('auditores-pages-'));
    return rm(directory, { recursive: true, force: true });
  });
  for (const route of routes) {
    const file = path.join(directory, route);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, '<meta name="robots" content="noindex, nofollow"><div id="inicio"></div>');
  }
  await mkdir(path.join(directory, '_astro'));
  await writeFile(path.join(directory, '_astro', 'image.webp'), 'image');
  await writeFile(path.join(directory, '_astro', 'font.woff2'), 'font');
  await writeFile(path.join(directory, '_astro', 'style.css'), '@font-face{src:url(/_astro/font.woff2)}');
  await writeFile(path.join(directory, '_astro', 'local.js'), 'console.log("preview");');
  return directory;
}

test('relocation preserves external, protocol-relative, data and fragment URLs', () => {
  for (const url of ['https://example.org/a', '//cdn.example.org/a', 'data:image/png;base64,abc', '#inicio', 'relative.css']) {
    assert.equal(relocateUrl(url), url);
  }
  assert.equal(relocateUrl('/demo3/#firma'), `${prefix}demo3/#firma`);
  assert.equal(relocateUrl(`${prefix}demo3/`), `${prefix}demo3/`);
  const html = '<img src="/_astro/a.webp" srcset="/_astro/a.webp 480w, /_astro/b.webp 800w"><a href="#inicio">Link</a>';
  assert.match(relocateText(html, '.html'), /srcset="\/auditores-preview\/_astro\/a.webp 480w, \/auditores-preview\/_astro\/b.webp 800w"/);
  assert.equal(relocateText("a{background:url('/_astro/a.webp')}b{src:url(data:font/woff;base64,abc)}", '.css'),
    "a{background:url('/auditores-preview/_astro/a.webp')}b{src:url(data:font/woff;base64,abc)}");
});

test('srcset parser handles data commas, density and unsupported syntax', () => {
  assert.deepEqual(srcsetCandidates('data:image/png;base64,abc 1x, /photo.webp 2x'), [
    { url: 'data:image/png;base64,abc', descriptor: '1x' }, { url: '/photo.webp', descriptor: '2x' },
  ]);
  assert.deepEqual(srcsetCandidates('/a.webp, /b.webp'), [
    { url: '/a.webp', descriptor: '' }, { url: '/b.webp', descriptor: '' },
  ]);
  assert.throws(() => srcsetCandidates('/a.webp broken'), /descriptor/);
  assert.throws(() => srcsetCandidates('/a.webp,/b.webp'), /Unsupported/);
});

test('publication allowlist excludes source, secrets and documents', () => {
  for (const file of ['.env', 'source.js', 'company.docx', 'odd/tasks/preview.md', '_astro/file.map', '_astro/../.env', 'extra/index.html']) {
    assert.equal(allowedFile(file), false, file);
  }
  for (const file of ['index.html', 'demo2/servicios/index.html', 'demo1/nosotros/index.html', '_astro/font.woff', '_astro/image.webp', '.nojekyll']) {
    assert.equal(allowedFile(file), true, file);
  }
  assert.deepEqual(buildEnvironment({ PATH: 'local', PUBLIC_LAUNCH_READY: 'true', SITE_URL: 'https://production.com', PUBLIC_SECRET: 'secret' }),
    { PATH: 'local', NODE_ENV: 'production', PUBLIC_LAUNCH_READY: 'false', SITE_URL: '' });
});

test('package resolves all eight routes, fragments, srcsets, fonts and local scripts', async t => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, 'index.html'), '<meta name="robots" content="noindex, nofollow"><div id="inicio"></div>'
    + '<a href="/demo3/#inicio">Demo</a><a href="/demo1/nosotros/#inicio">Nosotros</a><a href="#inicio">Home</a><img src="/_astro/image.webp" srcset="/_astro/image.webp 1x, /_astro/image.webp 2x">'
    + '<link href="/_astro/style.css"><script src="/_astro/local.js"></script>');
  const report = await packagePayload(directory);
  assert.equal(report.files.filter(file => file.endsWith('.html')).length, 8);
  assert.ok(routes.includes('demo1/nosotros/index.html'));
  assert.match(await readFile(path.join(directory, 'index.html'), 'utf8'), /href="\/auditores-preview\/demo1\/nosotros\/#inicio"/);
  assert.ok(report.bytes > 0);
  assert.match(await readFile(path.join(directory, '_astro/style.css'), 'utf8'), /auditores-preview/);
  assert.equal(await readFile(path.join(directory, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\n');
  assert.ok(report.files.includes('.nojekyll'));
});

test('validation fails closed on missing routes, bad metadata, unresolved references and extra files', async t => {
  const directory = await fixture(t);
  await packagePayload(directory);
  const target = path.join(directory, 'index.html');
  const safe = await readFile(target, 'utf8');
  for (const [content, error] of [
    [safe.replace('noindex, nofollow', 'index, follow'), /noindex/],
    [safe + '<link rel="canonical" href="https://example.org">', /Launch metadata/],
    [safe + '<script type="application/ld+json">{}</script>', /Launch metadata/],
    [safe + '<a href="/demo1/">Outside</a>', /escapes/],
    [safe + `<img src="${prefix}_astro/missing.webp">`, /Unresolved/],
    [safe + `<a href="${prefix}demo1/#missing">Missing</a>`, /fragment/],
    [safe + '<a href="javascript:alert(1)">Unsafe</a>', /Unsupported URL/],
    [safe + '<img src=/_astro/image.webp>', /unquoted/],
    [safe + '<script>fetch("/api")</script>', /script resource/],
    [safe + '<style>@import "other.css";</style>', /CSS import/],
  ]) {
    await writeFile(target, content);
    await assert.rejects(validatePayload(directory), error);
  }
  await writeFile(target, safe);
  await writeFile(path.join(directory, 'secret.env'), 'secret');
  await assert.rejects(validatePayload(directory), /Unexpected publication file/);
  await rm(path.join(directory, 'secret.env'));
  await rm(path.join(directory, 'demo2/index.html'));
  await assert.rejects(validatePayload(directory), /Missing preview route/);
});
