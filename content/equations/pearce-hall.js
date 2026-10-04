// Equation spec for Pearce-Hall (1980), with the running average of
// Pearce, Kaye, and Hall (1982). See js/models/pearce-hall.js.

import { fmt } from '../../js/core/format.js';

const pc = (r, c) => r.perCue[c];

export const symbols = {
  V: {
    primer: 'names',
    render: { base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'excitatory strength',
    meaning: (c) => `How strongly ${c} predicts that the outcome WILL happen, before this trial. It only ever grows.`,
    where: 'Table: the V columns.',
    value: (r, c) => r.Vbefore[c],
  },
  Vbar: {
    primer: 'bar',
    render: { base: 'V', sub: 'cue', bar: true },
    role: 'computed',
    name: 'inhibitory strength',
    meaning: (c) => `How strongly ${c} predicts that the outcome will NOT happen, before this trial. The bar over V marks it as the inhibitory kind. It only ever grows.`,
    where: 'Table: the V̄ columns.',
    value: (r, c) => r.Vbarbefore[c],
  },
  net: {
    primer: 'bar',
    render: null,
    display: () => 'V − V̄',
    role: 'computed',
    name: 'net strength',
    meaning: (c) => `What ${c} predicts overall: excitatory minus inhibitory strength. This is the line on the prediction chart.`,
    where: 'Prediction chart: the line for the cue. Arithmetic view: the stacked bar.',
    value: (r, c) => r.Vbefore[c] - r.Vbarbefore[c],
  },
  sumV: {
    primer: 'sigma',
    render: { pre: 'Σ', base: 'V' },
    role: 'computed',
    name: 'total prediction',
    meaning: () => 'What all the cues present predict together: their net strengths added up.',
    where: 'Arithmetic view: the stacked bar. Table: the ΣV column.',
    value: (r) => r.sumV,
  },
  lambda: {
    primer: 'greek',
    render: { base: 'λ' },
    role: 'experimenter',
    name: 'outcome',
    meaning: () => 'The outcome on this trial, set by the experimenter: the + slider value when it happens, 0 when it does not.',
    where: 'Slider: outcome magnitude. Table: the λ column.',
    value: (r) => r.lambda,
    exact: true,
  },
  S: {
    primer: 'names',
    render: { base: 'S', sub: 'cue' },
    role: 'modeller',
    name: 'salience',
    meaning: (c) => `How intense or noticeable ${c} is, from 0 to 1. It never changes. Pearce and Hall keep salience (S) separate from attention (α), which does change.`,
    where: 'Slider: salience.',
    value: (r, c) => pc(r, c)?.S,
    exact: true,
  },
  alpha: {
    primer: 'changing',
    render: { base: 'α', sub: 'cue' },
    role: 'computed',
    name: 'attention',
    meaning: (c) => `How much attention ${c} gets on this trial. It is set by how surprising the outcome was on ${c}'s recent trials: high after surprises, low when the outcome has been predicted well.`,
    where: 'Attention chart: the line for the cue.',
    value: (r, c) => pc(r, c)?.alpha,
  },
  alpha0: {
    primer: 'changing',
    render: { base: 'α', sup: '0' },
    role: 'modeller',
    name: 'starting attention',
    meaning: () => 'Attention to every cue before training. A new cue gets plenty of attention, because nothing about it is known yet.',
    where: 'Slider: starting attention.',
    value: (r) => r.alpha0,
    exact: true,
  },
  gamma: {
    primer: 'greek',
    render: { base: 'γ' },
    role: 'modeller',
    name: 'how fast attention changes',
    meaning: () => 'γ is "gamma". At 1, attention is just the surprise on the last trial (the 1980 model). Below 1, attention is a running average of recent surprises, so it changes more slowly (the 1982 version).',
    where: 'Slider: how fast attention changes.',
    value: (r) => r.gamma,
    exact: true,
  },
  surprise: {
    primer: 'absolute',
    render: null,
    display: () => '|λ − ΣV|',
    role: 'computed',
    name: 'surprise',
    meaning: () => 'How surprising the trial was: the size of the gap between what happened and what was predicted, ignoring its direction. The bars | | mean "how big, ignoring the sign".',
    where: 'Arithmetic view: the gap. Table: the surprise column.',
    value: (r) => r.surprise,
  },
  shortfall: {
    primer: 'error',
    render: null,
    display: () => 'ΣV − λ',
    role: 'computed',
    name: 'how much less happened than expected',
    meaning: () => 'The prediction minus the outcome. When it is above 0, the outcome fell short of what the cues predicted, and the cues gain inhibitory strength.',
    where: 'Equations: step 3.',
    value: (r) => r.shortfall,
  },
  dV: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'change in excitatory strength',
    meaning: (c) => `How much ${c}'s excitatory strength grows on this trial.`,
    where: 'Table: the ΔV columns.',
    value: (r, c) => pc(r, c)?.deltaV,
  },
  dVbar: {
    primer: 'bar',
    render: { pre: 'Δ', base: 'V', sub: 'cue', bar: true },
    role: 'computed',
    name: 'change in inhibitory strength',
    meaning: (c) => `How much ${c}'s inhibitory strength grows on this trial.`,
    where: 'Table: the ΔV̄ columns.',
    value: (r, c) => pc(r, c)?.deltaVbar,
  },
};

