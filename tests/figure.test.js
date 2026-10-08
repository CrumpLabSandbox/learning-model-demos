// Every model's equation spec gives the idea card a figure: an SVG with an
// accessible label, and a caption in plain words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECS } from '../content/equations/index.js';
import { MODELS } from '../js/core/registry.js';
import { readFileSync } from 'node:fs';

test('every equation spec has a figure with an SVG, an aria-label, and a caption', () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    assert.ok(spec.figure, `${name} has no figure`);
    assert.ok(spec.figure.svg.startsWith('<svg viewBox="0 0 320 180" role="img" aria-label="'), `${name}: the figure is an SVG with a label`);
    assert.ok(spec.figure.svg.trim().endsWith('</svg>'), `${name}: the SVG closes`);
    assert.ok(!spec.figure.svg.includes('${'), `${name}: the SVG has an unfilled template`);
    assert.ok(spec.figure.caption.length > 40 && spec.figure.caption.endsWith('.'), `${name}: the caption is a sentence`);
  }
});

test('the spec index has every model in the registry, and each deck shows its figure', () => {
  for (const m of MODELS) {
    assert.ok(SPECS[m.id]?.figure, `${m.id} is in the spec index with a figure`);
    const deck = readFileSync(new URL(`../decks/${m.id}.html`, import.meta.url), 'utf8');
    assert.ok(deck.includes(`<figure data-figure="${m.id}"></figure>`), `decks/${m.id}.html shows the figure`);
  }
});
