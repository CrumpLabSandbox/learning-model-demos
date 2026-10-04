// Renders the glossary with a search box and a letter index.
import { glossary } from '../../content/glossary.js';
import { esc } from './equation.js';

export function mountGlossary(root) {
  const byId = Object.fromEntries(glossary.map((g) => [g.id, g]));
  const sorted = glossary.slice().sort((a, b) => a.term.localeCompare(b.term));
  const letters = [...new Set(sorted.map((g) => g.term[0].toUpperCase()))];
  const entry = (g) =>
    `<div class="gl-entry" id="${g.id}" data-search="${esc(`${g.term} ${g.also ?? ''} ${g.plain}`.toLowerCase())}">` +
    `<dt><a class="gl-anchor" href="#${g.id}">${esc(g.term)}</a>${g.also ? ` <span class="muted small">also: ${esc(g.also)}</span>` : ''}</dt>` +
    `<dd><p>${esc(g.plain)}</p>` +
    (g.example ? `<p class="gl-example"><strong>Example:</strong> ${esc(g.example)}</p>` : '') +
    (g.learnMore ? `<p class="small"><a href="${g.learnMore.href}">${esc(g.learnMore.label)}</a></p>` : '') +
    (g.related?.length ? `<p class="small muted">See also: ${g.related.filter((r) => byId[r]).map((r) => `<a href="#${r}">${esc(byId[r].term)}</a>`).join(', ')}</p>` : '') +
    `</dd></div>`;
  root.innerHTML =
    `<label class="field gl-search">Find a word <input type="search" id="gl-q" placeholder="Type a word, such as error or cue" autocomplete="off"></label>` +
    `<nav class="gl-letters" aria-label="Jump to letter">${letters.map((l) => `<a href="#gl-${l}">${l}</a>`).join('')}</nav>` +
    `<p class="gl-none muted" hidden>No words match. Try a shorter search.</p>` +
    letters
      .map((l) => `<section class="gl-group" id="gl-${l}"><h2>${l}</h2><dl>${sorted.filter((g) => g.term[0].toUpperCase() === l).map(entry).join('')}</dl></section>`)
      .join('');
  const q = root.querySelector('#gl-q');
  q.addEventListener('input', () => {
    const t = q.value.trim().toLowerCase();
    let any = false;
    for (const e of root.querySelectorAll('.gl-entry')) {
      const hit = !t || e.dataset.search.includes(t);
      e.hidden = !hit;
      any ||= hit;
    }
    for (const g of root.querySelectorAll('.gl-group')) g.hidden = ![...g.querySelectorAll('.gl-entry')].some((e) => !e.hidden);
    root.querySelector('.gl-none').hidden = any;
  });
  if (location.hash) document.getElementById(location.hash.slice(1))?.classList.add('gl-target');
  window.addEventListener('hashchange', () => {
    for (const e of root.querySelectorAll('.gl-target')) e.classList.remove('gl-target');
    document.getElementById(location.hash.slice(1))?.classList.add('gl-target');
  });
}
