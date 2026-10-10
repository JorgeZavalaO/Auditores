import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const dataSource = readFileSync(new URL('src/data/aboutCompany.ts', root), 'utf8');
const exports = {};
runInNewContext(ts.transpileModule(dataSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { aboutCompany } = exports;

// Read the original OOXML package without changing or rendering the supplied document.
function wordDocumentXml() {
  const archive = readFileSync(new URL(aboutCompany.sourceDocument, root));
  let end = archive.length - 22;
  while (end >= 0 && archive.readUInt32LE(end) !== 0x06054b50) end--;
  assert.ok(end >= 0, 'Word ZIP directory must exist');
  let offset = archive.readUInt32LE(end + 16);
  while (archive.readUInt32LE(offset) === 0x02014b50) {
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const name = archive.subarray(offset + 46, offset + 46 + nameLength).toString();
    if (name === 'word/document.xml') {
      const local = archive.readUInt32LE(offset + 42);
      const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
      const compressed = archive.subarray(start, start + archive.readUInt32LE(offset + 20));
      const method = archive.readUInt16LE(offset + 10);
      assert.ok(method === 0 || method === 8, 'Supported OOXML compression');
      return (method === 8 ? inflateRawSync(compressed) : compressed).toString('utf8');
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  assert.fail('Word document.xml must exist');
}

const wordText = wordDocumentXml().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');

test('institutional data faithfully retains the supplied mission, vision, eight values and partner facts', () => {
  for (const heading of ['Quiénes Somos', 'Nuestra Visión', 'Nuestra Misión', 'Nuestros Valores']) assert.ok(wordText.includes(heading));
  assert.ok(wordText.includes(aboutCompany.legalName));
  assert.equal(aboutCompany.country, 'Perú');
  assert.equal(aboutCompany.partnerExperienceYears, 20);
  assert.match(wordText, /Sus socios cuentan con 20 años de experiencia/);
  assert.match(aboutCompany.story[1], /Nuestros socios cuentan con 20 años de experiencia/);
  assert.deepEqual(Array.from(aboutCompany.sectors), ['Comercial', 'Industrial', 'Construcción']);
  assert.ok(wordText.includes(aboutCompany.vision), 'Vision is the actual supplied aspiration, not an invented claim');
  assert.ok(wordText.includes(aboutCompany.mission.replace('prevenir contingencias', 'evitar contingencias')));
  const values = ['Integridad', 'Excelencia', 'Compromiso', 'Prevención', 'Confidencialidad', 'Cercanía', 'Innovación', 'Orientación a resultados'];
  assert.deepEqual(Array.from(aboutCompany.values, value => value.title), values);
  for (const value of values) assert.ok(wordText.includes(value.toLocaleUpperCase('es')), `Value must occur in the Word: ${value}`);
  assert.match(dataSource, /does not establish a founding date or firm age/);
  assert.doesNotMatch(JSON.stringify(aboutCompany), /fundad[ao] en|desde 20\d\d|ISO 9001|equipo certificado/i);
});

test('the institutional composition retains readable text and a separate brand-led intent', () => {
  const page = readFileSync(new URL('src/components/AboutCompanyPage.astro', root), 'utf8');
  assert.match(page, /<BaseLayout demo title=\{`Nosotros \|/);
  assert.match(page, /\.ac-values-grid p \{ font-size: 14px; line-height: 1.85; \}/);
  assert.match(page, /\.ac-purpose-grid p \{ color: #e4e8ff;/);
  assert.match(page, /Fotografía ilustrativa · No representa al equipo de la firma/);
  assert.doesNotMatch(page, /ServiceCatalog|<form\b|<script\b|animation:/);
});

test('the pending carousel source, behavior test and documentation remain intact during the about change', () => {
  const snapshot = new URL('.astro/demo1-about-baseline.json', root);
  if (!existsSync(snapshot)) return;
  const previous = JSON.parse(readFileSync(snapshot, 'utf8'));
  for (const path of ['src/components/ClientLogoCarousel.astro', 'tests/client-carousel.test.mjs']) {
    assert.equal(readFileSync(new URL(path, root), 'utf8'), previous[path], `About changed pending carousel bytes: ${path}`);
  }
  const readme = readFileSync(new URL('README.md', root), 'utf8');
  for (const beginning of ['The selected `/demo1/` now uses', 'The baseline is a visible static logo grid', 'Hover within the **logo viewport only**']) {
    const paragraph = previous['README.md'].split(/\r?\n/).find(line => line.startsWith(beginning));
    assert.ok(paragraph && readme.includes(paragraph), 'Pending carousel documentation must remain exact');
  }
});

test('CEO profile uses the confirmed portrait and supplied professional facts', () => {
  assert.equal(aboutCompany.ceo.name, 'Jorge Luis Zavala Félix');
  assert.equal(aboutCompany.ceo.designation, 'CEO');
  assert.deepEqual(Array.from(aboutCompany.ceo.credentials), ['Contador Público Colegiado', 'Auditor Independiente']);
  assert.match(aboutCompany.ceo.biography[0], /más de 20 años/);
  assert.match(aboutCompany.ceo.biography[1], /más de 5 años/);
  assert.ok(existsSync(new URL('src/assets/photos/collaborators/jorge-zavala-felix-cpc-auditor.png', root)));
  assert.equal('teamPreview' in aboutCompany, false);
  const page = readFileSync(new URL('src/components/AboutCompanyPage.astro', root), 'utf8');
  assert.match(page, /<section id="equipo" class="ac-ceo" aria-labelledby="ceo-section-title">/);
  assert.match(page, /<div class="ac-ceo-inner">/);
  assert.doesNotMatch(page, /<section id="equipo" class="[^"]*ac-container/);
  assert.match(page, /\.ac-ceo \{ background: #eef2fa; padding-block: 72px;/);
  assert.match(page, /\.ac-ceo-inner \{ width: min\(1160px, calc\(100% - 80px\)\); margin-inline: auto; \}/);
  assert.match(page, /<span class="ac-eyebrow">NUESTRO CEO<\/span>/);
  assert.match(page, /<h2 id="ceo-section-title">Experiencia que guía nuestra firma<\/h2>/);
  assert.match(page, /<p class="ac-ceo-intro">Conoce a Jorge Luis Zavala Félix, quien lidera J&J CONSULTORES Y AUDITORES\.<\/p>/);
  assert.match(page, /<h3>\{aboutCompany\.ceo\.name\}<\/h3>/);
  assert.match(page, /aboutCompany\.ceo\.credentials\.map/);
  assert.doesNotMatch(page, /LIDERAZGO|<h2 id="ceo-name">/);
  assert.doesNotMatch(page, /teamPreview|fotografía se repite solo para esta demo|Nombre y especialidad por confirmar/);
  assert.match(page, /\.ac-ceo-photo > img \{[^}]*height: 460px;[^}]*object-position: center top;/s);
  assert.match(page, /\.ac-ceo-photo > img \{ height: 280px; \}/);
  assert.doesNotMatch(page, /\.ac-team-(?:card|grid|disclosure)/);
});