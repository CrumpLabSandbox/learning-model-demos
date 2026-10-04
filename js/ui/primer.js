// The "How to read the equations" primer. Each section has a small live
// widget; the last ones run the real Rescorla-Wagner model.

import { math, mo, mn, row, paren, sym, RW } from './mathml.js';
import { fmt, fmtExact, signed } from '../core/format.js';
import { installHighlighting } from './highlight.js';
import { slider, wireSliders, numberLine, whenResized, renderCheck } from './widget-kit.js';
import { parseDesign } from '../core/design.js';
import { runModel, final } from '../core/runner.js';
import * as rw from '../models/rescorla-wagner.js';
import * as mackintosh from '../models/mackintosh.js';
import * as pearceHall from '../models/pearce-hall.js';
import { cases } from '../../content/primer/fixed-points.js';
import { checks } from '../../content/primer/checks.js';
import { notation } from '../../content/primer/notation.js';

const { V, dV, sumV, alpha, beta, lambda } = RW;
const s = (x) => signed(fmt(x));
const se = (x) => signed(fmtExact(x));
// Arithmetic on slider values is exact to 4 places, so show it without padding.
const ex = (x) => fmtExact(Number(x.toFixed(4)));

// ---- Shared bits ----------------------------------------------------------

// ---- Widgets --------------------------------------------------------------

