import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rw from '../js/models/rescorla-wagner.js';
import * as spec from '../content/equations/rescorla-wagner.js';
import { parseDesign } from '../js/core/design.js';
import { runModel } from '../js/core/runner.js';
import { equationSymbols, equationNumbers, equationWords, symbolsUsed } from '../js/ui/equation.js';

const run = runModel(rw, { design: parseDesign('20 A+\n20 AB+') });
const rec = run.trials[20]; // first AB+ trial
const ctx = { spec, rec, cue: 'B', present: rec.present };
const opts = { summedError: true, useAlpha: true, separateBeta: false };
const eqs = spec.equations(opts);

test('the full model shows predict, learn, and update', () => {
  assert.deepEqual(eqs.map((e) => e.id), ['sum', 'update', 'apply']);
  assert.deepEqual(symbolsUsed(eqs), ['sumV', 'V', 'dV', 'alpha', 'beta', 'error', 'lambda']);
});

test('every symbol in the equations has a definition with a role and meaning', () => {
  for (const key of symbolsUsed(eqs)) {
    const def = spec.symbols[key];
    assert.ok(def, key);
    assert.ok(spec.roles[def.role], key);
    assert.ok(def.meaning('A').length > 10, key);
  }
});

test('symbols reading is MathML with linked symbols', () => {
  const m = equationSymbols(eqs[1], ctx);
  assert.match(m, /^<math>.*<\/math>$/s);
  assert.match(m, /data-sym="alpha" data-cue="B"/);
  assert.match(m, /data-sym="sumV"/);
  assert.match(m, /prediction error/);
  const opens = (m.match(/<m[a-z]+[ >]/g) || []).length;
  const closes = (m.match(/<\/m[a-z]+>/g) || []).length;
  assert.equal(opens, closes, 'MathML tags balance');
});

test('numbers reading substitutes the trial values and shows the result', () => {
  const m = equationNumbers(eqs[1], ctx);
  assert.match(m, /<mn>0\.3<\/mn>/);
  assert.match(m, /<mn>0\.5<\/mn>/);
  assert.match(m, new RegExp(`<mn class="result">${rec.perCue.B.deltaV.toFixed(3)}</mn>`));
  const sum = equationNumbers(eqs[0], ctx);
  assert.match(sum, new RegExp(rec.Vbefore.A.toFixed(3)));
});

test('words reading names the focus cue and the cues present', () => {
  assert.match(equationWords(eqs[1], ctx), /The change in B&#39;s strength|The change in B's strength/);
  assert.match(equationWords(eqs[0], ctx), /A and B/);
});

test('each build stage drops the right terms', () => {
  const update = (o) => symbolsUsed(spec.equations(o).filter((e) => e.id === 'update'));
  assert.deepEqual(update(spec.stages[0].options).sort(), ['V', 'beta', 'dV', 'error', 'lambda'].sort());
  assert.ok(update(spec.stages[1].options).includes('alpha'));
  assert.ok(update(spec.stages[2].options).includes('sumV'));
});
