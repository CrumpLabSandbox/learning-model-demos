// Checks that hold the scaffolding together: every link into the glossary,
// the primer, the warm-up, or a deck points at something that exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { glossary, glossaryIds } from '../content/glossary.js';
import { checks as warmupChecks } from '../content/warmup/checks.js';
import { checks as primerChecks } from '../content/primer/checks.js';
import * as rwSpec from '../content/equations/rescorla-wagner.js';
import * as mkSpec from '../content/equations/mackintosh.js';
import * as phSpec from '../content/equations/pearce-hall.js';
import * as sopSpec from '../content/equations/sop.js';
import * as malSpec from '../content/equations/minerva-al.js';
import { checks as tutorialChecks } from '../content/tutorials/checks.js';
import { phenomena } from '../content/phenomena/index.js';
import { MODELS } from '../js/core/registry.js';

const root = new URL('..', import.meta.url).pathname;
const inDir = (d) => readdirSync(join(root, d)).filter((f) => f.endsWith('.html')).map((f) => `${d}/${f}`);
const pages = ['index.html', 'primer.html', 'warm-up.html', 'glossary.html', 'compare.html', ...inDir('models'), ...inDir('decks'), ...inDir('tutorials')];
const read = (p) => readFileSync(join(root, p), 'utf8');
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

test('every page links only to files that exist', () => {
  for (const page of pages) {
    for (const m of read(page).matchAll(/href="([^"#:]+\.html)(#[^"]*)?"/g)) {
      const target = normalize(join(dirname(page), m[1]));
      assert.ok(existsSync(join(root, target)), `${page} links to missing ${m[1]}`);
    }
  }
});

test('links to page sections point at sections that exist', () => {
  const sectionPages = ['primer.html', 'warm-up.html', 'index.html'];
  for (const page of pages) {
    for (const m of read(page).matchAll(/href="([^"#:]*?)(primer|warm-up|index)\.html#([a-z-]+)"/g)) {
      const target = `${m[2]}.html`;
      assert.ok(sectionPages.includes(target));
      assert.ok(ids(read(target)).has(m[3]), `${page} links to ${target}#${m[3]}, which does not exist`);
    }
  }
});

test('links into the glossary name real entries', () => {
  for (const page of pages) {
    for (const m of read(page).matchAll(/glossary\.html#([a-z-]+)/g)) assert.ok(glossaryIds.has(m[1]), `${page} links to missing glossary entry ${m[1]}`);
  }
});

test('glossary entries are complete and their cross-links resolve', () => {
  for (const g of glossary) {
    assert.ok(g.term && g.plain && g.plain.length > 20, g.id);
    for (const r of g.related ?? []) assert.ok(glossaryIds.has(r), `${g.id} relates to missing ${r}`);
    if (g.learnMore) {
      const [file, hash] = g.learnMore.href.split('#');
      assert.ok(existsSync(join(root, file)), `${g.id}: ${file}`);
      if (hash && !hash.includes('=')) assert.ok(ids(read(file)).has(hash), `${g.id}: ${g.learnMore.href}`);
    }
  }
});

test('every symbol in every model links to a primer section that exists', () => {
  const primerIds = ids(read('primer.html'));
  for (const spec of [rwSpec, mkSpec, phSpec, sopSpec, malSpec]) {
    for (const [key, def] of Object.entries(spec.symbols)) {
      assert.ok(primerIds.has(def.primer), `${key} -> #${def.primer}`);
      assert.ok(def.render || def.display, `${key} needs a render or a display text`);
    }
  }
});

test('every model page has an overview deck and a row in the units table', () => {
  const index = read('index.html');
  for (const f of readdirSync(join(root, 'models'))) {
    assert.ok(existsSync(join(root, 'decks', f)), `decks/${f}`);
    assert.ok(index.includes(`models/${f}#view=essentials`), `index links ${f}`);
    assert.ok(read(`models/${f}`).includes(`overviewUrl: '../decks/${f}'`), `${f} links its deck`);
  }
});

test('every check question has exactly one right answer and explains every option', () => {
  for (const [name, c] of Object.entries({ ...warmupChecks, ...primerChecks, ...tutorialChecks })) {
    assert.equal(c.options.filter((o) => o.correct).length, 1, name);
    for (const o of c.options) assert.ok(o.why.length > 15, `${name}: ${o.text}`);
  }
  for (const [name, c] of Object.entries(warmupChecks)) assert.ok(c.hint, `warm-up ${name} has a hint`);
});

test('every check and widget used on a page is defined', () => {
  const warm = read('warm-up.html');
  for (const m of warm.matchAll(/data-check="(\w+)"/g)) assert.ok(warmupChecks[m[1]], m[1]);
  const primer = read('primer.html');
  for (const m of primer.matchAll(/data-check="(\w+)"/g)) assert.ok(primerChecks[m[1]], m[1]);
});

test('every deck has slides, titles, and a way back', () => {
  for (const page of pages.filter((p) => p.startsWith('decks/'))) {
    const html = read(page);
    const slides = [...html.matchAll(/<section class="slide" data-title="([^"]+)"/g)];
    assert.ok(slides.length >= 5, `${page} has ${slides.length} slides`);
    assert.match(html, /data-back="[^"]+"/);
  }
});

test('tutorials use only checks, phenomena, and models that exist', () => {
  const modelIds = new Set(MODELS.map((m) => m.id));
  for (const page of inDir('tutorials')) {
    const html = read(page);
    for (const m of html.matchAll(/data-check="(\w+)"/g)) assert.ok(tutorialChecks[m[1]], `${page}: check ${m[1]}`);
    for (const m of html.matchAll(/data-verdicts="([a-z-]+)"/g)) assert.ok(phenomena.some((p) => p.id === m[1]), `${page}: phenomenon ${m[1]}`);
    for (const m of html.matchAll(/data-model="([a-z-]+)"/g)) assert.ok(modelIds.has(m[1]), `${page}: model ${m[1]}`);
    assert.ok(read('index.html').includes(`href="${page}"`), `the landing page lists ${page}`);
  }
});

test('every page carries the same navigation', () => {
  const labels = (html) => [...(html.match(/<nav aria-label="Pages">([\s\S]*?)<\/nav>/)?.[1] ?? '').matchAll(/>([^<]+)<\/a>/g)].map((m) => m[1]);
  const want = labels(read('index.html'));
  assert.ok(want.length >= 10);
  for (const page of pages.filter((p) => !p.startsWith('decks/'))) assert.deepEqual(labels(read(page)), want, page);
});
