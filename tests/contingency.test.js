// The 2 × 2 contingency table, ΔP, and the stream designs built from the
// papers' matrices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deltaP, pOutcome, pCue, cellsFor, marginalCellsFor, cellsToDesign, cellsFromProbabilities, streamFrames } from '../js/core/contingency.js';
import { parseDesign, expandDesign } from '../js/core/design.js';
import { makeRng } from '../js/core/rng.js';
import { runModel, final } from '../js/core/runner.js';
import * as rw from '../js/models/rescorla-wagner.js';
import { phenomena } from '../content/phenomena/index.js';
import { streams } from '../content/streams.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test('ΔP is P(O | C) − P(O | ~C), and is undefined when the cue is never present or never absent', () => {
  close(deltaP({ a: 17, b: 13, c: 3, d: 27 }), 17 / 30 - 3 / 30);
  close(deltaP({ a: 6, b: 24, c: 6, d: 24 }), 0);
  close(deltaP({ a: 10, b: 0, c: 0, d: 10 }), 1);
  close(deltaP({ a: 0, b: 10, c: 10, d: 0 }), -1);
  assert.equal(deltaP({ a: 0, b: 0, c: 5, d: 5 }), null);
  assert.equal(deltaP({ a: 5, b: 5, c: 0, d: 0 }), null);
});

test('the matrices of Crump et al. (2007), Figure 2', () => {
  // ΔP = 0 at P(O) = .2 and .8; ΔP = .467 at P(O) = .33 and .67.
  const m = [
    [{ a: 6, b: 24, c: 6, d: 24 }, 0, 0.2],
    [{ a: 24, b: 6, c: 24, d: 6 }, 0, 0.8],
    [{ a: 17, b: 13, c: 3, d: 27 }, 0.467, 0.333],
    [{ a: 27, b: 3, c: 13, d: 17 }, 0.467, 0.667],
  ];
  for (const [cells, dp, po] of m) {
    close(deltaP(cells), dp, 0.001);
    close(pOutcome(cells), po, 0.001);
    close(pCue(cells), 0.5);
    assert.equal(cells.a + cells.b + cells.c + cells.d, 60);
  }
});

test('cells from a contingency and an outcome density reproduce the papers\' matrices', () => {
  assert.deepEqual(cellsFromProbabilities({ n: 60, deltaP: 0, pOutcome: 0.2 }), { a: 6, b: 24, c: 6, d: 24 });
  assert.deepEqual(cellsFromProbabilities({ n: 60, deltaP: 0.467, pOutcome: 0.333 }), { a: 17, b: 13, c: 3, d: 27 });
  assert.deepEqual(cellsFromProbabilities({ n: 60, deltaP: 0.467, pOutcome: 0.667 }), { a: 27, b: 3, c: 13, d: 17 });
  // Allan et al. (2008), Table 6: P(O) = .3, ΔP = .6 gives a = 24, c = 0 of 40 each.
  assert.deepEqual(cellsFromProbabilities({ n: 80, deltaP: 0.6, pOutcome: 0.3 }), { a: 24, b: 16, c: 0, d: 40 });
});

test('a stream design has the four cells as trial types, and the frames count back to the cells', () => {
  const cells = { a: 17, b: 13, c: 3, d: 27 };
  const text = cellsToDesign(cells);
  assert.equal(text, 'Stream: 17 A+, 13 A-, 3 +, 27 -, random\nContext: Z');
  const d = parseDesign(text);
  assert.deepEqual(d.cues, ['A', 'Z']);
  assert.equal(d.totalTrials, 60);
  const seq = expandDesign(d, makeRng(3));
  assert.deepEqual(cellsFor(seq.map((t) => ({ cues: t.cues, reinforced: t.type.reinforced })), 'A', 'Z'), cells);
  // Without a context a bare "-" is allowed and teaches nothing.
  assert.equal(parseDesign('10 A+, 10 -').totalTrials, 20);
});

