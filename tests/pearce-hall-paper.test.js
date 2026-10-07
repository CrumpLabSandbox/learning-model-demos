// Pearce and Hall (1980) publish no numerical simulations. These tests pin
// the paper's equations and the predictions it states in words, so that the
// model is the one in the paper. Page numbers are to Psychological Review,
// 87. γ = 1 is the 1980 model: attention is the surprise on the last trial.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ph from '../js/models/pearce-hall.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';

const run = (text, params = {}, options = {}) => runModel(ph, { design: parseDesign(text), params: { gamma: 1, ...params }, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('Equations 9 and 13 (pp. 538, 546): ΔV_A = S_A α_A λ with α_A on trial n equal to |λ − ΣV| on trial n − 1', () => {
  const r = run('4 A+', { S_A: 0.25, alpha0: 0.6 });
  // Trial 1 uses the starting attention; the paper leaves that value open.
  close(r.trials[0].perCue.A.deltaV, 0.25 * 0.6 * 1);
  // ΣV on trial n − 1 is the strength during that trial, before its update:
  // so α on trial 2 is |λ − 0| = λ, "a value close to that set by λ".
  let vDuring = 0;
  let v = 0.15;
  for (let n = 1; n < 4; n++) {
    const alpha = Math.abs(1 - vDuring);
    close(r.trials[n].perCue.A.alpha, alpha);
    close(r.trials[n].perCue.A.deltaV, 0.25 * alpha * 1);
    vDuring = v;
    v += 0.25 * alpha;
  }
});

test('p. 539: in acquisition, α declines from near λ to zero as V approaches λ, and learning stops there', () => {
  const r = run('80 A+');
  close(r.stateSeries.alpha.A[1], 1);
  assert.ok(r.stateSeries.alpha.A[80] < 1e-3);
  close(final(r, 'A'), 1, 1e-3);
  for (let n = 2; n <= 80; n++) assert.ok(r.stateSeries.alpha.A[n] <= r.stateSeries.alpha.A[n - 1] + 1e-12);
});

test('p. 539: one nonreinforced presentation of a new cue sets its associability to zero, so no learning on the first conditioning trial', () => {
  // The paper notes that the 1980 rule therefore predicts maximal latent
  // inhibition after a single pre-exposure, which is wrong empirically, and
  // proposes averaging over recent trials (Eq. 15). The 1982 running
  // average used by default makes the decline gradual.
  const one = run('Pre: 1 A-\nCond: 5 A+, 5 B+');
  assert.equal(one.stateSeries.alpha.A[1], 0);
  assert.equal(one.trials[1].perCue.A.deltaV, 0);
  assert.ok(one.trials[2].perCue.B.deltaV > 0.1);
  const gradual = runModel(ph, { design: parseDesign('Pre: 1 A-\nCond: 5 A+, 5 B+'), params: { gamma: 0.8 } });
  assert.ok(gradual.stateSeries.alpha.A[1] > 0.1 && gradual.stateSeries.alpha.A[1] < 0.8);
  const many = runModel(ph, { design: parseDesign('Pre: 20 A-\nCond: 5 A+, 5 B+'), params: { gamma: 0.8 } });
  assert.ok(many.stateSeries.alpha.A[20] < 0.02);
});

test('p. 539, Hall and Pearce (1979): a cue trained to a weak US is slow to learn about a stronger one', () => {
  // A → weak shock to asymptote, then A → strong shock, against a new cue B.
  const r = run('Weak: 40 A+(0.5)\nStrong: 20 A+, 20 B+', { S_A: 0.3, S_B: 0.3 });
  const first = r.trials[40];
  // "At least on the first trial of training with the stronger shock, there
  // will be no increase": α_A is |0.5 − V_A| ≈ 0 after the weak phase.
  assert.ok(first.perCue.A.alpha < 0.01, `α_A = ${first.perCue.A.alpha}`);
  assert.ok(first.perCue.A.deltaV < 0.01);
  // Over the strong phase A gains less than the novel B does.
  const gainA = final(r, 'A') - r.series.A[40];
  const gainB = final(r, 'B');
  assert.ok(gainA < gainB - 0.1, `A gained ${gainA}, B gained ${gainB}`);
});

test('p. 544: in blocking the added cue learns on the first compound trial only', () => {
  const r = run('30 A+\n10 AB+');
  assert.ok(r.trials[30].perCue.B.deltaV > 0.1);
  // Then α_B = |λ − ΣV| with ΣV = V_A + V_B ≈ λ, so B stops.
  assert.ok(r.stateSeries.alpha.B[31] < 0.02);
  for (let n = 31; n < 40; n++) assert.ok(r.trials[n].perCue.B.deltaV < 0.02);
});

test('p. 544: unblocking by a bigger US keeps conditioning to the added cue going', () => {
  const same = run('30 A+\n10 AB+');
  const bigger = run('30 A+\n10 AB+(2)');
  const laterGain = (r) => r.series.B[40] - r.series.B[31];
  assert.ok(laterGain(same) < 0.05);
  assert.ok(laterGain(bigger) > 0.3, `B gained ${laterGain(bigger)} after the first compound trial`);
});

test('p. 547, Hall and Pearce (Note 3): a surprising stronger shock on the last acquisition trial speeds extinction', () => {
  const control = run('20 A+\n10 A-');
  const surprise = run('19 A+, 1 A+(2), blocked\n10 A-');
  // The surprise restores attention, so the first extinction trial takes more away.
  assert.ok(surprise.trials[20].perCue.A.alpha > control.trials[20].perCue.A.alpha + 0.3);
  assert.ok(surprise.trials[20].perCue.A.deltaVbar > control.trials[20].perCue.A.deltaVbar * 2);
});

test('p. 545, Kremer (1978): compounding two trained cues with the same US reduces both, and a novel cue added becomes inhibitory', () => {
  const r = run('Train: 40 A+, 40 B+\nCompound: 20 ABX+');
  const before = r.series.A[80];
  assert.ok(before > 0.95);
  assert.ok(final(r, 'A') < before - 0.1, `A went from ${before} to ${final(r, 'A')}`);
  assert.ok(final(r, 'B') < r.series.B[80] - 0.1);
  assert.ok(final(r, 'X') < -0.05, `X = ${final(r, 'X')}`);
  // The inhibitory reinforcer is the over-prediction, λ̄ = ΣV − λ (Eq. 12).
  const t = r.trials[80];
  close(t.shortfall, t.sumV - t.lambda);
  close(t.perCue.X.deltaVbar, t.perCue.X.S * t.perCue.X.alpha * t.shortfall);
});
