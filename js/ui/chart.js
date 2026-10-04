// Line chart of predictions across trials, drawn as inline SVG.
// x is the trial number (0 is before training); y is the model's prediction
// for each probe after that trial. Click, drag, or use the arrow keys to
// select a trial.

import { fmt, signed } from '../core/format.js';
import { esc } from './equation.js';
import { sketchPoints } from '../core/sketch.js';
import { whenResized } from './widget-kit.js';

const NS = 'http://www.w3.org/2000/svg';

export function cueColor(run, cue) {
  const i = run.cues.indexOf(cue);
  return `var(--cue-${(i % 8) + 1})`;
}

function niceTicks(lo, hi, count = 5) {
  const span = hi - lo || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

function intTicks(n, width) {
  const maxTicks = Math.max(2, Math.floor(width / 60));
  const raw = n / maxTicks;
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((s) => s >= raw) ?? 1000;
  const out = [];
  for (let v = 0; v <= n; v += step) out.push(v);
  return out;
}

// What a chart plots. The default is the model's prediction for each probe.
// A model page can add charts of other per-cue values, such as attention,
// with source = (run) => ({ series, probes, title, floor, ceiling }).
export function predictionSource(run) {
  return { series: run.series, probes: run.displayProbes, title: 'Prediction', floor: run.params.lambda ?? 1 };
}

export function stateSource(key, title, ceiling = 1) {
  return (run) => ({ series: run.stateSeries[key] ?? {}, probes: run.cues, title, floor: 0, ceiling });
}

export function createChart(container, { onSelect, onSketch = () => {}, onSketchEnd = () => {}, source = predictionSource, label = 'Predictions' }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'chart');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'slider');
  const readout = document.createElement('div');
  readout.className = 'chart-readout';
  readout.setAttribute('aria-live', 'polite');
  wrap.append(svg, readout);
  container.append(wrap);

  let model = null; // last props
  let geom = null;
  let hoverT = null;

  function tFromEvent(ev) {
    if (!geom) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * geom.width;
    const t = Math.round(geom.xInv(px));
    return Math.max(0, Math.min(geom.n, t));
  }
  function vFromEvent(ev) {
    const rect = svg.getBoundingClientRect();
    const py = ((ev.clientY - rect.top) / rect.height) * geom.height;
    return Math.max(geom.lo, Math.min(geom.hi, Math.round(geom.yInv(py) * 100) / 100));
  }
  const sketching = () => Boolean(model?.predict?.sketching);

  let dragging = false;
  svg.addEventListener('pointerdown', (ev) => {
    const t = tFromEvent(ev);
    if (t === null) return;
    dragging = true;
    svg.setPointerCapture(ev.pointerId);
    if (sketching()) {
      ev.preventDefault();
      onSketch(t, vFromEvent(ev), { start: true });
    } else onSelect(t);
  });
  svg.addEventListener('pointermove', (ev) => {
    const t = tFromEvent(ev);
    if (dragging && t !== null && sketching()) onSketch(t, vFromEvent(ev), { start: false });
    else if (dragging && t !== null) onSelect(t);
    else if (t !== hoverT) {
      hoverT = t;
      draw();
    }
  });
  svg.addEventListener('pointerup', () => {
    if (dragging && sketching()) onSketchEnd();
    dragging = false;
  });
  svg.addEventListener('pointerleave', () => {
    if (hoverT !== null) {
      hoverT = null;
      draw();
    }
  });
  svg.addEventListener('keydown', (ev) => {
    if (!model || sketching()) return;
    const n = model.run.trials.length;
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[ev.key];
    if (step) onSelect(Math.max(0, Math.min(n, model.t + step)));
    else if (ev.key === 'Home') onSelect(0);
    else if (ev.key === 'End') onSelect(n);
    else return;
    ev.preventDefault();
  });

  whenResized(container, () => draw());

  function update(props) {
    model = props;
    draw();
  }

  function draw() {
    if (!model) return;
    const { run, t, revealed } = model;
    const pr = model.predict ?? null;
    const isSketching = Boolean(pr?.sketching);
    const sketchCues = pr ? pr.cues : [];
    const src = source(run);
    const series = src.series;
    const probes = src.probes.filter((p) => series[p]);
    svg.style.touchAction = isSketching ? 'none' : '';
    svg.classList.toggle('sketching', isSketching);
    const n = run.trials.length;
    const width = Math.max(300, container.clientWidth || 600);
    const height = Math.round(Math.max(240, Math.min(360, width * 0.42)));
    const m = { top: 28, right: 42, bottom: 36, left: 58 };
    const iw = width - m.left - m.right;
    const ih = height - m.top - m.bottom;

    const shown = isSketching ? [] : probes.flatMap((p) => series[p]);
    const sketched = sketchCues.flatMap((c) => Object.values(pr.sketches[c] ?? {}));
    const lambda = src.floor ?? 1;
    let lo = Math.min(0, ...shown, ...sketched);
    let hi = Math.max(lambda, src.ceiling ?? 0.2, ...shown, ...sketched);
    // While sketching, use a range that gives nothing away: room above λ and
    // the same distance below zero, whatever the model will do.
    if (isSketching) {
      lo = Math.min(lo, -lambda);
      hi = Math.max(hi, lambda * 1.1);
    }
    const pad = (hi - lo) * 0.06;
    lo = lo < 0 ? lo - pad : 0;
    hi += pad;
    const ticks = niceTicks(lo, hi);
    lo = Math.min(lo, ticks[0]);
    hi = Math.max(hi, ticks[ticks.length - 1]);

    const x = (i) => m.left + (n ? (i / n) * iw : 0);
    const y = (v) => m.top + (1 - (v - lo) / (hi - lo)) * ih;
    geom = {
      width,
      height,
      n,
      lo,
      hi,
      xInv: (px) => ((px - m.left) / iw) * n,
      yInv: (py) => lo + (1 - (py - m.top) / ih) * (hi - lo),
    };

    const parts = [];
    // Phase bands, boundaries, and names.
    run.phases.forEach((ph, i) => {
      const x0 = x(ph.start - 1);
      const x1 = x(ph.end);
      if (i % 2 === 1) parts.push(`<rect class="phase-band" x="${x0}" y="${m.top}" width="${x1 - x0}" height="${ih}"/>`);
      if (i > 0) parts.push(`<line class="phase-line" x1="${x0}" x2="${x0}" y1="${m.top - 6}" y2="${m.top + ih}"/>`);
      const name = ph.name;
      const fits = name.length * 7 < x1 - x0 - 6;
      const label = fits ? name : (x1 - x0 > 28 ? `${i + 1}` : '');
      if (label) parts.push(`<text class="phase-name" x="${x0 + 4}" y="${m.top - 10}">${esc(label)}<title>${esc(name)}</title></text>`);
    });
    // Grid and y ticks.
    for (const v of ticks) {
      parts.push(`<line class="${Math.abs(v) < 1e-9 ? 'zero' : 'grid'}" x1="${m.left}" x2="${m.left + iw}" y1="${y(v)}" y2="${y(v)}"/>`);
      parts.push(`<text class="tick" x="${m.left - 6}" y="${y(v) + 4}" text-anchor="end">${signed(String(v))}</text>`);
    }
    // x ticks.
    for (const v of intTicks(n, iw)) {
      parts.push(`<text class="tick" x="${x(v)}" y="${m.top + ih + 16}" text-anchor="middle">${v}</text>`);
    }
    parts.push(`<text class="axis-title" x="${m.left + iw}" y="${height - 4}" text-anchor="end">Trial</text>`);
    parts.push(`<text class="axis-title" transform="translate(13 ${m.top + ih / 2}) rotate(-90)" text-anchor="middle">${esc(src.title)}</text>`);

    // Series, up to the revealed trial.
    const upTo = Math.max(0, Math.min(revealed, n));
    const ends = [];
    const colorOf = (p) => (p.length === 1 ? cueColor(run, p) : 'var(--ink-2)');
    const sketchEnds = [];
    for (const c of sketchCues) {
      const pts = sketchPoints(pr.sketches[c] ?? {});
      if (!pts.length) continue;
      const d = pts.map(([tt, v], i) => `${i ? 'L' : 'M'}${x(tt).toFixed(1)},${y(v).toFixed(1)}`).join('');
      const active = isSketching && pr.activeCue === c;
      parts.push(`<path class="sketch${active ? ' active' : ''}" d="${d}" style="stroke:${colorOf(c)}"${c.length === 1 ? ` data-cue="${c}"` : ''}><title>Your sketch for ${c}</title></path>`);
      if (isSketching && pts.length <= 40) {
        for (const [tt, v] of pts) parts.push(`<circle class="sketch-dot" cx="${x(tt)}" cy="${y(v)}" r="${active ? 3.5 : 2.5}" style="fill:${colorOf(c)}"/>`);
      }
      if (isSketching) {
        const [lt, lv] = pts[pts.length - 1];
        sketchEnds.push({ c, x: x(lt), y: y(lv) });
      }
    }
    // Sketch end labels, nudged apart when two lines end close together.
    sketchEnds.sort((a, b) => a.y - b.y);
    let prevY = -Infinity;
    for (const e of sketchEnds) {
      const ly = Math.max(e.y, prevY + 13);
      prevY = ly;
      parts.push(`<text class="end-label" x="${e.x + 6}" y="${ly + 4}">${e.c}</text>`);
    }
    if (!isSketching) probes.forEach((p) => {
      const s = series[p];
      const d = s.slice(0, upTo + 1).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
      const single = p.length === 1;
      const color = single ? cueColor(run, p) : null;
      parts.push(
        `<path class="series${single ? '' : ' compound'}" d="${d}"${single ? ` data-cue="${p}" style="stroke:${color}"` : ''}><title>${p}</title></path>`,
      );
      ends.push({ p, y: y(s[upTo]), color });
    });

    // End labels, nudged apart with leader lines if they collide.
    ends.sort((a, b) => a.y - b.y);
    const placed = [];
    for (const e of ends) {
      let ly = e.y;
      const prev = placed[placed.length - 1];
      if (prev && ly - prev.ly < 13) ly = prev.ly + 13;
      placed.push({ ...e, ly });
    }
    const ex = x(upTo);
    if (!isSketching) for (const e of placed) {
      if (Math.abs(e.ly - e.y) > 2) parts.push(`<line class="leader" x1="${ex + 2}" x2="${ex + 8}" y1="${e.y}" y2="${e.ly - 4}"/>`);
      parts.push(`<text class="end-label" x="${ex + 10}" y="${e.ly + 4}"${e.p.length === 1 ? ` data-cue="${e.p}"` : ''}>${e.p}</text>`);
    }

    // Hover line and selected-trial cursor with dots.
    if (isSketching && hoverT !== null) {
      parts.push(`<line class="hover-line" x1="${x(hoverT)}" x2="${x(hoverT)}" y1="${m.top}" y2="${m.top + ih}"/>`);
    }
    if (!isSketching && hoverT !== null && hoverT !== t) {
      parts.push(`<line class="hover-line" x1="${x(hoverT)}" x2="${x(hoverT)}" y1="${m.top}" y2="${m.top + ih}"/>`);
    }
    if (!isSketching && t !== null && t !== undefined) {
      parts.push(`<line class="cursor" x1="${x(t)}" x2="${x(t)}" y1="${m.top}" y2="${m.top + ih}"/>`);
      const rec = t > 0 ? run.trials[t - 1] : null;
      for (const p of probes) {
        if (t > upTo) continue;
        const v = series[p][t];
        const single = p.length === 1;
        const present = rec && [...p].every((c) => rec.present.includes(c));
        const fill = single ? cueColor(run, p) : 'var(--ink-2)';
        parts.push(
          `<circle class="dot${present || !rec ? '' : ' absent'}" cx="${x(t)}" cy="${y(v)}" r="${present ? 5 : 4}" style="fill:${fill};${present || !rec ? '' : `stroke:${fill}`}"${single ? ` data-cue="${p}"` : ''}/>`,
        );
      }
    }

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.innerHTML = parts.join('');

    // Accessible slider semantics.
    const rec = t > 0 ? run.trials[t - 1] : null;
    svg.setAttribute('aria-label', `${label} across trials. Use the arrow keys to select a trial.`);
    svg.setAttribute('aria-valuemin', '0');
    svg.setAttribute('aria-valuemax', String(n));
    svg.setAttribute('aria-valuenow', String(t));
    svg.setAttribute('aria-valuetext', rec ? `Trial ${t} of ${n}, ${rec.phaseName}, ${rec.label}` : 'Before training');

    // Readout: legend plus values at the hovered or selected trial.
    if (isSketching) {
      const keys = sketchCues
        .map((c) => `<span class="key"><span class="swatch sketch-swatch" style="--sw:${colorOf(c)}"></span>${c}${c === pr.activeCue ? ' <strong>(drawing)</strong>' : ''}</span>`)
        .join('');
      readout.innerHTML = `<span>${hoverT !== null ? `<strong>Trial ${hoverT}</strong> ` : ''}<span class="muted">Click or drag on the chart to draw your line for ${pr.activeCue}.</span></span>${keys}`;
      return;
    }
    const rt = hoverT ?? t;
    const rrec = rt > 0 ? run.trials[rt - 1] : null;
    const head = rrec
      ? `<strong>Trial ${rt}</strong> <span class="muted">${esc(rrec.phaseName)} · ${esc(rrec.label)}</span>`
      : `<strong>Before training</strong>`;
    const keys = probes
      .map((p) => {
        const single = p.length === 1;
        const v = rt <= upTo ? signed(fmt(series[p][rt])) : '–';
        return `<span class="key"${single ? ` data-cue="${p}"` : ''}><span class="swatch${single ? '' : ' compound'}" style="background:${single ? cueColor(run, p) : 'var(--ink-2)'}"></span>${p}${p === run.context ? ' <span class="muted small">(context)</span>' : ''} <span class="muted">${v}</span></span>`;
      })
      .join('');
    const sketchKey = sketchCues.length ? `<span class="key"><span class="swatch sketch-swatch" style="--sw:var(--ink-2)"></span><span class="muted">your sketch</span></span>` : '';
    readout.innerHTML = `<span>${head}</span>${keys}${sketchKey}`;
  }

  return { update };
}
