// The comparison page: one experiment, several models, side by side.
//
// Each model gets its own chart (small multiples), because the models plot
// different quantities on different scales: strengths, net strengths, link
// strengths, and retrieval from memory. One trial cursor is shared, so
// clicking any chart moves all of them. For a phenomenon preset, each panel
// also shows the model's verdict and its explanation.

import { phenomena } from '../../content/phenomena/index.js';
import { MODELS } from '../core/registry.js';
import { parseDesign } from '../core/design.js';
import { runModel } from '../core/runner.js';
import { evaluatePhenomenon } from '../core/phenomena.js';
import { createChart } from './chart.js';
import { esc } from './equation.js';
import { installHighlighting } from './highlight.js';

// What each model's line measures, in plain words.
export const PLOTTED = {
  'rescorla-wagner': 'V: how strongly each cue predicts the outcome. It levels off at λ = 1.',
  mackintosh: 'V: how strongly each cue predicts the outcome, learned from its own error.',
  'pearce-hall': 'V − V̄: excitatory minus inhibitory strength.',
  sop: 'V: the link from each cue to the US. Its scale is set by the retrieval strength ρ.',
  'minerva-al': 'Retrieval of the outcome given the cue, from −1 to 1, averaged over 25 simulated learners. The band is the spread.',
};

const subs = (text) => esc(text).replace(/([A-Za-zΑ-ω]+)_([A-Z])/g, '$1<sub>$2</sub>');

