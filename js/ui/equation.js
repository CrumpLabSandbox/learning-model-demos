// Renders an equation spec as MathML, words, and numbers, and evaluates it.
// Every function returns a markup string, so it runs in Node for tests.

import { fmt, fmtExact, signed } from '../core/format.js';

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}

// A subscript that names the focus cue: 'cue' on its own, or text with $ in
// it, such as 'A1,$' for p_A1,A.
export function cueSub(r) {
  return r?.sub === 'cue' || Boolean(r?.sub?.includes?.('$'));
}
function subText(r, cue) {
  if (r.sub === 'cue') return cue;
  return r.sub ? r.sub.replaceAll('$', cue) : r.sub;
}

function attrs(key, def, cue) {
  const c = cueSub(def.render) || cue ? cue : null;
  return `class="sym role-${def.role}" data-sym="${key}"${c ? ` data-cue="${c}"` : ''}`;
}

// ---- Symbols as HTML (for the guide, table, sliders) ----------------------

// A symbol's render spec: { pre, base, sub, sup, bar }. sub 'cue' means the
// focus cue; other subscripts are written as given (a word such as "others"
// is set upright). bar draws a line over the base letter, as in V̄ for
// inhibitory strength. Symbols with no render (a bracketed group such as the
// prediction error) give `display(opts)` text for the guide instead.
export function symbolHTML(spec, key, cue, extra = '') {
  const def = spec.symbols[key];
  const r = def.render;
  if (!r) return `<span ${attrs(key, def, null)}>${extra}</span>`;
  const sub = subText(r, cue);
  const base = r.bar ? `<i class="overbar">${r.base}</i>` : `<i>${r.base}</i>`;
  return `<span ${attrs(key, def, cue)}>${r.pre ?? ''}${base}${sub ? `<sub>${sub}</sub>` : ''}${r.sup ? `<sup>${r.sup}</sup>` : ''}${extra}</span>`;
}

// Plain text for a symbol, for places where markup is not allowed.
export function symbolText(spec, key, cue, opts = {}) {
  const def = spec.symbols[key];
  const r = def.render;
  if (!r) return def.display ? def.display(opts) : def.name;
  const sub = subText(r, cue);
  return `${r.pre ?? ''}${r.base}${r.bar ? '\u0305' : ''}${sub ? `_${sub}` : ''}`;
}

// ---- MathML ---------------------------------------------------------------

function mi(t) {
  return /^[A-Za-zα-ω]$/.test(t) ? `<mi>${t}</mi>` : `<mi mathvariant="normal">${t}</mi>`;
}

function scriptMathML(t) {
  if (/^[A-Za-z]$/.test(t)) return `<mi>${t}</mi>`;
  if (/^[0-9.]+$/.test(t)) return `<mn>${t}</mn>`;
  return `<mtext>${esc(t)}</mtext>`;
}

export function symbolMathML(spec, key, cue) {
  const def = spec.symbols[key];
  const r = def.render;
  // A symbol with no render, such as O|P, can give its own MathML, or is
  // written as its display text.
  if (!r) return `<mrow ${attrs(key, def, null)}>${def.mathml ?? `<mtext>${esc(def.display ? def.display({}) : def.name)}</mtext>`}</mrow>`;
  const pre = r.pre ? mi(r.pre) : '';
  const sub = subText(r, cue);
  const base = r.bar ? `<mover accent="true">${mi(r.base)}<mo stretchy="false">¯</mo></mover>` : mi(r.base);
  let core = base;
  if (sub && r.sup) core = `<msubsup>${base}${scriptMathML(sub)}${scriptMathML(r.sup)}</msubsup>`;
  else if (sub) core = `<msub>${base}${scriptMathML(sub)}</msub>`;
  else if (r.sup) core = `<msup>${base}${scriptMathML(r.sup)}</msup>`;
  return `<mrow ${attrs(key, def, cue)}>${pre}${core}</mrow>`;
}

function numberMathML(spec, key, cue, value, wrapNegative) {
  const def = spec.symbols[key];
  const text = signed(def.exact ? fmtExact(value) : fmt(value));
  const n = `<mn>${text}</mn>`;
  const body = wrapNegative && value < 0 ? `<mo>(</mo>${n}<mo>)</mo>` : n;
  return `<mrow ${attrs(key, def, cue)}>${body}</mrow>`;
}

