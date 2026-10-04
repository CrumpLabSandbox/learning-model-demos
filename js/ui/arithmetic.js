// Arithmetic view: one cue's update on one trial, drawn as quantities.
//
// Top: a number line with what happened (the outcome), what was predicted
// (built from each cue's strength), and the gap between them.
// Below: one or more chains of multiplication that turn numbers into
// changes, such as "salience × learning rate × error = change in strength".
//
// The model's spec describes what to draw:
//   arithmetic(opts) -> {
//     line:   { target, prediction, parts, error }   symbol keys; parts is the
//             per-cue symbol stacked to make the prediction, or null.
//             A model with no outcome-versus-prediction error (SOP) gives
//             line: null and a lead(rec, cue) sentence instead.
//     chains: [{ title, factors: [keys], signed: [keys], result,
//                when?(rec, cue), whenFalse?(rec, cue) }]
//     states: [{ sym, after(rec, cue) }]              values before -> after
//     verdict?(rec, cue)                              one sentence, optional
//   }

import { fmt, fmtExact, signed } from '../core/format.js';
import { esc, symbolHTML, symbolText, cueSub } from './equation.js';
import { cueColor } from './chart.js';

function niceStep(span) {
  const raw = span / 5;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
}

// A symbol as SVG text, with a real subscript (tspans shift down, then back).
function svgSym(spec, key, cue, opts) {
  const def = spec.symbols[key];
  const r = def.render;
  if (!r) return esc(def.display ? def.display(opts) : def.name);
  const sub = r.sub === 'cue' ? cue : r.sub?.replaceAll('$', cue);
  const base = `${esc(r.pre ?? '')}${esc(r.base)}${r.bar ? '\u0305' : ''}`;
  return sub ? `${base}<tspan dy="4" font-size="0.75em">${esc(sub)}</tspan><tspan dy="-4">\u200b</tspan>` : base;
}

function numberLine({ spec, line, rec, cue, present, run, width, opts }) {
  const val = (key, c = cue) => spec.symbols[key].value(rec, c);
  const lambda = val(line.target);
  const pred = val(line.prediction);
  const partCues = line.parts ? present : [cue];
  const partSym = line.parts ?? line.prediction;
  const parts = partCues.map((c) => ({ c, v: spec.symbols[partSym].value(rec, c) }));
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
  const row = (i) => 10 + i * rowH;
  // sym is SVG markup from svgSym; rest is plain text.
  const label = (lx, ly, sym, rest) =>
    lx + 100 > W
      ? `<text class="value-label" x="${lx - 5}" y="${ly}" text-anchor="end">${sym}${esc(rest)}</text>`
      : `<text class="value-label" x="${lx + 5}" y="${ly}">${sym}${esc(rest)}</text>`;

  for (let v = lo; v <= hi + 1e-9; v += step) {
    const vv = Number(v.toFixed(10));
    out.push(`<line x1="${x(vv)}" x2="${x(vv)}" y1="6" y2="${H - 22}" stroke="var(--grid)"/>`);
    out.push(`<text class="tick" x="${x(vv)}" y="${H - 8}" text-anchor="middle">${signed(String(vv))}</text>`);
  }
  out.push(`<line x1="${x(0)}" x2="${x(0)}" y1="6" y2="${H - 22}" stroke="var(--axis)"/>`);

  const r1 = row(0);
  out.push(`<text class="row-label" x="0" y="${r1 + 16}">What happened</text>`);
  out.push(
    `<g data-sym="${line.target}"><rect class="target-fill" x="${Math.min(x(0), x(lambda))}" y="${r1 + 4}" width="${Math.abs(x(lambda) - x(0))}" height="16" rx="3"/>` +
      `<line class="target" x1="${x(lambda)}" x2="${x(lambda)}" y1="${r1}" y2="${row(2) + 24}"/>` +
      `${label(x(lambda), r1 + 16, svgSym(spec, line.target, cue, opts), ` = ${signed(fmtExact(lambda))}`)}</g>`,
  );

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
      `<rect data-sym="${partSym}" data-cue="${p.c}" x="${x0 + 1}" y="${r2 + 4}" width="${w}" height="16" rx="3" style="fill:${cueColor(run, p.c)}"><title>${esc(symbolText(spec, partSym, p.c, opts))} = ${fmt(p.v)}</title></rect>`,
    );
    if (w > 22) out.push(`<text x="${x0 + w / 2 + 1}" y="${r2 + 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#fff" pointer-events="none">${p.c}</text>`);
  }
  out.push(
    `<g data-sym="${line.prediction}"><line x1="${x(pred)}" x2="${x(pred)}" y1="${r2}" y2="${row(2) + 24}" stroke="var(--ink)" stroke-width="2"/>` +
      `${label(x(pred), r2 + 31, svgSym(spec, line.prediction, cue, opts), ` = ${signed(fmt(pred))}`)}</g>`,
  );

  const r3 = row(2) + 12;
  const err = lambda - pred;
  out.push(`<text class="row-label" x="0" y="${r3 + 10}">Surprise (error)</text>`);
  if (Math.abs(x(lambda) - x(pred)) > 3) {
    const dir = err > 0 ? 1 : -1;
    const tip = x(lambda);
    out.push(
      `<g data-sym="${line.error}"><line class="gap" x1="${x(pred)}" x2="${tip - dir * 7}" y1="${r3 + 6}" y2="${r3 + 6}"/>` +
        `<path class="gap-head" d="M${tip},${r3 + 6} l${-dir * 8},-5 v10 z"/></g>`,
    );
  }
  const labelX = Math.min(W - 100, Math.max(L, Math.min(x(lambda), x(pred))));
  out.push(`<text class="value-label" data-sym="${line.error}" x="${labelX}" y="${r3 + 24}">error = ${signed(fmt(err))}</text>`);

  return `<svg viewBox="0 0 ${W} ${H + 6}" width="${W}" height="${H + 6}" role="img" aria-label="Outcome ${fmtExact(lambda)}, prediction ${fmt(pred)}, error ${fmt(err)}">${out.join('')}</svg>`;
}

