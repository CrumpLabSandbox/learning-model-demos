// Equation spec for Delamater's network (2012). See js/models/delamater.js.
//
// The network has no strength per cue, so its equations are not about one
// cue (cueless). The numbers follow network 1 on the selected trial: its
// most active hidden unit (k) and the trial's outcome unit (j). The hidden
// layer view shows every unit.

import { fmt } from '../../js/core/format.js';
import { esc } from '../../js/ui/equation.js';

export const cueless = true;
export const cuelessNote = 'Numbers are for network 1 on this trial: its most active hidden unit (k) and the outcome unit for this trial\'s outcome (j).';
export const beforeTraining = 'Before training the weights are random and small, so every unit rests near 0.1.';

const L1 = (r) => r.learner;

export const symbols = {
  a: {
    primer: 'network',
    render: { base: 'a', sub: 'cue' },
    role: 'modeller',
    name: 'input activation',
    meaning: (c) => `How strongly ${c}'s feature is switched on when ${c} is present: 1 by default, lower for a fainter cue. Cues of one modality also switch on a shared feature.`,
    where: 'Slider: salience. Hidden layer view: the input row.',
    value: (r, c) => (r.learner ? r.learner.x[r.features.indexOf(c)] : undefined),
    exact: true,
  },
  net: {
    primer: 'network',
    render: { base: 'net', sub: 'k' },
    role: 'computed',
    name: 'net input to hidden unit k',
    meaning: () => 'Each input feature\'s activation times its weight to hidden unit k, added up (Eq. 1).',
    where: 'Hidden layer view: the hidden row.',
    value: (r) => L1(r)?.netTop,
  },
  w: {
    primer: 'network',
    render: { base: 'w', sub: 'ik' },
    role: 'computed',
    name: 'weight from feature i to hidden unit k',
    meaning: () => 'The strength of the connection from an input feature to a hidden unit. It starts random and is changed by learning.',
    where: 'Hidden layer view: the weights.',
    value: () => undefined,
  },
  ah: {
    primer: 'network',
    render: { base: 'a', sub: 'k' },
    role: 'computed',
    name: 'activation of hidden unit k',
    meaning: () => 'The hidden unit\'s net input passed through the shifted logistic (Eq. 2): between 0 and 1, about 0.1 with no input.',
    where: 'Hidden layer view: the hidden row.',
    value: (r) => L1(r)?.hTop,
  },
  shift: {
    primer: 'network',
    render: { base: '2.2' },
    role: 'modeller',
    name: 'resting shift',
    meaning: () => 'Subtracted from the net input before the logistic, so that a unit with no input rests near 0.1 rather than 0.5, as neurons have a low resting rate.',
    where: 'Slider (Everything view).',
    value: (r) => r.shift,
    exact: true,
  },
  e: {
    primer: 'network',
    render: { base: 'e' },
    role: 'computed',
    name: 'Euler\'s number',
    meaning: () => 'The base of the natural exponential, about 2.718. The logistic function is built from it.',
    where: 'The activation equations.',
    value: () => Math.E,
    exact: true,
  },
  wo: {
    primer: 'network',
    render: { base: 'w', sub: 'kj' },
    role: 'computed',
    name: 'weight from hidden unit k to outcome unit j',
    meaning: () => 'The strength of the connection from the hidden unit to the outcome unit, before this trial\'s change.',
    where: 'Hidden layer view: the weights.',
    value: (r) => L1(r)?.wTop,
  },
  ao: {
    primer: 'network',
    render: { base: 'a', sub: 'j' },
    role: 'computed',
    name: 'activation of outcome unit j',
    meaning: () => 'How strongly the network expects this trial\'s outcome: the hidden units\' activations times their weights to the outcome unit, added up and passed through the shifted logistic. The chart plots this for each probe.',
    where: 'Prediction chart. Hidden layer view: the outcome row.',
    value: (r) => L1(r)?.outJ,
  },
  lambda: {
    primer: 'greek',
    render: { base: 'λ', sub: 'j' },
    role: 'experimenter',
    name: 'target',
    meaning: () => 'What the outcome unit should have said: the outcome\'s magnitude when that outcome happened (1 by default), 0 otherwise. Each outcome unit has its own target.',
    where: 'Table: the λ column.',
    value: (r) => L1(r)?.targetJ,
    exact: true,
  },
  dOut: {
    primer: 'error',
    render: { base: 'δ', sub: 'j' },
    role: 'computed',
    name: 'error at outcome unit j',
    meaning: () => 'What happened minus what was predicted, times the slope of the activation function there (Appendix Eq. 1). The slope is small when the unit is near 0 or 1, so learning is slowest at the extremes.',
    where: 'Table: the δ column.',
    value: (r) => L1(r)?.dOutJ,
  },
  backSum: {
    primer: 'error',
    render: null,
    display: () => 'Σ δ·w',
    role: 'computed',
    name: 'blame reaching hidden unit k',
    meaning: () => 'The outcome units\' errors, each weighted by the hidden unit\'s connection to it, added up: how much of the mistake came through this unit.',
    where: 'Equations: the error passed back.',
    value: (r) => (L1(r) && L1(r).kTop >= 0 ? L1(r).dTop / (L1(r).hTop * (1 - L1(r).hTop)) : undefined),
  },
  dHid: {
    primer: 'error',
    render: { base: 'δ', sub: 'k' },
    role: 'computed',
    name: 'error passed back to hidden unit k',
    meaning: () => 'The outcome units\' errors, each weighted by the hidden unit\'s connection to it, added up, times the hidden unit\'s own slope (Appendix Eq. 2). This is how a hidden unit learns which part of the mistake was its doing.',
    where: 'Hidden layer view.',
    value: (r) => L1(r)?.dTop,
  },
  rate: {
    primer: 'greek',
    render: { base: 'α' },
    role: 'modeller',
    name: 'learning rate',
    meaning: () => 'How much of the error becomes weight change on one trial. The paper used 0.1; this page uses 0.5 so that the network learns within the shared experiments.',
    where: 'Slider: learning rate.',
    value: (r) => r.rate,
    exact: true,
  },
  beta: {
    primer: 'greek',
    render: { base: 'β' },
    role: 'modeller',
    name: 'momentum',
    meaning: () => 'How much of the last trial\'s weight change is carried into this one (0.9 in the paper), so learning runs smoothly and fast.',
    where: 'Slider: momentum (Everything view).',
    value: (r) => r.beta,
    exact: true,
  },
  dw: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'w', sub: 'kj' },
    role: 'computed',
    name: 'change in the weight from k to j',
    meaning: () => 'How much the connection from the hidden unit to the outcome unit changes on this trial (Appendix Eq. 3).',
    where: 'Table: the Δw column.',
    value: (r) => L1(r)?.dwTop,
  },
  nH: {
    primer: 'network',
    render: { base: 'n', sub: 'mod' },
    role: 'modeller',
    name: 'hidden units per modality pathway',
    meaning: () => 'How many hidden units each modality\'s own pathway has; the paper\'s Figure 4 draws two.',
    where: 'Slider (Everything view).',
    value: () => undefined,
    exact: true,
  },
  nM: {
    primer: 'network',
    render: { base: 'n', sub: 'multi' },
    role: 'modeller',
    name: 'multimodal hidden units',
    meaning: () => 'How many hidden units every input feature can reach; the paper\'s Figure 4 draws four.',
    where: 'Slider (Everything view).',
    value: () => undefined,
    exact: true,
  },
  w0: {
    primer: 'network',
    render: { base: 'w', sub: '0' },
    role: 'modeller',
    name: 'range of the starting weights',
    meaning: () => 'Every weight starts at a random value between −w₀ and w₀. The paper says only that the starting weights are random.',
    where: 'Slider (Everything view).',
    value: () => undefined,
    exact: true,
  },
  N: {
    primer: 'network',
    render: { base: 'N' },
    role: 'experimenter',
    name: 'simulated networks',
    meaning: () => 'How many networks, each with its own random starting weights, are run and averaged. The paper ran eight.',
    where: 'Slider: simulated networks.',
    value: (r) => r.N,
    exact: true,
  },
  dwPrev: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'w', sub: 'kj', sup: 'last' },
    role: 'computed',
    name: 'last trial\'s change',
    meaning: () => 'The change the same weight made on the previous trial, carried forward by the momentum.',
    where: 'Table.',
    value: (r) => (L1(r) ? (L1(r).dwTop - r.rate * L1(r).dOutJ * L1(r).hTop) / (r.beta || 1) : undefined),
  },
};

