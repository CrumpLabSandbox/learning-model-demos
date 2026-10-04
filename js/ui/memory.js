// The memory view, for an instance model (MINERVA-AL): learner 1's memory
// on the selected trial, drawn as a heatmap. Each row is one trace, each
// column one feature, grouped into a field per stimulus. Blue is positive,
// red is negative, and the stronger the colour, the bigger the value.
//
// Above the traces is the probe; beside each trace, its similarity to the
// probe and its activation; below, the echo the traces add up to, the
// event, and the new trace stored on this trial. Hovering reads out any
// cell. Values come from the trial record; nothing is recomputed here.

import { fmt } from '../core/format.js';
import { esc } from './equation.js';
import { whenResized } from './widget-kit.js';

const MAX_ROWS = 300;

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function palette(el) {
  const cs = getComputedStyle(el);
  const get = (name, fallback) => hexToRgb(cs.getPropertyValue(name)) ?? fallback;
  return {
    pos: get('--accent', [42, 120, 214]),
    neg: get('--bad', [176, 42, 42]),
    bg: get('--surface', [252, 252, 251]),
    blank: get('--surface-2', [242, 241, 237]),
    ink: cs.getPropertyValue('--ink').trim() || '#000',
    muted: cs.getPropertyValue('--muted').trim() || '#666',
    grid: cs.getPropertyValue('--axis').trim() || '#ccc',
  };
}

// A value from -1 to 1 (stronger values are clipped) as a colour.
function colour(v, pal) {
  if (v === 0) return `rgb(${pal.blank.join(',')})`;
  const t = Math.min(1, Math.abs(v));
  const c = v > 0 ? pal.pos : pal.neg;
  const mix = c.map((x, i) => Math.round(pal.bg[i] + (x - pal.bg[i]) * (0.15 + 0.85 * t)));
  return `rgb(${mix.join(',')})`;
}

