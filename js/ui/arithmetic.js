// Arithmetic view: one cue's update on one trial, drawn as quantities.
// Top: a number line with the outcome λ, the prediction built from each
// cue's strength, and the error as the gap between them.
// Bottom: the multiplication that turns the error into a change.

import { fmt, fmtExact, signed } from '../core/format.js';
import { esc, symbolHTML } from './equation.js';
import { cueColor } from './chart.js';

function niceStep(span) {
  const raw = span / 5;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
}

function numberLine({ spec, arith, rec, cue, present, run, width }) {
  const lambda = spec.symbols[arith.target].value(rec, cue);
  const pred = spec.symbols[arith.prediction].value(rec, cue);
  const partCues = arith.predictionParts ? present : [cue];
  const parts = partCues.map((c) => ({ c, v: spec.symbols.V.value(rec, c) }));
  const posSum = parts.filter((p) => p.v > 0).reduce((s, p) => s + p.v, 0);
  const negSum = parts.filter((p) => p.v < 0).reduce((s, p) => s + p.v, 0);
  let lo = Math.min(0, lambda, negSum, pred);
  let hi = Math.max(0.25, lambda, posSum, pred);
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step - 1e-9) * step;
  hi = Math.ceil(hi / step + 1e-9) * step;

  const W = Math.max(300, Math.round(width || 640));
  const L = 118;
  const R = 24;
  const rowH = 34;
  const H = 3 * rowH + 34;
  const x = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const out = [];
  const predSym = spec.symbols[arith.prediction];
  const row = (i) => 10 + i * rowH;
  // A value label beside a vertical line, flipped to the left near the edge.
  const label = (lx, ly, text) =>
    lx + 100 > W
      ? `<text class="value-label" x="${lx - 5}" y="${ly}" text-anchor="end">${text}</text>`
      : `<text class="value-label" x="${lx + 5}" y="${ly}">${text}</text>`;

  // Gridline ticks.
  for (let v = lo; v <= hi + 1e-9; v += step) {
    const vv = Number(v.toFixed(10));
    out.push(`<line x1="${x(vv)}" x2="${x(vv)}" y1="6" y2="${H - 22}" stroke="var(--grid)"/>`);
    out.push(`<text class="tick" x="${x(vv)}" y="${H - 8}" text-anchor="middle">${signed(String(vv))}</text>`);
  }
  out.push(`<line x1="${x(0)}" x2="${x(0)}" y1="6" y2="${H - 22}" stroke="var(--axis)"/>`);

  // Row 1: the outcome.
  const r1 = row(0);
  out.push(`<text class="row-label" x="0" y="${r1 + 16}">What happened</text>`);
  out.push(
    `<g data-sym="${arith.target}"><rect class="target-fill" x="${Math.min(x(0), x(lambda))}" y="${r1 + 4}" width="${Math.abs(x(lambda) - x(0))}" height="16" rx="3"/>` +
      `<line class="target" x1="${x(lambda)}" x2="${x(lambda)}" y1="${r1}" y2="${row(2) + 24}"/>` +
      `${label(x(lambda), r1 - 2 + 18, `λ = ${signed(fmtExact(lambda))}`)}</g>`,
  );

  // Row 2: the prediction, one segment per cue.
  const r2 = row(1);
  out.push(`<text class="row-label" x="0" y="${r2 + 16}">What was predicted</text>`);
  let posAt = 0;
  let negAt = 0;
  for (const p of parts) {
    if (Math.abs(p.v) < 1e-12) continue;
    const from = p.v > 0 ? posAt : negAt + p.v;
    const to = p.v > 0 ? posAt + p.v : negAt;
    if (p.v > 0) posAt += p.v;
    else negAt += p.v;
    const x0 = x(from);
    const w = Math.max(1, x(to) - x0 - 2);
    out.push(
      `<rect data-sym="V" data-cue="${p.c}" x="${x0 + 1}" y="${r2 + 4}" width="${w}" height="16" rx="3" style="fill:${cueColor(run, p.c)}"><title>V${p.c} = ${fmt(p.v)}</title></rect>`,
    );
    if (w > 22) out.push(`<text x="${x0 + w / 2 + 1}" y="${r2 + 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#fff" pointer-events="none">${p.c}</text>`);
  }
  out.push(
    `<g data-sym="${arith.prediction}"><line x1="${x(pred)}" x2="${x(pred)}" y1="${r2}" y2="${row(2) + 24}" stroke="var(--ink)" stroke-width="2"/>` +
      `${label(x(pred), r2 + 31, `${predSym.render.pre ?? ''}V${arith.predictionParts ? '' : cue} = ${signed(fmt(pred))}`)}</g>`,
  );

  // Row 3: the error, an arrow from the prediction to the outcome.
  const r3 = row(2) + 12;
  const err = lambda - pred;
  out.push(`<text class="row-label" x="0" y="${r3 + 10}">Surprise (error)</text>`);
  if (Math.abs(x(lambda) - x(pred)) > 3) {
    const dir = err > 0 ? 1 : -1;
    const tip = x(lambda);
    out.push(
      `<g data-sym="${arith.error}"><line class="gap" x1="${x(pred)}" x2="${tip - dir * 7}" y1="${r3 + 6}" y2="${r3 + 6}"/>` +
        `<path class="gap-head" d="M${tip},${r3 + 6} l${-dir * 8},-5 v10 z"/>` +
        `</g>`,
    );
  }
  const labelX = Math.min(W - 100, Math.max(L, Math.min(x(lambda), x(pred))));
  out.push(`<text class="value-label" data-sym="${arith.error}" x="${labelX}" y="${r3 + 24}">error = ${signed(fmt(err))}</text>`);

  return `<svg viewBox="0 0 ${W} ${H + 6}" width="${W}" height="${H + 6}" role="img" aria-label="Outcome ${fmtExact(lambda)}, prediction ${fmt(pred)}, error ${fmt(err)}">${out.join('')}</svg>`;
}

