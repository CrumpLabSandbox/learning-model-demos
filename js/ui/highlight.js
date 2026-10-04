// Linked highlighting. Hovering or focusing any element with data-sym or
// data-cue lights up every matching element: the symbol in each equation,
// its slider, its table column, its chart line, and its row in the guide.

function matches(el, sym, cue) {
  const es = el.dataset.sym;
  const ec = el.dataset.cue;
  if (sym && cue) return (es === sym && (!ec || ec === cue)) || (!es && ec === cue);
  if (sym) return es === sym;
  return ec === cue;
}

export function installHighlighting(root = document) {
  let active = [];
  const clear = () => {
    for (const el of active) el.classList.remove('linked');
    active = [];
  };
  const on = (ev) => {
    const src = ev.target.closest?.('[data-sym], [data-cue]');
    clear();
    if (!src) return;
    const { sym, cue } = src.dataset;
    for (const el of root.querySelectorAll('[data-sym], [data-cue]')) {
      if (matches(el, sym, cue)) {
        el.classList.add('linked');
        active.push(el);
      }
    }
  };
  root.addEventListener('pointerover', on);
  root.addEventListener('focusin', on);
  root.addEventListener('pointerleave', clear);
}