const widgets = {
  roles(el) {
    el.innerHTML =
      `<div class="big-math">${math(dV('A'), mo('='), alpha('A'), beta(), paren(lambda(), mo('−'), sumV()))}</div>` +
      `<div class="btn-row role-buttons">` +
      `<button class="btn" data-role="experimenter"><span class="role-badge role-experimenter">experimenter</span> What the experimenter sets</button>` +
      `<button class="btn" data-role="modeller"><span class="role-badge role-modeller">parameter</span> What the modeller sets</button>` +
      `<button class="btn" data-role="computed"><span class="role-badge role-computed">computed</span> What the model calculates</button>` +
      `</div><p class="role-explain small" aria-live="polite">Click a button to light up those symbols.</p>`;
    const explain = {
      experimenter: 'λ is set by the design: it is the outcome on this trial, 1 when the outcome happens and 0 when it does not. Which cues are present is also the experimenter\'s choice.',
      modeller: 'α and β are parameters. The modeller picks their values before training starts, and they stay fixed. Changing them changes how fast learning happens.',
      computed: 'ΔV and ΣV are calculated by the model on every trial, from the values that came before. Nobody sets them directly.',
    };
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-role]');
      if (!b) return;
      const role = b.dataset.role;
      for (const x of el.querySelectorAll('[data-role]')) x.setAttribute('aria-pressed', String(x === b));
      for (const sEl of el.querySelectorAll('.sym')) sEl.classList.toggle('linked', sEl.classList.contains(`role-${role}`));
      el.querySelector('.role-explain').textContent = explain[role];
    });
  },

  names(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      ['A', 'B', 'C'].map((c, i) => slider({ id: `nm-${c}`, label: `Strength of cue ${c}`, min: -1, max: 1, step: 0.05, value: [0.6, 0.2, -0.3][i] })).join('') +
      `</div><div class="names-out" aria-live="polite"></div></div>`;
    wireSliders(el, ['nm-A', 'nm-B', 'nm-C'], (v) => {
      el.querySelector('.names-out').innerHTML = ['A', 'B', 'C']
        .map((c, i) => `<div class="name-row"><span class="swatch" style="background:var(--cue-${i + 1})"></span>${math(V(c), mo('='), mn(fmtExact(v[`nm-${c}`])))}</div>`)
        .join('') + `<p class="small muted">Same letter V, three different numbers. The subscript says whose number it is.</p>`;
    });
  },

  delta(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'dl-before', label: 'Strength before the trial', min: -1, max: 1, step: 0.05, value: 0.4 }) +
      slider({ id: 'dl-after', label: 'Strength after the trial', min: -1, max: 1, step: 0.05, value: 0.65 }) +
      `</div><div><div class="dl-math"></div><div class="dl-line"></div><p class="dl-say"></p></div></div>`;
    const draw = (v) => {
      const b = v['dl-before'];
      const a = v['dl-after'];
      const d = a - b;
      el.querySelector('.dl-math').innerHTML =
        `<div>${math(dV(), mo('='), sym('V', { sub: 'after', role: 'computed' }), mo('−'), sym('V', { sub: 'before', role: 'computed' }), mo('='), mn(fmtExact(a)), mo('−'), b < 0 ? paren(mn(fmtExact(b))) : mn(fmtExact(b)), mo('='), mn(ex(d)))}</div>` +
        `<div>${math(V(), mo('←'), V(), mo('+'), dV(), mo('='), mn(fmtExact(b)), mo('+'), d < 0 ? paren(mn(ex(d))) : mn(ex(d)), mo('='), mn(fmtExact(a)))}</div>`;
      numberLine(el.querySelector('.dl-line'), {
        lo: -1, hi: 1, rows: 3,
        marks: [{ v: b, label: `before ${se(b)}`, cls: 'mark-muted', row: 0 }, { v: a, label: `after ${se(a)}`, cls: 'mark-ink', row: 1 }],
        arrows: [{ from: b, to: a, label: `ΔV = ${signed(ex(d))}`, row: 2 }],
      });
      el.querySelector('.dl-say').textContent =
        Math.abs(d) < 1e-9 ? 'ΔV is 0: nothing changed.' : d > 0 ? `ΔV is positive (${signed(ex(d))}): the strength went up.` : `ΔV is negative (${signed(ex(d))}): the strength went down.`;
      this._last = v;
    };
    wireSliders(el, ['dl-before', 'dl-after'], draw);
    whenResized(el, () => draw(this._last));
  },

  sigma(el) {
    const cues = ['A', 'B', 'C'];
    const init = { A: 0.5, B: 0.3, C: 0.9 };
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      cues
        .map(
          (c) =>
            `<label class="toggle"><input type="checkbox" id="sg-on-${c}"${c !== 'C' ? ' checked' : ''}><span>${c} is on this trial</span></label>` +
            slider({ id: `sg-${c}`, label: `Strength of ${c}`, min: -1, max: 1, step: 0.05, value: init[c] }),
        )
        .join('') +
      `</div><div><div class="sg-math"></div><div class="sg-line"></div></div></div>`;
    let last = null;
    const draw = () => {
      const v = Object.fromEntries(cues.map((c) => [c, Number(el.querySelector(`#sg-${c}`).value)]));
      const on = cues.filter((c) => el.querySelector(`#sg-on-${c}`).checked);
      const total = on.reduce((t, c) => t + v[c], 0);
      const symParts = on.length ? on.flatMap((c, i) => (i ? [mo('+'), V(c)] : [V(c)])) : [mn(0)];
      const numParts = on.length ? on.flatMap((c, i) => { const n = v[c] < 0 && i ? paren(mn(fmtExact(v[c]))) : mn(fmtExact(v[c])); return i ? [mo('+'), n] : [n]; }) : [];
      el.querySelector('.sg-math').innerHTML =
        `<div>${math(sumV(), mo('='), ...symParts, ...(on.length ? [mo('='), ...numParts] : []), mo('='), mn(ex(total)))}</div>` +
        `<p class="small">${on.length ? `Σ adds up the cues that are present: ${on.join(' and ')}.` : 'No cues are present, so there is nothing to add: ΣV is 0.'}${on.length < 3 ? ` ${cues.filter((c) => !on.includes(c)).join(' and ')} ${on.length === 2 ? 'is' : 'are'} left out because ${on.length === 2 ? 'it is' : 'they are'} not on the trial.` : ''}</p>`;
      let pos = 0;
      let neg = 0;
      const bars = on.map((c) => {
        const i = cues.indexOf(c);
        const from = v[c] >= 0 ? pos : neg + v[c];
        const to = v[c] >= 0 ? pos + v[c] : neg;
        if (v[c] >= 0) pos += v[c];
        else neg += v[c];
        return { from, to, row: 0, color: `var(--cue-${i + 1})` };
      });
      numberLine(el.querySelector('.sg-line'), {
        lo: -2, hi: 2.5, rows: 2, bars,
        marks: [{ v: total, label: `ΣV = ${signed(ex(total))}`, cls: 'mark-ink', row: 1 }],
      });
      last = true;
    };
    el.addEventListener('input', (ev) => {
      const id = ev.target.id;
      if (id.startsWith('sg-') && !id.startsWith('sg-on')) el.querySelector(`#${id}-out`).textContent = se(Number(ev.target.value));
      draw();
    });
    draw();
    whenResized(el, () => last && draw());
  },

  multiply(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'mu-a', label: 'α, salience of A', min: 0, max: 1, step: 0.05, value: 0.5, role: 'modeller' }) +
      slider({ id: 'mu-b', label: 'β, learning rate', min: 0, max: 1, step: 0.05, value: 0.5, role: 'modeller' }) +
      slider({ id: 'mu-e', label: 'The bracket, λ − ΣV', min: -1, max: 1, step: 0.05, value: 0.8 }) +
      `</div><div class="mu-out" aria-live="polite"></div></div>`;
    wireSliders(el, ['mu-a', 'mu-b', 'mu-e'], (v) => {
      const a = v['mu-a'];
      const b = v['mu-b'];
      const e = v['mu-e'];
      const r = a * b * e;
      const bar = (val, cls, label) =>
        `<div class="mu-bar"><span class="mu-label">${label}</span><span class="mu-track"><span class="mu-fill ${cls}" style="${val >= 0 ? 'left:50%' : `left:${50 - Math.min(1, -val) * 50}%`};width:${Math.min(1, Math.abs(val)) * 50}%"></span></span><span class="mu-val">${signed(ex(val))}</span></div>`;
      el.querySelector('.mu-out').innerHTML =
        `<div>${math(alpha('A'), beta(), paren(lambda(), mo('−'), sumV()))}</div>` +
        `<div>${math(mo('='), mn(fmtExact(a)), mo('×'), mn(fmtExact(b)), mo('×'), e < 0 ? paren(mn(fmtExact(e))) : mn(fmtExact(e)), mo('='), mn(ex(r)))}</div>` +
        bar(e, 'f-computed', 'the bracket') + bar(a * e, 'f-modeller', '× α') + bar(r, 'f-result', '× β = ΔV') +
        `<p class="small">${a < 1 || b < 1 ? 'Each multiplication by a number between 0 and 1 makes the result smaller. That is why each trial moves the strength only part of the way.' : 'With α and β both 1, the change equals the whole error: learning would be finished in one trial.'}</p>`;
    });
  },

  error(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'er-l', label: 'λ, the outcome that happened', min: 0, max: 1.5, step: 0.05, value: 1, role: 'experimenter' }) +
      slider({ id: 'er-s', label: 'ΣV, the prediction', min: -1, max: 1.5, step: 0.05, value: 0.4 }) +
      `</div><div><div class="er-math"></div><div class="er-line"></div><p class="er-say"></p></div></div>`;
    let last;
    const draw = (v) => {
      last = v;
      const l = v['er-l'];
      const p = v['er-s'];
      const e = l - p;
      el.querySelector('.er-math').innerHTML = `<div>${math(lambda(), mo('−'), sumV(), mo('='), mn(fmtExact(l)), mo('−'), p < 0 ? paren(mn(fmtExact(p))) : mn(fmtExact(p)), mo('='), mn(ex(e)))}</div>`;
      numberLine(el.querySelector('.er-line'), {
        lo: -1, hi: 1.5, rows: 2,
        marks: [{ v: l, label: `λ = ${se(l)}`, cls: 'mark-experimenter', row: 0 }, { v: p, label: `ΣV = ${se(p)}`, cls: 'mark-ink', row: 0 }],
        arrows: [{ from: p, to: l, label: `error = ${signed(ex(e))}`, row: 1 }],
      });
      let say;
      if (Math.abs(e) < 1e-9) say = 'The error is 0. The outcome was exactly what the cues predicted, so there is no surprise and nothing is learned.';
      else if (e > 0) say = `The error is positive. More happened than the cues predicted, so the cues present gain strength. The bigger the gap, the bigger the change.`;
      else say = `The error is negative. Less happened than the cues predicted, so the cues present lose strength.${l === 0 ? ' This is extinction.' : ''}`;
      el.querySelector('.er-say').textContent = say;
    };
    wireSliders(el, ['er-l', 'er-s'], draw);
    whenResized(el, () => draw(last));
  },

  trials(el) {
    const ab = 0.15;
    let rows = [];
    el.innerHTML =
      `<p class="small muted">One cue, A, on every trial with the outcome. α = 0.3 and β = 0.5, so αβ = 0.15. λ = 1.</p>` +
      `<div class="btn-row"><button class="btn primary" data-act="next">Run the next trial</button><button class="btn" data-act="five">Run 5 more</button><button class="btn" data-act="reset">Start over</button></div>` +
      `<div class="tr-math" aria-live="polite"></div>` +
      `<div class="table-wrap" style="max-height:16rem;margin-top:.5rem"><table class="trials"><thead><tr><th>n</th><th>V<sub>A</sub><sup>n</sup></th><th>λ − V<sub>A</sub><sup>n</sup></th><th>ΔV<sub>A</sub><sup>n</sup></th><th>V<sub>A</sub><sup>n+1</sup></th></tr></thead><tbody></tbody></table></div>`;
    const render = () => {
      const tb = el.querySelector('tbody');
      tb.innerHTML = rows.map((r) => `<tr><td>${r.n}</td><td>${fmt(r.v)}</td><td>${fmt(1 - r.v)}</td><td>${fmt(r.d)}</td><td><strong>${fmt(r.v + r.d)}</strong></td></tr>`).join('');
      const tw = el.querySelector('.table-wrap');
      tw.scrollTop = tw.scrollHeight;
      const last = rows[rows.length - 1];
      el.querySelector('.tr-math').innerHTML = last
        ? `<div>${math(V('A', 'n+1'), mo('='), V('A', 'n'), mo('+'), dV('A', 'n'))}</div><div>${math(V('A', String(last.n + 1)), mo('='), mn(fmt(last.v)), mo('+'), mn(fmt(last.d)), mo('='), mn(fmt(last.v + last.d)))}</div>` +
          `<p class="small">Trial ${last.n + 1} starts from where trial ${last.n} ended. The same rule is applied again and again; only the numbers change.</p>`
        : `<p class="small">Before training, V<sub>A</sub><sup>0</sup> = 0. Press the button to run trial 0 through the rule.</p>`;
    };
    const step = () => {
      const v = rows.length ? rows[rows.length - 1].v + rows[rows.length - 1].d : 0;
      rows.push({ n: rows.length, v, d: ab * (1 - v) });
    };
    el.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'next') step();
      else if (act === 'five') for (let i = 0; i < 5; i++) step();
      else if (act === 'reset') rows = [];
      else return;
      render();
    });
    render();
  },

  asymptote(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'as-r', label: 'αβ, the learning rate per trial', min: 0.02, max: 1, step: 0.02, value: 0.15, role: 'modeller' }) +
      slider({ id: 'as-l', label: 'λ, the outcome', min: 0, max: 1.5, step: 0.05, value: 1, role: 'experimenter' }) +
      `</div><div><div class="as-chart"></div><p class="as-say small"></p></div></div>`;
    let last;
    const draw = (v) => {
      last = v;
      const r = v['as-r'];
      const l = v['as-l'];
      const n = 30;
      const vals = [0];
      for (let i = 0; i < n; i++) vals.push(vals[i] + r * (l - vals[i]));
      const box = el.querySelector('.as-chart');
      const W = Math.max(260, box.clientWidth || 400);
      const H = 190;
      const m = { l: 34, r: 14, t: 12, b: 26 };
      const x = (i) => m.l + (i / n) * (W - m.l - m.r);
      const y = (val) => m.t + (1 - val / 1.5) * (H - m.t - m.b);
      const ticks = [0, 0.5, 1, 1.5].map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text class="tick" x="${m.l - 5}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('');
      const xt = [0, 10, 20, 30].map((t) => `<text class="tick" x="${x(t)}" y="${H - 8}" text-anchor="middle">${t}</text>`).join('');
      const d = vals.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join('');
      const half = vals.findIndex((val) => val >= l / 2);
      box.innerHTML =
        `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="mini-chart">${ticks}${xt}` +
        `<line x1="${m.l}" x2="${W - m.r}" y1="${y(l)}" y2="${y(l)}" class="asym-line"/>` +
        `<text class="value-label" x="${W - m.r - 4}" y="${y(l) - 6}" text-anchor="end">asymptote λ = ${se(l)}</text>` +
        `<path d="${d}" fill="none" stroke="var(--cue-1)" stroke-width="2"/>` +
        `<text class="axis-title" x="${W - m.r}" y="${H - 8}" text-anchor="end" dy="-12">trial</text></svg>`;
      el.querySelector('.as-say').textContent =
        `V gets halfway to λ ${half > 0 ? `after ${half} trial${half === 1 ? '' : 's'}` : 'immediately'}, then keeps creeping closer without passing it. ` +
        'Move αβ: the curve gets steeper or flatter but ends at the same place. Move λ: the place it ends moves.';
    };
    wireSliders(el, ['as-r', 'as-l'], draw);
    whenResized(el, () => draw(last));
  },

  fixed(el) {
    let ci = 0;
    let shown = 1;
    el.innerHTML =
      `<div class="btn-row case-buttons">${cases.map((c, i) => `<button class="btn" data-case="${i}">${c.title}</button>`).join('')}</div>` +
      `<div class="fx-body"></div>` +
      `<div class="fx-check"></div>`;
    const params = { alpha_A: 0.3, alpha_B: 0.3, alpha_X: 0.3, beta: 0.5, lambda: 1 };
    const render = () => {
      const c = cases[ci];
      for (const b of el.querySelectorAll('[data-case]')) b.setAttribute('aria-pressed', String(Number(b.dataset.case) === ci));
      const steps = c.steps
        .slice(0, shown)
        .map((st, i) => `<li><div class="fx-math">${st.math}</div><p class="small">${subs(st.words)}</p></li>`)
        .join('');
      el.querySelector('.fx-body').innerHTML =
        `<p class="small muted">Design: <code>${c.design}</code></p><ol class="fx-steps">${steps}</ol>` +
        `<div class="btn-row">${shown < c.steps.length ? `<button class="btn primary" data-act="more">Show the next step</button><button class="btn" data-act="all">Show all steps</button>` : `<span class="small muted">That is the whole solution.</span>`}</div>`;
      renderCheckRun();
    };
    const renderCheckRun = () => {
      const c = cases[ci];
      const box = el.querySelector('.fx-check');
      if (shown < c.steps.length) {
        box.innerHTML = '';
        return;
      }
      const sliders = [
        ...c.cues.map((q) => slider({ id: `fx-alpha_${q}`, label: `α<sub>${q}</sub>`, min: 0.05, max: 1, step: 0.05, value: params[`alpha_${q}`], role: 'modeller' })),
        slider({ id: 'fx-beta', label: 'β', min: 0.05, max: 1, step: 0.05, value: params.beta, role: 'modeller' }),
        slider({ id: 'fx-lambda', label: 'λ', min: 0.1, max: 1.5, step: 0.05, value: params.lambda, role: 'experimenter' }),
      ].join('');
      box.innerHTML =
        `<h3 style="margin-top:1rem">Check it with the model</h3><p class="small">The algebra says where learning stops. Run the real model for many trials and compare. Change the parameters and the answer should still hold.</p>` +
        `<div class="widget-grid"><div>${sliders}</div><div class="fx-table"></div></div>`;
      const ids = [...c.cues.map((q) => `fx-alpha_${q}`), 'fx-beta', 'fx-lambda'];
      wireSliders(box, ids, (v) => {
        for (const [k, val] of Object.entries(v)) params[k.replace('fx-', '')] = val;
        const run = runModel(rw, { design: parseDesign(c.design), params });
        const solved = c.solve(params);
        box.querySelector('.fx-table').innerHTML =
          `<table class="symbol-guide"><thead><tr><th>Cue</th><th>Algebra says</th><th>Model after ${run.trials.length} trials</th></tr></thead><tbody>` +
          c.cues.map((q) => `<tr><td>V<sub>${q}</sub></td><td class="value">${s(solved[q])}</td><td class="value">${s(final(run, q))}</td></tr>`).join('') +
          `</tbody></table><p class="small muted">If the model has not quite reached the answer, it is still on its way. Small α or β means slow learning.</p>`;
      });
    };
    el.addEventListener('click', (ev) => {
      const cb = ev.target.closest('[data-case]');
      if (cb) {
        ci = Number(cb.dataset.case);
        shown = 1;
        render();
        return;
      }
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'more') shown += 1;
      else if (act === 'all') shown = cases[ci].steps.length;
      else return;
      render();
    });
    render();
  },

  read(el) {
    const pieces = [
      { html: dV('A'), words: 'ΔV<sub>A</sub>: "the change in A\'s strength on this trial".' },
      { html: mo('='), words: '=: "is" or "equals".' },
      { html: alpha('A'), words: 'α<sub>A</sub>: "A\'s salience", how noticeable A is. A number between 0 and 1.' },
      { html: beta(), words: 'β: "times the learning rate". No symbol between α and β means multiply.' },
      { html: paren(lambda(), mo('−'), sumV()), words: '(λ − ΣV): "times the prediction error". Work out the bracket first: the outcome that happened minus the total prediction of the cues present.' },
    ];
    let i = -1;
    el.innerHTML =
      `<div class="big-math read-math">${math(...pieces.map((p, k) => `<mrow class="piece" data-piece="${k}">${p.html}</mrow>`))}</div>` +
      `<div class="btn-row"><button class="btn primary" data-act="next">Read the next piece</button><button class="btn" data-act="reset">Start over</button></div>` +
      `<ol class="read-words" aria-live="polite"></ol>`;
    const render = () => {
      for (const p of el.querySelectorAll('.piece')) p.classList.toggle('reading-now', Number(p.dataset.piece) === i);
      for (const p of el.querySelectorAll('.piece')) p.classList.toggle('read-done', Number(p.dataset.piece) < i);
      const list = pieces.slice(0, i + 1).map((p) => `<li>${p.words}</li>`).join('');
      const done = i === pieces.length - 1;
      el.querySelector('.read-words').innerHTML =
        list + (done ? `<li class="read-sentence"><strong>All together:</strong> the change in A's strength equals A's salience, times the learning rate, times how surprising the outcome was.</li>` : '');
      el.querySelector('[data-act="next"]').disabled = done;
    };
    el.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'next') i = Math.min(pieces.length - 1, i + 1);
      else if (act === 'reset') i = -1;
      else return;
      render();
    });
    render();
  },

  absolute(el) {
    el.innerHTML =
      slider({ id: 'ab-x', label: 'A number', min: -1, max: 1, step: 0.05, value: -0.6 }) +
      `<div class="ab-math"></div><div class="ab-line"></div><p class="ab-say"></p>`;
    let last;
    const draw = (v) => {
      last = v;
      const x = v['ab-x'];
      el.querySelector('.ab-math').innerHTML = math(mo('|'), x < 0 ? mn(fmtExact(x)) : mn(fmtExact(x)), mo('|'), mo('='), mn(fmtExact(Math.abs(x))));
      numberLine(el.querySelector('.ab-line'), {
        lo: -1, hi: 1, rows: 2,
        marks: [{ v: x, label: se(x), cls: 'mark-ink', row: 0 }],
        arrows: [{ from: 0, to: x, label: `distance from 0 = ${fmtExact(Math.abs(x))}`, row: 1 }],
      });
      el.querySelector('.ab-say').textContent =
        x === 0 ? 'Zero is zero either way.' : `${se(x)} and ${se(-x)} are the same distance from zero, so both have absolute value ${fmtExact(Math.abs(x))}.`;
    };
    wireSliders(el, ['ab-x'], draw);
    whenResized(el, () => draw(last));
  },

  changing(el) {
    // The same blocking experiment through three models: attention to the
    // added cue B, trial by trial.
    const design = parseDesign('Pretraining: 20 A+\nCompound: 20 AB+');
    const runs = [
      { name: 'Rescorla-Wagner', run: runModel(rw, { design }), key: null, note: 'α is a parameter: it never changes.' },
      { name: 'Mackintosh', run: runModel(mackintosh, { design }), key: 'alpha', note: 'B is a worse predictor than A, so attention to B falls.' },
      { name: 'Pearce-Hall', run: runModel(pearceHall, { design }), key: 'alpha', note: 'The outcome is already predicted, so there is no surprise and attention to B fades.' },
    ];
    const seriesOf = (r) => (r.key ? r.run.stateSeries.alpha.B : r.run.series.B.map(() => r.run.params.alpha_B));
    el.innerHTML = `<div class="ch-chart"></div><ul class="ch-notes small">${runs
      .map((r, i) => `<li><span class="swatch" style="background:var(--cue-${i + 1})"></span> <strong>${r.name}</strong>: ${r.note}</li>`)
      .join('')}</ul>`;
    const draw = () => {
      const box = el.querySelector('.ch-chart');
      const W = Math.max(280, box.clientWidth || 480);
      const H = 210;
      const m = { l: 40, r: 120, t: 22, b: 30 };
      const n = 40;
      const x = (i) => m.l + (i / n) * (W - m.l - m.r);
      const y = (v) => m.t + (1 - v) * (H - m.t - m.b);
      const grid = [0, 0.5, 1].map((g) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(g)}" y2="${y(g)}" stroke="var(--grid)"/><text class="tick" x="${m.l - 5}" y="${y(g) + 4}" text-anchor="end">${g}</text>`).join('');
      const band = `<rect x="${x(20)}" y="${m.t}" width="${x(40) - x(20)}" height="${H - m.t - m.b}" fill="var(--surface-2)"/>`;
      const labels = `<text class="tick" x="${x(0)}" y="${m.t - 8}">A alone</text><text class="tick" x="${x(20) + 4}" y="${m.t - 8}">A and B together</text>`;
      const ends = [];
      const lines = runs
        .map((r, i) => {
          const s = seriesOf(r);
          ends.push({ y: y(s[n]), t: r.name, i });
          return `<path d="${s.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('')}" fill="none" stroke="var(--cue-${i + 1})" stroke-width="2.5"/>`;
        })
        .join('');
      ends.sort((a, b) => a.y - b.y);
      let prev = -Infinity;
      const endLabels = ends
        .map((e) => {
          const ly = Math.max(e.y, prev + 14);
          prev = ly;
          return `<text class="value-label" x="${W - m.r + 6}" y="${ly + 4}">${e.t}</text>`;
        })
        .join('');
      box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="mini-chart">${band}${grid}${labels}${lines}${endLabels}<text class="axis-title" x="${m.l}" y="${H - 6}">attention to B (α<tspan dy="4" font-size="0.75em">B</tspan><tspan dy="-4">)</tspan>, trial by trial →</text></svg>`;
    };
    draw();
    whenResized(el, draw);
  },

  bar(el) {
    el.innerHTML =
      `<div class="widget-grid"><div>` +
      slider({ id: 'br-v', label: 'V, excitatory strength', min: 0, max: 1.5, step: 0.05, value: 0.9 }) +
      slider({ id: 'br-vb', label: 'V̄, inhibitory strength', min: 0, max: 1.5, step: 0.05, value: 0.3 }) +
      `</div><div><div class="br-math"></div><div class="br-line"></div><p class="br-say"></p></div></div>`;
    let last;
    const draw = (v) => {
      last = v;
      const a = v['br-v'];
      const b = v['br-vb'];
      const net = Number((a - b).toFixed(4));
      el.querySelector('.br-math').innerHTML = math(sym('V', { role: 'computed' }), mo('−'), `<mover accent="true"><mi>V</mi><mo stretchy="false">¯</mo></mover>`, mo('='), mn(fmtExact(a)), mo('−'), mn(fmtExact(b)), mo('='), mn(fmtExact(net)));
      numberLine(el.querySelector('.br-line'), {
        lo: -1.5, hi: 1.5, rows: 2,
        bars: [{ from: 0, to: a, row: 0, color: 'var(--cue-1)' }, { from: a - b, to: a, row: 1, color: 'var(--cue-2)' }],
        marks: [{ v: net, label: `net ${se(net)}`, cls: 'mark-ink', row: 1 }],
      });
      el.querySelector('.br-say').textContent =
        net > 0 ? 'Overall the cue predicts the outcome will happen.' : net < 0 ? 'Overall the cue predicts the outcome will NOT happen: it is an inhibitor.' : 'The two strengths cancel: overall the cue predicts nothing, though it has learned both.';
    };
    wireSliders(el, ['br-v', 'br-vb'], draw);
    whenResized(el, () => draw(last));
  },

  notation(el) {
    el.innerHTML =
      `<div class="table-wrap" style="max-height:none"><table class="symbol-guide notation"><thead><tr><th>Idea</th><th>This site</th><th>Original paper</th><th>Other forms you may meet</th></tr></thead><tbody>` +
      notation.map((r) => `<tr><td>${r.idea}</td><td class="notation-site">${r.site}</td><td>${r.original}</td><td>${r.other}</td></tr>`).join('') +
      `</tbody></table></div>`;
  },
};

function subs(text) {
  return text.replace(/([A-Za-zΑ-ω]+)_([A-Z])/g, '$1<sub>$2</sub>');
}

// Mount any primer widgets found inside root. Decks reuse this.
export function mountWidgets(root) {
  for (const el of root.querySelectorAll('[data-widget]')) {
    const w = widgets[el.dataset.widget];
    if (w) w.call({}, el);
  }
}

export function mountPrimer(root) {
  for (const el of root.querySelectorAll('[data-widget]')) {
    const w = widgets[el.dataset.widget];
    if (w) w.call({}, el);
  }
  for (const el of root.querySelectorAll('[data-check]')) renderCheck(el, checks[el.dataset.check]);
  installHighlighting(root);
  document.documentElement.setAttribute('data-ready', '');
}
