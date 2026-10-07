// Trial-design format.
//
// A design is written as text, one phase per line:
//
//   Phase 1: 20 A+
//   Phase 2: 20 AB+, 20 CD+, random
//   Test: B, D
//
// - Each phase line is an optional name and colon, then comma-separated
//   items. An item is a count and a trial type, such as `20 AB+`. The count
//   defaults to 1.
// - A trial type is one or more capital letters, one per cue, then `+` when
//   the outcome occurs or `-` when it does not. `A+(0.5)` sets the outcome
//   magnitude for that trial type. A bare `+` is the outcome on its own, with
//   no cue, and a bare `-` is a trial on which nothing happens. With a
//   context (see below) the context is the only cue on such a trial; without
//   one they teach nothing and just take up a trial. The four together,
//   `A+`, `A-`, `+`, `-`, are the four cells of a 2 × 2 contingency table
//   (see js/core/contingency.js).
// - A design can use more than one outcome: `A+1` and `B+2` are reinforced
//   with outcome 1 and outcome 2. `A+` is outcome 1. `A+2(0.5)` sets the
//   magnitude of outcome 2 on that trial type. Models that know one US treat
//   every outcome as that US; a model with `multiOutcome` learns about each.
// - A line `Modalities: AB, CD` says that A and B are of one kind (say,
//   visual) and C and D of another. A model that represents stimuli by
//   features (Delamater's network) gives each group a shared feature and its
//   own pathway. Other models ignore the line.
// - Timing, for models that run moment by moment (SOP): an item can end with
//   settings in square brackets, such as `20 A+ [CS 1-10, US 9-10, ITI 100]`.
//   CS a-b says the cues are on from moment a to moment b of the trial, US
//   a-b says when the outcome is on, and ITI n is the number of moments
//   before the next trial. A line `Timing: CS 1-10, US 9-10, ITI 100` sets
//   the timing for every item that does not set its own. Anything not set
//   uses DEFAULT_TIMING. Models that work trial by trial ignore timing.
// - An item that is just `alternate`, `random`, or `blocked` sets the order
//   of trials within the phase. The default is `alternate`: one of each
//   trial type in turn. `random` shuffles with the design's seed.
//   `blocked` runs all of the first type, then all of the next.
// - A line starting with `Test:` lists the cues and compounds to plot.
//   Without one, every single cue is plotted.
// - A line `Context: Z` names a cue for the experimental context. It is
//   added to every trial, so the context can gain or lose strength like any
//   other cue.
// - Blank lines and lines starting with `#` are ignored.

export const ORDERS = ['alternate', 'random', 'blocked'];
export const MAX_TRIALS = 2000;
// In moments. The US arrives in the last two moments of the CS (delay
// conditioning), and the interval between trials is long enough for the
// traces of one trial to fade before the next.
export const DEFAULT_TIMING = { cs: [1, 10], us: [9, 10], iti: 100 };
const MAX_MOMENTS = 400;

export class DesignError extends Error {
  constructor(message, line) {
    super(line ? `Line ${line}: ${message}` : message);
    this.line = line;
  }
}

const TYPE_RE = /^([A-Za-z]*)([+-])([1-9])?(?:\(\s*([0-9]*\.?[0-9]+)\s*\))?$/;

export function parseTrialType(text, line) {
  const s = text.trim();
  const m = TYPE_RE.exec(s);
  if (!m) {
    throw new DesignError(
      `"${s}" is not a trial type. Write cue letters then + or -, such as A+ or AB-.`,
      line,
    );
  }
  const [, letters, sign, outcomeDigit, mag] = m;
  if (sign === '-' && outcomeDigit !== undefined) {
    throw new DesignError(`"${s}": only reinforced (+) trials name an outcome.`, line);
  }
  if (letters !== letters.toUpperCase()) {
    throw new DesignError(`Cues are capital letters: write ${letters.toUpperCase()}${sign} instead of ${s}.`, line);
  }
  const cues = [...letters];
  if (new Set(cues).size !== cues.length) {
    throw new DesignError(`"${s}" lists the same cue twice.`, line);
  }
  const reinforced = sign === '+';
  if (!reinforced && mag !== undefined) {
    throw new DesignError(`"${s}": only reinforced (+) trials take a magnitude.`, line);
  }
  return {
    label: s,
    cues: cues.slice().sort(),
    reinforced,
    // Which outcome: 1 unless the design says otherwise, 0 on a trial with none.
    outcome: reinforced ? Number(outcomeDigit ?? 1) : 0,
    magnitude: mag === undefined ? null : Number(mag),
  };
}

