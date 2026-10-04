// Classic phenomena, as designs plus a check of whether a run shows the
// effect. The check measures the run, so the pass or fail badge is computed
// from the model, never typed by hand.
//
// Each phenomenon has:
//   design    trial-design text (see js/core/design.js)
//   empirical one sentence on what animals or people do, with a citation
//   criterion how the check decides, in words
//   check     (run, h) -> { shown, measure }   h has at(), final(), phaseEnd(), phaseValues(),
//             response(), lambda, and margin
//   salience  optional salience per cue that this design needs, applied when it
//             is loaded; each model maps it to its own parameter (salienceKey)
//   focus     the trial and cue to show first: { t } or { phase }, and { cue }
//   predict   the lines a student sketches before running it, and the prompt
//   models    per model: why the model does or does not show it (naming the
//             responsible term) and something to try

import { fmt } from '../../js/core/format.js';

const f = (x) => fmt(x, 2);

export const phenomena = [
  {
    id: 'acquisition',
    title: 'Acquisition',
    predict: { cues: ['A'], prompt: 'A is followed by the outcome on every trial. Sketch how strongly you think A will predict the outcome over the 30 trials.' },
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
      mackintosh: {
        why: 'A learns from its own error, λ − V_A, which shrinks as V_A approaches λ, so the steps shrink. Meanwhile A becomes a better predictor than having no cue at all, so attention to A rises.',
        tryThis: 'Watch the attention chart: A\'s attention climbs as A starts to predict the outcome.',
      },
      'pearce-hall': {
        why: 'On the first trials the outcome is a surprise, so attention to A is high and A gains strength quickly (S α λ). As A comes to predict the outcome, the surprise shrinks, attention fades, and the steps get smaller.',
        tryThis: 'Watch the attention chart fall as the prediction line rises. Then set γ to 1, the 1980 model, and compare.',
      },
      sop: {
        why: "On the first trial the US arrives with all its elements inactive, so they go to A1 at the same moments as A's: a big overlap and a big gain. As V_A grows, A calls up the US into A2 before it arrives. Those elements cannot go to A1, so there is less to gain and more to lose. Learning levels off where the gain and the loss balance.",
        tryThis: "Step to trial 1, then trial 30, and compare the green and red areas in Inside the trial. Then switch off 'Associative activation': nothing calls up the US, and V climbs in a straight line.",
      },
    },
  },
  {
    id: 'extinction',
    title: 'Extinction',
    predict: { cues: ['A'], prompt: 'A is paired with the outcome, then shown alone. Sketch A through both phases.' },
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
      mackintosh: {
        why: 'On A− trials λ is 0, so A\'s own error is negative and V_A falls. A now predicts worse than having no cue at all, so attention to A drops, and that slows extinction down.',
        tryThis: 'Compare with Rescorla-Wagner: there A is back near 0 after extinction; here it is still around 0.3, because attention to A fell.',
      },
      'pearce-hall': {
        why: 'On A− trials the outcome falls short of A\'s prediction, so A gains inhibitory strength V̄ and its net prediction V − V̄ falls. The surprise of the missing outcome also brings attention to A back up, which speeds this along. Nothing is erased: extinction adds inhibition on top of the old learning.',
        tryThis: 'Look at the trial table: after extinction V_A is still about 1, and V̄_A has grown to match it. Then switch off \'Inhibitory learning\': extinction cannot happen at all.',
      },
      sop: {
        why: "On A− trials no US arrives, so nothing is in A1 alongside A and there is no gain. But A still calls up the US into A2 while A itself is in A1, so A loses strength. Once A no longer calls up the US, the loss stops, so V settles near 0.",
        tryThis: "Step to trial 21 and look at the dashed US line in Inside the trial: the US is called up although it never arrives. Then switch off 'Inhibitory learning': extinction cannot happen.",
      },
    },
  },
  {
    id: 'salience',
    title: 'Salience',
    predict: { cues: ['A', 'B'], prompt: 'A is much more noticeable than B. Both are always followed by the outcome. Sketch A and B.' },
    focus: { t: 1, cue: 'A' },
    design: 'Training: 20 A+, 20 B+',
    salience: { A: 0.5, B: 0.1 },
    empirical: 'A more intense or noticeable cue is learned about faster than a faint one.',
    citation: 'Kamin & Schaub (1963)',
    criterion: 'Halfway through training, the response to the more salient cue A is ahead of the response to B. For most models the response is V; for SOP it is how much of the US the cue calls up.',
    check(run, h) {
      const { start, end } = run.phases[0];
      const v = h.response(run, 'A').slice(start, end + 1);
      const w = h.response(run, 'B').slice(start, end + 1);
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
      mackintosh: {
        why: 'A starts with more attention (α_A at trial 0) than B, so every step for A is larger. Both still end at λ, because each cue learns from its own error.',
        tryThis: 'Set the two starting attentions equal and the lines become one.',
      },
      'pearce-hall': {
        why: 'S_A is larger than S_B, so every step for A is larger. Salience S never changes; attention α does.',
        tryThis: 'Set the two saliences equal and the lines become one.',
      },
      sop: {
        why: "A's salience p1 is higher, so its elements reach A1 sooner and A calls up the US sooner: the chart of what each cue calls up shows A ahead. The V lines tell a different story. A faint cue needs a bigger V to call up the US as strongly, so B's V ends higher. That is why the check reads what each cue calls up.",
        tryThis: "Compare the prediction chart with the chart of what each cue calls up. Then set the two saliences equal and the lines become one.",
      },
    },
  },
  {
    id: 'blocking',
    title: 'Blocking',
    predict: { cues: ['B', 'D'], prompt: 'A is trained alone first. Then B is added to A, while D is trained with a new cue, C. Sketch B and D.' },
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
      mackintosh: {
        why: 'B learns on the first compound trial. But A already predicts the outcome, so B is the worse predictor and attention to B falls to the minimum; after that B learns almost nothing. D\'s partner C is new too, so D is not the worse predictor and keeps its attention. Blocking comes from attention, not from a shared error.',
        tryThis: 'Switch off \'Attention changes\' and B and D learn the same. Or switch on the 1975 direction rule: a tie lowers attention too, D loses attention as fast as B, and blocking disappears.',
      },
      'pearce-hall': {
        why: 'On the first compound trial B is new, gets full attention, and learns. But A already predicts the outcome, so there is almost no surprise, and attention to B collapses after that one trial. D\'s partner C is new too, so the outcome stays surprising and D keeps learning.',
        tryThis: 'Step to trials 21 and 23 and compare α_B in the table: 0.8 on the first compound trial, under 0.2 two trials later. Switching off \'Attention follows surprise\' does not remove blocking: in this version a cue only gains strength when the outcome is bigger than predicted, and A already predicts it.',
      },
      sop: {
        why: "By the compound trials A calls up the US into A2 before it arrives, so few US elements are left to be felt in A1 with B: B gains little. And B is in A1 while the US is in A2, so B also loses. The gain and the loss nearly cancel. This is blocking without any shared error term. D's partner C is new, so the US is felt in full and D gains.",
        tryThis: "Step to trial 21, focus on B, and open Inside the trial: the green and red areas are about the same size. Then look at D on trial 22.",
      },
    },
  },
  {
    id: 'unblocking',
    title: 'Unblocking',
    predict: { cues: ['B', 'D'], prompt: 'A and C are each trained first. Then B is added to A with a bigger outcome than before, while D is added to C with the same outcome. Sketch B and D.' },
    focus: { phase: 1, cue: 'B' },
    design: 'Pretraining: 20 A+, 20 C+\nCompound: 20 AB+(2), 20 CD+',
    empirical:
      'Blocking goes away when the outcome changes in the compound phase. If the outcome is bigger than A predicts, the added cue B is learned about after all.',
    citation: 'Kamin (1969)',
    criterion: 'D is blocked (it ends below half the outcome value), and B, added when the outcome got bigger, ends above D.',
    check(run, h) {
      const b = h.final(run, 'B');
      const d = h.final(run, 'D');
      const blocked = d < 0.5 * h.lambda;
      return {
        shown: blocked && b - d > h.margin,
        measure: `B ends at ${f(b)}, D at ${f(d)}${blocked ? '' : ', so D was not blocked in the first place'}.`,
      };
    },
    models: {
      'rescorla-wagner': {
        why: 'On AB+(2) trials λ is 2, but ΣV is only about 1 (from A), so the shared error is about 1 and B gains strength. On CD+ trials C already predicts the outcome, so the error is near 0 and D is blocked. Unblocking comes from the error term: a bigger outcome creates new error.',
        tryThis: 'Change AB+(2) to AB+ in the design and B is blocked again.',
      },
      mackintosh: {
        why: 'B\'s attention falls just as fast as D\'s here: A still predicts the bigger outcome better than B does. B ends higher only because its own error is twice as big (λ is 2), so each of its few early steps is twice as big. In this version of the model, unblocking is about the size of the outcome, not attention.',
        tryThis: 'Step through the first compound trials and compare B\'s and D\'s attention in the table. Then compare with Pearce-Hall, where the surprise itself raises B\'s attention.',
      },
      'pearce-hall': {
        why: 'When the outcome jumps to 2, A no longer predicts it, so the compound trials are a surprise. That keeps attention to B high, and B learns. With the same outcome as before there is no surprise, attention to D fades, and D stays blocked.',
        tryThis: 'Compare α_B and α_D in the attention chart during the compound phase. Then compare with Mackintosh, where attention to B falls either way.',
      },
      sop: {
        why: "AB+(2) doubles the US intensity, so its elements reach A1 faster than A can call them up into A2. More of the US is felt in A1 at the same moments as B, so B gains. With the same US as before, A calls up enough of it to block D.",
        tryThis: "Change AB+(2) to AB+ in the design, and B is blocked like D.",
      },
    },
  },
  {
    id: 'overshadowing',
    title: 'Overshadowing',
    predict: { cues: ['B', 'C'], prompt: 'B is always trained together with A. C is trained on its own. Sketch B and C.' },
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
      mackintosh: {
        why: 'A and B start with the same attention, so they always have the same strength and the same error. Neither predicts better than the other, so attention to neither changes, and each learns from its own error all the way to λ. No overshadowing.',
        tryThis: 'Raise A\'s starting attention: A pulls ahead, B becomes the worse predictor, and B is overshadowed. Or switch on the 1975 direction rule, where a tie lowers attention to both.',
      },
      'pearce-hall': {
        why: 'A and B gain strength together, so the outcome becomes predicted about twice as fast as for C alone. The surprise, and with it attention, fades sooner, so B stops learning at about half of λ.',
        tryThis: 'Raise B\'s salience: B takes a bigger share before attention fades.',
      },
      sop: {
        why: "A and B both call up the US, so together they reach the point where gain and loss balance sooner than C does alone. Each ends with only part of the strength C gets.",
        tryThis: "Raise A's salience. B gets a smaller share.",
      },
    },
  },
  {
    id: 'conditioned-inhibition',
    title: 'Conditioned inhibition',
    predict: { cues: ['A', 'X'], prompt: 'A on its own is followed by the outcome. A with X is not. Sketch A and X. Can a line go below zero?' },
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
      mackintosh: {
        why: 'X only appears with A on trials without the outcome. X\'s own error there is 0 − V_X = 0, so X never changes. Learning from a cue\'s own error cannot push a new cue below zero.',
        tryThis: 'Compare with Rescorla-Wagner, where X goes negative because it shares A\'s error.',
      },
      'pearce-hall': {
        why: 'On AX− trials A predicts the outcome, but it does not arrive, so the trial falls short and X, which is present, gains inhibitory strength. X\'s net strength V − V̄ goes below zero.',
        tryThis: 'Look at X in the trial table: its V stays at 0 and its V̄ grows. Switch off \'Inhibitory learning\' and X never moves.',
      },
      sop: {
        why: "On AX− trials A calls up the US into A2. X is in A1 at the same moments, while the US is in A2, so X loses strength and goes below zero. The loss stops once X's negative link cancels A's, so that together they no longer call up the US.",
        tryThis: "Switch off 'Inhibitory learning' and X never moves. SOP needs a US in A2 to make an inhibitor.",
      },
    },
  },
  {
    id: 'latent-inhibition',
    title: 'Latent inhibition',
    predict: { cues: ['A', 'B'], prompt: 'A is shown 30 times with nothing after it. Then A and a new cue, B, are both trained with the outcome. Sketch A and B.' },
    focus: { t: 1, cue: 'A' },
    design: 'Pre-exposure: 30 A-\nConditioning: 15 A+, 15 B+\nContext: Z',
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
      mackintosh: {
        why: 'During pre-exposure every strength is 0 and λ is 0, so A and the context Z make the same (zero) error. Under the continuous rule a tie leaves attention unchanged, so pre-exposure does nothing.',
        tryThis: 'Switch on \'1975 direction rule\'. A tie now lowers attention, A\'s attention falls during pre-exposure, and A is learned about more slowly later.',
      },
      'pearce-hall': {
        why: 'During pre-exposure nothing follows A and nothing is predicted, so there is no surprise and attention to A falls to zero. When conditioning starts, A begins with almost no attention and learns slowly, while the new cue B starts with full attention.',
        tryThis: 'Set γ to 1, the 1980 model: attention recovers after one surprising trial, and the effect is much smaller.',
      },
      sop: {
        why: "During pre-exposure the context Z and A are both in A1, so Z gains a link to A. When conditioning starts, Z calls up A into A2 before A appears. Those elements cannot go to A1, so A is less active than B and learns more slowly. The context primes A, and a primed cue is learned about slowly.",
        tryThis: "Compare A's solid line on trial 31 with B's on trial 32 in Inside the trial. Then switch off 'Cues link to each other': Z cannot call up A, and the effect disappears.",
      },
    },
  },
  {
    id: 'backward-blocking',
    title: 'Backward blocking',
    predict: { cues: ['B', 'D'], prompt: 'AB and CD are both trained first. Then A alone is trained. B never appears again. Sketch B and D.' },
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
      mackintosh: {
        why: 'B is absent in the second phase, and the model changes only cues that are present, so B keeps what it learned.',
        tryThis: 'Compare with MINERVA-AL, later in the course, where memories of AB trials are re-read when A is trained alone.',
      },
      'pearce-hall': {
        why: 'B is absent in the second phase, and the model only changes cues that are present, so B keeps what it learned.',
        tryThis: 'Compare with MINERVA-AL, later in the course.',
      },
      sop: {
        why: "B is absent in the second phase, so B's elements are never in A1, and B learns nothing. Learning in SOP needs the cue itself to be in A1.",
        tryThis: "Dickinson and Burke (1996) changed SOP so that a cue called up into A2 can also learn, which gives backward blocking. That version is not on this page.",
      },
    },
  },
  {
    id: 'negative-patterning',
    title: 'Negative patterning',
    predict: { cues: ['A', 'AB'], prompt: 'A alone and B alone are followed by the outcome, but A and B together are not. Sketch A and the compound AB.' },
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
      mackintosh: {
        why: 'The prediction for AB is V_A + V_B, and each cue learns toward λ on its own. The compound always predicts more than either part.',
        tryThis: 'Try any settings: the sum is the problem, as it is for Rescorla-Wagner.',
      },
      'pearce-hall': {
        why: 'The prediction for AB is the sum of A\'s and B\'s net strengths. AB− trials do add inhibition to A and B, but the A+ and B+ trials add it back, and the compound always ends up predicting more than either part.',
        tryThis: 'Try any settings: the sum is the problem, as it is for the other models so far.',
      },
      sop: {
        why: "The prediction for AB is V_A + V_B: SOP adds up its cues' links, as Rescorla-Wagner does, so the compound always calls up more of the US than either part.",
        tryThis: "Try any settings. Later versions of SOP let a compound activate elements of its own, so that AB is more than A plus B. They are not on this page.",
      },
    },
  },
  {
    id: 'trial-spacing',
    title: 'Trial spacing',
    predict: { cues: ['A', 'B'], prompt: 'A\'s trials are spread out, with a long gap between them. B\'s trials come close together. Each gets 10 trials with the outcome. Sketch A and B.' },
    focus: { phase: 1, cue: 'B' },
    design: 'Spaced: 10 A+ [ITI 200]\nMassed: 10 B+ [ITI 5]',
    empirical:
      'Trials spread out in time produce more learning per trial than the same trials packed close together: the intertrial interval effect.',
    citation: 'Gibbon, Baldock, Locurto, Gold, & Terrace (1977)',
    criterion: 'After 10 trials each, V for the spaced cue A is ahead of V for the massed cue B.',
    check(run, h) {
      const a = h.phaseEnd(run, 0, 'A');
      const b = h.final(run, 'B');
      return { shown: a - b > h.margin, measure: `After 10 trials each: A (spaced) ${f(a)}, B (massed) ${f(b)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: "Rescorla-Wagner works trial by trial. It has no time between trials, so the timing in square brackets makes no difference: A and B learn exactly the same.",
        tryThis: "Compare with SOP, where what is still active from the last trial matters.",
      },
      mackintosh: {
        why: "The model works trial by trial and ignores the time between trials, so A and B learn exactly the same.",
        tryThis: "Compare with SOP, where what is still active from the last trial matters.",
      },
      'pearce-hall': {
        why: "The model works trial by trial and ignores the time between trials, so A and B learn exactly the same.",
        tryThis: "Compare with SOP, where what is still active from the last trial matters.",
      },
      sop: {
        why: "With only 5 moments between B's trials, the last US is still in A2 when the next trial starts, and so are B's own elements. Fewer US elements can go to A1, so B gains less; the lingering US in A2 costs B some strength; and B itself is less active. With 200 moments between A's trials, everything has faded back to inactive.",
        tryThis: "Step to trial 12 and open Inside the trial: the dashed lines start high. Then raise 'Decay from A2' (Everything view): A2 fades within the short gap, and the massed trials catch up.",
      },
    },
  },
  {
    id: 'cs-us-interval',
    title: 'CS-US interval',
    predict: { cues: ['A', 'B'], prompt: 'For A, the outcome comes right as A ends. For B, the outcome comes 20 moments after B ends. Sketch A and B.' },
    focus: { t: 2, cue: 'B' },
    design: 'Training: 20 A+ [CS 1-10, US 11-12], 20 B+ [CS 1-10, US 31-32]',
    empirical:
      'Conditioning is weaker when a gap separates the end of the cue from the outcome (trace conditioning), and the longer the gap, the weaker it is.',
    citation: 'Pavlov (1927); Kamin (1965)',
    criterion: 'V for A, followed at once by the outcome, ends above V for B, followed after a gap.',
    check(run, h) {
      const a = h.final(run, 'A');
      const b = h.final(run, 'B');
      return { shown: a - b > h.margin, measure: `A (no gap) ends at ${f(a)}, B (20-moment gap) at ${f(b)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: "The model has no time inside a trial: a trial is just which cues were present and whether the outcome happened. A gap between the cue and the outcome cannot matter.",
        tryThis: "Compare with SOP, the first model in the course where time inside the trial matters.",
      },
      mackintosh: {
        why: "The model has no time inside a trial, so a gap between the cue and the outcome cannot matter.",
        tryThis: "Compare with SOP, where time inside the trial matters.",
      },
      'pearce-hall': {
        why: "The model has no time inside a trial, so a gap between the cue and the outcome cannot matter.",
        tryThis: "Compare with SOP, where time inside the trial matters.",
      },
      sop: {
        why: "A's elements are still in A1 when the US arrives, so they overlap the US in A1. B ends 20 moments before the US. By then B's elements have decayed to A2, so there is almost no overlap and almost no learning.",
        tryThis: "Edit the design to bring B's US closer, such as US 15-16, and watch B's line rise.",
      },
    },
  },
  {
    id: 'backward-conditioning',
    title: 'Backward conditioning',
    predict: { cues: ['A', 'B'], prompt: 'On A\'s trials the outcome comes first and A comes after it. On B\'s trials B comes first, as usual. Sketch A and B. Can a line go below zero?' },
    focus: { t: 1, cue: 'A' },
    design: 'Training: 20 A+ [US 1-2, CS 16-25], 20 B+',
    empirical:
      'When the cue follows the outcome, a few pairings can make it weakly excitatory, but many pairings make it an inhibitor.',
    citation: 'Heth (1976)',
    criterion: 'V for the backward cue A ends below zero.',
    check(run, h) {
      const a = h.final(run, 'A');
      const b = h.final(run, 'B');
      return { shown: a < -h.margin, measure: `A (backward) ends at ${f(a)}, B (forward) at ${f(b)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: "The model does not know the order of events inside a trial, so a backward pairing counts as an ordinary A+ trial, and A gains strength like B.",
        tryThis: "Compare with SOP, where A comes while the US is fading and becomes an inhibitor.",
      },
      mackintosh: {
        why: "The model does not know the order of events inside a trial, so a backward pairing counts as an ordinary A+ trial.",
        tryThis: "Compare with SOP, where the order matters.",
      },
      'pearce-hall': {
        why: "The model does not know the order of events inside a trial, so a backward pairing counts as an ordinary A+ trial.",
        tryThis: "Compare with SOP, where the order matters.",
      },
      sop: {
        why: "On A's trials the US comes first. By the time A appears, most US elements have left A1 for A2. A is in A1 while the US is in A2, so on every trial the loss beats the gain, and A becomes an inhibitor.",
        tryThis: "Edit the design so that A starts sooner after the US, such as CS 4-13. The US is still in A1 when A appears, and A gains strength instead: timing decides whether a backward cue excites or inhibits.",
      },
    },
  },
  {
    id: 'us-preexposure',
    title: 'US pre-exposure',
    predict: { cues: ['A', 'B'], prompt: 'A is trained first. Then the outcome is presented 30 times on its own, in the same box (the context Z). Then B is trained. Sketch A and B.' },
    focus: { phase: 2, cue: 'B' },
    design: 'Control: 10 A+\nUS alone: 30 +\nConditioning: 10 B+\nContext: Z',
    empirical:
      'Presenting the outcome on its own many times, before a cue is paired with it, slows learning about the cue.',
    citation: 'Randich & LoLordo (1979)',
    criterion: 'After 10 trials each, V for B, trained after the outcome-alone trials, is behind V for A, trained before them.',
    check(run, h) {
      const a = h.phaseEnd(run, 0, 'A');
      const b = h.final(run, 'B');
      return { shown: a - b > h.margin, measure: `After 10 trials each: A (before) ${f(a)}, B (after the outcome alone) ${f(b)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: "On the outcome-alone trials the context Z is the only cue present, so it gains strength toward λ. When B is trained, Z already predicts the outcome, so the shared error is small and the context blocks B.",
        tryThis: "Delete the Context line. With no context, the outcome-alone trials have no cue to learn about, and the effect disappears.",
      },
      mackintosh: {
        why: "The context Z gains strength on the outcome-alone trials. On B's trials Z already predicts the outcome better than the new cue B does, so attention to B falls and B learns slowly.",
        tryThis: "Delete the Context line and the effect disappears.",
      },
      'pearce-hall': {
        why: "The context Z gains strength on the outcome-alone trials, so when B is trained the outcome is already predicted. There is little surprise, so attention to B falls, and B gains strength only when the outcome is bigger than predicted.",
        tryThis: "Delete the Context line and the effect disappears.",
      },
      sop: {
        why: "On the outcome-alone trials the context Z is in A1 at the same moments as the US, so Z gains a link to it. Z is always there, so during conditioning it keeps calling up the US into A2. When B's US arrives, fewer of its elements can go to A1: B gains less and loses more.",
        tryThis: "Watch Z's line on the prediction chart during the outcome-alone trials. Then switch off 'Associative activation': Z can no longer call up the US, and the effect disappears.",
      },
    },
  },
];

export function byId(id) {
  return phenomena.find((p) => p.id === id);
}