// mode: 'symbols' or 'numbers'
function nodeMathML(node, ctx, mode, first = true) {
  const { spec, cue, rec } = ctx;
  if (!node.op) {
    if (mode === 'symbols') return symbolMathML(spec, node.sym, node.cue ?? cue);
    const c = node.cue ?? cue;
    return numberMathML(spec, node.sym, c, spec.symbols[node.sym].value(rec, c), !first);
  }
  const join = (args, op) =>
    args.map((a, i) => (i ? `<mo>${op}</mo>` : '') + nodeMathML(a, ctx, mode, i === 0)).join('');
  switch (node.op) {
    case 'mul':
      return mode === 'symbols'
        ? node.args.map((a) => nodeMathML(a, ctx, mode, true)).join('<mo>&#x2062;</mo>')
        : join(node.args, '×');
    case 'sub':
      return join(node.args, '−');
    case 'add':
      return join(node.args, '+');
    case 'sumPresent':
      return join(
        ctx.present.map((c) => ({ sym: node.of, cue: c })),
        '+',
      );
    case 'sumEach':
      return join(((node.over && ctx.rec && node.over(ctx.rec)) || ctx.present).map((c) => node.each(c)), '+');
    case 'sumOthers': {
      const others = ctx.present.filter((c) => c !== ctx.cue);
      if (!others.length) return mode === 'symbols' ? `<mn>0</mn><mtext class="case-cond"> (no other cues)</mtext>` : '<mn>0</mn>';
      return join(
        others.map((c) => ({ sym: node.of, cue: c })),
        '+',
      );
    }
    case 'sumMoments':
    case 'sumOver': {
      // A sum over an index: moments t (sumMoments), or features j or traces
      // i (sumOver with index). Symbols: Σ over the index, then the term.
      // Numbers: the total the model added up, read from the record.
      if (mode === 'numbers') {
        const v = spec.symbols[node.of].value(ctx.rec, cue);
        return numberMathML(spec, node.of, cue, v, !first);
      }
      const def = spec.symbols[node.of];
      const index = node.op === 'sumMoments' ? 't' : node.index;
      return `<mrow class="group role-${def.role}" data-sym="${node.of}"${cueSub(def.render) || node.op === 'sumMoments' ? ` data-cue="${cue}"` : ''}><munder><mo>Σ</mo><mi>${index}</mi></munder>${nodeMathML(node.arg, ctx, mode, true)}</mrow>`;
    }
    case 'frac':
      return `<mfrac><mrow>${nodeMathML(node.num, ctx, mode, true)}</mrow><mrow>${nodeMathML(node.den, ctx, mode, true)}</mrow></mfrac>`;
    case 'sqrt':
      return `<msqrt>${nodeMathML(node.arg, ctx, mode, true)}</msqrt>`;
    case 'pow': {
      const base = nodeMathML(node.arg, ctx, mode, true);
      const wrapped = mode === 'numbers' && evaluate(node.arg, ctx) < 0 ? `<mrow><mo>(</mo>${base}<mo>)</mo></mrow>` : `<mrow>${base}</mrow>`;
      return `<msup>${wrapped}<mrow>${nodeMathML(node.exp, ctx, mode, true)}</mrow></msup>`;
    }
    case 'neg':
      return `<mo>−</mo>${nodeMathML(node.arg, ctx, mode, true)}`;
    case 'clamp':
      return `${nodeMathML(node.arg, ctx, mode, true)}${mode === 'symbols' ? `<mspace width="0.8em"></mspace><mtext class="case-cond">${esc(node.note)}</mtext>` : ''}`;
    case 'abs':
      return `<mrow${node.group ? ` data-sym="${node.group}" class="group role-${spec.symbols[node.group].role}"` : ''}><mo>|</mo>${nodeMathML(node.arg, ctx, mode, true)}<mo>|</mo></mrow>`;
    case 'cases': {
      if (mode === 'numbers') return nodeMathML(activeCase(node, ctx).rhs, ctx, mode, true);
      const rows = node.cases
        .map((c) => `<mtr><mtd columnalign="left">${nodeMathML(c.rhs, ctx, mode, true)}</mtd><mtd columnalign="left"><mtext class="case-cond">${esc(c.cond)}</mtext></mtd></mtr>`)
        .join('');
      return `<mrow><mo stretchy="true" fence="true">{</mo><mtable columnalign="left" columnspacing="1em">${rows}</mtable></mrow>`;
    }
    case 'const':
      return `<mn>${signed(fmtExact(node.value))}</mn>`;
    case 'paren': {
      const inner = `<mrow${node.group ? ` data-sym="${node.group}" class="group role-${spec.symbols[node.group].role}"` : ''}><mo>(</mo>${nodeMathML(node.arg, ctx, mode, true)}<mo>)</mo></mrow>`;
      if (!node.label) return inner;
      const under =
        mode === 'numbers'
          ? `${node.label} = ${signed(fmt(evaluate(node.arg, ctx)))}`
          : node.label;
      return `<munder><mrow class="bracketed">${inner}</mrow><mtext class="under-label">${esc(under)}</mtext></munder>`;
    }
    default:
      throw new Error(`Unknown node ${node.op}`);
  }
}

function relMathML(rel) {
  return `<mo class="rel">${rel === '←' ? '←' : '='}</mo>`;
}

export function equationSymbols(eq, ctx) {
  const lhs = nodeMathML(eq.lhs, ctx, 'symbols');
  return `<math>${lhs}${relMathML(eq.rel)}${nodeMathML(eq.rhs, ctx, 'symbols')}</math>`;
}

