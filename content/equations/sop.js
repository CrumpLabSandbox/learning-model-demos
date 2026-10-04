// Equation spec for SOP (Wagner, 1981). See js/models/sop.js.
//
// The equations here are the ones for a whole trial: how much a cue learns
// from the moments it spent active alongside the US. The moment-by-moment
// rules (elements moving between states) are shown in the "Inside the
// trial" view, which reads the trial's moments.

import { fmt } from '../../js/core/format.js';

const pc = (r, c) => r.perCue[c];

// The moment just before the US arrives (or the last moment the cue is on,
// on a trial without the US). The single-moment values in the equations
// and the symbol table are read here.
export function refMoment(r) {
  const t = r.timing;
  if (t.us) return Math.max(1, t.us[0] - 1);
  if (t.cs) return t.cs[1];
  return 1;
}
const at = (arr, r) => arr[refMoment(r) - 1];

export const symbols = {
  V: {
    primer: 'names',
    render: { base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'link strength',
    meaning: (c) => `How strongly ${c} is linked to the US, before this trial. It sets how much of the US ${c} calls up when ${c} is active. This is the line on the prediction chart.`,
    where: 'Prediction chart: the line for the cue. Table: the V columns.',
    value: (r, c) => r.Vbefore[c],
  },
  p1: {
    primer: 'states',
    render: { base: 'p', sub: '1,$' },
    role: 'modeller',
    name: 'salience',
    meaning: (c) => `While ${c} is on, the chance that each inactive element of ${c} becomes active (A1) on each moment. A more salient cue activates faster.`,
    where: 'Slider: salience.',
    value: (r, c) => pc(r, c)?.p1,
    exact: true,
  },
  p1US: {
    primer: 'states',
    render: { base: 'p', sub: '1,US' },
    role: 'experimenter',
    name: 'US intensity',
    meaning: () => 'While the US is on, the chance that each inactive US element becomes active (A1) on each moment. A bigger US, such as A+(2), multiplies it (up to 1).',
    where: 'Slider: US intensity.',
    value: (r) => r.usP1,
    exact: true,
  },
  pd1: {
    primer: 'states',
    render: { base: 'p', sub: 'd1' },
    role: 'modeller',
    name: 'decay from A1',
    meaning: () => 'The chance that an element in A1 falls to A2 on each moment. A1 is brief.',
    where: 'Slider: decay from A1 to A2 (Everything view).',
    value: (r) => r.pd1,
    exact: true,
  },
  pd2: {
    primer: 'states',
    render: { base: 'p', sub: 'd2' },
    role: 'modeller',
    name: 'decay from A2',
    meaning: () => 'The chance that an element in A2 falls back to inactive on each moment. It is smaller than the decay from A1, so A2 lingers.',
    where: 'Slider: decay from A2 to inactive (Everything view).',
    value: (r) => r.pd2,
    exact: true,
  },
  pA1: {
    primer: 'states',
    render: { base: 'p', sub: 'A1,$' },
    role: 'computed',
    name: 'how active the cue is',
    meaning: (c) => `The proportion of ${c}'s elements in primary activity (A1), from 0 to 1. It changes every moment: the timeline draws it. The value shown is the one just before the US arrives.`,
    where: 'Inside the trial: the solid line for the cue.',
    value: (r, c) => at(r.moments.A1[c], r),
  },
  pA1US: {
    primer: 'states',
    render: { base: 'p', sub: 'A1,US' },
    role: 'computed',
    name: 'US in A1',
    meaning: () => 'The proportion of US elements in primary activity: the US as it is first felt. It is high just after the US arrives.',
    where: 'Inside the trial: the solid US line.',
    value: (r) => at(r.moments.A1.US, r),
  },
  pA2US: {
    primer: 'states',
    render: { base: 'p', sub: 'A2,US' },
    role: 'computed',
    name: 'US in A2',
    meaning: () => 'The proportion of US elements in secondary activity: the US fading, or the US called up by a cue before it arrives.',
    where: 'Inside the trial: the dashed US line.',
    value: (r) => at(r.moments.A2.US, r),
  },
  p2US: {
    primer: 'states',
    render: { base: 'p', sub: '2,US' },
    role: 'computed',
    name: 'how much the cues call up the US',
    meaning: () => 'The chance that each inactive US element is sent straight to A2 on this moment, because the cues in A1 are linked to the US. The value shown is the one just before the US arrives.',
    where: 'Inside the trial: the moment readout.',
    value: (r) => r.moments.p2.US[Math.min(r.moments.length - 1, refMoment(r))],
  },
  rho: {
    primer: 'greek',
    render: { base: 'ρ' },
    role: 'modeller',
    name: 'retrieval strength',
    meaning: () => 'ρ is "rho". It turns link strength into a chance of calling up the US. It only sets the scale on which V is shown.',
    where: 'Slider: retrieval strength (Everything view).',
    value: (r) => r.rho,
    exact: true,
  },
  Lp: {
    primer: 'states',
    render: { base: 'L', sup: '+' },
    role: 'modeller',
    name: 'excitatory learning rate',
    meaning: () => 'How much link strength is gained for each unit of overlap between the cue in A1 and the US in A1.',
    where: 'Slider: excitatory learning rate.',
    value: (r) => r.Lp,
    exact: true,
  },
  Lm: {
    primer: 'states',
    render: { base: 'L', sup: '−' },
    role: 'modeller',
    name: 'inhibitory learning rate',
    meaning: () => 'How much link strength is lost for each unit of overlap between the cue in A1 and the US in A2. It is much smaller than L⁺, because A2 lasts much longer than A1.',
    where: 'Slider: inhibitory learning rate.',
    value: (r) => r.Lm,
    exact: true,
  },
  ovE: {
    primer: 'overlap',
    render: null,
    display: () => 'Σ pA1·pA1,US',
    role: 'computed',
    name: 'excitatory overlap',
    meaning: (c) => `How much ${c} and the US were in A1 at the same moments: at each moment multiply the two proportions, then add up over the trial. It is the green area on the timeline.`,
    where: 'Inside the trial: the green area.',
    value: (r, c) => pc(r, c)?.overlapExcite,
  },
  ovI: {
    primer: 'overlap',
    render: null,
    display: () => 'Σ pA1·pA2,US',
    role: 'computed',
    name: 'inhibitory overlap',
    meaning: (c) => `How much ${c} was in A1 while the US was in A2: at each moment multiply the two proportions, then add up over the trial. It is the red area on the timeline.`,
    where: 'Inside the trial: the red area.',
    value: (r, c) => pc(r, c)?.overlapInhibit,
  },
  dVp: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'V', sub: 'cue', sup: '+' },
    role: 'computed',
    name: 'excitatory learning',
    meaning: (c) => `How much link strength ${c} gains on this trial.`,
    where: 'Table: the ΔV⁺ columns.',
    value: (r, c) => pc(r, c)?.excite,
  },
  dVm: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'V', sub: 'cue', sup: '−' },
    role: 'computed',
    name: 'inhibitory learning',
    meaning: (c) => `How much link strength ${c} loses on this trial.`,
    where: 'Table: the ΔV⁻ columns.',
    value: (r, c) => pc(r, c)?.inhibit,
  },
  dV: {
    primer: 'delta',
    render: { pre: 'Δ', base: 'V', sub: 'cue' },
    role: 'computed',
    name: 'change in link strength',
    meaning: (c) => `The net change in ${c}'s link strength on this trial.`,
    where: 'Table: the ΔV columns.',
    value: (r, c) => pc(r, c)?.deltaV,
  },
  R: {
    primer: 'states',
    render: { base: 'R' },
    role: 'computed',
    name: 'response',
    meaning: () => 'The response: w₁ times the US in A1 plus w₂ times the US in A2. The table shows its average while the cue is on, before the US arrives: the conditioned response.',
    where: 'Inside the trial: the response line. Table: the R column.',
    value: (r) => r.response ?? undefined,
  },
  w1: {
    primer: 'states',
    render: { base: 'w', sub: '1' },
    role: 'modeller',
    name: 'response weight for A1',
    meaning: () => 'How much the US in A1 adds to the response.',
    where: 'Slider (Everything view).',
    value: (r) => r.w1,
    exact: true,
  },
  w2: {
    primer: 'states',
    render: { base: 'w', sub: '2' },
    role: 'modeller',
    name: 'response weight for A2',
    meaning: () => 'How much the US in A2 adds to the response. When it has the opposite sign to w₁, the response to a cue is the opposite of the response to the US: the "opponent" in the model\'s name.',
    where: 'Slider (Everything view).',
    value: (r) => r.w2,
    exact: true,
  },
};

