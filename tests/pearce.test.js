// Pearce (1987): hand-worked trials, the two simulated figures, and the
// predictions the paper states in words. Page numbers are to Psychological
// Review, 94.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as pearce from '../js/models/pearce.js';
import * as spec from '../content/equations/pearce.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';
import { evaluate } from '../js/ui/equation.js';

const run = (text, params = {}, options = {}) => runModel(pearce, { design: parseDesign(text), params, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);
const cfg = (rec, key) => rec.configs.find((c) => c.key === key);

test('Eq. 3: similarity is the product of the shares the common stimuli take up in each configuration', () => {
  // Equal intensities, no context: a compound and an element share the element,
  // which is half of the compound and all of itself.
  const r = run('1 AB+\n1 A+');
  close(r.trials[1].top.S, 0.5);
  // Unequal intensities: AB is more like its more intense element.
  const u = run('1 AB+\n1 A+\n1 B+', { P_A: 0.8, P_B: 0.2 });
  close(u.trials[1].top.S, 0.8 / 1.0);
  close(u.trials[2].top.S, 0.2 / 1.0);
  // Nothing in common: 0. With a context: the context's shares.
  const d = run('1 A+\n1 B+');
  assert.equal(d.trials[1].top.S, 0);
  const c = run('1 A+\n1 B+\nContext: Z', { P_A: 0.5, P_B: 0.5, P_Z: 0.5 });
  close(c.trials[1].top.S, (0.5 / 1.0) * (0.5 / 1.0));
  // Symmetric: the similarity of A to AB equals that of AB to A.
  const ab = run('1 A+\n1 AB+', { P_A: 0.8, P_B: 0.2 });
  close(ab.trials[1].top.S, u.trials[1].top.S);
});

test('Eqs. 6 to 10, worked by hand: borrow by similarity, learn from the discrepancy', () => {
  const r = run('2 A+\n1 AB+', { beta: 0.25 });
  // A+: E_A = 0.25, then 0.25 + 0.25 × 0.75 = 0.4375.
  close(r.trials[0].deltaE, 0.25);
  close(r.trials[1].Eafter, 0.4375);
  // AB+: new configuration, borrows S × E_A = 0.5 × 0.4375 from A.
  const t = r.trials[2];
  assert.ok(t.isNew);
  close(t.e, 0.5 * 0.4375);
  close(t.V, 0.5 * 0.4375);
  close(t.delta, 0.25 * (1 - 0.5 * 0.4375));
  close(t.deltaE, t.delta);
  assert.equal(t.deltaI, 0);
  // B alone borrows half of what AB has.
  close(r.series.B[3], 0.5 * t.Eafter);
});

test('a negative discrepancy adds inhibition and leaves excitation alone (p. 67)', () => {
  const r = run('10 A+\n5 A-');
  const t = r.trials[10];
  assert.ok(t.delta < 0);
  assert.equal(t.deltaE, 0);
  close(t.deltaI, -t.delta);
  close(t.Eafter, t.Ebefore);
  // With the option off, excitation is weakened instead, as in Rescorla-Wagner.
  const w = run('10 A+\n40 A-', {}, { inhibition: false });
  assert.equal(w.trials[10].deltaI, 0);
  close(w.trials[10].deltaE, w.trials[10].delta);
  close(final(w, 'A'), 0, 1e-3);
  assert.ok(cfg(w.trials[49], 'A').I === 0);
});

test('Figure 1 (p. 68): A+ / AB− with β = 0.25 and S = 0.5 ends with E_A = 4/3, I_AB = 2/3, V_A = λ, V_AB = 0', () => {
  // The paper starts the discrimination with E_A = 1 = λ.
  const r = run('Pre: 60 A+\nDisc: 60 A+, 60 AB-', { beta: 0.25 });
  const last = r.trials[r.trials.length - 1];
  close(cfg(last, 'A').E, 4 / 3, 1e-3);
  close(cfg(last, 'AB').I, 2 / 3, 1e-3);
  close(final(r, 'A'), 1, 1e-3);
  close(r.series.AB[r.trials.length], 0, 1e-3);
  // B alone borrows half of AB's inhibition and no excitation: a conditioned inhibitor.
  close(final(r, 'B'), -1 / 3, 1e-3);
  // On its first trial AB predicts half of A's strength by generalisation.
  const firstAB = r.trials.find((t) => t.key === 'AB');
  close(firstAB.V, 0.5 * cfg(r.trials[r.trials.indexOf(firstAB) - 1], 'A').E, 1e-9);
});

test('Figure 2 (p. 69): A− / AB+ ends with E_AB = 4/3, I_A = 2/3, V_AB = λ, V_A = 0, and B alone at 2/3', () => {
  const r = run('Disc: 80 A-, 80 AB+', { beta: 0.25 });
  const last = r.trials[r.trials.length - 1];
  close(cfg(last, 'AB').E, 4 / 3, 1e-3);
  close(cfg(last, 'A').I, 2 / 3, 1e-3);
  close(r.series.AB[160], 1, 1e-3);
  close(final(r, 'A'), 0, 1e-3);
  close(final(r, 'B'), 2 / 3, 1e-3);
  // The feature's response depends on its relative intensity (Young & Pearce, 1984).
  const faint = run('Disc: 80 A-, 80 AB+', { P_A: 0.8, P_B: 0.2 });
  const intense = run('Disc: 80 A-, 80 AB+', { P_A: 0.2, P_B: 0.8 });
  assert.ok(final(faint, 'B') < final(intense, 'B') - 0.2, `${final(faint, 'B')} vs ${final(intense, 'B')}`);
});

test('p. 66: overshadowing is generalisation decrement, present after one trial, and largest for the fainter element', () => {
  const one = run('1 AB+');
  const alone = run('1 B+');
  close(one.series.B[1], 0.5 * alone.series.B[1]);
  const unequal = run('20 AB+', { P_A: 0.8, P_B: 0.2 });
  assert.ok(final(unequal, 'B') < final(unequal, 'A') - 0.3);
});

test('p. 66: external inhibition is the mirror of overshadowing, with the same decrement', () => {
  // Train A then test AB, or train AB then test A: S is the same both ways.
  const trainA = run('30 A+\nTest: A, AB');
  const trainAB = run('30 AB+\nTest: A, AB');
  const vAB = trainA.series.AB[30];
  const vA = trainAB.series.A[30];
  close(vAB / final(trainA, 'A'), vA / trainAB.series.AB[30], 1e-9);
});

test('p. 67: overexpectation needs the context; without it the compound of two trained cues predicts exactly λ', () => {
  const noCtx = run('Train: 40 A+, 40 B+\nComp: 10 AB+');
  close(noCtx.series.AB[80], 1, 1e-3);
  close(final(noCtx, 'A'), noCtx.series.A[80], 1e-3);
  const ctx = run('Train: 40 A+, 40 B+\nComp: 10 AB+\nContext: Z', { P_Z: 0.3 });
  assert.ok(ctx.series.AB[80] > 1.02, `AB predicts ${ctx.series.AB[80]}`);
  assert.ok(final(ctx, 'A') < ctx.series.A[80], 'A loses strength');
});

test('p. 67: blocking depends on the relative intensity of the pretrained and the added cue', () => {
  const design = 'Pre: 30 A+\nComp: 30 AB+, 30 CD+';
  const equal = run(design);
  const intenseA = run(design, { P_A: 0.8, P_B: 0.2, P_C: 0.8, P_D: 0.2 });
  const faintA = run(design, { P_A: 0.2, P_B: 0.8, P_C: 0.2, P_D: 0.8 });
  // Relative to the overshadowing control D with the same intensities: a
  // faint pretrained cue barely blocks ("not too dissimilar from
  // overshadowing"); an intense one leaves B very weak.
  const ratio = (r) => final(r, 'B') / final(r, 'D');
  assert.ok(ratio(faintA) > ratio(equal) && ratio(equal) > ratio(intenseA), `${ratio(faintA)} ${ratio(equal)} ${ratio(intenseA)}`);
  assert.ok(ratio(faintA) > 0.75 && ratio(intenseA) < 0.3);
});

test('p. 69: a conditioned inhibitor works better in a summation test with the cue it was trained with', () => {
  const r = run('Disc: 60 A+, 60 AX-, 60 C+\nTest: AX, CX, A, C');
  const n = r.trials.length;
  // AX ends at 0; CX borrows C's excitation and some of AX's inhibition and stays positive.
  close(r.series.AX[n], 0, 1e-3);
  assert.ok(r.series.CX[n] > 0.3 && r.series.CX[n] < r.series.C[n]);
});

test('without generalisation every pattern is a stranger: no blocking, no overshadowing, but negative patterning still', () => {
  const o = { generalisation: false };
  const b = run('Pre: 20 A+\nComp: 20 AB+, 20 CD+', {}, o);
  assert.equal(final(b, 'B'), 0);
  assert.equal(final(b, 'D'), 0);
  const np = run('40 A+, 40 B+, 40 AB-\nTest: A, B, AB', {}, o);
  assert.ok(np.series.A[120] > 0.95 && np.series.AB[120] === 0);
});

test('the displayed equations evaluate to the numbers the model used', () => {
  const combos = [];
  for (const generalisation of [true, false]) for (const inhibition of [true, false]) combos.push({ generalisation, inhibition });
  for (const options of combos) {
    const r = run('6 A+\n6 AB+, 6 AX-, random\n4 A-\n4 AB+(2)\nContext: Z', { P_A: 0.7 }, options);
    const eqs = spec.equations(options);
    for (const rec of r.trials) {
      const ctx = { spec, rec, cue: rec.present[0], present: rec.present };
      const want = { similarity: rec.top?.S, genE: rec.e, genI: rec.i, net: rec.V, delta: rec.delta, excite: rec.deltaE, inhibit: rec.deltaI, apply: rec.Eafter, applyI: rec.Iafter };
      for (const eq of eqs) {
        if (eq.when && !eq.when(rec)) continue;
        close(evaluate(eq.rhs, ctx), want[eq.id], 1e-12);
      }
    }
  }
});