// The case of a cases node that applies on this trial.
export function activeCase(node, ctx) {
  return node.cases.find((c) => !c.when || c.when(ctx.rec, ctx.cue)) ?? node.cases[node.cases.length - 1];
}

export function equationNumbers(eq, ctx) {
  const lhs = nodeMathML(eq.lhs, ctx, 'symbols');
  const result = evaluate(eq.rhs, ctx);
  const def = ctx.spec.symbols[eq.lhs.sym];
  const note = eq.rhs.op === 'cases' ? `<div class="case-note small muted">This trial uses the line "${esc(activeCase(eq.rhs, ctx).cond)}".</div>` : '';
  return (
    `<math>${lhs}${relMathML(eq.rel)}${nodeMathML(eq.rhs, ctx, 'numbers')}` +
    `<mo>=</mo><mrow ${attrs(eq.lhs.sym, def, ctx.cue)}><mn class="result">${signed(fmt(result))}</mn></mrow></math>${note}`
  );
}

// ---- Words ----------------------------------------------------------------

export function listCues(cues) {
  if (cues.length <= 1) return cues.join('');
  return `${cues.slice(0, -1).join(', ')} and ${cues[cues.length - 1]}`;
}

export function equationWords(eq, ctx) {
  const fill = (t) => esc(t).replaceAll('$', ctx.cue).replaceAll('%present%', listCues(ctx.present));
  const parts = eq.words.split(/(\{[^}]+\})/);
  return parts
    .map((p) => {
      const m = /^\{(\w+)\|([^}]*)\}$/.exec(p);
      if (!m) return fill(p);
      const def = ctx.spec.symbols[m[1]];
      return `<span ${attrs(m[1], def, ctx.cue)}>${fill(m[2])}</span>`;
    })
    .join('');
}

// ---- Evaluation -----------------------------------------------------------

export function evaluate(node, ctx) {
  if (!node.op) return ctx.spec.symbols[node.sym].value(ctx.rec, node.cue ?? ctx.cue);
  const vals = () => node.args.map((a) => evaluate(a, ctx));
  switch (node.op) {
    case 'mul':
      return vals().reduce((a, b) => a * b, 1);
    case 'sub': {
      const [a, ...rest] = vals();
      return rest.reduce((x, y) => x - y, a);
    }
    case 'add':
      return vals().reduce((a, b) => a + b, 0);
    case 'sumPresent':
      return ctx.present.reduce((s, c) => s + ctx.spec.symbols[node.of].value(ctx.rec, c), 0);
    case 'paren':
      return evaluate(node.arg, ctx);
    case 'abs':
      return Math.abs(evaluate(node.arg, ctx));
    case 'sumEach':
      return ((node.over && ctx.rec && node.over(ctx.rec)) || ctx.present).reduce((s, c) => s + evaluate(node.each(c), ctx), 0);
    case 'sumMoments':
    case 'sumOver':
      return ctx.spec.symbols[node.of].value(ctx.rec, ctx.cue);
    case 'frac':
      return evaluate(node.num, ctx) / evaluate(node.den, ctx);
    case 'sqrt':
      return Math.sqrt(evaluate(node.arg, ctx));
    case 'pow': {
      // The sign of the base is kept, as MINERVA's activation does.
      const b = evaluate(node.arg, ctx);
      return Math.sign(b) * Math.abs(b) ** evaluate(node.exp, ctx);
    }
    case 'sumOthers':
      return ctx.present.filter((c) => c !== ctx.cue).reduce((s, c) => s + ctx.spec.symbols[node.of].value(ctx.rec, c), 0);
    case 'neg':
      return -evaluate(node.arg, ctx);
    case 'clamp':
      return Math.min(evaluate(node.hi, ctx), Math.max(evaluate(node.lo, ctx), evaluate(node.arg, ctx)));
    case 'cases':
      return evaluate(activeCase(node, ctx).rhs, ctx);
    case 'const':
      return node.value;
    default:
      throw new Error(`Unknown node ${node.op}`);
  }
}

// Every symbol used in a list of equations, in first-appearance order.
export function symbolsUsed(eqs) {
  const out = [];
  const visit = (n) => {
    for (const key of [n.sym, n.of, n.group]) if (key && !out.includes(key)) out.push(key);
    if (n.op === 'clamp') [n.lo, n.hi].forEach(visit);
    if (n.op === 'frac') [n.num, n.den].forEach(visit);
    if (n.op === 'pow') visit(n.exp);
    if (n.op === 'sumEach') visit(n.each('A'));
    if (n.arg) visit(n.arg);
    if (n.args) n.args.forEach(visit);
    if (n.cases) n.cases.forEach((c) => visit(c.rhs));
  };
  for (const eq of eqs) {
    visit(eq.lhs);
    visit(eq.rhs);
  }
  return out;
}
