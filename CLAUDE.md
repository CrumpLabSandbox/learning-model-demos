# Learning Model Demos

Interactive browser demos of associative learning models for teaching. The plan is in `plan.md`; read it before adding features.

## Ground rules

- Static site. Plain HTML, CSS, and JavaScript ES modules. No build step, no runtime dependencies, no npm packages.
- Every model is implemented from its original paper, with the citation at the top of the model file. Any choice the paper leaves open is stated in a comment and on the page.
- A model is not used in class until tests reproduce known analytic results or published simulations.
- Model files contain only the math. They never touch the DOM, so Node tests import exactly the code the browser runs.

## Commands

```sh
npm test                     # node --test, runs tests/*.test.js
python3 -m http.server 8000  # then open http://localhost:8000
```

ES modules do not load from `file://`, so always open the site through a local server.

## Layout

```
index.html                    landing page
primer.html                   how to read the equations: widgets, checks, notation map
models/<model>.html           one page per model; each just calls mountModelPage()
js/core/                      no DOM: design parser, runner, rng, phenomenon checks, sketch comparison, URL state, formatting
js/models/<model>.js          one module per model, common interface (see js/core/runner.js)
js/ui/                        DOM: page.js wires everything; chart, equation, arithmetic, table, highlight, primer
                              mathml.js has string helpers for hand-written MathML
content/equations/<model>.js  equation spec per model: symbols, equations, words, table columns, build stages
content/phenomena/index.js    phenomenon presets: design, empirical result, citation, check, predict prompt, per-model notes
content/primer/               primer content: worked fixed points, check questions, notation map
tests/                        node:test files
css/site.css                  one stylesheet; colour tokens on :root with dark-mode overrides
```

## Adding a model

1. `js/models/<id>.js`: export `id`, `name`, `year`, `citation`, `options`, `parameters(cues, opts)`, and `init(params, cues, opts, rng)` returning `{ trial, predict, state }`. Wrap the per-trial math in `// #region update` and `// #endregion`; the page shows that region as the code reading.
2. `content/equations/<id>.js`: export `symbols`, `roles`, `equations(opts)`, `arithmetic(opts)`, `tableColumns(opts, cues)`, `absentNote(cue, rec)`, `codeNames`, `stages`, and `intro`. Each symbol's `value(rec, cue)` must read from the trial record, never recompute.
3. Add a `models['<id>']` entry with `why` and `tryThis` to each phenomenon in `content/phenomena/index.js`.
4. `models/<id>.html`: copy `models/rescorla-wagner.html` and change the imports.
5. Tests: analytic results, published results, and the check that every displayed equation evaluates to the number the model used (see `tests/rescorla-wagner.test.js`).

## Conventions

- Symbol roles: `experimenter` (set by the design), `modeller` (a parameter), `computed` (calculated by the model). Each has its own colour token.
- Cue colours follow the validated categorical palette in fixed order by the cue's position in the design. Never colour text with a cue colour; put a swatch beside it.
- Anything that shows a symbol, value, or line for a symbol carries `data-sym` and, where it belongs to a cue, `data-cue`. `js/ui/highlight.js` links them on hover.
- Phenomenon badges are computed by running the design, never typed by hand.
- Each phenomenon has a `predict` prompt naming lines that the chart plots. While a student sketches, anything that would give the answer away carries the `spoiler` class and is hidden.
- Each symbol in an equation spec has a `primer` anchor pointing at the primer section that explains it.
- Computed numbers show three decimals; parameters show the value as set.
- Writing on the page is plain: short sentences, no jargon without a definition.
