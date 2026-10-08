// Equation spec for Pearce's configural model (1987). See js/models/pearce.js.
//
// The equations are about the configuration on the trial, the cues present
// with the context, not about one cue (cueless). Configuration i in the
// similarity and sum equations is the one that lends this configuration the
// most; the configurations view lists every one.

import { fmt } from '../../js/core/format.js';
import { esc } from '../../js/ui/equation.js';

export const cueless = true;
export const cuelessNote = 'Numbers are for the configuration on this trial: the cues present, with the context. Configuration i is the one lending it the most strength.';
export const beforeTraining = 'Before training no configuration has been met, so every strength is 0.';

const label = (key) => (key.length > 1 ? key : key) || 'nothing';

export const symbols = {
  E: {
    primer: 'configurations',
    render: { base: 'E', sub: 'k' },
    role: 'computed',
    name: 'own excitation',
    meaning: () => 'The excitatory strength this configuration (k, the cues on this trial with the context) has learned for itself, before this trial. It only ever grows.',
    where: 'Configurations view: the E column. Table: E after.',
    value: (r) => r.Ebefore,
  },
  I: {
    primer: 'configurations',
    render: { base: 'I', sub: 'k' },
    role: 'computed',
    name: 'own inhibition',
    meaning: () => 'The inhibitory strength this configuration has learned for itself, before this trial. It grows when less happens than the configuration predicted.',
    where: 'Configurations view: the I column. Table: I after.',
    value: (r) => r.Ibefore,
  },
  Ei: {
    primer: 'configurations',
    render: { base: 'E', sub: 'i' },
    role: 'computed',
    name: 'excitation of configuration i',
    meaning: () => 'The excitatory strength another configuration, i, has learned for itself. It lends this one a share of it.',
    where: 'Configurations view: the E column of the row for i.',
    value: (r) => r.top?.E,
  },
  Ii: {
    primer: 'configurations',
    render: { base: 'I', sub: 'i' },
    role: 'computed',
    name: 'inhibition of configuration i',
    meaning: () => 'The inhibitory strength another configuration, i, has learned for itself. Inhibition generalises just as excitation does.',
    where: 'Configurations view: the I column of the row for i.',
    value: (r) => r.top?.I,
  },
  S: {
    primer: 'configurations',
    render: { base: 'S', sub: 'ik' },
    role: 'computed',
    name: 'similarity',
    meaning: () => 'How similar configuration i is to this one, from 0 to 1: the share of i taken up by what the two have in common, times the share of this one taken up by it. Nothing in common gives 0; the same configuration gives 1.',
    where: 'Configurations view: the S column.',
    value: (r) => r.top?.S,
  },
  Pcom: {
    primer: 'configurations',
    render: { base: 'P', sub: 'common' },
    role: 'computed',
    name: 'intensity in common',
    meaning: () => 'The intensities of the stimuli that configuration i and this one share, added up.',
    where: 'Configurations view.',
    value: (r) => r.top?.Pcommon,
  },
  Pi: {
    primer: 'configurations',
    render: { base: 'P', sub: 'i' },
    role: 'computed',
    name: 'intensity of configuration i',
    meaning: () => 'The intensities of every stimulus in configuration i, added up: how much of the buffer it fills.',
    where: 'Configurations view.',
    value: (r) => r.top?.Ptotal,
  },
  Pk: {
    primer: 'configurations',
    render: { base: 'P', sub: 'k' },
    role: 'computed',
    name: 'intensity of this configuration',
    meaning: () => 'The intensities of every stimulus on this trial, with the context, added up.',
    where: 'Configurations view.',
    value: (r) => r.Ptotal,
  },
  P: {
    primer: 'configurations',
    render: { base: 'P', sub: 'cue' },
    role: 'modeller',
    name: 'intensity',
    meaning: (c) => `How intense ${c} is: how much of the buffer it takes up. Only the ratios between intensities matter.`,
    where: 'Slider: intensity.',
    value: (r, c) => r.P?.[c],
    exact: true,
  },
  e: {
    primer: 'configurations',
    render: { base: 'e', sub: 'k' },
    role: 'computed',
    name: 'generalised excitation',
    meaning: () => 'The excitation lent to this configuration by every other, each weighted by its similarity. A cue tested alone after compound training has little of its own and lives on this.',
    where: 'Configurations view: the e column, added up.',
    value: (r) => r.e,
  },
  i: {
    primer: 'configurations',
    render: { base: 'i', sub: 'k' },
    role: 'computed',
    name: 'generalised inhibition',
    meaning: () => 'The inhibition lent to this configuration by every other, each weighted by its similarity.',
    where: 'Configurations view: the i column, added up.',
    value: (r) => r.i,
  },
  V: {
    primer: 'names',
    render: { base: 'V', sub: 'k' },
    role: 'computed',
    name: 'net strength',
    meaning: () => 'What this configuration predicts, before this trial: its own and borrowed excitation minus its own and borrowed inhibition. This is what the animal does. The chart shows V for each single cue.',
    where: 'Prediction chart: V for each cue. Table: V.',
    value: (r) => r.V,
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
  beta: {
    primer: 'greek',
    render: { base: 'β' },
    role: 'modeller',
    name: 'learning rate',
    meaning: () => 'How much of the discrepancy is learned on one trial. β is "beta". Pearce used 0.25.',
    where: 'Slider: learning rate.',
    value: (r) => r.beta,
    exact: true,
  },
  delta: {
    primer: 'error',
    render: { base: 'Δ' },
    role: 'computed',
    name: 'discrepancy',
    meaning: () => 'The learning rate times what happened minus what this configuration predicted. Positive when more happened than predicted, negative when less.',
    where: 'Table: the Δ column.',
    value: (r) => r.delta,
  },
  dE: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'E', sub: 'k' },
    role: 'computed',
    name: 'change in excitation',
    meaning: () => 'How much excitation this configuration gains on this trial: the discrepancy when it is positive, otherwise nothing.',
    where: 'Table: the ΔE column.',
    value: (r) => r.deltaE,
  },
  dI: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'I', sub: 'k' },
    role: 'computed',
    name: 'change in inhibition',
    meaning: () => 'How much inhibition this configuration gains on this trial: the size of the discrepancy when it is negative, otherwise nothing.',
    where: 'Table: the ΔI column.',
    value: (r) => r.deltaI,
  },
};

