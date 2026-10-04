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
  const helpers = { at, final, phaseEnd, phaseValues, lambda, margin: 0.05 * Math.max(lambda, 0.2) };
  const result = phenomenon.check(run, helpers);
  return { ...result, run };
}