export const roles = {
  experimenter: { label: 'Set by the experimenter', short: 'experimenter' },
  modeller: { label: 'Set by the modeller', short: 'parameter' },
  computed: { label: 'Computed by the model', short: 'computed' },
};

const S = (sym) => ({ sym });

export function equations(opts) {
  const eqs = [];
  if (opts.retrieval) {
    eqs.push({
      id: 'recall',
      title: 'Call up the US, just before it arrives',
      lhs: S('p2US'),
      rel: '=',
      rhs: {
        op: 'clamp',
        note: 'kept between 0 and 1',
        lo: { op: 'const', value: 0 },
        hi: { op: 'const', value: 1 },
        arg: { op: 'mul', args: [S('rho'), { op: 'paren', arg: { op: 'sumEach', each: (c) => ({ op: 'mul', args: [{ sym: 'V', cue: c }, { sym: 'pA1', cue: c }] }) } }] },
      },
      words:
        '{p2US|How strongly the US is called up} is {rho|the retrieval strength} times each cue\'s {V|link strength} times {pA1|how active it is}, added up over the cues present (%present%). The called-up US goes to A2, not A1, so it cannot be felt as a new US.',
    });
  }
  eqs.push({
    id: 'excite',
    title: 'Gain: $ and the US active together',
    lhs: S('dVp'),
    rel: '=',
    rhs: { op: 'mul', args: [S('Lp'), { op: 'sumMoments', of: 'ovE', arg: { op: 'mul', args: [S('pA1'), S('pA1US')] } }] },
    words:
      "{dVp|$'s gain} is {Lp|the excitatory learning rate} times {ovE|how much $ and the US were both in A1 at the same moments}, added up over every moment of the trial.",
  });
  if (opts.inhibition) {
    eqs.push({
      id: 'inhibit',
      title: 'Loss: $ active while the US fades',
      lhs: S('dVm'),
      rel: '=',
      rhs: { op: 'mul', args: [S('Lm'), { op: 'sumMoments', of: 'ovI', arg: { op: 'mul', args: [S('pA1'), S('pA2US')] } }] },
      words:
        "{dVm|$'s loss} is {Lm|the inhibitory learning rate} times {ovI|how much $ was in A1 while the US was in A2}, added up over every moment of the trial.",
    });
  }
  eqs.push({
    id: 'net',
    title: 'Net change',
    lhs: S('dV'),
    rel: '=',
    rhs: opts.inhibition ? { op: 'sub', args: [S('dVp'), S('dVm')] } : S('dVp'),
    words: opts.inhibition ? "{dV|$'s change} is {dVp|the gain} minus {dVm|the loss}." : "{dV|$'s change} is {dVp|the gain}: in this version nothing is ever lost.",
  });
  eqs.push({
    id: 'apply',
    title: 'Update link strength',
    lhs: S('V'),
    rel: '←',
    rhs: { op: 'add', args: [S('V'), S('dV')] },
    words: "After the trial, {V|$'s link strength} becomes its old value plus {dV|the change}.",
  });
  return eqs;
}