export const roles = {
  experimenter: { label: 'Set by the experimenter', short: 'experimenter' },
  modeller: { label: 'Set by the modeller', short: 'parameter' },
  computed: { label: 'Computed by the model', short: 'computed' },
};

const S_ = (sym) => ({ sym });
const hasHidden = (r) => Boolean(r.learner && r.learner.kTop >= 0);

export function equations(opts) {
  const eqs = [];
  if (opts.hidden) {
    eqs.push({
      id: 'netIn',
      when: hasHidden,
      title: 'Net input to a hidden unit',
      lhs: S_('net'),
      rel: '=',
      rhs: { op: 'sumOver', index: 'i', of: 'net', arg: { op: 'mul', args: [{ sym: 'a', cue: '$' }, S_('w')] } },
      words: '{net|The net input to hidden unit k} is every input feature\'s {a|activation} times {w|its weight to k}, added up (Eq. 1).',
    });
    eqs.push({
      id: 'hidden',
      when: hasHidden,
      title: 'Activation of the hidden unit',
      lhs: S_('ah'),
      rel: '=',
      rhs: { op: 'frac', num: { op: 'const', value: 1 }, den: { op: 'add', args: [{ op: 'const', value: 1 }, { op: 'pow', arg: S_('e'), exp: { op: 'neg', arg: { op: 'paren', arg: { op: 'sub', args: [S_('net'), S_('shift')] } } } }] } },
      words: '{ah|The hidden unit\'s activation} is the logistic of its {net|net input} minus {shift|the resting shift} (Eq. 2): a smooth step from 0 to 1 that sits near 0.1 with no input.',
    });
  }
  eqs.push({
    id: 'outErr',
    title: 'Error at the outcome unit',
    lhs: S_('dOut'),
    rel: '=',
    rhs: { op: 'mul', args: [{ op: 'paren', arg: { op: 'sub', args: [S_('lambda'), S_('ao')] } }, S_('ao'), { op: 'paren', arg: { op: 'sub', args: [{ op: 'const', value: 1 }, S_('ao')] } }] },
    words: '{dOut|The outcome unit\'s error} is {lambda|what should have happened} minus {ao|what it predicted}, times the slope of its activation function, {ao|a}(1 − {ao|a}) (Appendix Eq. 1).',
  });
  if (opts.hidden) {
    eqs.push({
      id: 'hidErr',
      when: hasHidden,
      title: 'Pass the error back to the hidden unit',
      lhs: S_('dHid'),
      rel: '=',
      rhs: { op: 'mul', args: [S_('ah'), { op: 'paren', arg: { op: 'sub', args: [{ op: 'const', value: 1 }, S_('ah')] } }, { op: 'sumOver', index: 'j', of: 'backSum', arg: { op: 'mul', args: [S_('dOut'), S_('wo')] } }] },
      words: '{dHid|The hidden unit\'s error} is its own slope times the outcome units\' {dOut|errors}, each weighted by {wo|its connection to them}, added up (Appendix Eq. 2). A hidden unit that fed a wrong answer gets most of the blame.',
    });
  }
  eqs.push({
    id: 'change',
    when: hasHidden,
    title: 'Change the weight',
    lhs: S_('dw'),
    rel: '=',
    rhs: opts.momentum
      ? { op: 'add', args: [{ op: 'mul', args: [S_('rate'), S_('dOut'), S_('ah')] }, { op: 'mul', args: [S_('beta'), S_('dwPrev')] }] }
      : { op: 'mul', args: [S_('rate'), S_('dOut'), S_('ah')] },
    words: opts.momentum
      ? '{dw|The weight from k to j changes} by {rate|the learning rate} times {dOut|the error at j} times {ah|the activation of k}, plus {beta|the momentum} times {dwPrev|last trial\'s change} (Appendix Eq. 3). Every weight in the network changes by the same rule.'
      : '{dw|The weight from k to j changes} by {rate|the learning rate} times {dOut|the error at j} times {ah|the activation of k}. Every weight in the network changes by the same rule.',
  });
  return eqs;
}