export const roles = {
  experimenter: { label: 'Set by the experimenter', short: 'experimenter' },
  modeller: { label: 'Set by the modeller', short: 'parameter' },
  computed: { label: 'Computed by the model', short: 'computed' },
};

const S = (sym) => ({ sym });
const zero = { op: 'const', value: 0 };

export function equations(opts) {
  const eqs = [
    {
      id: 'sum',
      title: 'Predict',
      lhs: S('sumV'),
      rel: '=',
      rhs: { op: 'sumEach', each: (c) => ({ op: 'paren', arg: { op: 'sub', args: [{ sym: 'V', cue: c }, { sym: 'Vbar', cue: c }] } }) },
      words: '{sumV|The total prediction} is each cue\'s {V|excitatory strength} minus its {Vbar|inhibitory strength}, added up over the cues present (%present%).',
    },
    {
      id: 'excite',
      title: 'Learn when more happened than expected',
      lhs: S('dV'),
      rel: '=',
      rhs: {
        op: 'cases',
        cases: [
          { when: (r) => r.lambda > r.sumV, cond: 'if λ > ΣV', rhs: { op: 'mul', args: [S('S'), S('alpha'), S('lambda')] } },
          { cond: 'otherwise', rhs: zero },
        ],
      },
      words:
        "When the outcome is bigger than predicted, {dV|$'s excitatory strength grows} by {S|$'s salience}, times {alpha|the attention $ gets}, times {lambda|the outcome}. Notice there is no error in this step: the error works through attention instead.",
    },
  ];
  if (opts.inhibition) {
    eqs.push({
      id: 'inhibit',
      title: 'Learn when less happened than expected',
      lhs: S('dVbar'),
      rel: '=',
      rhs: {
        op: 'cases',
        cases: [
          { when: (r) => r.shortfall > 0, cond: 'if ΣV > λ', rhs: { op: 'mul', args: [S('S'), S('alpha'), { op: 'paren', group: 'shortfall', arg: { op: 'sub', args: [S('sumV'), S('lambda')] } }] } },
          { cond: 'otherwise', rhs: zero },
        ],
      },
      words:
        "When the outcome falls short of the prediction, {dVbar|$'s inhibitory strength grows} by {S|$'s salience}, times {alpha|the attention $ gets}, times {shortfall|how much less happened than expected}.",
    });
  }
  eqs.push({
    id: 'apply',
    title: 'Update strength',
    lhs: S('V'),
    rel: '←',
    rhs: { op: 'add', args: [S('V'), S('dV')] },
    words: "After the trial, {V|$'s excitatory strength} becomes its old value plus {dV|the change}.",
  });
  if (opts.inhibition) {
    eqs.push({
      id: 'applyBar',
      title: 'Update inhibitory strength',
      lhs: S('Vbar'),
      rel: '←',
      rhs: { op: 'add', args: [S('Vbar'), S('dVbar')] },
      words: "Likewise, {Vbar|$'s inhibitory strength} becomes its old value plus {dVbar|its change}.",
    });
  }
  if (opts.attention) {
    eqs.push({
      id: 'attention',
      title: 'Attention follows surprise',
      lhs: S('alpha'),
      rel: '←',
      rhs: {
        op: 'add',
        args: [
          { op: 'mul', args: [S('gamma'), { op: 'abs', group: 'surprise', arg: { op: 'sub', args: [S('lambda'), S('sumV')] } }] },
          { op: 'mul', args: [{ op: 'paren', arg: { op: 'sub', args: [{ op: 'const', value: 1 }, S('gamma')] } }, S('alpha')] },
        ],
      },
      words:
        "For $'s next trial, {alpha|attention to $} becomes a mix of {surprise|how surprising this trial was} and its old value. {gamma|γ} sets the mix: at 1, attention is just this trial's surprise. A surprise keeps attention high; a well-predicted outcome lets it fade.",
    });
  }
  return eqs;
}

