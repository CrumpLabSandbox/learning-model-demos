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
index.html                    landing page: three entry points by background, and every unit
warm-up.html                  maths warm-up for students who need basic maths support
primer.html                   how to read the equations: widgets, checks, notation map
glossary.html                 plain-language glossary, rendered from content/glossary.js
decks/<unit>.html             overview slides for each unit (js/ui/deck.js)
models/<model>.html           one page per model; each just calls mountModelPage()
js/core/                      no DOM: design parser, runner, rng, phenomenon checks, sketch comparison, URL state, formatting
js/models/<model>.js          one module per model, common interface (see js/core/runner.js)
js/ui/                        DOM: page.js wires everything; chart, equation, arithmetic, table, highlight, primer,
                              warmup, glossary, deck, minichart (model-drawn charts for slides),
                              widget-kit (sliders, number lines, check questions)
                              mathml.js has string helpers for hand-written MathML
content/equations/<model>.js  equation spec per model: symbols, equations, words, table columns, build stages
content/phenomena/index.js    phenomenon presets: design, empirical result, citation, check, predict prompt, per-model notes
content/primer/               primer content: worked fixed points, check questions, notation map
content/warmup/               warm-up check questions (each with a hint)
content/glossary.js           every technical term: plain definition, example, links
tests/                        node:test files
css/site.css                  one stylesheet; colour tokens on :root with dark-mode overrides
```

## Adding a model

1. `js/models/<id>.js`: export `id`, `name`, `year`, `citation`, `options`, `parameters(cues, opts)`, and `init(params, cues, opts, rng)` returning `{ trial, predict, state }`. Wrap the per-trial math in `// #region update` and `// #endregion`; the page shows that region as the code reading.
2. `content/equations/<id>.js`: export `symbols`, `roles`, `equations(opts)`, `arithmetic(opts)`, `tableColumns(opts, cues)`, `absentNote(cue, rec)`, `codeNames`, `stages`, and `intro`. Each symbol's `value(rec, cue)` must read from the trial record, never recompute.
3. Add a `models['<id>']` entry with `why` and `tryThis` to each phenomenon in `content/phenomena/index.js`.
4. `models/<id>.html`: copy `models/rescorla-wagner.html` and change the imports.
5. Tests: analytic results, published results, and the check that every displayed equation evaluates to the number the model used (see `tests/rescorla-wagner.test.js`).

## Scaffolding for every unit

The audience runs from students new to the area who find maths stressful to students comfortable with equations. Every unit offers more than one way in.

- Every unit has an overview deck in `decks/` that says what it is about and what to expect, in plain words, before any equations. Link it from the unit's page and from the landing page's units table.
- Every technical term used anywhere goes in `content/glossary.js`. Link the first use on a page to `glossary.html#<id>`.
- On model pages, mark anything beyond the essentials with the class `advanced`; Essentials view hides it.
- Check questions have exactly one right answer, an explanation for every option, and, on the warm-up, a hint. Wrong answers are never scolded.
- Every page uses the same navigation: Start here, Maths warm-up, Reading the equations, the model pages, Glossary.
- `tests/content.test.js` fails on any broken link between pages, sections, or glossary entries.

## Conventions

- Symbol roles: `experimenter` (set by the design), `modeller` (a parameter), `computed` (calculated by the model). Each has its own colour token.
- Cue colours follow the validated categorical palette in fixed order by the cue's position in the design. Never colour text with a cue colour; put a swatch beside it.
- Anything that shows a symbol, value, or line for a symbol carries `data-sym` and, where it belongs to a cue, `data-cue`. `js/ui/highlight.js` links them on hover.
- Phenomenon badges are computed by running the design, never typed by hand.
- Each phenomenon has a `predict` prompt naming lines that the chart plots. While a student sketches, anything that would give the answer away carries the `spoiler` class and is hidden.
- Each symbol in an equation spec has a `primer` anchor pointing at the primer section that explains it.
- Computed numbers show three decimals; parameters show the value as set.
- Writing on the page is plain: short sentences, no jargon without a definition.
