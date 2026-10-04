// MINERVA-AL: an instance model of associative learning.
//
// Jamieson, R. K., Crump, M. J. C., & Hannah, S. D. (2012). An instance
// theory of associative learning. Learning & Behavior, 40, 61-82.
// Built on Hintzman's MINERVA 2: Hintzman, D. L. (1986). "Schema
// abstraction" in a multiple-trace memory model. Psychological Review, 93,
// 411-428.
//
// There is no associative strength. Every trial leaves a trace in memory,
// and expectations come from retrieving traces that resemble what is
// present now. Equation numbers are the paper's.
//
// - Each stimulus (each cue, the context, and the outcome X) has its own
//   field of F features (F = 20 in the paper), set to 1 when the stimulus is
//   present and 0 when it is absent. A cue's salience α multiplies its
//   features, and so does the size of the outcome, as the paper does for
//   overshadowing and for a muted outcome.
// - Memory M is a list of traces, one per trial. It starts empty.
// - On a trial, the probe P is the cues and the context: the event without
//   the outcome. For every trace i, similarity is the cosine computed over
//   the cue fields only (Eq. 7), so what a trace holds about the outcome
//   does not change how similar it is:
//     S_i = Σ_j P_j M_ij / (√(Σ_j P_j²) √(Σ_j M_ij²)),  j over the cue fields
//   activation  A_i = S_i^3                      (Eq. 2; the exponent k here)
//   echo        C_j = Σ_i A_i M_ij               (Eq. 3) plus noise drawn
//               from ±0.001 for every feature
//   normalized  C'_j = C_j / max|C|              (Eq. 4)
// - Retrieval of X given P (Eq. 5) is how well the outcome field of the
//   echo matches X: X|P = Σ_j X_j C'_j / n, with n the number of features in
//   X. It runs from -1 (the opposite of X) to 1 (X itself).
// - What is stored is the discrepancy between the event E (the probe plus
//   the outcome, if it happened) and the echo (Eq. 6): M_new,j = E_j - C'_j
//   with probability L, and 0 otherwise.
//
// Choices made here, where the paper leaves room or this site adds to it:
// - Many simulated learners (25 in the paper) are run on the same trial
//   sequence, each with its own random storage and echo noise, and the
//   chart shows their mean and spread. The detailed views follow learner 1.
// - The paper includes the context in every probe. When a design has no
//   Context line, the model adds a context of its own, which is never
//   plotted.
// - n in Eq. 5 is read as the number of nonzero features in X, so that
//   perfect retrieval gives 1, as in the paper's tables.
// - With "Store the discrepancy" off, the event itself is stored (with
//   probability L per feature), as in MINERVA 2.

export const id = 'minerva-al';
export const name = 'MINERVA-AL';
export const year = 2012;
export const citation =
  'Jamieson, R. K., Crump, M. J. C., & Hannah, S. D. (2012). An instance theory of associative learning. Learning & Behavior, 40, 61–82.';
export const status = 'preview';
// Keeps every trace: trial records point into learner 1's memory, for the
// memory view.
export const memory = true;

export const salienceKey = (cue) => `alpha_${cue}`;

export const options = [
  {
    key: 'discrepancy',
    label: 'Store the discrepancy',
    default: true,
    help: 'On: each trial stores what happened minus what was expected (the event minus the echo). Off: each trial stores the event itself, as in MINERVA 2.',
  },
];