export function arithmetic(opts) {
  const chains = [
    {
      title: 'Excitatory learning',
      factors: ['S', 'alpha', 'lambda'],
      result: 'dV',
      when: (r) => r.lambda > r.sumV,
      whenFalse: () => 'The outcome was not bigger than predicted, so no excitatory learning on this trial.',
    },
  ];
  if (opts.inhibition) {
    chains.push({
      title: 'Inhibitory learning',
      factors: ['S', 'alpha', 'shortfall'],
      signed: ['shortfall'],
      result: 'dVbar',
      when: (r) => r.shortfall > 0,
      whenFalse: () => 'The outcome did not fall short of the prediction, so no inhibitory learning on this trial.',
    });
  }
  const states = [{ sym: 'V', after: (r, c) => r.perCue[c]?.Vafter }];
  if (opts.inhibition) states.push({ sym: 'Vbar', after: (r, c) => r.perCue[c]?.Vbarafter });
  if (opts.attention) states.push({ sym: 'alpha', after: (r, c) => r.perCue[c]?.newAlpha });
  return {
    line: { target: 'lambda', prediction: 'sumV', parts: 'net', error: 'surprise' },
    chains,
    states,
    verdict: (r, c) => {
      const s = r.surprise;
      const how = s < 0.0005 ? 'There was no surprise' : `The surprise was ${fmt(s)}`;
      if (!opts.attention) return `${how}. Attention is fixed in this version, so it stays the same.`;
      const p = r.perCue[c];
      const dir = p.newAlpha > p.alpha + 1e-9 ? 'rises toward it' : p.newAlpha < p.alpha - 1e-9 ? 'falls toward it' : 'stays the same';
      return `${how}, so attention to ${c} ${dir} for ${c}'s next trial.`;
    },
  };
}

export function tableColumns(opts, cues) {
  const cols = [
    { sym: 'lambda', value: (r) => r.lambda, exact: true },
    { sym: 'sumV', value: (r) => r.sumV },
    { sym: 'surprise', value: (r) => r.surprise, head: '|λ − ΣV|' },
  ];
  for (const c of cues) {
    cols.push({ sym: 'dV', cue: c, value: (r) => r.perCue[c]?.deltaV });
    if (opts.inhibition) cols.push({ sym: 'dVbar', cue: c, value: (r) => r.perCue[c]?.deltaVbar });
    cols.push({ sym: 'V', cue: c, value: (r) => r.Vafter[c], suffix: ' after' });
    if (opts.inhibition) cols.push({ sym: 'Vbar', cue: c, value: (r) => r.Vbarafter[c], suffix: ' after' });
    if (opts.attention) cols.push({ sym: 'alpha', cue: c, value: (r) => r.alphaAfter[c], suffix: ' after' });
  }
  return cols;
}

export function absentNote(cue, rec) {
  return `${cue} is not on this trial. Pearce-Hall changes only the cues that are present, so ${cue}'s strengths stay as they were, and attention to ${cue} keeps its last value (${fmt(rec.alphaBefore[cue])}) until ${cue} appears again.`;
}

export const codeNames = {
  lambda: 'lambda',
  sumV: 'sumV',
  surprise: 'surprise',
  shortfall: 'shortfall',
  S: 'S',
  dV: 'deltaV',
  dVbar: 'deltaVbar',
};

export const charts = [
  {
    key: 'alpha',
    title: 'Attention (α)',
    help: 'How much attention each cue gets. In the Pearce-Hall model attention follows recent surprise: it stays high while the outcome is hard to predict and fades once it is predicted well. Compare with Mackintosh, where attention rises for good predictors.',
  },
];

export const stages = [
  {
    title: 'Fixed attention, no inhibition',
    options: { attention: false, inhibition: false },
    added: ['S', 'alpha', 'lambda'],
    equation: 'excite',
    text: 'Start with a cue gaining strength by a fixed step whenever the outcome is bigger than predicted. Each step is the same size, so learning rises in a straight line and stops abruptly. A cue added to one that already predicts the outcome learns nothing, so blocking appears already. Nothing is learned when the outcome is missing, so extinction is impossible.',
  },
  {
    title: 'Attention follows surprise',
    options: { attention: true, inhibition: false },
    added: ['surprise', 'gamma'],
    equation: 'attention',
    text: 'Now attention tracks how surprising recent trials were. Early on the outcome is surprising and steps are big; as it becomes predicted, attention fades and learning slows. A cue shown many times with nothing following it loses attention, so it is learned about slowly later.',
  },
  {
    title: 'Learn from missing outcomes',
    options: { attention: true, inhibition: true },
    added: ['shortfall', 'dVbar'],
    equation: 'inhibit',
    text: 'Finally, when less happens than predicted, the cues present gain inhibitory strength. Extinction now works, by adding inhibition on top of the old learning rather than erasing it. This is the full model.',
  },
];

export const intro = `
<p>The Pearce-Hall model says that learners pay attention to cues whose consequences are still <strong>uncertain</strong>. After a surprise, attention to the cues present goes up; once the outcome is predicted well, attention fades. The surprise does not drive learning directly, as in Rescorla-Wagner: it drives attention, and attention drives learning.</p>
<p class="small muted">Each cue has two strengths: excitatory V (the outcome will happen) and inhibitory V̄ (it will not). Its prediction is the difference. This page uses the running average of attention from Pearce, Kaye, and Hall (1982); set γ to 1 for the 1980 model.</p>`;
