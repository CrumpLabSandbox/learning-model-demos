// Equation spec for Rescorla-Wagner.
//
// One spec drives every reading of the equations: MathML symbols, words,
// numbers for the selected trial, the symbol guide, hover links, the
// arithmetic view, and the trial table. Each symbol's `value` reads from the
// trial record the model returned, so the numbers shown are the numbers the
// model used.

import { fmt } from '../../js/core/format.js';

export const symbols = {
  sumV: {
    primer: 'sigma',
    render: { pre: 'Σ', base: 'V' },
    role: 'computed',
    name: 'total prediction',
    meaning: () => 'The outcome that all the cues present predict together: their strengths added up.',
    where: 'Arithmetic view: the stacked bar. Table: the ΣV column.',
    value: (r) => r.sumV,
  },
  V: {
    primer: 'names',
    render: { base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'associative strength',
    meaning: (c) => `How strongly ${c} predicts the outcome, before this trial. It starts at 0.`,
    where: 'Chart: the line for the cue. Table: the V columns.',
    value: (r, c) => r.Vbefore[c],
  },
  lambda: {
    primer: 'greek',
    render: { base: 'λ' },
    role: 'experimenter',
    name: 'outcome',
    meaning: () =>
      'The most learning this outcome can support. The experimenter sets it by choosing the trial: the + slider value when the outcome occurs, 0 when it does not.',
    where: 'Slider: outcome magnitude. Table: the λ column. Arithmetic view: the target line.',
    value: (r) => r.lambda,
    exact: true,
  },
  beta: {
    primer: 'greek',
    render: { base: 'β' },
    role: 'modeller',
    name: 'learning rate for the outcome',
    meaning: () =>
      'How quickly this outcome produces learning, from 0 (none) to 1 (all at once). A parameter: the modeller picks it.',
    where: 'Slider: learning rate.',
    value: (r) => r.beta,
    exact: true,
  },
  alpha: {
    primer: 'greek',
    render: { base: 'α', sub: 'cue' },
    role: 'modeller',
    name: 'salience',
    meaning: (c) =>
      `How noticeable ${c} is, from 0 (unnoticed) to 1 (impossible to miss). A parameter: the modeller picks it, and it never changes during training.`,
    where: 'Slider: salience of the cue.',
    value: (r, c) => r.perCue[c]?.alpha,
    exact: true,
  },
  error: {
    primer: 'error',
    render: null,
    display: (opts) => (opts.summedError === false ? 'λ − V' : 'λ − ΣV'),
    role: 'computed',
    name: 'prediction error',
    meaning: () =>
      'How surprising the outcome was: what happened minus what was predicted. Positive means more than expected, negative means less, zero means no surprise and no learning.',
    where: 'Arithmetic view: the gap between the target line and the prediction. Table: the error column.',
    value: (r, c) => r.perCue[c]?.error,
  },
  dV: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'change in strength',
    meaning: (c) => `How much ${c}'s strength changes on this trial. Δ (delta) means "change in".`,
    where: 'Chart: the step in the line from the previous trial. Table: the ΔV columns.',
    value: (r, c) => r.perCue[c]?.deltaV,
  },
};

export const roles = {
  experimenter: { label: 'Set by the experimenter', short: 'experimenter' },
  modeller: { label: 'Set by the modeller', short: 'parameter' },
  computed: { label: 'Computed by the model', short: 'computed' },
};

const S = (sym) => ({ sym });

// The equations to show, given the current options. In word templates,
// {key|text} links text to a symbol, $ is the focus cue, and %present% lists
// the cues on the trial.
export function equations(opts) {
  const prediction = opts.summedError ? S('sumV') : S('V');
  const factors = [];
  if (opts.useAlpha) factors.push(S('alpha'));
  factors.push(S('beta'));
  factors.push({ op: 'paren', label: 'prediction error', group: 'error', arg: { op: 'sub', args: [S('lambda'), prediction] } });

  const predictedWords = opts.summedError
    ? '{sumV|the outcome predicted by all the cues present}'
    : '{V|the outcome predicted by $ alone}';
  const alphaWords = opts.useAlpha ? '{alpha|how noticeable $ is}, times ' : '';

  const eqs = [];
  if (opts.summedError) {
    eqs.push({
      id: 'sum',
      title: 'Predict',
      lhs: S('sumV'),
      rel: '=',
      rhs: { op: 'sumPresent', of: 'V' },
      words: '{sumV|The total prediction} is {V|the strengths of the cues present} (%present%), added up.',
    });
  }
  eqs.push({
    id: 'update',
    title: 'Learn from the error',
    lhs: S('dV'),
    rel: '=',
    rhs: { op: 'mul', args: factors },
    words:
      `{dV|The change in $'s strength} is ${alphaWords}{beta|the learning rate}, times {error|the prediction error}: ` +
      `{lambda|the outcome that happened} minus ${predictedWords}.`,
  });
  eqs.push({
    id: 'apply',
    title: 'Update',
    lhs: S('V'),
    rel: '←',
    rhs: { op: 'add', args: [S('V'), S('dV')] },
    words: "After the trial, {V|$'s strength} becomes its old value plus {dV|the change}. The arrow ← means \"becomes\".",
  });
  return eqs;
}

