// Mackintosh's attention model.
//
// Mackintosh, N. J. (1975). A theory of attention: Variations in the
// associability of stimuli with reinforcement. Psychological Review, 82,
// 276-298.
//
// Learning: each cue present learns from its OWN prediction error,
//   ΔV_A = θ α_A (λ − V_A)
// not from the summed error of all cues present as in Rescorla-Wagner.
//
// Attention (associability) α_A changes with experience. The 1975 paper
// (p. 288) gives the direction in two rules: Δα_A is positive when A
// predicts the outcome better than all the other cues present,
// |λ − V_A| < |λ − V_X| (Eq. 4), and negative when the others predict it at
// least as well, |λ − V_A| ≥ |λ − V_X| (Eq. 5). V_X is the summed strength of
// the other cues present. It then adds, as a further assumption, that the
// size of the change is proportional to the discrepancy between the two
// errors. The paper gives no step size and no bounds, so this module offers
// two explicit versions, and the page says which is in use:
//
//   Continuous rule (default): Δα_A = θ_α (|λ − V_X| − |λ − V_A|), the
//     proportional form Mackintosh suggests. A tie leaves α unchanged.
//   Direction rule (option): α_A moves a fixed fraction θ_α of the way up to
//     1 when A is the better predictor, and down to α_min otherwise, so a tie
//     lowers α as Eq. 5 says. The step size is this site's choice.
//
// The two differ exactly where the paper is ambiguous: Eq. 5 lowers α on a
// tie, but a change proportional to the discrepancy is zero on a tie. In
// both versions α stays between α_min and 1 (the paper has 0 < α < 1). λ is
// 0 on a nonreinforced trial (footnote 2 allows 0 or a negative number).
// Errors are computed from the strengths before the trial; the new α applies
// from the next trial on. Cues that are absent do not change.

export const id = 'mackintosh';
export const name = 'Mackintosh';
export const year = 1975;
export const citation =
  'Mackintosh, N. J. (1975). A theory of attention: Variations in the associability of stimuli with reinforcement. Psychological Review, 82, 276–298.';

export const salienceKey = (cue) => `alpha0_${cue}`;

export const options = [
  {
    key: 'attention',
    label: 'Attention changes',
    default: true,
    help: 'On: each cue\'s attention α rises when it is the best predictor of the outcome and falls when it is not. Off: attention stays at its starting value, and every cue simply learns from its own error.',
  },
  {
    key: 'directionRule',
    label: '1975 direction rule',
    default: false,
    help: 'Off: attention changes by an amount that grows with how much better or worse the cue predicts than the others. On: attention takes a fixed-size step up or down, and a tie counts as worse, as Mackintosh first wrote it.',
  },
];

export function parameters(cues, opts = {}) {
  const ps = cues.map((c) => ({
    key: `alpha0_${c}`,
    sym: 'alpha0',
    cue: c,
    label: `Starting attention to ${c}`,
    min: 0.05,
    max: 1,
    step: 0.05,
    default: 0.5,
    role: 'modeller',
    active: true,
  }));
  ps.push({ key: 'theta', sym: 'theta', label: 'Learning rate for the outcome', min: 0, max: 1, step: 0.05, default: 0.3, role: 'modeller', active: true });
  ps.push({ key: 'thetaAlpha', sym: 'thetaA', label: 'How fast attention changes', min: 0, max: 1, step: 0.05, default: 0.3, role: 'modeller', active: opts.attention !== false });
  ps.push({ key: 'alphaMin', sym: 'alphaMin', label: 'Lowest attention', min: 0, max: 0.5, step: 0.05, default: 0.05, role: 'modeller', active: opts.attention !== false });
  ps.push({ key: 'lambda', sym: 'lambda', label: 'Outcome magnitude on + trials', min: 0, max: 2, step: 0.05, default: 1, role: 'experimenter', active: true });
  return ps;
}

export function init(params, cues, opts = {}) {
  const o = { attention: true, directionRule: false, ...opts };
  const V = Object.fromEntries(cues.map((c) => [c, 0]));
  const alpha = Object.fromEntries(cues.map((c) => [c, params[`alpha0_${c}`]]));
  const alphaStart = { ...alpha };

  function predict(present) {
    return present.reduce((s, c) => s + (V[c] ?? 0), 0);
  }

  function trial({ cues: present, reinforced, magnitude }) {
    const Vbefore = { ...V };
    const alphaBefore = { ...alpha };
    const perCue = {};
    // #region update
    // 1. The outcome: λ is set by the experimenter.
    const lambda = reinforced ? (magnitude ?? params.lambda) : 0;
    const theta = params.theta;

    for (const c of present) {
      // 2. Learning: each cue learns from its own error, λ − V_c.
      const error = lambda - Vbefore[c];
      const deltaV = theta * alpha[c] * error;

      // 3. Attention: is c a better predictor than the other cues present?
      const others = present.filter((x) => x !== c).reduce((total, x) => total + Vbefore[x], 0);
      const selfError = Math.abs(lambda - Vbefore[c]);
      const othersError = Math.abs(lambda - others);
      const better = selfError < othersError;
      let deltaAlpha = 0;
      if (o.attention && !o.directionRule) {
        deltaAlpha = params.thetaAlpha * (othersError - selfError);
      } else if (o.attention) {
        deltaAlpha = better ? params.thetaAlpha * (1 - alpha[c]) : -params.thetaAlpha * (alpha[c] - params.alphaMin);
      }
      const newAlpha = Math.min(1, Math.max(params.alphaMin, alpha[c] + deltaAlpha));
      perCue[c] = { alpha: alpha[c], error, deltaV, others, selfError, othersError, better, deltaAlpha, newAlpha };
    }

    // 4. Apply every change after all cues have been computed.
    for (const c of present) {
      V[c] = V[c] + perCue[c].deltaV;
      alpha[c] = perCue[c].newAlpha;
    }
    // #endregion
    for (const c of present) perCue[c].Vafter = V[c];
    return {
      lambda,
      theta,
      thetaAlpha: params.thetaAlpha,
      alphaMin: params.alphaMin,
      alphaStart,
      reinforced,
      Vbefore,
      Vafter: { ...V },
      alphaBefore,
      alphaAfter: { ...alpha },
      perCue,
    };
  }

  return {
    trial,
    predict,
    state: () => ({ V: { ...V }, alpha: { ...alpha } }),
  };
}
