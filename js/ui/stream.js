// The streamed-trial page: be the participant, then be the model.
//
// A stream of frames flashes by, as in Crump, Hannah, Allan & Hord (2007):
// each frame shows the cue (a square; a triangle for a second cue) or not,
// and the outcome (a circle) or not. After the stream the student rates the
// relationship, or estimates how many frames of each kind there were. The
// reveal shows the 2 × 2 table, ΔP, their judgement, and what every model
// on the site makes of the very same sequence of frames.
//
// The frames are the design's trial sequence for a seed, so the models see
// exactly what the student saw (js/core/contingency.js).

import { streams } from '../../content/streams.js';
import { parseDesign } from '../core/design.js';
import { runModel, final } from '../core/runner.js';
import { makeRng } from '../core/rng.js';
import { MODELS, pageOf } from '../core/registry.js';
import { deltaP, pOutcome, marginalCellsFor, cellsToDesign, streamFrames } from '../core/contingency.js';
import { fmt, signed } from '../core/format.js';
import { esc } from './equation.js';
import { PLOTTED } from './compare.js';

const SPEEDS = {
  slow: { frame: 500, gap: 150, label: 'Slow: half a second per frame' },
  medium: { frame: 250, gap: 100, label: 'Medium: a quarter of a second per frame' },
  paper: { frame: 100, gap: 100, label: 'As in the paper: 100 ms frames, 100 ms gaps' },
};
const CUSTOM = 'custom';
// Ratings run from −100 to +100, so positive ones carry their plus sign.
const plus = (n) => (n > 0 ? `+${n}` : signed(String(n)));
const pct = (x) => (x === null ? '–' : plus(Math.round(x * 100)));

// One frame as SVG: a grey card, the outcome circle at the top, the cue
// shapes at the bottom. Shapes take the colour of their cue's line on the
// charts; the outcome takes the experimenter's colour, as in the diagrams.
function frameSVG({ cues = [], reinforced = false, allCues = [], colorOf, blank = false, size = 1 }) {
  const w = 300;
  const h = 340;
  const parts = [`<rect class="sf-card${blank ? ' blank' : ''}" x="0" y="0" width="${w}" height="${h}" rx="10"/>`];
  if (!blank) {
    if (reinforced) parts.push(`<circle class="sf-outcome" cx="${w / 2}" cy="95" r="52"/>`);
    const slots = allCues.length > 1 ? [w * 0.3, w * 0.7] : [w / 2];
    allCues.forEach((c, i) => {
      if (!cues.includes(c)) return;
      const cx = slots[i];
      if (i === 0) parts.push(`<rect class="sf-cue" x="${cx - 48}" y="190" width="96" height="96" rx="6" style="fill:${colorOf(c)}"/>`);
      else parts.push(`<path class="sf-cue" d="M${cx},186 L${cx + 56},286 L${cx - 56},286 Z" style="fill:${colorOf(c)}"/>`);
    });
  }
  return `<svg class="stream-frame" viewBox="0 0 ${w} ${h}" width="${Math.round(w * size)}" height="${Math.round(h * size)}" aria-hidden="true">${parts.join('')}</svg>`;
}

function cellsTable(cells, cue, { estimates = null } = {}) {
  const row = (label, k1, k2) =>
    `<tr><th scope="row">${label}</th><td>${cells[k1]}${estimates ? ` <span class="muted">(you said ${estimates[k1]})</span>` : ''}</td><td>${cells[k2]}${estimates ? ` <span class="muted">(you said ${estimates[k2]})</span>` : ''}</td></tr>`;
  return (
    `<table class="cells-table"><thead><tr><th></th><th>Outcome</th><th>No outcome</th></tr></thead><tbody>` +
    row(`${cue} present`, 'a', 'b') +
    row(`${cue} absent`, 'c', 'd') +
    `</tbody></table>`
  );
}

