# Learning Model Demos

Interactive browser demos of associative learning models for teaching. The plan is in `plan.md`; read it before adding features.

## Ground rules

- Static site. Plain HTML, CSS, and JavaScript ES modules, with no runtime dependencies and no npm packages. The source folders run as they are on any static server.
- The deployed site is built by `tools/site_tool.py` (Python standard library only). The build copies the site files, stamps every script and stylesheet address with a version so browsers never mix cached old files with new ones, and fails on any broken import or link. Never hand-edit `_site/`.
- Every model is implemented from its original paper, with the citation at the top of the model file. Any choice the paper leaves open is stated in a comment and on the page.
- A model is not used in class until tests reproduce known analytic results or published simulations.
- Model files contain only the math. They never touch the DOM, so Node tests import exactly the code the browser runs.

## Commands

```sh
npm test                               # unit tests: node --test, runs tests/*.test.js
python3 tools/site_tool.py build       # build the deployable site into _site/
python3 tools/site_tool.py serve       # build and serve at http://localhost:8000/learning-model-demos/
python3 tools/site_tool.py serve --source   # serve the source folders instead, no build
python3 tools/site_tool.py check       # build, serve, and run the browser checks (tools/check_site.py)
node tools/matrix.mjs                  # rewrite the phenomenon table on the landing page after changing a model or phenomenon
```

The browser checks need `pip install -r requirements-dev.txt` (Playwright). They load every page under the same `/learning-model-demos/` prefix GitHub Pages uses, fail on any console error, failed request, unstamped asset, or sideways scrolling on a phone, and exercise the decks, model page, predict-first, primer, warm-up, and glossary. Screenshots go to `_check/<browser>/` and a summary to `_check/report.md`. Run the checks and look at the screenshots before pushing any change to pages, styles, or scripts. Add a check to `tools/check_site.py` for every new interactive feature.

ES modules do not load from `file://`, so always open the site through a server.

## Publishing

`.github/workflows/pages.yml` builds, checks, and deploys `_site/` to GitHub Pages on every push to `main`, and deploys nothing if a check fails. `.github/workflows/test.yml` runs the unit tests and the browser checks in Chromium, Firefox, and WebKit on every push, and uploads the screenshots and report as artifacts.

Every page that runs a module loads `js/load-guard.js` first, and its mount function sets `data-ready` on `<html>` when it finishes. If it never does, the guard shows a reload message instead of a broken page.

## Layout

```
index.html                    landing page: entry points, every unit, the phenomenon table, tutorials, and the build version
compare.html                  one design through several models, as small multiples (js/ui/compare.js)
tutorials/<name>.html         guided tutorials across models (js/ui/tutorial.js; checks in content/tutorials/checks.js)
warm-up.html                  maths warm-up for students who need basic maths support
primer.html                   how to read the equations: widgets, checks, notation map
glossary.html                 plain-language glossary, rendered from content/glossary.js
decks/<unit>.html             overview slides for each unit (js/ui/deck.js)
models/<model>.html           one page per model; each just calls mountModelPage()
js/core/                      no DOM: design parser, runner, rng, phenomenon checks, sketch comparison, URL state, formatting,
                              registry (every model in course order), matrix (the phenomenon-by-model table)
js/models/<model>.js          one module per model, common interface (see js/core/runner.js)
js/ui/                        DOM: page.js wires everything; chart, equation, arithmetic, table, highlight, primer,
                              warmup, glossary, deck, minichart (model-drawn charts for slides),
                              timeline (inside a trial, for models that run moment by moment),
                              memory (the trace heatmap, for instance models),
                              widget-kit (sliders, number lines, check questions)
                              mathml.js has string helpers for hand-written MathML
content/equations/<model>.js  equation spec per model: symbols, equations, words, table columns, build stages
content/phenomena/index.js    phenomenon presets: design, empirical result, citation, check, predict prompt, per-model notes
content/primer/               primer content: worked fixed points, check questions, notation map
content/warmup/               warm-up check questions (each with a hint)
content/glossary.js           every technical term: plain definition, example, links
tests/                        node:test files
tools/site_tool.py            build, serve under the GitHub Pages prefix, and check (Python)
tools/check_site.py           browser checks with Playwright, run by site_tool.py check
tools/matrix.mjs              writes the phenomenon table into index.html
css/site.css                  one stylesheet; colour tokens on :root with dark-mode overrides
```

## Adding a model

