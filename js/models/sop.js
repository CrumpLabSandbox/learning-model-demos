// SOP: Wagner's "sometimes opponent process" model.
//
// Wagner, A. R. (1981). SOP: A model of automatic memory processing in
// animal behavior. In N. E. Spear & R. R. Miller (Eds.), Information
// processing in animals: Memory mechanisms (pp. 5-47). Erlbaum.
// Mazur, J. E., & Wagner, A. R. (1982). An episodic model of associative
// learning. In M. L. Commons, R. J. Herrnstein, & A. R. Wagner (Eds.),
// Quantitative analyses of behavior: Vol. 3. Acquisition (pp. 3-39).
// Ballinger.
// Brandon, S. E., Vogel, E. H., & Wagner, A. R. (2003). Stimulus
// representation in SOP: I. Theoretical rationalization and some
// implications. Behavioural Processes, 62, 5-25.
//
// Every stimulus (each cue and the US) is a node made of many elements. At
// any moment each element is in one of three states: inactive (I), primary
// activity (A1), or secondary activity (A2). The model tracks the
// proportion of each node's elements in each state, so p_I + p_A1 + p_A2 = 1.
// Time runs in moments. On each moment, for each node:
//   presentation      while the stimulus is on, inactive elements go to A1
//                     with probability p1 (the cue's salience, or the US's
//                     intensity)
//   decay             A1 elements fall to A2 with probability pd1, and A2
//                     elements fall back to inactive with probability pd2
//                     (pd1 > pd2: A2 lingers)
//   associative       a cue sends inactive elements of the nodes it is
//   activation        linked to straight into A2, with probability
//                     p2 = Σ V (r1 p_A1,cue + r2 p_A2,cue) over the linked
//                     cues, kept between 0 and 1 (Mazur & Wagner, Eqs. 1.1
//                     and 1.2). This is how a cue "retrieves" the US: it
//                     calls up the US's A2 state, not its A1 state. r2 is
//                     small (0.01 in the papers), so A1 does nearly all of it.
//   distractor        the memory system holds only so much activity. When
//   rules             presentation puts Δp_A1 of some node's elements into A1
//                     on a moment, every node's decay from A1 is faster on
//                     that moment, pd1' = pd1 + Δp_A1 / C1, and likewise
//                     associative activation into A2 raises every node's
//                     decay from A2, pd2' = pd2 + Δp_A2 / C2 (Eqs. 1.3 and
//                     1.4). So a US coming on knocks the cue's elements out
//                     of A1 faster, and a stimulus after the trial cuts the
//                     trial's learning short.
// Learning, for each cue and the US (Eqs. 1.5 to 1.7):
//   ΔV = L⁺ Σ p_A1,cue p_A1,US − L⁻ Σ p_A1,cue p_A2,US,  summed over moments
// Excitation when the cue and the US are both in A1; inhibition when the
// cue is in A1 while the US is in A2. Learning slows as the cue comes to
// retrieve the US, because retrieval moves US elements into A2 before the
// US arrives: fewer are left to go to A1, and more sit in A2.
//
// Choices made here, where the papers leave room:
// - Presentation acts before associative activation: p2 applies to the
//   inactive elements that presentation did not take.
// - The distractor increments Δp_A1 and Δp_A2 are the elements that
//   presentation and associative activation move on that moment, summed over
//   every node. Decay itself does not count, so that a stimulus left alone
//   follows the papers' decay functions (Mazur & Wagner, Eqs. 1.9 and 1.10)
//   exactly. The option "Activity limits" switches the distractor rules off.
// - Learning uses the proportions after each moment's changes. The
//   increments of all moments of a trial, including the interval after it,
//   are added up and V changes once, at the end. Mazur and Wagner (1982)
//   likewise apply a trial's changes only at the next presentation. So V is
//   constant inside a trial, and the trial's learning is the area of
//   overlap on the timeline.
// - Every cue also links to every other cue, learned with the same rule.
//   This is how a context comes to retrieve a cue that is often shown in it
//   (latent inhibition by priming). The option "Cues link to each other"
//   switches it off. The US links to nothing.
// - The size of the US, A+(2), multiplies its intensity p1 (up to 1): a
//   bigger US activates its elements faster, before the cues can call them
//   up into A2.
// - The response is R = w1 p_A1,US + w2 p_A2,US (Wagner, 1981, Fig. 1.3).
//   The trial's conditioned response is the mean of R over the moments the
//   cue is on before the US arrives.
// - Every node starts inactive. The context is on at every moment.
// - The default values are this page's, chosen so that the classic effects
//   appear with one set of numbers and V levels off near 1. The papers'
//   simulations used p1,US = 0.6, p1,CS = 0.3 (0.1 for long cues), pd1 = 0.1,
//   pd2 = 0.02, L⁺ = 0.1, L⁻ = 0.02, r1 = 1, r2 = 0.01, C1 = 2, C2 = 10,
//   and tests/sop.test.js reproduces their figures with those values. Two
//   relations the papers keep are kept here: pd1 = 5 pd2 and C2 = 5 C1. The
//   papers also set L⁺ = 5 L⁻ so that a static context gains no net
//   strength; here L⁻ is smaller than that, because the context on this
//   page switches on and off with each trial and so turned inhibitory with
//   the papers' ratio. r1 is 0.55 rather than 1 only to set the scale of V.

