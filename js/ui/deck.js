// Slide decks. A deck page is plain HTML: one <section class="slide"> per
// slide inside <main class="deck">, with optional <aside class="notes">
// speaker notes. This script turns that into a presentation.
//
// Keys: ← → (or space) to move, Home/End, N for notes, O for the outline,
// F for full screen. Swipe on touch screens. Printing gives one slide per
// page, with notes, as a handout.

import { slideFromHash, keyTarget, clamp } from '../core/deck-nav.js';
import { mountWidgets } from './primer.js';
import { mountMinis } from './minichart.js';
import { mountWarmupWidgets } from './warmup.js';
import { installHighlighting } from './highlight.js';

export function mountDeck(deck) {
  const slides = [...deck.querySelectorAll('.slide')];
  const count = slides.length;
  let current = slideFromHash(location.hash, count);
  const backHref = deck.dataset.back ?? '../index.html';
  const backLabel = deck.dataset.backLabel ?? 'Back to the site';

  slides.forEach((s, i) => {
    s.id = `slide-${i + 1}`;
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', `${i + 1} of ${count}`);
  });

  const bar = document.createElement('nav');
  bar.className = 'deck-bar';
  bar.setAttribute('aria-label', 'Slide controls');
  bar.innerHTML =
    `<a class="btn" href="${backHref}">${backLabel}</a>` +
    `<span class="deck-spacer"></span>` +
    `<button class="btn" data-go="prev" aria-label="Previous slide">◀</button>` +
    `<span class="deck-count" aria-live="polite"></span>` +
    `<button class="btn primary" data-go="next" aria-label="Next slide">Next ▶</button>` +
    `<span class="deck-spacer"></span>` +
    `<button class="btn" data-go="outline" aria-pressed="false">All slides</button>` +
    `<button class="btn" data-go="notes" aria-pressed="false">Notes</button>` +
    `<button class="btn" data-go="full">Full screen</button>`;
  const progress = document.createElement('div');
  progress.className = 'deck-progress';
  progress.innerHTML = '<span></span>';
  const outline = document.createElement('ol');
  outline.className = 'deck-outline';
  outline.hidden = true;
  outline.innerHTML = slides
    .map((s, i) => `<li><a href="#${i + 1}" data-to="${i}">${s.dataset.title ?? s.querySelector('h1, h2')?.textContent ?? `Slide ${i + 1}`}</a></li>`)
    .join('');
  document.body.append(progress, outline, bar);

  mountWidgets(deck);
  mountWarmupWidgets(deck);
  installHighlighting(deck);
  // Charts need a visible slide to measure, so draw each slide's charts the
  // first time it is shown.
  const drawn = new Set();

  function show(i, { push = true } = {}) {
    current = clamp(i, count);
    slides.forEach((s, k) => {
      s.hidden = k !== current;
      s.classList.toggle('current', k === current);
    });
    if (!drawn.has(current)) {
      drawn.add(current);
      mountMinis(slides[current]);
    }
    bar.querySelector('.deck-count').textContent = `${current + 1} / ${count}`;
    bar.querySelector('[data-go="prev"]').disabled = current === 0;
    const next = bar.querySelector('[data-go="next"]');
    next.disabled = current === count - 1;
    next.textContent = current === count - 1 ? 'End' : 'Next ▶';
    progress.firstElementChild.style.width = `${((current + 1) / count) * 100}%`;
    for (const a of outline.querySelectorAll('a')) a.toggleAttribute('aria-current', Number(a.dataset.to) === current);
    if (push) history.replaceState(null, '', `#${current + 1}`);
    document.title = `${slides[current].dataset.title ?? deck.dataset.title ?? 'Slides'} · ${deck.dataset.title ?? ''}`.replace(/ · $/, '');
  }

  function toggle(name) {
    const btn = bar.querySelector(`[data-go="${name}"]`);
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    if (name === 'notes') document.body.classList.toggle('show-notes', on);
    if (name === 'outline') outline.hidden = !on;
  }

  bar.addEventListener('click', (ev) => {
    const go = ev.target.closest('[data-go]')?.dataset.go;
    if (go === 'prev') show(current - 1);
    else if (go === 'next') show(current + 1);
    else if (go === 'notes' || go === 'outline') toggle(go);
    else if (go === 'full') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });
  outline.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-to]');
    if (!a) return;
    ev.preventDefault();
    show(Number(a.dataset.to));
    toggle('outline');
  });

  document.addEventListener('keydown', (ev) => {
    const tag = ev.target.tagName;
    if (ev.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (tag === 'BUTTON' && (ev.key === ' ' || ev.key === 'Enter')) return;
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const k = ev.key.toLowerCase();
    if (k === 'n') return toggle('notes');
    if (k === 'o') return toggle('outline');
    if (k === 'f') return bar.querySelector('[data-go="full"]').click();
    const t = keyTarget(ev.key, current, count);
    if (t === null) return;
    ev.preventDefault();
    show(t);
  });

  let touchX = null;
  deck.addEventListener('touchstart', (ev) => (touchX = ev.touches[0].clientX), { passive: true });
  deck.addEventListener('touchend', (ev) => {
    if (touchX === null) return;
    const dx = ev.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 60 && !ev.target.closest('input, svg, .widget')) show(current + (dx < 0 ? 1 : -1));
  });
  window.addEventListener('hashchange', () => show(slideFromHash(location.hash, count), { push: false }));
  window.addEventListener('beforeprint', () => slides.forEach((s, k) => { s.hidden = false; if (!drawn.has(k)) { drawn.add(k); mountMinis(s); } }));
  window.addEventListener('afterprint', () => show(current, { push: false }));

  show(current, { push: false });
  document.documentElement.setAttribute('data-ready', '');
}
