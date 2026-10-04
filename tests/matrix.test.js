import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { phenomena } from '../content/phenomena/index.js';
import { MODELS } from '../js/core/registry.js';
import { computeMatrix, matrixHTML, MATRIX_START, MATRIX_END } from '../js/core/matrix.js';

test('the phenomenon table on the landing page matches what the models do', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const a = html.indexOf(MATRIX_START);
  const b = html.indexOf(MATRIX_END);
  assert.ok(a >= 0 && b > a, 'index.html has the table markers');
  const shown = html.slice(a + MATRIX_START.length, b).trim();
  const want = matrixHTML(computeMatrix(phenomena, MODELS), MODELS);
  assert.equal(shown, want, 'The table is out of date. Run: node tools/matrix.mjs');
});

test('every model in the registry has a page and a deck', () => {
  for (const m of MODELS) {
    assert.doesNotThrow(() => readFileSync(new URL(`../models/${m.id}.html`, import.meta.url)), m.id);
    assert.doesNotThrow(() => readFileSync(new URL(`../decks/${m.id}.html`, import.meta.url)), m.id);
  }
});
