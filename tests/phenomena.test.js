import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rw from '../js/models/rescorla-wagner.js';
import * as mk from '../js/models/mackintosh.js';
import * as ph from '../js/models/pearce-hall.js';
import * as sop from '../js/models/sop.js';
import * as mal from '../js/models/minerva-al.js';
import * as pearce from '../js/models/pearce.js';
import * as delamater from '../js/models/delamater.js';
import { phenomena } from '../content/phenomena/index.js';
import { evaluatePhenomenon } from '../js/core/phenomena.js';
import { parseDesign } from '../js/core/design.js';
import { runModel } from '../js/core/runner.js';

// What each model produces with its default settings. These are the badges
// students see; a change here is a change in what the site teaches.
const expected = {
  'rescorla-wagner': {
    model: rw,
    shows: [
      'acquisition', 'extinction', 'salience', 'blocking', 'unblocking', 'overshadowing', 'conditioned-inhibition', 'us-preexposure',
      'contingency', 'one-phase-blocking', 'probabilistic-blocking', 'feature-positive',
    ],
  },
  mackintosh: {
    model: mk,
    shows: ['acquisition', 'extinction', 'salience', 'blocking', 'unblocking', 'us-preexposure', 'contingency', 'outcome-density', 'one-phase-blocking', 'feature-positive'],
  },
  'pearce-hall': {
    model: ph,
    shows: [
      'acquisition', 'extinction', 'salience', 'blocking', 'unblocking', 'overshadowing', 'conditioned-inhibition', 'latent-inhibition', 'us-preexposure',
      'contingency', 'outcome-density', 'one-phase-blocking', 'probabilistic-blocking', 'feature-positive',
    ],
  },
  sop: {
    model: sop,
    shows: [
      'acquisition', 'extinction', 'salience', 'blocking', 'unblocking', 'overshadowing', 'conditioned-inhibition',
      'trial-spacing', 'cs-us-interval', 'backward-conditioning', 'us-preexposure',
      'contingency', 'outcome-density', 'one-phase-blocking', 'probabilistic-blocking', 'feature-positive',
    ],
  },
  'minerva-al': {
    model: mal,
    shows: [
      'acquisition', 'extinction', 'salience', 'blocking', 'overshadowing', 'conditioned-inhibition', 'latent-inhibition',
      'backward-blocking', 'negative-patterning',
      'contingency', 'outcome-density', 'one-phase-blocking', 'probabilistic-blocking', 'biconditional',
    ],
  },
  pearce: {
    model: pearce,
    shows: [
      'acquisition', 'extinction', 'blocking', 'unblocking', 'overshadowing', 'conditioned-inhibition', 'negative-patterning',
      'contingency', 'outcome-density', 'one-phase-blocking', 'probabilistic-blocking', 'biconditional',
    ],
  },
  delamater: {
    model: delamater,
    shows: ['acquisition', 'blocking', 'conditioned-inhibition', 'negative-patterning', 'contingency', 'outcome-density', 'one-phase-blocking', 'acquired-equivalence', 'biconditional', 'feature-positive'],
  },
};

// Models that work trial by trial ignore timing, so no timing phenomenon
// can depend on it for them.
const timing = ['trial-spacing', 'cs-us-interval', 'backward-conditioning'];

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

// The build-stage tests below are about the classic conditioning phenomena.
// The streamed-trial presets (human contingency judgement) are checked per
// model above and in tests/contingency.test.js.
const streamed = new Set(['contingency', 'outcome-density', 'one-phase-blocking', 'probabilistic-blocking', 'acquired-equivalence', 'biconditional', 'feature-positive']);
const classic = (ids) => ids.filter((id) => !streamed.has(id)).sort();
const shownWith = (model, options) =>
  phenomena.filter((p) => !streamed.has(p.id) && evaluatePhenomenon(model, p, { options }).shown).map((p) => p.id).sort();

test('Rescorla-Wagner build stages unlock the expected phenomena', () => {
  assert.deepEqual(shownWith(rw, { useAlpha: false, summedError: false }), ['acquisition', 'extinction']);
  assert.deepEqual(shownWith(rw, { useAlpha: true, summedError: false }), ['acquisition', 'extinction', 'salience']);
  for (const id of timing) assert.ok(!expected['rescorla-wagner'].shows.includes(id));
  assert.deepEqual(shownWith(rw, { useAlpha: true, summedError: true }), classic(expected['rescorla-wagner'].shows));
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
  const base = ['acquisition', 'blocking', 'overshadowing', 'salience', 'unblocking', 'us-preexposure'];
  assert.deepEqual(shownWith(ph, { attention: false, inhibition: false }), base);
  assert.deepEqual(shownWith(ph, { attention: true, inhibition: false }), [...base, 'latent-inhibition'].sort());
  assert.deepEqual(shownWith(ph, { attention: true, inhibition: true }), classic(expected['pearce-hall'].shows));
});