export function createMemoryView(container, { fieldName = (f) => f } = {}) {
  container.innerHTML = `
    <p class="small mem-head"></p>
    <div class="mem-wrap"><canvas class="mem-canvas" role="img"></canvas></div>
    <p class="small mem-readout" aria-live="polite">Hover over the memory to read any value.</p>
    <div class="mem-key small">
      <span class="key"><span class="mem-swatch" style="background:var(--bad)"></span>negative (−1)</span>
      <span class="key"><span class="mem-swatch" style="background:var(--surface-2)"></span>0 or not stored</span>
      <span class="key"><span class="mem-swatch" style="background:var(--accent)"></span>positive (+1)</span>
    </div>`;
  const canvas = container.querySelector('canvas');
  let props = null;
  let layout = null;

  whenResized(container, () => draw());

  canvas.addEventListener('pointermove', (ev) => {
    if (!layout) return;
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const row = layout.rows.find((r) => py >= r.y && py < r.y + r.h);
    const out = container.querySelector('.mem-readout');
    if (!row) return;
    const col = Math.floor((px - layout.x0) / layout.cw);
    const l = props.rec.learner;
    let text = `<strong>${esc(row.label)}</strong>`;
    if (row.trace !== undefined) {
      text += `: similarity ${fmt(l.sims[row.trace])}, activation ${fmt(l.acts[row.trace])}`;
    }
    if (col >= 0 && col < layout.D) {
      const f = Math.floor(col / props.rec.F);
      text += `. Feature ${(col % props.rec.F) + 1} of ${esc(fieldName(props.rec.fields[f]))}: ${fmt(row.values[col])}`;
      if (row.stored && !row.stored[col]) text += ' (not stored)';
    }
    out.innerHTML = text;
  });

  function update(next) {
    props = next;
    draw();
  }

  function draw() {
    if (!props) return;
    const { run, rec } = props;
    const head = container.querySelector('.mem-head');
    if (!rec) {
      canvas.hidden = true;
      layout = null;
      head.innerHTML = 'Before training, memory is empty. Step to a trial to see learner 1\'s memory.';
      return;
    }
    canvas.hidden = false;
    const l = rec.learner;
    const F = rec.F;
    const D = rec.fields.length * F;
    const first = Math.max(0, l.before - MAX_ROWS);
    head.innerHTML =
      `Learner 1's memory on trial ${rec.index} (${esc(rec.label)}): ${l.before} trace${l.before === 1 ? '' : 's'} stored before this trial` +
      (first ? `, showing the most recent ${MAX_ROWS}` : '') +
      `. The probe is compared with each trace; the traces, weighted by their activation, add up to the echo; the new trace is the event minus the echo.`;

    const width = Math.max(300, container.clientWidth || 600);
    const labelW = width < 500 ? 56 : 84;
    const barW = width < 500 ? 34 : 54;
    const x0 = labelW;
    const cw = Math.max(1, (width - labelW - 2 * barW - 16) / D);
    const heatW = cw * D;
    const traceCount = l.before - first;
    const traceH = traceCount ? Math.max(2, Math.min(12, Math.floor(260 / traceCount))) : 0;
    const bigH = 14;
    const rows = [];
    let y = 34;
    rows.push({ label: 'probe', values: l.probe, y, h: bigH });
    y += bigH + 8;
    for (let i = first; i < l.before; i++) {
      const tr = run.trials[i];
      rows.push({ label: `trace ${i + 1}, from trial ${i + 1} (${tr ? tr.label : ''})`, values: l.traces[i], trace: i, y, h: traceH });
      y += traceH;
    }
    if (traceCount) y += 8;
    rows.push({ label: 'echo (scaled)', values: l.echo, y, h: bigH });
    y += bigH + 4;
    rows.push({ label: 'event', values: l.event, y, h: bigH });
    y += bigH + 4;
    rows.push({ label: `new trace (trial ${rec.index})`, values: l.trace, stored: l.stored, y, h: bigH, isNew: true });
    y += bigH + 6;
    const height = y;
    layout = { rows, x0, cw, D };

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.setAttribute('aria-label', `Learner 1's memory: ${l.before} traces, the probe, the echo, the event, and the new trace, as a grid of coloured cells.`);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    const pal = palette(container);
    g.font = '11px system-ui, sans-serif';
    g.textBaseline = 'middle';

    // Field names above the columns. Narrow screens get short names.
    const narrow = F * cw < 60;
    const short = (f) => (f === 'outcome' ? 'O' : f.length > 1 ? (f === 'context' ? 'ctx' : f[0]) : f);
    g.fillStyle = pal.ink;
    rec.fields.forEach((f, i) => {
      const fx = x0 + i * F * cw;
      g.textAlign = 'center';
      g.fillText(narrow ? short(f) : fieldName(f), fx + (F * cw) / 2, 12);
    });
    g.textAlign = 'center';
    g.fillStyle = pal.muted;
    g.fillText(barW < 50 ? 'S' : 'similarity', x0 + heatW + 8 + barW / 2, 12);
    g.fillText(barW < 50 ? 'A' : 'activation', x0 + heatW + 12 + barW * 1.5, 12);

    for (const r of rows) {
      g.fillStyle = pal.muted;
      g.textAlign = 'right';
      if (r.trace === undefined) g.fillText(labelW < 80 ? r.label.split(' ')[0] : r.label.split(' (')[0], x0 - 6, r.y + r.h / 2);
      else if (traceH >= 10 || (r.trace - first) % Math.ceil(12 / traceH) === 0) g.fillText(`${r.trace + 1}`, x0 - 6, r.y + r.h / 2);
      for (let j = 0; j < D; j++) {
        const v = r.stored && !r.stored[j] ? 0 : r.values[j];
        g.fillStyle = colour(v, pal);
        g.fillRect(x0 + j * cw, r.y, Math.ceil(cw), r.h);
      }
      if (r.isNew) {
        g.strokeStyle = pal.ink;
        g.lineWidth = 1.5;
        g.strokeRect(x0 - 0.5, r.y - 0.5, heatW + 1, r.h + 1);
      }
      if (r.trace !== undefined) {
        // Similarity and activation, as bars from a centre line.
        const bar = (bx, v) => {
          const mid = bx + barW / 2;
          g.fillStyle = colour(v >= 0 ? 1 : -1, pal);
          const w = (Math.min(1, Math.abs(v)) * barW) / 2;
          g.fillRect(v >= 0 ? mid : mid - w, r.y, w, Math.max(1, r.h - (r.h > 3 ? 1 : 0)));
        };
        bar(x0 + heatW + 8, l.sims[r.trace]);
        bar(x0 + heatW + 12 + barW, l.acts[r.trace]);
      }
    }
    // Field dividers.
    g.strokeStyle = pal.grid;
    g.lineWidth = 1;
    for (let i = 1; i < rec.fields.length; i++) {
      const fx = Math.round(x0 + i * F * cw) + 0.5;
      g.beginPath();
      g.moveTo(fx, 22);
      g.lineTo(fx, height - 4);
      g.stroke();
    }
    for (const bx of [x0 + heatW + 8 + barW / 2, x0 + heatW + 12 + barW * 1.5]) {
      g.beginPath();
      g.moveTo(Math.round(bx) + 0.5, rows[1]?.y ?? 34);
      g.lineTo(Math.round(bx) + 0.5, (rows[rows.length - 4]?.y ?? 34) + traceH);
      g.stroke();
    }
  }

  return { update };
}