export function parseCueSet(text, line) {
  const s = text.trim();
  if (!/^[A-Z]+$/.test(s)) {
    throw new DesignError(`"${s}" is not a cue or compound. Use capital letters, such as B or AB.`, line);
  }
  return [...new Set(s)].sort().join('');
}

// Timing settings: "CS 1-10, US 9-10, ITI 100". Returns the parts given.
export function parseTiming(text, line) {
  const out = {};
  for (const raw of text.split(',')) {
    const item = raw.trim();
    if (!item) continue;
    const m = /^(CS|US|ITI)\s*(\d+)(?:\s*-\s*(\d+))?$/i.exec(item);
    if (!m) {
      throw new DesignError(`"${item}" is not a timing setting. Write CS 1-10, US 9-10, or ITI 100.`, line);
    }
    const key = m[1].toLowerCase();
    const a = Number(m[2]);
    if (key === 'iti') {
      if (m[3] !== undefined) throw new DesignError(`"${item}": ITI is one number of moments, such as ITI 100.`, line);
      if (a > MAX_MOMENTS) throw new DesignError(`"${item}": the longest ITI is ${MAX_MOMENTS} moments.`, line);
      out.iti = a;
      continue;
    }
    const b = m[3] === undefined ? a : Number(m[3]);
    if (a < 1 || b < a) throw new DesignError(`"${item}": moments count from 1, and the end comes after the start.`, line);
    if (b > MAX_MOMENTS) throw new DesignError(`"${item}": a trial lasts at most ${MAX_MOMENTS} moments.`, line);
    out[key] = [a, b];
  }
  return out;
}

export function timingText(t) {
  const parts = [];
  if (t.cs) parts.push(`CS ${t.cs[0]}-${t.cs[1]}`);
  if (t.us) parts.push(`US ${t.us[0]}-${t.us[1]}`);
  if (t.iti !== undefined) parts.push(`ITI ${t.iti}`);
  return parts.join(', ');
}

// Split on commas that are not inside square brackets.
function splitItems(body) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '[') depth += 1;
    if (ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseDesign(text) {
  const phases = [];
  let probes = null;
  let context = null;
  let timing = null;
  let modalities = null;
  const lines = String(text).split(/\r?\n/);
  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const s = raw.trim();
    if (!s || s.startsWith('#')) return;
    const colon = s.indexOf(':');
    const name = colon >= 0 ? s.slice(0, colon).trim() : '';
    const body = colon >= 0 ? s.slice(colon + 1).trim() : s;
    if (/^context$/i.test(name)) {
      if (!/^[A-Z]$/.test(body)) throw new DesignError('The context is one capital letter, such as "Context: Z".', lineNo);
      context = body;
      return;
    }
    if (/^timing$/i.test(name)) {
      timing = parseTiming(body, lineNo);
      return;
    }
    if (/^modalities$/i.test(name)) {
      modalities = body.split(/[,\s]+/).filter(Boolean).map((g) => [...parseCueSet(g, lineNo)]);
      const seen = new Set();
      for (const g of modalities) for (const c of g) {
        if (seen.has(c)) throw new DesignError(`${c} is listed in two modalities.`, lineNo);
        seen.add(c);
      }
      if (!modalities.length) throw new DesignError('The Modalities line lists no cues.', lineNo);
      return;
    }
    if (/^test$/i.test(name)) {
      probes = body.split(/[,\s]+/).filter(Boolean).map((p) => parseCueSet(p, lineNo));
      if (!probes.length) throw new DesignError('The Test line lists no cues.', lineNo);
      return;
    }
    const phase = { name: name || `Phase ${phases.length + 1}`, order: 'alternate', trials: [] };
    for (const itemRaw of splitItems(body)) {
      let item = itemRaw.trim();
      if (!item) continue;
      if (ORDERS.includes(item.toLowerCase())) {
        phase.order = item.toLowerCase();
        continue;
      }
      let itemTiming = null;
      const tm = /^(.*?)\s*\[([^\]]*)\]$/.exec(item);
      if (tm) {
        item = tm[1];
        itemTiming = parseTiming(tm[2], lineNo);
      } else if (item.includes('[') || item.includes(']')) {
        throw new DesignError(`"${item}": timing goes in square brackets at the end, such as A+ [US 15-16].`, lineNo);
      }
      const m = /^(\d+)\s*[x×*]?\s*(\S.*)$/.exec(item);
      const count = m ? Number(m[1]) : 1;
      const typeText = m ? m[2] : item;
      if (count < 1) throw new DesignError(`"${item}": the count must be at least 1.`, lineNo);
      const type = parseTrialType(typeText, lineNo);
      if (itemTiming) type.timing = itemTiming;
      phase.trials.push({ count, type });
    }
    if (!phase.trials.length) throw new DesignError(`"${s}" has no trials.`, lineNo);
    phases.push(phase);
  });
  if (!phases.length) throw new DesignError('The design has no phases. Add a line such as "Training: 20 A+".');
  const total = phases.reduce((n, p) => n + p.trials.reduce((m, t) => m + t.count, 0), 0);
  if (total > MAX_TRIALS) throw new DesignError(`The design has ${total} trials. The limit is ${MAX_TRIALS}.`);

  const cueSet = new Set();
  for (const p of phases) for (const t of p.trials) t.type.cues.forEach((c) => cueSet.add(c));
  for (const pr of probes ?? []) [...pr].forEach((c) => cueSet.add(c));
  if (context) {
    const inTrials = phases.some((p) => p.trials.some((t) => t.type.cues.includes(context)));
    if (inTrials) throw new DesignError(`${context} is the context, so it is already on every trial. Remove it from the trial types.`);
    cueSet.add(context);
  }
  for (const g of modalities ?? []) for (const c of g) {
    if (c === context) throw new DesignError(`${c} is the context, which is of every modality. Leave it out of the Modalities line.`);
    cueSet.add(c);
  }
  const cues = [...cueSet].sort();
  if (!cues.length) throw new DesignError('The design has no cues. Add a cue to a trial type, such as A+, or a context line, such as "Context: Z".');
  const outcomes = [...new Set(phases.flatMap((p) => p.trials.filter((t) => t.type.reinforced).map((t) => t.type.outcome)))].sort((a, b) => a - b);
  return { phases, probes, cues, context, timing, modalities, outcomes, totalTrials: total };
}

