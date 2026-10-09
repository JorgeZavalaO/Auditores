import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/ClientLogoCarousel.astro', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const executable = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness({ reduced = false, api = 'modern' } = {}) {
  const classes = new Set();
  const events = new Map();
  const control = { hidden: true, textContent: 'Pausar movimiento', addEventListener: (name, action) => events.set(`button:${name}`, action) };
  const note = { hidden: false };
  const carousel = {
    classList: { toggle: (name, enabled) => {
      if (name === 'is-enabled' && enabled) assert.ok(events.has('button:click'), 'Bind the pause control before starting motion');
      return enabled ? classes.add(name) : classes.delete(name);
    } },
    querySelector: (selector) => selector === '.carousel-toggle' ? control : note,
    addEventListener: (name, action) => events.set(name, action),
    contains: (element) => element === control,
  };
  const media = { matches: reduced };
  let change;
  if (api === 'legacy') media.addListener = (action) => { change = action; };
  else media.addEventListener = (_, action) => { change = action; };
  const window = {};
  if (api !== 'missing') window.matchMedia = () => {
    if (api === 'throwing') throw new Error('Unsupported media query');
    return media;
  };
  runInNewContext(executable, { window, document: { querySelectorAll: () => [carousel] } });
  return {
    classes, control, note,
    emit: (event, relatedTarget = null) => events.get(event)?.({ relatedTarget }),
    preference: (value) => { media.matches = value; change?.(); },
  };
}

test('carousel is static by default and the rightward loop has equal groups including the seam gap', () => {
  assert.doesNotMatch(source.split('<script>')[0], /is-enabled/);
  assert.match(source, /\.logo-copy \{ display: none; \}/);
  assert.match(source, /animation: client-logos-right 56s linear infinite/);
  assert.match(source, /from \{ transform: translateX\(-50%\); \}/);
  assert.match(source, /to \{ transform: translateX\(0\); \}/);
  assert.match(source, /\.is-enabled \.logo-track \{ display: flex; width: max-content;/);
  assert.match(source, /gap: 42px; padding-right: 42px;/);
  assert.match(source, /gap: 28px; padding-right: 28px;/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(source, /animation: none; transform: none/);
  assert.match(source, /\.is-enabled:hover \.logo-track,/);
  assert.match(source, /\.is-enabled:focus-within \.logo-track \{ animation-play-state: paused;/);
  for (const [width, gap] of [[150, 42], [110, 28]]) {
    const group = 10 * width + 9 * gap + gap;
    const track = 2 * group;
    assert.equal(track * 0.5, group, 'A half-track shift must exactly equal one group');
    assert.equal(group - 10 * width - 9 * gap, gap, 'The seam gap must match internal gaps');
  }
});

test('normal motion activates only with a ready control and supports persistent pause/resume', () => {
  const state = harness();
  assert.ok(state.classes.has('is-enabled'));
  assert.equal(state.control.hidden, false);
  assert.equal(state.note.hidden, true);
  state.emit('button:click');
  assert.ok(state.classes.has('is-paused'));
  assert.equal(state.control.textContent, 'Reanudar movimiento');
  state.emit('button:click');
  assert.equal(state.classes.has('is-paused'), false);
  assert.equal(state.control.textContent, 'Pausar movimiento');
});

test('hover and focus temporarily pause without clearing a persistent user pause', () => {
  const state = harness();
  state.emit('mouseenter');
  assert.ok(state.classes.has('is-paused'));
  state.emit('mouseleave');
  assert.equal(state.classes.has('is-paused'), false);
  state.emit('focusin');
  state.emit('focusout', state.control);
  assert.ok(state.classes.has('is-paused'));
  state.emit('focusout');
  assert.equal(state.classes.has('is-paused'), false);
  state.emit('button:click');
  state.emit('mouseenter');
  state.emit('mouseleave');
  state.emit('focusin');
  state.emit('focusout');
  assert.ok(state.classes.has('is-paused'));
});

test('reduced motion and unsupported media APIs keep the original static presentation', () => {
  for (const options of [{ reduced: true }, { api: 'missing' }, { api: 'throwing' }]) {
    const state = harness(options);
    assert.equal(state.classes.has('is-enabled'), false);
    assert.equal(state.control.hidden, true);
    assert.equal(state.note.hidden, false);
  }
});

test('modern and legacy preference changes stop animation and preserve the user pause', () => {
  for (const api of ['modern', 'legacy']) {
    const state = harness({ api });
    state.emit('button:click');
    state.preference(true);
    assert.equal(state.classes.has('is-enabled'), false);
    assert.equal(state.control.hidden, true);
    assert.equal(state.note.hidden, false);
    state.preference(false);
    assert.ok(state.classes.has('is-enabled'));
    assert.ok(state.classes.has('is-paused'));
    state.emit('button:click');
    assert.equal(state.classes.has('is-paused'), false);
  }
});
