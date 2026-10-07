// The models page: one card per model, in course order, from the registry.
// The header links here instead of listing every model, so it does not grow
// with the model count.

import { MODELS, INFO, pageOf, deckOf } from '../core/registry.js';
import { esc } from './equation.js';

export function mountModels(root) {
  root.innerHTML =
    `<div class="model-cards">` +
    MODELS.map((m, i) => {
      const info = INFO[m.id] ?? {};
      return (
        `<article class="entry-card model-card" data-model-card="${m.id}">` +
        `<div class="kicker">Model ${i + 1} · ${esc(info.authors ?? '')} ${m.year}</div>` +
        `<h3><a href="${pageOf(m)}#view=essentials">${esc(m.name)}</a></h3>` +
        `<p class="small">${esc(info.idea ?? '')}</p>` +
        `<p class="small muted">${esc(info.explains ?? '')}</p>` +
        `<div class="btn-row"><a class="btn primary" href="${pageOf(m)}#view=essentials">Essentials</a><a class="btn" href="${pageOf(m)}#view=everything">Everything</a><a class="btn" href="${deckOf(m)}">Slides</a></div>` +
        `</article>`
      );
    }).join('') +
    `</div>`;
  document.documentElement.setAttribute('data-ready', '');
}
