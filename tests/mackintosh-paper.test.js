// Mackintosh (1975) publishes no numerical simulations. These tests pin the
// paper's equations and the predictions it states in words, so the model is
// the one in the paper. Page numbers are to Psychological Review, 82.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mk from '../js/models/mackintosh.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';

const run = (text, params = {}, options = {}) => runModel(mk, { design: parseDesign(text), params, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('Equation 2 (p. 277): ΔV_A = θ α_A (λ − V_A), each cue from its own error', () => {
  const r = run('3 A+\n1 AB+', { theta: 0.4, alpha0_A: 0.5, alpha0_B: 0.3 }, { attention: false });
  let v = 0;
  for (let n = 0; n < 3; n++) {
    close(r.trials[n].perCue.A.deltaV, 0.4 * 0.5 * (1 - v));
    v += 0.4 * 0.5 * (1 - v);
  }
  // On the compound trial B's error is λ − V_B, untouched by V_A.
  close(r.trials[3].perCue.B.deltaV, 0.4 * 0.3 * (1 - 0));
  close(r.trials[3].perCue.A.deltaV, 0.4 * 0.5 * (1 - v));
});

test('Equations 4 and 5 (p. 287): α rises when A predicts better than the other cues, falls when they predict at least as well', () => {
  // A trained, then AB+: A predicts better than B, B worse than A.
  const r = run('5 A+\n1 AB+', {}, { directionRule: true });
  const t = r.trials[5];
  assert.ok(t.perCue.A.better && t.perCue.A.deltaAlpha > 0);
  assert.ok(!t.perCue.B.better && t.perCue.B.deltaAlpha < 0);
  // "At least as well" includes a tie: two new cues together both lose attention.
  const tie = run('1 AB+', {}, { directionRule: true }).trials[0];
  assert.ok(!tie.perCue.A.better && tie.perCue.A.deltaAlpha < 0);
  assert.ok(!tie.perCue.B.better && tie.perCue.B.deltaAlpha < 0);
  // The proportional form leaves a tie alone, which is where the two readings part.
  close(run('1 AB+').trials[0].perCue.A.deltaAlpha, 0);
});

test('p. 288: the change in α is proportional to the discrepancy between |λ − V_B| and |λ − V_X|', () => {
  const r = run('10 A+\n1 AB+, 1 AC+', { thetaAlpha: 0.25 });
  const t = r.trials[10];
  const vA = t.Vbefore.A;
  close(t.perCue.B.deltaAlpha, 0.25 * (Math.abs(1 - vA) - Math.abs(1 - 0)));
  // The change is θ_α times the discrepancy, whatever the discrepancy is.
  close(t.perCue.B.deltaAlpha / (t.perCue.B.othersError - t.perCue.B.selfError), 0.25);
  const t2 = run('10 A+\n1 AB+, 1 AC+', { thetaAlpha: 0.5 }).trials[10];
  close(t2.perCue.B.deltaAlpha / (t2.perCue.B.othersError - t2.perCue.B.selfError), 0.5);
});

test('p. 288: α_B falls fastest in blocking, where V_B is near zero and V_X is near λ', () => {
  const blocked = run('20 A+\n1 AB+').trials[20].perCue.B.deltaAlpha;
  const fresh = run('1 AB+').trials[0].perCue.B.deltaAlpha;
  const partial = run('2 A+\n1 AB+').trials[2].perCue.B.deltaAlpha;
  assert.ok(blocked < partial && partial <= fresh, `${blocked} ${partial} ${fresh}`);
  assert.ok(blocked < -0.2);
});

test('p. 284: little or no blocking on the first reinforced compound trial', () => {
  // B's attention has not yet changed, so B learns exactly what a cue alone
  // would learn from its first trial.
  for (const options of [{}, { directionRule: true }]) {
    const blocked = run('20 A+\n1 AB+', {}, options).trials[20].perCue.B.deltaV;
    const alone = run('1 B+', {}, options).trials[0].perCue.B.deltaV;
    close(blocked, alone);
    assert.ok(blocked > 0.1);
  }
  // By the next compound trial B's attention has dropped and it learns less.
  const r = run('20 A+\n5 AB+');
  assert.ok(r.trials[21].perCue.B.deltaV < 0.5 * r.trials[20].perCue.B.deltaV);
});

test('p. 285 and p. 288: overshadowing comes from a difference in salience or validity; equal cues overshadow each other only slightly', () => {
  // Equal saliences, both always reinforced: the two errors tie, so neither
  // cue's attention changes. A cue alone, by contrast, predicts better than
  // nothing and gains attention. So the paper allows "some reciprocal
  // overshadowing" between equal cues, which is small here.
  const together = run('30 AB+');
  const alone = run('30 B+');
  assert.ok(final(together, 'B') < final(alone, 'B'));
  assert.ok(final(alone, 'B') - final(together, 'B') < 0.05, `${final(alone, 'B') - final(together, 'B')}`);
  assert.ok(run('30 AB+').trials.every((t) => t.perCue.A.deltaAlpha === 0 && t.perCue.B.deltaAlpha === 0));
  // A more salient A conditions faster, B becomes the worse predictor,
  // loses attention, and ends lower than alone.
  const salient = run('30 AB+', { alpha0_A: 0.9, alpha0_B: 0.3 });
  const aloneLow = run('30 B+', { alpha0_B: 0.3 });
  assert.ok(final(salient, 'B') < final(aloneLow, 'B') - 0.1, `${final(salient, 'B')} vs ${final(aloneLow, 'B')}`);
  // A more valid A (reinforced on its own as well) overshadows an equally salient B.
  const valid = run('30 AB+, 30 A+');
  assert.ok(final(valid, 'B') < final(alone, 'B') - 0.05, `${final(valid, 'B')} vs ${final(alone, 'B')}`);
});

test('p. 280 and Eq. 5: nonreinforced pre-exposure lowers α under the direction rule (latent inhibition)', () => {
  // On an A− trial λ = 0 and V_A = V_X = 0: a tie, so Eq. 5 lowers α.
  const r = run('Pre: 20 A-\nCond: 10 A+, 10 B+', { alphaMin: 0.05 }, { directionRule: true });
  assert.ok(r.stateSeries.alpha.A[20] < 0.1);
  assert.equal(r.stateSeries.alpha.B[20], 0.5);
  assert.ok(r.trials[20].perCue.A.deltaV < 0.3 * r.trials[21].perCue.B.deltaV, 'the pre-exposed cue learns less on its first trial');
  assert.ok(final(r, 'A') < final(r, 'B'));
  // Footnote 2: λ is 0 on a nonreinforced trial.
  assert.equal(r.trials[0].lambda, 0);
});

test('p. 286: a cue that predicts a change in reinforcement gains attention (acquired distinctiveness)', () => {
  // A signals the outcome and B signals its absence: both become good
  // predictors of their trials' outcomes relative to nothing, and gain
  // attention; a cue uncorrelated with the outcome does not.
  const r = run('20 A+, 20 B-, 20 C+, 20 C-', { alphaMin: 0.05 });
  const a = r.stateSeries.alpha;
  assert.ok(a.A[80] > 0.9, `α_A = ${a.A[80]}`);
  assert.ok(a.C[80] < a.A[80] - 0.2, `α_C = ${a.C[80]}`);
});
