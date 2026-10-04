// Renders an equation spec as MathML, words, and numbers, and evaluates it.
// Every function returns a markup string, so it runs in Node for tests.

import { fmt, fmtExact, signed } from '../core/format.js';

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}

function attrs(key, def, cue) {
  const c = def.render?.sub === 'cue' || cue ? cue : null;
  return `class="sym role-${def.role}" data-sym="${key}"${c ? ` data-cue="${c}"` : ''}`;
}

// ---- Symbols as HTML (for the guide, table, sliders) ----------------------

export function symbolHTML(spec, key, cue, extra = '') {
  const def = spec.symbols[key];
  const r = def.render;
  if (!r) return `<span ${attrs(key, def, null)}>${extra}</span>`;
  const sub = r.sub === 'cue' ? cue : r.sub;
  return `<span ${attrs(key, def, cue)}>${r.pre ?? ''}<i>${r.base}</i>${sub ? `<sub>${sub}</sub>` : ''}${extra}</span>`;
}

// ---- MathML ---------------------------------------------------------------

function mi(t) {
  return /^[A-Za-zα-ω]$/.test(t) ? `<mi>${t}</mi>` : `<mi mathvariant="normal">${t}</mi>`;
}

export function symbolMathML(spec, key, cue) {
  const def = spec.symbols[key];
  const r = def.render;
  const pre = r.pre ? mi(r.pre) : '';
  const sub = r.sub === 'cue' ? cue : r.sub;
  const core = sub ? `<msub>${mi(r.base)}<mi>${sub}</mi></msub>` : mi(r.base);
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

export function equationNumbers(eq, ctx) {
  const lhs = nodeMathML(eq.lhs, ctx, 'symbols');
  const result = evaluate(eq.rhs, ctx);
  const def = ctx.spec.symbols[eq.lhs.sym];
  return (
    `<math>${lhs}${relMathML(eq.rel)}${nodeMathML(eq.rhs, ctx, 'numbers')}` +
    `<mo>=</mo><mrow ${attrs(eq.lhs.sym, def, ctx.cue)}><mn class="result">${signed(fmt(result))}</mn></mrow></math>`
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
    default:
      throw new Error(`Unknown node ${node.op}`);
  }
}

// Every symbol used in a list of equations, in first-appearance order.
export function symbolsUsed(eqs) {
  const out = [];
  const visit = (n) => {
    for (const key of [n.sym, n.of, n.group]) if (key && !out.includes(key)) out.push(key);
    if (n.arg) visit(n.arg);
    if (n.args) n.args.forEach(visit);
  };
  for (const eq of eqs) {
    visit(eq.lhs);
    visit(eq.rhs);
  }
  return out;
}
