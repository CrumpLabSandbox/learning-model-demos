// Pearce's configural model.
//
// Pearce, J. M. (1987). A model for stimulus generalization in Pavlovian
// conditioning. Psychological Review, 94, 61-73.
//
// The whole pattern of stimulation on a trial, every cue present together
// with the context, is one configuration, and it is the configuration that
// learns. Each configuration k has an excitatory strength E_k and an
// inhibitory strength I_k of its own. Other configurations lend it strength
// in proportion to how similar they are:
//
//   similarity        S(i, k) = (P_common / P_i) (P_common / P_k)      (Eq. 3)
//                     where P_i is the summed intensity of everything in
//                     configuration i and P_common the summed intensity of
//                     what i and k share. The buffer has a fixed capacity, so
//                     what matters is the share of each configuration that
//                     the common stimuli take up.
//   generalised       e_k = Σ_i S(i, k) E_i                              (Eq. 6)
//   excitation        i_k = Σ_i S(i, k) I_i   (inhibition generalises the same way)
//   net strength      V_k = E_k + e_k − I_k − i_k                        (Eq. 9)
//   learning          Δ = β (λ − V_k)                                   (Eq. 10)
//                     Δ > 0 adds to E_k; Δ < 0 adds |Δ| to I_k. Nothing is
//                     ever taken away: extinction is new inhibitory learning
//                     (Konorski, 1967; Pearce & Hall, 1980), not the weakening
//                     of excitation.
//
// V_k is what the animal does when it meets configuration k. The chart shows
// V for each single cue (the configuration of that cue with the context),
// which is mostly generalised from the configurations that were trained.
//
// Choices made here, where the paper leaves room:
// - A configuration is the set of cues on the trial plus the context, when
//   the design names one. Without a context, two configurations with no cue
//   in common have similarity 0, as in the paper's own simulations (which
//   set S between A and B to 0).
// - Intensity P is a parameter per cue; only the ratios matter. The paper's
//   simulations use equal intensities and S = 0.5 between a compound and
//   either element, which equal intensities and no context give exactly.
// - On a reinforced trial that is over-predicted (V > λ), Δ is negative and
//   goes to inhibition, as on a nonreinforced trial. The paper describes
//   inhibitory learning for nonreinforced trials and derives overexpectation
//   from generalisation alone; this extension follows Eq. 10 as written.
// - The size of the outcome, A+(2), is λ for that trial.
// - A configuration comes into being the first time it is presented. A
//   probe of a configuration never trained has E = I = 0, so its V is what
//   generalises to it.
// - The option "Generalisation" switches S to 0 between different
//   configurations, which leaves a pure configural learner that treats every
//   pattern as new. The option "Inhibition as new learning" switches to
//   weakening E instead, as in Rescorla-Wagner, which the paper argues
//   against; E can then go below zero, as V does in Rescorla-Wagner.

export const id = 'pearce';
export const name = 'Pearce (configural)';
export const year = 1987;
export const citation = 'Pearce, J. M. (1987). A model for stimulus generalization in Pavlovian conditioning. Psychological Review, 94, 61–73.';
export const predictionTitle = 'Net strength V';

export const salienceKey = (cue) => `P_${cue}`;

export const options = [
  {
    key: 'generalisation',
    label: 'Generalisation between configurations',
    default: true,
    help: 'On: a configuration borrows strength from every other configuration in proportion to how similar they are. Off: every pattern of cues learns on its own, and a cue tested alone after compound training knows nothing.',
  },
  {
    key: 'inhibition',
    label: 'Inhibition as new learning',
    default: true,
    help: 'On: when less happens than predicted, the configuration gains inhibitory strength I, and its excitation E stays. Off: E is weakened instead, as in Rescorla-Wagner.',
  },
];

export function parameters(cues, opts = {}, { context = null } = {}) {
  const ps = cues.map((c) => ({
    key: `P_${c}`,
    sym: 'P',
    cue: c,
    label: c === context ? `Intensity of the context ${c}` : `Intensity of ${c}`,
    min: 0.05,
    max: 1,
    step: 0.05,
    default: c === context ? 0.15 : 0.5,
    role: 'modeller',
    active: true,
  }));
  ps.push({ key: 'beta', sym: 'beta', label: 'Learning rate', min: 0, max: 1, step: 0.05, default: 0.25, role: 'modeller', active: true });
  ps.push({ key: 'lambda', sym: 'lambda', label: 'Outcome magnitude on + trials', min: 0, max: 2, step: 0.05, default: 1, role: 'experimenter', active: true });
  return ps;
}

// A configuration's key: its stimuli sorted, as one string.
export const keyOf = (stimuli) => [...new Set(stimuli)].sort().join('');