// Turn a parsed design back into text. parseDesign(formatDesign(d)) gives d.
export function formatDesign(design) {
  const lines = design.phases.map((p) => {
    const items = p.trials.map((t) => `${t.count} ${t.type.label}${t.type.timing ? ` [${timingText(t.type.timing)}]` : ''}`);
    if (p.order !== 'alternate') items.push(p.order);
    return `${p.name}: ${items.join(', ')}`;
  });
  if (design.timing) lines.push(`Timing: ${timingText(design.timing)}`);
  if (design.modalities) lines.push(`Modalities: ${design.modalities.map((g) => g.join('')).join(', ')}`);
  if (design.context) lines.push(`Context: ${design.context}`);
  if (design.probes) lines.push(`Test: ${design.probes.join(', ')}`);
  return lines.join('\n');
}

// The full timing of a trial type: its own settings, then the design's
// Timing line, then DEFAULT_TIMING. A trial without the outcome has us: null.
export function resolveTiming(design, type) {
  const t = { ...DEFAULT_TIMING, ...(design.timing ?? {}), ...(type.timing ?? {}) };
  return { cs: type.cues.length ? t.cs : null, us: type.reinforced ? t.us : null, iti: t.iti };
}

// The sequence of trials the design produces, in order.
// Each entry: { phaseIndex, phaseName, type, cues, timing }, where cues
// includes the context, if the design has one.
export function expandDesign(design, rng) {
  const out = [];
  design.phases.forEach((phase, phaseIndex) => {
    let seq = [];
    if (phase.order === 'blocked') {
      for (const t of phase.trials) for (let k = 0; k < t.count; k++) seq.push(t.type);
    } else {
      const left = phase.trials.map((t) => t.count);
      while (left.some((n) => n > 0)) {
        phase.trials.forEach((t, j) => {
          if (left[j] > 0) {
            seq.push(t.type);
            left[j] -= 1;
          }
        });
      }
      if (phase.order === 'random') {
        if (!rng) throw new Error('A random phase needs a random number generator.');
        seq = rng.shuffle(seq);
      }
    }
    for (const type of seq) {
      const cues = design.context ? [...type.cues, design.context].sort() : type.cues;
      out.push({ phaseIndex, phaseName: phase.name, type, cues, timing: resolveTiming(design, type) });
    }
  });
  return out;
}

export function usesRandomOrder(design) {
  return design.phases.some((p) => p.order === 'random');
}
