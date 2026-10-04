// Inside the trial: the moment-by-moment view for models that run in real
// time (SOP). It reads the moments a trial record keeps and draws:
// - a timeline of how active the focus cue and the US are (A1 solid, A2
//   dashed), with bars for when each is on;
// - the overlaps the cue learns from: green where the cue and the US are both
//   in A1 (gain), red where the cue is in A1 while the US is in A2 (loss);
// - a three-state bar for the cue and the US at the selected moment;
// - the arithmetic of the selected moment: elements moving between states,
//   and that moment's share of the gain and the loss.
// A scrubber and a play button move through the moments.

import { fmt, fmtExact } from '../core/format.js';
import { esc, symbolHTML } from './equation.js';
import { cueColor } from './chart.js';
import { whenResized } from './widget-kit.js';

const US_COLOR = 'var(--ink-2)';
const MS_PER_MOMENT = 110;

export function createTimeline(container, { spec, onFocus = () => {} }) {
  container.innerHTML = `
    <div class="cue-chips tl-cues"></div>
    <div class="stepper tl-controls">
      <button class="btn" data-mact="start" aria-label="First moment">⏮</button>
      <button class="btn" data-mact="back" aria-label="Back one moment">◀</button>
      <button class="btn" data-mact="play" aria-pressed="false">Play</button>
      <button class="btn" data-mact="fwd" aria-label="Forward one moment">▶</button>
      <input type="range" class="tl-scrub" min="1" max="1" value="1" aria-label="Select a moment inside the trial">
      <span class="trial-label tl-label"></span>
    </div>
    <div class="tl-plot"></div>
    <div class="tl-key small"></div>
    <div class="tl-options small">
      <label class="tl-whole-label"><input type="checkbox" class="tl-whole"> Show the whole gap to the next trial</label>
      <label class="advanced"><input type="checkbox" class="tl-response"> Show the response R</label>
    </div>
    <div class="tl-states"></div>
    <div class="tl-readout"></div>`;
  const q = (sel) => container.querySelector(sel);
  const plot = q('.tl-plot');
  let props = null;
  let moment = null;
  let lastRec = null;
  let whole = false;
  let showResponse = false;
  let timer = null;
  let geom = null;

  const visible = (m) => (whole ? m.length : Math.min(m.length, m.window + Math.max(25, m.window)));

  function stop() {
    clearInterval(timer);
    timer = null;
    const b = q('[data-mact="play"]');
    b.textContent = 'Play';
    b.setAttribute('aria-pressed', 'false');
  }
  function setMoment(k) {
    if (!props?.rec) return;
    const n = visible(props.rec.moments);
    moment = Math.max(1, Math.min(n, k));
    draw();
  }

  container.addEventListener('click', (ev) => {
    const chip = ev.target.closest('[data-tl-focus]');
    if (chip) return onFocus(chip.dataset.tlFocus);
    const act = ev.target.closest('[data-mact]')?.dataset.mact;
    if (!act || !props?.rec) return;
    const n = visible(props.rec.moments);
    if (act !== 'play') stop();
    if (act === 'start') setMoment(1);
    else if (act === 'back') setMoment(moment - 1);
    else if (act === 'fwd') setMoment(moment + 1);
    else if (act === 'play') {
      if (timer) return stop();
      if (moment >= n) setMoment(1);
      const b = q('[data-mact="play"]');
      b.textContent = 'Pause';
      b.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        if (!props?.rec || moment >= visible(props.rec.moments)) return stop();
        setMoment(moment + 1);
      }, MS_PER_MOMENT);
    }
  });
  q('.tl-scrub').addEventListener('input', (ev) => {
    stop();
    setMoment(Number(ev.target.value));
  });
  q('.tl-whole').addEventListener('change', (ev) => {
    whole = ev.target.checked;
    setMoment(moment);
  });
  q('.tl-response').addEventListener('change', (ev) => {
    showResponse = ev.target.checked;
    draw();
  });
  plot.addEventListener('pointerdown', (ev) => {
    const k = momentFromEvent(ev);
    if (k === null) return;
    stop();
    plot.setPointerCapture?.(ev.pointerId);
    setMoment(k);
    const move = (e) => {
      const kk = momentFromEvent(e);
      if (kk !== null) setMoment(kk);
    };
    const up = () => {
      plot.removeEventListener('pointermove', move);
      plot.removeEventListener('pointerup', up);
    };
    plot.addEventListener('pointermove', move);
    plot.addEventListener('pointerup', up);
  });
  plot.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      stop();
      setMoment(moment + (ev.key === 'ArrowRight' ? 1 : -1));
    }
  });
  function momentFromEvent(ev) {
    const svg = plot.querySelector('svg');
    if (!svg || !geom) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * geom.width;
    return Math.round(geom.xInv(px));
  }
  whenResized(container, () => draw());

  // The moment to show first on a new trial: the US arriving, or the end of
  // the cue.
  function firstMoment(rec) {
    const t = rec.timing;
    if (t.us) return t.us[0];
    if (t.cs) return t.cs[1];
    return 1;
  }

  function update(next) {
    props = next;
    if (!props.rec) {
      stop();
      lastRec = null;
      container.classList.add('tl-empty');
      q('.tl-cues').innerHTML = '';
      plot.innerHTML = '';
      q('.tl-key').innerHTML = '';
      q('.tl-states').innerHTML = '';
      q('.tl-readout').innerHTML = `<p class="notice">Step to a trial, or click the prediction chart, to look inside it moment by moment.</p>`;
      q('.tl-label').textContent = '';
      return;
    }
    container.classList.remove('tl-empty');
    if (props.rec !== lastRec) {
      const n = visible(props.rec.moments);
      if (moment === null || lastRec === null || moment > n) moment = Math.min(n, firstMoment(props.rec));
      lastRec = props.rec;
    }
    draw();
  }

  function draw() {
    if (!props?.rec) return;
    const { run, rec, cue } = props;
    const m = rec.moments;
    const n = visible(m);
    moment = Math.max(1, Math.min(n, moment ?? 1));
    const scrub = q('.tl-scrub');
    scrub.max = String(n);
    scrub.value = String(moment);
    q('.tl-label').textContent = `Moment ${moment} of ${m.length}`;
    q('.tl-whole-label').hidden = n === m.length && !whole;
    q('.tl-cues').innerHTML =
      `<span class="muted">Follow</span>` +
      run.cues
        .map((c) => `<button class="btn cue-chip" data-tl-focus="${c}" data-cue="${c}" aria-pressed="${c === cue}"><span class="swatch" style="background:${cueColor(run, c)}"></span>${c}${rec.present.includes(c) ? '' : ' <span class="muted small">absent</span>'}</button>`)
        .join('') +
      `<span class="muted">and the US</span>`;
    const drawn = trialPlot({ run, rec, cue, n, width: container.clientWidth || 640, opts: props.opts, moment, showResponse });
    plot.innerHTML = drawn.svg;
    geom = drawn.geom;
    q('.tl-key').innerHTML = keyHTML(run, cue, props.opts);
    q('.tl-states').innerHTML = statesHTML(run, rec, cue);
    q('.tl-readout').innerHTML = readoutHTML(rec, cue, props.opts);
  }

  function keyHTML(run, cue, opts) {
    const color = cueColor(run, cue);
    return (
      `<span class="key" data-sym="pA1" data-cue="${cue}"><span class="swatch" style="background:${color}"></span>${cue} in A1</span>` +
      `<span class="key" data-cue="${cue}"><span class="swatch dashed" style="--c:${color}"></span>${cue} in A2</span>` +
      `<span class="key" data-sym="pA1US"><span class="swatch" style="background:${US_COLOR}"></span>US in A1</span>` +
      `<span class="key" data-sym="pA2US"><span class="swatch dashed" style="--c:${US_COLOR}"></span>US in A2</span>` +
      `<span class="key" data-sym="ovE" data-cue="${cue}"><span class="swatch block gain"></span>gain: L⁺ × ${cue} and US both in A1</span>` +
      (opts.inhibition ? `<span class="key" data-sym="ovI" data-cue="${cue}"><span class="swatch block loss"></span>loss: L⁻ × ${cue} in A1, US in A2</span>` : '') +
      (showResponse ? `<span class="key" data-sym="R"><span class="swatch response"></span>response R</span>` : '')
    );
  }

  // ---- Three states at the selected moment -------------------------------
  function statesHTML(run, rec, cue) {
    const m = rec.moments;
    const k = moment - 1;
    const row = (node, label, color) => {
      const a1 = m.A1[node][k];
      const a2 = m.A2[node][k];
      const i = Math.max(0, 1 - a1 - a2);
      const seg = (cls, v, name) =>
        `<span class="tl-seg ${cls}" style="width:${(v * 100).toFixed(2)}%;--c:${color}" title="${name} ${fmt(v)}">${v > 0.14 ? `${name} ${fmt(v, 2)}` : ''}</span>`;
      return (
        `<div class="tl-state-row" data-cue="${node === 'US' ? '' : node}">` +
        `<div class="tl-state-name">${label}${m.on[node][k] ? ' <span class="badge yes">on</span>' : ''}</div>` +
        `<div class="tl-state-bar" role="img" aria-label="${esc(label)}: inactive ${fmt(i)}, A1 ${fmt(a1)}, A2 ${fmt(a2)}">${seg('inactive', i, 'I')}${seg('a1', a1, 'A1')}${seg('a2', a2, 'A2')}</div>` +
        `<div class="tl-state-nums small">inactive ${fmt(i)} · A1 ${fmt(a1)} · A2 ${fmt(a2)}</div></div>`
      );
    };
    return (
      `<div class="tl-states-head small"><strong>At moment ${moment}</strong>, where the elements are:</div>` +
      row(cue, cue, cueColor(run, cue)) +
      row('US', 'US', US_COLOR) +
      `<p class="small muted tl-cycle">Elements go round one way: inactive → A1 → A2 → inactive. Presenting a stimulus moves inactive elements to A1; a linked cue in A1 moves them straight to A2.</p>`
    );
  }

  // ---- The arithmetic of one moment --------------------------------------
  function readoutHTML(rec, cue, opts) {
    const m = rec.moments;
    const k = moment - 1;
    const before = (arr, node, which) => (k === 0 ? m.start[which][node] : arr[node][k - 1]);
    const sym = (key, c) => symbolHTML(spec, key, c);
    const nodeRows = (node) => {
      const a1 = before(m.A1, node, 'A1');
      const a2 = before(m.A2, node, 'A2');
      const inactive = 1 - a1 - a2;
      const p1 = m.on[node][k] ? (node === 'US' ? rec.usP1 : rec.perCue[node].p1) : 0;
      const p2 = m.p2[node][k];
      const toA1 = p1 * inactive;
      const toA2 = p2 * (inactive - toA1);
      const p1Sym = node === 'US' ? sym('p1US') : sym('p1', node);
      const p2Sym = node === 'US' ? sym('p2US') : `<span class="sym role-computed"><i>p</i><sub>2,${node}</sub></span>`;
      const cells = [
        m.on[node][k] ? `${p1Sym} × ${fmt(inactive)} = <strong>${fmt(toA1)}</strong>` : `<span class="muted">off: 0</span>`,
        opts.retrieval ? `${p2Sym} ${fmt(p2)} × ${fmt(inactive - toA1)} = <strong>${fmt(toA2)}</strong>` : `<span class="muted">switched off</span>`,
        `${sym('pd1')} × ${fmt(a1)} = <strong>${fmt(rec.pd1 * a1)}</strong>`,
        `${sym('pd2')} × ${fmt(a2)} = <strong>${fmt(rec.pd2 * a2)}</strong>`,
      ];
      return `<tr${node === 'US' ? '' : ` data-cue="${node}"`}><th class="left">${node}</th>${cells.map((c) => `<td class="left">${c}</td>`).join('')}</tr>`;
    };
    let gainTo = 0;
    let lossTo = 0;
    for (let j = 0; j <= k; j++) {
      gainTo += m.A1[cue][j] * m.A1.US[j];
      lossTo += m.A1[cue][j] * m.A2.US[j];
    }
    const g = rec.Lp * m.A1[cue][k] * m.A1.US[k];
    const l = rec.Lm * m.A1[cue][k] * m.A2.US[k];
    const p = rec.perCue[cue];
    return (
      `<h3 class="tl-sub">Moment ${moment}: elements on the move</h3>` +
      `<p class="small muted">Each number is a share of the node's elements, starting from where they were at the end of moment ${moment - 1}. The probability ${sym('p1US')} is ${fmtExact(rec.usP1)} here${rec.magnitude !== 1 && rec.magnitude ? ` (the US intensity × ${fmtExact(rec.magnitude)})` : ''}.</p>` +
      `<div class="table-scroll"><table class="tl-table small"><thead><tr><th></th><th class="left">inactive → A1 (presented)</th><th class="left">inactive → A2 (called up)</th><th class="left">A1 → A2</th><th class="left">A2 → inactive</th></tr></thead>` +
      `<tbody>${nodeRows(cue)}${nodeRows('US')}</tbody></table></div>` +
      `<h3 class="tl-sub">Moment ${moment}: what ${cue} learns</h3>` +
      `<p class="small">Gain: ${sym('Lp')} × ${sym('pA1', cue)} × ${sym('pA1US')} = ${fmtExact(rec.Lp)} × ${fmt(m.A1[cue][k])} × ${fmt(m.A1.US[k])} = <strong>${fmt(g)}</strong>` +
      (opts.inhibition ? `<br>Loss: ${sym('Lm')} × ${sym('pA1', cue)} × ${sym('pA2US')} = ${fmtExact(rec.Lm)} × ${fmt(m.A1[cue][k])} × ${fmt(m.A2.US[k])} = <strong>${fmt(l)}</strong>` : '') +
      `</p><p class="small">Added up to the end of this moment: gain <span data-sym="dVp" data-cue="${cue}">${fmt(rec.Lp * gainTo)}</span> of ${fmt(p.excite)} for the whole trial` +
      (opts.inhibition ? `, loss <span data-sym="dVm" data-cue="${cue}">${fmt(rec.Lm * lossTo)}</span> of ${fmt(p.inhibit)}` : '') +
      `. At the end of the trial ${cue}'s link changes by <strong data-sym="dV" data-cue="${cue}">${fmt(p.deltaV)}</strong>.</p>`
    );
  }

  return { update, stop };
}

