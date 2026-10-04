// Rescorla-Wagner model.
//
// Rescorla, R. A., & Wagner, A. R. (1972). A theory of Pavlovian
// conditioning: Variations in the effectiveness of reinforcement and
// nonreinforcement. In A. H. Black & W. F. Prokasy (Eds.), Classical
// conditioning II: Current research and theory (pp. 64-99).
// Appleton-Century-Crofts.
//
// On every trial, each cue that is present changes by
//   ΔV_X = α_X β (λ − ΣV)
// where ΣV is the summed strength of all cues present on the trial.
// Cues that are absent do not change.
//
// The options switch parts of the rule off so students can see what each
// part does. With every option at its default this is the 1972 model.

export const id = 'rescorla-wagner';
export const name = 'Rescorla-Wagner';
export const year = 1972;
export const citation =
  'Rescorla, R. A., & Wagner, A. R. (1972). A theory of Pavlovian conditioning: Variations in the effectiveness of reinforcement and nonreinforcement. In A. H. Black & W. F. Prokasy (Eds.), Classical conditioning II: Current research and theory (pp. 64–99). Appleton-Century-Crofts.';

// The parameter that holds a cue's salience, for presets that set it.
export const salienceKey = (cue) => `alpha_${cue}`;

export const options = [
  {
    key: 'summedError',
    label: 'Summed error',
    default: true,
    help: 'On: every cue present learns from one shared error, λ − ΣV. Off: each cue learns from its own error, λ − V_X, as if it were alone.',
  },
  {
    key: 'useAlpha',
    label: 'Cue salience α',
    default: true,
    help: 'On: each cue has its own salience α, so noticeable cues learn faster. Off: every cue learns at the same rate.',
  },
  {
    key: 'separateBeta',
    label: 'Separate β for non-reinforced trials',
    default: false,
    help: 'On: trials without the outcome use their own learning rate β⁻, so extinction can be slower or faster than acquisition.',
  },
];

export function parameters(cues, opts = {}) {
  const ps = cues.map((c) => ({
    key: `alpha_${c}`,
    sym: 'alpha',
    cue: c,
    label: `Salience of ${c}`,
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    role: 'modeller',
    active: opts.useAlpha !== false,
  }));
  ps.push({
    key: 'beta',
    sym: 'beta',
    label: opts.separateBeta ? 'Learning rate when the outcome occurs' : 'Learning rate for the outcome',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
    role: 'modeller',
    active: true,
  });
  ps.push({
    key: 'betaMinus',
    sym: 'beta',
    variant: 'minus',
    label: 'Learning rate when the outcome is absent',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.25,
    role: 'modeller',
    active: Boolean(opts.separateBeta),
  });
  ps.push({
    key: 'lambda',
    sym: 'lambda',
    label: 'Outcome magnitude on + trials',
    min: 0,
    max: 2,
    step: 0.05,
    default: 1,
    role: 'experimenter',
    active: true,
  });
  return ps;
}

export function init(params, cues, opts = {}) {
  const o = { summedError: true, useAlpha: true, separateBeta: false, ...opts };
  const V = Object.fromEntries(cues.map((c) => [c, 0]));

  function predict(present) {
    return present.reduce((s, c) => s + (V[c] ?? 0), 0);
  }

  function trial({ cues: present, reinforced, magnitude }) {
    const Vbefore = { ...V };
    const perCue = {};
    // #region update
    // 1. The outcome: λ is set by the experimenter.
    const lambda = reinforced ? (magnitude ?? params.lambda) : 0;
    const beta = reinforced || !o.separateBeta ? params.beta : params.betaMinus;

    // 2. The prediction: add up the strengths of the cues present.
    const sumV = present.reduce((total, c) => total + V[c], 0);

    // 3. Each cue present learns from the error. Absent cues do not change.
    for (const c of present) {
      const alpha = o.useAlpha ? params[`alpha_${c}`] : 1;
      const predicted = o.summedError ? sumV : Vbefore[c];
      const error = lambda - predicted;
      const deltaV = alpha * beta * error;
      perCue[c] = { alpha, predicted, error, deltaV };
    }

    // 4. Apply the changes after every cue has been computed.
    for (const c of present) V[c] = V[c] + perCue[c].deltaV;
    // #endregion
    for (const c of present) perCue[c].Vafter = V[c];
    return { lambda, beta, reinforced, sumV, Vbefore, Vafter: { ...V }, perCue };
  }

  return {
    trial,
    predict,
    state: () => ({ V: { ...V } }),
  };
}