export function arithmetic(opts) {
  const chains = [{ title: 'Gain', factors: ['Lp', 'ovE'], result: 'dVp' }];
  if (opts.inhibition) chains.push({ title: 'Loss', factors: ['Lm', 'ovI'], result: 'dVm' });
  return {
    line: null,
    lead: (r, c) =>
      `SOP has no error term. ${c} learns from what was active at the same moments as ${c}: the US in A1 (gain) and the US in A2 (loss). The overlaps are added up over all ${r.moments.length} moments of the trial.`,
    chains,
    states: [{ sym: 'V', after: (r, c) => r.perCue[c]?.Vafter }],
    verdict: (r, c) => {
      const p = r.perCue[c];
      if (!opts.inhibition) return p.excite > 0.0005 ? `${c} gains strength.` : `${c} and the US were never active together, so nothing changes.`;
      if (Math.abs(p.deltaV) < 0.0005) return `Gain and loss nearly cancel, so ${c} barely changes.`;
      return p.deltaV > 0 ? `The gain (${fmt(p.excite)}) is bigger than the loss (${fmt(p.inhibit)}), so ${c}'s strength goes up.` : `The loss (${fmt(p.inhibit)}) is bigger than the gain (${fmt(p.excite)}), so ${c}'s strength goes down.`;
    },
  };
}

export function tableColumns(opts, cues) {
  const cols = [{ sym: 'R', value: (r) => r.response ?? undefined }];
  for (const c of cues) {
    cols.push({ sym: 'dVp', cue: c, value: (r) => r.perCue[c]?.excite });
    if (opts.inhibition) cols.push({ sym: 'dVm', cue: c, value: (r) => r.perCue[c]?.inhibit });
    cols.push({ sym: 'V', cue: c, value: (r) => r.Vafter[c], suffix: ' after' });
  }
  return cols;
}

