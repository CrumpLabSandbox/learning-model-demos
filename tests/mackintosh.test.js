import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mk from '../js/models/mackintosh.js';
import * as spec from '../content/equations/mackintosh.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';
import { evaluate } from '../js/ui/equation.js';

const run = (text, params = {}, options = {}) => runModel(mk, { design: parseDesign(text), params, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('with attention fixed, each cue follows λ(1 − (1 − θα)^n)', () => {
  const r = run('25 A+', { theta: 0.3, alpha0_A: 0.5 }, { attention: false });
  for (let n = 0; n <= 25; n++) close(r.series.A[n], 1 - (1 - 0.15) ** n);
  assert.ok(r.stateSeries.alpha.A.every((a) => a === 0.5));
});

test('each cue learns from its own error, not the summed error', () => {
  // Two cues together, attention fixed: each goes to λ on its own, so the
  // compound predicts 2λ. Rescorla-Wagner would stop at a total of λ.
  const r = run('300 AB+', {}, { attention: false });
  close(final(r, 'A'), 1, 1e-6);
  close(final(r, 'B'), 1, 1e-6);
});

test('continuous rule: Δα = θα(|λ − V_others| − |λ − V_A|), worked by hand', () => {
  const p = { theta: 0.3, thetaAlpha: 0.2, alpha0_A: 0.5, alpha0_B: 0.5, alphaMin: 0.05 };
  const r = run('2 A+\n1 AB+', p);
  // Two A+ trials alone: V_A = 0.15, then 0.15 + 0.3 × α × 0.85.
  // Trial 1: A alone, others = 0, Δα = 0.2 × (|1 − 0| − |1 − 0|) = 0.
  // Trial 2: Δα = 0.2 × (1 − 0.85) = 0.03, so α_A = 0.53 from trial 3.
  const t2 = r.trials[1];
  close(t2.perCue.A.deltaAlpha, 0.2 * (1 - 0.85));
  const vA = 0.15 + 0.3 * 0.5 * 0.85;
  close(r.trials[1].Vafter.A, vA);
  // Trial 3, AB+: for B, others = V_A; Δα_B = 0.2 × (|1 − V_A| − |1 − 0|).
  const t3 = r.trials[2];
  close(t3.perCue.B.others, vA);
  close(t3.perCue.B.deltaAlpha, 0.2 * (Math.abs(1 - vA) - 1));
  close(t3.alphaAfter.B, 0.5 + 0.2 * (Math.abs(1 - vA) - 1));
  // For A, others = V_B = 0; A predicts better, so its attention rises.
  close(t3.perCue.A.deltaAlpha, 0.2 * (1 - Math.abs(1 - vA)));
});

test('direction rule: a step up when better, a step down otherwise, and a tie counts as down', () => {
  const p = { thetaAlpha: 0.2, alpha0_A: 0.5, alphaMin: 0.05 };
  const r = run('2 A+', p, { directionRule: true });
  // Trial 1: V_A = 0 and others = 0, a tie, so α_A falls by 0.2 × (0.5 − 0.05).
  close(r.trials[0].perCue.A.deltaAlpha, -0.2 * 0.45);
  const a1 = 0.5 - 0.2 * 0.45;
  close(r.trials[0].alphaAfter.A, a1);
  // Trial 2: V_A > 0, so A predicts better than nothing: up by 0.2 × (1 − α).
  close(r.trials[1].perCue.A.deltaAlpha, 0.2 * (1 - a1));
});

test('attention stays between α_min and 1', () => {
  for (const options of [{}, { directionRule: true }]) {
    const r = run('40 A+, 40 AB+\n40 B-\n40 AB-', { thetaAlpha: 1, alphaMin: 0.1 }, options);
    for (const c of r.cues) for (const a of r.stateSeries.alpha[c]) assert.ok(a >= 0.1 - 1e-12 && a <= 1 + 1e-12, `${c}: ${a}`);
  }
});

test('blocking comes from attention: B loses attention, D does not', () => {
  const r = run('20 A+\n20 AB+, 20 CD+');
  const aB = r.stateSeries.alpha.B[60];
  const aD = r.stateSeries.alpha.D[60];
  assert.ok(aB < 0.1, `α_B = ${aB}`);
  assert.ok(aD > 0.3, `α_D = ${aD}`);
  assert.ok(final(r, 'B') < final(r, 'D') - 0.2);
  // On the first compound trial B still learns, because its attention has
  // not dropped yet. Mackintosh's model predicts this.
  assert.ok(r.trials[20].perCue.B.deltaV > 0.1);
});

test('absent cues change neither strength nor attention', () => {
  const r = run('10 AB+\n10 A+');
  for (let t = 11; t <= 20; t++) {
    assert.equal(r.series.B[t], r.series.B[10]);
    assert.equal(r.stateSeries.alpha.B[t], r.stateSeries.alpha.B[10]);
  }
});

test('the displayed equations evaluate to the numbers the model used', () => {
  for (const options of [{ attention: true, directionRule: false }, { attention: true, directionRule: true }, { attention: false, directionRule: false }]) {
    const r = run('6 A+\n6 AB+, 6 CD+, random\n6 AB-\nContext: Z', { alpha0_A: 0.7 }, options);
    const eqs = spec.equations(options);
    for (const rec of r.trials) {
      for (const cue of rec.present) {
        const ctx = { spec, rec, cue, present: rec.present };
        const p = rec.perCue[cue];
        const want = { update: p.deltaV, apply: p.Vafter, others: p.others, attention: p.deltaAlpha, attnApply: p.newAlpha };
        for (const eq of eqs) close(evaluate(eq.rhs, ctx), want[eq.id], 1e-12);
      }
    }
  }
});