export function arithmetic(opts) {
  return {
    line: null,
    lead: (r) => {
      const l = r.learner;
      if (!l) return 'No trial selected.';
      const outcome = r.reinforced ? `outcome ${r.outcome}` : 'no outcome';
      const unit = l.kTop >= 0 ? ` Its most active hidden unit (${r.hiddenLabels[l.kTop]}) was at ${fmt(l.hTop)}.` : '';
      return `Network 1 saw ${r.featureCues.filter((c, i) => l.x[i] > 0).join(', ') || 'nothing'} and ${outcome}.${unit} Its unit for ${r.reinforced ? `outcome ${r.outcome}` : 'outcome 1'} said ${fmt(l.outJ)} against a target of ${l.targetJ}, an error of ${fmt(l.dOutJ)}. Over all ${r.N} networks the unit averaged ${fmt(r.outMeans[l.j])}.`;
    },
    chains: [],
    states: [],
    verdict: (r) => {
      const l = r.learner;
      if (!l) return '';
      if (Math.abs(l.dOutJ) < 0.002) return 'The outcome unit was about right, so the weights barely move.';
      return l.dOutJ > 0 ? `The outcome unit said too little, so the weights feeding it ${opts.hidden ? 'from the active hidden units ' : ''}grow.` : `The outcome unit said too much, so the weights feeding it ${opts.hidden ? 'from the active hidden units ' : ''}shrink.`;
    },
  };
}