export function init(params, cues, opts = {}, _rng, { context = null } = {}) {
  const o = { generalisation: true, inhibition: true, ...opts };
  const P = (c) => params[`P_${c}`] ?? 0.5;
  // The configurations met so far: key -> { stimuli, E, I, P }.
  const configs = new Map();
  const total = (stimuli) => stimuli.reduce((s, c) => s + P(c), 0);

  function stimuliFor(present) {
    return [...new Set(context ? [...present, context] : present)].sort();
  }

  // Eq. 3. The two configurations are lists of stimuli.
  function similarity(a, b) {
    if (!o.generalisation) return 0;
    const common = a.filter((c) => b.includes(c));
    if (!common.length) return 0;
    const pc = total(common);
    return (pc / total(a)) * (pc / total(b));
  }

  // What every other configuration lends to configuration k, and the table
  // of contributions for the page.
  function generalised(stimuli, key) {
    let e = 0;
    let i = 0;
    const rows = [];
    for (const [k, c] of configs) {
      if (k === key) continue;
      const S = similarity(c.stimuli, stimuli);
      rows.push({ key: k, S, E: c.E, I: c.I, e: S * c.E, i: S * c.I });
      e += S * c.E;
      i += S * c.I;
    }
    return { e, i, rows };
  }

  function net(present) {
    const stimuli = stimuliFor(present);
    const key = keyOf(stimuli);
    const own = configs.get(key) ?? { E: 0, I: 0 };
    const g = generalised(stimuli, key);
    return { key, stimuli, own, g, V: own.E + g.e - own.I - g.i };
  }

  function predict(present) {
    return net(present).V;
  }

  function trial({ cues: present, reinforced, magnitude }) {
    const stimuli = stimuliFor(present);
    const key = keyOf(stimuli);
    const isNew = !configs.has(key);
    if (isNew) configs.set(key, { stimuli, E: 0, I: 0 });
    const cfg = configs.get(key);
    const Ebefore = cfg.E;
    const Ibefore = cfg.I;
    // #region update
    // 1. The outcome, set by the experimenter.
    const lambda = reinforced ? (magnitude ?? params.lambda) : 0;
    // 2. What the other configurations lend this one, by similarity.
    const { e, i, rows } = generalised(stimuli, key);
    // 3. The configuration's net strength: its own excitation and what it
    //    borrows, minus its own inhibition and what it borrows of that.
    const V = cfg.E + e - cfg.I - i;
    // 4. The discrepancy.
    const delta = params.beta * (lambda - V);
    // 5. More than predicted: excitation grows. Less than predicted:
    //    inhibition grows (or, with the option off, excitation shrinks).
    let deltaE = 0;
    let deltaI = 0;
    if (delta >= 0) deltaE = delta;
    else if (o.inhibition) deltaI = -delta;
    else deltaE = delta;
    cfg.E += deltaE;
    cfg.I += deltaI;
    // #endregion
    rows.sort((a, b) => Math.abs(b.e - b.i) - Math.abs(a.e - a.i));
    const top = rows[0] ?? null;
    // Each single cue's net strength after this trial, for the table.
    const Vcues = Object.fromEntries(cues.map((c) => [c, net(c === context ? [] : [c]).V]));
    return {
      Vcues,
      lambda,
      beta: params.beta,
      reinforced,
      key,
      stimuli,
      isNew,
      P: Object.fromEntries(stimuli.map((c) => [c, P(c)])),
      Ptotal: total(stimuli),
      Ebefore,
      Ibefore,
      e,
      i,
      V,
      delta,
      deltaE,
      deltaI,
      Eafter: cfg.E,
      Iafter: cfg.I,
      // The configuration that lends the most, for the equations' example
      // row, and every configuration for the configurations view.
      top: top ? { ...top, Pcommon: total(top.key.split('').filter((c) => stimuli.includes(c))), Ptotal: total(top.key.split('')) } : null,
      rows,
      configs: [...configs.entries()].map(([k, c]) => ({ key: k, E: c.E, I: c.I, S: k === key ? 1 : similarity(c.stimuli, stimuli), current: k === key })),
    };
  }

  // Per-cue series for the chart and the extra chart: the net strength of
  // each single cue in the context, and what its own configuration has
  // learned for itself.
  function state() {
    const V = {};
    const own = {};
    for (const c of cues) {
      if (c === context) {
        const n = net([]);
        V[c] = n.V;
        own[c] = n.own.E - n.own.I;
      } else {
        const n = net([c]);
        V[c] = n.V;
        own[c] = n.own.E - n.own.I;
      }
    }
    return { V, own };
  }

  return { trial, predict, state };
}
