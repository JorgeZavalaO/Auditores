import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/ClientLogoCarousel.astro', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const executable = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness({ javascript = true, missingViewport = false, media = 'missing' } = {}) {
  const classes = new Set();
  const events = new Map();
  const attributes = new Map();
  const instructions = { id: 'test-instructions', hidden: true, textContent: '' };
  const viewport = {
    addEventListener: (name, action) => events.set(name, action),
    setAttribute: (name, value) => attributes.set(name, value),
  };
  const carousel = {
    classList: {
      add: (name) => {
        assert.ok(events.has('keydown'), 'Bind keyboard pause before starting motion');
        assert.equal(viewport.tabIndex, 0);
        assert.equal(attributes.get('aria-describedby'), instructions.id);
        classes.add(name);
      },
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
    },
    querySelector: (selector) => selector === '.logo-viewport' ? missingViewport ? null : viewport : instructions,
  };
  const window = {};
  if (media !== 'missing') window.matchMedia = () => {
    if (media === 'throwing') throw new Error('Unavailable API');
    return { matches: media === 'reduced' };
  };
  if (javascript) runInNewContext(executable, { window, document: { querySelectorAll: () => [carousel] } });
  return {
    classes, events, viewport, instructions, attributes,
    emit: (name, details = {}) => {
      const event = { repeat: false, ...details, prevented: false, preventDefault() { this.prevented = true; } };
      events.get(name)?.(event);
      return event;
    },
  };
}

test('static HTML and equal group geometry support a seamless rightward loop without buttons', () => {
  const markup = source.split('<script>')[0];
  assert.doesNotMatch(markup, /is-enabled|<button\b|role="button"|tabindex=/);
  assert.match(markup, /role="region" aria-label="Logotipos de clientes"/);
  assert.match(source, /\.logo-copy \{ display: none; \}/);
  assert.match(source, /from \{ transform: translateX\(-50%\); \}/);
  assert.match(source, /to \{ transform: translateX\(0\); \}/);
  assert.match(source, /\.is-enabled \.logo-track \{ display: flex; width: max-content; \}/);
  assert.match(source, /\.client-carousel\.is-enabled \.logo-track \{ animation: client-logos-right 56s linear infinite !important; \}/);
  assert.match(source, /\.client-carousel\.is-enabled \.logo-viewport:hover \.logo-track \{ animation-play-state: paused !important; \}/);
  assert.doesNotMatch(source, /matchMedia|motion-opt-in|carousel-toggle|animation-play-state:[^}]*focus/);
  assert.doesNotMatch(script, /focusin|focusout|localStorage|sessionStorage/);
  assert.match(source, /\.logo-viewport:focus-visible \{ outline: 3px solid #0a1267;/);
  for (const [width, gap] of [[150, 42], [110, 28]]) {
    assert.ok(source.includes(`gap: ${gap}px; padding-right: ${gap}px;`));
    const group = 10 * width + 9 * gap + gap;
    assert.equal((2 * group) * 0.5, group, 'A half-track shift must equal exactly one group');
    assert.equal(group - 10 * width - 9 * gap, gap, 'The seam must equal the internal gap');
  }
});

test('ready enhancement starts automatically regardless of reduced preference or media API availability', () => {
  for (const media of ['normal', 'reduced', 'missing', 'throwing']) {
    const state = harness({ media });
    assert.ok(state.classes.has('is-enabled'));
    assert.equal(state.classes.has('is-paused'), false);
    assert.equal(state.instructions.hidden, false);
    assert.match(state.instructions.textContent, /Movimiento automático/);
  }
});

test('without JavaScript or complete enhancement markup the static baseline remains untouched', () => {
  for (const options of [{ javascript: false }, { missingViewport: true }]) {
    const state = harness(options);
    assert.equal(state.classes.has('is-enabled'), false);
    assert.equal(state.viewport.tabIndex, undefined);
    assert.equal(state.instructions.hidden, true);
  }
});

test('hover temporarily pauses while Space and Escape provide persistent keyboard pause', () => {
  const state = harness();
  state.emit('mouseenter');
  assert.ok(state.classes.has('is-paused'));
  state.emit('mouseleave');
  assert.equal(state.classes.has('is-paused'), false);
  assert.equal(state.emit('keydown', { key: ' ' }).prevented, true);
  assert.ok(state.classes.has('is-paused'));
  state.emit('mouseenter');
  state.emit('mouseleave');
  assert.ok(state.classes.has('is-paused'), 'Hover exit must not clear the keyboard pause');
  state.emit('keydown', { key: ' ' });
  assert.equal(state.classes.has('is-paused'), false);
  assert.equal(state.emit('keydown', { key: 'Escape' }).prevented, true);
  assert.ok(state.classes.has('is-paused'));
  assert.match(state.instructions.textContent, /Movimiento pausado/);
});

test('keyboard resumption works while focused, ignores held Space repeats and preserves unrelated keys', () => {
  const state = harness();
  state.emit('focusin');
  assert.equal(state.classes.has('is-paused'), false);
  state.emit('keydown', { key: 'Escape' });
  const repeat = state.emit('keydown', { key: ' ', repeat: true });
  assert.equal(repeat.prevented, true);
  assert.ok(state.classes.has('is-paused'));
  state.emit('keydown', { code: 'Space' });
  assert.equal(state.classes.has('is-paused'), false);
  assert.equal(state.emit('keydown', { key: 'ArrowRight' }).prevented, false);
  assert.equal(state.classes.has('is-paused'), false);
});
