// Delamater's connectionist network.
//
// Delamater, A. R. (2012). On the nature of CS and US representations in
// Pavlovian learning. Learning & Behavior, 40, 1-23.
//
// A three-layer network. Input units are stimulus features: each cue has a
// feature of its own, and cues of the same modality (a Modalities line in
// the design) share a feature as well, as the paper codes its stimuli (A1 =
// a + b, A2 = b + c). The context, when the design names one, is a feature
// too. Hidden units come in pathways: one pathway per modality, which only
// that modality's features reach, and a multimodal pathway that every
// feature reaches (Fig. 4). Output units are the outcomes, one per US.
//
// On a trial:
//   net input         net_h = Σ_i a_i w_ih                                  (Eq. 1)
//   activation        a = 1 / (1 + e^−(net − 2.2))                          (Eq. 2)
//                     the logistic, shifted so that no input gives about
//                     0.1 rather than 0.5: neurons have a low resting rate
//   US error          δ_j = (λ_j − a_j) a_j (1 − a_j)                      (App. 1)
//                     λ_j is 1 for the outcome that occurred, 0 otherwise
//   hidden error      δ_h = a_h (1 − a_h) Σ_j δ_j w_hj                     (App. 2)
//   weight change     Δw_ij = α δ_j a_i + β Δw_ij(previous trial)           (App. 3)
//                     α = 0.1 (learning rate), β = 0.9 (momentum)
// This is backpropagation (Rumelhart, Hinton, & Williams, 1986), one trial
// at a time. The paper runs eight networks with different random starting
// weights and averages them, as this page does.
//
// What the chart shows: the activation of the outcome-1 unit for each probe
// (the mean over the networks, with the spread). A design with a second
// outcome gets a second chart for it.
//
// Choices made here, where the paper leaves room:
// - Hidden units per pathway: 2 per modality and 4 multimodal, as drawn in
//   the paper's Figure 4. Without a Modalities line there is one pathway
//   that every feature reaches (the multimodal one), with 4 units.
// - Starting weights are drawn uniformly within ±w0 (the paper says only
//   that they are random). Output units have the same shifted logistic as
//   hidden units.
// - The page's defaults are faster than the paper's: learning rate 0.5 and
//   starting weights within ±1, over 16 networks, so that the network learns
//   within the trial counts the site's shared experiments use. The paper's
//   values (0.1, random weights, 8 networks) take about a thousand trials;
//   tests/delamater.test.js reproduces the paper's figures with those values
//   and its trial counts. The paper's orderings hold at both settings.
// - A cue's salience is its input activation when present (1 by default;
//   the paper lowers it for a less salient cue). A bigger outcome, A+(2),
//   raises that outcome's target λ above 1.
// - A trial with no outcome sets every US unit's target to 0. A trial with
//   outcome 1 sets US1's target to λ and the others' to 0.
// - Momentum carries over from one trial to the next whatever the trial
//   type, as in the paper's rule.

export const id = 'delamater';
export const name = 'Delamater (network)';
export const year = 2012;
export const citation = 'Delamater, A. R. (2012). On the nature of CS and US representations in Pavlovian learning. Learning & Behavior, 40, 1–23.';
export const predictionTitle = 'US activation';
export const multiOutcome = true;

export const salienceKey = (cue) => `a_${cue}`;

export const options = [
  {
    key: 'hidden',
    label: 'Hidden layer',
    default: true,
    help: 'On: inputs reach the outcomes through hidden units, which can learn to represent patterns of cues. Off: inputs connect straight to the outcomes, a one-layer network that, like Rescorla-Wagner, can only add up.',
  },
  {
    key: 'momentum',
    label: 'Momentum',
    default: true,
    help: 'On: each weight change carries nine tenths of the last one, so learning runs smoothly and fast (β = 0.9 in the paper). Off: each trial\'s change stands alone.',
  },
];

export function parameters(cues, opts = {}, { context = null } = {}) {
  const ps = cues.map((c) => ({
    key: `a_${c}`,
    sym: 'a',
    cue: c,
    label: c === context ? `Input from the context ${c}` : `Salience of ${c} (input activation)`,
    min: 0.1,
    max: 1,
    step: 0.1,
    default: 1,
    role: 'modeller',
    active: true,
  }));
  ps.push({ key: 'rate', sym: 'rate', label: 'Learning rate (0.1 in the paper)', min: 0.01, max: 1, step: 0.01, default: 0.5, role: 'modeller', active: true });
  ps.push({ key: 'beta', sym: 'beta', label: 'Momentum', min: 0, max: 0.99, step: 0.01, default: 0.9, role: 'modeller', active: opts.momentum !== false, advanced: true });
  ps.push({ key: 'shift', sym: 'shift', label: 'Resting shift of the activation function', min: 0, max: 5, step: 0.1, default: 2.2, role: 'modeller', active: true, advanced: true });
  ps.push({ key: 'perModality', sym: 'nH', label: 'Hidden units per modality pathway', min: 1, max: 8, step: 1, default: 2, role: 'modeller', active: opts.hidden !== false, advanced: true });
  ps.push({ key: 'multimodal', sym: 'nM', label: 'Multimodal hidden units', min: 1, max: 12, step: 1, default: 4, role: 'modeller', active: opts.hidden !== false, advanced: true });
  ps.push({ key: 'spread', sym: 'w0', label: 'Range of the starting weights (±)', min: 0.05, max: 2, step: 0.05, default: 1, role: 'modeller', active: true, advanced: true });
  ps.push({ key: 'learners', sym: 'N', label: 'Simulated networks (8 in the paper)', min: 1, max: 40, step: 1, default: 16, role: 'experimenter', active: true });
  ps.push({ key: 'lambda', sym: 'lambda', label: 'Outcome magnitude on + trials', min: 0, max: 2, step: 0.05, default: 1, role: 'experimenter', active: true });
  return ps;
}