function factorBox(spec, key, cue, value, { signedScale = false } = {}) {
  const def = spec.symbols[key];
  const text = signed(def.exact ? fmtExact(value) : fmt(value));
  const mag = Math.min(1, Math.abs(value));
  const bar = signedScale
    ? `<span class="bar-fill" style="${value >= 0 ? 'left:50%' : `left:${50 - mag * 50}%`};width:${mag * 50}%"></span>`
    : `<span class="bar-fill" style="left:0;width:${mag * 100}%"></span>`;
  const symbol = def.render ? symbolHTML(spec, key, cue) : `<span class="sym role-${def.role}">${esc(def.name)}</span>`;
  return (
    `<div class="factor role-${def.role}" data-sym="${key}"${def.render?.sub === 'cue' ? ` data-cue="${cue}"` : ''}>` +
    `<div class="f-name">${symbol} ${def.render ? esc(def.name) : ''}</div>` +
    `<div class="f-value">${text}</div><div class="bar-track">${bar}</div></div>`
  );
}

export function renderArithmetic(el, { spec, arith, rec, cue, present, run, width }) {
  if (!rec) {
    el.innerHTML = '<p class="notice">Select a trial to see its arithmetic.</p>';
    return;
  }
  if (!present.includes(cue)) {
    el.innerHTML = `<p class="notice">${spec.absentNote(cue, rec)}</p>`;
    return;
  }
  const err = spec.symbols[arith.error].value(rec, cue);
  const dV = spec.symbols[arith.result].value(rec, cue);
  const before = spec.symbols[arith.state].value(rec, cue);
  const after = arith.after(rec, cue);
  const factors = arith.factors.map((k) => factorBox(spec, k, cue, spec.symbols[k].value(rec, cue)));
  factors.push(factorBox(spec, arith.error, cue, err, { signedScale: true }));
  const chain =
    `<div class="chain">${factors.join('<span class="op">×</span>')}<span class="op">=</span>` +
    `${factorBox(spec, arith.result, cue, dV, { signedScale: true })}</div>`;

  let verdict;
  if (Math.abs(err) < 0.0005) verdict = `There is almost no surprise, so ${cue} barely changes.`;
  else if (err > 0) verdict = `The outcome was bigger than predicted, so ${cue}'s strength goes up.`;
  else verdict = `The outcome was smaller than predicted, so ${cue}'s strength goes down.`;
  const shrink =
    Math.abs(dV) < Math.abs(err) - 1e-9
      ? ' Multiplying by numbers between 0 and 1 makes the change smaller than the error, so learning happens in steps.'
      : '';

  el.innerHTML =
    numberLine({ spec, arith, rec, cue, present, run, width }) +
    chain +
    `<p class="verdict">${symbolHTML(spec, arith.state, cue)}: ${signed(fmt(before))} → <strong>${signed(fmt(after))}</strong>. ${verdict}${shrink}</p>`;
}
