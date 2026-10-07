import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDesign, parseTrialType, formatDesign, expandDesign, DesignError, DEFAULT_TIMING } from '../js/core/design.js';
import { makeRng } from '../js/core/rng.js';

test('parses trial types', () => {
  assert.deepEqual(parseTrialType('BA+'), { label: 'BA+', cues: ['A', 'B'], reinforced: true, magnitude: null });
  assert.deepEqual(parseTrialType('A-').reinforced, false);
  assert.equal(parseTrialType('A+(0.5)').magnitude, 0.5);
});

test('rejects malformed trial types with a helpful message', () => {
  assert.throws(() => parseTrialType('A'), /not a trial type/);
  assert.throws(() => parseTrialType('ab+'), /capital letters/);
  assert.throws(() => parseTrialType('AA+'), /same cue twice/);
  assert.throws(() => parseTrialType('A-(0.5)'), /magnitude/);
});

test('parses the blocking design', () => {
  const d = parseDesign('Pretraining: 20 A+\nCompound: 20 AB+, 20 CD+');
  assert.equal(d.phases.length, 2);
  assert.equal(d.phases[0].name, 'Pretraining');
  assert.deepEqual(d.phases[1].trials.map((t) => [t.count, t.type.label]), [[20, 'AB+'], [20, 'CD+']]);
  assert.deepEqual(d.cues, ['A', 'B', 'C', 'D']);
  assert.equal(d.totalTrials, 60);
  assert.equal(d.probes, null);
});

test('names phases, reads order keywords, test lines, and comments', () => {
  const d = parseDesign('# comment\n10 A+, 10 B-, random\n\nTest: A, BA');
  assert.equal(d.phases[0].name, 'Phase 1');
  assert.equal(d.phases[0].order, 'random');
  assert.throws(() => parseDesign('Test: ab'), /not a cue/);
  assert.deepEqual(parseDesign('1 A+\nTest: A, BA').probes, ['A', 'AB']);
});

test('reports the line number of an error', () => {
  try {
    parseDesign('20 A+\n20 AB?');
    assert.fail('should throw');
  } catch (e) {
    assert.ok(e instanceof DesignError);
    assert.equal(e.line, 2);
    assert.match(e.message, /^Line 2:/);
  }
  assert.throws(() => parseDesign(''), /no phases/);
  assert.throws(() => parseDesign('3000 A+'), /limit/);
});

test('a context cue is added to every trial', () => {
  const d = parseDesign('Pre: 3 A-\nTrain: 2 A+, 2 B+\nContext: Z');
  assert.equal(d.context, 'Z');
  assert.deepEqual(d.cues, ['A', 'B', 'Z']);
  const seq = expandDesign(d, makeRng(1));
  assert.ok(seq.every((t) => t.cues.includes('Z')));
  assert.deepEqual(seq[3].cues, ['A', 'Z']);
  assert.equal(seq[3].type.label, 'A+');
  assert.deepEqual(parseDesign(formatDesign(d)), d);
  assert.throws(() => parseDesign('2 AZ+\nContext: Z'), /already on every trial/);
  assert.throws(() => parseDesign('2 A+\nContext: zz'), /one capital letter/);
});

test('format and parse round-trip', () => {
  const text = 'Pretraining: 20 A+\nCompound: 20 AB+, 20 CD+, random\nTest: B, D';
  const d = parseDesign(text);
  assert.equal(formatDesign(d), text);
  assert.deepEqual(parseDesign(formatDesign(d)), d);
});

test('expands alternate, blocked, and random orders', () => {
  const labels = (text, seed = 1) => expandDesign(parseDesign(text), makeRng(seed)).map((t) => t.type.label);
  assert.deepEqual(labels('2 A+, 3 B-'), ['A+', 'B-', 'A+', 'B-', 'B-']);
  assert.deepEqual(labels('2 A+, 2 B-, blocked'), ['A+', 'A+', 'B-', 'B-']);
  const r = labels('10 A+, 10 B-, random', 7);
  assert.equal(r.length, 20);
  assert.equal(r.filter((x) => x === 'A+').length, 10);
  assert.deepEqual(r, labels('10 A+, 10 B-, random', 7), 'same seed, same order');
  assert.notDeepEqual(r, labels('10 A+, 10 B-, random', 8), 'different seed, different order');
});

test('reads timing for moment-by-moment models, per item and for the whole design', () => {
  const d = parseDesign('Timing: ITI 50\nTraining: 10 A+ [CS 1-5, US 6-7], 10 B+, 5 +\nContext: Z');
  assert.deepEqual(d.timing, { iti: 50 });
  assert.deepEqual(d.phases[0].trials[0].type.timing, { cs: [1, 5], us: [6, 7] });
  assert.equal(d.phases[0].trials[2].type.label, '+');
  assert.deepEqual(d.cues, ['A', 'B', 'Z']);
  const seq = expandDesign(d);
  assert.deepEqual(seq[0].timing, { cs: [1, 5], us: [6, 7], iti: 50 });
  assert.deepEqual(seq[1].timing, { ...DEFAULT_TIMING, iti: 50 });
  // The outcome on its own: no cue on, only the context.
  assert.deepEqual(seq[2].cues, ['Z']);
  assert.equal(seq[2].timing.cs, null);
  assert.deepEqual(parseDesign(formatDesign(d)), d);
});

test('rejects malformed timing with a helpful message', () => {
  assert.throws(() => parseDesign('10 A+ [CS 0-4]'), /count from 1/);
  assert.throws(() => parseDesign('10 A+ [CS 5-4]'), /end comes after/);
  assert.throws(() => parseDesign('10 A+ [gap 4]'), /not a timing setting/);
  assert.throws(() => parseDesign('10 A+ [ITI 4-5]'), /one number/);
  assert.throws(() => parseDesign('10 A+ CS 1-4]'), /square brackets/);
  assert.throws(() => parseDesign('10 -'), /no cues/);
  assert.throws(() => parseDesign('10 +'), /no cues/);
});

test('a bare "-" is a frame with nothing on it; with a context, the context is its only cue', () => {
  const d = parseDesign('Stream: 2 A+, 1 A-, 1 +, 2 -\nContext: Z');
  assert.deepEqual(d.cues, ['A', 'Z']);
  assert.equal(d.totalTrials, 6);
  const seq = expandDesign(d, makeRng(1));
  const empty = seq.filter((t) => t.type.label === '-');
  assert.equal(empty.length, 2);
  assert.deepEqual(empty[0].cues, ['Z']);
  assert.equal(empty[0].reinforced, undefined);
  assert.equal(empty[0].type.reinforced, false);
  assert.equal(empty[0].timing.cs, null);
  assert.equal(empty[0].timing.us, null);
  assert.deepEqual(parseDesign(formatDesign(d)), d);
});
