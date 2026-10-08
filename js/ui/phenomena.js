// The phenomena pages: the findings on their own terms, without any theory.
// phenomena.html lists one card per phenomenon in the order of the table;
// phenomena/<id>.html gives one finding its own page, rendered from
// content/phenomena/index.js (the preset) and content/phenomena/evidence.js
// (the evidence, the designs, and how well established the finding is).

import { phenomena } from '../../content/phenomena/index.js';
import { evidence, STRENGTH, formatReference } from '../../content/phenomena/evidence.js';
import { glossary } from '../../content/glossary.js';
import { MODELS, pageOf } from '../core/registry.js';
import { evaluatePhenomenon } from '../core/phenomena.js';
import { esc } from './equation.js';

const subs = (text) => esc(text).replace(/([A-Za-zΑ-ω]+)_([A-Z])/g, '$1<sub>$2</sub>');

export function strengthBadge(key) {
  const s = STRENGTH[key] ?? STRENGTH.unwritten;
  return `<span class="badge strength strength-${esc(key)}" title="${esc(s.plain)}">${esc(s.label)}</span>`;
}

// One card per phenomenon, in the order of the table. base is the path from
// the page to the site root.
export function mountPhenomena(root, { base = '' } = {}) {
  root.innerHTML =
    `<div class="model-cards phen-cards">` +
    phenomena
      .map((p, i) => {
        const ev = evidence[p.id] ?? { strength: 'unwritten' };
        return (
          `<article class="entry-card phen-card" data-phenomenon-card="${p.id}">` +
          `<div class="kicker">Finding ${i + 1} · ${esc(p.citation)}</div>` +
          `<h3><a href="${base}phenomena/${p.id}.html">${esc(p.title)}</a></h3>` +
          `<p class="small">${esc(p.empirical)}</p>` +
          `<p class="small">${strengthBadge(ev.strength)} <span class="muted">${esc(STRENGTH[ev.strength]?.plain ?? '')}</span></p>` +
          `<div class="btn-row"><a class="btn primary" href="${base}phenomena/${p.id}.html">About this finding</a><a class="btn" href="${base}compare.html#preset=${p.id}">Run it through the models</a></div>` +
          `</article>`
        );
      })
      .join('') +
    `</div>`;
  document.documentElement.setAttribute('data-ready', '');
}

const unwrittenNote = (what) => `<p class="notice small">${what} has not been written up from the papers yet. Until it is, this page shows only what the model cards carry: the finding in one line, its citation, and the site's preset.</p>`;

function referenceHTML(r) {
  const text = esc(formatReference(r));
  const doi = r.doi ? ` <a href="https://doi.org/${esc(r.doi)}">doi:${esc(r.doi)}</a>` : '';
  return `<li><span class="ref-cite">${text}</span>${doi}${r.supports ? `<br><span class="small muted">${esc(r.supports)}</span>` : ''}</li>`;
}

// The paper's own numbers, as a small table.
function resultsHTML(r) {
  return (
    `<div class="table-scroll"><table class="symbol-guide results-table">` +
    (r.caption ? `<caption class="small muted">${esc(r.caption)}</caption>` : '') +
    `<thead><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>` +
    `<tbody>${r.rows.map((row) => `<tr>${row.map((cell, i) => (i ? `<td>${esc(cell)}</td>` : `<th scope="row">${esc(cell)}</th>`)).join('')}</tr>`).join('')}</tbody>` +
    `</table></div>`
  );
}

function designHTML(d) {
  return (
    `<div class="phen-design">` +
    `<h3>${esc(d.study)}</h3>` +
    (d.design ? `<div class="design-text">${esc(d.design)}</div>` : '') +
    (d.cues ? `<p><span class="label">The cues:</span> ${esc(d.cues)}</p>` : '') +
    (d.measured ? `<p><span class="label">What was measured:</span> ${esc(d.measured)}</p>` : '') +
    (d.controls ? `<p><span class="label">Controls:</span> ${esc(d.controls)}</p>` : '') +
    (d.results ? resultsHTML(d.results) : '') +
    (d.notes ? `<p class="small muted">${esc(d.notes)}</p>` : '') +
    `</div>`
  );
}

