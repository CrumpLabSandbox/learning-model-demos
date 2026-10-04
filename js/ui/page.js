// A model page. Every model page uses this same layout and wiring, so a
// student who learns one page can read them all. The model-specific parts
// come from the model module and its equation spec.

import { parseDesign, usesRandomOrder } from '../core/design.js';
import { runModel, defaultOptions } from '../core/runner.js';
import { evaluatePhenomenon } from '../core/phenomena.js';
import { encodeState, decodeState } from '../core/url-state.js';
import { fmt, fmtExact, signed } from '../core/format.js';
import {
  esc,
  symbolHTML,
  equationSymbols,
  equationNumbers,
  equationWords,
  symbolsUsed,
  listCues,
} from './equation.js';
import { createChart, cueColor } from './chart.js';
import { renderArithmetic } from './arithmetic.js';
import { createTable, tableCSV } from './table.js';
import { installHighlighting } from './highlight.js';
import { compareSketch, verdict } from '../core/sketch.js';

const READINGS = [
  { key: 'words', label: 'Words' },
  { key: 'symbols', label: 'Symbols' },
  { key: 'numbers', label: 'Numbers' },
  { key: 'code', label: 'Code' },
];
const DEFAULT_READINGS = ['words', 'symbols', 'numbers'];
// Essentials view starts with the gentlest reading; students add more.
const ESSENTIAL_READINGS = ['words'];
const VIEWS = ['essentials', 'everything'];

function storedView() {
  try {
    const v = localStorage.getItem('lmd-view');
    return VIEWS.includes(v) ? v : null;
  } catch {
    return null;
  }
}
const SPEEDS = { slow: 700, medium: 280, fast: 90 };

const DESIGN_HELP = `Pretraining: 20 A+
Compound: 20 AB+, 20 CD+
Test: B, D

One phase per line. "20 AB+" means 20 trials
of cues A and B followed by the outcome.
A- means A with no outcome.
A+(0.5) sets the outcome's size for that trial.
Add ", random" to a line to shuffle it, or
", blocked" to run each trial type in turn.
The default alternates trial types.
"Test:" lists the lines to plot.`;