export const id = 'sop';
export const name = 'SOP';
export const year = 1981;
export const citation =
  'Wagner, A. R. (1981). SOP: A model of automatic memory processing in animal behavior. In N. E. Spear & R. R. Miller (Eds.), Information processing in animals: Memory mechanisms (pp. 5–47). Erlbaum.';
// Runs moment by moment: trial records carry the moments, for the timeline.
export const realTime = true;
// The phenomenon checks that compare responses read this per-cue series
// (see the test presentation below), not V.
export const responseKey = 'recall';
// What the prediction chart shows for this model.
export const predictionTitle = 'Link strength V';

export const salienceKey = (cue) => `p1_${cue}`;

export const options = [
  {
    key: 'retrieval',
    label: 'Associative activation',
    default: true,
    help: 'On: a cue in A1 sends elements of what it is linked to straight into A2, so a trained cue calls up the US before it arrives. Off: only presenting a stimulus activates it.',
  },
  {
    key: 'inhibition',
    label: 'Inhibitory learning',
    default: true,
    help: 'On: a cue in A1 while the US is in A2 loses strength (the L⁻ term). Off: strength can only grow.',
  },
  {
    key: 'links',
    label: 'Cues link to each other',
    default: true,
    help: 'On: every cue also learns about every other cue, so a context can come to call up a cue shown in it. Off: cues learn only about the US.',
  },
  {
    key: 'distractors',
    label: 'Activity limits (distractor rules)',
    default: true,
    help: 'On: memory holds only so much activity, so when a stimulus comes on, every node\'s elements fall out of A1 faster on that moment (and out of A2 when a cue calls something up). A US knocks the cue out of A1 sooner, and a stimulus after a trial cuts its learning short. Off: decay runs at fixed rates whatever else happens.',
  },
];

