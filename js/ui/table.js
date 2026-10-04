// The trial table: the hand-calculation table from a textbook, filled in by
// the model. One row per trial, plus the starting state.

import { fmt, fmtExact, signed } from '../core/format.js';
import { esc, symbolHTML } from './equation.js';

function cellValue(col, rec, spec) {
  const v = col.value(rec);
  if (v === undefined || v === null) return null;
  const def = spec.symbols[col.sym];
  return signed(col.exact || def.exact ? fmtExact(v) : fmt(v));
}

function headHTML(col, spec) {
  if (col.head) {
    const role = spec.symbols[col.sym].role;
    return `<span class="sym role-${role}" data-sym="${col.sym}"${col.cue ? ` data-cue="${col.cue}"` : ''}>${col.head}</span>`;
  }
  return symbolHTML(spec, col.sym, col.cue) + (col.suffix ? `<span class="muted">${esc(col.suffix)}</span>` : '');
}

function plainHead(col, spec) {
  const def = spec.symbols[col.sym];
  return `${col.sym}${col.cue ? `_${col.cue}` : ''}${col.suffix ? col.suffix.replace(/\s+/g, '_') : ''}` || def.name;
}

export function createTable(container, { onSelect }) {
  let rows = [];
  let current = null;
  container.addEventListener('click', (ev) => {
    const tr = ev.target.closest('tr[data-t]');
    if (tr) onSelect(Number(tr.dataset.t));
  });

  function build({ spec, run, opts }) {
    const cols = spec.tableColumns(opts, run.cues);
    const head =
      `<tr><th class="left">#</th><th class="left">Phase</th><th class="left">Trial</th>` +
      cols.map((c) => `<th data-sym="${c.sym}"${c.cue ? ` data-cue="${c.cue}"` : ''}>${headHTML(c, spec)}</th>`).join('') +
      '</tr>';
    const startCells = cols
      .map((c) => {
        const v = c.sym === 'V' && c.cue ? fmt(run.initialState.V?.[c.cue] ?? 0) : '';
        return `<td data-sym="${c.sym}"${c.cue ? ` data-cue="${c.cue}"` : ''}>${v}</td>`;
      })
      .join('');
    const body = [`<tr data-t="0"><td class="left">0</td><td class="left muted">start</td><td class="left"></td>${startCells}</tr>`];
    let lastPhase = -1;
    for (const rec of run.trials) {
      const cells = cols
        .map((c) => {
          const absent = c.cue && !rec.present.includes(c.cue) && c.sym !== 'V';
          const v = absent ? null : cellValue(c, rec, spec);
          return `<td data-sym="${c.sym}"${c.cue ? ` data-cue="${c.cue}"` : ''}${absent ? ' class="absent" title="Not on this trial"' : ''}>${v ?? '·'}</td>`;
        })
        .join('');
      const cls = rec.phaseIndex !== lastPhase && rec.index > 1 ? ' class="phase-start"' : '';
      lastPhase = rec.phaseIndex;
      body.push(
        `<tr data-t="${rec.index}"${cls}><td class="left">${rec.index}</td><td class="left">${esc(rec.phaseName)}</td><td class="left">${esc(rec.label)}</td>${cells}</tr>`,
      );
    }
    container.innerHTML = `<table class="trials"><thead>${head}</thead><tbody>${body.join('')}</tbody></table>`;
    rows = [...container.querySelectorAll('tbody tr')];
    current = null;
  }

  function select(t, { scroll = true } = {}) {
    if (current) current.classList.remove('selected');
    current = rows[t] ?? null;
    if (current) {
      current.classList.add('selected');
      if (scroll) {
        const top = current.offsetTop - container.clientHeight / 2;
        container.scrollTo({ top: Math.max(0, top) });
      }
    }
  }

  return { build, select };
}

export function tableCSV({ spec, run, opts }) {
  const cols = spec.tableColumns(opts, run.cues);
  const lines = [['trial', 'phase', 'type', ...cols.map((c) => plainHead(c, spec))].join(',')];
  for (const rec of run.trials) {
    const vals = cols.map((c) => {
      const absent = c.cue && !rec.present.includes(c.cue) && c.sym !== 'V';
      const v = absent ? '' : c.value(rec);
      return v === '' || v === undefined || v === null ? '' : String(Number(v.toFixed(6)));
    });
    lines.push([rec.index, `"${rec.phaseName.replace(/"/g, '""')}"`, rec.label, ...vals].join(','));
  }
  return lines.join('\n') + '\n';
}
