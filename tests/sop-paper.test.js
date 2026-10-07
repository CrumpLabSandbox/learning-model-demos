// The simulations published in Mazur and Wagner (1982) and Wagner (1981),
// reproduced with the papers' own parameter values: p1,US = 0.6, p1,CS = 0.3
// for punctate cues and 0.1 for long ones, pd1 = 0.1, pd2 = 0.02, L⁺ = 0.1,
// L⁻ = 0.02, r1 = 1, r2 = 0.01, C1 = 2, C2 = 10. The papers assume every
// node is inactive at the start of an episode and run each episode for 100
// moments after its last stimulus. Here trials are 400 moments apart, which
// lets the previous trial's activity fade to nothing, and a punctate
// stimulus is on for one moment. The figures are read for their ordinal
// claims, which the paper says are the ones that do not depend on the
// parameter values (p. 15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as sop from '../js/models/sop.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';

const PAPER = { p1US: 0.6, pd1: 0.1, pd2: 0.02, Lp: 0.1, Lm: 0.02, r1: 1, r2: 0.01, C1: 2, C2: 10 };
const cueP = (p1) => Object.fromEntries(['A', 'B', 'C', 'X'].map((c) => [`p1_${c}`, p1]));
const run = (text, { p1 = 0.3, params = {}, options = {} } = {}) =>
  runModel(sop, { design: parseDesign(text), params: { ...PAPER, ...cueP(p1), ...params }, options: { links: false, ...options } });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);
const dV = (r, n, cue = 'A') => r.trials[n - 1].perCue[cue].deltaV;
const decreasing = (xs) => xs.every((x, i) => i === 0 || x < xs[i - 1]);
// A trace trial: a punctate cue, the US four moments later.
const T = '[CS 1-1, US 5-5, ITI 400]';
const TN = '[CS 1-1, ITI 400]';

test('Eqs. 1.9 and 1.10: after a punctate stimulus, A1 decays exponentially and A2 rises then falls', () => {
  // With no other stimulation the distractor rules do nothing, so the decay
  // functions are the papers' exactly.
  const r = run('1 A- [CS 1-1, ITI 100]');
  const m = r.trials[0].moments;
  const a1 = m.A1.A;
  const a2 = m.A2.A;
  close(a1[0], 0.3);
  for (let t = 1; t < 60; t++) close(a1[t], 0.3 * 0.9 ** t, 1e-12);
  // Eq. 1.10 with p_A2,0 = 0: the elements that left A1 by moment t and have not yet left A2.
  for (let t = 1; t < 60; t++) {
    let want = 0;
    for (let i = 1; i <= t; i++) want += 0.3 * 0.9 ** (i - 1) * 0.1 * 0.98 ** (t - i);
    close(a2[t], want, 1e-12);
  }
  const peak = a2.indexOf(Math.max(...a2));
  assert.ok(peak > 5 && a2[peak] > a2[0] && a2[a2.length - 1] < a2[peak]);
});

test('Fig. 1-2b: forward conditioning is excitatory and falls off with the CS-US interval; simultaneous onset is best', () => {
  const vals = [0, 1, 2, 4, 8, 16, 32].map((k) => dV(run(`1 A+ [CS 1-1, US ${1 + k}-${1 + k}, ITI 100]`), 1));
  assert.ok(vals.every((v) => v > 0));
  assert.ok(decreasing(vals), vals.join(', '));
});

test('Fig. 1-2b: backward conditioning is excitatory at short US-CS intervals, inhibitory at longer ones, and fades away', () => {
  const at = (k) => dV(run(`1 A+ [US 1-1, CS ${1 + k}-${1 + k}, ITI 100]`), 1);
  assert.ok(at(1) > 0 && at(4) > 0, 'short backward intervals condition excitation');
  assert.ok(at(16) < 0 && at(32) < 0, 'longer intervals condition inhibition');
  assert.ok(at(32) < at(64) && at(64) < 0, 'the inhibition fades at very long intervals');
  // Simultaneous onset conditions more than any forward or backward interval.
  const simultaneous = dV(run('1 A+ [CS 1-1, US 1-1, ITI 100]'), 1);
  assert.ok(simultaneous > at(1) && simultaneous > dV(run('1 A+ [CS 1-1, US 2-2, ITI 100]'), 1));
});

