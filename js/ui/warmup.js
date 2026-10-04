// Maths warm-up widgets. Gentle, concrete, and forgiving: every widget can
// be reset by moving a slider back, and no answer is recorded anywhere.

import { slider, wireSliders, numberLine, whenResized, renderCheck } from './widget-kit.js';
import { checks } from '../../content/warmup/checks.js';
import { fmt, fmtExact, signed } from '../core/format.js';

const ex = (x) => signed(fmtExact(Number(x.toFixed(4))));

function words(v) {
  const pct = Math.round(v * 100);
  const named = { 0: 'nothing', 0.25: 'a quarter', 0.5: 'a half', 0.75: 'three quarters', 1: 'all of it' }[v];
  return `${fmtExact(v)} is ${named ? `${named}, ` : ''}${pct} out of 100, or ${pct}% of the way from 0 to 1.`;
}

const widgets = {
  decimals(el) {
    el.innerHTML =
      slider({ id: 'wd-v', label: 'Pick a number between 0 and 1', min: 0, max: 1, step: 0.05, value: 0.3 }) +
      `<div class="fill-bar" aria-hidden="true"><span></span></div><p class="wd-say"></p>`;
    wireSliders(el, ['wd-v'], (v) => {
      el.querySelector('.fill-bar span').style.width = `${v['wd-v'] * 100}%`;
      el.querySelector('.wd-say').textContent = words(v['wd-v']);
    });
  },

  negatives(el) {
    el.innerHTML =
      slider({ id: 'wn-v', label: 'Move the point', min: -1, max: 1, step: 0.05, value: -0.4 }) +
      `<div class="wn-line"></div><p class="wn-say"></p>`;
    let last;
    const draw = (v) => {
      last = v;
      const x = v['wn-v'];
      numberLine(el.querySelector('.wn-line'), { lo: -1, hi: 1, rows: 1, marks: [{ v: x, label: ex(x), cls: 'mark-ink', row: 0 }] });
      let say;
      if (Math.abs(x) < 1e-9) say = 'Exactly zero: in a learning model, the cue predicts nothing at all.';
      else if (x > 0) say = `Above zero. In a learning model, a strength of ${ex(x)} means the cue predicts the outcome will happen.`;
      else say = `Below zero. In a learning model, a strength of ${ex(x)} means the cue predicts the outcome will NOT happen. The further below zero, the more confident that prediction.`;
      el.querySelector('.wn-say').textContent = say;
    };
    wireSliders(el, ['wn-v'], draw);
    whenResized(el, () => draw(last));
  },

  gaps(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'wg-a', label: 'Where you are now', min: -1, max: 1.5, step: 0.05, value: 0.3 }) +
      slider({ id: 'wg-b', label: 'Where you want to be (the goal)', min: -1, max: 1.5, step: 0.05, value: 1 }) +
      `</div><div><div class="wg-line"></div><p class="wg-sum"></p><p class="wg-say"></p></div></div>`;
    let last;
    const draw = (v) => {
      last = v;
      const a = v['wg-a'];
      const b = v['wg-b'];
      const g = b - a;
      numberLine(el.querySelector('.wg-line'), {
        lo: -1, hi: 1.5, rows: 2,
        marks: [{ v: a, label: 'now', cls: 'mark-muted', row: 0 }, { v: b, label: 'goal', cls: 'mark-experimenter', row: 0 }],
        arrows: [{ from: a, to: b, label: `gap = ${ex(g)}`, row: 1 }],
      });
      el.querySelector('.wg-sum').innerHTML = `<strong>gap = goal − now = ${fmtExact(b)} − ${a < 0 ? `(${ex(a)})` : fmtExact(a)} = ${ex(g)}</strong>`;
      el.querySelector('.wg-say').textContent =
        Math.abs(g) < 1e-9 ? 'No gap: you are already at the goal.' : g > 0 ? 'The gap is positive: you need to go up.' : 'The gap is negative: you need to come down.';
    };
    wireSliders(el, ['wg-a', 'wg-b'], draw);
    whenResized(el, () => draw(last));
  },

  fractions(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'wf-x', label: 'An amount', min: 0, max: 1, step: 0.05, value: 0.8 }) +
      slider({ id: 'wf-p', label: 'Take this much of it', min: 0, max: 1, step: 0.05, value: 0.5 }) +
      `</div><div><div class="part-bars"><div class="fill-bar"><span class="whole"></span></div><div class="fill-bar"><span class="part"></span></div></div><p class="wf-say"></p></div></div>`;
    wireSliders(el, ['wf-x', 'wf-p'], (v) => {
      const x = v['wf-x'];
      const p = v['wf-p'];
      el.querySelector('.whole').style.width = `${x * 100}%`;
      el.querySelector('.part').style.width = `${x * p * 100}%`;
      const name = { 0.5: 'half', 0.25: 'a quarter', 0.75: 'three quarters', 1: 'all', 0.1: 'a tenth' }[p];
      el.querySelector('.wf-say').innerHTML =
        `<strong>${fmtExact(p)} × ${fmtExact(x)} = ${fmtExact(Number((p * x).toFixed(4)))}</strong>. Multiplying by ${fmtExact(p)} means taking ${name ? `${name} of` : `${Math.round(p * 100)}% of`} the amount. ` +
        (p < 1 ? 'The answer (lower bar) is smaller than what you started with (upper bar).' : 'Multiplying by 1 keeps everything.');
    });
  },

  adding(el) {
    const ids = ['wa-1', 'wa-2', 'wa-3'];
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'wa-1', label: 'First number', min: -1, max: 1, step: 0.05, value: 0.6 }) +
      slider({ id: 'wa-2', label: 'Second number', min: -1, max: 1, step: 0.05, value: 0.3 }) +
      slider({ id: 'wa-3', label: 'Third number', min: -1, max: 1, step: 0.05, value: -0.2 }) +
      `</div><div><div class="wa-line"></div><p class="wa-sum"></p></div></div>`;
    let last;
    const draw = (v) => {
      last = v;
      const vals = ids.map((id) => v[id]);
      const total = vals.reduce((a, b) => a + b, 0);
      let pos = 0;
      let neg = 0;
      const bars = vals.map((x, i) => {
        const from = x >= 0 ? pos : neg + x;
        const to = x >= 0 ? pos + x : neg;
        if (x >= 0) pos += x;
        else neg += x;
        return { from, to, row: 0, color: `var(--cue-${i + 1})` };
      });
      numberLine(el.querySelector('.wa-line'), { lo: -3, hi: 3, rows: 2, bars, marks: [{ v: total, label: `total ${ex(total)}`, cls: 'mark-ink', row: 1 }] });
      el.querySelector('.wa-sum').innerHTML =
        `<strong>${vals.map((x, i) => (i && x < 0 ? `(${ex(x)})` : ex(x))).join(' + ')} = ${ex(total)}</strong>. Positive numbers push the total up (bars to the right); negative numbers pull it down (bars to the left).`;
    };
    wireSliders(el, ids, draw);
    whenResized(el, () => draw(last));
  },

  graphs(el) {
    const vals = [0];
    for (let i = 0; i < 15; i++) vals.push(vals[i] + 0.2 * (1 - vals[i]));
    el.innerHTML = slider({ id: 'wgr-t', label: 'Trial', min: 0, max: 15, step: 1, value: 2 }) + `<div class="wgr-chart"></div><p class="wgr-say"></p>`;
    let last;
    const draw = (v) => {
      last = v;
      const t = v['wgr-t'];
      const box = el.querySelector('.wgr-chart');
      const W = Math.max(260, box.clientWidth || 420);
      const H = 220;
      const m = { l: 58, r: 16, t: 14, b: 36 };
      const x = (i) => m.l + (i / 15) * (W - m.l - m.r);
      const y = (val) => m.t + (1 - val) * (H - m.t - m.b);
      const grid = [0, 0.25, 0.5, 0.75, 1].map((g) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(g)}" y2="${y(g)}" stroke="var(--grid)"/><text class="tick" x="${m.l - 6}" y="${y(g) + 4}" text-anchor="end">${g}</text>`).join('');
      const xt = [0, 5, 10, 15].map((g) => `<text class="tick" x="${x(g)}" y="${H - 20}" text-anchor="middle">${g}</text>`).join('');
      const path = vals.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join('');
      box.innerHTML =
        `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="mini-chart">${grid}${xt}` +
        `<text class="axis-title" x="${(m.l + W - m.r) / 2}" y="${H - 4}" text-anchor="middle">trials (time goes this way →)</text>` +
        `<text class="axis-title" transform="translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle">how much is learned ↑</text>` +
        `<path d="${path}" fill="none" stroke="var(--cue-1)" stroke-width="2.5"/>` +
        `<line x1="${x(t)}" x2="${x(t)}" y1="${y(0)}" y2="${y(vals[t])}" stroke="var(--muted)" stroke-dasharray="3 3"/>` +
        `<line x1="${m.l}" x2="${x(t)}" y1="${y(vals[t])}" y2="${y(vals[t])}" stroke="var(--muted)" stroke-dasharray="3 3"/>` +
        `<circle cx="${x(t)}" cy="${y(vals[t])}" r="5" fill="var(--cue-1)" stroke="var(--surface)" stroke-width="2"/></svg>`;
      el.querySelector('.wgr-say').innerHTML =
        `To read a point: go <strong>along</strong> the bottom to trial ${t}, then <strong>up</strong> to the line, then <strong>across</strong> to the side. After trial ${t}, the value is <strong>${fmt(vals[t])}</strong>.`;
    };
    wireSliders(el, ['wgr-t'], draw);
    whenResized(el, () => draw(last));
  },

  recipe(el) {
    let level = 0;
    let pours = [];
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'wr-p', label: 'Each pour fills this much of the empty space', min: 0.1, max: 1, step: 0.05, value: 0.5 }) +
      `<div class="btn-row"><button class="btn primary" data-act="pour">Pour</button><button class="btn" data-act="empty">Empty the glass</button></div>` +
      `<ol class="wr-steps small"></ol></div>` +
      `<div class="glass-wrap"><svg viewBox="0 0 120 170" class="glass" role="img" aria-label="A glass"><rect x="20" y="10" width="80" height="150" rx="6" class="glass-body"/><rect class="glass-fill" x="22" y="158" width="76" height="0" rx="4"/></svg><p class="wr-level"></p></div></div>`;
    const render = () => {
      const fill = el.querySelector('.glass-fill');
      const h = 146 * level;
      fill.setAttribute('y', String(158 - h));
      fill.setAttribute('height', String(h));
      el.querySelector('.wr-level').innerHTML = `Full: <strong>${fmt(level)}</strong><br><span class="muted small">Empty space: ${fmt(1 - level)}</span>`;
      el.querySelector('.wr-steps').innerHTML = pours
        .map((p, i) => `<li>Empty space ${fmt(p.gap)}. Fill ${fmtExact(p.rate)} of it: ${fmtExact(p.rate)} × ${fmt(p.gap)} = ${fmt(p.add)}. Now ${fmt(p.after)} full.</li>`)
        .join('');
    };
    el.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'pour') {
        const rate = Number(el.querySelector('#wr-p').value);
        const gap = 1 - level;
        const add = rate * gap;
        level += add;
        pours.push({ rate, gap, add, after: level });
      } else if (act === 'empty') {
        level = 0;
        pours = [];
      } else return;
      render();
    });
    el.addEventListener('input', (ev) => {
      if (ev.target.id === 'wr-p') el.querySelector('#wr-p-out').textContent = fmtExact(Number(ev.target.value));
    });
    render();
  },

  letters(el) {
    el.innerHTML =
      `<div class="btn-row"><button class="btn" data-mode="words" aria-pressed="true">In words</button><button class="btn" data-mode="mixed" aria-pressed="false">Words and letters</button><button class="btn" data-mode="letters" aria-pressed="false">In letters</button></div>` +
      `<p class="rule-line"></p>`;
    const forms = {
      words: 'new level = old level + <span class="tag t1">how much of the gap each pour fills</span> × (<span class="tag t2">full</span> − <span class="tag t3">old level</span>)',
      mixed: 'new <span class="tag t3">V</span> = old <span class="tag t3">V</span> + <span class="tag t1">rate</span> × (<span class="tag t2">goal</span> − <span class="tag t3">V</span>)',
      letters: '<span class="tag t3">V</span> ← <span class="tag t3">V</span> + <span class="tag t1">β</span> (<span class="tag t2">λ</span> − <span class="tag t3">V</span>)',
    };
    const render = (mode) => {
      for (const b of el.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
      el.querySelector('.rule-line').innerHTML = forms[mode];
    };
    el.addEventListener('click', (ev) => {
      const m = ev.target.closest('[data-mode]')?.dataset.mode;
      if (m) render(m);
    });
    render('words');
  },
};

// Mount any warm-up widgets inside root. Decks reuse this.
export function mountWarmupWidgets(root) {
  for (const el of root.querySelectorAll('[data-widget]')) widgets[el.dataset.widget]?.(el);
}

export function mountWarmup(root) {
  mountWarmupWidgets(root);
  for (const el of root.querySelectorAll('[data-check]')) renderCheck(el, checks[el.dataset.check]);
}
