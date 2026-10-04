import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as mal from '../js/models/minerva-al.js';
import * as spec from '../content/equations/minerva-al.js';
import { parseDesign } from '../js/core/design.js';
import { runModel, final } from '../js/core/runner.js';
import { evaluate } from '../js/ui/equation.js';

const run = (text, params = {}, options = {}) => runModel(mal, { design: parseDesign(text), params, options });
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);
const exact = { L: 1, noise: 0, learners: 1 };

test('with every feature stored and no noise, one trial is enough, worked by hand', () => {
  const r = run('3 A+', exact);
  const [t1, t2, t3] = r.trials.map((t) => t.learner);
  // Trial 1: memory is empty, the echo is all zeros, and the event is stored whole.
  assert.equal(t1.before, 0);
  assert.equal(t1.retrieval, 0);
  assert.deepEqual([...t1.trace], [...t1.event]);
  // Trial 2: the probe (A and the context) matches trace 1's cue features
  // exactly: cosine 40 / (√40 × √40) = 1, activation 1. The scaled echo is
  // trace 1, so the outcome comes back perfectly, and nothing new is stored.
  close(t2.topSim, 1);
  close(t2.topAct, 1);
  close(t2.retrieval, 1);
  assert.ok(t2.trace.every((v) => Math.abs(v) < 1e-12));
  close(t3.retrieval, 1);
});

test('a missing outcome is stored as its opposite, and only cue features count for similarity', () => {
  const r = run('1 A+\n1 A-\n1 A-', exact);
  const t2 = r.trials[1].learner;
  const F = r.trials[1].F;
  const out = r.trials[1].fields.indexOf(mal.OUTCOME);
  // A brought back the outcome, which did not come: the trace is −1 on every
  // outcome feature and 0 everywhere else.
  for (let j = 0; j < t2.trace.length; j++) close(t2.trace[j], j >= out * F && j < (out + 1) * F ? -1 : 0);
  // That trace has no cue features, so its similarity to the next probe is 0,
  // even though its outcome features are not.
  const t3 = r.trials[2].learner;
  close(t3.sims[1], 0);
  close(t3.sims[0], 1);
});

test('the scaled echo has largest feature ±1, and retrieval is the mean of its outcome features', () => {
  const r = run('10 A+, 10 AB-\nContext: Z', { learners: 1 });
  for (const rec of r.trials.slice(1)) {
    const l = rec.learner;
    close(Math.max(...l.echo.map(Math.abs)), 1, 1e-12);
    const out = rec.fields.indexOf(mal.OUTCOME) * rec.F;
    close(l.retrieval, l.echo.slice(out, out + rec.F).reduce((a, b) => a + b, 0) / rec.F, 1e-12);
  }
});

test('activation keeps the sign of similarity', () => {
  close(mal.activation(-0.5, 3), -0.125);
  close(mal.activation(-0.5, 2), -0.25);
  close(mal.activation(0.9, 3), 0.729);
});

test('a design without a context gets one of its own, in every probe', () => {
  const r = run('2 A+');
  assert.ok(r.trials[0].ownContext);
  assert.ok(r.trials[0].fields.includes(mal.OWN_CONTEXT));
  assert.ok(!r.labels.includes(mal.OWN_CONTEXT));
});

test('the same seed gives the same learners; another seed differs', () => {
  const a = runModel(mal, { design: parseDesign('10 A+, 10 B-, random'), seed: 3 });
  const b = runModel(mal, { design: parseDesign('10 A+, 10 B-, random'), seed: 3 });
  const c = runModel(mal, { design: parseDesign('10 A+, 10 B-, random'), seed: 4 });
  assert.deepEqual(a.series, b.series);
  assert.notDeepEqual(a.series, c.series);
  assert.ok(a.spread.A.every((s) => s >= 0));
});