export function parameters(cues) {
  const ps = [
    { key: 'L', sym: 'L', label: 'Learning rate: chance each feature is stored', min: 0.05, max: 1, step: 0.01, default: 0.67, role: 'modeller', active: true },
    { key: 'k', sym: 'k', label: 'Similarity exponent', min: 1, max: 9, step: 2, default: 3, role: 'modeller', active: true, advanced: true },
  ];
  for (const c of cues) {
    ps.push({ key: `alpha_${c}`, sym: 'alpha', cue: c, label: `Salience of ${c}`, min: 0.05, max: 1, step: 0.05, default: 1, role: 'modeller', active: true, advanced: true });
  }
  ps.push({ key: 'learners', sym: 'N', label: 'Simulated learners', min: 1, max: 100, step: 1, default: 25, role: 'experimenter', active: true });
  ps.push({ key: 'F', sym: 'F', label: 'Features per stimulus', min: 4, max: 60, step: 2, default: 20, role: 'modeller', active: true, advanced: true });
  ps.push({ key: 'noise', sym: 'noise', label: 'Echo noise (largest value)', min: 0, max: 0.1, step: 0.001, default: 0.001, role: 'modeller', active: true, advanced: true });
  return ps;
}

// Field names that can never clash with a cue, which is a capital letter.
export const OUTCOME = 'outcome';
// The context the model adds when the design names none.
export const OWN_CONTEXT = 'context';

// Cosine similarity of a probe and a trace over the cue fields (Eq. 7).
// The probe is 0 outside its own fields, so the dot product only needs
// those; the trace's length is over every cue field.
export function similarity(probe, pnorm, probeFields, trace, tnorm, F) {
  if (pnorm === 0 || tnorm === 0) return 0;
  let dot = 0;
  for (const f of probeFields) for (let j = f * F; j < (f + 1) * F; j++) dot += probe[j] * trace[j];
  return dot / (pnorm * tnorm);
}

// S^k with the sign of S kept, so that an even k still treats an opposite
// trace as opposite. For the paper's k = 3 this is just S³.
export const activation = (S, k) => Math.sign(S) * Math.abs(S) ** k;