export function parameters(cues, opts = {}, { context = null } = {}) {
  const ps = cues.map((c) => ({
    key: `p1_${c}`,
    sym: 'p1',
    cue: c,
    label: c === context ? `Salience of the context ${c}` : `Salience of ${c}`,
    min: 0,
    max: 1,
    step: 0.01,
    default: c === context ? 0.05 : 0.2,
    role: 'modeller',
    active: true,
  }));
  ps.push({ key: 'p1US', sym: 'p1US', label: 'US intensity', min: 0, max: 1, step: 0.05, default: 0.5, role: 'experimenter', active: true });
  ps.push({ key: 'Lp', sym: 'Lp', label: 'Excitatory learning rate', min: 0, max: 1, step: 0.01, default: 0.3, role: 'modeller', active: true });
  ps.push({ key: 'Lm', sym: 'Lm', label: 'Inhibitory learning rate', min: 0, max: 0.2, step: 0.005, default: 0.02, role: 'modeller', active: opts.inhibition !== false });
  ps.push({ key: 'pd1', sym: 'pd1', label: 'Decay from A1 to A2', min: 0.01, max: 1, step: 0.01, default: 0.15, role: 'modeller', active: true, advanced: true });
  ps.push({ key: 'pd2', sym: 'pd2', label: 'Decay from A2 to inactive', min: 0.005, max: 1, step: 0.005, default: 0.03, role: 'modeller', active: true, advanced: true });
  ps.push({ key: 'r1', sym: 'r1', label: 'Retrieval by a cue in A1', min: 0, max: 2, step: 0.05, default: 0.55, role: 'modeller', active: opts.retrieval !== false, advanced: true });
  ps.push({ key: 'r2', sym: 'r2', label: 'Retrieval by a cue in A2', min: 0, max: 0.5, step: 0.01, default: 0.01, role: 'modeller', active: opts.retrieval !== false, advanced: true });
  ps.push({ key: 'C1', sym: 'C1', label: 'Room for activity in A1', min: 0.5, max: 10, step: 0.5, default: 2, role: 'modeller', active: opts.distractors !== false, advanced: true });
  ps.push({ key: 'C2', sym: 'C2', label: 'Room for activity in A2', min: 1, max: 50, step: 1, default: 10, role: 'modeller', active: opts.distractors !== false, advanced: true });
  ps.push({ key: 'w1', sym: 'w1', label: 'Response weight for US in A1', min: -1, max: 1, step: 0.1, default: 1, role: 'modeller', active: true, advanced: true });
  ps.push({ key: 'w2', sym: 'w2', label: 'Response weight for US in A2', min: -1, max: 1, step: 0.1, default: 0.5, role: 'modeller', active: true, advanced: true });
  return ps;
}

const US = 'US';
const TEST_MOMENTS = 10;

