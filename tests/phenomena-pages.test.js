// The phenomena pages: every phenomenon has a page and an evidence entry,
// the evidence is in a consistent format, and the glossary's links to the
// findings resolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { phenomena } from '../content/phenomena/index.js';
import { evidence, STRENGTH, formatReference } from '../content/phenomena/evidence.js';
import { glossary } from '../content/glossary.js';

const root = new URL('..', import.meta.url);
const ids = new Set(phenomena.map((p) => p.id));

test('every phenomenon has a page that mounts it, and every page is for a phenomenon that exists', () => {
  for (const p of phenomena) {
    const file = new URL(`phenomena/${p.id}.html`, root);
    assert.ok(existsSync(file), `phenomena/${p.id}.html`);
    const html = readFileSync(file, 'utf8');
    assert.ok(html.includes(`mountPhenomenonPage({ root: document.getElementById('app'), id: '${p.id}' })`), `phenomena/${p.id}.html mounts ${p.id}`);
    assert.ok(html.includes(`<title>${p.title.replace(/'/g, '&#39;')} · Learning Model Demos</title>`), `phenomena/${p.id}.html is titled ${p.title}`);
  }
  for (const [id] of Object.entries(evidence)) assert.ok(ids.has(id), `evidence for unknown phenomenon ${id}`);
});

test('every phenomenon has an evidence entry in the fixed format', () => {
  const strengths = new Set(Object.keys(STRENGTH));
  for (const p of phenomena) {
    const ev = evidence[p.id];
    assert.ok(ev, `${p.id} has no evidence entry`);
    assert.ok(strengths.has(ev.strength), `${p.id}: strength ${ev.strength} is not one of ${[...strengths].join(', ')}`);
    assert.ok(Array.isArray(ev.references) && Array.isArray(ev.designs), `${p.id}: references and designs are lists`);
    if (ev.strength !== 'unwritten') {
      assert.ok(ev.basis && ev.basis.length > 40, `${p.id}: a judgement needs its basis`);
      assert.ok(ev.references.length >= 1, `${p.id}: a judgement needs at least one paper`);
      assert.ok(ev.designs.length >= 1, `${p.id}: a written entry describes at least one design`);
      assert.ok(ev.preset && ev.preset.length > 40, `${p.id}: a written entry says how the preset relates to the designs`);
    }
    for (const r of ev.references) {
      for (const k of ['authors', 'year', 'title', 'source', 'supports']) assert.ok(r[k], `${p.id}: a reference is missing ${k}`);
      assert.match(String(r.year), /^\d{4}[a-z]?$/, `${p.id}: year ${r.year}`);
      if (r.doi) assert.match(r.doi, /^10\.\S+$/, `${p.id}: doi ${r.doi}`);
      assert.ok(formatReference(r).endsWith('.'));
    }
    for (const d of ev.designs) {
      assert.ok(d.study && d.measured, `${p.id}: a design needs the study and what was measured`);
      if (d.results) {
        assert.ok(d.results.columns.length >= 2 && d.results.rows.length >= 1, `${p.id}: a results table has columns and rows`);
        for (const row of d.results.rows) assert.equal(row.length, d.results.columns.length, `${p.id}: every results row has one cell per column`);
      }
    }
  }
});

test('the written entries: blocking and unblocking come from Kamin (1969)', () => {
  for (const id of ['blocking', 'unblocking']) {
    const ev = evidence[id];
    assert.equal(ev.strength, 'established', id);
    assert.ok(ev.references.some((r) => r.authors.startsWith('Kamin') && r.year === 1969), `${id} cites Kamin (1969)`);
    assert.ok(ev.designs.some((d) => d.results), `${id} shows the paper's numbers`);
  }
  // The numbers the page shows are the paper's (p. 282 and p. 292).
  const basic = evidence.blocking.designs[0].results.rows.map((r) => r[r.length - 1]);
  assert.deepEqual(basic, ['.45', '.05', '.25', '.44']);
  const bigger = evidence.unblocking.designs[0].results.rows.map((r) => r[r.length - 1]);
  assert.deepEqual(bigger, ['.45', '.14', '.36']);
});

test('latent inhibition comes from Lubow and Moore (1959), with their two tables', () => {
  const ev = evidence['latent-inhibition'];
  assert.equal(ev.strength, 'qualified');
  assert.ok(ev.references.some((r) => r.authors.startsWith('Lubow') && r.year === 1959));
  const means = ev.designs.map((d) => d.results.rows[d.results.rows.length - 1].slice(2));
  assert.deepEqual(means, [['25.8', '19.4', '6.4'], ['33.6', '24.3', '8.1']]);
  // Each table's mean is the mean of its rows, as the paper computed it.
  for (const d of ev.designs) {
    const rows = d.results.rows.slice(0, -1);
    for (const col of [2, 3]) {
      const mean = rows.reduce((s, r) => s + Number(r[col]), 0) / rows.length;
      assert.ok(Math.abs(mean - Number(d.results.rows[rows.length][col])) < 0.06, `${d.study}: column ${col} mean ${mean}`);
    }
  }
});

test('conditioned inhibition comes from Rescorla (1969), with the summation figures', () => {
  const ev = evidence['conditioned-inhibition'];
  assert.equal(ev.strength, 'established');
  assert.ok(ev.references.some((r) => r.authors.startsWith('Rescorla') && r.year === 1969));
  const summation = ev.designs[1].results.rows.map((r) => r.slice(1));
  assert.deepEqual(summation, [['.02', '.05'], ['.10', '.18'], ['.07', '.22'], ['.07', '.26']]);
  // The lift from adding the tone grows with the shock rate the tone was safe from.
  const lifts = summation.map(([a, ax]) => Number(ax) - Number(a));
  for (let i = 1; i < lifts.length; i++) assert.ok(lifts[i] > lifts[i - 1], `lift grows: ${lifts}`);
});

test('glossary entries that name a finding name one that exists', () => {
  let n = 0;
  for (const g of glossary) {
    if (!g.phenomenon) continue;
    n++;
    assert.ok(ids.has(g.phenomenon), `${g.id} names unknown phenomenon ${g.phenomenon}`);
  }
  assert.ok(n >= 15, `${n} glossary entries name a finding`);
});
