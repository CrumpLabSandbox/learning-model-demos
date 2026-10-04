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
// present now.
//
// - Each stimulus (each cue, the context, and the outcome) is a vector of F
//   features, each +1 or -1 at random, in its own field of the event
//   vector. A stimulus that is absent leaves its field at 0.
// - Memory M is a list of traces, one per trial, each the length of the
//   event vector.
// - On a trial, the probe P is the event with the outcome field left at 0:
//   what the learner sees before the outcome. For every trace i:
//     similarity   S_i = Σ_j P_j M_ij / (√(Σ_j P_j²) √(Σ_j M_ij²))
//     activation   A_i = S_i^k   (k = 3 in the paper; the sign is kept)
//   and the echo is C_j = Σ_i A_i M_ij, divided by its largest |C_j| so that
//   its biggest feature is ±1.
// - The expectancy of the outcome is how well the outcome field of the
//   echo matches the outcome: X = Σ_{j in outcome} C_j O_j / F, from -1 to 1.
// - What is stored is the discrepancy between the event E (now with the
//   outcome, if it happened) and the echo: M_new,j = E_j - C_j, with each
//   feature stored with probability L and left at 0 otherwise.
//
// Choices made here, where the paper leaves room or this site adds to it:
// - Many simulated learners are run on the same trial sequence, each with
//   its own random stimulus vectors and its own random storage, and the
//   chart shows their mean and spread. The detailed views follow learner 1.
// - A cue's salience s multiplies the chance that its features are stored
//   (L × s). The paper does not model salience; s = 1 for every cue by
//   default, so nothing changes unless a design sets it.
// - A bigger outcome, A+(2), multiplies the outcome's features by its size
//   in the event. Expectancy still compares the echo with the plain outcome.
// - Memory starts empty: the first echo is all zeros, so the first trace is
//   the event itself.
// - The prediction for a cue or compound is the expectancy when it is
//   presented in the context, if the design has one, because that is where
//   the learner meets it.
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

export const salienceKey = (cue) => `s_${cue}`;

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
    { key: 'L', sym: 'L', label: 'Learning rate: chance each feature is stored', min: 0.05, max: 1, step: 0.05, default: 0.6, role: 'modeller', active: true },
    { key: 'k', sym: 'k', label: 'Similarity exponent', min: 1, max: 9, step: 2, default: 3, role: 'modeller', active: true },
  ];
  for (const c of cues) {
    ps.push({ key: `s_${c}`, sym: 's', cue: c, label: `Salience of ${c}`, min: 0.05, max: 1, step: 0.05, default: 1, role: 'modeller', active: true, advanced: true });
  }
  ps.push({ key: 'learners', sym: 'N', label: 'Simulated learners', min: 1, max: 100, step: 1, default: 25, role: 'experimenter', active: true });
  ps.push({ key: 'F', sym: 'F', label: 'Features per stimulus', min: 4, max: 60, step: 2, default: 20, role: 'modeller', active: true, advanced: true });
  return ps;
}

const OUT = 'outcome';

// Cosine similarity of a probe and a trace, using only the probe's fields
// (the probe is 0 everywhere else).
export function similarity(probe, pnorm, probeFields, trace, tnorm, F) {
  if (pnorm === 0 || tnorm === 0) return 0;
  let dot = 0;
  for (const f of probeFields) for (let j = f * F; j < (f + 1) * F; j++) dot += probe[j] * trace[j];
  return dot / (pnorm * tnorm);
}

// S^k with the sign of S, so an odd or even k both keep "opposite" negative.
export const activation = (S, k) => Math.sign(S) * Math.abs(S) ** k;