1. `js/models/<id>.js`: export `id`, `name`, `year`, `citation`, `salienceKey(cue)`, `options`, `parameters(cues, opts, { context })`, and `init(params, cues, opts, rng, { context })` returning `{ trial, predict, state }`. `trial()` gets `{ cues, reinforced, magnitude, timing }`; trial-level models ignore `timing`. `state()` returns per-cue maps (such as `{ V, alpha }`); the runner turns each into `run.stateSeries`. A parameter with `advanced: true` is hidden in Essentials. Wrap the per-trial math in `// #region update` and `// #endregion`; the page shows that region as the code reading. Export `status = 'preview'` until tests reproduce the published simulations; the page then shows a notice. A model that runs moment by moment exports `realTime = true` and keeps `moments` on each trial record (see `js/models/sop.js`); the page then adds the Inside the trial view. If its V is not what the animal does, export `responseKey` naming a per-cue `state()` series; checks that compare responses (`h.response`) read it. A model that simulates many learners gives the learner a `summary(cues)` returning `{ mean, sd }`; the chart then draws the spread. An instance model exports `memory = true` and keeps learner 1's traces on each trial record (see `js/models/minerva-al.js`); the page then adds the Memory view. `predictionTitle` renames the chart's y axis.
2. `content/equations/<id>.js`: export `symbols`, `roles`, `equations(opts)`, `arithmetic(opts)`, `tableColumns(opts, cues)`, `absentNote(cue, rec)`, `codeNames`, `stages`, and `intro`, and optionally `charts` (extra charts of `stateSeries`, such as attention). Each symbol's `value(rec, cue)` must read from the trial record, never recompute, and has a `primer` anchor and either a `render` or a `display(opts)` text. Equation nodes: symbols, `mul`, `add`, `sub`, `neg`, `paren`, `abs`, `cases`, `clamp`, `const`, `sumPresent`, `sumEach`, `sumOthers`, `sumMoments`, `sumOver` (Σ over a named index, value from the record), `frac`, `sqrt`, `pow` (see `js/ui/equation.js`). An equation with `when(rec)` is shown only on trials where it applies. A symbol with no `render` can give `mathml`. A spec whose equations are not about one cue sets `cueless` (with `cuelessNote`). `$` in a title or words is the focus cue.
3. Add a `models['<id>']` entry with `why` and `tryThis` to each phenomenon in `content/phenomena/index.js`, written from what the model actually does with its defaults, and add the model's expected results to `tests/phenomena.test.js`.
4. `models/<id>.html`: copy an existing model page and change the imports, `defaultPreset`, and `overviewUrl`. Add the page to every page's navigation and to the landing page's units table. Add the model to `js/core/registry.js` and run `node tools/matrix.mjs`; the comparison page and the table then include it.
5. `decks/<id>.html`: an overview deck. Add glossary entries for new terms and primer sections for new notation.
6. Tests: hand-worked single trials, analytic results, published results, and the check that every displayed equation evaluates to the number the model used (see `tests/mackintosh.test.js`). Add the page to the attention or model checks in `tools/check_site.py`.

## Scaffolding for every unit

The audience runs from students new to the area who find maths stressful to students comfortable with equations. Every unit offers more than one way in.

- Every unit has an overview deck in `decks/` that says what it is about and what to expect, in plain words, before any equations. Link it from the unit's page and from the landing page's units table.
- Every technical term used anywhere goes in `content/glossary.js`. Link the first use on a page to `glossary.html#<id>`.
- On model pages, mark anything beyond the essentials with the class `advanced`; Essentials view hides it.
- Check questions have exactly one right answer, an explanation for every option, and, on the warm-up, a hint. Wrong answers are never scolded.
- Every page uses the same navigation: Start here, Maths warm-up, Reading the equations, the model pages (Rescorla-Wagner, Mackintosh, Pearce-Hall, SOP, MINERVA-AL), Compare, Tutorials, Glossary. `tests/content.test.js` checks it.
- A tutorial is prose with live pieces: `data-mini` charts (any model, with `data-options` and `data-params`), `data-widget` primer widgets, `data-check` questions, and `data-verdicts` strips that run one phenomenon through every model. List each tutorial in the landing page's tutorial section.
- `tests/content.test.js` fails on any broken link between pages, sections, or glossary entries.

## Conventions

- Symbol roles: `experimenter` (set by the design), `modeller` (a parameter), `computed` (calculated by the model). Each has its own colour token.
- Cue colours follow the validated categorical palette in fixed order by the cue's position in the design. Never colour text with a cue colour; put a swatch beside it.
- Anything that shows a symbol, value, or line for a symbol carries `data-sym` and, where it belongs to a cue, `data-cue`. `js/ui/highlight.js` links them on hover.
- Phenomenon badges are computed by running the design, never typed by hand. A phenomenon sets salience with `salience: { A: 0.5 }`, never with a model's parameter name.
- A design can name its context cue with `Context: Z`; it is added to every trial.
- Timing is in moments: `20 A+ [CS 1-10, US 9-10, ITI 100]` for one trial type, or a `Timing:` line for all. `+` on its own is the US alone. Defaults are `DEFAULT_TIMING` in `js/core/design.js`.
- Each phenomenon has a `predict` prompt naming lines that the chart plots. While a student sketches, anything that would give the answer away carries the `spoiler` class and is hidden.
- Each symbol in an equation spec has a `primer` anchor pointing at the primer section that explains it.
- Computed numbers show three decimals; parameters show the value as set.
- Writing on the page is plain: short sentences, no jargon without a definition.
