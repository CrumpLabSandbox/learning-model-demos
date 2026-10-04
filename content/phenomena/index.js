// Classic phenomena, as designs plus a check of whether a run shows the
// effect. The check measures the run, so the pass or fail badge is computed
// from the model, never typed by hand.
//
// Each phenomenon has:
//   design    trial-design text (see js/core/design.js)
//   empirical one sentence on what animals or people do, with a citation
//   criterion how the check decides, in words
//   check     (run, h) -> { shown, measure }   h has at(), final(), phaseEnd(), phaseValues(), margin
//   params    optional parameter values this design needs, applied when it is loaded
//   focus     the trial and cue to show first: { t } or { phase }, and { cue }
//   models    per model: why the model does or does not show it (naming the
//             responsible term) and something to try

import { fmt } from '../../js/core/format.js';

const f = (x) => fmt(x, 2);

export const phenomena = [
  {
    id: 'acquisition',
    title: 'Acquisition',
    focus: { t: 1, cue: 'A' },
    design: 'Training: 30 A+',
    empirical:
      'Pairing a cue with an outcome makes the response to the cue grow, quickly at first and then more slowly.',
    citation: 'Pavlov (1927)',
    criterion: 'V for A ends near the outcome value, and the first step is larger than the last.',
    check(run, h) {
      const v = h.phaseValues(run, 0, 'A');
      const first = v[1] - v[0];
      const last = v[v.length - 1] - v[v.length - 2];
      const end = h.final(run, 'A');
      return {
        shown: end > 0.5 * h.lambda && first > last,
        measure: `A ends at ${f(end)}; first step ${f(first)}, last step ${f(last)}.`,
      };
    },
    models: {
      'rescorla-wagner': {
        why: 'The error λ − ΣV is large on the first trial, so the step is large. As V_A approaches λ the error shrinks, so each step is smaller than the one before. The curve levels off at λ, where the error is zero.',
        tryThis: 'Move the outcome magnitude slider and watch where the curve levels off. Then raise β and watch it get there faster.',
      },
    },
  },
  {
    id: 'extinction',
    title: 'Extinction',
    focus: { phase: 1, cue: 'A' },
    design: 'Acquisition: 20 A+\nExtinction: 30 A-',
    empirical: 'After training, presenting the cue without the outcome makes the response fade.',
    citation: 'Pavlov (1927)',
    criterion: 'V for A at the end of extinction is less than half its value at the end of acquisition.',
    check(run, h) {
      const a = h.phaseEnd(run, 0, 'A');
      const e = h.final(run, 'A');
      return { shown: a > 0.1 && e < 0.5 * a, measure: `A is ${f(a)} after acquisition and ${f(e)} after extinction.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'On A− trials λ is 0, so the error 0 − V_A is negative and V_A falls back toward 0. The model treats extinction as unlearning, which is why it cannot explain the response coming back later (spontaneous recovery).',
        tryThis: 'Turn on "Separate β for non-reinforced trials" and make β⁻ small. Extinction becomes slower than acquisition.',
      },
    },
  },
  {
    id: 'salience',
    title: 'Salience',
    focus: { t: 1, cue: 'A' },
    design: 'Training: 20 A+, 20 B+',
    params: { alpha_A: 0.5, alpha_B: 0.1 },
    empirical: 'A more intense or noticeable cue is learned about faster than a faint one.',
    citation: 'Kamin & Schaub (1963)',
    criterion: 'Halfway through training, V for the more salient cue A is ahead of V for B.',
    check(run, h) {
      const v = h.phaseValues(run, 0, 'A');
      const w = h.phaseValues(run, 0, 'B');
      const mid = Math.floor(v.length / 2);
      return {
        shown: v[mid] - w[mid] > h.margin,
        measure: `Halfway: A is ${f(v[mid])}, B is ${f(w[mid])}.`,
      };
    },
    models: {
      'rescorla-wagner': {
        why: 'α_A is larger than α_B, so every step for A is larger. Both still level off at λ, because α changes the speed of learning, not where it ends.',
        tryThis: 'Set the two salience sliders equal and the lines become one. In "Build the equation", stage 1 has no α at all.',
      },
    },
  },
  {
    id: 'blocking',
    title: 'Blocking',
    focus: { phase: 1, cue: 'B' },
    design: 'Pretraining: 20 A+\nCompound: 20 AB+, 20 CD+',
    empirical:
      'A cue added to one that already predicts the outcome gains little strength. B, added to the pretrained A, ends up weaker than D, trained in a new compound.',
    citation: 'Kamin (1969)',
    criterion: 'V for B ends below V for D.',
    check(run, h) {
      const b = h.final(run, 'B');
      const d = h.final(run, 'D');
      return { shown: d - b > h.margin, measure: `B ends at ${f(b)}, D at ${f(d)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'On AB+ trials, ΣV = V_A + V_B is already close to λ because of A, so the shared error λ − ΣV is close to 0 and B gains almost nothing. The term that does this is ΣV: B is blocked because it shares A\'s error.',
        tryThis: 'Turn off "Summed error". Each cue then learns from its own error, and blocking disappears. Or shorten pretraining to 2 A+ trials.',
      },
    },
  },
  {
    id: 'overshadowing',
    title: 'Overshadowing',
    focus: { t: 1, cue: 'B' },
    design: 'Training: 30 AB+, 30 C+',
    empirical:
      'A cue trained in a compound gains less strength than the same cue trained alone. B, trained with A, ends up weaker than C, trained alone.',
    citation: 'Pavlov (1927)',
    criterion: 'V for B ends below V for C.',
    check(run, h) {
      const b = h.final(run, 'B');
      const c = h.final(run, 'C');
      return { shown: c - b > h.margin, measure: `B ends at ${f(b)}, C at ${f(c)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'A and B share one error, so together they can only reach λ. They split it in the ratio of their saliences α_A : α_B. C has no partner and gets all of λ.',
        tryThis: 'Raise the salience of A. B gets a smaller share, and A a larger one.',
      },
    },
  },
  {
    id: 'conditioned-inhibition',
    title: 'Conditioned inhibition',
    focus: { t: 4, cue: 'X' },
    design: 'Training: 40 A+, 40 AX-',
    empirical:
      'A cue that signals the outcome will not happen, when it otherwise would, becomes an inhibitor: it reduces the response to other cues.',
    citation: 'Pavlov (1927); Rescorla (1969)',
    criterion: 'V for X ends below zero.',
    check(run, h) {
      const x = h.final(run, 'X');
      return { shown: x < -h.margin, measure: `X ends at ${f(x)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'On AX− trials, A brings a positive prediction, so ΣV is above λ = 0 and the shared error is negative. X is present, so it loses strength and goes below zero. It is the summed error that pushes X negative.',
        tryThis: 'Turn off "Summed error". X\'s own error is 0 − V_X = 0, so X never moves.',
      },
    },
  },
  {
    id: 'latent-inhibition',
    title: 'Latent inhibition',
    focus: { t: 1, cue: 'A' },
    design: 'Pre-exposure: 30 A-\nConditioning: 15 A+, 15 B+',
    empirical:
      'A cue that has been presented many times on its own, with nothing following it, is learned about more slowly later.',
    citation: 'Lubow & Moore (1959)',
    criterion:
      'During conditioning, V for the pre-exposed A is behind V for the new cue B, comparing each cue after the same number of its own trials.',
    check(run, h) {
      const { start, end } = run.phases[1];
      const after = (cue) =>
        run.trials.filter((t) => t.index >= start && t.index <= end && t.present.includes(cue)).map((t) => h.at(run, cue, t.index));
      const a = after('A');
      const b = after('B');
      const n = Math.min(a.length, b.length);
      let gap = 0;
      for (let k = 0; k < n; k++) gap += (b[k] - a[k]) / n;
      return { shown: gap > h.margin / 2, measure: `Matched trial for trial, B is ahead of A by ${f(gap)} on average.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'During pre-exposure, V_A is 0 and λ is 0, so the error is 0 and nothing changes. α_A is a fixed parameter, so nothing about A is different afterwards. The model has no term that pre-exposure can change.',
        tryThis: 'Look at the trial table during pre-exposure: every ΔV is 0. The attention models (Mackintosh, Pearce-Hall) let α change, which is one way to fix this.',
      },
    },
  },
  {
    id: 'backward-blocking',
    title: 'Backward blocking',
    focus: { phase: 1, cue: 'B' },
    design: 'Compound: 20 AB+, 20 CD+\nElement: 20 A+',
    empirical:
      'After AB+ training, training A alone reduces the strength of B, even though B is never presented again. People show this clearly in causal judgment.',
    citation: 'Shanks (1985)',
    criterion: 'V for B ends below V for D.',
    check(run, h) {
      const b = h.final(run, 'B');
      const d = h.final(run, 'D');
      return { shown: d - b > h.margin, measure: `B ends at ${f(b)}, D at ${f(d)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'In the second phase B is absent, and the model only changes cues that are present. So ΔV_B is 0 on every A+ trial and B keeps exactly what it learned with A.',
        tryThis: 'Select a trial in the second phase and focus on B: the equation panel says B is not on the trial. Retrieval-based models such as MINERVA-AL handle this differently.',
      },
    },
  },
  {
    id: 'negative-patterning',
    title: 'Negative patterning',
    focus: { t: 6, cue: 'A' },
    design: 'Training: 40 A+, 40 B+, 40 AB-\nTest: A, B, AB',
    empirical:
      'Animals learn to respond to A alone and to B alone but not to the compound AB.',
    citation: 'Woodbury (1943); Rescorla (1972)',
    criterion: 'At the end, the prediction for AB is below the predictions for A and for B.',
    check(run, h) {
      const a = h.final(run, 'A');
      const b = h.final(run, 'B');
      const ab = h.final(run, 'AB');
      return {
        shown: a - ab > h.margin && b - ab > h.margin,
        measure: `A predicts ${f(a)}, B ${f(b)}, AB ${f(ab)}.`,
      };
    },
    models: {
      'rescorla-wagner': {
        why: 'The prediction for AB is V_A + V_B. For AB to be lower than both A and B, both strengths would have to be negative, but then A and B would not predict the outcome either. No parameter setting solves it, because the failure is in the summation ΣV itself.',
        tryThis: 'Try any parameters you like. Then compare with MINERVA-AL, where a compound is retrieved as its own pattern.',
      },
    },
  },
];

export function byId(id) {
  return phenomena.find((p) => p.id === id);
}
