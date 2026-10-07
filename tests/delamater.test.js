// Delamater (2012): the network's equations worked by hand, and the
// orderings its simulated figures show, run with the paper's own parameter
// values (α = 0.1, β = 0.9, eight networks) and its trial counts (blocks of
// 30 trials per trial type). The paper gives no starting weight range; the
// tests use ±0.5. Page numbers are to Learning & Behavior, 40.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as net from '../js/models/delamater.js';
import * as spec from '../content/equations/delamater.js';
import { parseDesign } from '../js/core/design.js';
import { runModel } from '../js/core/runner.js';
import { evaluate } from '../js/ui/equation.js';

const PAPER = { rate: 0.1, beta: 0.9, spread: 0.5, learners: 8 };
const run = (text, params = {}, options = {}, seed = 1) => runModel(net, { design: parseDesign(text), params: { ...PAPER, ...params }, options, seed });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);
const out = (r, label, j, t = r.trials.length) => (r.probeSeries?.[`out${j}`]?.[label] ?? r.series[label])[t];
// Separation between reinforced and nonreinforced probes at trial t.
const sep = (r, pos, neg, t) => pos.reduce((s, p) => s + r.series[p][t], 0) / pos.length - neg.reduce((s, p) => s + r.series[p][t], 0) / neg.length;

test('Eq. 2 and Appendix Eqs. 1 to 3, worked from the record: the shifted logistic, the output error, the hidden error, and the weight change', () => {
  const r = run('3 A+', { learners: 1, momentum: true });
  for (const rec of r.trials) {
    const l = rec.learner;
    // The most active hidden unit's activation is the logistic of its net input, shifted.
    close(l.hTop, net.logistic(l.netTop, rec.shift), 1e-12);
    // Output error: (λ − a) a (1 − a).
    close(l.dOutJ, (l.targetJ - l.outJ) * l.outJ * (1 - l.outJ), 1e-12);
    // Hidden error: a (1 − a) Σ δ_j w_kj, here one outcome unit.
    close(l.dTop, l.hTop * (1 - l.hTop) * l.dOutJ * l.wTop, 1e-12);
  }
  // Weight change with momentum: α δ a + β Δw(last). On trial 1 there is no last change.
  const t1 = r.trials[0].learner;
  close(t1.dwTop, 0.1 * t1.dOutJ * t1.hTop, 1e-12);
  // The same network without momentum changes by α δ a alone on every trial.
  const plain = run('3 A+', { learners: 1 }, { momentum: false });
  for (const rec of plain.trials) close(rec.learner.dwTop, 0.1 * rec.learner.dOutJ * rec.learner.hTop, 1e-12);
});

test('a unit with no input rests near 0.1, as the shift of 2.2 is meant to give (p. 6)', () => {
  close(net.logistic(0, 2.2), 1 / (1 + Math.exp(2.2)), 1e-12);
  assert.ok(Math.abs(net.logistic(0, 2.2) - 0.1) < 0.002);
});

test('two outcomes are learned by two units: a cue trained with outcome 2 switches on US2 and not US1', () => {
  const r = run('240 A+1, 240 D+2');
  assert.ok(out(r, 'A', 1) > 0.85 && out(r, 'A', 2) < 0.15, `A: ${out(r, 'A', 1)} / ${out(r, 'A', 2)}`);
  assert.ok(out(r, 'D', 2) > 0.85 && out(r, 'D', 1) < 0.15, `D: ${out(r, 'D', 1)} / ${out(r, 'D', 2)}`);
});

test('Fig. 5 (Delamater, 1998, Exp. 3): the discrimination is learned, and the reversal is faster when the two cues of a modality had different outcomes', () => {
  const acq = 'Acq: 240 A+1, 240 B-, 240 C-, 240 D+2';
  const different = run(`${acq}\nRev: 200 A-, 200 B+2, 200 C+1, 200 D-\nModalities: AB, CD`);
  const same = run(`${acq}\nRev: 200 A-, 200 B+1, 200 C+2, 200 D-\nModalities: AB, CD`);
  const n = 960;
  // Acquisition: the right unit, strongly; the other unit, hardly.
  assert.ok(out(different, 'A', 1, n) > 0.85 && out(different, 'B', 1, n) < 0.2 && out(different, 'D', 2, n) > 0.85 && out(different, 'A', 2, n) < 0.1);
  // Reversal: the newly reinforced cues' units against the newly nonreinforced ones'.
  const revDifferent = (t) => (out(different, 'B', 2, t) + out(different, 'C', 1, t)) / 2 - (out(different, 'A', 1, t) + out(different, 'D', 2, t)) / 2;
  const revSame = (t) => (out(same, 'B', 1, t) + out(same, 'C', 2, t)) / 2 - (out(same, 'A', 1, t) + out(same, 'D', 2, t)) / 2;
  for (const t of [n + 200, n + 300, n + 400, n + 500]) assert.ok(revDifferent(t) > revSame(t) + 0.1, `at ${t}: ${revDifferent(t)} vs ${revSame(t)}`);
  assert.ok(revDifferent(n + 800) > 0.7);
});

