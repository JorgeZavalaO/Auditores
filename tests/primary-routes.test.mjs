import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { allowedFile, routes } from '../scripts/package-pages-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const pages = join(root, 'src/pages');

function htmlSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlSources(path) : path.endsWith('.astro') ? [relative(pages, path).replaceAll('\\', '/')] : [];
  }).sort();
}

test('the public site has only the selected home, about and services page sources', () => {
  assert.deepEqual(htmlSources(pages), ['index.astro', 'nosotros/index.astro', 'servicios/index.astro']);
});

test('the preview package accepts the three primary routes and rejects every old demo route', () => {
  assert.deepEqual(routes, ['index.html', 'nosotros/index.html', 'servicios/index.html']);
  for (const demo of [1, 2, 3]) {
    for (const suffix of ['index.html', 'nosotros/index.html', 'servicios/index.html']) {
      assert.equal(allowedFile(`demo${demo}/${suffix}`), false);
    }
  }
});

test('the shared business identity uses the confirmed company and real contact channels', () => {
  const data = readFileSync(join(root, 'src/data/site.ts'), 'utf8');
  assert.match(data, /name: 'J&J CONSULTORES Y AUDITORES'/);
  assert.match(data, /email: 'jzavala@jjconsultores\.pe'/);
  assert.match(data, /phone: '\+51 956 481 871'/);
  assert.match(data, /contactIsExample: false/);
});
