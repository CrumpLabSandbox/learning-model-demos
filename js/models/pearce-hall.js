// Pearce-Hall model.
//
// Pearce, J. M., & Hall, G. (1980). A model for Pavlovian learning:
// Variations in the effectiveness of conditioned but not of unconditioned
// stimuli. Psychological Review, 87, 532-552.
// Pearce, J. M., Kaye, H., & Hall, G. (1982). Predictive accuracy and
// stimulus associability: Development of a model for Pavlovian learning. In
// M. L. Commons, R. J. Herrnstein, & A. R. Wagner (Eds.), Quantitative
// analyses of behavior (Vol. 3, pp. 241-255). Ballinger.
//
// Attention (associability) α tracks how surprising the outcome has been
// recently. The error does not drive learning directly, as in
// Rescorla-Wagner; it drives attention, and attention drives learning.
//
// Each cue has an excitatory strength V and an inhibitory strength V̄; its
// net strength is V − V̄, and the prediction ΣV adds up the net strengths of
// the cues present. On a trial, for each cue A present:
//   excitatory learning when more happened than expected (λ > ΣV):
//                                                       ΔV_A = S_A α_A λ
//   inhibitory learning when less happened than expected (ΣV > λ):
//                                                       ΔV̄_A = S_A α_A (ΣV − λ)
//   attention for A's next trial (Pearce, Kaye, & Hall, 1982):
//                                                       α_A ← γ|λ − ΣV| + (1 − γ) α_A
// With γ = 1 attention is just the surprise on the cue's last trial, as in
// the 1980 paper. With γ < 1 (the default here, 0.8) attention is a running
// average of recent surprise, the 1982 version; then the effect of
// pre-exposure lasts beyond one trial. With small γ attention lags behind and
// learning can overshoot λ before inhibition pulls it back. S_A is A's salience, which never changes. Errors use the
// strengths before the trial.
//
// A choice made here: excitatory and inhibitory learning happen on
// different trials, depending on the sign of the error. If excitatory
// learning also happened whenever the outcome occurred, a cue that already
// over-predicts would keep gaining both kinds of strength, and the net
// prediction would settle at 2λ rather than λ. Cues that are absent do not change, and their
// attention keeps its last value.

export const id = 'pearce-hall';
export const name = 'Pearce-Hall';
export const year = 1980;
export const citation =
  'Pearce, J. M., & Hall, G. (1980). A model for Pavlovian learning: Variations in the effectiveness of conditioned but not of unconditioned stimuli. Psychological Review, 87, 532–552.';
export const status = 'preview';

export const salienceKey = (cue) => `S_${cue}`;

export const options = [
  {
    key: 'attention',
    label: 'Attention follows surprise',
    default: true,
    help: 'On: after each trial, attention to each cue present moves toward how surprising the outcome was. Off: attention stays at its starting value.',
  },
  {
    key: 'inhibition',
    label: 'Inhibitory learning',
    default: true,
    help: 'On: when less happens than the cues predicted, they gain inhibitory strength V̄. Off: only excitatory strength V is ever learned.',
  },
];

export function parameters(cues, opts = {}) {
  const ps = cues.map((c) => ({
    key: `S_${c}`,
    sym: 'S',
    cue: c,
    label: `Salience of ${c}`,
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.15,
    role: 'modeller',
    active: true,
  }));
  ps.push({ key: 'alpha0', sym: 'alpha0', label: 'Starting attention (for every cue)', min: 0.05, max: 1, step: 0.05, default: 0.8, role: 'modeller', active: true });
  ps.push({ key: 'gamma', sym: 'gamma', label: 'How fast attention changes (1 = the 1980 model)', min: 0.05, max: 1, step: 0.05, default: 0.8, role: 'modeller', active: opts.attention !== false });
  ps.push({ key: 'lambda', sym: 'lambda', label: 'Outcome magnitude on + trials', min: 0, max: 2, step: 0.05, default: 1, role: 'experimenter', active: true });
  return ps;
}

export function init(params, cues, opts = {}) {
  const o = { attention: true, inhibition: true, ...opts };
  const V = Object.fromEntries(cues.map((c) => [c, 0]));
  const Vbar = Object.fromEntries(cues.map((c) => [c, 0]));
  const alpha = Object.fromEntries(cues.map((c) => [c, params.alpha0]));

  function predict(present) {
    return present.reduce((s, c) => s + (V[c] ?? 0) - (Vbar[c] ?? 0), 0);
  }

  function trial({ cues: present, reinforced, magnitude }) {
    const Vbefore = { ...V };
    const Vbarbefore = { ...Vbar };
    const alphaBefore = { ...alpha };
    const perCue = {};
    // #region update
    // 1. The outcome, set by the experimenter, and the prediction: the net
    //    strengths (V − V̄) of the cues present, added up.
    const lambda = reinforced ? (magnitude ?? params.lambda) : 0;
    const sumV = present.reduce((total, c) => total + V[c] - Vbar[c], 0);
    const surprise = Math.abs(lambda - sumV);
    const shortfall = sumV - lambda;

    for (const c of present) {
      const S = params[`S_${c}`];
      // 2. Excitatory learning when more happened than was predicted. Its
      //    size depends on attention and the outcome, not on the error.
      const deltaV = lambda > sumV ? S * alpha[c] * lambda : 0;
      // 3. Inhibitory learning when less happened than was predicted.
      const deltaVbar = o.inhibition && shortfall > 0 ? S * alpha[c] * shortfall : 0;
      // 4. Attention for the next trial moves toward this trial's surprise.
      const newAlpha = o.attention ? params.gamma * surprise + (1 - params.gamma) * alpha[c] : alpha[c];
      perCue[c] = { S, alpha: alpha[c], deltaV, deltaVbar, newAlpha };
    }

    // 5. Apply every change after all cues have been computed.
    for (const c of present) {
      V[c] = V[c] + perCue[c].deltaV;
      Vbar[c] = Vbar[c] + perCue[c].deltaVbar;
      alpha[c] = perCue[c].newAlpha;
    }
    // #endregion
    for (const c of present) {
      perCue[c].Vafter = V[c];
      perCue[c].Vbarafter = Vbar[c];
    }
    return {
      lambda,
      reinforced,
      sumV,
      surprise,
      shortfall,
      gamma: params.gamma,
      alpha0: params.alpha0,
      Vbefore,
      Vbarbefore,
      Vafter: { ...V },
      Vbarafter: { ...Vbar },
      alphaBefore,
      alphaAfter: { ...alpha },
      perCue,
    };
  }

  return {
    trial,
    predict,
    state: () => ({ V: { ...V }, Vbar: { ...Vbar }, alpha: { ...alpha } }),
  };
}
