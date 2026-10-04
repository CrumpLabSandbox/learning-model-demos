// Equation spec for MINERVA-AL (Jamieson, Crump, & Hannah, 2012). See
// js/models/minerva-al.js.
//
// MINERVA-AL has no strength per cue, so its equations are not about one
// cue (cueless). The numbers follow learner 1 on the selected trial: the
// trace that answered most strongly (trace i), and the first feature of the
// outcome (feature j). The memory view shows every trace and feature.

import { fmt } from '../../js/core/format.js';

const L1 = (r) => r.learner;

export const cueless = true;
export const cuelessNote = 'Numbers are for learner 1 on this trial: the memory trace that added the most to the echo (trace i) and the first feature of the outcome (feature j).';
export const beforeTraining = 'Before training, memory is empty: no traces at all.';

export const symbols = {
  P: {
    primer: 'vectors',
    render: { base: 'P', sub: 'j' },
    role: 'experimenter',
    name: 'probe',
    meaning: () => 'Feature j of the probe: what is presented before the outcome (the cues and the context). Each stimulus fills its own 20 features with 1s.',
    where: 'Memory view: the probe row.',
    value: () => undefined,
  },
  M: {
    primer: 'vectors',
    render: { base: 'M', sub: 'ij' },
    role: 'computed',
    name: 'memory trace',
    meaning: () => 'Feature j of trace i in memory. Each trial stores one trace.',
    where: 'Memory view: one row per trace.',
    value: () => undefined,
  },
  dot: {
    primer: 'echo',
    render: null,
    display: () => 'Σ P·M',
    role: 'computed',
    name: 'match',
    meaning: () => 'The probe and the trace multiplied feature by feature and added up: big when they have the same features.',
    where: 'Equations: step 1.',
    value: (r) => L1(r).topDot,
  },
  pSq: {
    primer: 'echo',
    render: null,
    display: () => 'Σ P²',
    role: 'computed',
    name: 'size of the probe, squared',
    meaning: () => 'The probe\'s features squared and added up. Its square root is the probe\'s length.',
    where: 'Equations: step 1.',
    value: (r) => L1(r).probeNorm ** 2,
  },
  mSq: {
    primer: 'echo',
    render: null,
    display: () => 'Σ M²',
    role: 'computed',
    name: 'size of the trace, squared',
    meaning: () => 'The trace\'s cue features squared and added up. Its square root is the trace\'s length.',
    where: 'Equations: step 1.',
    value: (r) => L1(r).topNorm ** 2,
  },
  S: {
    primer: 'echo',
    render: { base: 'S', sub: 'i' },
    role: 'computed',
    name: 'similarity',
    meaning: () => 'How alike the probe and trace i are, from −1 (opposite) through 0 (unrelated) to 1 (the same). Only the cue features count, not the outcome.',
    where: 'Memory view: the similarity bar beside each trace.',
    value: (r) => L1(r).topSim,
  },
  k: {
    primer: 'echo',
    render: { base: 'k' },
    role: 'modeller',
    name: 'similarity exponent',
    meaning: () => 'The power similarity is raised to. 3 in the paper: cubing keeps the sign and makes close matches count far more than loose ones.',
    where: 'Slider: similarity exponent (Everything view).',
    value: (r) => r.k,
    exact: true,
  },
  A: {
    primer: 'echo',
    render: { base: 'A', sub: 'i' },
    role: 'computed',
    name: 'activation',
    meaning: () => 'How strongly trace i answers the probe: its similarity cubed.',
    where: 'Memory view: the activation bar beside each trace.',
    value: (r) => L1(r).topAct,
  },
  Craw: {
    primer: 'echo',
    render: { base: 'C', sub: 'j' },
    role: 'computed',
    name: 'echo',
    meaning: () => 'Feature j of the echo: every trace\'s feature j, weighted by its activation, added up (plus a tiny bit of noise).',
    where: 'Memory view: the echo row.',
    value: (r) => L1(r).echoRawJ,
  },
  Cmax: {
    primer: 'echo',
    render: null,
    display: () => 'max|C|',
    mathml: '<mi mathvariant="normal">max</mi><mo>|</mo><mi>C</mi><mo>|</mo>',
    role: 'computed',
    name: 'largest echo feature',
    meaning: () => 'The biggest feature of the echo, ignoring its sign. Dividing by it scales the echo so its biggest feature is 1.',
    where: 'Equations: step 4.',
    value: (r) => L1(r).echoMax,
  },
  Cn: {
    primer: 'echo',
    render: { base: 'C', sub: 'j', sup: '′' },
    role: 'computed',
    name: 'scaled echo',
    meaning: () => 'Feature j of the echo after scaling, between −1 and 1: what the learner expects, feature by feature.',
    where: 'Memory view: the echo row.',
    value: (r) => L1(r).echoJ,
  },
  O: {
    primer: 'vectors',
    render: { base: 'O', sub: 'j' },
    role: 'experimenter',
    name: 'outcome',
    meaning: () => 'Feature j of the outcome: 1 for each of its 20 features. The paper calls the outcome X.',
    where: 'Memory view: the outcome field.',
    value: () => 1,
    exact: true,
  },
  sumOC: {
    primer: 'echo',
    render: null,
    display: () => 'Σ O·C′',
    role: 'computed',
    name: 'outcome in the echo',
    meaning: () => 'The scaled echo\'s outcome features, each multiplied by the outcome\'s (1), added up.',
    where: 'Equations: step 5.',
    value: (r) => L1(r).outcomeSum,
  },
  n: {
    primer: 'vectors',
    render: { base: 'n' },
    role: 'modeller',
    name: 'features in the outcome',
    meaning: () => 'How many features the outcome has (20 in the paper). Dividing by it makes perfect retrieval equal 1.',
    where: 'Slider: features per stimulus (Everything view).',
    value: (r) => r.F,
    exact: true,
  },
  OP: {
    primer: 'echo',
    render: null,
    display: () => 'O|P',
    mathml: '<mi>O</mi><mo>|</mo><mi>P</mi>',
    role: 'computed',
    name: 'retrieval of the outcome',
    meaning: () => 'How well the probe brings back the outcome, from −1 (brings back its opposite: the outcome will not happen) to 1 (brings it back perfectly). Read "O given P". The prediction chart shows its average over all the simulated learners.',
    where: 'Prediction chart: the lines (averaged over learners).',
    value: (r) => L1(r).retrieval,
  },
  E: {
    primer: 'vectors',
    render: { base: 'E', sub: 'j' },
    role: 'experimenter',
    name: 'event',
    meaning: () => 'Feature j of the event: the probe plus the outcome, if it happened.',
    where: 'Memory view: the event row.',
    value: (r) => L1(r).eventJ,
    exact: true,
  },
  Mnew: {
    primer: 'echo',
    render: { base: 'M', sub: 'new,j' },
    role: 'computed',
    name: 'new trace',
    meaning: () => 'Feature j of the trace stored on this trial, if it is kept (each feature is kept with probability L).',
    where: 'Memory view: the new trace, outlined.',
    value: (r) => L1(r).discrepancyJ,
  },
  L: {
    primer: 'vectors',
    render: { base: 'L' },
    role: 'modeller',
    name: 'learning rate',
    meaning: () => 'The chance that each feature of the new trace is stored. With L = 1 every feature is kept.',
    where: 'Slider: learning rate.',
    value: (r) => r.L,
    exact: true,
  },
  alpha: {
    primer: 'vectors',
    render: { base: 'α', sub: 'cue' },
    role: 'modeller',
    name: 'salience',
    meaning: (c) => `How noticeable ${c} is: ${c}'s features are multiplied by it. 1 is full strength.`,
    where: 'Slider: salience (Everything view).',
    value: (r, c) => undefined,
    exact: true,
  },
  N: {
    primer: 'vectors',
    render: { base: 'N' },
    role: 'experimenter',
    name: 'simulated learners',
    meaning: () => 'How many learners are simulated. Each stores features at random, so their results differ; the chart shows the average and the spread.',
    where: 'Slider: simulated learners.',
    value: (r) => r.N,
    exact: true,
  },
  noise: {
    primer: 'echo',
    render: null,
    display: () => 'noise',
    role: 'modeller',
    name: 'echo noise',
    meaning: () => 'The largest random value added to each echo feature (0.001 in the paper). Without it, the model learns in a single trial.',
    where: 'Slider: echo noise (Everything view).',
    value: (r) => r.noise,
    exact: true,
  },
  OPmean: {
    primer: 'echo',
    render: null,
    display: () => 'mean O|P',
    role: 'computed',
    name: 'retrieval, all learners',
    meaning: () => 'Retrieval of the outcome on this trial, averaged over the simulated learners.',
    where: 'Table.',
    value: (r) => r.retrieval,
  },
  OPsd: {
    primer: 'echo',
    render: null,
    display: () => 'SD',
    role: 'computed',
    name: 'spread',
    meaning: () => 'How much retrieval varied between the simulated learners on this trial (the standard deviation). The shaded band on the chart.',
    where: 'Prediction chart: the band. Table.',
    value: (r) => r.retrievalSD,
  },
};