export const logistic = (net, shift) => 1 / (1 + Math.exp(-(net - shift)));

export function init(params, cues, opts = {}, rng, { context = null, modalities = null, outcomes = [1] } = {}) {
  const o = { hidden: true, momentum: true, ...opts };
  const random = rng ? rng.random : Math.random;
  const shift = params.shift;
  const N = Math.max(1, Math.round(params.learners));
  const nOut = Math.max(1, ...outcomes);

  // ---- features and pathways ---------------------------------------------
  // Every cue has a feature of its own; each modality group adds a shared
  // feature; the context is a feature. Each feature knows which pathways
  // it reaches.
  const groups = (modalities ?? []).map((g) => g.filter((c) => c !== context));
  const groupOf = {};
  groups.forEach((g, gi) => g.forEach((c) => (groupOf[c] = gi)));
  const features = [];
  for (const c of cues) features.push({ id: c, kind: c === context ? 'context' : 'cue', cues: [c], pathways: null });
  groups.forEach((g, gi) => features.push({ id: `shared${gi + 1}`, kind: 'shared', cues: g, pathways: null }));
  // Pathways: one per modality group, then the multimodal pathway.
  const pathways = [];
  groups.forEach((g, gi) => pathways.push({ id: `modality${gi + 1}`, label: `${g.join('')} pathway`, size: Math.round(params.perModality) }));
  pathways.push({ id: 'multimodal', label: groups.length ? 'multimodal pathway' : 'hidden layer', size: Math.round(params.multimodal) });
  for (const f of features) {
    const g = f.kind === 'shared' ? groups.indexOf(f.cues) : f.kind === 'cue' && groupOf[f.id] !== undefined ? groupOf[f.id] : -1;
    // A feature reaches its own modality's pathway and the multimodal one;
    // the context and cues of no modality reach every pathway.
    f.pathways = g >= 0 ? [pathways[g].id, 'multimodal'] : pathways.map((p) => p.id);
  }
  const hiddenUnits = [];
  for (const p of pathways) for (let k = 0; k < p.size; k++) hiddenUnits.push({ pathway: p.id, label: `${p.label} ${k + 1}` });
  const nF = features.length;
  const nH = o.hidden ? hiddenUnits.length : 0;
  // Which hidden units each feature can reach (a mask on the weights).
  const reach = features.map((f) => hiddenUnits.map((h) => (f.pathways.includes(h.pathway) ? 1 : 0)));

  // ---- the networks -------------------------------------------------------
  const uniform = () => (random() * 2 - 1) * params.spread;
  const makeNet = () => ({
    // input -> hidden, hidden -> output, and (without a hidden layer) input -> output
    wIH: features.map((f, i) => hiddenUnits.map((h, k) => (reach[i][k] ? uniform() : 0))),
    wHO: hiddenUnits.map(() => Array.from({ length: nOut }, uniform)),
    wIO: features.map(() => Array.from({ length: nOut }, uniform)),
    dIH: features.map(() => hiddenUnits.map(() => 0)),
    dHO: hiddenUnits.map(() => Array.from({ length: nOut }, () => 0)),
    dIO: features.map(() => Array.from({ length: nOut }, () => 0)),
  });
  const nets = Array.from({ length: N }, makeNet);

  // The input pattern for a set of present cues: each present cue's feature
  // at its salience; a shared feature at the highest salience of its
  // present cues; the context at its own input value.
  function inputFor(present) {
    return features.map((f) => {
      const on = f.cues.filter((c) => present.includes(c));
      if (!on.length) return 0;
      return Math.max(...on.map((c) => params[`a_${c}`] ?? 1));
    });
  }

  function forward(net, x) {
    const h = new Array(nH);
    for (let k = 0; k < nH; k++) {
      let s = 0;
      for (let i = 0; i < nF; i++) s += x[i] * net.wIH[i][k];
      h[k] = logistic(s, shift);
    }
    const out = new Array(nOut);
    for (let j = 0; j < nOut; j++) {
      let s = 0;
      if (o.hidden) for (let k = 0; k < nH; k++) s += h[k] * net.wHO[k][j];
      else for (let i = 0; i < nF; i++) s += x[i] * net.wIO[i][j];
      out[j] = logistic(s, shift);
    }
    return { h, out };
  }

  // Mean activation of an outcome unit over the networks, for a probe.
  function summaryFor(present, outcomeIndex) {
    const x = inputFor(present);
    const vals = nets.map((n) => forward(n, x).out[outcomeIndex]);
    const mean = vals.reduce((s, v) => s + v, 0) / N;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / N);
    return { mean, sd };
  }

  function trial({ cues: present, reinforced, outcome, magnitude }) {
    const x = inputFor(present);
    const target = Array.from({ length: nOut }, () => 0);
    const lambda = reinforced ? (magnitude ?? params.lambda) : 0;
    if (reinforced) target[(outcome || 1) - 1] = lambda;
    const rate = params.rate;
    const beta = o.momentum ? params.beta : 0;
    let first = null;
    const outMeans = Array.from({ length: nOut }, () => 0);
    for (let n = 0; n < N; n++) {
      const net = nets[n];
      // #region update
      // 1. Forward pass: hidden activations, then the outcome units.
      const { h, out } = forward(net, x);
      // 2. The error at each outcome unit: what happened minus what was
      //    predicted, times the slope of the activation function.
      const dOut = out.map((a, j) => (target[j] - a) * a * (1 - a));
      // 3. The error passed back to each hidden unit: the outcome errors,
      //    weighted by its connections to them, times its own slope.
      const dHid = h.map((a, k) => {
        let s = 0;
        for (let j = 0; j < nOut; j++) s += dOut[j] * net.wHO[k][j];
        return a * (1 - a) * s;
      });
      // 4. Weight changes: rate × error of the receiving unit × activation of
      //    the sending unit, plus momentum from the last change.
      if (o.hidden) {
        for (let k = 0; k < nH; k++) for (let j = 0; j < nOut; j++) {
          net.dHO[k][j] = rate * dOut[j] * h[k] + beta * net.dHO[k][j];
          net.wHO[k][j] += net.dHO[k][j];
        }
        for (let i = 0; i < nF; i++) for (let k = 0; k < nH; k++) {
          if (!reach[i][k]) continue;
          net.dIH[i][k] = rate * dHid[k] * x[i] + beta * net.dIH[i][k];
          net.wIH[i][k] += net.dIH[i][k];
        }
      } else {
        for (let i = 0; i < nF; i++) for (let j = 0; j < nOut; j++) {
          net.dIO[i][j] = rate * dOut[j] * x[i] + beta * net.dIO[i][j];
          net.wIO[i][j] += net.dIO[i][j];
        }
      }
      // #endregion
      for (let j = 0; j < nOut; j++) outMeans[j] += out[j] / N;
      if (n === 0) {
        // Network 1's details for the page: the most active hidden unit (k)
        // and the trial's outcome unit (j).
        const kTop = h.length ? h.indexOf(Math.max(...h)) : -1;
        const j = reinforced ? (outcome || 1) - 1 : 0;
        first = {
          x,
          h,
          out,
          dOut,
          dHid,
          kTop,
          j,
          hTop: kTop >= 0 ? h[kTop] : undefined,
          dTop: kTop >= 0 ? dHid[kTop] : undefined,
          wTop: kTop >= 0 ? net.wHO[kTop][j] - net.dHO[kTop][j] : undefined, // the weight before this trial's change
          dwTop: kTop >= 0 ? net.dHO[kTop][j] : undefined,
          netTop: kTop >= 0 ? features.reduce((s, f, i) => s + x[i] * (net.wIH[i][kTop] - net.dIH[i][kTop]), 0) : undefined,
          outJ: out[j],
          dOutJ: dOut[j],
          targetJ: target[j],
        };
      }
    }
    return {
      lambda,
      reinforced,
      outcome: reinforced ? outcome || 1 : 0,
      target,
      rate,
      beta,
      shift,
      N,
      features: features.map((f) => f.id),
      featureCues: features.map((f) => f.cues.join('')),
      hiddenLabels: hiddenUnits.map((u) => u.label),
      pathways: hiddenUnits.map((u) => u.pathway),
      outMeans,
      learner: first,
    };
  }

  function predict(present) {
    return summaryFor(present, 0).mean;
  }

  function summary(present) {
    return summaryFor(present, 0);
  }

  // The other outcome units' mean activation for every probe, for extra
  // charts (out2, out3, ...).
  function probeSeries(probes) {
    const out = {};
    for (let j = 1; j < nOut; j++) out[`out${j + 1}`] = probes.map((p) => summaryFor(p, j).mean);
    return out;
  }

  // Per-cue series: each outcome unit's mean activation for the cue alone.
  function state() {
    const s = {};
    for (let j = 0; j < nOut; j++) {
      s[`out${j + 1}`] = Object.fromEntries(cues.map((c) => [c, summaryFor(c === context ? [] : [c], j).mean]));
    }
    return s;
  }

  return { trial, predict, summary, probeSeries, state };
}
