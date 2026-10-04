// Shared pieces for the interactive pages: sliders, number lines, resize
// handling, and "check yourself" questions. Everything renders into a
// container element; nothing here knows about a particular model.

import { fmtExact, signed } from '../core/format.js';

const se = (x) => signed(fmtExact(x));

export function slider({ id, label, min, max, step, value, role }) {
  return (
    `<div class="slider${role ? ` role-${role}` : ''}"><label class="slider-label" for="${id}">${label}</label>` +
    `<output id="${id}-out" for="${id}">${se(value)}</output>` +
    `<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"></div>`
  );
}

export function wireSliders(el, ids, onChange) {
  const read = () => Object.fromEntries(ids.map((id) => [id, Number(el.querySelector(`#${id}`).value)]));
  el.addEventListener('input', (ev) => {
    const id = ev.target.id;
    if (!ids.includes(id)) return;
    el.querySelector(`#${id}-out`).textContent = se(Number(ev.target.value));
    onChange(read());
  });
  onChange(read());
}

// A horizontal number line drawn at the element's real width.
// marks: [{ v, label, cls, row }]; arrows: [{ from, to, label, row }]
export function numberLine(el, { lo, hi, marks = [], arrows = [], bars = [], rows = 2 }) {
  const W = Math.max(280, el.clientWidth || 600);
  const rowH = 30;
  const H = rows * rowH + 34;
  const L = 12;
  const R = 12;
  const x = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const out = [];
  const step = (hi - lo) / 6 > 0.3 ? 0.5 : 0.25;
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    const vv = Number(v.toFixed(6));
    out.push(`<line x1="${x(vv)}" x2="${x(vv)}" y1="4" y2="${H - 24}" stroke="var(--grid)"/>`);
    out.push(`<text class="tick" x="${x(vv)}" y="${H - 8}" text-anchor="middle">${signed(String(vv))}</text>`);
  }
  out.push(`<line x1="${x(0)}" x2="${x(0)}" y1="4" y2="${H - 24}" stroke="var(--axis)"/>`);
  for (const b of bars) {
    const y = 8 + b.row * rowH;
    const x0 = Math.min(x(b.from), x(b.to));
    out.push(`<rect x="${x0 + 1}" y="${y}" width="${Math.max(1, Math.abs(x(b.to) - x(b.from)) - 2)}" height="14" rx="3" style="fill:${b.color}"/>`);
  }
  for (const m of marks) {
    const y = 4 + m.row * rowH;
    const flip = x(m.v) + 90 > W;
    out.push(`<line x1="${x(m.v)}" x2="${x(m.v)}" y1="${y}" y2="${y + 22}" class="${m.cls}" stroke-width="2.5"/>`);
    out.push(`<text class="value-label" x="${flip ? x(m.v) - 5 : x(m.v) + 5}" y="${y + 15}"${flip ? ' text-anchor="end"' : ''}>${m.label}</text>`);
  }
  for (const a of arrows) {
    const y = 15 + a.row * rowH;
    if (Math.abs(x(a.to) - x(a.from)) > 4) {
      const dir = a.to > a.from ? 1 : -1;
      out.push(`<line class="gap" x1="${x(a.from)}" x2="${x(a.to) - dir * 7}" y1="${y}" y2="${y}"/>`);
      out.push(`<path class="gap-head" d="M${x(a.to)},${y} l${-dir * 8},-5 v10 z"/>`);
    }
    if (a.label) {
      const lx = Math.min(W - 120, Math.max(L, Math.min(x(a.from), x(a.to))));
      out.push(`<text class="value-label" x="${lx}" y="${y + 18}">${a.label}</text>`);
    }
  }
  el.innerHTML = `<svg class="numline" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out.join('')}</svg>`;
}

export function whenResized(el, fn) {
  let w = el.clientWidth;
  new ResizeObserver(() => {
    if (el.clientWidth !== w) {
      w = el.clientWidth;
      fn();
    }
  }).observe(el);
}

// A multiple-choice question. Each option explains why it is right or
// wrong, so a wrong answer still teaches. An optional hint is shown on
// request, before the student answers.
// check: { q, hint?, options: [{ text, correct, why }] }
export function renderCheck(el, check) {
  el.innerHTML =
    `<div class="check"><div class="check-q"><strong>Check yourself.</strong> ${check.q}</div>` +
    `<div class="btn-row">${check.options.map((o, i) => `<button class="btn" data-opt="${i}">${o.text}</button>`).join('')}` +
    (check.hint ? `<button class="btn hint-btn" data-hint>Show me a hint</button>` : '') +
    `</div><p class="check-hint" hidden></p><p class="check-why" aria-live="polite"></p></div>`;
  el.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-hint]')) {
      const h = el.querySelector('.check-hint');
      h.hidden = false;
      h.innerHTML = `<strong>Hint:</strong> ${check.hint}`;
      return;
    }
    const b = ev.target.closest('[data-opt]');
    if (!b) return;
    const o = check.options[Number(b.dataset.opt)];
    for (const x of el.querySelectorAll('[data-opt]')) x.removeAttribute('aria-pressed');
    b.setAttribute('aria-pressed', 'true');
    el.querySelector('.check-why').innerHTML =
      `<span class="badge ${o.correct ? 'yes' : 'no'}">${o.correct ? '✓ Yes' : '✗ Not quite'}</span> ${o.why}` +
      (o.correct ? '' : ' <span class="muted">Try another answer. There is no score.</span>');
  });
}
