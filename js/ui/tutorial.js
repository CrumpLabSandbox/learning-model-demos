// A tutorial page: prose with the site's live pieces mounted in it.
//   [data-mini]       a chart drawn by the real model (see minichart.js)
//   [data-widget]     a primer widget (see primer.js)
//   [data-check]      a check question from content/tutorials/checks.js
//   [data-verdicts]   one phenomenon run through every model now, with a
//                     ✓ or ✗ for each and a link to that model's page

import { mountMinis } from './minichart.js';
import { mountWidgets } from './primer.js';
import { renderCheck } from './widget-kit.js';
import { installHighlighting } from './highlight.js';
import { checks } from '../../content/tutorials/checks.js';
import { phenomena } from '../../content/phenomena/index.js';
import { evaluatePhenomenon } from '../core/phenomena.js';
import { MODELS, pageOf } from '../core/registry.js';
import { esc } from './equation.js';

function renderVerdicts(el, base) {
  const p = phenomena.find((x) => x.id === el.dataset.verdicts);
  if (!p) return;
  el.innerHTML =
    `<div class="verdicts" role="list" aria-label="${esc(p.title)}: which models show it">` +
    MODELS.map((m) => {
      const shown = evaluatePhenomenon(m, p).shown;
      return `<a role="listitem" class="verdict ${shown ? 'yes' : 'no'}" href="${base}${pageOf(m)}#preset=${p.id}">${shown ? '✓' : '✗'} ${esc(m.name)}</a>`;
    }).join('') +
    `</div><p class="small muted">${esc(p.title)}, run through every model just now with its default settings. <a href="${base}compare.html#preset=${p.id}">Compare them side by side</a>.</p>`;
}

export function mountTutorial(root, { base = '../' } = {}) {
  mountMinis(root);
  mountWidgets(root);
  for (const el of root.querySelectorAll('[data-check]')) renderCheck(el, checks[el.dataset.check]);
  for (const el of root.querySelectorAll('[data-verdicts]')) renderVerdicts(el, base);
  installHighlighting(root);
  document.documentElement.setAttribute('data-ready', '');
}