test('Fig. 1-3a: a stimulus left on rises to a peak of A1 activity and then declines to a plateau', () => {
  const m = run('1 A- [CS 1-80, ITI 20]', { p1: 0.1 }).trials[0].moments;
  const a1 = Array.from(m.A1.A.slice(0, 80));
  const peak = a1.indexOf(Math.max(...a1));
  assert.ok(peak > 3 && peak < 20, `peak at moment ${peak + 1}`);
  assert.ok(a1[79] < a1[peak] * 0.6, 'declines well below the peak');
  assert.ok(Math.abs(a1[79] - a1[70]) < 0.01, 'and settles');
});

test('Fig. 1-3c: in delay conditioning, learning first rises and then falls with CS duration, and stays positive', () => {
  const vals = [1, 2, 4, 8, 16, 24, 40, 80].map((d) => dV(run(`1 A+ [CS 1-${d}, US ${d}-${d}, ITI 100]`, { p1: 0.1 }), 1));
  const peak = vals.indexOf(Math.max(...vals));
  assert.ok(peak > 0 && peak < vals.length - 1, `peak at index ${peak}: ${vals.join(', ')}`);
  assert.ok(decreasing(vals.slice(peak)) && decreasing(vals.slice(0, peak + 1).reverse()));
  assert.ok(vals.every((v) => v > 0));
});

test('Fig. 1-4b: an extra CS before the trial helps at very short intervals and hurts at intermediate ones', () => {
  const base = dV(run('1 A+ [CS 1-1, US 1-1, ITI 100]'), 1);
  const withPre = (g) => {
    const r = run(`Pre: 1 A- [CS 1-1, ITI ${g - 1}]\nTrial: 1 A+ [CS 1-1, US 1-1, ITI 100]`);
    return dV(r, 1) + dV(r, 2);
  };
  assert.ok(withPre(1) > base && withPre(2) > base, 'a CS just before adds A1 activity');
  assert.ok(withPre(16) < base && withPre(32) < base, 'a CS some moments before leaves elements stuck in A2');
  assert.ok(withPre(64) > withPre(32), 'and the effect wears off');
});

test('Fig. 1-5b: a US before the trial reduces conditioning most at intermediate intervals', () => {
  const base = dV(run('1 A+ [CS 1-1, US 1-1, ITI 100]'), 1);
  const withPre = (g) => {
    const r = run(`Pre: 1 + [US 1-1, ITI ${g - 1}]\nTrial: 1 A+ [CS 1-1, US 1-1, ITI 100]`);
    return dV(r, 1) + dV(r, 2);
  };
  const vals = [1, 4, 16, 64, 128].map(withPre);
  assert.ok(vals.every((v) => v < base));
  const worst = vals.indexOf(Math.min(...vals));
  assert.ok(worst > 0 && worst < vals.length - 1, `worst at index ${worst}: ${vals.join(', ')}`);
});

test('Fig. 1-6b: a stimulus after the trial cuts its learning short, the more so the sooner it comes (distractor rules)', () => {
  const after = (g, options) => {
    const r = run(`Trial: 1 A+ [CS 1-1, US 1-1, ITI ${g - 1}]\nPost: 1 B- [CS 1-1, ITI 100]`, { options });
    return dV(r, 1) + dV(r, 2);
  };
  const vals = [1, 2, 4, 8, 16, 32].map((g) => after(g));
  assert.ok(vals.every((v, i) => i === 0 || v > vals[i - 1]), vals.join(', '));
  const base = dV(run('1 A+ [CS 1-1, US 1-1, ITI 100]'), 1);
  assert.ok(vals[0] < 0.75 * base);
  // Without the distractor rules a stimulus after the trial changes nothing,
  // however soon it comes.
  close(after(1, { distractors: false }), after(32, { distractors: false }), 1e-3);
});

test('Fig. 1-7: acquisition is negatively accelerated and levels off; the first extinction trial is strongly inhibitory and extinction decelerates', () => {
  const r = run(`Acq: 60 A+ ${T}\nExt: 20 A- ${TN}`);
  const steps = [1, 10, 30, 50, 60].map((n) => dV(r, n));
  assert.ok(decreasing(steps), steps.join(', '));
  assert.ok(dV(r, 50) < 0.15 * dV(r, 1), 'by trial 50 the increment is close to zero');
  // On the fiftieth trial inhibition before the US nearly balances the gain after it.
  const t50 = r.trials[49].perCue.A;
  assert.ok(t50.inhibit > 0.5 * t50.excite, `gain ${t50.excite}, loss ${t50.inhibit}`);
  // Extinction: the cue still calls the US up into A2, and nothing arrives to balance it.
  assert.ok(dV(r, 61) < -0.5 * dV(r, 1), `first extinction trial ${dV(r, 61)}`);
  const ext = [61, 65, 70, 80].map((n) => dV(r, n));
  assert.ok(ext.every((v) => v < 0) && ext.every((v, i) => i === 0 || v > ext[i - 1]), ext.join(', '));
});

