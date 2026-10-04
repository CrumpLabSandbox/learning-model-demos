import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rw from '../js/models/rescorla-wagner.js';
import * as mk from '../js/models/mackintosh.js';
import * as ph from '../js/models/pearce-hall.js';
import { phenomena } from '../content/phenomena/index.js';
import { evaluatePhenomenon } from '../js/core/phenomena.js';
import { parseDesign } from '../js/core/design.js';

// What each model produces with its default settings. These are the badges
// students see; a change here is a change in what the site teaches.
const expected = {
  'rescorla-wagner': {
    model: rw,
    shows: ['acquisition', 'extinction', 'salience', 'blocking', 'unblocking', 'overshadowing', 'conditioned-inhibition'],
  },
  mackintosh: {
    model: mk,
    shows: ['acquisition', 'extinction', 'salience', 'blocking', 'unblocking'],
  },
  'pearce-hall': {
    model: ph,
    shows: ['acquisition', 'extinction', 'salience', 'blocking', 'unblocking', 'overshadowing', 'conditioned-inhibition', 'latent-inhibition'],
  },
};

test('every phenomenon has a valid design, citation, and an explanation for every model', () => {
  for (const p of phenomena) {
    assert.doesNotThrow(() => parseDesign(p.design), p.id);
    assert.ok(p.citation && p.empirical && p.criterion, p.id);
    for (const id of Object.keys(expected)) assert.ok(p.models[id]?.why && p.models[id]?.tryThis, `${p.id}: ${id}`);
  }
});

for (const [id, { model, shows }] of Object.entries(expected)) {
  for (const p of phenomena) {
    const want = shows.includes(p.id);
    test(`${model.name} ${want ? 'shows' : 'does not show'} ${p.title.toLowerCase()}`, () => {
      assert.equal(evaluatePhenomenon(model, p).shown, want);
    });
  }
}

const shownWith = (model, options) =>
  phenomena.filter((p) => evaluatePhenomenon(model, p, { options }).shown).map((p) => p.id).sort();

test('Rescorla-Wagner build stages unlock the expected phenomena', () => {
  assert.deepEqual(shownWith(rw, { useAlpha: false, summedError: false }), ['acquisition', 'extinction']);
  assert.deepEqual(shownWith(rw, { useAlpha: true, summedError: false }), ['acquisition', 'extinction', 'salience']);
  assert.deepEqual(shownWith(rw, { useAlpha: true, summedError: true }), [...expected['rescorla-wagner'].shows].sort());
});

test('Mackintosh: how the attention rule is written changes what the model predicts', () => {
  // Continuous rule: blocking, but no overshadowing or latent inhibition
  // with equal saliences. 1975 direction rule: the reverse.
  const direction = shownWith(mk, { directionRule: true });
  assert.ok(direction.includes('latent-inhibition') && direction.includes('overshadowing'));
  assert.ok(!direction.includes('blocking'));
  assert.deepEqual(shownWith(mk, { attention: false }), ['acquisition', 'extinction', 'salience']);
});

test('Pearce-Hall build stages unlock the expected phenomena', () => {
  const base = ['acquisition', 'blocking', 'overshadowing', 'salience', 'unblocking'];
  assert.deepEqual(shownWith(ph, { attention: false, inhibition: false }), base);
  assert.deepEqual(shownWith(ph, { attention: true, inhibition: false }), [...base, 'latent-inhibition'].sort());
  assert.deepEqual(shownWith(ph, { attention: true, inhibition: true }), [...expected['pearce-hall'].shows].sort());
});
