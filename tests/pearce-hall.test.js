import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ph from '../js/models/pearce-hall.js';
import * as spec from '../content/equations/pearce-hall.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';
import { evaluate } from '../js/ui/equation.js';

const run = (text, params = {}, options = {}) => runModel(ph, { design: parseDesign(text), params, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('attention follows α ← γ|λ − ΣV| + (1 − γ)α, worked by hand', () => {
  const p = { S_A: 0.2, alpha0: 0.6, gamma: 0.5 };
  const r = run('3 A+', p);
  // Trial 1: ΣV = 0, surprise 1. ΔV = 0.2 × 0.6 × 1 = 0.12. α → 0.5 × 1 + 0.5 × 0.6 = 0.8.
  close(r.trials[0].perCue.A.deltaV, 0.12);
  close(r.trials[0].alphaAfter.A, 0.8);
  // Trial 2: ΣV = 0.12, surprise 0.88. ΔV = 0.2 × 0.8 = 0.16. α → 0.44 + 0.4 = 0.84.
  close(r.trials[1].sumV, 0.12);
  close(r.trials[1].perCue.A.deltaV, 0.16);
  close(r.trials[1].alphaAfter.A, 0.5 * 0.88 + 0.5 * 0.8);
});

test('with γ = 1, attention is the surprise on the last trial (the 1980 model)', () => {
  const r = run('8 A+\n4 A-', { gamma: 1 });
  for (const rec of r.trials) close(rec.alphaAfter.A, Math.abs(rec.lambda - rec.sumV));
});

test('learning levels off at λ, and attention fades as the outcome becomes predicted', () => {
  const r = run('60 A+');
  close(final(r, 'A'), 1, 0.02);
  assert.ok(r.stateSeries.alpha.A[60] < 0.05);
  assert.ok(r.stateSeries.alpha.A[60] < r.stateSeries.alpha.A[1]);
});

test('extinction adds inhibition and erases nothing', () => {
  const r = run('30 A+\n60 A-');
  const last = r.trials[r.trials.length - 1];
  assert.ok(last.Vafter.A > 0.95, 'excitatory strength is kept');
  assert.ok(last.Vbarafter.A > 0.8, 'inhibitory strength grows');
  assert.ok(final(r, 'A') < 0.2);
  // The missing outcome is a surprise, so attention comes back up.
  assert.ok(r.stateSeries.alpha.A[31] > r.stateSeries.alpha.A[30] + 0.3);
});

test('excitatory and inhibitory learning never happen on the same trial', () => {
  const r = run('20 A+, 20 AX-\n10 AB+(2)\n10 A-');
  for (const rec of r.trials) for (const c of rec.present) assert.ok(rec.perCue[c].deltaV === 0 || rec.perCue[c].deltaVbar === 0);
});

test('latent inhibition: pre-exposure takes attention to zero', () => {
  const r = run('Pre: 30 A-\nCond: 15 A+, 15 B+\nContext: Z');
  assert.ok(r.stateSeries.alpha.A[30] < 0.01);
  assert.equal(r.stateSeries.alpha.B[30], 0.8);
  assert.ok(r.trials[30].perCue.A.deltaV < r.trials[31].perCue.B.deltaV);
});

test('blocking: B learns on the first compound trial, then attention to B collapses', () => {
  const r = run('20 A+\n20 AB+, 20 CD+');
  assert.ok(r.trials[20].perCue.B.deltaV > 0.1);
  // Attention to B drops from 0.8 to under a quarter of that after one compound trial.
  assert.ok(r.stateSeries.alpha.B[21] < 0.2, `α_B = ${r.stateSeries.alpha.B[21]}`);
  assert.ok(final(r, 'B') < final(r, 'D') - 0.3);
});

test('absent cues keep their strengths and their attention', () => {
  const r = run('10 AB+\n10 A+');
  for (let t = 11; t <= 20; t++) {
    assert.equal(r.series.B[t], r.series.B[10]);
    assert.equal(r.stateSeries.alpha.B[t], r.stateSeries.alpha.B[10]);
  }
});

test('the displayed equations evaluate to the numbers the model used', () => {
  const combos = [];
  for (const attention of [true, false]) for (const inhibition of [true, false]) combos.push({ attention, inhibition });
  for (const options of combos) {
    const r = run('8 A+\n8 AB+, 8 AX-, random\n6 A-\n4 AB+(2)\nContext: Z', { S_A: 0.4, gamma: 0.6 }, options);
    const eqs = spec.equations(options);
    for (const rec of r.trials) {
      for (const cue of rec.present) {
        const ctx = { spec, rec, cue, present: rec.present };
        const p = rec.perCue[cue];
        const want = { sum: rec.sumV, excite: p.deltaV, inhibit: p.deltaVbar, apply: p.Vafter, applyBar: p.Vbarafter, attention: p.newAlpha };
        for (const eq of eqs) close(evaluate(eq.rhs, ctx), want[eq.id], 1e-12);
      }
    }
  }
});
