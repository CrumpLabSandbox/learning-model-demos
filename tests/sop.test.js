import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as sop from '../js/models/sop.js';
import * as spec from '../content/equations/sop.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';
import { evaluate } from '../js/ui/equation.js';

const run = (text, params = {}, options = {}) => runModel(sop, { design: parseDesign(text), params, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('the first moments of a trial, worked by hand', () => {
  const r = run('1 A+', { p1_A: 0.2, pd1: 0.15, pd2: 0.03, p1US: 0.5 }, { distractors: false });
  const m = r.trials[0].moments;
  // Moment 1: 0.2 of the inactive elements go to A1.
  close(m.A1.A[0], 0.2);
  close(m.A2.A[0], 0);
  // Moment 2: 0.8 inactive; 0.2 × 0.8 = 0.16 go to A1; 0.15 × 0.2 = 0.03 decay to A2.
  close(m.A1.A[1], 0.2 + 0.16 - 0.03);
  close(m.A2.A[1], 0.03);
  // Moment 3: 0.64 inactive; 0.128 go to A1; 0.0495 decay to A2; 0.0009 back to inactive.
  close(m.A1.A[2], 0.33 + 0.128 - 0.0495);
  close(m.A2.A[2], 0.03 + 0.0495 - 0.0009);
  // The US arrives at moment 9 (the default timing) and half its elements go to A1.
  assert.equal(m.A1.US[7], 0);
  close(m.A1.US[8], 0.5);
});

test('a trial\'s learning is L⁺ times the A1 overlap minus L⁻ times the A2 overlap, over every moment', () => {
  const r = run('3 A+, 2 AB-\nContext: Z');
  for (const rec of r.trials) {
    const m = rec.moments;
    for (const c of r.cues) {
      let e = 0;
      let i = 0;
      for (let k = 0; k < m.length; k++) {
        e += m.A1[c][k] * m.A1.US[k];
        i += m.A1[c][k] * m.A2.US[k];
      }
      const p = rec.perCue[c];
      close(p.overlapExcite, e, 1e-12);
      close(p.overlapInhibit, i, 1e-12);
      close(p.deltaV, rec.Lp * e - rec.Lm * i, 1e-12);
      close(rec.Vafter[c], rec.Vbefore[c] + p.deltaV, 1e-12);
    }
  }
});

test('proportions stay between 0 and 1 and never add up to more than 1', () => {
  const r = run('Pre: 10 A-\nTrain: 10 AB+ [ITI 3], 10 A+ [US 1-2, CS 3-8]\nExt: 5 AB-\nContext: Z', { p1_A: 0.9, p1US: 1, r1: 2 });
  for (const rec of r.trials) {
    const m = rec.moments;
    for (const n of m.nodes) {
      for (let k = 0; k < m.length; k++) {
        assert.ok(m.A1[n][k] >= -1e-12 && m.A2[n][k] >= -1e-12, `${n} at moment ${k + 1}`);
        assert.ok(m.A1[n][k] + m.A2[n][k] <= 1 + 1e-12, `${n} at moment ${k + 1}`);
      }
    }
  }
});

test('a stimulus left on settles where A1 = p1·I/pd1 and A2 = p1·I/pd2', () => {
  // The context is on at every moment. With nothing linked to it, it settles
  // where as many elements enter each state as leave it.
  const p = { p1_Z: 0.05, pd1: 0.15, pd2: 0.03 };
  const r = run('Train: 4 A- [ITI 400]\nContext: Z', p, { links: false, distractors: false });
  const m = r.trials[3].moments;
  const I = 1 / (1 + p.p1_Z / p.pd1 + p.p1_Z / p.pd2);
  close(m.A1.Z[m.length - 1], (p.p1_Z * I) / p.pd1, 1e-6);
  close(m.A2.Z[m.length - 1], (p.p1_Z * I) / p.pd2, 1e-6);
});

test('after the stimulus goes off, A1 decays by a fixed fraction each moment', () => {
  const r = run('1 A-', { pd1: 0.2 }, { distractors: false });
  const a = r.trials[0].moments.A1.A;
  for (let k = 10; k < 20; k++) close(a[k], a[k - 1] * 0.8, 1e-12);
});

test('without associative activation nothing limits learning: identical trials give identical steps', () => {
  const r = run('6 A+ [ITI 400]', {}, { retrieval: false, inhibition: false, links: false, distractors: false });
  const steps = r.trials.map((t) => t.perCue.A.deltaV);
  // (The US's A2 from the trial before has faded to almost nothing.)
  for (const s of steps) close(s, steps[0], 1e-4);
});

test('acquisition levels off as the cue calls up the US into A2 before it arrives', () => {
  const r = run('60 A+');
  close(final(r, 'A'), r.series.A[50], 0.01);
  const first = r.trials[0].moments;
  const last = r.trials[59].moments;
  // Just before the US arrives, the trained cue has put US elements in A2...
  assert.equal(first.A2.US[7], 0);
  assert.ok(last.A2.US[7] > 0.3, `A2 of the US = ${last.A2.US[7]}`);
  // ...so fewer go to A1 when it does arrive.
  assert.ok(Math.max(...last.A1.US) < Math.max(...first.A1.US) - 0.2);
});

test('a trained cue calls up the US into A2, never into A1', () => {
  const r = run('30 A+\n1 A-');
  const m = r.trials[30].moments;
  assert.ok(Math.max(...m.A1.US) < 1e-6);
  assert.ok(Math.max(...m.A2.US) > 0.3);
  // The "what each cue calls up" test reads the same thing.
  assert.equal(r.stateSeries.recall.A[0], 0);
  assert.ok(r.stateSeries.recall.A[30] > 0.3);
});

test('the longer the gap between cue and US, the less is learned', () => {
  const ends = [11, 16, 21, 31].map((us) => final(run(`20 A+ [CS 1-10, US ${us}-${us + 1}]`), 'A'));
  for (let i = 1; i < ends.length; i++) assert.ok(ends[i] < ends[i - 1], ends.join(', '));
});

test('backward pairings make an inhibitor; forward pairings an excitor', () => {
  const r = run('30 A+ [US 1-2, CS 16-25], 30 B+');
  assert.ok(final(r, 'A') < -0.1);
  assert.ok(final(r, 'B') > 0.5);
});

test('the context comes to call up a cue shown in it, unless cues do not link', () => {
  // links holds each trial's links before the trial: these are after 30 A- trials.
  const on = run('31 A-\nContext: Z');
  assert.ok(on.trials[30].links.Z.A > 0.1, `Z→A = ${on.trials[30].links.Z.A}`);
  const off = run('31 A-\nContext: Z', {}, { links: false });
  assert.equal(off.trials[30].links.Z.A, 0);
});

test('the US size multiplies its intensity, up to 1', () => {
  const r = run('1 A+, 1 A+(2), 1 A+(0.5)', { p1US: 0.6 });
  close(r.trials[0].usP1, 0.6);
  close(r.trials[1].usP1, 1);
  close(r.trials[2].usP1, 0.3);
});

test('the displayed equations evaluate to the numbers the model used', () => {
  const combos = [];
  for (const retrieval of [true, false]) for (const inhibition of [true, false]) for (const links of [true, false]) combos.push({ retrieval, inhibition, links });
  for (const options of combos) {
    const r = run('8 A+\n8 AB+, 8 AX-, random\n6 A- [CS 1-6]\n4 AB+(2) [US 12-13]\n3 A+ [US 1-2, CS 5-9]\nContext: Z', { p1_A: 0.3 }, options);
    const eqs = spec.equations(options);
    for (const rec of r.trials) {
      for (const cue of rec.present) {
        const ctx = { spec, rec, cue, present: rec.present };
        const p = rec.perCue[cue];
        const want = { recall: spec.symbols.p2US.value(rec), excite: p.excite, inhibit: p.inhibit, net: p.deltaV, apply: p.Vafter };
        for (const eq of eqs) close(evaluate(eq.rhs, ctx), want[eq.id], eq.id === 'recall' ? 1e-6 : 1e-12);
      }
    }
  }
});