// Published results: Jamieson, Crump, & Hannah (2012), the L = .67 column,
// 25 replications. Intermixed trials are shuffled. Each row is the paper's
// mean, and the tolerance allows for the random storage and noise.
const L67 = (d, probe) => final(run(`${d}\nTest: ${probe}`, { L: 0.67 }), probe);
const published = [
  ['Table 2, conditioned inhibition: X|A', 'T: 50 A+, 50 AB-, random', 'A', 0.97, 0.05],
  ['Table 2, conditioned inhibition: X|B', 'T: 50 A+, 50 AB-, random', 'B', -0.21, 0.12],
  ['Table 3, summation: X|BC', 'P1: 50 A+, 50 AB-, random\nP2: 50 C+', 'BC', 0.18, 0.1],
  ['Table 3, summation: X|CD', 'P1: 50 A+, 50 AB-, random\nP2: 50 C+', 'CD', 0.92, 0.05],
  ['Table 5, external inhibition: X|AB', 'T: 50 A+', 'AB', 0.85, 0.05],
  ['Table 7, blocking: X|B', 'P1: 50 A+\nP2: 50 AB+', 'B', 0.3, 0.06],
  ['Table 7, control 1: X|B', 'P1: 50 C+\nP2: 50 AB+', 'B', 0.76, 0.06],
  ['Table 7, control 2: X|B', 'P2: 50 AB+', 'B', 0.75, 0.08],
  ['Table 8, overshadowing: X|A', 'T: 50 AB+', 'A', 0.79, 0.05],
  ['Table 9, overexpectation: X|A', 'P1: 25 A+, 25 B+, random\nP2: 50 AB+', 'A', 0.8, 0.12],
  ['Table 10, superconditioning: X|C', 'P1: 50 A+, 50 AB-, random\nP2: 50 BC+', 'C', 0.88, 0.05],
  ['Table 10, control: X|C', 'P1: 50 A+, 50 AB-, random\nP2: 50 CD+', 'C', 0.77, 0.05],
  ['Table 12, recovery from blocking: X|B', 'P1: 50 A+\nP2: 50 AB+\nP3: 200 A-', 'B', 0.8, 0.08],
  ['Table 12, control: X|B', 'P1: 50 A+\nP2: 50 AB+\nP3: 200 C-', 'B', 0.37, 0.06],
  ['Table 13, backward inhibition: X|B', 'P1: 50 AB-\nP2: 50 A+', 'B', -0.53, 0.2],
  ['Table 13, control: X|B', 'P1: 50 AB-\nP2: 50 C+', 'B', 0.08, 0.05],
];
for (const [name, design, probe, want, tol] of published) {
  test(`published: ${name} = ${want}`, () => close(L67(design, probe), want, tol));
}

test('published: the paper\'s orderings hold', () => {
  // Blocking: B is weakest after A was pretrained.
  assert.ok(L67('P1: 50 A+\nP2: 50 AB+', 'B') < L67('P1: 50 C+\nP2: 50 AB+', 'B') - 0.3);
  // Summation: BC < CD < C.
  const r = run('P1: 50 A+, 50 AB-, random\nP2: 50 C+\nTest: BC, CD, C', { L: 0.67 });
  assert.ok(final(r, 'BC') < final(r, 'CD') && final(r, 'CD') < final(r, 'C'));
  // Extinction (Fig. 1): back near zero, and A does not become an inhibitor.
  const ext = run('Acq: 100 A+\nExt: 100 A-', { L: 0.67 });
  assert.ok(final(ext, 'A') < 0.1 && final(ext, 'A') > -0.1);
});

test('the displayed equations evaluate to the numbers the model used', () => {
  for (const discrepancy of [true, false]) {
    const options = { discrepancy };
    const r = run('8 A+\n8 AB+, 8 AX-, random\n6 A-\n4 AB+(2)\nContext: Z', { L: 0.6 }, options);
    const eqs = spec.equations(options);
    for (const rec of r.trials) {
      const l = rec.learner;
      const ctx = { spec, rec, cue: rec.present[0], present: rec.present };
      const want = { similarity: l.topSim, activation: l.topAct, echo: l.echoRawJ, normalize: l.echoJ, retrieval: l.retrieval, store: l.discrepancyJ };
      for (const eq of eqs) {
        if (eq.when && !eq.when(rec)) continue;
        close(evaluate(eq.rhs, ctx), want[eq.id], 1e-9);
      }
    }
  }
});
