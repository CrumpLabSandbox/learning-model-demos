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
};