test('Fig. 6, upper panel: positive patterning is ahead of negative patterning early in training (with a context)', () => {
  const pp = run('T: 400 A-, 400 B-, 400 AB+, 400 -\nModalities: A, B\nContext: Z');
  const np = run('T: 400 A+, 400 B+, 400 AB-, 400 -\nModalities: A, B\nContext: Z');
  for (const t of [200, 400, 600]) assert.ok(sep(pp, ['AB'], ['A', 'B'], t) > sep(np, ['A', 'B'], ['AB'], t) + 0.1, `at ${t}`);
  // Without the context the paper says negative patterning ends ahead.
  const pp0 = run('T: 400 A-, 400 B-, 400 AB+\nModalities: A, B');
  const np0 = run('T: 400 A+, 400 B+, 400 AB-\nModalities: A, B');
  assert.ok(sep(pp0, ['AB'], ['A', 'B'], 300) > sep(np0, ['A', 'B'], ['AB'], 300), 'positive patterning ahead early');
  assert.ok(sep(np0, ['A', 'B'], ['AB'], 1200) > sep(pp0, ['AB'], ['A', 'B'], 1200) + 0.1, 'negative patterning ahead by the end');
});

test('Fig. 7: a biconditional discrimination is learned faster with differential outcomes than with one outcome', () => {
  const different = run('T: 240 AC+1, 240 AD-, 240 BC-, 240 BD+2\nModalities: AB, CD\nTest: AC, AD, BC, BD');
  const single = run('T: 240 AC+, 240 AD-, 240 BC-, 240 BD+\nModalities: AB, CD\nTest: AC, AD, BC, BD');
  const sepDifferent = (t) => (out(different, 'AC', 1, t) + out(different, 'BD', 2, t)) / 2 - (out(different, 'AD', 1, t) + out(different, 'BC', 1, t) + out(different, 'AD', 2, t) + out(different, 'BC', 2, t)) / 4;
  for (const t of [320, 480, 640, 960]) assert.ok(sepDifferent(t) > sep(single, ['AC', 'BD'], ['AD', 'BC'], t) + 0.1, `at ${t}: ${sepDifferent(t)} vs ${sep(single, ['AC', 'BD'], ['AD', 'BC'], t)}`);
  assert.ok(sepDifferent(960) > 0.7);
});

test('Fig. 8: within one task, positive patterning is ahead of negative patterning early (Harris et al., 2008)', () => {
  const r = run('T: 280 A+, 280 C+, 280 AC-, 280 B-, 280 D-, 280 BD+, 280 -\nModalities: AB, CD\nContext: Z');
  for (const t of [245, 490, 735, 980]) assert.ok(sep(r, ['BD'], ['B', 'D'], t) > sep(r, ['A', 'C'], ['AC'], t) + 0.1, `at ${t}`);
});

test('Fig. 10: a feature-positive discrimination is learned faster than a feature-negative one', () => {
  const r = run('T: 240 AC+, 240 A-, 240 B+, 240 BD-\nModalities: AB, CD\nTest: AC, A, B, BD');
  for (const t of [160, 320, 480]) assert.ok(sep(r, ['AC'], ['A'], t) > sep(r, ['B'], ['BD'], t) + 0.05, `at ${t}: ${sep(r, ['AC'], ['A'], t)} vs ${sep(r, ['B'], ['BD'], t)}`);
});

test('without the hidden layer a single network cannot solve negative patterning: it gives up on one element', () => {
  // A one-layer logistic network can only add, so to keep AB low it drives
  // one element's weights negative. Which element depends on the starting
  // weights, so the average over networks can look like a solution.
  for (const seed of [1, 2, 3]) {
    const one = run('T: 400 A+, 400 B+, 400 AB-\nModalities: A, B', { learners: 1 }, { hidden: false }, seed);
    const a = one.series.A[1200];
    const b = one.series.B[1200];
    assert.ok(Math.min(a, b) < 0.1 && Math.max(a, b) > 0.8, `seed ${seed}: A ${a}, B ${b}`);
  }
  // With the hidden layer each network keeps both elements and drops the compound.
  for (const seed of [1, 2, 3]) {
    const two = run('T: 400 A+, 400 B+, 400 AB-\nModalities: A, B', { learners: 1 }, {}, seed);
    assert.ok(Math.min(two.series.A[1200], two.series.B[1200]) > two.series.AB[1200] + 0.3, `seed ${seed}`);
  }
});

test('the displayed equations evaluate to the numbers the network used', () => {
  const combos = [];
  for (const hidden of [true, false]) for (const momentum of [true, false]) combos.push({ hidden, momentum });
  for (const options of combos) {
    const r = run('6 A+1\n6 AB+2, 6 AX-, random\n4 B-\nModalities: AB, X\nContext: Z', { learners: 2 }, options);
    const eqs = spec.equations(options);
    for (const rec of r.trials) {
      const ctx = { spec, rec, cue: rec.present[0], present: rec.present };
      const l = rec.learner;
      const want = { netIn: l.netTop, hidden: l.hTop, outErr: l.dOutJ, hidErr: l.dTop, change: l.dwTop };
      for (const eq of eqs) {
        if (eq.when && !eq.when(rec)) continue;
        close(evaluate(eq.rhs, ctx), want[eq.id], 1e-9);
      }
    }
  }
});
