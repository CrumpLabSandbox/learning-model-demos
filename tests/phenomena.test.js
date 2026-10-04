import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rw from '../js/models/rescorla-wagner.js';
import { phenomena } from '../content/phenomena/index.js';
import { evaluatePhenomenon } from '../js/core/phenomena.js';
import { parseDesign } from '../js/core/design.js';

// What Rescorla-Wagner is known to produce with its default parameters.
const expected = {
  acquisition: true,
  extinction: true,
  salience: true,
  blocking: true,
  overshadowing: true,
  'conditioned-inhibition': true,
  'latent-inhibition': false,
  'backward-blocking': false,
  'negative-patterning': false,
};

test('every phenomenon has a valid design, citation, and Rescorla-Wagner explanation', () => {
  for (const p of phenomena) {
    assert.doesNotThrow(() => parseDesign(p.design), p.id);
    assert.ok(p.citation && p.empirical && p.criterion, p.id);
    assert.ok(p.models['rescorla-wagner']?.why, p.id);
  }
  assert.deepEqual(phenomena.map((p) => p.id).sort(), Object.keys(expected).sort());
});

for (const p of phenomena) {
  test(`Rescorla-Wagner ${expected[p.id] ? 'shows' : 'does not show'} ${p.title.toLowerCase()}`, () => {
    assert.equal(evaluatePhenomenon(rw, p).shown, expected[p.id]);
  });
}

test('build-the-equation stages unlock the expected phenomena', () => {
  const shown = (options) =>
    phenomena.filter((p) => evaluatePhenomenon(rw, p, { options }).shown).map((p) => p.id).sort();
  assert.deepEqual(shown({ useAlpha: false, summedError: false }), ['acquisition', 'extinction']);
  assert.deepEqual(shown({ useAlpha: true, summedError: false }), ['acquisition', 'extinction', 'salience']);
  assert.deepEqual(shown({ useAlpha: true, summedError: true }), [
    'acquisition',
    'blocking',
    'conditioned-inhibition',
    'extinction',
    'overshadowing',
    'salience',
  ]);
});
