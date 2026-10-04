// Runs a design through a model and returns a Run: one record per trial,
// plus the prediction for every probe after every trial.
//
// A model module exports:
//   id, name, citation
//   options                 assumption toggles: [{ key, label, default, help }]
//   parameters(cues, opts, { context })
//                           slider specs: [{ key, sym, cue?, label, min, max, step, default, role, advanced? }]
//   init(params, cues, opts, rng, { context }) -> learner
// A learner has:
//   trial({ cues, reinforced, magnitude, timing }) -> trial record (model-specific fields)
//                           timing is { cs, us, iti } in moments (see design.js);
//                           models that work trial by trial ignore it
//   predict(cues) -> number, the prediction for a probe, without learning
//   state() -> internal values for model-specific views

import { expandDesign } from './design.js';
import { makeRng } from './rng.js';

export function defaultOptions(model) {
  return Object.fromEntries(model.options.map((o) => [o.key, o.default]));
}

export function defaultParams(model, cues, opts, extra = {}) {
  return Object.fromEntries(model.parameters(cues, opts, extra).map((p) => [p.key, p.default]));
}

// Fill in any parameter the caller did not set with the model's default.
// extra is { context }: a model can give the context its own defaults.
export function resolveParams(model, cues, opts, params = {}, extra = {}) {
  const out = defaultParams(model, cues, opts, extra);
  for (const [k, v] of Object.entries(params)) if (k in out) out[k] = v;
  return out;
}

export function probeLabels(design) {
  const set = new Set(design.cues);
  for (const p of design.phases) for (const t of p.trials) if (t.type.cues.length) set.add(t.type.cues.join(''));
  for (const p of design.probes ?? []) set.add(p);
  return [...set].sort((a, b) => a.length - b.length || a.localeCompare(b));
}

export function runModel(model, { design, params = {}, options = {}, seed = 1 }) {
  const opts = { ...defaultOptions(model), ...options };
  const cues = design.cues;
  const extra = { context: design.context ?? null };
  const fullParams = resolveParams(model, cues, opts, params, extra);
  const rng = makeRng(seed);
  const sequence = expandDesign(design, makeRng(seed));
  const learner = model.init(fullParams, cues, opts, rng, extra);

  const labels = probeLabels(design);
  const series = Object.fromEntries(labels.map((l) => [l, [learner.predict([...l])]]));
  const initialState = learner.state();

  const trials = sequence.map((entry, i) => {
    const rec = learner.trial({
      cues: entry.cues,
      reinforced: entry.type.reinforced,
      magnitude: entry.type.magnitude,
      timing: entry.timing,
    });
    for (const l of labels) series[l].push(learner.predict([...l]));
    return {
      index: i + 1,
      phaseIndex: entry.phaseIndex,
      phaseName: entry.phaseName,
      label: entry.type.label,
      present: entry.cues,
      ...rec,
      state: learner.state(),
    };
  });

  // Per-cue internal values over trials, such as attention, for charts:
  // stateSeries.alpha.A[t] is A's attention after trial t (t = 0 is the start).
  const stateSeries = {};
  for (const [key, val] of Object.entries(initialState)) {
    if (!val || typeof val !== 'object') continue;
    stateSeries[key] = Object.fromEntries(cues.map((c) => [c, [val[c]]]));
    for (const rec of trials) for (const c of cues) stateSeries[key][c].push(rec.state[key][c]);
  }

  const phases = design.phases.map((p, idx) => {
    const idxs = trials.filter((t) => t.phaseIndex === idx).map((t) => t.index);
    return { name: p.name, start: idxs[0], end: idxs[idxs.length - 1] };
  });

  return {
    modelId: model.id,
    cues,
    params: fullParams,
    options: opts,
    seed,
    trials,
    series,
    labels,
    displayProbes: design.probes ?? cues,
    context: design.context ?? null,
    stateSeries,
    responseKey: model.responseKey ?? null,
    phases,
    initialState,
  };
}

// Helpers for reading a Run, used by phenomenon checks.
export function at(run, label, t) {
  const s = run.series[label];
  if (!s) throw new Error(`No series for ${label}`);
  return s[t];
}
export function final(run, label) {
  return at(run, label, run.trials.length);
}
export function phaseEnd(run, phaseIndex, label) {
  return at(run, label, run.phases[phaseIndex].end);
}
// Predictions after each trial in a phase.
export function phaseValues(run, phaseIndex, label) {
  const { start, end } = run.phases[phaseIndex];
  return run.series[label].slice(start, end + 1);
}
