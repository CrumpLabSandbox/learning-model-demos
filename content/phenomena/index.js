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
//   reference optional lines to draw on the chart for comparison, such as
//             the contingency ΔP: [{ value, label, phase? }], phase 1-based
//   models    per model: why the model does or does not show it (naming the
//             responsible term) and something to try
//
// A design with a random order is one particular stream of frames. A check
// whose result should not depend on the order averages over several streams
// with h.overSeeds, as the experiments average over many streams.

import { fmt } from '../../js/core/format.js';

const f = (x) => fmt(x, 2);

export const phenomena = [
  {
    id: 'acquisition',
    title: 'Acquisition',
    predict: { cues: ['A'], prompt: 'A is followed by the outcome on every trial. Sketch how strongly you think A will predict the outcome over the 60 trials.' },
    focus: { t: 1, cue: 'A' },
    design: 'Training: 60 A+',
    empirical:
      'Pairing a cue with an outcome makes the response to the cue grow, quickly at first and then more slowly.',
    citation: 'Pavlov (1927)',
    criterion: 'A ends above half of the outcome value, and the curve has levelled off: the last step is smaller than the biggest step.',
    check(run, h) {
      const v = h.phaseValues(run, 0, 'A');
      const steps = v.slice(1).map((x, i) => x - v[i]);
      const biggest = Math.max(...steps);
      const last = steps[steps.length - 1];
      const end = h.final(run, 'A');
      return {
        shown: end > 0.5 * h.lambda && last < biggest - 1e-9,
        measure: `A ends at ${f(end)}; biggest step ${f(biggest)} (trial ${steps.indexOf(biggest) + 1}), last step ${f(last)}.`,
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
      'minerva-al': {
        why: "On trial 1 memory is empty, so the echo is noise and the whole event is stored. On each later trial A brings back the earlier traces of A with the outcome, so the echo holds more of the outcome. As the outcome becomes expected, less of it is new, and each new trace is fainter. Retrieval rises fast and levels off near 1.",
        tryThis: "Open the memory view and step through the first trials: the first traces are bright, the later ones pale, because less was surprising. Then lower the learning rate L and watch the curve rise more slowly.",
      },
      pearce: {
        why: 'The configuration A (with nothing else) is met for the first time with E = 0, so the discrepancy β(λ − V) is large and E grows by a quarter of the gap each trial. As E approaches λ the gap closes and the steps shrink. Nothing is borrowed, because no other configuration has been met.',
        tryThis: 'Open Configurations: one row, A, with E climbing toward 1. Then add a line "Context: Z" to the design: the context-alone configuration appears and shares a little of A\'s strength.',
      },
      delamater: {
        why: 'The outcome unit starts near 0.1 and its slope is shallow there, so the first steps are tiny; the curve is S-shaped, slow at the start, fast in the middle, slow again near 1. The biggest step comes around trial 40, and the curve levels off near the outcome by trial 60. The network needs about three times the trials of the other models.',
        tryThis: 'Cut the design to 30 A+ and the network is only partway up when the trials run out. Then raise the learning rate to 1: the curve steepens but keeps its S shape.',
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
      'minerva-al': {
        why: "On A− trials A brings back the outcome, but it does not come, so each trial stores A together with the opposite of the outcome. Later, A brings back both kinds of trace, and the outcome and its opposite cancel in the echo. Nothing is erased: the old traces are all still in memory.",
        tryThis: "Step to trial 25 and look at the memory view: the new trace's outcome features are red (negative). Then compare with Rescorla-Wagner, where extinction erases the strength.",
      },
      pearce: {
        why: 'On the A− trials λ is 0 and A predicts V > 0, so the discrepancy is negative and goes to A\'s inhibition I. E stays where it was. V = E − I falls to 0 when I has caught E up. Nothing is forgotten: the old learning is still there, with new learning laid over it.',
        tryThis: 'Open Configurations during extinction: E stays at 1 while I climbs to meet it. Then switch off \'Inhibition as new learning\': E itself falls, as in Rescorla-Wagner.',
      },
      delamater: {
        why: 'Learning is the same rule in both directions: the error at the outcome unit, now negative, pulls the weights down. But in 20 acquisition trials the network has climbed only partway, so there is little to extinguish, and the fall is as gradual as the rise was.',
        tryThis: 'Give acquisition 100 trials and extinction 60, and the S-curve runs up and back down.',
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
      'minerva-al': {
        why: "Salience multiplies a cue's features. B's features are only 0.1, so the probe for B is mostly the context, and B's traces stand out less from the rest of memory. B's retrieval rises more slowly. Both end near 1.",
        tryThis: "Set the two saliences equal (Everything view) and the lines become one.",
      },
      pearce: {
        why: 'Intensity matters in this model only through similarity. With no context in the design, A and B are each their own configuration and share nothing with anything, so a more intense A learns no faster than B. Pearce\'s account of salience needs the context: an intense cue leaves the context less of the buffer, so less excitation generalises to the context and less inhibition comes back.',
        tryThis: 'Add a line "Context: Z" to the design and the two cues part: the intense A is slowed less by inhibition borrowed from the context than the faint B.',
      },
      delamater: {
        why: 'A fainter cue\'s feature is switched on less strongly, so it sends less forward and its weights change less (the change is error times input). The network is slow at the start for both cues, so in a short run the difference is small.',
        tryThis: 'Run 100 trials of each: the salient cue\'s S-curve rises sooner.',
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
      'minerva-al': {
        why: "By the compound trials A already brings back the outcome. The most surprising thing on an AB trial is B, so each trace stores B strongly and the outcome only weakly. B later brings back those traces, and with them little outcome. D's partner C was new, so the CD traces hold more outcome.",
        tryThis: "Switch off 'Store the discrepancy': each trial stores the whole event, expected or not, and blocking disappears.",
      },
      pearce: {
        why: 'A is trained to λ. On AB+ trials the configuration AB is new, but it borrows half of A\'s strength (S = 0.5 with equal intensities), so the discrepancy is half what it would be and AB learns only to half of λ itself. B alone then borrows half of what AB learned: a quarter of λ. D borrows half of CD, which had to learn all of λ: a half. Blocking is generalisation from A to AB, then dilution from AB to B.',
        tryThis: 'Raise A\'s intensity above B\'s: AB is more like A, borrows more, learns less, and lends B less, so blocking deepens. Lower it and blocking fades, as Pearce predicts from the relative intensities.',
      },
      delamater: {
        why: 'After pretraining, A\'s hidden units already drive the outcome unit, so on AB trials the error is small and B\'s weights change little. The hidden layer is random to begin with, so part of B\'s effect depends on which hidden units it happens to share with A; averaged over the networks, B ends below D.',
        tryThis: 'Switch off \'Hidden layer\': the one-layer network is Rescorla-Wagner through a squash, and blocking is cleaner. Then raise the learning rate to 1 to see it within fewer trials.',
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
      'minerva-al': {
        why: "The AB+(2) trials store an outcome of size 2. D's probe matches those traces through the context they share, and their large outcome features come back in D's echo too. So D is not blocked in this design, and there is nothing for B to be unblocked from. With AB+ in place of AB+(2), B and D are both blocked.",
        tryThis: "Change AB+(2) to AB+ in the design: B and D both end near 0.4. The paper does not simulate unblocking.",
      },
      pearce: {
        why: 'On AB+(2) trials λ is 2 but AB borrows only half of A\'s strength, 0.5, so the discrepancy is large and AB learns a lot of its own. B borrows half of that. D\'s compound borrows half of C and learns only up to λ = 1, so D ends lower.',
        tryThis: 'Change AB+(2) back to AB+ and B ends where D does.',
      },
      delamater: {
        why: 'A bigger outcome raises the target above what A\'s hidden units drive, so the error returns on AB trials and B learns. The network needs more trials than this design gives to block D in the first place, so the check finds no blocking to undo.',
        tryThis: 'Give the pretraining 60 trials: D is then blocked and B is unblocked.',
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
      'minerva-al': {
        why: "Every trace that holds B also holds A, so a probe with B alone only partly matches them, and they answer more weakly (similarity about 0.8, cubed about 0.5). The outcome comes back less clearly for B than for C, whose traces match its probe fully. The paper's Table 8 shows the same.",
        tryThis: "Lower A's salience (Everything view): A's features become fainter in the traces, B's probe matches them better, and the overshadowing of B shrinks.",
      },
      pearce: {
        why: 'AB learns to λ as one configuration. B alone is a different pattern that shares B with it, half of AB by intensity, so B borrows half of what AB learned. C, trained alone, keeps all of its own. This is generalisation decrement, and it is there from the first trial.',
        tryThis: 'Step to trial 2 and compare B and C: B is already behind. Then make A more intense than B: AB is more like A, so B borrows even less.',
      },
      delamater: {
        why: 'Two active features share the error between them, so each learns about half as fast as a cue alone would, as in Rescorla-Wagner. But the network\'s early trials are slow for every cue, and in 30 trials B and C are both still climbing, so the gap has not opened.',
        tryThis: 'Run 100 trials: C reaches the outcome and B levels off below it.',
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
    criterion: 'The summation test: adding X to A cuts the prediction for A by at least half, and X on its own predicts little (below a fifth of the outcome value, or below zero).',
    check(run, h) {
      const x = h.final(run, 'X');
      const a = h.final(run, 'A');
      const ax = h.final(run, 'AX');
      return { shown: x < 0.2 * h.lambda && a > 0.5 * h.lambda && ax < 0.5 * a, measure: `A ends at ${f(a)}, AX at ${f(ax)}, X alone at ${f(x)}.` };
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
      'minerva-al': {
        why: "A brings back the outcome on AX− trials, but it does not come, so each AX trace stores A, X, and the opposite of the outcome. X brings back those traces, and with them the opposite of the outcome: retrieval goes below zero. The paper's Table 2 shows the same.",
        tryThis: "Switch off 'Store the discrepancy': the AX traces then hold no outcome at all, rather than its opposite, and X does not go below zero.",
      },
      pearce: {
        why: 'A is reinforced and AX is not. AX borrows half of A\'s excitation, so on AX− trials it predicts the outcome, gets none, and gains inhibition of its own until the borrowed excitation is cancelled. X alone borrows half of AX\'s inhibition and little else, so X ends negative. This is the paper\'s Figure 1, and A itself ends above λ, because it must offset the inhibition it borrows back from AX.',
        tryThis: 'Open Configurations at the end: A has E above 1, AX has I of about 0.67 and V near 0. Then switch off \'Inhibition as new learning\': AX\'s excitation is weakened instead, X cannot go below 0, and the effect disappears.',
      },
      delamater: {
        why: 'On AX− trials the error is negative, and X, present only then, acquires weights that pull the outcome unit down. A logistic unit cannot go below 0, so X alone reads as a low activation rather than a negative strength, but adding X to A cuts A\'s prediction to a fraction: the summation test, which is how an inhibitor is measured.',
        tryThis: 'Compare the A and AX lines on the chart. Then switch off \'Hidden layer\': the one-layer network does the same through a negative weight from X.',
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
        why: "During pre-exposure the context Z and A are both in A1, so Z gains a link to A. When conditioning starts, Z calls up A into A2 before A appears, those elements cannot go to A1, and A gains less than B on their first trials: the context primes A. But with the activity limits on, A's own onset knocks the context out of A1 faster, so Z's link to A stays weak, and A catches B up within a few trials. Averaged over the phase, the gap is too small to count.",
        tryThis: "Switch off 'Activity limits': the context's link to A grows stronger, A is primed more, and the gap lasts long enough to count. Then switch off 'Cues link to each other' as well, and the effect disappears, because nothing primes A.",
      },
      'minerva-al': {
        why: "Each pre-exposure trial leaves a trace of A with nothing after it. During conditioning A brings back those traces too, and they water down the outcome in the echo, so A's retrieval rises more slowly than B's, which has no such traces. The paper calls this proactive interference.",
        tryThis: "Step to the first conditioning trial with A and look at the memory view: the pre-exposure traces light up in the similarity bars. Then lower L and watch the effect grow, as in the paper's Table 6.",
      },
      pearce: {
        why: 'On the pre-exposure trials A predicts nothing and nothing happens, so the discrepancy is 0 and no configuration changes. A starts conditioning exactly where B does. Pearce suggests that attention to a familiar cue would be needed to explain latent inhibition, and the model as written has none.',
        tryThis: 'Compare with Pearce-Hall, where pre-exposure lowers attention, and with SOP and MINERVA-AL, where the context comes to prime or recall the cue.',
      },
      delamater: {
        why: 'On a trial with no outcome and an outcome unit already near 0, the error is near 0 and nothing changes. Pre-exposure leaves the network as it was, so A starts conditioning where B does.',
        tryThis: 'Compare with Pearce-Hall, where pre-exposure lowers attention.',
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
      'minerva-al': {
        why: "In the second phase A brings back B from the AB traces, but B is not there, so each A trace stores the opposite of B. Later, B's probe matches those traces negatively. Cubing keeps the sign, so they count against B's echo, taking away some of the outcome that the AB traces brought back. B ends below D.",
        tryThis: "Look at the memory view after the second phase: the A traces have red (negative) features in B's field. Then switch off 'Store the discrepancy' and backward blocking disappears.",
      },
      pearce: {
        why: 'Only the configuration on a trial learns. During the A+ trials the AB configuration is not presented, so its E and I do not change, and B alone borrows the same amount from it as before. Absent patterns do not change.',
        tryThis: 'Compare with MINERVA-AL, where the later A+ traces change what A brings back about B.',
      },
      delamater: {
        why: 'Only weights from active features change, and only through the error of the trial at hand. During A+ trials B\'s feature is off, so B\'s weights stay where the AB trials left them.',
        tryThis: 'Compare with MINERVA-AL, where A\'s later traces change what A brings back about B.',
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
      'minerva-al': {
        why: "A, B, and AB each bring back the traces most like them, and cubing makes close matches count far more than loose ones. AB brings back mostly the AB− traces, which hold the opposite of the outcome; A brings back mostly the A+ traces. The compound is remembered as its own pattern, not as A plus B.",
        tryThis: "Step to an AB− trial late in training and look at the memory view: the AB traces have the longest activation bars. Even with the similarity exponent at 1 (Everything view), AB is still told apart from A and B, because each compound is stored as its own pattern.",
      },
      pearce: {
        why: 'A, B, and AB are three configurations. A and B each learn to λ. AB borrows half of each, predicts about λ on its first trial, is not reinforced, and gains inhibition until it predicts 0; that inhibition generalises back to A and B, which learn a little extra to compensate. The model solves the problem by making the compound its own unit.',
        tryThis: 'Open Configurations: the AB row has E near 0 and I near 1, while A and B have E a little above 1. Then switch off \'Generalisation\': AB learns nothing and A and B are untouched, which also solves it, but by treating every pattern as a stranger.',
      },
      delamater: {
        why: 'The hidden layer earns its keep here. A and B each come to drive the outcome unit through their own hidden units, and on AB trials the two inputs together learn to switch those units off, so the compound predicts little while each element predicts the outcome. A one-layer network could only add.',
        tryThis: 'Switch off \'Hidden layer\' and the compound predicts more than either element. Then open Inside network 1 on an A trial and an AB trial and compare the hidden patterns.',
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
      'minerva-al': {
        why: "MINERVA-AL stores each trial as one event, with no time inside it or between trials, so the timing in square brackets makes no difference. The paper notes that the model cannot model timing.",
        tryThis: "Compare with SOP, the one model here where time matters.",
      },
      pearce: {
        why: 'The model learns trial by trial and knows nothing about time between trials, so spaced and massed trials are the same.',
        tryThis: 'Only SOP, which runs moment by moment, can show this.',
      },
      delamater: {
        why: 'The network learns trial by trial and knows nothing about the time between trials.',
        tryThis: 'Only SOP, which runs moment by moment, can show this.',
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
      'minerva-al': {
        why: "Each trial is one event, so a gap between the cue and the outcome cannot matter: they are stored in the same trace either way.",
        tryThis: "Compare with SOP, where the cue fades before a late outcome arrives.",
      },
      pearce: {
        why: 'The model learns trial by trial and knows nothing about time within a trial, so a gap before the outcome changes nothing.',
        tryThis: 'Only SOP, which runs moment by moment, can show this.',
      },
      delamater: {
        why: 'The network learns trial by trial and knows nothing about time within a trial.',
        tryThis: 'Only SOP, which runs moment by moment, can show this.',
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
      'minerva-al': {
        why: "Each trial is one event, so the order of the cue and the outcome inside a trial is lost: a backward pairing is stored like an ordinary A+ trial.",
        tryThis: "Compare with SOP, where the order matters.",
      },
      pearce: {
        why: 'The model learns trial by trial and knows nothing about the order of cue and outcome within a trial, so backward pairings are just pairings.',
        tryThis: 'Only SOP, which runs moment by moment, can show this.',
      },
      delamater: {
        why: 'The network learns trial by trial and knows nothing about the order of cue and outcome within a trial.',
        tryThis: 'Only SOP, which runs moment by moment, can show this.',
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
      'minerva-al': {
        why: "The outcome-alone trials store the context with the outcome. B's probe includes the context, so it matches those traces partly, and they help B bring back the outcome rather than hinder it. B learns no more slowly than A did.",
        tryThis: "Compare with Rescorla-Wagner, where the context gains strength and blocks B.",
      },
      pearce: {
        why: 'On the outcome-alone trials the configuration is the context Z by itself, and it learns to predict the outcome. When B is trained, the configuration BZ borrows from Z in proportion to the context\'s share of it, which is small with the default intensities, so B is slowed only a little.',
        tryThis: 'Raise the context\'s intensity: BZ becomes more like Z, borrows more, and B is slowed more.',
      },
      delamater: {
        why: 'The context\'s feature is on during the outcome-alone trials and learns to drive the outcome unit, so when B is trained the error is already smaller. But with so few trials the network has learned little either way, and A, trained first, is still low too.',
        tryThis: 'Give each phase 60 trials: the context then blocks B as it does in Rescorla-Wagner.',
      },
    },
  },

  // ---- Human contingency judgement: the streamed-trial unit ---------------
  // Frames of a stream are trials; the context Z stands for the stream, so
  // `+` is an outcome with no cue and `-` is a frame with nothing on it.
  {
    id: 'contingency',
    title: 'Contingency (ΔP)',
    predict: {
      cues: ['A', 'B'],
      prompt: 'Two streams of 60 frames. In the first, the outcome follows A on 17 of the 30 frames with A and comes on 3 of the 30 frames without it (ΔP = 0.47). In the second, the outcome follows B on 6 of 30 frames with B and on 6 of 30 without (ΔP = 0). Sketch A and B.',
    },
    focus: { t: 60, cue: 'A' },
    design: 'Positive: 17 A+, 13 A-, 3 +, 27 -, random\nZero: 6 B+, 24 B-, 6 +, 24 -, random\nContext: Z',
    reference: [
      { value: 0.467, label: 'ΔP = 0.47', phase: 1 },
      { value: 0, label: 'ΔP = 0', phase: 2 },
    ],
    empirical:
      "People's ratings of how strongly a cue is related to an outcome rise with the contingency ΔP. In the streamed-trial procedure a 12-second stream of 60 frames was enough: streams with ΔP = 0.47 were rated higher than streams with ΔP = 0.",
    citation: 'Crump, Hannah, Allan & Hord (2007)',
    criterion: 'A (ΔP = 0.47) ends above B (ΔP = 0). The dashed lines show each ΔP, so you can also see how close the model comes to it.',
    check(run, h) {
      const a = h.phaseEnd(run, 0, 'A');
      const b = h.final(run, 'B');
      return { shown: a - b > h.margin, measure: `A ends at ${f(a)} (ΔP 0.47); B ends at ${f(b)} (ΔP 0).` };
    },
    models: {
      'rescorla-wagner': {
        why: 'The context Z is on every frame, so on frames without A it is the only cue and learns how often the outcome comes without A, P(O | no A). On frames with A, A and Z share the error, so between them they learn P(O | A). A is left with the difference: ΔP. With these frame counts V_A levels off near 0.47 and V_B near 0. The term that does this is ΣV with the context in it.',
        tryThis: 'Delete the Context line. Frames without a cue then teach nothing, A climbs toward P(O | A) = 0.57 instead of ΔP, and B toward 0.2. Then put it back and lower β to 0.1 to watch A approach the dashed line more slowly.',
      },
      mackintosh: {
        why: "Each cue learns from its own error, λ − V_A, so A heads for how often the outcome follows it, P(O | A) = 0.57, not ΔP, and B heads for P(O | B) = 0.2 rather than 0. The context's strength does not enter the error. A still ends above B, so the model tells the two streams apart, but it is tracking pairings, not contingency.",
        tryThis: "Compare B's end with the dashed ΔP = 0 line: B sits above it. Then open the same preset on the Rescorla-Wagner page, where B falls to the line.",
      },
      'pearce-hall': {
        why: 'A gains excitatory strength Sαλ on each of its 17 reinforced frames and inhibitory strength on its 13 frames without the outcome, when A and the context together predict more than came. B gains on 6 frames and loses on 24, so its net strength V − V̄ stays near 0. A ends above B, and above ΔP, because excitation does not use the shared error.',
        tryThis: 'Watch the attention chart. With a probabilistic outcome the surprise never goes away, so attention stays high for both cues throughout, unlike acquisition.',
      },
      sop: {
        why: "A gains strength on each A+ frame, when A and the US are in A1 together, and loses a little on A- frames, when A is in A1 while the US it calls up sits in A2. Frames without A teach A nothing. B has fewer pairings than A, so it ends lower, but SOP has no record of frames without B, so B ends well above 0 even though its ΔP is 0. The context Z turns inhibitory over the many frames with nothing on them.",
        tryThis: 'SOP treats each frame as a well-spaced trial here. Add a line "Timing: ITI 2" to run the frames close together, as in a real stream, and see how much carries over from one frame to the next.',
      },
      'minerva-al': {
        why: "Every frame is stored as a trace. A's probe shares the context with every trace, so it brings back the outcome at the stream's base rate, and A's own traces add to that: A+ traces store the outcome, A- traces store the opposite of what was expected. B's traces hold little outcome beyond what the context already brought back, so retrieval for B stays near 0.",
        tryThis: 'Open the memory view on a B+ frame late in the second stream: the new trace stores little of the outcome, because the context had already brought back about that much.',
      },
      pearce: {
        why: 'Every frame is one of four configurations: A with the context, the context alone, and the same for B. A\'s configuration learns toward P(O | A), the context alone toward P(O | no A), and A alone borrows from both in proportion to the shares they take up. A ends above B, but above ΔP too, because a cue\'s own configuration tracks how often the outcome follows it rather than the difference.',
        tryThis: 'Compare with Rescorla-Wagner, where A settles at ΔP exactly. Then raise the context\'s intensity: A\'s configuration shares more with the context-alone configuration and borrows more of its base rate.',
      },
      delamater: {
        why: 'Each frame is a trial for the network: A\'s feature with the context\'s on some frames, the context\'s alone on others. The context\'s weights learn the base rate and A\'s the difference, as in Rescorla-Wagner, though through a squash and slowly. A ends above B.',
        tryThis: 'Raise the learning rate to 1: A climbs toward ΔP within the stream.',
      },
    },
  },
  {
    id: 'outcome-density',
    title: 'Outcome density',
    predict: {
      cues: ['A', 'B'],
      prompt: 'Two streams with no contingency at all (ΔP = 0). In the first the outcome is rare: it comes on 6 of 30 frames with A and 6 of 30 without. In the second it is common: on 24 of 30 frames with B and 24 of 30 without. Sketch A and B.',
    },
    focus: { t: 60, cue: 'B' },
    design: 'Low density: 6 A+, 24 A-, 6 +, 24 -, random\nHigh density: 24 B+, 6 B-, 24 +, 6 -, random\nContext: Z',
    reference: [{ value: 0, label: 'ΔP = 0 in both streams' }],
    empirical:
      'Two streams with no contingency are rated differently: when the outcome is common (P(O) = 0.8) the cue is rated higher than when it is rare (P(O) = 0.2). The signal detection analysis places this effect in the decision, not in what was learned.',
    citation: 'Crump et al. (2007); Allan, Hannah, Crump & Siegel (2008)',
    criterion: 'Averaged over 8 streams of each kind, B (common outcome) ends above A (rare outcome), though both have ΔP = 0.',
    check(run, h) {
      const [b, a] = h.overSeeds(8, (r) => [h.final(r, 'B'), h.phaseEnd(r, 0, 'A')]);
      return { shown: b - a > h.margin, measure: `Averaged over 8 streams: B (common) ends at ${f(b)}, A (rare) at ${f(a)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'The context Z soaks up the base rate of the outcome, so whatever the density, V_A and V_B both head for ΔP = 0. Early in the common-outcome stream B is briefly above zero, before Z has caught up, but averaged over streams the two cues end in the same place. The model predicts no outcome density effect once learning has settled. The papers find the effect in the decision criterion, which the model does not have.',
        tryThis: 'Lower β to 0.15. Learning is slower, the context lags further behind, and B now ends above A: the effect appears before the model reaches its asymptote, and disappears after.',
      },
      mackintosh: {
        why: 'Each cue learns from its own error toward how often the outcome follows it: B toward P(O | B) = 0.8 and A toward P(O | A) = 0.2. Mackintosh cannot tell a dense outcome from a contingent one, so it shows the effect, but for a reason that would also make it rate a zero-contingency cue as a strong predictor.',
        tryThis: 'Compare with the Contingency preset: B here (ΔP = 0, dense) ends above A there (ΔP = 0.47, sparse). The model ranks density above contingency.',
      },
      'pearce-hall': {
        why: 'B gains excitatory strength Sαλ on each of its 24 reinforced frames whatever the context predicts, and inhibitory strength on its 6 frames without the outcome, when B and the context over-predict. The inhibition nearly balances the excitation, and the net strength V − V̄ for B ends only a little above A. The effect is small, and depends on the order of frames.',
        tryThis: "Switch off 'Inhibitory learning'. B then keeps all of its excitation and ends far above A: the inhibitory term is what holds the effect down.",
      },
      sop: {
        why: 'B is paired with the US on 24 frames and A on 6, and the frames without a cue take nothing from either, so B gains much more than A. SOP counts pairings, and a dense outcome means many pairings.',
        tryThis: "Watch Z's line. The context sits in A1 while the US it has called up sits in A2 on frame after frame, so the context becomes an inhibitor.",
      },
      'minerva-al': {
        why: "In the dense stream the context alone brings back the outcome, because most traces hold it. B's probe includes the context, so B's echo holds the outcome too, and the echo is scaled to its largest feature. B retrieves the outcome strongly though B adds nothing to the context's prediction. This is the model's base-rate behaviour: a cue in a trained context retrieves what the context retrieves.",
        tryThis: 'Open the memory view on a frame with B and look at the probe: the context features are part of it, and the traces they match are most of memory.',
      },
      pearce: {
        why: 'Both cues\' configurations learn toward how often the outcome follows them, 0.2 for A and 0.8 for B, and the context alone learns toward the base rate. The model tracks pairings for each pattern, not the contingency, so a dense outcome looks like a strong cue.',
        tryThis: 'Compare with Rescorla-Wagner, where the context soaks up the base rate and both cues head for ΔP = 0.',
      },
      delamater: {
        why: 'With a common outcome the context\'s feature drives the outcome unit, and B\'s frames add to it; with a rare outcome neither does. Both cues\' features learn in proportion to how often the outcome follows them, so the dense cue ends higher.',
        tryThis: 'Compare with Rescorla-Wagner, where the context soaks up the base rate and both cues head for zero.',
      },
    },
  },
  {
    id: 'one-phase-blocking',
    title: 'One-phase blocking',
    predict: {
      cues: ['B', 'D'],
      prompt: 'Two streams of 48 frames, each with two cues. B appears with the companion A, which predicts the outcome perfectly (A: ΔP = 1). D appears with the companion C, which predicts nothing (C: ΔP = 0). B and D each have ΔP = 0.5 with the outcome. Sketch B and D.',
    },
    focus: { t: 96, cue: 'D' },
    design: 'Companion predicts: 18 AB+, 6 A+, 6 B-, 18 -, random\nCompanion useless: 9 CD+, 9 D+, 3 C+, 3 +, 3 CD-, 3 D-, 9 C-, 9 -, random\nContext: Z',
    reference: [{ value: 0.5, label: 'ΔP = 0.5 for B and for D' }],
    empirical:
      'A target cue with ΔP = 0.5 is rated lower when its companion cue predicts the outcome perfectly than when the companion predicts nothing. In the streamed-trial version, the target was rated about −16 with a perfect companion and about +25 with a useless one.',
    citation: 'Hannah, Crump, Allan & Siegel (2009), after Tangen & Allan (2004)',
    criterion: 'Averaged over 8 streams of each kind, D (useless companion) ends above B (perfect companion), though both have ΔP = 0.5.',
    check(run, h) {
      const [d, b] = h.overSeeds(8, (r) => [h.final(r, 'D'), h.phaseEnd(r, 0, 'B')]);
      return { shown: d - b > h.margin, measure: `Averaged over 8 streams: D ends at ${f(d)}, B at ${f(b)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'A is followed by the outcome on every frame it appears on, so A soon predicts it, and on AB+ frames the shared error λ − ΣV is already near zero: B gains little. On B− frames B loses. B settles near its contingency given A, which is 0. C predicts nothing, so on CD frames the error is still there and D learns its own ΔP of 0.5. The term that does this is ΣV: B shares the error with a cue that has used it up.',
        tryThis: "Switch off 'Summed error'. B and D then each learn from their own error and end in the same place.",
      },
      mackintosh: {
        why: 'B learns from its own error at first, but A predicts the outcome better than B does, so attention to B falls toward its minimum and B stops learning. D and its companion C are equally good predictors, so D keeps more of its attention. The gap is small and depends on the order of frames; blocking in Mackintosh comes from attention, not from a shared error.',
        tryThis: "Switch off 'Attention changes' and the gap closes. Compare with Rescorla-Wagner, where B falls much further.",
      },
      'pearce-hall': {
        why: 'Once A predicts the outcome, AB+ frames hold no surprise, so attention to B falls and B gains little, while B− frames add inhibition. The CD frames stay surprising, because C predicts nothing, so attention to D stays up and D keeps learning.',
        tryThis: 'Compare α_B and α_D on the attention chart during their streams.',
      },
      sop: {
        why: "A calls up the US into A2 before it arrives on AB frames, so fewer US elements reach A1 with B and B gains less, while B's time in A1 with the US in A2 costs it strength. C calls up little, so the US is felt in full with D. SOP shows the effect strongly, as it does for two-phase blocking.",
        tryThis: "Switch off 'Associative activation': nothing calls up the US, and B and D learn alike.",
      },
      'minerva-al': {
        why: 'On AB frames A and the context already bring back the outcome, so each new trace stores the outcome only faintly with B, and B− frames store the opposite of the expected outcome with B. CD traces store the outcome in full, because C brings back little. B later retrieves little outcome, D retrieves much.',
        tryThis: "Switch off 'Store the discrepancy': every trace then holds the whole frame, and the gap between B and D shrinks.",
      },
      pearce: {
        why: 'A is followed by the outcome every time it appears, so the configurations containing A learn to λ. AB borrows from A alone and learns little of its own, and B alone is only half like AB, so B borrows little: blocking by generalisation. D\'s companion C predicts nothing, so the CD configuration learns all of its own and lends D half.',
        tryThis: 'Switch off \'Generalisation\': every pattern learns alone, B alone and D alone each learn from their own frames, and the gap closes.',
      },
      delamater: {
        why: 'A\'s feature is on every time the outcome comes, so A\'s weights take the error first, and on AB frames there is little error left for B. D\'s companion C predicts nothing, so D\'s feature does the work on CD frames.',
        tryThis: 'Switch off \'Hidden layer\' to see the same effect in the one-layer network.',
      },
    },
  },
  {
    id: 'probabilistic-blocking',
    title: 'Probabilistic blocking',
    predict: {
      cues: ['B', 'D'],
      prompt: 'First, A alone is followed by the outcome on 3 frames in 4. Then B is added to A, and D is added to a new cue C. Each compound is followed by the outcome on 3 frames in 4, and each companion alone on 1 frame in 4, so B and D both have ΔP = 0.5 with the outcome. Sketch B and D.',
    },
    focus: { t: 128, cue: 'B' },
    design: 'Single cue: 24 A+, 8 A-, 24 E+, 8 E-, random\nCompound: 12 AB+, 4 AB-, 4 A+, 12 A-, 12 CD+, 4 CD-, 4 C+, 12 C-, random\nContext: Z',
    reference: [{ value: 0.5, label: 'ΔP = 0.5 for B and for D', phase: 2 }],
    empirical:
      'In a two-phase design with probabilistic outcomes, the added cue B is rated lower when its companion was trained alone first than when, as for D, the companion is new. The effect grows with how often the companion was followed by the outcome in the first phase. People show an effect of the same size in the backward order, with the single-cue phase second.',
    citation: 'Shanks (1985); Hannah et al. (2009), Experiment 3',
    criterion: 'Averaged over 8 streams, D ends above B, though both have ΔP = 0.5 in the compound phase. E is the control\'s own first-phase companion; it never appears again.',
    check(run, h) {
      const [d, b] = h.overSeeds(8, (r) => [h.final(r, 'D'), h.final(r, 'B')]);
      return { shown: d - b > h.margin, measure: `Averaged over 8 streams: D ends at ${f(d)}, B at ${f(b)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: "After the first phase A predicts about 0.4, so B starts the compound phase with a smaller error than D and gains more slowly. But A alone is followed by the outcome on only 1 frame in 4 in the compound phase, so A's strength falls, the error on AB frames returns, and B catches up. At asymptote B and D both reach their contingency given the companion, 0.5. The model predicts only a small, passing effect, and none at all in the backward order.",
        tryThis: 'Change the first phase to "32 A+, 32 E+" so A predicts the outcome perfectly at first. The effect grows a little, and still fades as A- frames pull A down. Then swap the two phases: nothing changes for B after its last frame.',
      },
      mackintosh: {
        why: "Each cue learns from its own error, so B and D both head for how often the outcome follows them, and A's history does not enter B's error. Attention to B can even rise, because B predicts the outcome better than A does during the compound phase, where A alone is followed by it only 1 frame in 4. The model shows no blocking here.",
        tryThis: "Watch α_B and α_D on the attention chart: B's attention is as high as D's or higher.",
      },
      'pearce-hall': {
        why: "A predicts the outcome after the first phase, so the first AB frames are less surprising than the first CD frames, and attention to B falls sooner than attention to D. B's excitatory strength grows more slowly as a result. The gap is modest and depends on the order of frames.",
        tryThis: 'Compare α_B and α_D on the attention chart in the first compound frames.',
      },
      sop: {
        why: "A calls up the US into A2 on AB frames, so fewer US elements reach A1 with B, and B's time in A1 while the US is in A2 costs it strength. C has no history, so the US is felt in full with D. The model shows a clear effect in this order. In the backward order it would show none: absent cues do not change.",
        tryThis: 'Step to the first compound frame and open Inside the trial for B, then for D.',
      },
      'minerva-al': {
        why: 'In the first phase the context and A are stored with the outcome, so on AB frames A brings the outcome back and the trace stores it only faintly with B. C is new, so CD traces store the outcome in full. The effect is modest with probabilistic outcomes, because the A+ and A− frames in the compound phase also store traces that weaken what A brings back.',
        tryThis: "Swap the two phases. MINERVA-AL is the one model here that can change B while B is absent, as in backward blocking, but with these probabilistic frames the backward effect is small.",
      },
      pearce: {
        why: 'A\'s configuration learns toward 0.75 in the first phase and lends AB half of it, so AB learns less of its own than CD, which starts from nothing. B borrows half of AB and D half of CD, so B ends a little below D. The effect is modest because A alone is followed by the outcome on only a quarter of the compound-phase frames, which pulls A\'s configuration down and lets AB learn more.',
        tryThis: 'Compare with the deterministic Blocking preset, where A is always reinforced and the gap between B and D is wide.',
      },
      delamater: {
        why: 'A\'s weights are partly trained before the compound phase, so AB frames start with a smaller error than CD frames, and B learns more slowly than D at first. The difference is small, because A alone is followed by the outcome on only a quarter of the compound-phase frames and loses strength.',
        tryThis: 'Compare with the Blocking preset, where A is always reinforced.',
      },
    },
  },

  // ---- Discriminations with more than one outcome (Delamater, 2012) --------
  {
    id: 'acquired-equivalence',
    title: 'Acquired equivalence',
    predict: {
      cues: ['B', 'F'],
      prompt: 'Two groups of four cues, each with two visual and two auditory cues. In the first phase one cue of each pair is reinforced. Then the roles reverse. In the first group the reversed cues get a different outcome from their partner\'s (A+1 then B+2); in the second the same (E+1 then F+1). Sketch B and F through the reversal.',
    },
    focus: { phase: 1, cue: 'B' },
    design: 'Acquisition: 30 A+1, 30 B-, 30 C-, 30 D+2, 30 E+1, 30 F-, 30 G-, 30 H+2\nReversal: 30 A-, 30 B+2, 30 C+1, 30 D-, 30 E-, 30 F+1, 30 G+2, 30 H-\nModalities: AB, CD, EF, GH',
    empirical:
      'Rats trained with two visual and two auditory cues reversed the discrimination faster when the two cues of a modality had been reinforced with different outcomes than when they shared one. Cues followed by different outcomes become more distinct; cues followed by the same outcome become more alike.',
    citation: 'Delamater (1998), Experiment 3; Delamater (2012), Figure 5',
    criterion: 'At the end of the reversal, the group whose pairs had different outcomes (A to D) separates the newly reinforced cues from the newly nonreinforced ones more than the group whose pairs shared an outcome (E to H), each cue read on its own outcome unit.',
    check(run, h) {
      const different = (h.outcome(run, 'B', 2) + h.outcome(run, 'C', 1)) / 2 - (h.outcome(run, 'A', 1) + h.outcome(run, 'D', 2)) / 2;
      const same = (h.outcome(run, 'F', 1) + h.outcome(run, 'G', 2)) / 2 - (h.outcome(run, 'E', 1) + h.outcome(run, 'H', 2)) / 2;
      return { shown: different - same > h.margin, measure: `Reversal separation: ${f(different)} with different outcomes, ${f(same)} with the same.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'The model knows one outcome, so +1 and +2 are the same reinforcer and the two groups are the same experiment. Each cue has its own strength and nothing passes between cues, so the reversal runs at the same pace in both groups.',
        tryThis: 'Compare with Delamater, where the hidden layer gives cues that shared an outcome a shared representation.',
      },
      mackintosh: {
        why: 'One outcome, and each cue learns from its own error, so the groups are the same experiment. Attention shifts to whichever cue predicts best in each phase, but equally for both groups.',
        tryThis: 'Watch the attention chart through the reversal: the newly reinforced cues gain attention in both groups alike.',
      },
      'pearce-hall': {
        why: 'One outcome, so the groups are the same experiment. The surprise of the reversal restores attention to every cue, and relearning runs at the same pace in both groups.',
        tryThis: 'Compare with Delamater, the one model here with two outcome units.',
      },
      sop: {
        why: 'SOP has one US node, so +1 and +2 are the same US and the groups are the same experiment. The reversal runs alike in both.',
        tryThis: 'Compare with Delamater, the one model here with two outcome units.',
      },
      'minerva-al': {
        why: 'The outcome is one field of the event vector, so +1 and +2 are stored the same way and the groups are the same experiment. Traces of the first phase still match the reversal probes, which slows relearning equally in both groups.',
        tryThis: 'Compare with Delamater, where the two outcomes are two units and shape what the cues look like inside the network.',
      },
      pearce: {
        why: 'One outcome, and each configuration learns on its own, so the groups are the same experiment. A cue\'s configuration carries its excitation into the reversal and learns inhibition at the same pace in both groups.',
        tryThis: 'Compare with Delamater, the one model here with two outcome units.',
      },
      delamater: {
        why: 'In the first group A and D drive different outcome units, so the hidden layer learns to represent them differently, and B and C, which share modality features with them, inherit distinct representations. In the second group E and H drive the same unit and come to share hidden units, and so do their partners. Distinct representations are easier to re-map, so the first group reverses faster. This is the network\'s account of acquired distinctiveness and equivalence.',
        tryThis: 'Open Inside network 1 on an A trial and a B trial at the end of acquisition, then on an E trial and an F trial: the first pair\'s hidden patterns differ more than the second\'s.',
      },
    },
  },
  {
    id: 'biconditional',
    title: 'Biconditional discrimination',
    predict: {
      cues: ['AC', 'AD'],
      prompt: 'Four compounds of a visual and an auditory cue. AC and BD are reinforced, AD and BC are not, so no single cue predicts anything on its own. Sketch AC and AD.',
    },
    focus: { t: 120, cue: 'A' },
    design: 'Training: 30 AC+1, 30 AD-, 30 BC-, 30 BD+2\nModalities: AB, CD\nTest: AC, AD, BC, BD',
    empirical:
      'Animals learn to respond to AC and BD and not to AD and BC, though every cue is reinforced exactly as often as not. Rats learn it faster when the two reinforced compounds have different outcomes.',
    citation: 'Delamater, Kranjec & Fein (2010); Delamater (2012), Figure 7',
    criterion: 'At the end of training both reinforced compounds, each read on its own outcome unit, stand above both nonreinforced compounds on every outcome unit.',
    check(run, h) {
      const pos = Math.min(h.outcome(run, 'AC', 1), h.outcome(run, 'BD', 2));
      const neg = Math.max(h.outcome(run, 'AD', 1), h.outcome(run, 'BC', 1), h.outcome(run, 'AD', 2), h.outcome(run, 'BC', 2));
      return { shown: pos - neg > h.margin, measure: `Reinforced compounds at least ${f(pos)}; nonreinforced at most ${f(neg)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'Each cue is reinforced on half its trials and not on the other half, and a compound predicts the sum of its parts, so no assignment of strengths can make AC and BD high while AD and BC are low. The strengths settle where every compound predicts about a half.',
        tryThis: 'Watch all four compound lines converge. This is the same wall as negative patterning.',
      },
      mackintosh: {
        why: 'Each cue learns from its own error and is reinforced half the time, so every cue settles near a half and every compound near one. Attention cannot help, because no cue predicts better than any other.',
        tryThis: 'Compare with MINERVA-AL and Pearce, which treat each compound as its own pattern.',
      },
      'pearce-hall': {
        why: 'Every cue is reinforced half the time, so the surprise never goes away and attention stays high, but the compound still predicts the sum of its parts, and the sums cannot separate the four compounds.',
        tryThis: 'Compare with Delamater, where a hidden layer learns a pattern for each compound.',
      },
      sop: {
        why: 'Each cue\'s link to the US grows on its reinforced compounds and shrinks on the others, and the compound\'s retrieval adds the two links, so the four compounds stay close together.',
        tryThis: 'Compare with Pearce, where each compound is a configuration with its own strength.',
      },
      'minerva-al': {
        why: 'Each compound is stored as its own traces. An AC probe matches AC traces best, which hold the outcome, and AD and BC traces, which hold its opposite, less. The compounds separate, as in negative patterning.',
        tryThis: 'Open the memory view on an AD trial: the AD traces store the opposite of the outcome that AC and BD led the probe to expect.',
      },
      pearce: {
        why: 'The four compounds are four configurations. Each learns for itself, and similar configurations lend to each other, but AC and BD gain excitation of their own while AD and BC gain inhibition until the borrowed excitation is cancelled.',
        tryThis: 'Open Configurations at the end: the two reinforced rows carry E, the two nonreinforced rows carry I.',
      },
      delamater: {
        why: 'The hidden layer learns a different pattern for each compound, so that AC drives outcome unit 1, BD drives outcome unit 2, and AD and BC drive neither. It learns faster here than with one outcome, because the two reinforced compounds pull their hidden representations apart from the start.',
        tryThis: 'Change +2 to + so that both reinforced compounds share an outcome, run again, and compare how far the compounds have separated. Then switch off \'Hidden layer\' and watch the four lines converge.',
      },
    },
  },
  {
    id: 'feature-positive',
    title: 'Feature-positive effect',
    predict: {
      cues: ['AC', 'A'],
      prompt: 'Two discriminations at once. Feature-positive: AC is reinforced and A alone is not. Feature-negative: B alone is reinforced and BD is not. Sketch AC and A.',
    },
    focus: { t: 60, cue: 'C' },
    design: 'Training: 30 AC+, 30 A-, 30 B+, 30 BD-\nModalities: AB, CD\nTest: AC, A, B, BD',
    empirical:
      'Learning that a feature signals the outcome (AC+, A−) is easier than learning that it signals the outcome\'s absence (B+, BD−), for animals and people alike.',
    citation: 'Jenkins & Sainsbury (1969); Hearst (1984); Delamater (2012), Figure 10',
    criterion: 'Halfway through training, the feature-positive gap (AC above A) is bigger than the feature-negative gap (B above BD).',
    check(run, h) {
      const t = Math.round(run.trials.length / 2);
      const fp = h.at(run, 'AC', t) - h.at(run, 'A', t);
      const fn = h.at(run, 'B', t) - h.at(run, 'BD', t);
      return { shown: fp - fn > h.margin, measure: `After ${t} trials: feature-positive gap ${f(fp)}, feature-negative gap ${f(fn)}.` };
    },
    models: {
      'rescorla-wagner': {
        why: 'In the feature-positive task the feature C simply gains strength, while A stays near zero: the gap is V_C. In the feature-negative task D must go below zero to cancel B, and it can only do so after B has gained strength for it to cancel, so the gap opens later. Both end up the same size.',
        tryThis: 'Step through the first 20 trials and compare V_C with V_D in the table.',
      },
      mackintosh: {
        why: 'The feature C predicts the outcome better than anything else on AC trials and gains attention; D predicts nothing on BD trials (λ = 0 and V_D = 0 tie with B\'s error), so D\'s attention never rises and D cannot cancel B. The feature-negative task is not learned at all.',
        tryThis: 'Switch on the 1975 direction rule, or compare with Pearce-Hall, where the surprise on BD trials keeps attention to D high.',
      },
      'pearce-hall': {
        why: 'On AC trials the outcome is a surprise and C, present only then, takes it up quickly. On BD trials the missing outcome is a surprise too, but D gains inhibition only as fast as B over-predicts, which takes B\'s own learning first.',
        tryThis: 'Compare α_C and α_D on the attention chart over the first trials.',
      },
      sop: {
        why: 'C and the US are in A1 together from the first AC trial, so C gains at once. D can only lose strength while B calls the US up into A2, which needs B trained first, so the feature-negative gap opens later.',
        tryThis: 'Step to an early BD trial and open Inside the trial for D: little of the US is in A2 yet.',
      },
      'minerva-al': {
        why: 'Both tasks are stored as traces and both gaps open at the same pace: AC traces hold the outcome and A traces its opposite, just as B traces hold the outcome and BD traces its opposite. Memory for instances does not care which way round the feature goes.',
        tryThis: 'Compare with Delamater, where the error-driven rule makes the positive task faster.',
      },
      pearce: {
        why: 'The two tasks are mirror images for configurations: AC is reinforced and A is not, B is reinforced and BD is not. Each reinforced configuration gains excitation and each nonreinforced one gains inhibition at the same pace, so the gaps match.',
        tryThis: 'Open Configurations: AC and B carry E, A and BD carry I, in matching amounts.',
      },
      delamater: {
        why: 'Early in training the outcome units say little, so the error on a reinforced trial is large and the error on a nonreinforced trial is small. In the feature-positive task the feature C is present on the big-error trials and learns fast; in the feature-negative task the feature D is present only on the small-error trials. The paper also notes that D has the harder job, both inhibiting the outcome and opposing B\'s pathway.',
        tryThis: 'Step through the first 20 trials and compare the δ column on AC trials with that on BD trials.',
      },
    },
  },
];

export function byId(id) {
  return phenomena.find((p) => p.id === id);
}