export const roles = {
  experimenter: { label: 'Set by the experimenter', short: 'experimenter' },
  modeller: { label: 'Set by the modeller', short: 'parameter' },
  computed: { label: 'Computed by the model', short: 'computed' },
};

const S_ = (sym) => ({ sym });
const zero = { op: 'const', value: 0 };
const hasOthers = (r) => Boolean(r.top);

export function equations(opts) {
  const eqs = [];
  if (opts.generalisation) {
    eqs.push({
      id: 'similarity',
      when: hasOthers,
      title: 'How similar is configuration i to this one?',
      lhs: S_('S'),
      rel: '=',
      rhs: {
        op: 'mul',
        args: [
          { op: 'paren', arg: { op: 'frac', num: S_('Pcom'), den: S_('Pi') } },
          { op: 'paren', arg: { op: 'frac', num: S_('Pcom'), den: S_('Pk') } },
        ],
      },
      words:
        '{S|The similarity of configuration i to this one} is {Pcom|the intensity of what they share} as a share of {Pi|all of i}, times the same intensity as a share of {Pk|all of this configuration}. Two patterns that share everything score 1; patterns with nothing in common score 0.',
    });
    eqs.push({
      id: 'genE',
      when: hasOthers,
      title: 'Borrow excitation from similar configurations',
      lhs: S_('e'),
      rel: '=',
      rhs: { op: 'sumOver', index: 'i', of: 'e', arg: { op: 'mul', args: [S_('S'), S_('Ei')] } },
      words: '{e|The excitation this configuration borrows} is every other configuration\'s {Ei|own excitation}, weighted by {S|how similar it is}, added up.',
    });
    if (opts.inhibition) {
      eqs.push({
        id: 'genI',
        when: hasOthers,
        title: 'Borrow inhibition the same way',
        lhs: S_('i'),
        rel: '=',
        rhs: { op: 'sumOver', index: 'i', of: 'i', arg: { op: 'mul', args: [S_('S'), S_('Ii')] } },
        words: '{i|The inhibition this configuration borrows} is every other configuration\'s {Ii|own inhibition}, weighted by {S|how similar it is}, added up.',
      });
    }
  }
  const netArgs = [S_('E')];
  if (opts.generalisation) netArgs.push(S_('e'));
  let netRhs = netArgs.length > 1 ? { op: 'add', args: netArgs } : S_('E');
  if (opts.inhibition) {
    const minus = opts.generalisation ? { op: 'add', args: [S_('I'), S_('i')] } : S_('I');
    netRhs = { op: 'sub', args: [netRhs, opts.generalisation ? { op: 'paren', arg: minus } : minus] };
  }
  eqs.push({
    id: 'net',
    title: 'Net strength of this configuration',
    lhs: S_('V'),
    rel: '=',
    rhs: netRhs,
    words: opts.inhibition
      ? `{V|What this configuration predicts} is {E|its own excitation}${opts.generalisation ? ' plus {e|what it borrows}' : ''}, minus {I|its own inhibition}${opts.generalisation ? ' and {i|the inhibition it borrows}' : ''}.`
      : `{V|What this configuration predicts} is {E|its own excitation}${opts.generalisation ? ' plus {e|what it borrows}' : ''}.`,
  });
  eqs.push({
    id: 'delta',
    title: 'The discrepancy',
    lhs: S_('delta'),
    rel: '=',
    rhs: { op: 'mul', args: [S_('beta'), { op: 'paren', arg: { op: 'sub', args: [S_('lambda'), S_('V')] } }] },
    words: '{delta|The discrepancy} is {beta|the learning rate} times {lambda|what happened} minus {V|what this configuration predicted}.',
  });
  if (opts.inhibition) {
    eqs.push({
      id: 'excite',
      title: 'More than predicted: excitation grows',
      lhs: S_('dE'),
      rel: '=',
      rhs: {
        op: 'cases',
        cases: [
          { when: (r) => r.delta >= 0, cond: 'if Δ ≥ 0', rhs: S_('delta') },
          { cond: 'otherwise', rhs: zero },
        ],
      },
      words: '{dE|Excitation grows} by {delta|the discrepancy} when the outcome was bigger than predicted. Nothing is ever taken away from E.',
    });
    eqs.push({
      id: 'inhibit',
      title: 'Less than predicted: inhibition grows',
      lhs: S_('dI'),
      rel: '=',
      rhs: {
        op: 'cases',
        cases: [
          { when: (r) => r.delta < 0, cond: 'if Δ < 0', rhs: { op: 'neg', arg: S_('delta') } },
          { cond: 'otherwise', rhs: zero },
        ],
      },
      words: '{dI|Inhibition grows} by the size of {delta|the discrepancy} when less happened than predicted. Extinction is new learning, not forgetting.',
    });
  } else {
    eqs.push({
      id: 'excite',
      title: 'Change the excitation',
      lhs: S_('dE'),
      rel: '=',
      rhs: S_('delta'),
      words: '{dE|Excitation changes} by {delta|the discrepancy}, up or down. In this version nothing is learned about the absence of the outcome; excitation is simply weakened, as in Rescorla-Wagner.',
    });
  }
  eqs.push({
    id: 'apply',
    title: 'Update this configuration',
    lhs: S_('E'),
    rel: '←',
    rhs: { op: 'add', args: [S_('E'), S_('dE')] },
    words: 'After the trial, {E|the configuration\'s excitation} becomes its old value plus {dE|the change}.',
  });
  if (opts.inhibition) {
    eqs.push({
      id: 'applyI',
      title: 'Update its inhibition',
      lhs: S_('I'),
      rel: '←',
      rhs: { op: 'add', args: [S_('I'), S_('dI')] },
      words: 'And {I|its inhibition} becomes its old value plus {dI|the change}.',
    });
  }
  return eqs;
}

