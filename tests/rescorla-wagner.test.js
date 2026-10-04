import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rw from '../js/models/rescorla-wagner.js';
import * as spec from '../content/equations/rescorla-wagner.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final, phaseEnd } from '../js/core/runner.js';
import { evaluate } from '../js/ui/equation.js';

const run = (text, params = {}, options = {}) => runModel(rw, { design: parseDesign(text), params, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

test('acquisition follows the closed form λ(1 − (1 − αβ)^n)', () => {
  const r = run('30 A+', { alpha_A: 0.3, beta: 0.5 });
  for (let n = 0; n <= 30; n++) close(r.series.A[n], 1 - (1 - 0.15) ** n);
});

test('the asymptote equals λ', () => {
  close(final(run('300 A+'), 'A'), 1, 1e-6);
  close(final(run('300 A+', { lambda: 0.5 }), 'A'), 0.5, 1e-6);
  close(final(run('300 A+(0.7)'), 'A'), 0.7, 1e-6);
});

test('extinction returns strength to zero', () => {
  const r = run('30 A+\n300 A-');
  assert.ok(phaseEnd(r, 0, 'A') > 0.9);
  close(final(r, 'A'), 0, 1e-6);
});

test('blocking: B gains far less than D', () => {
  const r = run('20 A+\n20 AB+, 20 CD+');
  assert.ok(final(r, 'B') < 0.05);
  assert.ok(final(r, 'D') > 0.45);
});

test('overshadowing: compound cues split λ in the ratio of their saliences', () => {
  const r = run('200 AB+, 200 C+', { alpha_A: 0.4, alpha_B: 0.1 });
  for (let n = 1; n <= r.trials.length; n++) {
    if (r.series.A[n] > 0) close(r.series.A[n] / r.series.B[n], 4, 1e-9);
  }
  close(final(r, 'A') + final(r, 'B'), 1, 1e-6);
  close(final(r, 'A'), 0.8, 1e-6);
  close(final(r, 'C'), 1, 1e-6);
});

test('conditioned inhibition: X approaches −λ', () => {
  const r = run('400 A+, 400 AX-');
  close(final(r, 'A'), 1, 1e-3);
  close(final(r, 'X'), -1, 1e-3);
});

test('absent cues never change', () => {
  const r = run('20 AB+, 20 CD+\n20 A+');
  const b = r.series.B;
  for (let n = 41; n <= 60; n++) assert.equal(b[n], b[40]);
});

test('individual error removes blocking', () => {
  const r = run('20 A+\n20 AB+, 20 CD+', {}, { summedError: false });
  close(final(r, 'B'), final(r, 'D'), 1e-12);
});

test('separate β for non-reinforced trials slows extinction', () => {
  const fast = final(run('30 A+\n5 A-'), 'A');
  const slow = final(run('30 A+\n5 A-', { betaMinus: 0.05 }, { separateBeta: true }), 'A');
  assert.ok(slow > fast);
});

test('the displayed equations evaluate to the numbers the model used', () => {
  const combos = [];
  for (const summedError of [true, false])
    for (const useAlpha of [true, false])
      for (const separateBeta of [true, false]) combos.push({ summedError, useAlpha, separateBeta });
  for (const options of combos) {
    const r = run('10 A+\n10 AB+, 10 AX-, random', { alpha_A: 0.4, alpha_B: 0.2, alpha_X: 0.25 }, options);
    const eqs = spec.equations(options);
    for (const rec of r.trials) {
      for (const cue of rec.present) {
        const ctx = { spec, rec, cue, present: rec.present };
        for (const eq of eqs) {
          const got = evaluate(eq.rhs, ctx);
          const want = { sum: rec.sumV, update: rec.perCue[cue].deltaV, apply: rec.Vafter[cue] }[eq.id];
          close(got, want, 1e-12);
        }
      }
    }
  }
});

test('the trial table columns read the record', () => {
  const r = run('5 AB+');
  const cols = spec.tableColumns(rw.options.reduce((o, x) => ({ ...o, [x.key]: x.default }), {}), r.cues);
  const rec = r.trials[0];
  const v = Object.fromEntries(cols.map((c) => [`${c.sym}${c.cue ?? ''}`, c.value(rec)]));
  close(v.lambda, 1);
  close(v.sumV, 0);
  close(v.error, 1);
  close(v.dVA, 0.15);
  close(v.VA, 0.15);
});
