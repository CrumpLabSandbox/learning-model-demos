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
//   magnitude for that trial type.
// - An item that is just `alternate`, `random`, or `blocked` sets the order
//   of trials within the phase. The default is `alternate`: one of each
//   trial type in turn. `random` shuffles with the design's seed.
//   `blocked` runs all of the first type, then all of the next.
// - A line starting with `Test:` lists the cues and compounds to plot.
//   Without one, every single cue is plotted.
// - Blank lines and lines starting with `#` are ignored.

export const ORDERS = ['alternate', 'random', 'blocked'];
export const MAX_TRIALS = 2000;

export class DesignError extends Error {
  constructor(message, line) {
    super(line ? `Line ${line}: ${message}` : message);
    this.line = line;
  }
}

const TYPE_RE = /^([A-Za-z]+)([+-])(?:\(\s*([0-9]*\.?[0-9]+)\s*\))?$/;

export function parseTrialType(text, line) {
  const s = text.trim();
  const m = TYPE_RE.exec(s);
  if (!m) {
    throw new DesignError(
      `"${s}" is not a trial type. Write cue letters then + or -, such as A+ or AB-.`,
      line,
    );
  }
  const [, letters, sign, mag] = m;
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

export function parseDesign(text) {
  const phases = [];
  let probes = null;
  const lines = String(text).split(/\r?\n/);
  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const s = raw.trim();
    if (!s || s.startsWith('#')) return;
    const colon = s.indexOf(':');
    const name = colon >= 0 ? s.slice(0, colon).trim() : '';
    const body = colon >= 0 ? s.slice(colon + 1).trim() : s;
    if (/^test$/i.test(name)) {
      probes = body.split(/[,\s]+/).filter(Boolean).map((p) => parseCueSet(p, lineNo));
      if (!probes.length) throw new DesignError('The Test line lists no cues.', lineNo);
      return;
    }
    const phase = { name: name || `Phase ${phases.length + 1}`, order: 'alternate', trials: [] };
    for (const itemRaw of body.split(',')) {
      const item = itemRaw.trim();
      if (!item) continue;
      if (ORDERS.includes(item.toLowerCase())) {
        phase.order = item.toLowerCase();
        continue;
      }
      const m = /^(\d+)\s*[x×*]?\s*(\S.*)$/.exec(item);
      const count = m ? Number(m[1]) : 1;
      const typeText = m ? m[2] : item;
      if (count < 1) throw new DesignError(`"${item}": the count must be at least 1.`, lineNo);
      phase.trials.push({ count, type: parseTrialType(typeText, lineNo) });
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
  const cues = [...cueSet].sort();
  return { phases, probes, cues, totalTrials: total };
}

// Turn a parsed design back into text. parseDesign(formatDesign(d)) gives d.
export function formatDesign(design) {
  const lines = design.phases.map((p) => {
    const items = p.trials.map((t) => `${t.count} ${t.type.label}`);
    if (p.order !== 'alternate') items.push(p.order);
    return `${p.name}: ${items.join(', ')}`;
  });
  if (design.probes) lines.push(`Test: ${design.probes.join(', ')}`);
  return lines.join('\n');
}

// The sequence of trials the design produces, in order.
// Each entry: { phaseIndex, phaseName, type }.
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
    for (const type of seq) out.push({ phaseIndex, phaseName: phase.name, type });
  });
  return out;
}

export function usesRandomOrder(design) {
  return design.phases.some((p) => p.order === 'random');
}
