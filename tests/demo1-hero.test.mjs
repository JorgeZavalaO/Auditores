import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/components/DemoOneLanding.astro'), 'utf8');
const css = readFileSync(resolve(root, 'src/styles/global.css'), 'utf8');

function rule(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Missing scoped rule: ${selector}`);
  return css.slice(start, css.indexOf('}', start) + 1);
}

test('Demo 1 brightens the photograph without changing the approved crop or the base photo', () => {
  const photo = rule('.hero-photo.demo1-hero-photo img');
  assert.match(photo, /object-position: 95% center;/);
  assert.match(photo, /filter: brightness\(1\.22\) saturate\(1\.04\);/);
  assert.doesNotMatch(rule('.hero-photo img'), /filter:/);
  assert.match(source, /src=\{demoOneHero\}/);
});

test('Demo 1 reduces its blue backdrop without changing the other hero compositions', () => {
  assert.match(source, /class="hero-visual demo1-hero-visual"/);
  const backdrop = rule('.demo1-hero-visual .hero-blue-shape');
  assert.match(backdrop, /width: calc\(100% \+ 96px\);/);
  assert.match(backdrop, /max-width: 680px;/);
  assert.match(rule('.hero-blue-shape'), /width: 780px;/);
});

test('Demo 1 improves the experience label and removes only its decorative caption', () => {
  const label = rule('.demo1-hero-visual .experience-badge > span');
  assert.match(label, /font-size: 12px;/);
  assert.match(label, /color: var\(--navy\);/);
  assert.doesNotMatch(source, /class="hero-caption"/);
  assert.match(rule('.experience-badge > span'), /font-size: 10px;/);
});
