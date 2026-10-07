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
//   data-options="discrepancy:0"   switch a model's assumptions (1 on, 0 off)
//   data-params="L:0.33"      set a model's parameters
//   data-trial="30"           for a model that runs moment by moment (SOP),
//                             draw inside that trial instead, following the
//                             cue in data-cue (default: the first cue)
//   data-ref="0.467=ΔP 0.47@1;0=ΔP 0@2"
//                             dashed reference lines: value=label, with an
//                             optional @phase (1-based) to span one phase

import { parseDesign } from '../core/design.js';
import { runModel } from '../core/runner.js';
import * as rw from '../models/rescorla-wagner.js';
import * as mackintosh from '../models/mackintosh.js';
import * as pearceHall from '../models/pearce-hall.js';
import * as sop from '../models/sop.js';
import * as minervaAL from '../models/minerva-al.js';
import { defaultOptions } from '../core/runner.js';
import { esc } from './equation.js';
import { whenResized } from './widget-kit.js';
import { trialPlot } from './timeline.js';

const MODELS = { 'rescorla-wagner': rw, mackintosh, 'pearce-hall': pearceHall, sop, 'minerva-al': minervaAL };

// Inside one trial of a moment-by-moment model.
export function drawMiniTrial(el, { design, model = 'sop', trial, cue = null }) {
  const m = MODELS[model];
  const run = runModel(m, { design: parseDesign(design) });
  const rec = run.trials[Math.max(1, Math.min(run.trials.length, trial)) - 1];
  const c = cue ?? rec.present[0];
  const n = Math.min(rec.moments.length, rec.moments.window + Math.max(25, rec.moments.window));
  const { svg } = trialPlot({ run, rec, cue: c, n, width: el.clientWidth || 480, opts: defaultOptions(m), mini: true });
  el.innerHTML = svg + (el.dataset.caption ? `<figcaption>${el.dataset.caption}</figcaption>` : '');
}

export function parseRefs(text) {
  if (!text) return [];
  return text.split(';').map((item) => {
    const [value, rest = ''] = item.split('=');
    const [label, phase] = rest.split('@');
    return { value: Number(value), label: label || value.trim(), phase: phase ? Number(phase) : null };
  });
}

export function drawMini(el, { design, lines, params = {}, options = {}, model = 'rescorla-wagner', labels = {}, seriesKey = null, refs = [], seed = 1 }) {
  const d = parseDesign(design);
  const run = runModel(MODELS[model], { design: d, params, options, seed });
  const show = lines ?? d.probes ?? d.cues;
  const series = seriesKey ? run.stateSeries[seriesKey] : run.series;
  const n = run.trials.length;
  const W = Math.max(260, Math.round(el.clientWidth || 480));
  const H = Math.round(Math.max(160, Math.min(260, W * 0.45)));
  const m = { l: 34, r: 70, t: 22, b: 24 };
  const vals = [...show.flatMap((p) => series[p]), ...refs.map((r) => r.value)];
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
  for (const r of refs) {
    const ph = r.phase ? run.phases[r.phase - 1] : null;
    const x0 = ph ? x(ph.start - 1) : m.l;
    const x1 = ph ? x(ph.end) : W - m.r;
    out.push(`<line class="mini-ref" x1="${x0}" x2="${x1}" y1="${y(r.value)}" y2="${y(r.value)}"/>`);
    out.push(`<text class="mini-ref-label" x="${x1 - 3}" y="${y(r.value) - 4}" text-anchor="end">${esc(r.label)}</text>`);
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
    if (el.dataset.trial) {
      return drawMiniTrial(el, {
        design: el.dataset.design.split('|').join('\n'),
        model: el.dataset.model ?? 'sop',
        trial: Number(el.dataset.trial),
        cue: el.dataset.cue ?? null,
      });
    }
    let labels = {};
    if (el.dataset.labels) labels = Object.fromEntries(el.dataset.labels.split(',').map((kv) => kv.split('=')));
    const pairs = (text) => (text ? text.split(',').map((kv) => kv.split(':')) : []);
    const options = Object.fromEntries(pairs(el.dataset.options).map(([k, v]) => [k, v === '1']));
    const params = Object.fromEntries(pairs(el.dataset.params).map(([k, v]) => [k, Number(v)]));
    drawMini(el, {
      options,
      params,
      design: el.dataset.design.split('|').join('\n'),
      lines: el.dataset.lines ? el.dataset.lines.split(',') : undefined,
      labels,
      model: el.dataset.model ?? 'rescorla-wagner',
      seriesKey: el.dataset.series ?? null,
      refs: parseRefs(el.dataset.ref),
      seed: el.dataset.seed ? Number(el.dataset.seed) : 1,
    });
  };
  for (const el of figs) {
    draw(el);
    whenResized(el, () => draw(el));
  }
}
