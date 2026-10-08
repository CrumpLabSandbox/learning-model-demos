// Equation spec for Mackintosh (1975). See js/models/mackintosh.js for the
// model and the two versions of the attention rule.

import { fmt } from '../../js/core/format.js';

const pc = (r, c) => r.perCue[c];

export const symbols = {
  V: {
    primer: 'names',
    render: { base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'associative strength',
    meaning: (c) => `How strongly ${c} predicts the outcome, before this trial. It starts at 0.`,
    where: 'Prediction chart: the line for the cue. Table: the V columns.',
    value: (r, c) => r.Vbefore[c],
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
  theta: {
    primer: 'greek',
    render: { base: 'θ' },
    role: 'modeller',
    name: 'learning rate for the outcome',
    meaning: () => 'How quickly the outcome produces learning, from 0 to 1. θ is "theta". It plays the part β plays in Rescorla-Wagner.',
    where: 'Slider: learning rate.',
    value: (r) => r.theta,
    exact: true,
  },
  alpha: {
    primer: 'changing',
    render: { base: 'α', sub: 'cue' },
    role: 'computed',
    name: 'attention',
    meaning: (c) =>
      `How much attention ${c} gets on this trial, between the lowest attention and 1. In Rescorla-Wagner α was fixed; here the model changes it after every trial on which ${c} appears.`,
    where: 'Attention chart: the line for the cue.',
    value: (r, c) => pc(r, c)?.alpha,
  },
  alpha0: {
    primer: 'changing',
    render: { base: 'α', sub: 'cue', sup: '0' },
    role: 'modeller',
    name: 'starting attention',
    meaning: (c) => `How much attention ${c} gets before any training: its salience. The superscript 0 means "on trial 0".`,
    where: 'Slider: starting attention.',
    value: (r, c) => r.alphaStart?.[c],
    exact: true,
  },
  error: {
    primer: 'error',
    render: null,
    display: () => 'λ − V',
    role: 'computed',
    name: "the cue's own error",
    meaning: (c) => `What happened minus what ${c} alone predicted. Unlike Rescorla-Wagner, each cue learns from its own error, not from the error of all the cues together.`,
    where: 'Arithmetic view: the gap. Table: the error columns.',
    value: (r, c) => pc(r, c)?.error,
  },
  dV: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'change in strength',
    meaning: (c) => `How much ${c}'s strength changes on this trial.`,
    where: 'Prediction chart: the step in the line. Table: the ΔV columns.',
    value: (r, c) => pc(r, c)?.deltaV,
  },
  others: {
    primer: 'sigma',
    render: { pre: 'Σ', base: 'V', sub: 'others' },
    role: 'computed',
    name: 'what the other cues predict',
    meaning: (c) => `The strengths of all the cues present except ${c}, added up. 0 if ${c} is alone.`,
    where: 'Equations: step 3.',
    value: (r, c) => pc(r, c)?.others,
  },
  selfError: {
    primer: 'absolute',
    render: null,
    display: () => '|λ − V|',
    role: 'computed',
    name: 'how wrong this cue was',
    meaning: (c) => `The size of ${c}'s own error, ignoring whether it was too high or too low. The bars | | mean "how big, ignoring the sign".`,
    where: 'Equations: step 4.',
    value: (r, c) => pc(r, c)?.selfError,
  },
  othersError: {
    primer: 'absolute',
    render: null,
    display: () => '|λ − ΣV others|',
    role: 'computed',
    name: 'how wrong the other cues were',
    meaning: () => 'The size of the error the other cues present would make on their own, ignoring the sign.',
    where: 'Equations: step 4.',
    value: (r, c) => pc(r, c)?.othersError,
  },
  thetaA: {
    primer: 'greek',
    render: { base: 'θ', sub: 'α' },
    role: 'modeller',
    name: 'how fast attention changes',
    meaning: () => 'A rate between 0 and 1. At 0 attention never changes; at 1 it changes as much as the rule allows on every trial.',
    where: 'Slider: how fast attention changes.',
    value: (r) => r.thetaAlpha,
    exact: true,
  },
  alphaMin: {
    primer: 'greek',
    render: { base: 'α', sub: 'min' },
    role: 'modeller',
    name: 'lowest attention',
    meaning: () => 'Attention never falls below this, so a cue can always be learned about a little.',
    where: 'Slider: lowest attention.',
    value: (r) => r.alphaMin,
    exact: true,
  },
  room: {
    primer: 'changing',
    render: null,
    display: () => 'room to move',
    role: 'computed',
    name: 'room to move',
    meaning: () => 'How far attention can still go in the direction it is moving: up to 1, or down to the lowest attention.',
    where: 'Arithmetic view: attention.',
    value: (r, c) => (pc(r, c)?.better ? 1 - pc(r, c).alpha : -(pc(r, c).alpha - r.alphaMin)),
  },
  comparison: {
    primer: 'absolute',
    render: null,
    display: () => 'others\' error − own error',
    role: 'computed',
    name: 'how much better this cue predicts',
    meaning: (c) => `How much smaller ${c}'s error is than the other cues' error. Positive: ${c} is the better predictor, so its attention rises. Negative: it falls.`,
    where: 'Arithmetic view: attention.',
    value: (r, c) => pc(r, c)?.othersError - pc(r, c)?.selfError,
  },
  dAlpha: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'α', sub: 'cue' },
    role: 'computed',
    name: 'change in attention',
    meaning: (c) => `How much attention to ${c} changes after this trial.`,
    where: 'Attention chart: the step in the line.',
    value: (r, c) => pc(r, c)?.deltaAlpha,
  },
};