export function mountCompare(root) {
  const q = new URLSearchParams(location.hash.replace(/^#/, ''));
  const state = {
    presetId: phenomena.some((p) => p.id === q.get('preset')) ? q.get('preset') : 'blocking',
    design: q.get('design') ?? null,
    chosen: new Set((q.get('m') ?? MODELS.map((m) => m.id).join(',')).split(',').filter((id) => MODELS.some((m) => m.id === id))),
    t: Number.parseInt(q.get('t') ?? '', 10),
    runs: [],
  };
  if (!state.chosen.size) MODELS.forEach((m) => state.chosen.add(m.id));

  root.innerHTML = `
    <section class="panel compare-controls">
      <div class="compare-row">
        <label class="field">Experiment <select id="cmp-preset">${phenomena.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}<option value="">My own design</option></select></label>
        <fieldset class="cmp-models"><legend class="small muted">Models</legend>${MODELS.map((m) => `<label class="toggle-inline"><input type="checkbox" data-model="${m.id}"> ${esc(m.name)}</label>`).join('')}</fieldset>
      </div>
      <details class="cmp-own"${state.design ? ' open' : ''}><summary>Write your own design</summary>
        <label class="field">Trials <textarea id="cmp-design" spellcheck="false" autocomplete="off" aria-describedby="cmp-error"></textarea></label>
        <div class="error-msg" id="cmp-error" role="alert"></div>
        <p class="small muted">Same format as on the model pages, such as "Pretraining: 20 A+" on one line and "Compound: 20 AB+, 20 CD+" on the next.</p>
      </details>
      <div class="stepper" id="cmp-stepper">
        <button class="btn" data-act="start" aria-label="Go to the start">⏮</button>
        <button class="btn" data-act="back" aria-label="Back one trial">◀</button>
        <button class="btn" data-act="fwd" aria-label="Forward one trial">Step ▶</button>
        <button class="btn" data-act="end" aria-label="Go to the last trial">⏭</button>
        <input type="range" id="cmp-scrub" min="0" max="0" value="0" aria-label="Select trial">
        <span class="trial-label" id="cmp-label"></span>
      </div>
    </section>
    <section class="cmp-about" id="cmp-about"></section>
    <p class="small muted cmp-scale-note">Each model plots its own quantity on its own scale, so compare the shapes and the order of the lines, not their exact heights.</p>
    <div class="compare-grid" id="cmp-grid"></div>`;
  const $ = (id) => root.querySelector(`#${id}`);
  installHighlighting(root);

  const presetSel = $('cmp-preset');
  const designBox = $('cmp-design');
  for (const box of root.querySelectorAll('[data-model]')) box.checked = state.chosen.has(box.dataset.model);

  function currentDesignText() {
    const p = phenomena.find((x) => x.id === state.presetId);
    return state.design ?? p?.design ?? '';
  }

  function run() {
    const text = currentDesignText();
    let design;
    try {
      design = parseDesign(text);
      $('cmp-error').textContent = '';
    } catch (e) {
      $('cmp-error').textContent = e.message;
      return;
    }
    const preset = state.design === null ? phenomena.find((x) => x.id === state.presetId) : null;
    state.runs = MODELS.filter((m) => state.chosen.has(m.id)).map((m) => {
      if (preset) {
        const r = evaluatePhenomenon(m, preset);
        return { model: m, run: r.run, shown: r.shown, measure: r.measure, preset };
      }
      return { model: m, run: runModel(m, { design, params: {} }) };
    });
    const n = state.runs[0]?.run.trials.length ?? 0;
    if (!Number.isFinite(state.t) || state.t > n || state.t < 0) state.t = n;
    renderAbout(preset);
    renderGrid();
    select(state.t);
  }

  function renderAbout(preset) {
    $('cmp-about').innerHTML = preset
      ? `<h2>${esc(preset.title)}</h2><div class="design-text">${esc(preset.design)}</div>` +
        `<p><span class="label">What happens:</span> ${esc(preset.empirical)} <span class="muted">${esc(preset.citation)}</span></p>` +
        `<p class="small"><span class="label">Counts as shown when:</span> ${esc(preset.criterion)}</p>`
      : `<h2>Your design</h2><div class="design-text">${esc(currentDesignText())}</div>`;
  }

  let charts = [];
  function renderGrid() {
    const grid = $('cmp-grid');
    grid.innerHTML = state.runs
      .map(({ model, shown, measure, preset }, i) => {
        const note = preset?.models[model.id];
        const badge = shown === undefined ? '' : shown ? `<span class="badge yes">✓ Shows it</span>` : `<span class="badge no">✗ Does not</span>`;
        const link = `models/${model.id}.html#${preset ? `preset=${preset.id}` : `design=${encodeURIComponent(currentDesignText())}`}`;
        return (
          `<article class="panel cmp-card" data-model-card="${model.id}">` +
          `<div class="panel-head"><h3>${esc(model.name)} <span class="muted small">(${model.year})</span></h3>${badge}</div>` +
          `<p class="small muted cmp-plotted">${esc(PLOTTED[model.id] ?? 'The model\'s prediction for each cue.')}</p>` +
          `<div class="cmp-chart" id="cmp-chart-${i}"></div>` +
          (measure ? `<p class="small muted">${esc(measure)}</p>` : '') +
          (note?.why ? `<p class="small"><span class="label">Why:</span> ${subs(note.why)}</p>` : '') +
          `<p class="small"><a href="${link}">Open this in the ${esc(model.name)} page</a>${model.status === 'preview' ? ' <span class="muted">(preview)</span>' : ''}</p>` +
          `</article>`
        );
      })
      .join('');
    charts = state.runs.map((r, i) => createChart($(`cmp-chart-${i}`), { onSelect: (t) => select(t), label: r.model.name }));
  }

  function select(t) {
    const n = state.runs[0]?.run.trials.length ?? 0;
    state.t = Math.max(0, Math.min(n, t));
    charts.forEach((c, i) => c.update({ run: state.runs[i].run, t: state.t, revealed: n, reference: state.runs[i].preset?.reference ?? null }));
    const scrub = $('cmp-scrub');
    scrub.max = String(n);
    scrub.value = String(state.t);
    const rec = state.t > 0 ? state.runs[0]?.run.trials[state.t - 1] : null;
    $('cmp-label').textContent = rec ? `Trial ${state.t} of ${n}: ${rec.phaseName}, ${rec.label}` : `Before training (${n} trials)`;
    saveUrl();
  }

  let urlTimer = null;
  function saveUrl() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const out = new URLSearchParams();
      if (state.design === null) out.set('preset', state.presetId);
      else out.set('design', state.design);
      if (state.chosen.size !== MODELS.length) out.set('m', [...state.chosen].join(','));
      out.set('t', String(state.t));
      history.replaceState(null, '', `#${out}`);
    }, 200);
  }

  presetSel.addEventListener('change', () => {
    if (presetSel.value) {
      state.presetId = presetSel.value;
      state.design = null;
      designBox.value = currentDesignText();
      state.t = NaN;
      run();
    } else {
      root.querySelector('.cmp-own').open = true;
      designBox.focus();
    }
  });
  let typing = null;
  designBox.addEventListener('input', () => {
    clearTimeout(typing);
    typing = setTimeout(() => {
      const match = phenomena.find((p) => p.design.trim() === designBox.value.trim());
      state.design = match ? null : designBox.value;
      if (match) state.presetId = match.id;
      presetSel.value = match ? match.id : '';
      state.t = NaN;
      run();
    }, 300);
  });
  root.querySelector('.cmp-models').addEventListener('change', (ev) => {
    const id = ev.target.dataset.model;
    if (!id) return;
    if (ev.target.checked) state.chosen.add(id);
    else if (state.chosen.size > 1) state.chosen.delete(id);
    else ev.target.checked = true; // keep at least one model
    run();
  });
  $('cmp-stepper').addEventListener('click', (ev) => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    const n = state.runs[0]?.run.trials.length ?? 0;
    select({ start: 0, back: state.t - 1, fwd: state.t + 1, end: n }[act]);
  });
  $('cmp-scrub').addEventListener('input', (ev) => select(Number(ev.target.value)));

  presetSel.value = state.design === null ? state.presetId : '';
  designBox.value = currentDesignText();
  run();
  document.documentElement.setAttribute('data-ready', '');
}