function factorBox(spec, key, cue, value, signedScale, opts) {
  const def = spec.symbols[key];
  const text = signed(def.exact ? fmtExact(value) : fmt(value));
  const mag = Math.min(1, Math.abs(value));
  const bar = signedScale
    ? `<span class="bar-fill" style="${value >= 0 ? 'left:50%' : `left:${50 - mag * 50}%`};width:${mag * 50}%"></span>`
    : `<span class="bar-fill" style="left:0;width:${mag * 100}%"></span>`;
  const symbol = def.render ? symbolHTML(spec, key, cue) : `<span class="sym role-${def.role}">${esc(def.display ? def.display(opts) : def.name)}</span>`;
  return (
    `<div class="factor role-${def.role}" data-sym="${key}"${cueSub(def.render) ? ` data-cue="${cue}"` : ''}>` +
    `<div class="f-name">${symbol} ${def.render ? esc(def.name) : ''}</div>` +
    `<div class="f-value">${text}</div><div class="bar-track">${bar}</div></div>`
  );
}

function defaultVerdict(spec, line, rec, cue) {
  const err = spec.symbols[line.target].value(rec, cue) - spec.symbols[line.prediction].value(rec, cue);
  if (Math.abs(err) < 0.0005) return `There is almost no surprise, so ${cue} barely changes.`;
  if (err > 0) return `The outcome was bigger than predicted, so ${cue}'s strength goes up.`;
  return `The outcome was smaller than predicted, so ${cue}'s strength goes down.`;
}

export function renderArithmetic(el, { spec, arith, rec, cue, present, run, width, opts = {} }) {
  if (!rec) {
    el.innerHTML = '<p class="notice">Select a trial to see its arithmetic.</p>';
    return;
  }
  if (!spec.cueless && !present.includes(cue)) {
    el.innerHTML = `<p class="notice">${spec.absentNote(cue, rec)}</p>`;
    return;
  }
  const val = (key) => spec.symbols[key].value(rec, cue);
  const chains = arith.chains
    .map((ch) => {
      const head = ch.title ? `<div class="chain-title">${esc(ch.title)}</div>` : '';
      if (ch.when && !ch.when(rec, cue)) {
        return `${head}<p class="small muted chain-off">${esc(ch.whenFalse ? ch.whenFalse(rec, cue) : 'Not on this trial.')}</p>`;
      }
      const signedKeys = new Set(ch.signed ?? []);
      const boxes = ch.factors.map((k) => factorBox(spec, k, cue, val(k), signedKeys.has(k), opts));
      const result = val(ch.result);
      const shrink =
        ch.factors.length > 1 && Math.abs(result) < Math.max(...ch.factors.map((k) => Math.abs(val(k)))) - 1e-9;
      return (
        head +
        `<div class="chain">${boxes.join('<span class="op">×</span>')}<span class="op">=</span>${factorBox(spec, ch.result, cue, result, true, opts)}</div>` +
        (shrink ? `<p class="small muted">Multiplying by numbers between 0 and 1 makes the result smaller than the biggest factor, so change happens in steps.</p>` : '')
      );
    })
    .join('');
  const states = arith.states
    .map((st) => `${symbolHTML(spec, st.sym, cue)}: ${signed(fmt(val(st.sym)))} → <strong>${signed(fmt(st.after(rec, cue)))}</strong>`)
    .join('<br>');
  const verdict = arith.verdict ? arith.verdict(rec, cue) : defaultVerdict(spec, arith.line, rec, cue);
  el.innerHTML =
    (arith.line ? numberLine({ spec, line: arith.line, rec, cue, present, run, width, opts }) : '') +
    (arith.lead ? `<p class="small">${arith.lead(rec, cue)}</p>` : '') +
    chains +
    `<p class="verdict">${states}<br>${esc(verdict)}</p>`;
}