test('the frames a participant sees are the frames the models get, for the same seed', () => {
  const text = cellsToDesign({ a: 6, b: 24, c: 6, d: 24 });
  const frames = streamFrames(text, 5);
  const seq = expandDesign(parseDesign(text), makeRng(5));
  assert.equal(frames.length, 60);
  assert.deepEqual(frames.map((f) => f.label), seq.map((t) => t.type.label));
  assert.ok(frames.every((f) => !f.cues.includes('Z')));
  assert.notDeepEqual(frames.map((f) => f.label), streamFrames(text, 6).map((f) => f.label));
});

test('Hannah et al. (2009), Table 3: both targets have ΔP = .5; the companions have ΔP = 1 and 0', () => {
  const one = phenomena.find((p) => p.id === 'one-phase-blocking');
  const d = parseDesign(one.design);
  const trials = expandDesign(d, makeRng(1)).map((t) => ({ cues: t.cues, reinforced: t.type.reinforced }));
  const first = trials.filter((t, i) => i < 48);
  const second = trials.filter((t, i) => i >= 48);
  close(deltaP(marginalCellsFor(first, 'B')), 0.5);
  close(deltaP(marginalCellsFor(first, 'A')), 1);
  close(deltaP(marginalCellsFor(second, 'D')), 0.5);
  close(deltaP(marginalCellsFor(second, 'C')), 0);
  assert.equal(first.length, 48);
  assert.equal(second.length, 48);
});

test('Hannah et al. (2009), Table 4b: P(O | AB) = .75 and P(O | A alone) = .25 in the compound phase', () => {
  const p = phenomena.find((x) => x.id === 'probabilistic-blocking');
  const d = parseDesign(p.design);
  const compound = expandDesign(d, makeRng(1)).filter((t) => t.phaseIndex === 1);
  const ab = compound.filter((t) => t.cues.includes('A') && t.cues.includes('B'));
  const aAlone = compound.filter((t) => t.cues.includes('A') && !t.cues.includes('B'));
  close(ab.filter((t) => t.type.reinforced).length / ab.length, 0.75);
  close(aAlone.filter((t) => t.type.reinforced).length / aAlone.length, 0.25);
  const single = expandDesign(d, makeRng(1)).filter((t) => t.phaseIndex === 0 && t.cues.includes('A'));
  close(single.filter((t) => t.type.reinforced).length / single.length, 0.75);
});

test('Rescorla-Wagner with a context cue settles near ΔP (Chapman & Robbins, 1990)', () => {
  // A long stream with the cells of the ΔP = .467 matrix, repeated ten
  // times. With a random order V wanders around its fixed point, so compare
  // the average over the second half of the stream, over a few orders.
  const text = 'Stream: 170 A+, 130 A-, 30 +, 270 -, random\nContext: Z';
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const over = (label, design, params = {}) => mean([1, 2, 3, 4].map((seed) => mean(runModel(rw, { design: parseDesign(design), params, seed }).series[label].slice(300))));
  close(over('A', text, { beta: 0.1 }), 0.467, 0.06);
  close(over('Z', text, { beta: 0.1 }), 0.1, 0.06);
  // Without the context, the cue learns P(O | A) instead: 17/30.
  close(over('A', 'Stream: 170 A+, 130 A-, random', { beta: 0.1 }), 17 / 30, 0.06);
});

test('every stream preset parses, has the ΔP and P(O) it claims, and names its source', () => {
  for (const s of streams) {
    assert.ok(s.id && s.title && s.source, s.id);
    const d = parseDesign(s.design);
    const trials = expandDesign(d, makeRng(1)).map((t) => ({ cues: t.cues, reinforced: t.type.reinforced }));
    for (const [cue, want] of Object.entries(s.deltaP)) close(deltaP(marginalCellsFor(trials, cue)), want, 0.005);
    if (s.pOutcome !== undefined) close(trials.filter((t) => t.reinforced).length / trials.length, s.pOutcome, 0.005);
    assert.ok(s.cues.every((c) => d.cues.includes(c)), `${s.id}: cues`);
  }
});