export const roles = {
  experimenter: { label: 'Set by the experimenter', short: 'experimenter' },
  modeller: { label: 'Set by the modeller', short: 'parameter' },
  computed: { label: 'Computed by the model', short: 'computed' },
};

const S = (sym) => ({ sym });
const hasTraces = (r) => r.learner.top >= 0;

export function equations(opts) {
  const eqs = [
    {
      id: 'similarity',
      when: hasTraces,
      title: 'Compare the probe with each trace',
      lhs: S('S'),
      rel: '=',
      rhs: {
        op: 'frac',
        num: { op: 'sumOver', index: 'j', of: 'dot', arg: { op: 'mul', args: [S('P'), S('M')] } },
        den: {
          op: 'mul',
          args: [
            { op: 'sqrt', arg: { op: 'sumOver', index: 'j', of: 'pSq', arg: { op: 'pow', arg: S('P'), exp: { op: 'const', value: 2 } } } },
            { op: 'sqrt', arg: { op: 'sumOver', index: 'j', of: 'mSq', arg: { op: 'pow', arg: S('M'), exp: { op: 'const', value: 2 } } } },
          ],
        },
      },
      words:
        '{S|How similar trace i is to the probe} is {dot|their features multiplied and added up}, divided by {pSq|the probe\'s length} and {mSq|the trace\'s length}. Only the cue features count. This is the cosine: 1 for the same, 0 for unrelated, −1 for opposite.',
    },
    {
      id: 'activation',
      when: hasTraces,
      title: 'Weight each trace by its similarity',
      lhs: S('A'),
      rel: '=',
      rhs: { op: 'pow', arg: S('S'), exp: S('k') },
      words: '{A|How strongly trace i answers} is {S|its similarity} raised to the power {k|k}. Cubing keeps the sign and makes close matches count far more than loose ones.',
    },
    {
      id: 'echo',
      title: 'Add up the echo',
      lhs: S('Craw'),
      rel: '=',
      rhs: { op: 'sumOver', index: 'i', of: 'Craw', arg: { op: 'mul', args: [S('A'), S('M')] } },
      words: "{Craw|The echo's feature j} is every trace's feature j, weighted by {A|that trace's activation}, added up over all the traces in memory (plus a tiny bit of noise).",
    },
    {
      id: 'normalize',
      title: 'Scale the echo',
      lhs: S('Cn'),
      rel: '=',
      rhs: { op: 'frac', num: S('Craw'), den: S('Cmax') },
      words: "{Cn|The scaled echo} is {Craw|the echo} divided by {Cmax|its largest feature}, so that its biggest feature is 1.",
    },
    {
      id: 'retrieval',
      title: 'Read off the outcome',
      lhs: S('OP'),
      rel: '=',
      rhs: { op: 'frac', num: { op: 'sumOver', index: 'j', of: 'sumOC', arg: { op: 'mul', args: [S('O'), S('Cn')] } }, den: S('n') },
      words: "{OP|How well the probe brings back the outcome} is {sumOC|the scaled echo's outcome features} added up and divided by {n|the number of outcome features}: 1 if the echo holds the outcome perfectly, −1 if it holds its opposite.",
    },
  ];
  eqs.push(
    opts.discrepancy
      ? {
          id: 'store',
          title: 'Store the discrepancy',
          lhs: S('Mnew'),
          rel: '=',
          rhs: { op: 'sub', args: [S('E'), S('Cn')] },
          words: "{Mnew|The new trace} is {E|what happened} minus {Cn|what was expected}, feature by feature, each feature kept with probability {L|L}. What was expected is stored weakly; what was surprising, strongly.",
        }
      : {
          id: 'store',
          title: 'Store the event',
          lhs: S('Mnew'),
          rel: '=',
          rhs: S('E'),
          words: "{Mnew|The new trace} is {E|the event itself}, each feature kept with probability {L|L}, as in MINERVA 2. What was expected is stored as strongly as what was surprising.",
        },
  );
  return eqs;
}

