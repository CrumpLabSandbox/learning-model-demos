// Writes the phenomenon-by-model table into index.html, between the marker
// comments. Run it after changing a model, a default, or a phenomenon:
//   node tools/matrix.mjs
// tests/matrix.test.js fails until the table is current.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { phenomena } from '../content/phenomena/index.js';
import { MODELS } from '../js/core/registry.js';
import { computeMatrix, matrixHTML, MATRIX_START, MATRIX_END } from '../js/core/matrix.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'index.html');
const html = readFileSync(file, 'utf8');
const a = html.indexOf(MATRIX_START);
const b = html.indexOf(MATRIX_END);
if (a < 0 || b < a) throw new Error('index.html has no phenomenon table markers.');
const table = matrixHTML(computeMatrix(phenomena, MODELS), MODELS);
writeFileSync(file, html.slice(0, a + MATRIX_START.length) + '\n' + table + '\n' + html.slice(b));
console.log('Wrote the phenomenon table into index.html.');
