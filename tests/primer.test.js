import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rw from '../js/models/rescorla-wagner.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';
import { cases } from '../content/primer/fixed-points.js';
import { interpolate, compareSketch, verdict } from '../js/core/sketch.js';

const settings = [
  { alpha_A: 0.3, alpha_B: 0.3, alpha_X: 0.3, beta: 0.5, lambda: 1 },
  { alpha_A: 0.5, alpha_B: 0.1, alpha_X: 0.2, beta: 0.2, lambda: 0.8 },
];

for (const c of cases) {
  test(`worked example "${c.title}" matches the model after many trials`, () => {
    for (const p of settings) {
      // Longer runs than the page uses, so slow settings have time to converge.
      const run = runModel(rw, { design: parseDesign(c.design.replaceAll('300', '900')), params: p });
      const solved = c.solve(p);
      for (const cue of c.cues) assert.ok(Math.abs(final(run, cue) - solved[cue]) < 1e-3, `${cue}: ${final(run, cue)} vs ${solved[cue]}`);
    }
  });
  test(`worked example "${c.title}" has MathML for every step`, () => {
    for (const s of c.steps) {
      assert.match(s.math, /^<math>.*<\/math>$/s);
      assert.ok(s.words.length > 20);
    }
  });
}

test('interpolate draws straight lines between sketched trials', () => {
  assert.deepEqual(interpolate({ 0: 0, 4: 1 }, 5), [0, 0.25, 0.5, 0.75, 1, null]);
  assert.deepEqual(interpolate({}, 2), [null, null, null]);
  assert.deepEqual(interpolate({ 2: 0.5 }, 3), [null, null, 0.5, null]);
});

test('compareSketch measures the gap and finds the worst trial', () => {
  const series = [0, 0.5, 0.75, 0.875, 0.9375];
  const exact = { 0: 0, 1: 0.5, 2: 0.75, 3: 0.875, 4: 0.9375 };
  const r0 = compareSketch(exact, series, [{ name: 'P', start: 1, end: 4 }]);
  assert.equal(r0.meanAbs, 0);
  assert.equal(r0.complete, true);
  const r = compareSketch({ 0: 0, 4: 0 }, series, [{ name: 'P', start: 1, end: 4 }]);
  assert.equal(r.worst.t, 4);
  assert.equal(r.phaseEnds[0].sketch, 0);
  assert.ok(Math.abs(r.meanAbs - (0.5 + 0.75 + 0.875 + 0.9375) / 5) < 1e-12);
  const partial = compareSketch({ 0: 0, 2: 1 }, series, []);
  assert.deepEqual(partial.coverage, [0, 2]);
  assert.equal(partial.complete, false);
});

test('verdict wording tracks the size of the gap', () => {
  assert.match(verdict(0.01), /Very close/);
  assert.match(verdict(0.5), /Quite different/);
  assert.match(verdict(null), /Sketch/);
});
