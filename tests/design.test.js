import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDesign, parseTrialType, formatDesign, expandDesign, DesignError } from '../js/core/design.js';
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