test('SOP build stages unlock the expected phenomena', () => {
  // Overlap alone, with the activity limits: timing effects, a bending
  // acquisition curve (the last trial's US is still fading when the next
  // arrives), and one-trial overshadowing (two cues displace each other
  // from A1 faster than one).
  assert.deepEqual(shownWith(sop, { retrieval: false, inhibition: false, links: false }), ['acquisition', 'cs-us-interval', 'overshadowing', 'trial-spacing']);
  // Even with nothing to limit it, the climb levels off a little, because the last trial's US is still fading when the next arrives.
  assert.deepEqual(shownWith(sop, { retrieval: false, inhibition: false, links: false, distractors: false }), ['acquisition', 'cs-us-interval', 'trial-spacing']);
  // Calling up the US adds the cue-competition effects. Unblocking now needs
  // the inhibitory term as well: with the activity limits, a bigger US alone
  // does not lift B far enough above D.
  assert.deepEqual(shownWith(sop, { retrieval: true, inhibition: false, links: false }), [
    'acquisition', 'blocking', 'cs-us-interval', 'overshadowing', 'salience', 'trial-spacing', 'us-preexposure',
  ]);
  assert.deepEqual(shownWith(sop, { retrieval: true, inhibition: true, links: false }), classic(expected.sop.shows));
  assert.deepEqual(shownWith(sop, { retrieval: true, inhibition: true, links: true }), classic(expected.sop.shows));
  // The context primes a pre-exposed cue through the cue-to-cue links, but
  // with the distractor rules on the effect is too small to count. Without
  // them it counts, and without the links it is gone.
  assert.deepEqual(shownWith(sop, { links: true, distractors: false }), [...classic(expected.sop.shows), 'latent-inhibition'].sort());
  assert.ok(!shownWith(sop, { links: false, distractors: false }).includes('latent-inhibition'));
});

test('timing in a design changes nothing for the trial-by-trial models', () => {
  const plain = parseDesign('Training: 10 A+, 10 B+');
  const timed = parseDesign('Training: 10 A+ [CS 1-10, US 30-31, ITI 3], 10 B+ [US 1-2, CS 5-9]');
  for (const model of [rw, mk, ph, mal]) {
    assert.deepEqual(runModel(model, { design: timed }).series, runModel(model, { design: plain }).series);
  }
});

test('MINERVA-AL: storing the discrepancy is what produces cue competition and retrospective revaluation', () => {
  assert.deepEqual(shownWith(mal, { discrepancy: false }), ['acquisition', 'extinction', 'latent-inhibition', 'negative-patterning']);
  assert.deepEqual(shownWith(mal, { discrepancy: true }), classic(expected['minerva-al'].shows));
});

test('Pearce build stages unlock the expected phenomena', () => {
  // Each pattern alone: negative patterning is solved, and a cue trained
  // only in a compound knows nothing when tested alone (which the
  // overshadowing check counts as overshadowing). Extinction works by
  // weakening E at this stage.
  // Conditioned inhibition passes the summation test here too: AX is its own configuration and never learns, so adding X to A removes A's prediction entirely.
  assert.deepEqual(shownWith(pearce, { generalisation: false, inhibition: false }), ['acquisition', 'conditioned-inhibition', 'extinction', 'negative-patterning', 'overshadowing']);
  // Generalisation adds blocking, unblocking, and conditioned inhibition
  // (E going negative does the work of inhibition at this stage). The last
  // stage changes how inhibition is learned, not which effects appear.
  assert.deepEqual(shownWith(pearce, { generalisation: true, inhibition: false }), classic(expected.pearce.shows));
  assert.deepEqual(shownWith(pearce, { generalisation: true, inhibition: true }), classic(expected.pearce.shows));
});

test('Delamater build stages: a single one-layer network cannot solve negative patterning; the hidden layer can', () => {
  // Averaged over networks the one-layer stage can look as if it solved
  // negative patterning, because each network gives up on a different
  // element. A single network shows the failure.
  const np = phenomena.find((p) => p.id === 'negative-patterning');
  assert.equal(evaluatePhenomenon(delamater, np, { options: { hidden: false, momentum: false }, params: { learners: 1 } }).shown, false);
  assert.equal(evaluatePhenomenon(delamater, np, { params: { learners: 1 } }).shown, true);
  assert.deepEqual(shownWith(delamater, { hidden: true, momentum: true }), classic(expected.delamater.shows));
});