export function tableColumns() {
  return [
    { sym: 'lambda', value: (r) => r.learner?.targetJ },
    { sym: 'ao', value: (r) => r.outMeans[r.learner?.j ?? 0], head: 'a (mean)' },
    { sym: 'dOut', value: (r) => r.learner?.dOutJ, suffix: ' network 1' },
    { sym: 'dw', value: (r) => r.learner?.dwTop, suffix: ' network 1' },
  ];
}

export function absentNote(cue) {
  return `${cue} is not on this trial, so its feature is off and sends nothing forward. Its weights still change if it shares a feature or a hidden unit with what is on.`;
}

export const codeNames = {
  rate: 'rate',
  beta: 'beta',
  dOut: 'dOut',
  dHid: 'dHid',
  ah: 'h',
  ao: 'out',
  lambda: 'target',
};

export const charts = [
  {
    key: 'out2',
    title: 'Outcome 2 unit',
    help: 'The activation of the second outcome unit for each probe, for designs that use two outcomes (A+1, B+2). Compare it with the prediction chart, which plots the first outcome unit: a cue trained with outcome 2 should switch on this unit and not that one.',
    when: (run) => run.outcomes.includes(2),
  },
];

// The hidden layer view: network 1's input features, hidden units (by
// pathway), and outcome units on the selected trial, as cells.
export const panel = {
  title: 'Inside network 1',
  help: 'What network 1 did on the selected trial: the input features that were on, how active each hidden unit was (grouped by pathway), and what each outcome unit said against its target. Darker is more active. The hidden pattern is the network\'s own representation of the cues on this trial; compare it across trial types.',
  render(rec) {
    if (!rec?.learner) return '<p class="small muted">Pick a trial to see the network.</p>';
    const l = rec.learner;
    const cell = (v, label, title, extra = '') =>
      `<span class="net-cell${extra}" style="--v:${Math.max(0, Math.min(1, v)).toFixed(3)}" title="${esc(title)}"><span class="net-val">${fmt(v)}</span><span class="net-lab">${esc(label)}</span></span>`;
    const inputs = rec.features.map((f, i) => cell(l.x[i], rec.featureCues[i] || f, `${rec.featureCues[i] || f}: input ${fmt(l.x[i])}`)).join('');
    const groups = [...new Set(rec.pathways)];
    const hidden = groups
      .map((g) => {
        const cells = rec.hiddenLabels.map((lab, k) => (rec.pathways[k] === g ? cell(l.h[k], String(k + 1), `${lab}: activation ${fmt(l.h[k])}, error ${fmt(l.dHid[k])}`, k === l.kTop ? ' top' : '') : '')).join('');
        return `<div class="net-group"><span class="small muted">${esc(rec.hiddenLabels.find((x, k) => rec.pathways[k] === g).replace(/ \d+$/, ''))}</span><div class="net-row">${cells}</div></div>`;
      })
      .join('');
    const outs = l.out.map((v, j) => cell(v, `US${j + 1}`, `outcome ${j + 1}: ${fmt(v)}, target ${rec.target[j]}`, j === l.j ? ' top' : '')).join('');
    return (
      `<div class="net-view">` +
      `<div class="net-layer"><span class="small muted">Outcome units (target ${rec.target.map((t, j) => `US${j + 1} = ${t}`).join(', ')})</span><div class="net-row">${outs}</div></div>` +
      (l.h.length ? `<div class="net-layer"><span class="small muted">Hidden units</span>${hidden}</div>` : '') +
      `<div class="net-layer"><span class="small muted">Input features</span><div class="net-row">${inputs}</div></div>` +
      `</div>`
    );
  },
};