export function init(params, cues, opts = {}, _rng, { context = null } = {}) {
  const o = { retrieval: true, inhibition: true, links: true, distractors: true, ...opts };
  const nodes = [...cues, US];
  // Proportions of each node's elements in A1 and A2; the rest are inactive.
  const A1 = Object.fromEntries(nodes.map((n) => [n, 0]));
  const A2 = Object.fromEntries(nodes.map((n) => [n, 0]));
  // V[i][j]: the link from cue i to node j. V[i].US is i's strength.
  const V = Object.fromEntries(cues.map((i) => [i, Object.fromEntries(nodes.filter((j) => j !== i).map((j) => [j, 0]))]));
  const cueTargets = Object.fromEntries(cues.map((i) => [i, cues.filter((j) => j !== i)]));

  function predict(present) {
    return present.reduce((s, c) => s + (V[c]?.US ?? 0), 0);
  }

  function trial({ cues: present, reinforced, magnitude, timing }) {
    const mag = reinforced ? (magnitude ?? 1) : 0;
    const usP1 = Math.min(1, params.p1US * mag);
    const t = timing ?? { cs: [1, 10], us: reinforced ? [9, 10] : null, iti: 100 };
    const window = Math.max(t.cs ? t.cs[1] : 0, t.us ? t.us[1] : 0, 1);
    const length = window + t.iti;
    const punctate = present.filter((c) => c !== context);
    const Vbefore = Object.fromEntries(cues.map((c) => [c, V[c].US]));
    const links = Object.fromEntries(cues.map((i) => [i, { ...V[i] }]));
    const series = (n) => Object.fromEntries(n.map((k) => [k, new Float64Array(length)]));
    const start = { A1: { ...A1 }, A2: { ...A2 } };
    const m = {
      length,
      window,
      nodes,
      start,
      on: series(nodes),
      A1: series(nodes),
      A2: series(nodes),
      p2: series(nodes),
      // The decay rates in force on each moment: the parameters, raised by
      // the distractor rules when something comes on.
      pd1: new Float64Array(length),
      pd2: new Float64Array(length),
      response: new Float64Array(length),
    };
    const dV = Object.fromEntries(cues.map((i) => [i, Object.fromEntries(Object.keys(V[i]).map((j) => [j, 0]))]));
    const ovE = Object.fromEntries(cues.map((c) => [c, 0]));
    const ovI = Object.fromEntries(cues.map((c) => [c, 0]));
    let crSum = 0;
    let crN = 0;
    // When each node is on during this trial, and its p1 while it is.
    const span = {};
    const salience = {};
    for (const n of nodes) {
      if (n === US) span[n] = t.us;
      else if (n === context) span[n] = [1, length];
      else span[n] = punctate.includes(n) ? t.cs : null;
      salience[n] = n === US ? usP1 : params[`p1_${n}`];
    }
    // Who can call up whom: every cue calls up the US, and other cues too
    // when cues link to each other.
    const callers = Object.fromEntries(nodes.map((j) => [j, o.retrieval && (j === US || o.links) ? cues.filter((i) => i !== j) : []]));

    for (let k = 0; k < length; k++) {
      const moment = k + 1;
      const isOn = (n) => Boolean(span[n]) && moment >= span[n][0] && moment <= span[n][1];
      // #region update
      // 1. Associative activation: the active cues call up what they are
      //    linked to. p2 for each node, from the start of this moment: the
      //    linked cues' V times their activity, mostly A1 (r1) and a little
      //    A2 (r2).
      const p2 = {};
      for (const j of nodes) {
        let sum = 0;
        for (const i of callers[j]) sum += V[i][j] * (params.r1 * A1[i] + params.r2 * A2[i]);
        p2[j] = Math.min(1, Math.max(0, sum));
      }
      // 2. What enters each state this moment: presentation puts inactive
      //    elements into A1, and calling up puts the rest into A2.
      const toA1 = {};
      const toA2 = {};
      let enteringA1 = 0;
      let enteringA2 = 0;
      for (const n of nodes) {
        const p1 = isOn(n) ? salience[n] : 0;
        const inactive = 1 - A1[n] - A2[n];
        toA1[n] = p1 * inactive;
        toA2[n] = p2[n] * (inactive - toA1[n]);
        enteringA1 += toA1[n];
        enteringA2 += toA2[n];
      }
      // 3. Distractor rules: memory holds only so much activity, so what
      //    enters a state this moment speeds every node's decay out of it.
      const pd1 = Math.min(1, params.pd1 + (o.distractors ? enteringA1 / params.C1 : 0));
      const pd2 = Math.min(1, params.pd2 + (o.distractors ? enteringA2 / params.C2 : 0));
      // 4. Each node's elements move between states.
      for (const n of nodes) {
        const decay1 = pd1 * A1[n];
        const decay2 = pd2 * A2[n];
        A1[n] = A1[n] + toA1[n] - decay1;
        A2[n] = A2[n] + toA2[n] + decay1 - decay2;
      }
      // 5. Learning on this moment, for each cue and the US:
      //    excitation when both are in A1, inhibition when the US is in A2.
      for (const c of cues) {
        const excite = A1[c] * A1[US];
        const inhibit = o.inhibition ? A1[c] * A2[US] : 0;
        ovE[c] += excite;
        ovI[c] += inhibit;
        dV[c][US] += params.Lp * excite - params.Lm * inhibit;
      }
      // #endregion
      // Cue-to-cue links learn by the same rule.
      if (o.links) {
        for (const i of cues) {
          if (A1[i] === 0) continue;
          for (const j of cueTargets[i]) {
            dV[i][j] += params.Lp * A1[i] * A1[j] - (o.inhibition ? params.Lm * A1[i] * A2[j] : 0);
          }
        }
      }
      const R = params.w1 * A1[US] + params.w2 * A2[US];
      for (const n of nodes) {
        m.on[n][k] = isOn(n) ? 1 : 0;
        m.A1[n][k] = A1[n];
        m.A2[n][k] = A2[n];
        m.p2[n][k] = p2[n];
      }
      m.pd1[k] = pd1;
      m.pd2[k] = pd2;
      m.response[k] = R;
      const csOn = t.cs && moment >= t.cs[0] && moment <= t.cs[1] && punctate.length;
      if (csOn && !(t.us && moment >= t.us[0])) {
        crSum += R;
        crN += 1;
      }
    }

    // 6. Apply the trial's learning.
    for (const i of cues) for (const j of Object.keys(dV[i])) V[i][j] += dV[i][j];

    const perCue = Object.fromEntries(
      cues.map((c) => [
        c,
        {
          p1: params[`p1_${c}`],
          overlapExcite: ovE[c],
          overlapInhibit: ovI[c],
          excite: params.Lp * ovE[c],
          inhibit: params.Lm * ovI[c],
          deltaV: dV[c][US],
          Vafter: V[c].US,
        },
      ]),
    );
    return {
      reinforced,
      magnitude: mag,
      timing: t,
      context,
      Lp: params.Lp,
      Lm: params.Lm,
      r1: params.r1,
      r2: params.r2,
      C1: params.C1,
      C2: params.C2,
      pd1: params.pd1,
      pd2: params.pd2,
      p1US: params.p1US,
      w1: params.w1,
      w2: params.w2,
      usP1,
      Vbefore,
      Vafter: Object.fromEntries(cues.map((c) => [c, V[c].US])),
      links,
      perCue,
      response: crN ? crSum / crN : null,
      moments: m,
    };
  }

  // A test presentation: the cue alone, from rest, for TEST_MOMENTS, with
  // no learning. Returns the mean proportion of US elements it calls up
  // into A2: what the animal would expect if it met the cue now.
  function test(cue) {
    const a1 = Object.fromEntries(nodes.map((n) => [n, 0]));
    const a2 = Object.fromEntries(nodes.map((n) => [n, 0]));
    let total = 0;
    for (let k = 0; k < TEST_MOMENTS; k++) {
      const p2 = {};
      for (const j of nodes) {
        let sum = 0;
        if (o.retrieval) for (const i of cues) if (i !== j && (j === US || o.links)) sum += V[i][j] * (params.r1 * a1[i] + params.r2 * a2[i]);
        p2[j] = Math.min(1, Math.max(0, sum));
      }
      const toA1 = {};
      const toA2 = {};
      let e1 = 0;
      let e2 = 0;
      for (const n of nodes) {
        const p1 = n === cue ? params[`p1_${n}`] : 0;
        const inactive = 1 - a1[n] - a2[n];
        toA1[n] = p1 * inactive;
        toA2[n] = p2[n] * (inactive - toA1[n]);
        e1 += toA1[n];
        e2 += toA2[n];
      }
      const pd1 = Math.min(1, params.pd1 + (o.distractors ? e1 / params.C1 : 0));
      const pd2 = Math.min(1, params.pd2 + (o.distractors ? e2 / params.C2 : 0));
      for (const n of nodes) {
        const d1 = pd1 * a1[n];
        const d2 = pd2 * a2[n];
        a1[n] += toA1[n] - d1;
        a2[n] += toA2[n] + d1 - d2;
      }
      total += a2[US];
    }
    return total / TEST_MOMENTS;
  }

  return {
    trial,
    predict,
    state: () => ({
      V: Object.fromEntries(cues.map((c) => [c, V[c].US])),
      recall: Object.fromEntries(cues.map((c) => [c, test(c)])),
    }),
  };
}