export function init(params, cues, opts = {}, rng, { context = null } = {}) {
  const o = { discrepancy: true, ...opts };
  const F = Math.round(params.F);
  const k = params.k;
  const ctx = context ?? OWN_CONTEXT;
  // Fields: the cues, then the context, then the outcome last.
  const fields = [...cues.filter((c) => c !== ctx), ctx, OUTCOME];
  const D = fields.length * F;
  const fieldIndex = Object.fromEntries(fields.map((f, i) => [f, i]));
  const outField = fieldIndex[OUTCOME];
  const cueEnd = outField * F;
  const N = Math.max(1, Math.round(params.learners));
  const random = rng ? rng.random : Math.random;
  const salience = (f) => (f === ctx ? 1 : (params[`alpha_${f}`] ?? 1));

  const learners = Array.from({ length: N }, () => ({ traces: [], norms: [], echoes: new Map() }));

  // The probe for a set of cues, with the context: each present stimulus's
  // field set to its salience, 0 elsewhere.
  function probeFor(present) {
    const probe = new Float64Array(D);
    const probeFields = [];
    for (const c of new Set([...present, ctx])) {
      const f = fieldIndex[c];
      if (f === undefined || f === outField) continue;
      probeFields.push(f);
      probe.fill(salience(c), f * F, (f + 1) * F);
    }
    let ss = 0;
    for (let j = 0; j < cueEnd; j++) ss += probe[j] * probe[j];
    return { probe, probeFields, pnorm: Math.sqrt(ss) };
  }

  // Σ A_i M_i over the traces so far (Eq. 3, before noise). Traces never
  // change once stored, so each probe keeps a running sum and only adds the
  // traces stored since it was last used.
  function rawEcho(learner, present) {
    const key = [...new Set([...present, ctx])].sort().join('|');
    let e = learner.echoes.get(key);
    if (!e) {
      e = { ...probeFor(present), sum: new Float64Array(D), seen: 0 };
      learner.echoes.set(key, e);
    }
    for (let i = e.seen; i < learner.traces.length; i++) {
      const A = activation(similarity(e.probe, e.pnorm, e.probeFields, learner.traces[i], learner.norms[i], F), k);
      if (A !== 0) {
        const tr = learner.traces[i];
        for (let j = 0; j < D; j++) e.sum[j] += A * tr[j];
      }
    }
    e.seen = learner.traces.length;
    return e;
  }

  // Add noise, normalize (Eq. 4), and read off retrieval of X (Eq. 5).
  function readEcho(sum) {
    const echo = new Float64Array(D);
    let max = 0;
    for (let j = 0; j < D; j++) {
      echo[j] = sum[j] + params.noise * (2 * random() - 1);
      max = Math.max(max, Math.abs(echo[j]));
    }
    if (max > 0) for (let j = 0; j < D; j++) echo[j] /= max;
    let x = 0;
    for (let j = outField * F; j < (outField + 1) * F; j++) x += echo[j];
    return { echo, max, retrieval: x / F };
  }

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = (xs) => {
    const m = mean(xs);
    return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : 0;
  };
  // Retrieval of X for a probe, for every learner, without storing anything.
  const retrievals = (present) => learners.map((l) => readEcho(rawEcho(l, present).sum).retrieval);

  function cueNorm(v) {
    let ss = 0;
    for (let j = 0; j < cueEnd; j++) ss += v[j] * v[j];
    return Math.sqrt(ss);
  }

  function trial({ cues: present, reinforced, magnitude }) {
    const mag = reinforced ? (magnitude ?? 1) : 0;
    const all = [];
    let detail = null;
    learners.forEach((learner, n) => {
      // #region update
      // 1. Retrieve: the probe is what is present before the outcome. Every
      //    trace answers in proportion to its similarity to the probe, cubed,
      //    and the answers add up to the echo.
      const e = rawEcho(learner, present);
      const { echo, max, retrieval } = readEcho(e.sum);
      // 2. The event: the probe, plus the outcome if it happened.
      const event = new Float64Array(e.probe);
      if (mag) event.fill(mag, outField * F, (outField + 1) * F);
      // 3. Store a new trace: what happened minus what was expected (the
      //    discrepancy), each feature kept with probability L.
      const trace = new Float64Array(D);
      const stored = new Uint8Array(D);
      for (let j = 0; j < D; j++) {
        if (random() < params.L) {
          stored[j] = 1;
          trace[j] = o.discrepancy ? event[j] - echo[j] : event[j];
        }
      }
      // #endregion
      if (n === 0) {
        // Learner 1's retrieval, trace by trace, for the views.
        const sims = new Float64Array(learner.traces.length);
        const acts = new Float64Array(learner.traces.length);
        learner.traces.forEach((tr, i) => {
          sims[i] = similarity(e.probe, e.pnorm, e.probeFields, tr, learner.norms[i], F);
          acts[i] = activation(sims[i], k);
        });
        detail = { probe: e.probe, probeNorm: e.pnorm, sims, acts, echo, echoMax: max, retrieval, event, trace, stored, before: learner.traces.length };
      }
      learner.traces.push(trace);
      learner.norms.push(cueNorm(trace));
      all.push(retrieval);
    });
    // The trace that answered most strongly, for the worked numbers.
    let top = -1;
    detail.acts.forEach((a, i) => {
      if (top < 0 || Math.abs(a) > Math.abs(detail.acts[top])) top = i;
    });
    return {
      reinforced,
      magnitude: mag,
      L: params.L,
      k,
      F,
      N,
      noise: params.noise,
      fields,
      context: ctx,
      ownContext: !context,
      retrieval: mean(all),
      retrievalSD: sd(all),
      learner: {
        ...detail,
        top,
        topSim: top >= 0 ? detail.sims[top] : 0,
        topAct: top >= 0 ? detail.acts[top] : 0,
        topNorm: top >= 0 ? learners[0].norms[top] : 0,
        storedCount: detail.stored.reduce((a, b) => a + b, 0),
        traces: learners[0].traces,
      },
    };
  }

  return {
    trial,
    predict: (present) => mean(retrievals(present)),
    spread: (present) => sd(retrievals(present)),
    state: () => ({}),
  };
}
