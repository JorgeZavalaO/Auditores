import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/components/EditorialLanding.astro'), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
const executable = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function element() {
  const classes = new Set();
  const listeners = new Map();
  return {
    classes,
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    addEventListener: (event, callback) => listeners.set(event, callback),
    fire: (event) => listeners.get(event)?.(),
  };
}

function motionHarness({ reduced = false, mediaSupported = true, observerSupported = true, legacyListener = false } = {}) {
  const section = element();
  const diagram = element();
  const observers = [];
  let preferenceChange;
  const preference = {
    matches: reduced,
  };
  if (legacyListener) preference.addListener = (listener) => { preferenceChange = listener; };
  else preference.addEventListener = (event, listener) => { if (event === 'change') preferenceChange = listener; };
  class FakeObserver {
    constructor(callback) { this.callback = callback; this.disconnected = false; this.unobserved = []; observers.push(this); }
    observe() {}
    unobserve(target) { this.unobserved.push(target); }
    disconnect() { this.disconnected = true; }
  }
  const window = {};
  if (mediaSupported) window.matchMedia = () => preference;
  if (observerSupported) window.IntersectionObserver = FakeObserver;
  runInNewContext(executable, {
    window,
    IntersectionObserver: observerSupported ? FakeObserver : undefined,
    document: {
      querySelector: (selector) => selector === '.e-framework' ? diagram : null,
      querySelectorAll: () => [section],
    },
  });
  return { section, diagram, observers, preference, change: () => preferenceChange?.() };
}

test('approved demo branding and immutable historical styles retain their source contracts', () => {
  const baselines = {
    'src/components/DemoOneLanding.astro': 'EE56688EEFFF916ECFAFE6F4BAD679A50E863F38091FF8961F03C037C32B9B1B',
    'src/components/CorporateLanding.astro': '27EF9BDE491BE91F8F66CA142C39E171263F70F4F26712324243E24AE4D1A4C3',
    'src/data/site.ts': '85E8759A6EE8D7878FBB40DA33011C1A5BF70D3AFD355537AE521EA2D1D301CD',
    'src/data/corporate.ts': '817CF89593564CF596F9E8E8BC35ADD4D91BED3ADF2E1DB3317365021BB241E3',
    'src/styles/global.css': '027C0512D299F5FB4D4CB2299717CE1272D76C6D34A898695BF3E1F53082FE7D',
    'src/components/Brand.astro': '5EA541FFEF7ECF09450A9CA67670FC34543A4709B099D0DBC4DCC6D35A05D906',
  };
  for (const [path, expected] of Object.entries(baselines)) {
    const actual = createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex').toUpperCase();
    assert.equal(actual, expected, `Historical source changed: ${path}`);
  }
});

test('motion starts from visible static content and never animates the H1, LCP image or form', () => {
  assert.match(source, /\[data-editorial-reveal\] \{ opacity: 1; transform: none; \}/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(source, /animation: editorial-enter 650ms ease-out 1/);
  assert.match(source, /animation: editorial-scan 1900ms ease-in-out 1/);
  assert.doesNotMatch(source, /infinite|setInterval|requestAnimationFrame/);
  const contentEntrance = source.match(/@keyframes editorial-enter \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(contentEntrance);
  assert.doesNotMatch(contentEntrance, /opacity: 0(?:;|\s)/);
  assert.doesNotMatch(source, /<(?:h1|Image|CorporateContact)[^>]+data-editorial-reveal/);
  assert.match(source, /if \(reducedMotion\.matches\) return/);
  assert.match(source, /typeof window\.IntersectionObserver === 'function'/);
  assert.match(source, /typeof window\.matchMedia === 'function'/);
});

test('missing optional browser APIs keep content visible without throwing', () => {
  const noMedia = motionHarness({ mediaSupported: false });
  assert.equal(noMedia.observers.length, 0);
  assert.equal(noMedia.section.classes.size, 0);
  assert.equal(noMedia.diagram.classes.size, 0);
  const noObserver = motionHarness({ observerSupported: false });
  assert.equal(noObserver.observers.length, 0);
  assert.equal(noObserver.section.classes.size, 0);
});

test('reduced motion disables entrances and scan from initial page load', () => {
  const runtime = motionHarness({ reduced: true });
  assert.equal(runtime.observers.length, 0);
  assert.equal(runtime.section.classes.size, 0);
  assert.equal(runtime.diagram.classes.size, 0);
});

test('entrances run once and changing motion preferences restores static content', () => {
  const runtime = motionHarness();
  assert.equal(runtime.observers.length, 1);
  assert.ok(runtime.diagram.classes.has('e-scanning'));
  const observer = runtime.observers[0];
  observer.callback([{ target: runtime.section, isIntersecting: true }]);
  assert.ok(runtime.section.classes.has('e-entering'));
  assert.equal(observer.unobserved.length, 1);
  observer.callback([{ target: runtime.section, isIntersecting: true }]);
  assert.equal(observer.unobserved.length, 1, 'An entrance must not replay');
  runtime.preference.matches = true;
  runtime.change();
  assert.ok(observer.disconnected);
  assert.equal(runtime.section.classes.size, 0);
  assert.equal(runtime.diagram.classes.size, 0);
  runtime.preference.matches = false;
  runtime.change();
  assert.equal(runtime.diagram.classes.size, 0, 'Decorative scan must not replay');
});

test('finite animation completion cleans up its enhancement classes', () => {
  const runtime = motionHarness();
  runtime.observers[0].callback([{ target: runtime.section, isIntersecting: true }]);
  runtime.section.fire('animationend');
  runtime.diagram.fire('animationend');
  assert.equal(runtime.section.classes.size, 0);
  assert.equal(runtime.diagram.classes.size, 0);
  runtime.observers[0].callback([{ target: runtime.section, isIntersecting: true }]);
  assert.equal(runtime.section.classes.size, 0, 'Completed content entrance must not replay');
});

test('legacy media-query listeners also honor preference changes', () => {
  const runtime = motionHarness({ legacyListener: true });
  assert.ok(runtime.diagram.classes.has('e-scanning'));
  runtime.preference.matches = true;
  runtime.change();
  assert.equal(runtime.diagram.classes.size, 0);
  assert.ok(runtime.observers[0].disconnected);
});
