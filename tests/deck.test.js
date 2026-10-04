import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slideFromHash, keyTarget } from '../js/core/deck-nav.js';

test('slide numbers in the URL start at 1 and are clamped', () => {
  assert.equal(slideFromHash('', 10), 0);
  assert.equal(slideFromHash('#1', 10), 0);
  assert.equal(slideFromHash('#4', 10), 3);
  assert.equal(slideFromHash('#99', 10), 9);
  assert.equal(slideFromHash('#0', 10), 0);
  assert.equal(slideFromHash('#abc', 10), 0);
});

test('navigation keys move within the deck', () => {
  assert.equal(keyTarget('ArrowRight', 0, 5), 1);
  assert.equal(keyTarget(' ', 4, 5), 4);
  assert.equal(keyTarget('ArrowLeft', 0, 5), 0);
  assert.equal(keyTarget('End', 1, 5), 4);
  assert.equal(keyTarget('Home', 3, 5), 0);
  assert.equal(keyTarget('x', 3, 5), null);
});