// ---- The timeline ---------------------------------------------------------
// One trial as an SVG: when the cue and the US are on, how active each is,
// and what the cue gains and loses on each moment. Used by the model page
// and by the slides. moment, when given, draws the cursor there.
export function trialPlot({ run, rec, cue, n, width, opts, moment = null, showResponse = false, mini = false }) {
  const m = rec.moments;
  const W = Math.max(300, Math.round(width));
  const L = 64;
  const R = 12;
  const onH = 12;
  const top = 6;
  const mainTop = top + 2 * (onH + 4) + 24;
  const mainH = 150;
  const ovTop = mainTop + mainH + 34;
  const ovH = 64;
  const H = ovTop + ovH + 40;
  const x = (k) => L + (k / n) * (W - L - R);
  const y = (v) => mainTop + (1 - v) * mainH;
  const geom = { width: W, xInv: (px) => ((px - L) / (W - L - R)) * n };
  const color = cueColor(run, cue);
  const out = [];
  // When each stimulus is on.
  const onBars = (node, row, fill, label) => {
    const yy = top + row * (onH + 4);
    out.push(`<text class="tick" x="${L - 6}" y="${yy + onH - 2}" text-anchor="end">${esc(label)}</text>`);
    out.push(`<rect x="${L}" y="${yy}" width="${W - L - R}" height="${onH}" fill="var(--surface-2)" rx="2"/>`);
    let k = 0;
    while (k < n) {
      if (m.on[node][k]) {
        let j = k;
        while (j + 1 < n && m.on[node][j + 1]) j += 1;
        out.push(`<rect x="${x(k)}" y="${yy}" width="${Math.max(1, x(j + 1) - x(k))}" height="${onH}" rx="2" style="fill:${fill}"/>`);
        k = j + 1;
      } else k += 1;
    }
  };
  onBars(cue, 0, color, `${cue} on`);
  onBars('US', 1, US_COLOR, 'US on');
  // Gap band after the trial window.
  if (m.window < n) out.push(`<rect x="${x(m.window)}" y="${mainTop}" width="${x(n) - x(m.window)}" height="${mainH}" class="tl-gap-band"/>`);
  // Grid and axes for the main lane.
  for (const v of [0, 0.5, 1]) {
    out.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`);
    out.push(`<text class="tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`);
  }
  out.push(`<text class="axis-title" x="${L}" y="${mainTop - 8}">Proportion of elements active</text>`);
  if (m.window < n) out.push(`<text class="tick" x="${x(m.window) + 4}" y="${mainTop + 12}">gap to the next trial</text>`);
  // Each line starts from where the node was before moment 1.
  const series = (state, node) => {
    const pts = [`${x(0)},${y(m.start[state][node])}`];
    for (let k = 0; k < n; k++) pts.push(`${x(k + 1)},${y(m[state][node][k])}`);
    return pts.join(' ');
  };
  out.push(`<polyline class="tl-line" data-sym="pA1US" points="${series('A1', 'US')}" style="stroke:${US_COLOR}"/>`);
  out.push(`<polyline class="tl-line a2" data-sym="pA2US" points="${series('A2', 'US')}" style="stroke:${US_COLOR}"/>`);
  out.push(`<polyline class="tl-line" data-sym="pA1" data-cue="${cue}" points="${series('A1', cue)}" style="stroke:${color}"/>`);
  out.push(`<polyline class="tl-line a2" data-cue="${cue}" points="${series('A2', cue)}" style="stroke:${color}"/>`);
  if (showResponse) {
    const lo = Math.min(0, ...Array.from(m.response).slice(0, n));
    const ry = (v) => y(Math.max(lo, Math.min(1, v)));
    const pts = [`${x(0)},${ry(0)}`];
    for (let k = 0; k < n; k++) pts.push(`${x(k + 1)},${ry(m.response[k])}`);
    out.push(`<polyline class="tl-line response" data-sym="R" points="${pts.join(' ')}"/>`);
  }
  // What the cue gains and loses on each moment: L⁺ and L⁻ times the
  // overlaps, on one shared scale, so the areas compare as the change in
  // V does.
  const gain = [];
  const loss = [];
  for (let k = 0; k < n; k++) {
    gain.push(rec.Lp * m.A1[cue][k] * m.A1.US[k]);
    loss.push(opts.inhibition ? rec.Lm * m.A1[cue][k] * m.A2.US[k] : 0);
  }
  const peak = Math.max(0.005, ...gain, ...loss);
  const mid = ovTop + ovH / 2;
  const oy = (v, sign) => mid - (sign * v * (ovH / 2 - 2)) / peak;
  const area = (vals, sign) => {
    let d = `M${x(0)},${mid}`;
    vals.forEach((v, k) => {
      d += ` L${x(k)},${oy(v, sign)} L${x(k + 1)},${oy(v, sign)}`;
    });
    return `${d} L${x(n)},${mid} Z`;
  };
  out.push(`<text class="axis-title" x="${L}" y="${ovTop - 10}">${W < 520 ? `Gain and loss for ${esc(cue)}` : `What ${esc(cue)} gains and loses, moment by moment`}</text>`);
  out.push(`<path class="tl-gain" data-sym="ovE" data-cue="${cue}" d="${area(gain, 1)}"/>`);
  if (opts.inhibition) out.push(`<path class="tl-loss" data-sym="ovI" data-cue="${cue}" d="${area(loss, -1)}"/>`);
  out.push(`<line class="zero" x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}"/>`);
  out.push(`<text class="tick" x="${L - 6}" y="${mid - 8}" text-anchor="end">gain</text>`);
  if (opts.inhibition) out.push(`<text class="tick" x="${L - 6}" y="${mid + 16}" text-anchor="end">loss</text>`);
  // Moment ticks.
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => n / s <= Math.max(2, Math.floor((W - L) / 50))) ?? 100;
  for (let k = 0; k <= n; k += step) out.push(`<text class="tick" x="${x(k)}" y="${ovTop + ovH + 16}" text-anchor="middle">${k}</text>`);
  out.push(`<text class="axis-title" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">Moment inside the trial</text>`);
  // The selected moment.
  if (moment !== null) out.push(`<line class="cursor" x1="${x(moment)}" x2="${x(moment)}" y1="${top}" y2="${ovTop + ovH}"/>`);
  const svg = mini
    ? `<svg class="chart tl-svg mini" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Inside trial ${rec.index}: ${esc(cue)} and the US, moment by moment">${out.join('')}</svg>`
    : `<svg class="chart tl-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" tabindex="0" role="slider" aria-label="Moment inside the trial" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${moment}">${out.join('')}</svg>`;
  return { svg, geom };
}