test('Fig. 1-8: blocking, conditioned inhibition, and supernormal conditioning, with no supernormal effect on the first compound trial', () => {
  const none = run(`Comp: 20 BX+ ${T}`);
  const blocked = run(`Pre: 60 B+ ${T}\nComp: 20 BX+ ${T}`);
  const inhibitory = run(`Pre: 60 C+ ${T}, 60 BC- ${TN}\nComp: 20 BX+ ${T}`);
  const alone = run(`20 X+ ${T}`);
  // Top and middle panels: X's fate varies inversely with B's strength.
  assert.ok(final(blocked, 'X') < 0.2 * final(none, 'X'), `blocked ${final(blocked, 'X')} vs ${final(none, 'X')}`);
  // Bottom left: B becomes a conditioned inhibitor through C+ / BC−.
  assert.ok(inhibitory.series.B[120] < -0.2, `V_B = ${inhibitory.series.B[120]}`);
  // Bottom right: X conditions supernormally beside the inhibitor.
  assert.ok(final(inhibitory, 'X') > final(none, 'X') + 0.1);
  // "SOP predicts that supernormal conditioning will not occur on the first
  // compound trial": p2 is zero whether V_B is negative or zero.
  close(dV(inhibitory, 121, 'X'), dV(alone, 1, 'X'), 1e-4);
  // From the second trial on, X's increments exceed a lone cue's.
  for (const n of [2, 3, 4]) assert.ok(dV(inhibitory, 120 + n, 'X') > dV(alone, n, 'X'));
});

test('p. 30: compounding two trained cues with the US reduces both (overexpectation)', () => {
  const r = run(`Train: 60 A+ ${T}, 60 B+ ${T}\nComp: 10 AB+ ${T}`);
  assert.ok(final(r, 'A') < r.series.A[120] - 0.1, `A ${r.series.A[120]} -> ${final(r, 'A')}`);
  assert.ok(final(r, 'B') < r.series.B[120] - 0.1);
});

test('p. 30: an inhibitor presented alone does not extinguish, because p2 is zero for a negative V', () => {
  const r = run(`Pre: 60 C+ ${T}, 60 BC- ${TN}\nExt: 20 B- ${TN}`);
  close(final(r, 'B'), r.series.B[120], 1e-4);
  assert.ok(r.series.B[120] < -0.2);
});

test('p. 31: one-trial overshadowing through the activity limits', () => {
  // Two cues on together raise the decay from A1, so each is displaced
  // sooner than a cue alone would be, and learns less on the very first trial.
  const T8 = '[CS 1-8, US 8-8, ITI 100]';
  const together = dV(run(`1 BX+ ${T8}`, { p1: 0.1 }), 1, 'X');
  const alone = dV(run(`1 X+ ${T8}`, { p1: 0.1 }), 1, 'X');
  assert.ok(together < 0.9 * alone, `${together} vs ${alone}`);
  // Without the distractor rules there is no overshadowing on trial 1.
  close(dV(run(`1 BX+ ${T8}`, { p1: 0.1, options: { distractors: false } }), 1, 'X'), dV(run(`1 X+ ${T8}`, { p1: 0.1, options: { distractors: false } }), 1, 'X'), 1e-12);
});

test('p. 33: with A1 held constant, the overlap of a context with the US in A1 and in A2 is in the ratio pd2 : pd1', () => {
  // So with L⁺/L⁻ = pd1/pd2, as the papers set them, a static context gains
  // no net strength from a US presented in it. The context here switches
  // on with the trial, so it is near but not exactly at equilibrium.
  const r = run('1 + [US 200-200, ITI 300]\nContext: Z', { params: { p1_Z: 0.05 }, options: { distractors: false, retrieval: false } });
  const z = r.trials[0].perCue.Z;
  close(z.overlapExcite / z.overlapInhibit, PAPER.pd2 / PAPER.pd1, 0.02);
  assert.ok(Math.abs(z.deltaV) < 0.02 * z.excite);
});

test('Wagner (1981), Fig. 1.3: the response is a weighted sum of the US in A1 and A2', () => {
  const r = run('1 A+ [CS 1-1, US 5-5, ITI 20]', { params: { w1: 1, w2: -0.5 } });
  const m = r.trials[0].moments;
  for (let k = 0; k < m.length; k++) close(m.response[k], 1 * m.A1.US[k] - 0.5 * m.A2.US[k], 1e-12);
});