export function absentNote(cue, rec) {
  const d = rec.perCue[cue]?.deltaV ?? 0;
  return `${cue} is not on this trial, so its elements stay inactive and it learns ${Math.abs(d) < 0.0005 ? 'nothing' : `almost nothing (${fmt(d)})`}. Learning in SOP needs the cue itself to be in A1.`;
}

export const codeNames = {
  rho: 'rho',
  p2US: 'p2',
  pA1: 'A1',
  pA2US: 'A2',
  pd1: 'pd1',
  pd2: 'pd2',
  Lp: 'Lp',
  Lm: 'Lm',
  ovE: 'excite',
  ovI: 'inhibit',
};

export const charts = [
  {
    key: 'recall',
    title: 'What each cue calls up',
    help: 'For each cue, how much of the US it would call up into A2 if it were shown on its own now: the average over a 10-moment test, with no learning. This is closer to what an animal does than V is: a faint cue needs a bigger V to call up the US as strongly.',
  },
];

export const stages = [
  {
    title: 'Learn from overlap',
    options: { retrieval: false, inhibition: false, links: false },
    added: ['Lp', 'ovE', 'pA1', 'pA1US'],
    equation: 'excite',
    text: 'Start with one idea: a cue gains strength whenever it and the US are in A1 at the same moments. Nothing stops the growth: the US is felt just as strongly on the hundredth trial as on the first, so V climbs in a straight line. But timing already matters. A gap between the cue and the US means less overlap, and so do trials packed close together, because the last trial is still active.',
  },
  {
    title: 'Cues call up the US',
    options: { retrieval: true, inhibition: false, links: false },
    added: ['p2US', 'rho', 'V'],
    equation: 'recall',
    text: 'Now a cue in A1 sends US elements straight to A2. A trained cue calls up the US before it arrives, so fewer US elements are left to go to A1, and the US is felt less. Learning slows and levels off. A pretrained cue blocks a new one, two cues trained together overshadow each other, and a context that calls up the US slows learning about new cues. None of this needs an error term.',
  },
  {
    title: 'Learn from the fading US',
    options: { retrieval: true, inhibition: true, links: false },
    added: ['Lm', 'ovI', 'pA2US', 'dVm'],
    equation: 'inhibit',
    text: 'Now a cue in A1 while the US is in A2 loses strength. Extinction works: the cue calls up the US into A2 and nothing else arrives. A cue shown just after the US becomes an inhibitor (backward conditioning), and so does a cue that comes with a trained cue when the US is missing (conditioned inhibition).',
  },
  {
    title: 'Cues link to each other',
    options: { retrieval: true, inhibition: true, links: true },
    added: [],
    equation: 'net',
    text: 'Finally, every cue learns about every other cue by the same rule. The context comes to call up a cue that is often shown in it, so that cue is already in A2 when it appears and is slow to learn: latent inhibition. This is the full model.',
  },
];

export const intro = `
<p>SOP asks a different question from the other models: not "how surprising was this trial?" but <strong>"what was active at this moment?"</strong> Every stimulus is a set of elements that can be <strong>inactive</strong>, in <strong>primary activity (A1)</strong> as it is first felt, or in <strong>secondary activity (A2)</strong> as it fades. A cue learns about the US when the two are active at the same moments.</p>
<p class="small muted">Time runs in moments inside each trial. The design can set when the cue (CS) and the US are on, and the gap to the next trial (ITI), in square brackets. Step to a trial and open <em>Inside the trial</em> to watch the elements move.</p>
<details class="howto advanced"><summary>Choices made on this page</summary>
<p class="small">Wagner (1981) and Mazur and Wagner (1982) leave some details open. This page makes these choices:</p>
<ul class="small">
<li>On each moment, presenting a stimulus acts first; calling up (p<sub>2</sub>) applies to the inactive elements that are left.</li>
<li>Learning adds up over every moment of the trial and the gap after it, and V changes once, at the end of the trial.</li>
<li>How strongly the cues call up the US is p<sub>2</sub> = ρ × the sum of V × p<sub>A1</sub> over the cues, kept between 0 and 1.</li>
<li>Every cue also links to every other cue, by the same rule. The US links to nothing.</li>
<li>A bigger US, such as A+(2), multiplies the US intensity, up to 1.</li>
<li>The response is R = w<sub>1</sub> × the US in A1 + w<sub>2</sub> × the US in A2, averaged while the cue is on, before the US arrives.</li>
<li>Every stimulus starts inactive, and the context is on all the time.</li>
<li>The default numbers are this site's, chosen so that one set of values shows the classic effects. They are not from the papers.</li>
</ul></details>`;
