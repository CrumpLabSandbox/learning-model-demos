// The phenomenon-by-model table: every phenomenon preset run through every
// model with its default settings. The landing page shows it as static HTML
// written by tools/matrix.mjs, and tests/matrix.test.js fails if that HTML
// no longer matches what the models do.

import { evaluatePhenomenon } from './phenomena.js';
import { pageOf } from './registry.js';

export function computeMatrix(phenomena, models) {
  return phenomena.map((p) => ({
    id: p.id,
    title: p.title,
    results: Object.fromEntries(
      models.map((m) => {
        const r = evaluatePhenomenon(m, p);
        return [m.id, { shown: r.shown, measure: r.measure }];
      }),
    ),
  }));
}

const escape = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

// The table as HTML. base is the path from the page to the site root.
export function matrixHTML(rows, models, { base = '' } = {}) {
  const head = `<tr><th class="left">Phenomenon</th>${models.map((m) => `<th><a href="${base}${pageOf(m)}">${escape(m.name)}</a>${m.status === 'preview' ? '<br><span class="muted small">preview</span>' : ''}</th>`).join('')}</tr>`;
  const body = rows
    .map(
      (r) =>
        `<tr><th class="left" scope="row">${escape(r.title)}</th>` +
        models
          .map((m) => {
            const res = r.results[m.id];
            const label = res.shown ? 'shows it' : 'does not';
            return `<td class="${res.shown ? 'yes' : 'no'}"><a href="${base}${pageOf(m)}#preset=${r.id}" title="${escape(m.name)} ${label}: ${escape(res.measure)}" aria-label="${escape(m.name)} ${label}">${res.shown ? '✓' : '✗'}</a></td>`;
          })
          .join('') +
        `</tr>`,
    )
    .join('\n');
  return `<table class="matrix">\n<thead>${head}</thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

export const MATRIX_START = '<!-- phenomenon table: written by tools/matrix.mjs, do not edit by hand -->';
export const MATRIX_END = '<!-- end of phenomenon table -->';