// Which models show the finding, computed by running the preset through
// every model with its defaults, never typed by hand.
function verdictsHTML(p, base) {
  return MODELS.map((m) => {
    let res;
    try {
      res = evaluatePhenomenon(m, p);
    } catch (e) {
      res = { shown: false, measure: e.message };
    }
    const note = p.models[m.id];
    return (
      `<li class="model-verdict ${res.shown ? 'yes' : 'no'}" data-model-verdict="${m.id}">` +
      `<div class="model-verdict-head"><a href="${base}${pageOf(m)}#preset=${p.id}">${esc(m.name)}</a> <span class="muted small">(${m.year})</span> ` +
      (res.shown ? `<span class="badge yes">✓ Shows it</span>` : `<span class="badge no">✗ Does not</span>`) +
      `</div>` +
      `<p class="small muted">${esc(res.measure)}</p>` +
      (note?.why ? `<p class="small"><span class="label">Why:</span> ${subs(note.why)}</p>` : '') +
      `</li>`
    );
  }).join('');
}

export function mountPhenomenonPage({ root, id, base = '../' }) {
  const i = phenomena.findIndex((p) => p.id === id);
  const p = phenomena[i];
  if (!p) throw new Error(`No phenomenon "${id}"`);
  const ev = evidence[id] ?? { strength: 'unwritten', references: [], designs: [] };
  const s = STRENGTH[ev.strength] ?? STRENGTH.unwritten;
  const unwritten = ev.strength === 'unwritten';
  const term = glossary.find((g) => g.phenomenon === id);
  const prev = phenomena[i - 1];
  const next = phenomena[i + 1];

  root.innerHTML =
    `<div class="prose-wide phen-page">` +
    `<div class="kicker">Finding ${i + 1} of ${phenomena.length}</div>` +
    `<h1>${esc(p.title)}</h1>` +
    `<p class="lede">${esc(p.empirical)} <span class="muted">${esc(p.citation)}</span></p>` +
    `<p>${strengthBadge(ev.strength)} <span class="small muted">${esc(s.plain)}</span></p>` +
    `<p class="small"><a href="${base}phenomena.html">All findings</a> · <a href="${base}models.html#phenomena">The table</a> · <a href="${base}compare.html#preset=${p.id}">Run it through every model</a>${term ? ` · <a href="${base}glossary.html#${term.id}">In the glossary</a>` : ''}</p>` +
    `<section id="finding"><h2>What the finding is</h2>` +
    (ev.finding ? `<p>${esc(ev.finding)}</p>` : '') +
    `<p class="small muted">In this site's notation, the finding is studied with this design (<code>+</code> is the outcome, <code>-</code> is no outcome, and letters are cues):</p>` +
    `<div class="design-text">${esc(p.design)}</div>` +
    `</section>` +
    `<section id="evidence"><h2>The evidence</h2>` +
    (unwritten
      ? unwrittenNote('The evidence for this finding') + `<p class="small muted">The source named on the model cards: ${esc(p.citation)}.</p>`
      : `<p><strong>${esc(s.label)}.</strong> ${esc(ev.basis ?? '')}</p>` +
        (ev.notes ? `<p class="callout">${esc(ev.notes)}</p>` : '') +
        `<h3>Key papers</h3><ol class="ref-list">${(ev.references ?? []).map(referenceHTML).join('')}</ol>`) +
    `</section>` +
    `<section id="designs"><h2>The experimental designs</h2>` +
    (unwritten || !(ev.designs ?? []).length
      ? unwrittenNote('How the original and the best later experiments were run')
      : ev.designs.map(designHTML).join('')) +
    `</section>` +
    `<section id="preset"><h2>The site's preset</h2>` +
    `<p class="small muted">The design above is what every model page loads for this finding.</p>` +
    `<p><span class="label">Counts as shown when:</span> ${esc(p.criterion)}</p>` +
    (ev.preset ? `<p>${esc(ev.preset)}</p>` : `<p class="small muted">How this preset relates to the original designs, and what it leaves out, is written with the evidence.</p>`) +
    `</section>` +
    `<section id="models"><h2>Which models show it</h2>` +
    `<p class="small muted">Each model run on the preset above with its default settings. A ✗ is not always a flaw: the note says why, and sometimes the preset is shorter than the model needs. The <a href="${base}models.html#phenomena">table</a> has every finding and every model.</p>` +
    `<ul class="model-verdicts">${verdictsHTML(p, base)}</ul>` +
    `</section>` +
    `<p class="small muted phen-nav">${prev ? `<a href="${base}phenomena/${prev.id}.html">← ${esc(prev.title)}</a>` : ''}${prev && next ? ' · ' : ''}${next ? `<a href="${base}phenomena/${next.id}.html">${esc(next.title)} →</a>` : ''}</p>` +
    `</div>`;
  document.documentElement.setAttribute('data-ready', '');
}
