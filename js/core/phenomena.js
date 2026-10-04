// Runs a phenomenon through a model and reports whether the effect appears.

import { parseDesign } from './design.js';
import { runModel, at, final, phaseEnd, phaseValues } from './runner.js';

export function evaluatePhenomenon(model, phenomenon, { params = {}, options = {}, seed = 1 } = {}) {
  const design = parseDesign(phenomenon.design);
  const run = runModel(model, { design, params: { ...params, ...(phenomenon.params ?? {}) }, options, seed });
  const lambda = run.params.lambda ?? 1;
  const helpers = { at, final, phaseEnd, phaseValues, lambda, margin: 0.05 * Math.max(lambda, 0.2) };
  const result = phenomenon.check(run, helpers);
  return { ...result, run };
}