export function init(params, cues, opts = {}, rng, { context = null } = {}) {
  const o = { discrepancy: true, ...opts };
  const F = Math.round(params.F);
  const k = params.k;
  const fields = [...cues, OUT];
  const D = fields.length * F;
  const fieldIndex = Object.fromEntries(fields.map((f, i) => [f, i]));
  const outField = fieldIndex[OUT];
  const N = Math.max(1, Math.round(params.learners));
  const random = rng ? rng.random : Math.random;
  const pStore = fields.map((f) => (f === OUT || f === context ? params.L : params.L * (params[`s_${f}`] ?? 1)));

  function makeLearner() {
    const vectors = fields.map(() => Float64Array.from({ length: F }, () => (random() < 0.5 ? -1 : 1)));
    return { vectors, traces: [], norms: [], echoes: new Map() };
  }
  const learners = Array.from({ length: N }, makeLearner);

  // The probe for a set of cues: their vectors in their fields, 0 elsewhere.
  function probeFor(learner, present) {
    const probe = new Float64Array(D);
    const probeFields = [];
    for (const c of present) {
      const f = fieldIndex[c];
      if (f === undefined) continue;
      probeFields.push(f);
      probe.set(learner.vectors[f], f * F);
    }
    let ss = 0;
    for (const f of probeFields) for (let j = f * F; j < (f + 1) * F; j++) ss += probe[j] * probe[j];
    return { probe, probeFields, pnorm: Math.sqrt(ss) };
  }

  // The raw echo for a probe, Σ A_i M_i over every trace so far. Traces never
  // change once stored, so each probe keeps a running sum and only adds the
  // traces stored since it was last asked.
  function rawEcho(learner, present) {
    const key = [...present].sort().join('');
    let e = learner.echoes.get(key);
    if (!e) {
      e = { ...probeFor(learner, present), sum: new Float64Array(D), seen: 0 };
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

  // The echo divided by its largest feature, and the expectancy it gives.
  function readEcho(learner, sum) {
    let max = 0;
    for (let j = 0; j < D; j++) max = Math.max(max, Math.abs(sum[j]));
    const echo = new Float64Array(D);
    if (max > 0) for (let j = 0; j < D; j++) echo[j] = sum[j] / max;
    const out = learner.vectors[outField];
    let x = 0;
    for (let j = 0; j < F; j++) x += echo[outField * F + j] * out[j];
    return { echo, max, expectancy: x / F };
  }

  const withContext = (cs) => (context && !cs.includes(context) ? [...cs, context] : cs);

  function expectancies(present) {
    return learners.map((l) => readEcho(l, rawEcho(l, withContext(present)).sum).expectancy);
  }
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = (xs) => {
    const m = mean(xs);
    return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : 0;
  };

  function trial({ cues: present, reinforced, magnitude }) {
    const mag = reinforced ? (magnitude ?? 1) : 0;
    const all = [];
    let detail = null;
    learners.forEach((learner, n) => {
      // #region update
      // 1. Retrieve: the probe is what is present before the outcome. Every
      //    trace answers in proportion to its similarity to the probe, raised
      //    to the power k, and the answers add up to the echo.
      const e = rawEcho(learner, present);
      const { echo, max, expectancy } = readEcho(learner, e.sum);
      // 2. The event: the probe, plus the outcome if it happened.
      const event = new Float64Array(e.probe);
      if (mag) for (let j = 0; j < F; j++) event[outField * F + j] = mag * learner.vectors[outField][j];
      // 3. Store a new trace: what happened minus what was expected (the
      //    discrepancy), each feature kept with probability L.
      const trace = new Float64Array(D);
      const stored = new Uint8Array(D);
      for (let j = 0; j < D; j++) {
        if (random() < pStore[Math.floor(j / F)]) {
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
        detail = { probe: e.probe, sims, acts, echo, echoMax: max, expectancy, event, trace, stored, before: learner.traces.length };
      }
      let ss = 0;
      for (let j = 0; j < D; j++) ss += trace[j] * trace[j];
      learner.traces.push(trace);
      learner.norms.push(Math.sqrt(ss));
      all.push(expectancy);
    });
    // The trace that answered most strongly, for the worked numbers.
    let top = -1;
    detail.acts.forEach((a, i) => {
      if (top < 0 || a > detail.acts[top]) top = i;
    });
    const tr = top >= 0 ? learners[0].traces[top] : null;
    return {
      reinforced,
      magnitude: mag,
      L: params.L,
      k,
      F,
      N,
      fields,
      context,
      expectancy: mean(all),
      expectancySD: sd(all),
      learner: {
        ...detail,
        top,
        topSim: top >= 0 ? detail.sims[top] : 0,
        topAct: top >= 0 ? detail.acts[top] : 0,
        topDot: top >= 0 ? detail.sims[top] * norm(detail.probe) * learners[0].norms[top] : 0,
        probeNorm: norm(detail.probe),
        topNorm: top >= 0 ? learners[0].norms[top] : 0,
        topTrace: tr,
        storedCount: detail.stored.reduce((a, b) => a + b, 0),
        traces: learners[0].traces,
        vectors: learners[0].vectors,
      },
    };
  }

  function norm(v) {
    let ss = 0;
    for (let j = 0; j < v.length; j++) ss += v[j] * v[j];
    return Math.sqrt(ss);
  }

  return {
    trial,
    predict: (present) => mean(expectancies(present)),
    spread: (present) => sd(expectancies(present)),
    state: () => ({}),
  };
}