// What the arithmetic view draws for one cue on one trial.
export function arithmetic(opts) {
  return {
    line: { target: 'lambda', prediction: opts.summedError ? 'sumV' : 'V', parts: opts.summedError ? 'V' : null, error: 'error' },
    chains: [{ factors: [...(opts.useAlpha ? ['alpha'] : []), 'beta', 'error'], signed: ['error'], result: 'dV' }],
    states: [{ sym: 'V', after: (r, c) => r.perCue[c]?.Vafter }],
  };
}

// Columns for the trial table, after the trial number, phase, and type.
export function tableColumns(opts, cues) {
  const cols = [{ sym: 'lambda', value: (r) => r.lambda, exact: true }];
  if (opts.summedError) {
    cols.push({ sym: 'sumV', value: (r) => r.sumV });
    cols.push({ sym: 'error', value: (r) => r.lambda - r.sumV, head: 'λ − ΣV' });
  }
  for (const c of cues) {
    if (!opts.summedError) cols.push({ sym: 'error', cue: c, value: (r) => r.perCue[c]?.error, head: `λ − V<sub>${c}</sub>` });
    cols.push({ sym: 'dV', cue: c, value: (r) => r.perCue[c]?.deltaV });
    cols.push({ sym: 'V', cue: c, value: (r) => r.Vafter[c], suffix: ' after' });
  }
  return cols;
}

export function absentNote(cue, rec) {
  return `${cue} is not on this trial. Rescorla-Wagner changes only the cues that are present, so ΔV<sub>${cue}</sub> = 0 and V<sub>${cue}</sub> stays at ${fmt(rec.Vbefore[cue])}.`;
}

// Identifiers in the model source that correspond to each symbol, so the
// code reading can link them.
export const codeNames = {
  lambda: 'lambda',
  beta: 'beta',
  sumV: 'sumV',
  alpha: 'alpha',
  error: 'error',
  dV: 'deltaV',
};

// Build the equation one term at a time.
export const stages = [
  {
    title: 'One cue, one error',
    options: { useAlpha: false, summedError: false },
    added: ['beta', 'error'],
    text: 'Start with the core idea: a cue changes in proportion to how surprising the outcome was. The error λ − V is large at first and shrinks as V approaches λ, so learning slows down as it goes.',
  },
  {
    title: 'Add salience',
    options: { useAlpha: true, summedError: false },
    added: ['alpha'],
    text: 'Multiply by α, the salience of the cue. Now a noticeable cue learns faster than a faint one. Each cue still has its own error, so cues do not affect each other.',
  },
  {
    title: 'Share the error',
    options: { useAlpha: true, summedError: true },
    added: ['sumV'],
    text: 'Replace V with ΣV, the summed prediction of every cue present. This one change makes cues compete for the same outcome. This is the full 1972 model.',
  },
];

export const intro = `
<p>Rescorla-Wagner says that learning is driven by surprise. On every trial the cues present make a prediction together. The gap between what happened and what was predicted, the prediction error, decides how much each cue changes. When the outcome is fully predicted there is no surprise and nothing is learned.</p>
<p class="small muted">Step through the trials and watch the three equations below do the work. Hover any symbol, slider, line, or column to see where it appears everywhere else on the page.</p>`;

// The idea in a picture, for the card at the top of the model page.
export const figure = {
  svg: `<svg viewBox="0 0 320 180" role="img" aria-label="Cues A and B each send their strength V into one prediction, ΣV. The prediction is compared with the outcome λ, and the error, λ minus ΣV, goes back to change every cue present.">
<defs><marker id="rw-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="f-head"/></marker>
<marker id="rw-head-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="f-head-comp"/></marker></defs>
<circle cx="40" cy="50" r="17" class="f-node"/><text x="40" y="54" text-anchor="middle" font-weight="600">A</text>
<circle cx="40" cy="120" r="17" class="f-node"/><text x="40" y="124" text-anchor="middle" font-weight="600">B</text>
<path d="M58 54 L128 78" class="f-line" marker-end="url(#rw-head)"/>
<path d="M58 116 L128 92" class="f-line" marker-end="url(#rw-head)"/>
<text x="84" y="56" class="f-sym f-comp">V<tspan font-size="9" dy="3">A</tspan></text>
<text x="84" y="118" class="f-sym f-comp">V<tspan font-size="9" dy="3">B</tspan></text>
<rect x="130" y="63" width="70" height="44" rx="8" class="f-box"/>
<text x="165" y="81" text-anchor="middle" class="f-sym f-comp">ΣV</text>
<text x="165" y="98" text-anchor="middle" class="f-small">prediction</text>
<rect x="240" y="63" width="66" height="44" rx="8" class="f-box"/>
<text x="273" y="81" text-anchor="middle" class="f-sym f-exp">λ</text>
<text x="273" y="98" text-anchor="middle" class="f-small">outcome</text>
<path d="M203 85 L237 85" class="f-dash"/>
<text x="220" y="50" text-anchor="middle" class="f-sym f-comp">λ − ΣV</text>
<text x="220" y="62" text-anchor="middle" class="f-small">the error</text>
<path d="M220 108 L220 150 L40 150 L40 139" class="f-dash" marker-end="url(#rw-head-c)"/>
<text x="130" y="166" text-anchor="middle" class="f-sym f-comp">ΔV = αβ (λ − ΣV)</text>
</svg>`,
  caption: 'Every cue present adds its strength into one prediction. The gap between the outcome and the prediction is the error, and each cue present changes by its share of that error.',
};