export const roles = {
  experimenter: { label: 'Set by the experimenter', short: 'experimenter' },
  modeller: { label: 'Set by the modeller', short: 'parameter' },
  computed: { label: 'Computed by the model', short: 'computed' },
};

const S = (sym) => ({ sym });
const better = (r, c) => r.perCue[c]?.better;

export function equations(opts) {
  const eqs = [
    {
      id: 'update',
      title: 'Learn from your own error',
      lhs: S('dV'),
      rel: '=',
      rhs: { op: 'mul', args: [S('theta'), S('alpha'), { op: 'paren', label: 'own error', group: 'error', arg: { op: 'sub', args: [S('lambda'), S('V')] } }] },
      words:
        "{dV|The change in $'s strength} is {theta|the learning rate}, times {alpha|the attention $ gets}, times {error|$'s own error}: {lambda|the outcome} minus {V|what $ alone predicted}.",
    },
    {
      id: 'apply',
      title: 'Update strength',
      lhs: S('V'),
      rel: '←',
      rhs: { op: 'add', args: [S('V'), S('dV')] },
      words: "After the trial, {V|$'s strength} becomes its old value plus {dV|the change}.",
    },
  ];
  if (!opts.attention) return eqs;
  eqs.push({
    id: 'others',
    title: 'What do the other cues predict?',
    lhs: S('others'),
    rel: '=',
    rhs: { op: 'sumOthers', of: 'V' },
    words: '{others|What the other cues predict} is the strengths of the cues present other than $, added up.',
  });
  const selfAbs = { op: 'abs', group: 'selfError', arg: { op: 'sub', args: [S('lambda'), S('V')] } };
  const othersAbs = { op: 'abs', group: 'othersError', arg: { op: 'sub', args: [S('lambda'), S('others')] } };
  if (opts.directionRule) {
    eqs.push({
      id: 'attention',
      title: 'Is $ the best predictor? (1975 direction rule)',
      lhs: S('dAlpha'),
      rel: '=',
      rhs: {
        op: 'cases',
        cases: [
          { when: better, cond: 'if |λ − V| < |λ − ΣV others|', rhs: { op: 'mul', args: [S('thetaA'), { op: 'paren', arg: { op: 'sub', args: [{ op: 'const', value: 1 }, S('alpha')] } }] } },
          { cond: 'otherwise (a tie too)', rhs: { op: 'neg', arg: { op: 'mul', args: [S('thetaA'), { op: 'paren', arg: { op: 'sub', args: [S('alpha'), S('alphaMin')] } }] } } },
        ],
      },
      words:
        "If {selfError|$'s own error} is smaller than {othersError|the other cues' error}, $ is the better predictor and {dAlpha|attention to $} moves part of the way up to 1. Otherwise, even in a tie, it moves part of the way down to {alphaMin|the lowest attention}. {thetaA|The rate} sets how far each step goes.",
    });
  } else {
    eqs.push({
      id: 'attention',
      title: 'Is $ the best predictor?',
      lhs: S('dAlpha'),
      rel: '=',
      rhs: { op: 'mul', args: [S('thetaA'), { op: 'paren', arg: { op: 'sub', args: [othersAbs, selfAbs] } }] },
      words:
        "{dAlpha|The change in attention to $} is {thetaA|the attention rate}, times {othersError|how wrong the other cues were} minus {selfError|how wrong $ was}. If $ was less wrong than the others, attention to $ goes up; if more wrong, it goes down.",
    });
  }
  eqs.push({
    id: 'attnApply',
    title: 'Update attention',
    lhs: S('alpha'),
    rel: '←',
    rhs: { op: 'clamp', note: '(kept between α min and 1)', arg: { op: 'add', args: [S('alpha'), S('dAlpha')] }, lo: S('alphaMin'), hi: { op: 'const', value: 1 } },
    words: "After the trial, {alpha|attention to $} becomes its old value plus {dAlpha|the change}, but never below {alphaMin|the lowest attention} or above 1. The new value is used on $'s next trial.",
  });
  return eqs;
}

