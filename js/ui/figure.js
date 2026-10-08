// The idea in a picture: each model's equation spec exports a `figure`
// ({ svg, caption }). The model page shows it in the idea card, and a deck or
// tutorial shows it with <figure data-figure="<model id>"></figure>.
import { SPECS } from '../../content/equations/index.js';

export function figureHTML(spec, { captionClass = '' } = {}) {
  const fig = spec.figure;
  if (!fig) return '';
  return `${fig.svg}<figcaption${captionClass ? ` class="${captionClass}"` : ''}>${fig.caption}</figcaption>`;
}

export function mountFigures(root) {
  for (const el of root.querySelectorAll('[data-figure]')) {
    const spec = SPECS[el.dataset.figure];
    if (!spec?.figure) throw new Error(`No figure for model "${el.dataset.figure}"`);
    el.classList.add('model-figure');
    el.innerHTML = figureHTML(spec, { captionClass: el.dataset.captionClass ?? '' });
  }
}
