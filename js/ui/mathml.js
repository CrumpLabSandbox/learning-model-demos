// Small helpers for writing MathML by hand, for the primer and worked
// examples. Every function returns a string, so content runs in Node too.

const isLetter = (t) => /^[A-Za-zα-ω]$/.test(t);

export const mi = (t) => (isLetter(t) ? `<mi>${t}</mi>` : `<mi mathvariant="normal">${t}</mi>`);
export const mo = (t) => `<mo>${t}</mo>`;
export const mn = (t) => `<mn>${String(t).replace(/^-/, '−')}</mn>`;
export const mtext = (t) => `<mtext>${t}</mtext>`;
export const row = (...parts) => `<mrow>${parts.join('')}</mrow>`;
export const math = (...parts) => `<math>${parts.join('')}</math>`;

// A named symbol such as ΔV_A, coloured by role and linked by data-sym.
// opts: { pre, sub, sup, role, key, cue }
export function sym(base, opts = {}) {
  const pre = opts.pre ? mi(opts.pre) : '';
  let core = mi(base);
  if (opts.sub && opts.sup) core = `<msubsup>${core}${subPart(opts.sub)}${subPart(opts.sup)}</msubsup>`;
  else if (opts.sub) core = `<msub>${core}${subPart(opts.sub)}</msub>`;
  else if (opts.sup) core = `<msup>${core}${subPart(opts.sup)}</msup>`;
  const cls = opts.role ? ` class="sym role-${opts.role}"` : '';
  const data = `${opts.key ? ` data-sym="${opts.key}"` : ''}${opts.cue ? ` data-cue="${opts.cue}"` : ''}`;
  return `<mrow${cls}${data}>${pre}${core}</mrow>`;
}

function subPart(s) {
  if (s.startsWith('<')) return s;
  if (/^[0-9.]+$/.test(s)) return mn(s);
  if (/^[a-z]\+1$/.test(s)) return row(mi(s[0]), mo('+'), mn('1'));
  return s.length === 1 ? mi(s) : mtext(s);
}

// Shorthands for the Rescorla-Wagner symbols, with the site's roles.
export const RW = {
  V: (cue, sup) => sym('V', { sub: cue, sup, role: 'computed', key: 'V', cue }),
  dV: (cue, sup) => sym('V', { pre: 'Δ', sub: cue, sup, role: 'computed', key: 'dV', cue }),
  sumV: (sup) => sym('V', { pre: 'Σ', sup, role: 'computed', key: 'sumV' }),
  alpha: (cue) => sym('α', { sub: cue, role: 'modeller', key: 'alpha', cue }),
  beta: () => sym('β', { role: 'modeller', key: 'beta' }),
  lambda: () => sym('λ', { role: 'experimenter', key: 'lambda' }),
};

export const paren = (...parts) => row(mo('('), ...parts, mo(')'));