export function arithmetic() {
  return {
    line: null,
    lead: (r) => {
      const l = r.learner;
      if (l.top < 0) return `Learner 1's memory is empty on trial ${r.index}, so the echo is noise alone and nothing is expected. The whole event is stored.`;
      const t = l.top + 1;
      return (
        `Learner 1 had ${l.before} trace${l.before === 1 ? '' : 's'} in memory. The one that added the most to the echo was trace ${t}, stored on trial ${t}: similarity ${fmt(l.topSim)}, so it answered with weight ${fmt(l.topSim)}<sup>${r.k}</sup> = ${fmt(l.topAct)}. ` +
        `Adding up every trace's answer, the scaled echo brought back the outcome at ${fmt(l.retrieval)}.`
      );
    },
    chains: [],
    states: [],
    verdict: (r) => {
      const l = r.learner;
      const surprise = r.reinforced ? 1 - l.echoJ : -l.echoJ;
      return `The outcome ${r.reinforced ? 'happened' : 'did not happen'}, so this trial stores ${Math.abs(surprise) < 0.05 ? 'almost nothing new about it' : surprise > 0 ? 'the outcome more strongly than was expected' : 'an opposite of the outcome: what was expected did not come'}. Over all ${r.N} learners, retrieval on this trial averaged ${fmt(r.retrieval)}.`;
    },
  };
}

