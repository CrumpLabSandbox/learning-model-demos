// Page state <-> URL hash, so an instructor can share a configured page.
//
// #preset=blocking&p=alpha_A:0.5,beta:0.4&o=summedError:0&t=23&cue=B
// The design text is included only when it differs from the preset's.

export function encodeState(s) {
  const q = new URLSearchParams();
  if (s.preset) q.set('preset', s.preset);
  if (s.design !== undefined && s.design !== null) q.set('design', s.design);
  const p = Object.entries(s.params ?? {});
  if (p.length) q.set('p', p.map(([k, v]) => `${k}:${v}`).join(','));
  const o = Object.entries(s.options ?? {});
  if (o.length) q.set('o', o.map(([k, v]) => `${k}:${v ? 1 : 0}`).join(','));
  if (s.seed !== undefined && s.seed !== 1) q.set('seed', String(s.seed));
  if (s.t !== undefined) q.set('t', String(s.t));
  if (s.cue) q.set('cue', s.cue);
  if (s.readings) q.set('r', s.readings.join(','));
  if (s.stage !== undefined && s.stage !== null) q.set('stage', String(s.stage));
  if (s.view) q.set('view', s.view);
  return q.toString();
}

export function decodeState(hash) {
  const q = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const out = {};
  if (q.has('preset')) out.preset = q.get('preset');
  if (q.has('design')) out.design = q.get('design');
  if (q.has('p')) {
    out.params = {};
    for (const pair of q.get('p').split(',')) {
      const [k, v] = pair.split(':');
      const n = Number(v);
      if (k && Number.isFinite(n)) out.params[k] = n;
    }
  }
  if (q.has('o')) {
    out.options = {};
    for (const pair of q.get('o').split(',')) {
      const [k, v] = pair.split(':');
      if (k) out.options[k] = v === '1';
    }
  }
  const int = (k) => {
    const n = Number.parseInt(q.get(k), 10);
    return Number.isFinite(n) ? n : undefined;
  };
  if (q.has('seed')) out.seed = int('seed');
  if (q.has('t')) out.t = int('t');
  if (q.has('cue')) out.cue = q.get('cue');
  if (q.has('r')) out.readings = q.get('r').split(',').filter(Boolean);
  if (q.has('stage')) out.stage = int('stage');
  if (q.has('view')) out.view = q.get('view');
  return out;
}
