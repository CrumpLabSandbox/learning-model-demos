// "Check yourself" questions for the primer. Each option says why it is
// right or wrong, so a wrong answer still teaches something.

export const checks = {
  names: {
    q: 'In V<sub>A</sub> and V<sub>B</sub>, what does the subscript tell you?',
    options: [
      { text: 'Which cue the strength belongs to', correct: true, why: 'Right. V is the kind of quantity (associative strength) and the subscript names the cue.' },
      { text: 'That V is multiplied by A', correct: false, why: 'No. A subscript is a label, not a number. V<sub>A</sub> is one quantity: the strength of cue A.' },
      { text: 'The trial number', correct: false, why: 'Not here. On this site the trial number is written as a superscript, such as V<sup>n</sup>, and only when it is needed.' },
    ],
  },
  delta: {
    q: 'A cue\'s strength goes from 0.7 to 0.5 on one trial. What is ΔV?',
    options: [
      { text: '−0.2', correct: true, why: 'Right. Change is after minus before: 0.5 − 0.7 = −0.2. The minus sign means the strength went down.' },
      { text: '0.2', correct: false, why: 'Close, but the sign matters. After minus before is 0.5 − 0.7 = −0.2, and the negative sign says the strength fell.' },
      { text: '0.5', correct: false, why: 'That is the new value, not the change. Δ means "change in", so subtract the old value.' },
    ],
  },
  sigma: {
    q: 'V<sub>A</sub> = 0.5, V<sub>B</sub> = 0.3, V<sub>C</sub> = 0.9. On a trial with A and B only, what is ΣV?',
    options: [
      { text: '0.8', correct: true, why: 'Right. Σ adds up the cues present on this trial, A and B: 0.5 + 0.3 = 0.8. C is not there, so it is left out.' },
      { text: '1.7', correct: false, why: 'That adds all three cues. Σ in Rescorla-Wagner adds only the cues present on the trial, and C is absent.' },
      { text: '0.4', correct: false, why: 'That is the average. Σ means add up, not average: 0.5 + 0.3 = 0.8.' },
    ],
  },
  multiply: {
    q: 'α = 0.5, β = 0.5, and the error (λ − ΣV) is 0.8. What is ΔV = αβ(λ − ΣV)?',
    options: [
      { text: '0.2', correct: true, why: 'Right. Symbols side by side are multiplied: 0.5 × 0.5 × 0.8 = 0.2.' },
      { text: '1.8', correct: false, why: 'That adds them. Writing symbols next to each other means multiply: 0.5 × 0.5 × 0.8 = 0.2.' },
      { text: '0.8', correct: false, why: 'That is the error alone. α and β scale it down: 0.5 × 0.5 × 0.8 = 0.2.' },
    ],
  },
  error: {
    q: 'λ = 0 (no outcome) but the cues present predict ΣV = 0.6. What happens to their strengths?',
    options: [
      { text: 'They go down', correct: true, why: 'Right. The error is 0 − 0.6 = −0.6. A negative error means less happened than predicted, so the strengths fall. This is how extinction works.' },
      { text: 'They go up', correct: false, why: 'The error is 0 − 0.6 = −0.6, which is negative. Strengths only go up when the outcome is bigger than predicted.' },
      { text: 'Nothing changes, because there was no outcome', correct: false, why: 'A missing outcome still teaches something when it was expected. The error 0 − 0.6 is not zero, so the strengths change.' },
    ],
  },
  trials: {
    q: 'What does V<sup>n+1</sup> mean?',
    options: [
      { text: 'V on the trial after trial n', correct: true, why: 'Right. The superscript is a trial counter. V<sup>n+1</sup> is the strength one trial later than V<sup>n</sup>.' },
      { text: 'V raised to the power n + 1', correct: false, why: 'In most algebra a superscript is a power, which is why this is confusing. In learning models it usually counts trials. The surrounding text should say which.' },
      { text: 'V plus n plus 1', correct: false, why: 'A superscript is never addition. Here it is a label for which trial the value belongs to.' },
    ],
  },
  absolute: {
    q: 'What is |−0.4|?',
    options: [
      { text: '0.4', correct: true, why: 'Right. The bars mean "how big, ignoring the sign", so −0.4 becomes 0.4.' },
      { text: '−0.4', correct: false, why: 'The bars remove the sign. |−0.4| is the size of −0.4, which is 0.4.' },
      { text: '0', correct: false, why: 'The bars do not round anything to zero; they drop the minus sign. |−0.4| = 0.4.' },
    ],
  },
  changing: {
    q: 'In Mackintosh\'s model, who sets the value of α<sub>B</sub> on trial 30?',
    options: [
      { text: 'The model calculates it', correct: true, why: 'Right. The modeller sets only the starting value, α<sub>B</sub><sup>0</sup>. After that the model changes α<sub>B</sub> on every trial with B, depending on how well B predicts.' },
      { text: 'The modeller, before training', correct: false, why: 'The modeller sets α<sub>B</sub><sup>0</sup>, the value on trial 0. From then on the model changes α<sub>B</sub> itself, so by trial 30 it is computed.' },
      { text: 'The experimenter', correct: false, why: 'The experimenter decides which cues appear and when, but not how much attention they get. That is calculated by the model.' },
    ],
  },
  bar: {
    q: 'A cue has V = 0.9 and V̄ = 0.7. What does it predict overall?',
    options: [
      { text: '0.2', correct: true, why: 'Right. Its net strength is V − V̄ = 0.9 − 0.7 = 0.2: a weak prediction that the outcome will happen.' },
      { text: '1.6', correct: false, why: 'That adds them. V̄ is inhibitory strength, which works against V, so subtract: 0.9 − 0.7 = 0.2.' },
      { text: '0.9', correct: false, why: 'That ignores the inhibition. The cue has learned both, so its prediction is V − V̄ = 0.2.' },
    ],
  },
  states: {
    q: 'At one moment p<sub>A1,A</sub> = 0.4 and p<sub>A2,A</sub> = 0.35. What proportion of A\'s elements are inactive?',
    options: [
      { text: '0.25', correct: true, why: 'Right. Every element is in exactly one state, so the three proportions add up to 1: 1 − 0.4 − 0.35 = 0.25.' },
      { text: '0.75', correct: false, why: 'That is the proportion that is active, in A1 or A2: 0.4 + 0.35 = 0.75. The rest, 1 − 0.75 = 0.25, are inactive.' },
      { text: '0.4', correct: false, why: 'That is the proportion in A1. The three states share all the elements, so inactive is 1 − 0.4 − 0.35 = 0.25.' },
    ],
  },
  overlap: {
    q: 'At one moment, 0.5 of the cue\'s elements are in A1 and none of the US\'s are. How much does this moment add to the gain?',
    options: [
      { text: 'Nothing', correct: true, why: 'Right. The moment adds the product, 0.5 × 0 = 0. Gain needs both to be active at the same moment.' },
      { text: '0.5', correct: false, why: 'That adds instead of multiplying. Each moment adds the product 0.5 × 0, and anything times 0 is 0.' },
      { text: '0.25', correct: false, why: 'That would be 0.5 × 0.5. Here the US has nothing in A1, so the product is 0.5 × 0 = 0.' },
    ],
  },
  vectors: {
    q: 'With four features per stimulus, A is [1, 1, 1, 1, 0, 0, 0, 0] and the outcome is [0, 0, 0, 0, 1, 1, 1, 1]. What is the event when A is followed by the outcome?',
    options: [
      { text: '[1, 1, 1, 1, 1, 1, 1, 1]', correct: true, why: 'Right. Stimuli that happen together are added, feature by feature. A fills the first four, the outcome the last four.' },
      { text: '[1, 1, 1, 1, 0, 0, 0, 0]', correct: false, why: 'That is A on its own: the probe, before the outcome. The event adds the outcome\'s features too.' },
      { text: '[2, 2, 2, 2, 0, 0, 0, 0]', correct: false, why: 'Adding A to itself would give 2s. Here A and the outcome have separate fields, so adding them fills all eight features with 1.' },
    ],
  },
  echo: {
    q: 'Trace 1 has similarity 0.5 to the probe and trace 2 has similarity 1. With the exponent k = 3, how much more does trace 2 count in the echo?',
    options: [
      { text: '8 times as much', correct: true, why: 'Right. 0.5³ = 0.125 and 1³ = 1, and 1 is 8 times 0.125. Cubing makes close matches count far more than loose ones.' },
      { text: 'Twice as much', correct: false, why: 'That compares the similarities, 1 and 0.5. The activations are cubed: 1³ = 1 and 0.5³ = 0.125, which is 8 times.' },
      { text: '3 times as much', correct: false, why: 'The 3 is a power, not a multiplier: 0.5³ = 0.5 × 0.5 × 0.5 = 0.125, so trace 2 counts 1 / 0.125 = 8 times as much.' },
    ],
  },
  contingency: {
    q: 'In a 60-frame stream, the cue and outcome came together on 15 frames, the cue came alone on 15, the outcome came alone on 15, and nothing came on 15. What is ΔP?',
    options: [
      { text: '0', correct: true, why: 'Right. P(outcome | cue) = 15/30 = 0.5 and P(outcome | no cue) = 15/30 = 0.5, so ΔP = 0. The cue made no difference, though it was paired with the outcome 15 times.' },
      { text: '0.5', correct: false, why: 'That is P(outcome | cue), the first half of ΔP. Subtract the outcome\'s chance without the cue, also 0.5, and the contingency is 0.' },
      { text: '0.25', correct: false, why: 'That is the fraction of all frames with both cue and outcome, 15 of 60. ΔP compares two rows of the table: 15/30 − 15/30 = 0.' },
    ],
  },
  criterion: {
    q: 'A manipulation makes people call more streams "strong" without changing how well they tell strong streams from weak ones. In signal detection terms, what moved?',
    options: [
      { text: 'The criterion', correct: true, why: 'Right. A lower cut-off turns more streams of both kinds into "strong" responses. Sensitivity, the distance between the two curves, is unchanged. This is what outcome density did in the streamed-trial studies.' },
      { text: 'Sensitivity', correct: false, why: 'A change in sensitivity would make the two kinds of stream easier or harder to tell apart. Here they are told apart just as well; only the cut-off moved.' },
      { text: 'Both', correct: false, why: 'Both can move in general, but the question says telling them apart did not change. Only the criterion did.' },
    ],
  },
};