export function arithmetic(opts) {
  return {
    line: null,
    lead: (r) => {
      const k = label(r.key);
      const seen = r.isNew ? 'a new configuration' : 'a configuration met before';
      const borrow = r.top && opts.generalisation ? ` The configuration lending it the most is ${label(r.top.key)}, with similarity ${fmt(r.top.S)}: it lends ${fmt(r.top.e)} of excitation${opts.inhibition ? ` and ${fmt(r.top.i)} of inhibition` : ''}.` : '';
      return `This trial's configuration is ${k}, ${seen}. On its own it has E = ${fmt(r.Ebefore)}${opts.inhibition ? ` and I = ${fmt(r.Ibefore)}` : ''}.${borrow} Altogether it predicts V = ${fmt(r.V)}.`;
    },
    chains: [],
    states: [{ sym: 'E', after: (r) => r.Eafter }, ...(opts.inhibition ? [{ sym: 'I', after: (r) => r.Iafter }] : [])],
    verdict: (r) => {
      if (Math.abs(r.delta) < 0.0005) return `What happened matched what ${label(r.key)} predicted, so nothing changes.`;
      if (r.delta > 0) return `More happened than ${label(r.key)} predicted, so its excitation grows by ${fmt(r.deltaE)}.`;
      return opts.inhibition ? `Less happened than ${label(r.key)} predicted, so its inhibition grows by ${fmt(r.deltaI)}. Its excitation is untouched.` : `Less happened than ${label(r.key)} predicted, so its excitation falls by ${fmt(-r.deltaE)}.`;
    },
  };
}