export function tableColumns() {
  return [
    { sym: 'OPmean', value: (r) => r.retrieval, head: 'O|P' },
    { sym: 'OPsd', value: (r) => r.retrievalSD, head: 'SD' },
    { sym: 'S', value: (r) => (r.learner.top >= 0 ? r.learner.topSim : undefined), suffix: ' learner 1' },
    { sym: 'Mnew', value: (r) => r.learner.discrepancyJ, suffix: ' learner 1' },
  ];
}

export function absentNote(cue) {
  return `${cue} is not on this trial.`;
}

export const codeNames = {
  L: 'L',
  Cn: 'echo',
  E: 'event',
  Mnew: 'trace',
  OP: 'retrieval',
};

export const stages = [
  {
    title: 'Store every event (MINERVA 2)',
    options: { discrepancy: false },
    added: ['S', 'A', 'Cn', 'OP', 'E', 'Mnew'],
    equation: 'retrieval',
    text: 'Start with Hintzman\'s memory model: each trial stores a copy of what happened, and a cue brings back the traces like it. That already gives learning curves, extinction (the new traces have no outcome), latent inhibition (traces of the cue alone dilute the echo), and negative patterning (AB brings back AB traces most). But every cue is stored in full whether or not the outcome was already expected, so there is no blocking.',
  },
  {
    title: 'Store the discrepancy',
    options: { discrepancy: true },
    added: ['Mnew', 'Cn'],
    equation: 'store',
    text: 'Now each trial stores what happened minus what was expected. An expected outcome leaves almost no trace, so a cue added to one that already predicts it is stored with little outcome: blocking. A missing outcome is stored as its opposite, so a cue that comes with it brings back the opposite of the outcome: conditioned inhibition. And an absent cue that was expected is stored as its opposite, which lets later learning change it: backward blocking. This is the full model.',
  },
];

export const intro = `
<p>MINERVA-AL has <strong>no associative strength</strong> at all. Every trial is stored in memory as its own <strong>trace</strong>. When cues appear, every trace answers at once, in proportion to how similar it is to what is present, and the answers add up to an <strong>echo</strong>: what the learner expects. Learning is just remembering, and expecting is just recalling.</p>
<p class="small muted">The model is random: which features get stored varies from learner to learner. So the page runs many simulated learners and plots their average, with the shaded band showing the spread. The memory view follows learner 1.</p>`;
