import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeState, decodeState } from '../js/core/url-state.js';

test('page state round-trips through the URL hash', () => {
  const s = {
    preset: 'blocking',
    design: 'Phase 1: 10 A+\nPhase 2: 10 AB+',
    params: { alpha_A: 0.5, beta: 0.25 },
    options: { summedError: false, useAlpha: true },
    seed: 4,
    t: 12,
    cue: 'B',
    readings: ['words', 'numbers'],
    stage: 2,
  };
  assert.deepEqual(decodeState(`#${encodeState(s)}`), s);
});

test('missing and malformed fields are ignored', () => {
  assert.deepEqual(decodeState(''), {});
  assert.deepEqual(decodeState('#p=alpha_A:abc,beta:0.2&t=x'), { params: { beta: 0.2 }, t: undefined });
});
