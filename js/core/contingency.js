// The 2 × 2 contingency table and ΔP, for the human contingency judgement
// unit. No DOM here: the streamed-trial page and the tests both use it.
//
// Allan, L. G. (1980). A note on measurement of contingency between two
// binary variables in judgment tasks. Bulletin of the Psychonomic Society,
// 15, 147–149.
//
// Over a block of trials a cue is present (C) or absent (~C), and the
// outcome occurs (O) or not (~O). The four counts are the cells:
//
//            O    ~O
//     C      a     b
//    ~C      c     d
//
// and the contingency is ΔP = P(O | C) − P(O | ~C) = a/(a+b) − c/(c+d).
// In this site's design notation the four cells of a cue A are the trial
// types A+, A−, + and −, with a context cue standing in for "the stream".

import { parseDesign, expandDesign } from './design.js';
import { makeRng } from './rng.js';

export const CELL_NAMES = ['a', 'b', 'c', 'd'];

// ΔP for the cells { a, b, c, d }. Undefined (null) when the cue is never
// present or never absent, since then one of the probabilities has no value.
export function deltaP({ a, b, c, d }) {
  if (a + b === 0 || c + d === 0) return null;
  return a / (a + b) - c / (c + d);
}

export function pOutcomeGivenCue({ a, b }) {
  return a + b === 0 ? null : a / (a + b);
}

export function pOutcomeGivenNoCue({ c, d }) {
  return c + d === 0 ? null : c / (c + d);
}

// The outcome density: how often the outcome happens over the whole block.
export function pOutcome({ a, b, c, d }) {
  const n = a + b + c + d;
  return n === 0 ? null : (a + c) / n;
}

// How often the cue is present.
export function pCue({ a, b, c, d }) {
  const n = a + b + c + d;
  return n === 0 ? null : (a + b) / n;
}

// Count the cells for one cue over a list of trials. Each trial has
// { cues, reinforced }; the context, if any, is ignored because it is on
// every trial.
export function cellsFor(trials, cue, context = null) {
  const cells = { a: 0, b: 0, c: 0, d: 0 };
  for (const t of trials) {
    const present = t.cues.includes(cue);
    const others = t.cues.filter((x) => x !== context);
    if (!others.every((x) => x === cue)) continue; // a compound trial: not a cell of this cue's table
    const key = present ? (t.reinforced ? 'a' : 'b') : t.reinforced ? 'c' : 'd';
    cells[key] += 1;
  }
  return cells;
}

// The cells for every single cue in the trials, as the one-phase blocking
// papers tabulate them: the cue's own 2 × 2 counts whatever else was on
// the trial.
export function marginalCellsFor(trials, cue, context = null) {
  const cells = { a: 0, b: 0, c: 0, d: 0 };
  for (const t of trials) {
    const present = t.cues.includes(cue);
    const key = present ? (t.reinforced ? 'a' : 'b') : t.reinforced ? 'c' : 'd';
    cells[key] += 1;
  }
  void context;
  return cells;
}

// Design text for one stream of a single cue with the given cells.
// cellsToDesign({ a: 17, b: 13, c: 3, d: 27 }) ->
//   "Stream: 17 A+, 13 A-, 3 +, 27 -, random\nContext: Z"
export function cellsToDesign(cells, { cue = 'A', context = 'Z', name = 'Stream', order = 'random' } = {}) {
  const items = [];
  if (cells.a) items.push(`${cells.a} ${cue}+`);
  if (cells.b) items.push(`${cells.b} ${cue}-`);
  if (cells.c) items.push(`${cells.c} +`);
  if (cells.d) items.push(`${cells.d} -`);
  if (!items.length) throw new Error('A stream needs at least one frame.');
  if (order !== 'alternate') items.push(order);
  return `${name}: ${items.join(', ')}\nContext: ${context}`;
}

// Cells from a contingency and an outcome density, the way the papers
// build their matrices: n frames, the cue on half of them, P(O | C) and
// P(O | ~C) chosen so that their difference is ΔP and their mean is P(O).
// Counts are rounded, so read the result's ΔP back rather than assuming it.
export function cellsFromProbabilities({ n = 60, pCue: pc = 0.5, deltaP: dp = 0, pOutcome: po = 0.5 }) {
  const nC = Math.round(n * pc);
  const nNot = n - nC;
  const pOC = Math.min(1, Math.max(0, po + dp / 2));
  const pONot = Math.min(1, Math.max(0, po - dp / 2));
  const a = Math.round(nC * pOC);
  const c = Math.round(nNot * pONot);
  return { a, b: nC - a, c, d: nNot - c };
}

// The frames of a stream, in the order a participant would see them: the
// design's trial sequence for this seed, as { cues, reinforced, label }
// without the context. The same seed gives the models the same sequence.
export function streamFrames(designText, seed = 1) {
  const design = parseDesign(designText);
  return expandDesign(design, makeRng(seed)).map((e) => ({
    cues: e.cues.filter((c) => c !== design.context),
    reinforced: e.type.reinforced,
    label: e.type.label,
    phaseIndex: e.phaseIndex,
  }));
}