export function mountStream(root) {
  const q = new URLSearchParams(location.hash.replace(/^#/, ''));
  const state = {
    presetId: streams.some((s) => s.id === q.get('stream')) ? q.get('stream') : 'positive-low',
    hidden: !q.has('stream'), // a random stream: the student does not know which until the reveal
    custom: { a: 15, b: 15, c: 15, d: 15 },
    speed: SPEEDS[q.get('speed')] ? q.get('speed') : 'slow',
    blank: q.get('blank') === 'black' ? 'black' : 'grey',
    judgement: ['rating', 'frequency', 'either'].includes(q.get('ask')) ? q.get('ask') : 'rating',
    seed: Number.parseInt(q.get('seed') ?? '', 10) || Math.floor(Math.random() * 1e6) + 1,
    stage: 'setup', // setup, playing, judge, result
    frames: [],
    index: -1,
    timer: null,
    paused: false,
    askFor: 'rating',
    ratedCue: null,
    log: [],
  };
  if (matchMedia?.('(prefers-reduced-motion: reduce)').matches) state.speed = 'slow';

  const current = () => (state.presetId === CUSTOM ? null : streams.find((s) => s.id === state.presetId));
  const designText = () => current()?.design ?? cellsToDesign(state.custom);
  const cuesOf = () => current()?.cues ?? ['A'];
  const design = () => parseDesign(designText());
  const colorOf = (cue) => `var(--cue-${(design().cues.indexOf(cue) % 8) + 1})`;

  root.innerHTML = `
    <div class="stream-layout">
      <section class="panel stream-setup" id="st-setup">
        <h2>1. Set up a stream</h2>
        <label class="field">Stream <select id="st-preset">${streams.map((s) => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}<option value="${CUSTOM}">My own cell counts</option></select></label>
        <div class="stream-custom" id="st-custom" hidden>
          <p class="small muted">How many frames of each kind. The cue is A; the stream is shuffled.</p>
          <div class="cells-inputs">${['a', 'b', 'c', 'd'].map((k) => `<label class="field small">${{ a: 'A and outcome', b: 'A, no outcome', c: 'outcome alone', d: 'nothing' }[k]} <input type="number" id="st-cell-${k}" min="0" max="200" value="${state.custom[k]}"></label>`).join('')}</div>
        </div>
        <div class="btn-row"><button class="btn primary" id="st-random">Surprise me: a random stream</button><span class="small muted" id="st-which"></span></div>
        <details class="stream-options"><summary>Speed, blanks, and what to ask</summary>
          <label class="field">Speed <select id="st-speed">${Object.entries(SPEEDS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label>
          <label class="field">Between frames <select id="st-blank"><option value="grey">Grey card stays (gentler)</option><option value="black">Black screen (as in the paper)</option></select></label>
          <p class="small warn" id="st-warn" hidden>At this speed with black gaps the screen flashes about five times a second. Skip it if flashing bothers you.</p>
          <label class="field">After the stream, ask me for <select id="st-ask"><option value="rating">a rating from −100 to +100</option><option value="frequency">frequency estimates: how many frames of each kind</option><option value="either">either, chosen at random</option></select></label>
        </details>
        <div class="btn-row"><button class="btn primary" id="st-start">Start the stream</button><button class="btn" id="st-skip" hidden>Skip to the end</button><button class="btn" id="st-pause" hidden>Pause</button></div>
      </section>
      <section class="panel stream-stage-panel">
        <h2 id="st-stage-title">2. Watch</h2>
        <div class="stream-stage" id="st-stage" aria-label="The stream"></div>
        <div class="stream-progress"><div class="stream-bar"><span id="st-bar"></span></div><span class="small muted" id="st-count">Not started</span></div>
      </section>
    </div>
    <section class="panel stream-judge" id="st-judge" hidden></section>
    <section class="panel stream-result" id="st-result" hidden aria-live="polite"></section>
    <section class="panel stream-log" id="st-log" hidden></section>`;
  const $ = (id) => root.querySelector(`#${id}`);

  // ---- setup controls ------------------------------------------------------
  const presetSel = $('st-preset');
  presetSel.value = state.presetId;
  $('st-speed').value = state.speed;
  $('st-blank').value = state.blank;
  $('st-ask').value = state.judgement;

  function renderSetup() {
    $('st-custom').hidden = state.presetId !== CUSTOM;
    $('st-which').textContent = state.hidden ? 'Which stream it is stays hidden until you have judged it.' : '';
    $('st-warn').hidden = !(state.speed === 'paper' && state.blank === 'black');
    presetSel.value = state.presetId;
    showIdle();
    saveUrl();
  }
  presetSel.addEventListener('change', () => {
    state.presetId = presetSel.value;
    state.hidden = false;
    renderSetup();
  });
  $('st-custom').addEventListener('input', () => {
    for (const k of ['a', 'b', 'c', 'd']) state.custom[k] = Math.max(0, Math.min(200, Number.parseInt($(`st-cell-${k}`).value, 10) || 0));
    if (Object.values(state.custom).every((v) => v === 0)) state.custom.d = 1;
  });
  $('st-random').addEventListener('click', () => {
    const pick = streams[Math.floor(Math.random() * streams.length)];
    state.presetId = pick.id;
    state.hidden = true;
    state.seed = Math.floor(Math.random() * 1e6) + 1;
    renderSetup();
    start();
  });
  $('st-speed').addEventListener('change', (ev) => {
    state.speed = ev.target.value;
    renderSetup();
  });
  $('st-blank').addEventListener('change', (ev) => {
    state.blank = ev.target.value;
    renderSetup();
  });
  $('st-ask').addEventListener('change', (ev) => {
    state.judgement = ev.target.value;
    saveUrl();
  });
  $('st-start').addEventListener('click', () => start());
  $('st-skip').addEventListener('click', () => finishStream());
  $('st-pause').addEventListener('click', () => {
    state.paused = !state.paused;
    $('st-pause').textContent = state.paused ? 'Resume' : 'Pause';
    if (!state.paused) tick();
  });

  function saveUrl() {
    const out = new URLSearchParams();
    if (!state.hidden && state.presetId !== CUSTOM) out.set('stream', state.presetId);
    if (state.speed !== 'slow') out.set('speed', state.speed);
    if (state.blank !== 'grey') out.set('blank', state.blank);
    if (state.judgement !== 'rating') out.set('ask', state.judgement);
    history.replaceState(null, '', `#${out}`);
  }

  // ---- the stream ----------------------------------------------------------
  function showIdle() {
    if (state.stage !== 'setup') return;
    const cues = cuesOf();
    $('st-stage').innerHTML =
      frameSVG({ cues, reinforced: true, allCues: cues, colorOf, size: 0.8 }) +
      `<p class="small muted stream-legend">A frame can show ${cues.length > 1 ? 'a square, a triangle, both, or neither' : 'the square or not'}, and the circle or not. Watch the whole stream, then judge how strongly the ${cues.length > 1 ? 'shape you are asked about' : 'square'} goes with the circle.</p>`;
    $('st-count').textContent = `${design().totalTrials} frames`;
    $('st-bar').style.width = '0%';
  }

  function start() {
    clearTimeout(state.timer);
    state.frames = streamFrames(designText(), state.seed);
    state.index = -1;
    state.paused = false;
    state.stage = 'playing';
    state.askFor = state.judgement === 'either' ? (makeRng(state.seed).random() < 0.5 ? 'rating' : 'frequency') : state.judgement;
    const cues = cuesOf();
    state.ratedCue = cues.length > 1 ? cues[makeRng(state.seed + 7).int(cues.length)] : cues[0];
    $('st-judge').hidden = true;
    $('st-result').hidden = true;
    $('st-skip').hidden = false;
    $('st-pause').hidden = false;
    $('st-pause').textContent = 'Pause';
    $('st-start').textContent = 'Restart';
    $('st-stage-title').textContent = '2. Watch';
    tick();
  }

  function tick() {
    if (state.stage !== 'playing' || state.paused) return;
    state.index += 1;
    if (state.index >= state.frames.length) return finishStream();
    const f = state.frames[state.index];
    const cues = cuesOf();
    const sp = SPEEDS[state.speed];
    $('st-stage').innerHTML = frameSVG({ cues: f.cues, reinforced: f.reinforced, allCues: cues, colorOf, size: 0.8 });
    $('st-count').textContent = `Frame ${state.index + 1} of ${state.frames.length}`;
    $('st-bar').style.width = `${((state.index + 1) / state.frames.length) * 100}%`;
    state.timer = setTimeout(() => {
      if (state.stage !== 'playing') return;
      $('st-stage').innerHTML = frameSVG({ allCues: cues, colorOf, blank: state.blank === 'black', size: 0.8 });
      state.timer = setTimeout(tick, sp.gap);
    }, sp.frame);
  }

  function finishStream() {
    clearTimeout(state.timer);
    if (!state.frames.length) state.frames = streamFrames(designText(), state.seed);
    state.index = state.frames.length;
    state.stage = 'judge';
    $('st-skip').hidden = true;
    $('st-pause').hidden = true;
    $('st-count').textContent = `All ${state.frames.length} frames shown`;
    $('st-bar').style.width = '100%';
    const cues = cuesOf();
    $('st-stage').innerHTML = frameSVG({ allCues: cues, colorOf, blank: true, size: 0.8 }) + `<p class="small muted stream-legend">The stream has ended.</p>`;
    renderJudge();
  }

  // ---- judgement -----------------------------------------------------------
  function renderJudge() {
    const cues = cuesOf();
    const cue = state.ratedCue;
    const signal = frameSVG({ cues: [cue], reinforced: true, allCues: cues, colorOf, size: 0.4 });
    const shape = cues.indexOf(cue) === 0 ? 'square' : 'triangle';
    let body;
    if (state.askFor === 'rating') {
      body =
        `<p>How strongly did the <strong>${shape}</strong> go with the circle? Drag the slider. −100 means they went strongly against each other (one appeared when the other did not), 0 means no relationship, and +100 means they went strongly together.</p>` +
        `<div class="rating"><span class="small muted">−100</span><input type="range" id="st-rating" min="-100" max="100" step="1" value="0" aria-label="Your rating"><span class="small muted">+100</span><output id="st-rating-out" for="st-rating">0</output></div>` +
        `<div class="btn-row"><button class="btn primary" id="st-submit">Submit my rating</button></div>`;
    } else {
      body =
        `<p>How many frames of each kind did you see? There were ${state.frames.length} frames in all. A guess is fine.</p>` +
        `<div class="freq-inputs">${[
          ['a', [cue], true, `${shape} and circle`],
          ['b', [cue], false, `${shape}, no circle`],
          ['c', [], true, 'circle alone'],
          ['d', [], false, 'nothing'],
        ]
          .map(([k, cs, o, label]) => `<label class="freq-cell">${frameSVG({ cues: cs, reinforced: o, allCues: cues.length > 1 ? [cue] : cues, colorOf, size: 0.25 })}<span class="small">${label}</span><input type="number" id="st-freq-${k}" min="0" max="${state.frames.length}" value="" aria-label="${label}"></label>`)
          .join('')}</div>` +
        `<div class="btn-row"><button class="btn primary" id="st-submit">Submit my estimates</button></div>`;
    }
    $('st-judge').hidden = false;
    $('st-judge').innerHTML = `<h2>3. Judge</h2><div class="judge-signal">${signal}<span class="small muted">Rate this one</span></div>${body}`;
    $('st-judge').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('st-rating')?.addEventListener('input', (ev) => {
      $('st-rating-out').textContent = plus(Number(ev.target.value));
    });
    $('st-submit').addEventListener('click', () => {
      let judgement;
      if (state.askFor === 'rating') judgement = { rating: Number($('st-rating').value) };
      else {
        const est = Object.fromEntries(['a', 'b', 'c', 'd'].map((k) => [k, Math.max(0, Number.parseInt($(`st-freq-${k}`).value, 10) || 0)]));
        judgement = { estimates: est, estimatedDeltaP: deltaP(est) };
      }
      reveal(judgement);
    });
  }

  // ---- reveal --------------------------------------------------------------
  function reveal(judgement) {
    state.stage = 'result';
    $('st-judge').hidden = true;
    const d = design();
    const cue = state.ratedCue;
    const trials = state.frames.map((f) => ({ cues: f.cues, reinforced: f.reinforced }));
    const cells = marginalCellsFor(trials, cue);
    const dp = deltaP(cells);
    const po = pOutcome(cells);
    const preset = current();
    const cues = cuesOf();
    const others = cues.filter((c) => c !== cue);
    const otherCells = Object.fromEntries(others.map((c) => [c, marginalCellsFor(trials, c)]));

    const modelRows = MODELS.map((m) => {
      const run = runModel(m, { design: d, seed: state.seed });
      return { m, v: final(run, cue) };
    });
    const yours =
      judgement.rating !== undefined
        ? `<p><strong>Your rating:</strong> ${plus(judgement.rating)}. <strong>ΔP × 100:</strong> ${pct(dp)}.` +
          (dp !== null && Math.abs(judgement.rating / 100 - dp) < 0.15 ? ' Close.' : dp !== null && judgement.rating / 100 > dp ? ' You rated it higher than ΔP.' : ' You rated it lower than ΔP.') +
          `</p>`
        : `<p><strong>Your estimates</strong> give ΔP = ${judgement.estimatedDeltaP === null ? 'undefined' : fmt(judgement.estimatedDeltaP)}; the stream's ΔP was ${fmt(dp)}.</p>`;
    const where = state.hidden && preset ? `<p class="small">The stream was <strong>${esc(preset.title)}</strong>. ${esc(preset.note)} <span class="muted">${esc(preset.source)}.</span></p>` : preset ? `<p class="small muted">${esc(preset.note)} ${esc(preset.source)}.</p>` : '';
    $('st-result').hidden = false;
    $('st-result').innerHTML =
      `<h2>4. The answer, and the models</h2>${where}` +
      `<div class="result-grid"><div>` +
      `<h3>The ${cues.length > 1 ? `${cues.indexOf(cue) === 0 ? 'square' : 'triangle'} (${cue})` : 'square'} over the ${state.frames.length} frames</h3>` +
      cellsTable(cells, cue, { estimates: judgement.estimates ?? null }) +
      `<p class="small">ΔP = P(outcome | ${cue}) − P(outcome | no ${cue}) = ${cells.a}/${cells.a + cells.b} − ${cells.c}/${cells.c + cells.d} = <strong>${dp === null ? 'undefined' : fmt(dp)}</strong>. The outcome came on ${Math.round(po * 100)}% of frames.</p>` +
      yours +
      others.map((c) => `<p class="small muted">The ${cues.indexOf(c) === 0 ? 'square' : 'triangle'} (${c}) had ΔP = ${fmt(deltaP(otherCells[c]))}.</p>`).join('') +
      `</div><div>` +
      `<h3>What each model made of the same frames</h3>` +
      `<table class="symbol-guide small models-table"><thead><tr><th class="left">Model</th><th>For ${cue}</th><th class="left">What the number is</th></tr></thead><tbody>` +
      modelRows.map(({ m, v }) => `<tr><td><a href="${pageOf(m)}#design=${encodeURIComponent(designText())}&seed=${state.seed}&cue=${cue}">${esc(m.name)}</a>${m.status === 'preview' ? ' <span class="muted">(preview)</span>' : ''}</td><td class="num">${signed(fmt(v))}</td><td class="small muted">${esc(PLOTTED[m.id] ?? '')}</td></tr>`).join('') +
      `</tbody></table>` +
      `<p class="small">Each model saw the frames in the order you did, with the stream as its context. The dashed ΔP line is on the charts. <a href="compare.html#design=${encodeURIComponent(designText())}">Compare them side by side</a>.</p>` +
      `</div></div>` +
      `<div class="btn-row"><button class="btn primary" id="st-again">Another stream</button><button class="btn" id="st-same">Same stream, new order</button></div>`;
    $('st-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('st-again').addEventListener('click', () => {
      state.seed = Math.floor(Math.random() * 1e6) + 1;
      $('st-random').click();
    });
    $('st-same').addEventListener('click', () => {
      state.seed = Math.floor(Math.random() * 1e6) + 1;
      start();
    });

    state.log.push({ n: state.log.length + 1, title: preset?.title ?? 'My own cells', cue, dp, po, rating: judgement.rating ?? null, est: judgement.estimatedDeltaP ?? null, rw: modelRows[0].v });
    renderLog();
  }

  // ---- log of this session -------------------------------------------------
  function renderLog() {
    const log = state.log;
    if (!log.length) return;
    const rated = log.filter((r) => r.rating !== null && r.dp !== null);
    const W = 320;
    const H = 220;
    const m = { l: 50, r: 12, t: 12, b: 34 };
    const x = (dp) => m.l + ((dp + 1) / 2) * (W - m.l - m.r);
    const y = (r) => m.t + (1 - (r + 100) / 200) * (H - m.t - m.b);
    const dots = rated.map((r) => `<circle class="log-dot" cx="${x(r.dp)}" cy="${y(r.rating)}" r="5"><title>Stream ${r.n}: ΔP ${fmt(r.dp)}, rating ${plus(r.rating)}</title></circle>`).join('');
    const scatter = rated.length
      ? `<svg class="log-scatter" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Your ratings against ΔP">` +
        `<line class="mini-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/><line class="mini-grid" x1="${x(0)}" x2="${x(0)}" y1="${m.t}" y2="${H - m.b}"/>` +
        `<line class="mini-ref" x1="${x(-1)}" x2="${x(1)}" y1="${y(-100)}" y2="${y(100)}"/>` +
        `<text class="mini-tick" x="${x(-1)}" y="${H - 14}" text-anchor="middle">−1</text><text class="mini-tick" x="${x(0)}" y="${H - 14}" text-anchor="middle">0</text><text class="mini-tick" x="${x(1)}" y="${H - 14}" text-anchor="middle">+1</text>` +
        `<text class="mini-tick" x="${W - m.r}" y="${H - 2}" text-anchor="end">ΔP of the stream →</text>` +
        `<text class="mini-tick" x="${m.l - 6}" y="${y(100) + 4}" text-anchor="end">+100</text><text class="mini-tick" x="${m.l - 6}" y="${y(0) + 4}" text-anchor="end">0</text><text class="mini-tick" x="${m.l - 6}" y="${y(-100) + 4}" text-anchor="end">−100</text>` +
        dots +
        `</svg><p class="small muted">Your ratings against each stream's ΔP. The dashed line is where a rating of exactly ΔP × 100 would fall.</p>`
      : '';
    $('st-log').hidden = false;
    $('st-log').innerHTML =
      `<h2>Your streams so far</h2><div class="result-grid"><div class="table-scroll"><table class="symbol-guide small"><thead><tr><th>#</th><th class="left">Stream</th><th>Cue</th><th>ΔP</th><th>P(O)</th><th>Your rating</th><th>Your ΔP</th><th>Rescorla-Wagner</th></tr></thead><tbody>` +
      log.map((r) => `<tr><td>${r.n}</td><td class="left">${esc(r.title)}</td><td>${r.cue}</td><td class="num">${r.dp === null ? '–' : fmt(r.dp)}</td><td class="num">${fmt(r.po)}</td><td class="num">${r.rating === null ? '–' : plus(r.rating)}</td><td class="num">${r.est === null ? '–' : fmt(r.est)}</td><td class="num">${signed(fmt(r.rw))}</td></tr>`).join('') +
      `</tbody></table></div><div>${scatter}</div></div>` +
      `<p class="small muted">Nothing is saved: the list is cleared when you leave the page. Two things to look for after a few streams: do your ratings rise with ΔP, and do streams with a common outcome get higher ratings than streams with the same ΔP and a rare one?</p>`;
  }

  renderSetup();
  document.documentElement.setAttribute('data-ready', '');
}