export function tableColumns(opts, cues) {
  const cols = [
    { sym: 'V', value: (r) => r.V, head: 'V (this configuration)' },
    { sym: 'delta', value: (r) => r.delta },
    { sym: 'E', value: (r) => r.Eafter, suffix: ' after' },
  ];
  if (opts.inhibition) cols.push({ sym: 'I', value: (r) => r.Iafter, suffix: ' after' });
  for (const c of cues) cols.push({ sym: 'V', cue: c, value: (r) => r.Vcues?.[c], suffix: ' after' });
  return cols;
}

export function absentNote(cue, rec) {
  return `${cue} is not on this trial, so no configuration containing ${cue} learns. What generalises to ${cue} can still change: configuration ${label(rec.key)} shares ${rec.stimuli.length > 1 ? 'the context' : 'nothing'} with it.`;
}

export const codeNames = {
  lambda: 'lambda',
  beta: 'beta',
  e: 'e',
  i: 'i',
  V: 'V',
  delta: 'delta',
  dE: 'deltaE',
  dI: 'deltaI',
  E: 'cfg.E',
  I: 'cfg.I',
};

export const charts = [
  {
    key: 'own',
    title: 'What each cue learned for itself (E − I)',
    help: 'For each single cue, the strength its own configuration (the cue with the context) has learned, without anything borrowed. A cue trained only in a compound has none: everything on the prediction chart for it is borrowed from the compound.',
  },
];

// The configurations the model has met, with their strengths and their
// similarity to the selected trial's configuration.
export const panel = {
  title: 'Configurations',
  help: 'Every pattern of cues the model has met so far, with what it has learned for itself (E and I) and how similar it is to the configuration on the selected trial (S). The strength of each is lent to the current one in proportion to S.',
  render(rec) {
    if (!rec) return '<p class="small muted">Before training nothing has been met yet.</p>';
    const rows = rec.configs
      .slice()
      .sort((a, b) => b.S - a.S)
      .map(
        (c) =>
          `<tr${c.current ? ' class="current"' : ''}><td class="left">${esc(label(c.key))}${c.current ? ' <span class="muted small">(this trial)</span>' : ''}</td>` +
          `<td class="num">${fmt(c.E)}</td><td class="num">${fmt(c.I)}</td><td class="num">${c.current ? '–' : fmt(c.S)}</td>` +
          `<td class="num">${c.current ? '–' : fmt(c.S * c.E)}</td><td class="num">${c.current ? '–' : fmt(c.S * c.I)}</td></tr>`,
      )
      .join('');
    return (
      `<div class="table-scroll"><table class="symbol-guide small config-table"><thead><tr><th class="left">Configuration</th><th>E</th><th>I</th><th>S to ${esc(label(rec.key))}</th><th>lends e</th><th>lends i</th></tr></thead><tbody>${rows}</tbody></table></div>` +
      `<p class="small muted">Borrowed in all: e = ${fmt(rec.e)}, i = ${fmt(rec.i)}. Net strength of ${esc(label(rec.key))}: V = ${fmt(rec.V)}.</p>`
    );
  },
};

export const stages = [
  {
    title: 'Each pattern learns as one',
    options: { generalisation: false, inhibition: false },
    added: ['E', 'lambda', 'beta', 'delta'],
    equation: 'excite',
    text: 'Start with the configural idea alone: the whole pattern of cues on a trial is the thing that learns, and every pattern is a stranger to every other. A tone learns, a light learns, and tone-plus-light learns, each on its own. Negative patterning is easy now, because the compound is its own unit. But a cue trained only in a compound knows nothing when tested alone, and nothing learned about one pattern reaches another.',
  },
  {
    title: 'Lend strength by similarity',
    options: { generalisation: true, inhibition: false },
    added: ['S', 'Pcom', 'Pi', 'Pk', 'e', 'Ei'],
    equation: 'genE',
    text: 'Now each pattern borrows from every other in proportion to how similar they are. A cue tested alone borrows from the compound it was trained in, so overshadowing appears, on the very first trial. A pretrained cue lends its strength to the compound it joins, so there is less left to learn and the added cue is blocked. Adding a new cue to a trained one dilutes what the pattern borrows: external inhibition.',
  },
  {
    title: 'Learn about absence',
    options: { generalisation: true, inhibition: true },
    added: ['I', 'i', 'Ii', 'dI'],
    equation: 'inhibit',
    text: 'Finally, when less happens than a pattern predicted, it gains inhibition rather than losing excitation. Extinction leaves the old learning in place and lays new learning over it. A compound that is not reinforced beside a reinforced element becomes an inhibitor, and lends that inhibition to patterns like it. This is the full model.',
  },
];