export function arithmetic(opts) {
  const chains = [{ title: 'Learning', factors: ['theta', 'alpha', 'error'], signed: ['error'], result: 'dV' }];
  if (opts.attention) {
    chains.push(
      opts.directionRule
        ? { title: 'Attention', factors: ['thetaA', 'room'], signed: ['room'], result: 'dAlpha' }
        : { title: 'Attention', factors: ['thetaA', 'comparison'], signed: ['comparison'], result: 'dAlpha' },
    );
  }
  const states = [{ sym: 'V', after: (r, c) => r.perCue[c]?.Vafter }];
  if (opts.attention) states.push({ sym: 'alpha', after: (r, c) => r.perCue[c]?.newAlpha });
  return {
    line: { target: 'lambda', prediction: 'V', parts: null, error: 'error' },
    chains,
    states,
    verdict: (r, c) => {
      const p = r.perCue[c];
      const learn = Math.abs(p.error) < 0.0005 ? `${c} predicted the outcome, so its strength barely changes` : p.error > 0 ? `the outcome was bigger than ${c} predicted, so ${c}'s strength goes up` : `the outcome was smaller than ${c} predicted, so ${c}'s strength goes down`;
      if (!opts.attention) return `${learn[0].toUpperCase()}${learn.slice(1)}.`;
      const who = p.selfError < p.othersError ? `${c} was a better predictor than the other cues present` : p.selfError > p.othersError ? `the other cues present predicted better than ${c}` : `${c} predicted no better than the other cues`;
      const dir = p.deltaAlpha > 1e-9 ? 'attention to it rises' : p.deltaAlpha < -1e-9 ? 'attention to it falls' : 'attention to it stays the same';
      return `${learn[0].toUpperCase()}${learn.slice(1)}. And ${who}, so ${dir}.`;
    },
  };
}

export function tableColumns(opts, cues) {
  const cols = [{ sym: 'lambda', value: (r) => r.lambda, exact: true }];
  for (const c of cues) {
    cols.push({ sym: 'error', cue: c, value: (r) => r.perCue[c]?.error, head: `λ − V<sub>${c}</sub>` });
    cols.push({ sym: 'dV', cue: c, value: (r) => r.perCue[c]?.deltaV });
    cols.push({ sym: 'V', cue: c, value: (r) => r.Vafter[c], suffix: ' after' });
    if (opts.attention) cols.push({ sym: 'alpha', cue: c, value: (r) => r.alphaAfter[c], suffix: ' after' });
  }
  return cols;
}

export function absentNote(cue, rec) {
  return `${cue} is not on this trial. Mackintosh changes only the cues that are present, so V<sub>${cue}</sub> stays at ${fmt(rec.Vbefore[cue])} and attention to ${cue} stays at ${fmt(rec.alphaBefore[cue])}.`;
}