export function mountModelPage({
  root,
  model,
  spec,
  phenomena,
  modelSourceUrl,
  defaultPreset,
  primerUrl = '../primer.html',
  overviewUrl = null,
  glossaryUrl = '../glossary.html',
}) {
  const state = {
    presetId: defaultPreset,
    designText: '',
    design: null,
    designError: '',
    params: {},
    options: defaultOptions(model),
    seed: 1,
    t: 0,
    revealed: 0,
    focusCue: null,
    readings: [...DEFAULT_READINGS],
    stage: null,
    playing: false,
    speed: 'medium',
    run: null,
    // Predict first: null, or { sketching, cues, activeCue, sketches, prompt, history }
    predict: null,
    view: 'everything',
  };
  let codeText = null;
  let playTimer = null;

  root.innerHTML = layout(model, spec, { primerUrl, overviewUrl, glossaryUrl });
  const $ = (id) => root.querySelector(`#${id}`);
  installHighlighting(root);

  const chart = createChart($('chart'), {
    onSelect: (t) => select(t),
    onSketch: (t, v, { start }) => addSketchPoint(t, v, start),
    onSketchEnd: () => renderPredictBar(),
  });
  const table = createTable($('table'), { onSelect: (t) => select(t, { scrollTable: false }) });

  // ---- Design -------------------------------------------------------------
  const presetSel = $('preset');
  presetSel.innerHTML =
    phenomena.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('') +
    '<option value="">Custom design</option>';
  presetSel.addEventListener('change', () => {
    if (presetSel.value) loadPreset(presetSel.value);
    else {
      state.presetId = null;
      renderCards();
      saveUrl();
    }
  });
  let designTimer = null;
  $('design-text').addEventListener('input', (ev) => {
    clearTimeout(designTimer);
    designTimer = setTimeout(() => {
      state.presetId = matchingPreset(ev.target.value);
      presetSel.value = state.presetId ?? '';
      setDesign(ev.target.value);
    }, 250);
  });
  $('reshuffle').addEventListener('click', () => {
    state.seed += 1;
    recompute();
    renderAll();
  });

  function matchingPreset(text) {
    const p = phenomena.find((x) => x.design.trim() === text.trim());
    return p ? p.id : null;
  }

  function loadPreset(id, { keepFocus = false } = {}) {
    const p = phenomena.find((x) => x.id === id);
    if (!p) return;
    state.presetId = id;
    state.seed = 1;
    for (const k of Object.keys(state.params)) if (k.startsWith('alpha_')) delete state.params[k];
    Object.assign(state.params, p.params ?? {});
    $('design-text').value = p.design;
    presetSel.value = id;
    setDesign(p.design, { render: false });
    if (!keepFocus && state.run) {
      const f = p.focus ?? {};
      const n = state.run.trials.length;
      state.t = f.phase !== undefined ? state.run.phases[f.phase].start : Math.min(n, f.t ?? n);
      state.revealed = n;
      state.focusCue = f.cue ?? state.run.trials[Math.max(0, state.t - 1)]?.present[0] ?? state.run.cues[0];
    }
    renderAll();
  }

  function setDesign(text, { render = true } = {}) {
    state.designText = text;
    state.predict = null;
    try {
      state.design = parseDesign(text);
      state.designError = '';
    } catch (e) {
      state.designError = e.message;
    }
    $('design-error').textContent = state.designError;
    if (!state.designError) {
      recompute();
      const n = state.run.trials.length;
      state.t = Math.min(state.t, n);
      state.revealed = n;
      if (!state.run.cues.includes(state.focusCue)) state.focusCue = state.run.cues[0];
    }
    if (render) renderAll();
  }

  function recompute() {
    state.run = runModel(model, {
      design: state.design,
      params: state.params,
      options: state.options,
      seed: state.seed,
    });
  }

  // ---- Parameters and options --------------------------------------------
  function renderSliders() {
    const ps = model.parameters(state.run.cues, state.options);
    const groups = [
      { role: 'modeller', title: 'Set by the modeller' },
      { role: 'experimenter', title: 'Set by the experimenter' },
    ];
    const html = groups
      .map((g) => {
        const items = ps
          .filter((p) => p.role === g.role && (p.active || !p.variant))
          .map((p) => {
            const v = state.run.params[p.key];
            const sym = p.variant === 'minus' ? symbolHTML(spec, p.sym, p.cue, '<sup>−</sup>') : symbolHTML(spec, p.sym, p.cue);
            const note = p.active ? '' : `<span class="note">Not in the equation right now. See Assumptions.</span>`;
            return (
              `<div class="slider role-${p.role}${p.active ? '' : ' inactive'}" data-sym="${p.sym}"${p.cue ? ` data-cue="${p.cue}"` : ''}>` +
              `<label class="slider-label" for="p-${p.key}">${sym} ${esc(p.label)}</label>` +
              `<output id="o-${p.key}" for="p-${p.key}">${fmtExact(v)}</output>` +
              `<input type="range" id="p-${p.key}" data-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}"${p.active ? '' : ' disabled'}>` +
              `${note}</div>`
            );
          })
          .join('');
        return items ? `<div class="slider-group-title">${g.title}</div>${items}` : '';
      })
      .join('');
    $('sliders').innerHTML = html;
  }
  $('sliders').addEventListener('input', (ev) => {
    const key = ev.target.dataset.key;
    if (!key) return;
    const v = Number(ev.target.value);
    state.params[key] = v;
    $(`o-${key}`).textContent = fmtExact(v);
    recompute();
    renderRunViews();
  });
  $('reset-params').addEventListener('click', () => {
    const p = phenomena.find((x) => x.id === state.presetId);
    state.params = { ...(p?.params ?? {}) };
    recompute();
    renderAll();
  });

  function renderToggles() {
    $('toggles').innerHTML = model.options
      .map(
        (o) =>
          `<label class="toggle"><input type="checkbox" data-opt="${o.key}"${state.options[o.key] ? ' checked' : ''}>` +
          `<span>${esc(o.label)}</span><span class="toggle-help">${subscripts(o.help)}</span></label>`,
      )
      .join('');
  }
  $('toggles').addEventListener('change', (ev) => {
    const key = ev.target.dataset.opt;
    if (!key) return;
    state.options[key] = ev.target.checked;
    state.stage = null;
    recompute();
    renderAll();
  });

  // ---- Build the equation -------------------------------------------------
  function setStage(i) {
    state.stage = i;
    if (i === null) Object.assign(state.options, defaultOptions(model));
    else Object.assign(state.options, spec.stages[i].options);
    recompute();
    renderAll();
    if (i !== null) {
      for (const k of spec.stages[i].added) {
        for (const el of root.querySelectorAll(`#eq-list [data-sym="${k}"], #build [data-sym="${k}"]`)) el.classList.add('new-term');
      }
    }
  }

  function shownSet(options) {
    return new Set(
      phenomena
        .filter((p) => {
          try {
            return evaluatePhenomenon(model, p, { params: state.params, options }).shown;
          } catch {
            return false;
          }
        })
        .map((p) => p.id),
    );
  }

  function renderBuild() {
    const el = $('build');
    if (state.stage === null) {
      el.innerHTML =
        `<p class="small">Put the equation together one term at a time and see which phenomena each term makes possible.</p>` +
        `<button class="btn primary" data-act="start">Start with the simplest version</button>`;
      return;
    }
    const i = state.stage;
    const st = spec.stages[i];
    const opts = { ...defaultOptions(model), ...st.options };
    const eq = spec.equations(opts).find((e) => e.id === 'update');
    const cue = state.focusCue ?? state.run.cues[0];
    const now = shownSet(opts);
    const before = i > 0 ? shownSet({ ...defaultOptions(model), ...spec.stages[i - 1].options }) : new Set();
    const items = phenomena
      .map((p) => {
        const yes = now.has(p.id);
        const isNew = yes && !before.has(p.id);
        return `<li class="${isNew ? 'new' : ''}">${yes ? '✓' : '✗'} ${esc(p.title)}${isNew ? ' <span class="muted">(new)</span>' : ''}</li>`;
      })
      .join('');
    el.innerHTML =
      `<div class="build-stage"><div class="small muted">Stage ${i + 1} of ${spec.stages.length}</div>` +
      `<h3>${esc(st.title)}</h3>` +
      `<div class="build-math">${equationSymbols(eq, { spec, cue, present: [cue], rec: null })}</div>` +
      `<p class="small">${esc(st.text)}</p>` +
      `<div class="small"><strong>What this version produces</strong></div><ul class="unlocks">${items}</ul>` +
      `<div class="btn-row" style="margin-top:.6rem">` +
      `<button class="btn" data-act="prev"${i === 0 ? ' disabled' : ''}>Back</button>` +
      (i < spec.stages.length - 1
        ? `<button class="btn primary" data-act="next">Add the next term</button>`
        : `<button class="btn primary" data-act="done">Done</button>`) +
      `<button class="btn" data-act="exit">Exit</button></div></div>`;
  }
  $('build').addEventListener('click', (ev) => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'start') setStage(0);
    else if (act === 'prev') setStage(Math.max(0, state.stage - 1));
    else if (act === 'next') setStage(state.stage + 1);
    else if (act === 'done' || act === 'exit') setStage(null);
  });

  // ---- Predict first ------------------------------------------------------
  function startPredict(cues, prompt) {
    stop();
    const run = state.run;
    const valid = cues.filter((c) => run.series[c]);
    if (!valid.length) return;
    state.predict = {
      sketching: true,
      cues: valid,
      activeCue: valid[0],
      sketches: Object.fromEntries(valid.map((c) => [c, { 0: run.series[c][0] }])),
      prompt: prompt ?? `Sketch how you think ${listCues(valid)} will change, then reveal the model.`,
      history: [],
    };
    renderPredict();
  }

  function addSketchPoint(t, v, start) {
    const pr = state.predict;
    if (!pr?.sketching) return;
    const sk = pr.sketches[pr.activeCue];
    if (start) pr.history.push({ cue: pr.activeCue, sketch: { ...sk } });
    // A drag fills in every trial it passes, so fast strokes leave no gaps.
    const prevT = pr.lastT;
    if (!start && prevT !== undefined && Math.abs(t - prevT) > 1) {
      const prevV = sk[prevT];
      const dir = t > prevT ? 1 : -1;
      for (let k = prevT + dir; k !== t; k += dir) sk[k] = prevV + ((v - prevV) * (k - prevT)) / (t - prevT);
    }
    sk[t] = v;
    pr.lastT = t;
    chart.update({ run: state.run, t: state.t, revealed: state.revealed, predict: pr });
  }

  function revealPrediction() {
    const pr = state.predict;
    pr.sketching = false;
    state.revealed = state.run.trials.length;
    renderPredict();
  }

  function renderPredict() {
    root.classList.toggle('predicting', Boolean(state.predict?.sketching));
    renderPredictBar();
    renderTrialViews();
    renderCards();
  }

  function renderPredictBar() {
    const bar = $('predict-bar');
    const fb = $('predict-feedback');
    const pr = state.predict;
    $('stepper').hidden = Boolean(pr?.sketching);
    $('predict-start').hidden = Boolean(pr?.sketching);
    if (!pr) {
      bar.hidden = true;
      fb.hidden = true;
      return;
    }
    const n = state.run.trials.length;
    if (pr.sketching) {
      fb.hidden = true;
      bar.hidden = false;
      const status = pr.cues
        .map((c) => {
          const ts = Object.keys(pr.sketches[c]).map(Number);
          const end = Math.max(...ts);
          return end >= n ? `${c}: done` : `${c}: drawn to trial ${end} of ${n}`;
        })
        .join(' · ');
      bar.innerHTML =
        `<p class="predict-prompt"><strong>Predict first.</strong> ${esc(pr.prompt)}</p>` +
        `<div class="btn-row"><span class="small muted">Drawing</span>` +
        pr.cues
          .map((c) => `<button class="btn" data-sketch-cue="${c}" aria-pressed="${c === pr.activeCue}"><span class="swatch" style="background:${c.length === 1 ? cueColor(state.run, c) : 'var(--ink-2)'}"></span>${c}</button>`)
          .join('') +
        `<button class="btn" data-pact="undo"${pr.history.length ? '' : ' disabled'}>Undo</button>` +
        `<button class="btn" data-pact="clear">Clear ${pr.activeCue}</button>` +
        `<button class="btn primary" data-pact="reveal">Reveal the model</button>` +
        `<button class="btn" data-pact="skip">Skip</button></div>` +
        `<p class="small muted predict-status">${status}. Every line starts where the model starts, at trial 0. Click to place points or drag to draw.</p>`;
      return;
    }
    bar.hidden = true;
    fb.hidden = false;
    const lambda = state.run.params.lambda ?? 1;
    let worst = null;
    const rows = pr.cues
      .map((c) => {
        const cmp = compareSketch(pr.sketches[c], state.run.series[c], state.run.phases);
        if (cmp.worst && (!worst || cmp.worst.diff > worst.diff)) worst = { ...cmp.worst, cue: c };
        const ends = cmp.phaseEnds
          .map((e) => `<li>End of ${esc(e.phase)}: you ${e.sketch === null ? '–' : signed(fmt(e.sketch))}, model ${signed(fmt(e.model))}</li>`)
          .join('');
        return (
          `<div class="fb-cue"><div><span class="swatch" style="background:${c.length === 1 ? cueColor(state.run, c) : 'var(--ink-2)'}"></span> <strong>${c}</strong>: ${esc(verdict(cmp.meanAbs, lambda))}</div>` +
          `<ul class="small">${ends}</ul>` +
          (cmp.complete ? '' : `<p class="small muted">Your line stopped before the last trial, so only the part you drew is compared.</p>`) +
          `</div>`
        );
      })
      .join('');
    fb.innerHTML =
      `<div class="fb-head"><strong>Your prediction and the model.</strong> Your sketch is the dashed line.</div>` +
      `<div class="fb-grid">${rows}</div>` +
      `<div class="btn-row">` +
      (worst
        ? `<button class="btn primary" data-pact="worst" data-t="${worst.t}" data-cue="${worst.cue}">Go to trial ${worst.t}, where ${worst.cue} differed most</button>`
        : '') +
      `<button class="btn" data-pact="again">Sketch again</button><button class="btn" data-pact="hide">Hide my sketch</button></div>` +
      `<p class="small muted">Where your line and the model's part ways, the equations below show why. Step to that trial and read the error term.</p>`;
  }

  $('chart-panel').addEventListener('click', (ev) => {
    const cueBtn = ev.target.closest('[data-sketch-cue]');
    if (cueBtn && state.predict) {
      state.predict.activeCue = cueBtn.dataset.sketchCue;
      state.predict.lastT = undefined;
      renderPredictBar();
      chart.update({ run: state.run, t: state.t, revealed: state.revealed, predict: state.predict });
      return;
    }
    const btn = ev.target.closest('[data-pact]');
    if (!btn) return;
    const pr = state.predict;
    const act = btn.dataset.pact;
    if (act === 'start') {
      const preset = phenomena.find((p) => p.id === state.presetId);
      if (preset?.predict && preset.design.trim() === state.designText.trim()) startPredict(preset.predict.cues, preset.predict.prompt);
      else startPredict(state.run.displayProbes);
      return;
    }
    if (!pr) return;
    if (act === 'undo') {
      const h = pr.history.pop();
      if (h) pr.sketches[h.cue] = h.sketch;
    } else if (act === 'clear') {
      pr.history.push({ cue: pr.activeCue, sketch: { ...pr.sketches[pr.activeCue] } });
      pr.sketches[pr.activeCue] = { 0: state.run.series[pr.activeCue][0] };
    } else if (act === 'reveal') return revealPrediction();
    else if (act === 'skip' || act === 'hide') {
      state.predict = null;
      return renderPredict();
    } else if (act === 'again') return startPredict(pr.cues, pr.prompt);
    else if (act === 'worst') {
      const c = btn.dataset.cue;
      if (c.length === 1) state.focusCue = c;
      else state.focusCue = [...c][0];
      select(Number(btn.dataset.t));
      $('eq-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    pr.lastT = undefined;
    renderPredictBar();
    chart.update({ run: state.run, t: state.t, revealed: state.revealed, predict: pr });
  });

  // ---- Stepping -----------------------------------------------------------
  function select(t, { scrollTable = true } = {}) {
    const n = state.run.trials.length;
    state.t = Math.max(0, Math.min(n, t));
    state.revealed = Math.max(state.revealed, state.t);
    renderTrialViews({ scrollTable });
  }
  function stop() {
    state.playing = false;
    clearInterval(playTimer);
    playTimer = null;
    renderStepper();
  }
  function play() {
    const n = state.run.trials.length;
    if (state.t >= n) {
      state.t = 0;
      state.revealed = 0;
    }
    state.playing = true;
    renderStepper();
    playTimer = setInterval(() => {
      if (state.t >= state.run.trials.length) return stop();
      select(state.t + 1);
    }, SPEEDS[state.speed]);
  }
  $('stepper').addEventListener('click', (ev) => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    const n = state.run.trials.length;
    if (act !== 'play') stop();
    if (act === 'reset') {
      state.t = 0;
      state.revealed = 0;
      renderTrialViews();
    } else if (act === 'back') select(state.t - 1);
    else if (act === 'fwd') select(state.t + 1);
    else if (act === 'all') {
      state.revealed = n;
      select(n);
    } else if (act === 'play') state.playing ? stop() : play();
  });
  $('scrub').addEventListener('input', (ev) => {
    stop();
    select(Number(ev.target.value));
  });
  $('speed').addEventListener('change', (ev) => {
    state.speed = ev.target.value;
    if (state.playing) {
      stop();
      play();
    }
  });
  function renderStepper() {
    const n = state.run.trials.length;
    const scrub = $('scrub');
    scrub.max = String(n);
    scrub.value = String(state.t);
    $('trial-label').textContent = `Trial ${state.t} of ${n}`;
    const playBtn = root.querySelector('[data-act="play"]');
    playBtn.textContent = state.playing ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', String(state.playing));
  }

  // ---- Equations ----------------------------------------------------------
  root.querySelector('.readings').addEventListener('click', (ev) => {
    const key = ev.target.closest('[data-reading]')?.dataset.reading;
    if (!key) return;
    const has = state.readings.includes(key);
    if (has && state.readings.length === 1) return;
    state.readings = has ? state.readings.filter((r) => r !== key) : READINGS.map((r) => r.key).filter((r) => r === key || state.readings.includes(r));
    renderEquations();
    saveUrl();
  });
  $('cue-chips').addEventListener('click', (ev) => {
    const cue = ev.target.closest('[data-focus]')?.dataset.focus;
    if (!cue) return;
    state.focusCue = cue;
    renderEquations();
    renderArith();
    saveUrl();
  });

  function currentRecord() {
    return state.t > 0 ? state.run.trials[state.t - 1] : null;
  }

  function renderEquations() {
    for (const b of root.querySelectorAll('[data-reading]')) b.setAttribute('aria-pressed', String(state.readings.includes(b.dataset.reading)));
    const rec = currentRecord();
    const cue = state.focusCue;
    const run = state.run;
    $('eq-context').textContent = rec ? `trial ${rec.index}, ${rec.phaseName}, ${rec.label}` : 'before training';
    $('cue-chips').innerHTML =
      `<span class="muted">Show the update for</span>` +
      run.cues
        .map((c) => {
          const present = rec?.present.includes(c);
          return `<button class="btn cue-chip" data-focus="${c}" data-cue="${c}" aria-pressed="${c === cue}"><span class="swatch" style="background:${cueColor(run, c)}"></span>${c}${rec && !present ? ' <span class="muted small">absent</span>' : ''}</button>`;
        })
        .join('');

    const eqs = spec.equations(state.options);
    const list = $('eq-list');
    if (!rec) {
      list.innerHTML = `<p class="notice">Before training, every strength V starts at 0. Press <strong>Step</strong> or click the chart to see the first trial worked through.</p>`;
    } else if (!rec.present.includes(cue)) {
      list.innerHTML = `<p class="notice">${spec.absentNote(cue, rec)}</p>`;
    } else {
      const ctx = { spec, rec, cue, present: rec.present };
      list.innerHTML = eqs
        .map((eq, i) => {
          const rows = [];
          if (state.readings.includes('words')) rows.push(reading('Words', `<div class="words">${equationWords(eq, ctx)}</div>`, 'words'));
          if (state.readings.includes('symbols')) rows.push(reading('Symbols', equationSymbols(eq, ctx), 'symbols'));
          if (state.readings.includes('numbers')) rows.push(reading(`Trial ${rec.index}`, equationNumbers(eq, ctx), 'numbers'));
          return `<div class="eq-card"><h3><span class="step-no">${i + 1}</span>${esc(eq.title)}</h3>${rows.join('')}</div>`;
        })
        .join('');
    }
    renderCode();
    renderGuide(eqs, rec, cue);
  }

  function reading(name, body, cls) {
    return `<div class="reading ${cls}"><div class="reading-name">${name}</div><div>${body}</div></div>`;
  }

  async function renderCode() {
    const el = $('code');
    if (!state.readings.includes('code')) {
      el.innerHTML = '';
      return;
    }
    if (codeText === null) {
      el.innerHTML = '<p class="muted small">Loading the code…</p>';
      try {
        const src = await (await fetch(modelSourceUrl)).text();
        const m = /\/\/ #region update\n([\s\S]*?)\n\s*\/\/ #endregion/.exec(src);
        const lines = (m ? m[1] : src).split('\n');
        const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
        codeText = lines.map((l) => l.slice(indent)).join('\n');
      } catch {
        codeText = '// The code could not be loaded. Open the model file to read it.';
      }
      if (!state.readings.includes('code')) return;
    }
    const ids = Object.entries(spec.codeNames);
    const html = codeText
      .split('\n')
      .map((line) => {
        const i = line.indexOf('//');
        const code = i >= 0 ? line.slice(0, i) : line;
        const cmt = i >= 0 ? line.slice(i) : '';
        let h = esc(code);
        for (const [sym, name] of ids) {
          const role = spec.symbols[sym].role;
          h = h.replace(new RegExp(`\\b${name}\\b(?![^<]*>)`, 'g'), `<span class="sym role-${role}" data-sym="${sym}">${name}</span>`);
        }
        return h + (cmt ? `<span class="cmt">${esc(cmt)}</span>` : '');
      })
      .join('\n');
    el.innerHTML =
      `<div class="reading code"><div class="reading-name">Code</div><div><p class="small muted">The JavaScript that ran this trial, from <a href="${modelSourceUrl}">${esc(modelSourceUrl.split('/').pop())}</a>.</p>` +
      `<pre class="code"><code>${html}</code></pre></div></div>`;
  }

  function renderGuide(eqs, rec, cue) {
    const used = symbolsUsed(eqs);
    const rows = used
      .map((key) => {
        const def = spec.symbols[key];
        const symbol = def.render ? symbolHTML(spec, key, cue) : `<span class="sym role-${def.role}" data-sym="${key}">${esc(errorText(eqs))}</span>`;
        let value = '–';
        if (rec && rec.present.includes(cue)) {
          const v = def.value(rec, cue);
          if (v !== undefined) value = signed(def.exact ? fmtExact(v) : fmt(v));
        }
        return (
          `<tr data-sym="${key}"${def.render?.sub === 'cue' ? ` data-cue="${cue}"` : ''}><td class="sym-cell">${symbol}</td>` +
          `<td><strong>${esc(def.name)}</strong>. ${esc(def.meaning(cue))}` +
          (def.primer ? ` <a class="small" href="${primerUrl}#${def.primer}">How to read ${def.render ? 'this' : 'it'}</a>` : '') +
          `</td>` +
          `<td><span class="role-badge role-${def.role}">${spec.roles[def.role].short}</span></td>` +
          `<td class="where small muted">${esc(def.where)}</td>` +
          `<td class="value">${value}</td></tr>`
        );
      })
      .join('');
    $('guide').innerHTML =
      `<thead><tr><th>Symbol</th><th>Meaning</th><th>Who sets it</th><th class="where">Where to see it</th><th>${rec ? `Trial ${rec.index}` : 'Value'}</th></tr></thead><tbody>${rows}</tbody>`;
  }

  function errorText(eqs) {
    return state.options.summedError === false ? `λ − V` : 'λ − ΣV';
  }

  function renderArith() {
    const rec = currentRecord();
    renderArithmetic($('arith'), {
      width: $('arith').clientWidth,
      spec,
      arith: spec.arithmetic(state.options),
      rec,
      cue: state.focusCue,
      present: rec?.present ?? [],
      run: state.run,
    });
  }

  // ---- Essentials or everything -------------------------------------------
  function setView(view, { remember = true } = {}) {
    state.view = VIEWS.includes(view) ? view : 'everything';
    root.classList.toggle('view-essentials', state.view === 'essentials');
    for (const b of root.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === state.view));
    root.querySelector('.view-help').textContent =
      state.view === 'essentials'
        ? 'Showing the main parts. Everything adds the trial table, the code, and custom designs.'
        : 'Showing everything. Essentials hides the advanced parts.';
    if (remember) {
      try {
        localStorage.setItem('lmd-view', state.view);
      } catch {
        // Storage can be blocked; the view still works for this visit.
      }
    }
  }
  root.querySelector('.view-switch').addEventListener('click', (ev) => {
    const v = ev.target.closest('[data-view]')?.dataset.view;
    if (!v) return;
    setView(v);
    if (v === 'essentials' && state.readings.includes('code')) state.readings = state.readings.filter((r) => r !== 'code');
    renderEquations();
    saveUrl();
  });

  // ---- Phenomenon cards ---------------------------------------------------
  function renderCards() {
    const html = phenomena
      .map((p) => {
        let res;
        try {
          res = evaluatePhenomenon(model, p, { params: state.params, options: state.options });
        } catch (e) {
          res = { shown: false, measure: e.message };
        }
        const m = p.models[model.id] ?? {};
        const badge = res.shown
          ? `<span class="badge yes" title="${esc(model.name)} shows this effect">✓ Shows it</span>`
          : `<span class="badge no" title="${esc(model.name)} does not show this effect">✗ Does not</span>`;
        const fixed = p.params
          ? `<p class="small muted">This design sets ${Object.entries(p.params)
              .map(([k, v]) => `${k.replace('alpha_', 'α for ')} = ${v}`)
              .join(', ')}.</p>`
          : '';
        const hide = state.predict?.sketching && p.id === state.presetId;
        if (hide) {
          return (
            `<article class="card active"><h3>${esc(p.title)}</h3><div class="design-text">${esc(p.design)}</div>` +
            `<p class="small muted">The result and the explanation are hidden until you reveal the model.</p></article>`
          );
        }
        return (
          `<article class="card${p.id === state.presetId ? ' active' : ''}">` +
          `<h3>${esc(p.title)} ${badge}</h3>` +
          `<div class="design-text">${esc(p.design)}</div>` +
          `<p><span class="label">What happens:</span> ${esc(p.empirical)} <span class="muted">${esc(p.citation)}</span></p>` +
          `<p><span class="label">Counts as shown when:</span> ${esc(p.criterion)} <span class="muted">${esc(res.measure)}</span></p>` +
          (m.why ? `<p><span class="label">Why:</span> ${subscripts(m.why)}</p>` : '') +
          (m.tryThis ? `<p><span class="label">Try this:</span> ${subscripts(m.tryThis)}</p>` : '') +
          fixed +
          `<div class="btn-row"><button class="btn primary" data-load="${p.id}" data-predict="1">Predict, then run</button>` +
          `<button class="btn" data-load="${p.id}">${p.id === state.presetId ? 'Loaded' : 'Just load it'}</button></div>` +
          `</article>`
        );
      })
      .join('');
    $('cards').innerHTML = html;
  }
  $('cards').addEventListener('click', (ev) => {
    const id = ev.target.closest('[data-load]')?.dataset.load;
    if (!id) return;
    loadPreset(id);
    const p = phenomena.find((x) => x.id === id);
    if (ev.target.closest('[data-load]').dataset.predict === '1' && p.predict) startPredict(p.predict.cues, p.predict.prompt);
    root.querySelector('#chart-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---- Table, CSV, share --------------------------------------------------
  $('csv').addEventListener('click', () => {
    const blob = new Blob([tableCSV({ spec, run: state.run, opts: state.options })], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${model.id}-${state.presetId ?? 'design'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('share').addEventListener('click', async () => {
    saveUrl();
    const btn = $('share');
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Link copied';
    } catch {
      btn.textContent = 'Copy the address bar';
    }
    setTimeout(() => (btn.textContent = 'Copy link'), 1800);
  });

  // ---- URL state ----------------------------------------------------------
  let urlTimer = null;
  function saveUrl() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const preset = phenomena.find((p) => p.id === state.presetId);
      const defaults = model.parameters(state.run.cues, state.options);
      const params = {};
      for (const p of defaults) {
        const v = state.run.params[p.key];
        const base = preset?.params?.[p.key] ?? p.default;
        if (v !== base) params[p.key] = v;
      }
      const options = {};
      if (state.stage === null) {
        const d = defaultOptions(model);
        for (const k of Object.keys(d)) if (state.options[k] !== d[k]) options[k] = state.options[k];
      }
      const s = {
        preset: state.presetId ?? undefined,
        design: preset && preset.design.trim() === state.designText.trim() ? undefined : state.designText,
        params,
        options,
        seed: state.seed,
        t: state.t,
        cue: state.focusCue,
        readings: state.readings.join() === (state.view === 'essentials' ? ESSENTIAL_READINGS : DEFAULT_READINGS).join() ? undefined : state.readings,
        stage: state.stage,
        view: state.view === 'essentials' ? 'essentials' : undefined,
      };
      history.replaceState(null, '', `#${encodeState(s)}`);
    }, 200);
  }

  // ---- Render groups ------------------------------------------------------
  function renderTrialViews({ scrollTable = true } = {}) {
    chart.update({ run: state.run, t: state.t, revealed: state.revealed, predict: state.predict });
    renderStepper();
    renderEquations();
    renderArith();
    table.select(state.t, { scroll: scrollTable });
    saveUrl();
  }

  function renderRunViews() {
    table.build({ spec, run: state.run, opts: state.options });
    renderTrialViews();
    scheduleCards();
  }

  let cardsFrame = null;
  function scheduleCards() {
    cancelAnimationFrame(cardsFrame);
    cardsFrame = requestAnimationFrame(() => {
      renderCards();
      if (state.stage !== null) renderBuild();
    });
  }

  function renderAll() {
    $('reshuffle').hidden = !(state.design && usesRandomOrder(state.design));
    root.classList.toggle('predicting', Boolean(state.predict?.sketching));
    renderPredictBar();
    renderSliders();
    renderToggles();
    renderBuild();
    renderRunViews();
  }

  // ---- Start --------------------------------------------------------------
  const initial = decodeState(location.hash);
  setView(initial.view ?? storedView() ?? 'everything', { remember: Boolean(initial.view) });
  if (state.view === 'essentials') state.readings = [...ESSENTIAL_READINGS];
  loadPreset(initial.preset && phenomena.some((p) => p.id === initial.preset) ? initial.preset : defaultPreset, {});
  let changed = false;
  if (initial.design !== undefined) {
    $('design-text').value = initial.design;
    state.presetId = initial.preset ?? null;
    presetSel.value = state.presetId ?? '';
    setDesign(initial.design, { render: false });
    changed = true;
  }
  if (initial.params) {
    Object.assign(state.params, initial.params);
    changed = true;
  }
  if (initial.options) {
    Object.assign(state.options, initial.options);
    changed = true;
  }
  if (initial.seed) {
    state.seed = initial.seed;
    changed = true;
  }
  if (initial.stage !== undefined && spec.stages[initial.stage]) {
    state.stage = initial.stage;
    Object.assign(state.options, spec.stages[initial.stage].options);
    changed = true;
  }
  if (changed && !state.designError) recompute();
  if (state.run) {
    const n = state.run.trials.length;
    state.revealed = n;
    if (initial.t !== undefined) state.t = Math.max(0, Math.min(n, initial.t));
    if (initial.cue && state.run.cues.includes(initial.cue)) state.focusCue = initial.cue;
  }
  if (initial.readings) {
    const valid = initial.readings.filter((r) => READINGS.some((x) => x.key === r));
    if (valid.length) state.readings = valid;
  }
  renderAll();

  return { state };
}

// Escape text and turn V_A into V<sub>A</sub>.
function subscripts(text) {
  return esc(text).replace(/([A-Za-z\u0391-\u03c9]+)_([A-Z])/g, '$1<sub>$2</sub>');
}

function layout(model, spec, { primerUrl, overviewUrl, glossaryUrl }) {
  return `
<div class="page-intro">
  <h1>${esc(model.name)} <span class="muted">(${model.year})</span></h1>
  <div class="entry-row">
    <div class="view-switch" role="group" aria-label="How much to show">
      <button class="btn" data-view="essentials" aria-pressed="false">Essentials</button>
      <button class="btn" data-view="everything" aria-pressed="false">Everything</button>
    </div>
    <span class="small muted view-help"></span>
    <span class="entry-links small">
      ${overviewUrl ? `<a href="${overviewUrl}">Overview slides</a>` : ''}
      <a href="${primerUrl}">Reading the equations</a>
      <a href="${glossaryUrl}">Glossary</a>
    </span>
  </div>
  ${spec.intro}
  <details class="howto">
    <summary>New here? How to use this page</summary>
    <ol>
      <li><strong>Pick an experiment</strong> in the Design box, or press <em>Predict, then run</em> on any card at the bottom. Predicting first is the best way to learn: sketch what you expect before you see the model.</li>
      <li><strong>Step through the trials</strong> with the Step button or by clicking the chart. Each trial is one row of the trial table.</li>
      <li><strong>Read the equations</strong> for the trial you picked. Each one is shown in words, in symbols, and with that trial's numbers. Pick the cue you want to follow.</li>
      <li><strong>Hover anything</strong> to see where else it appears: a symbol lights up its slider, its chart line, and its table column.</li>
      <li><strong>Change one thing</strong>: a slider, or one of the assumptions. Watch which phenomenon badges flip.</li>
    </ol>
    <p>Not sure what Δ, Σ, or the Greek letters mean? Start with <a href="${primerUrl}">Reading the equations</a>.</p>
  </details>
</div>
<div class="layout">
  <aside class="sidebar" aria-label="Design and parameters">
    <section class="panel">
      <h2>Design</h2>
      <label class="field">Phenomenon <select id="preset"></select></label>
      <label class="field advanced">Trials <textarea id="design-text" spellcheck="false" autocomplete="off" aria-describedby="design-error"></textarea></label>
      <div class="error-msg" id="design-error" role="alert"></div>
      <div class="btn-row advanced"><button class="btn" id="reshuffle" hidden>Shuffle again</button></div>
      <p class="small muted essentials-only">Pick an experiment above. Switch to <em>Everything</em> to write your own.</p>
      <details class="help advanced"><summary>How to write a design</summary><pre>${esc(DESIGN_HELP)}</pre></details>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Parameters</h2><button class="btn" id="reset-params">Reset</button></div>
      <div id="sliders"></div>
    </section>
    <section class="panel">
      <h2>Assumptions</h2>
      <p class="small muted">Switch off one part of the model while everything else stays the same.</p>
      <div id="toggles"></div>
    </section>
    <section class="panel">
      <h2>Build the equation</h2>
      <div id="build"></div>
    </section>
  </aside>
  <div class="main">
    <section class="panel" id="chart-panel">
      <div class="panel-head"><h2>Predictions</h2><div class="btn-row"><button class="btn" id="predict-start" data-pact="start">Sketch a prediction first</button><button class="btn" id="share">Copy link</button></div></div>
      <div class="predict-bar" id="predict-bar" hidden></div>
      <div class="stepper" id="stepper">
        <button class="btn" data-act="reset" aria-label="Go to the start">⏮</button>
        <button class="btn" data-act="back" aria-label="Step back one trial">◀</button>
        <button class="btn" data-act="play" aria-pressed="false">Play</button>
        <button class="btn" data-act="fwd" aria-label="Step forward one trial">Step ▶</button>
        <button class="btn" data-act="all" aria-label="Run all trials">⏭</button>
        <input type="range" id="scrub" min="0" max="0" value="0" aria-label="Select trial">
        <span class="trial-label" id="trial-label"></span>
        <label class="small">Speed <select id="speed"><option value="slow">slow</option><option value="medium" selected>medium</option><option value="fast">fast</option></select></label>
      </div>
      <div id="chart"></div>
      <div class="predict-feedback" id="predict-feedback" hidden></div>
    </section>
    <div class="spoiler-cover panel">The equations, arithmetic, and trial table are hidden while you sketch, so they do not give the answer away. Press <strong>Reveal the model</strong> when your sketch is done.</div>
    <div class="eq-arith spoiler">
      <section class="panel" id="eq-panel">
        <div class="panel-head">
          <h2>Equations <span class="muted" id="eq-context"></span></h2>
          <a class="small" href="${primerUrl}">How to read these equations</a>
          <div class="readings" role="group" aria-label="Ways to read the equations">
            ${READINGS.map((r) => `<button class="btn${r.key === 'code' ? ' advanced' : ''}" data-reading="${r.key}" aria-pressed="false">${r.label}</button>`).join('')}
          </div>
        </div>
        <div class="cue-chips" id="cue-chips"></div>
        <div class="eq-list" id="eq-list" style="margin-top:.6rem"></div>
        <div id="code" style="margin-top:.6rem"></div>
      </section>
      <section class="panel" id="arith-panel">
        <h2>The arithmetic</h2>
        <div class="arith" id="arith"></div>
      </section>
    </div>
    <section class="panel spoiler">
      <h2>What each symbol means</h2>
      <div class="role-key" style="margin:.25rem 0 .5rem">
        <span><span class="role-badge role-experimenter">experimenter</span> set by the experimenter's design</span>
        <span><span class="role-badge role-modeller">parameter</span> set by the modeller</span>
        <span><span class="role-badge role-computed">computed</span> calculated by the model</span>
      </div>
      <div class="table-scroll"><table class="symbol-guide" id="guide"></table></div>
      <p class="small muted">Words still unclear? Every term is in the <a href="${glossaryUrl}">glossary</a>.</p>
    </section>
    <section class="panel spoiler advanced">
      <div class="panel-head"><h2>Trial table</h2><button class="btn" id="csv">Download CSV</button></div>
      <p class="small muted">Every number the model computed, one row per trial. Click a row to select that trial.</p>
      <div class="table-wrap" id="table"></div>
    </section>
    <section class="panel">
      <h2>Phenomena</h2>
      <p class="small muted">Each badge is computed by running the design through the model with your current settings. Change a parameter or an assumption and watch the badges.</p>
      <div class="cards" id="cards"></div>
    </section>
  </div>
</div>`;
}
