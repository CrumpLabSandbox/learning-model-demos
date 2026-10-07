// Runs a phenomenon through a model and reports whether the effect appears.

import { parseDesign } from './design.js';
import { runModel, at, final, phaseEnd, phaseValues } from './runner.js';

// A phenomenon can fix the salience of some cues ({ A: 0.5, B: 0.1 }). Each
// model says which of its parameters is a cue's salience.
export function presetParams(model, phenomenon) {
  const out = {};
  for (const [cue, v] of Object.entries(phenomenon.salience ?? {})) out[model.salienceKey(cue)] = v;
  return out;
}

export function evaluatePhenomenon(model, phenomenon, { params = {}, options = {}, seed = 1 } = {}) {
  const design = parseDesign(phenomenon.design);
  const run = runModel(model, { design, params: { ...params, ...presetParams(model, phenomenon) }, options, seed });
  const lambda = run.params.lambda ?? 1;
  // What the animal would do, trial by trial: the prediction for most
  // models; a model can name a different per-cue series (SOP: how much of
  // the US the cue calls up).
  const response = (r, label) => (r.responseKey && r.stateSeries[r.responseKey]?.[label]) || r.series[label];
  // A design with a random order is one particular sequence. A check that
  // should not depend on the order can average a measurement over several
  // sequences (seeds 1..n), as the experiments average over many streams.
  // measure(run) returns a number or a list of numbers; the result is the
  // mean, or the list of means.
  const overSeeds = (n, measure) => {
    let sum = null;
    let list = false;
    for (let s = 1; s <= n; s++) {
      const v = measure(s === seed ? run : runModel(model, { design, params: run.params, options, seed: s }));
      list = Array.isArray(v);
      const vals = list ? v : [v];
      sum = sum ? sum.map((x, i) => x + vals[i]) : vals;
    }
    const means = sum.map((x) => x / n);
    return list ? means : means[0];
  };
  // A probe's value for outcome j (1, 2, ...). Models that know one outcome
  // have no second series, so every outcome reads as the first.
  const outcome = (r, label, j, t = r.trials.length) => (r.probeSeries?.[`out${j}`]?.[label] ?? r.series[label])[t];
  const helpers = { at, final, phaseEnd, phaseValues, response, outcome, lambda, margin: 0.05 * Math.max(lambda, 0.2), overSeeds };
  const result = phenomenon.check(run, helpers);
  return { ...result, run };
}