export const codeNames = {
  lambda: 'lambda',
  theta: 'theta',
  error: 'error',
  dV: 'deltaV',
  others: 'others',
  selfError: 'selfError',
  othersError: 'othersError',
  dAlpha: 'deltaAlpha',
};

export const charts = [
  {
    key: 'alpha',
    title: 'Attention (α)',
    help: 'How much attention each cue gets. In Mackintosh\'s model attention rises for the cue that best predicts the outcome and falls for the others. A cue with more attention learns faster.',
  },
];

export const stages = [
  {
    title: 'Each cue learns alone',
    options: { attention: false, directionRule: false },
    added: ['theta', 'error'],
    equation: 'update',
    text: 'Start with each cue learning from its own error, with fixed attention. Cues do not affect each other at all, so nothing like blocking can happen yet.',
  },
  {
    title: 'Attention follows the best predictor',
    options: { attention: true, directionRule: false },
    added: ['selfError', 'othersError', 'dAlpha'],
    equation: 'attention',
    text: 'Now attention to each cue changes after every trial: up if it predicted the outcome better than the other cues present, down if it predicted worse. Cues now affect each other, but only through attention. This is the full model, with the continuous form of the attention rule.',
  },
];

export const intro = `
<p>Mackintosh's model says that <strong>attention</strong> changes with experience. Learners pay more attention to cues that predict the outcome well and less to cues that do not, and a cue that gets more attention is learned about faster. Each cue learns from its own error, so cues compete only through attention.</p>
<p class="small muted">The 1975 paper says which way attention moves (its Equations 4 and 5), and adds that the change could be proportional to how much better or worse the cue predicts than the others. It gives no step size. This page uses that proportional rule, and offers the direction rules alone, with a fixed step, under Assumptions. The two differ on a tie: the direction rule lowers attention, the proportional rule leaves it alone. They make different predictions, which is part of what this page is for.</p>`;

// The idea in a picture, for the card at the top of the model page.
export const figure = {
  svg: `<svg viewBox="0 0 320 180" role="img" aria-label="Cues A and B each predict the outcome with their own strength and have their own attention α. A predicts better, so its attention bar is tall and rising; B's is short and falling.">
<defs><marker id="mk-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="f-head"/></marker></defs>
<circle cx="40" cy="50" r="17" class="f-node"/><text x="40" y="54" text-anchor="middle" font-weight="600">A</text>
<circle cx="40" cy="125" r="17" class="f-node"/><text x="40" y="129" text-anchor="middle" font-weight="600">B</text>
<rect x="72" y="26" width="14" height="48" rx="3" class="f-bar-mod"/>
<rect x="72" y="113" width="14" height="24" rx="3" class="f-bar-mod"/>
<text x="79" y="20" text-anchor="middle" class="f-sym f-mod">α<tspan font-size="9" dy="3">A</tspan></text>
<text x="79" y="150" text-anchor="middle" class="f-sym f-mod">α<tspan font-size="9" dy="3">B</tspan></text>
<path d="M92 50 L236 78" class="f-line" stroke-width="3" marker-end="url(#mk-head)"/>
<path d="M92 125 L236 96" class="f-line" stroke-dasharray="3 3" marker-end="url(#mk-head)"/>
<text x="150" y="52" class="f-sym f-comp">V<tspan font-size="9" dy="3">A</tspan></text>
<text x="150" y="126" class="f-sym f-comp">V<tspan font-size="9" dy="3">B</tspan></text>
<rect x="240" y="65" width="66" height="44" rx="8" class="f-box"/>
<text x="273" y="83" text-anchor="middle" class="f-sym f-exp">λ</text>
<text x="273" y="100" text-anchor="middle" class="f-small">outcome</text>
<text x="164" y="30" text-anchor="middle" class="f-small">A predicts best: α rises ↑</text>
<text x="164" y="152" text-anchor="middle" class="f-small">B predicts worse: α falls ↓</text>
<text x="160" y="172" text-anchor="middle" class="f-small">each cue learns from its own error, λ − V</text>
</svg>`,
  caption: 'Each cue has its own attention, α. After a trial, attention rises for the cue that predicted the outcome best and falls for the others. A cue learns from its own error, so a well-attended cue learns fast.',
};
