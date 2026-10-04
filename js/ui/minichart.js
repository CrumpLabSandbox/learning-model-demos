// A small, non-interactive chart of a model run, for slides and overviews.
// It runs the real model, so a curve on a slide is the model's actual output.
//
// Markup: <figure data-mini data-design="Phase 1: 20 A+|Phase 2: 20 AB+"
//                 data-lines="A,B" data-caption="..."></figure>
// "|" separates phase lines inside the attribute. Optional:
//   data-model="mackintosh"   which model to run (default rescorla-wagner)
//   data-series="alpha"       plot a per-cue internal value, such as
//                             attention, instead of the prediction
//   data-labels="A=noise"     rename lines at their ends

import { parseDesign } from '../core/design.js';
import { runModel } from '../core/runner.js';
import * as rw from '../models/rescorla-wagner.js';
import * as mackintosh from '../models/mackintosh.js';
import * as pearceHall from '../models/pearce-hall.js';
import { esc } from './equation.js';
import { whenResized } from './widget-kit.js';

const MODELS = { 'rescorla-wagner': rw, mackintosh, 'pearce-hall': pearceHall };

export function drawMini(el, { design, lines, params = {}, model = 'rescorla-wagner', labels = {}, seriesKey = null }) {
  const d = parseDesign(design);
  const run = runModel(MODELS[model], { design: d, params });
  const show = lines ?? d.probes ?? d.cues;
  const series = seriesKey ? run.stateSeries[seriesKey] : run.series;
  const n = run.trials.length;
  const W = Math.max(260, Math.round(el.clientWidth || 480));
  const H = Math.round(Math.max(160, Math.min(260, W * 0.45)));
  const m = { l: 34, r: 70, t: 22, b: 24 };
  const vals = show.flatMap((p) => series[p]);
  const lo = Math.min(0, ...vals) < -0.05 ? Math.floor(Math.min(...vals) * 2) / 2 : 0;
  const hi = Math.max(1, Math.ceil(Math.max(...vals) * 2) / 2);
  const x = (i) => m.l + (i / n) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const out = [];
  run.phases.forEach((ph, i) => {
    const x0 = x(ph.start - 1);
    const x1 = x(ph.end);
    if (i % 2 === 1) out.push(`<rect x="${x0}" y="${m.t}" width="${x1 - x0}" height="${H - m.t - m.b}" class="mini-band"/>`);
    if (run.phases.length > 1 && (x1 - x0) > ph.name.length * 6.5) out.push(`<text class="mini-phase" x="${x0 + 4}" y="${m.t - 7}">${esc(ph.name)}</text>`);
  });
  for (let v = lo; v <= hi + 1e-9; v += 0.5) {
    out.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="${Math.abs(v) < 1e-9 ? 'mini-zero' : 'mini-grid'}"/>`);
    out.push(`<text class="mini-tick" x="${m.l - 5}" y="${y(v) + 4}" text-anchor="end">${String(v).replace('-', '−')}</text>`);
  }
  const ends = [];
  show.forEach((p) => {
    const s = series[p];
    const color = p.length === 1 ? `var(--cue-${(run.cues.indexOf(p) % 8) + 1})` : 'var(--ink-2)';
    const path = s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    out.push(`<path d="${path}" class="mini-line${p.length > 1 ? ' compound' : ''}" style="stroke:${color}"/>`);
    ends.push({ label: labels[p] ?? p, y: y(s[n]) });
  });
  ends.sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  for (const e of ends) {
    const ly = Math.max(e.y, prev + 14);
    prev = ly;
    out.push(`<text class="mini-label" x="${W - m.r + 6}" y="${ly + 4}">${esc(e.label)}</text>`);
  }
  out.push(`<text class="mini-tick" x="${W - m.r}" y="${H - 6}" text-anchor="end">trials →</text>`);
  el.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="mini" role="img" aria-label="${esc(el.dataset.caption ?? 'Model predictions across trials')}">${out.join('')}</svg>` +
    (el.dataset.caption ? `<figcaption>${el.dataset.caption}</figcaption>` : '');
}

export function mountMinis(root) {
  const figs = [...root.querySelectorAll('[data-mini]')];
  const draw = (el) => {
    let labels = {};
    if (el.dataset.labels) labels = Object.fromEntries(el.dataset.labels.split(',').map((kv) => kv.split('=')));
    drawMini(el, {
      design: el.dataset.design.split('|').join('\n'),
      lines: el.dataset.lines ? el.dataset.lines.split(',') : undefined,
      labels,
      model: el.dataset.model ?? 'rescorla-wagner',
      seriesKey: el.dataset.series ?? null,
    });
  };
  for (const el of figs) {
    draw(el);
    whenResized(el, () => draw(el));
  }
}