export const stages = [
  {
    title: 'One layer, like Rescorla-Wagner',
    options: { hidden: false, momentum: false },
    added: ['a', 'ao', 'lambda', 'dOut', 'rate'],
    equation: 'outErr',
    text: 'Start without a hidden layer: each input feature connects straight to the outcome units, and each weight changes by the error at the outcome times the input. This is the Rescorla-Wagner rule through a logistic squash. It adds up, so it blocks and overshadows, and no single network can solve negative patterning: to keep the compound low it gives up on one element. Which element depends on the starting weights, so the average over sixteen networks can look like a solution when none of them has one. Set the number of networks to 1 to see it.',
  },
  {
    title: 'Add a hidden layer',
    options: { hidden: true, momentum: false },
    added: ['net', 'w', 'ah', 'shift', 'e', 'dHid', 'wo', 'dw'],
    equation: 'hidErr',
    text: 'Now the inputs reach the outcomes through hidden units, and the error is passed back to them so they can learn too. The hidden units are free to represent a compound differently from its elements, so negative patterning and biconditional discriminations become solvable. Cues reinforced with the same outcome come to share hidden units; cues reinforced with different outcomes come to use different ones.',
  },
  {
    title: 'Add momentum',
    options: { hidden: true, momentum: true },
    added: ['beta', 'dwPrev'],
    equation: 'change',
    text: 'Finally, each weight change carries most of the last one. Learning that would creep now runs: once the weights start moving in a direction they keep going, which is how the paper\'s networks solve their tasks in a few hundred trials. This is the full model.',
  },
];

export const intro = `
<p>Delamater's model is a small <strong>neural network</strong>. Each cue switches on an input feature; the features reach the <strong>outcome units</strong>, one per US, through a <strong>hidden layer</strong> whose units start out meaning nothing. Learning works backwards from the mistake at the outcome: every connection is nudged in the direction that would have made the mistake smaller, hidden connections included. Over trials the hidden layer finds its own way of representing the cues, so that cues followed by the same outcome come to look alike inside the network and cues followed by different outcomes come to look different.</p>
<p class="small muted">The chart plots the activation of the outcome-1 unit for each probe, averaged over sixteen networks with different random starting weights, with the spread. A design can name a second outcome (<code>B+2</code>) and cues of a kind (<code>Modalities: AB, CD</code>). Open <em>Inside network 1</em> to see the hidden pattern on the selected trial.</p>
<details class="howto advanced"><summary>Choices made on this page</summary>
<p class="small">Delamater (2012) leaves some details open. This page makes these choices:</p>
<ul class="small">
<li>Hidden units per pathway: 2 for each modality and 4 multimodal, as drawn in the paper's Figure 4. Without a Modalities line there is one pathway of 4 units that every feature reaches.</li>
<li>Starting weights are drawn uniformly within a range set by a slider; the paper says only that they are random.</li>
<li>The page's learning rate (0.5) and weight range (±1) are faster than the paper's (0.1, over 8 networks), so that the network learns within the trial counts of the shared experiments; with the paper's values it takes about a thousand trials. The tests reproduce the paper's figures with the paper's values.</li>
<li>Outcome units use the same shifted logistic as hidden units.</li>
<li>A cue's salience is its input activation when present (1 by default); a modality's shared feature takes the highest salience of its present cues. A bigger outcome, A+(2), raises that outcome's target.</li>
<li>Momentum carries over from one trial to the next whatever the trial type.</li>
</ul></details>`;