export const intro = `
<p>Pearce's model asks what the learner actually meets on a trial: not a tone and a light, but <strong>a tone and a light together, in this box</strong>. That whole pattern, the <strong>configuration</strong>, is the unit that learns. A configuration lends its strength to others in proportion to how <strong>similar</strong> they are, so a tone tested alone borrows from the tone-and-light pattern it was trained in, and a pattern never trained can still predict the outcome.</p>
<p class="small muted">Each configuration has an excitatory strength E and an inhibitory strength I of its own, and a net strength V that adds what it borrows. The chart shows V for each single cue, which is mostly borrowed. Open <em>Configurations</em> to see every pattern the model has met.</p>
<details class="howto advanced"><summary>Choices made on this page</summary>
<p class="small">Pearce (1987) leaves some details open. This page makes these choices:</p>
<ul class="small">
<li>A configuration is the set of cues on the trial together with the context, when the design names one. Without a context, two configurations with no cue in common have similarity 0, as in the paper's own simulations.</li>
<li>Intensity P is a parameter per cue; only the ratios matter. Equal intensities and no context give S = 0.5 between a compound and either of its elements, the value the paper's simulations use.</li>
<li>On a reinforced trial that is over-predicted, the discrepancy is negative and goes to inhibition, as on a nonreinforced trial.</li>
<li>A configuration comes into being the first time it is presented. A probe never trained has E = I = 0, so its V is what generalises to it.</li>
<li>The default learning rate, 0.25, is the paper's.</li>
</ul></details>`;

// The idea in a picture, for the card at the top of the model page.
export const figure = {
  svg: `<svg viewBox="0 0 320 180" role="img" aria-label="Three configuration units, A, B, and AB, each with its own strength. The compound AB predicts the outcome, and lends half of what it learned to A and half to B, because each shares half its elements with AB.">
<defs><marker id="pc-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="f-head"/></marker>
<marker id="pc-head-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="f-head-comp"/></marker></defs>
<circle cx="60" cy="50" r="20" class="f-node"/><text x="60" y="54" text-anchor="middle" font-weight="600">A</text>
<circle cx="60" cy="130" r="20" class="f-node"/><text x="60" y="134" text-anchor="middle" font-weight="600">B</text>
<circle cx="170" cy="90" r="24" class="f-node"/><text x="170" y="94" text-anchor="middle" font-weight="600">AB</text>
<text x="170" y="40" text-anchor="middle" class="f-small">this trial's pattern</text>
<text x="170" y="52" text-anchor="middle" class="f-small">is one unit</text>
<path d="M196 86 L236 86" class="f-line" marker-end="url(#pc-head)"/>
<text x="216" y="78" text-anchor="middle" class="f-sym f-comp">E<tspan font-size="9" dy="3">AB</tspan></text>
<rect x="240" y="64" width="66" height="44" rx="8" class="f-box"/>
<text x="273" y="82" text-anchor="middle" class="f-sym f-exp">λ</text>
<text x="273" y="99" text-anchor="middle" class="f-small">outcome</text>
<path d="M150 74 L82 56" class="f-dash" marker-end="url(#pc-head-c)"/>
<path d="M150 106 L82 124" class="f-dash" marker-end="url(#pc-head-c)"/>
<text x="118" y="84" text-anchor="middle" class="f-sym f-comp">S = ½</text>
<text x="118" y="104" text-anchor="middle" class="f-sym f-comp">S = ½</text>
<text x="60" y="20" text-anchor="middle" class="f-small">shares half its cues</text>
<text x="60" y="166" text-anchor="middle" class="f-small">gets half the strength</text>
</svg>`,
  caption: 'The whole pattern of cues on a trial learns as one unit, with its own strength. It lends strength to other patterns in proportion to their similarity: A shares half its elements with AB, so A gets half of what AB learned.',
};
