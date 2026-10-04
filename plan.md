# Plan: Learning Model Demos

## Goal

A static website where students run classic associative learning models and see, trial by trial, how each equation produces the model's behaviour. The sequence starts with Rescorla-Wagner, adds the attention models of Mackintosh and Pearce-Hall, adds Wagner's real-time SOP model, and ends with MINERVA-AL. Any training design can be run through several models side by side.

The site is built for three things students find hard:

1. **Reading a formula.** What Δ, Σ, subscripts, Greek letters, and "trial n" mean, and which symbols are set by the experimenter, set by the modeller, or computed by the model.
2. **Connecting the formula to the behaviour.** Seeing that a line on the chart is the output of one line of arithmetic, and which term in that arithmetic is responsible for the shape.
3. **Seeing the implications.** Working out what a formula predicts before running it, finding where it is right and wrong, and understanding what changes when a term is added, removed, or altered.

Done means a student can open a page, pick a phenomenon such as blocking, run it through each model, point to the term in each equation that does or does not produce it, and explain what would have to change for the prediction to change.

## What changed in this revision

- A static website is the first deliverable. Plain HTML, CSS, and JavaScript modules, no build step, no server, deployed on GitHub Pages from this repo. Coolify, R, and Quarto come later.
- Wagner's SOP model is added as the fourth model, before MINERVA-AL. It is the first real-time model in the sequence, so the design format and model interface now carry time within a trial.
- Formula literacy is the organizing principle. Every model page has the same equation panel, arithmetic view, trial table, step controls, and "build the equation" mode, specified below. These are built once on Rescorla-Wagner and reused.
- The common model interface returns a record of every equation evaluation on every trial, so the equation panel and trial table are driven by data, not hand-coded per model.
- Tests run with Node's built-in test runner on the same model files the browser loads, so there are no dependencies at all.

## Assumptions

These defaults settle the idea's open questions so building can start. Change any of them before Milestone 1.

| Question | Default |
|---|---|
| Audience | Undergraduate learning courses first, then graduate seminars. Accurate enough for researchers to use as a quick sandbox. |
| Models, in order | Rescorla-Wagner, Mackintosh, Pearce-Hall, SOP, MINERVA-AL. A configural model and AESOP come later. |
| Format | Static site: HTML, CSS, and JavaScript ES modules with no build step and no runtime dependencies. Equations rendered with MathML, which all current browsers support, so each symbol is an element the page can colour and annotate. |
| Home | This repo, served by GitHub Pages. Later mirrored on Coolify and linked from the lab website and the Open Psychology Platform. |
| Tests | `node --test`, importing the same model modules the site uses. Every model reproduces published results before it is used in class. |
| Instance theory of semantics | A later extension, after MINERVA-AL works. |

## How students use a model page

Each model page has the same parts, in the same places, so that once a student learns the Rescorla-Wagner page they can read every other page.

**Design panel.** Phases of trial types such as `A+`, `AB+`, `A-` with repeat counts, chosen from a preset or edited by hand. Each trial type has a default timing profile (CS onset, CS duration, US onset, US duration, intertrial interval) that only the real-time model uses.

**Parameter panel.** One slider per parameter. Each slider shows the symbol in the same colour it has in the equation, a plain-language name, and the range. Hovering a slider highlights its symbol in the equation and anything it affects on the chart.

**Chart.** Inline SVG, no library. Predicted outcome per cue across trials, phase boundaries marked, with a scrubber that selects a trial. Model-specific panels sit beside it: associability for the attention models, within-trial state for SOP, the memory matrix and echo for MINERVA-AL.

**Equation panel.** The model's equations with four readings the student can switch between or show together:

| Reading | Example for Rescorla-Wagner |
|---|---|
| Words | The change in A's strength is how surprising the outcome was, scaled by how noticeable A is and how fast this outcome teaches. |
| Symbols | $\Delta V_A = \alpha_A \beta (\lambda - \Sigma V)$ |
| Numbers | $\Delta V_A = 0.3 \times 0.5 \times (1 - 0.45) = 0.083$ for the selected trial |
| Code | the JavaScript line that implements it |

Every symbol is coloured by who sets it: the experimenter (λ, which cues are present), the modeller (α, β), or the model itself (V, ΣV, ΔV). A symbol guide below the equations gives each one's name, meaning, range, role, where it appears on the page, and its value on the selected trial. Hovering a symbol highlights the matching slider, chart line, and table column.

**Arithmetic view.** The selected trial's update drawn as arithmetic, not just typed: the error term as the gap between λ and ΣV on a gauge, each multiplier as a bar, and the product as the resulting step on the chart. For sums over cues, one bar per cue stacked to the total.

**Trial table.** One row per trial: cues present, λ, every intermediate quantity, every ΔV, every V after the trial. This is the hand-calculation table from a textbook, filled in by the model. Export as CSV. The table is also the accessible alternative to the chart.

**Step controls.** Run all, step forward one trial, step back, play at a chosen speed. Each step updates the chart, equation numbers, arithmetic view, and table row together.

**Build the equation.** The equation assembled one term at a time, with each term unlocking phenomena. For Rescorla-Wagner: start with $\Delta V = \beta(\lambda - V)$ for one cue, which gives acquisition and extinction. Add $\alpha_A$, which gives faster learning for salient cues. Replace $V$ with $\Sigma V$, which gives blocking, overshadowing, and conditioned inhibition. Each stage runs live so the student sees the phenomenon appear when the term appears.

**Assumption toggles.** Switches that remove or alter one assumption while everything else stays fixed: summed error on or off in Rescorla-Wagner, associability frozen in Mackintosh and Pearce-Hall, inhibitory learning off in SOP, the similarity exponent changed in MINERVA-AL. The student sees exactly what the assumption buys.

**Predict first.** Before running, the student can sketch the curve they expect on the empty chart by clicking a few points. The model's curve is drawn over the sketch. Phenomenon cards use this by default.

**Phenomenon cards.** Each preset is a card with the design, the empirical result in one sentence with a citation, the model's prediction computed live with a pass or fail badge, the explanation naming the responsible term, and a "break it" suggestion to try.

**Share link.** The URL encodes model, parameters, design, and the selected trial, so an instructor can link to a configured page from a slide or assignment.

**Reading equations primer.** One page, linked from every equation panel, that teaches the notation with small live widgets: Δ as change from one trial to the next, Σ as adding up over the cues present, subscripts as names of cues, superscript n as the trial number, Greek letters as parameters, asymptotes, and finding a fixed point by setting Δ to zero and solving. It ends with a notation map between the papers and common textbooks.

## Scope

**In**

- The static site described above, with one page per model, a comparison page, the primer, and the phenomenon cards.
- Five models with a common interface, each implemented from its original papers.
- Phenomena as presets: acquisition, extinction, blocking, overshadowing, conditioned inhibition, latent inhibition, backward blocking, negative patterning, and for SOP also the intertrial-interval effect, the CS-US interval effect, backward conditioning, and US pre-exposure.
- A comparison view that runs one design through several models at once, and a phenomenon-by-model table generated by running the presets.
- Automated tests that reproduce known analytic results and published simulations.
- Three to five guided tutorials built from the pages above.

**Out, for now**

- Configural models such as Pearce's, and AESOP, Wagner and Brandon's extension of SOP.
- Fitting models to data.
- The instance theory of semantics.
- R and Quarto versions, and Coolify hosting.

## Architecture

```
index.html                 landing: entry points by background, all units
warm-up.html               maths warm-up for students who need it
primer.html                how to read these equations
glossary.html              every technical term in plain language
decks/<unit>.html          overview slides for each unit
compare.html               one design, several models
models/
  rescorla-wagner.html     one page per model, same layout
  mackintosh.html
  pearce-hall.html
  sop.html
  minerva-al.html
js/
  core/
    design.js              trial-design format and parser
    runner.js              runs a design through a model, returns a Run
    rng.js                 seedable random numbers
    phenomena.js           run a phenomenon and report whether the effect appears
    format.js              number formatting
    url-state.js           encode and decode page state in the URL
  models/
    rescorla-wagner.js     one module per model, common interface
    mackintosh.js
    pearce-hall.js
    sop.js
    minerva-al.js
  ui/
    chart.js               SVG chart with phases and scrubber
    equation.js            MathML from an equation spec, four readings, legend
    arithmetic.js          arithmetic view of one update
    table.js               trial table and CSV export
    highlight.js           hover links between symbols, sliders, lines, and columns
    page.js                the shared model page: sliders, toggles, steps, cards
    sketch.js              predict-first sketching (Milestone 2)
content/
  phenomena/index.js       design, empirical result, citation, live check, per-model notes
  equations/<model>.js     equation specs per model: symbols, roles, words, table, stages
  tutorials/*.html
tests/
  *.test.js                node --test
```

**Design format.** A design is a list of phases. A phase is a list of trial types with counts and an order: `alternate` (the default, one of each type in turn), `random` (shuffled with a seed), or `blocked`. A trial type is a string such as `A+`, `AB+`, or `A-`, with any number of cue letters and an optional outcome magnitude such as `A+(0.5)`. Each trial type may carry a timing profile, in moments, for the real-time model. Trial-level models ignore timing.

**Model interface.** Every model module exports the same shape:

- `describe()` returns the name, the parameter list (key, symbol, label, min, max, default, step, meaning), the equation spec, and the model-specific views it supports.
- `init(params, cueNames, rng)` creates a fresh learner.
- `trial(trialSpec)` runs one trial and returns a trial record: the prediction before the trial, every intermediate quantity, every update, the state after, and for real-time models a list of moment records. Every quantity is keyed by the symbol used in the equation spec, so the equation panel can substitute numbers without model-specific code.
- `predict(cues)` returns the current prediction for a probe without learning. Tests use it.
- `state()` returns internal values for the model-specific views.

**Real time.** SOP runs moment by moment. The runner feeds it the moments of each trial and the intertrial interval, with the context as an always-present cue when a preset needs it. Its trial record summarizes the trial for the shared chart as the mean and peak US activation during the CS, and keeps the moment records for its own within-trial view and timeline scrubber. This is what lets SOP appear on the same comparison chart as the trial-level models.

**Stochastic models.** MINERVA-AL runs many simulated learners with a seeded generator and the chart shows the mean and spread. Presets fix the seed so the page is reproducible.

**Equation specs.** Each equation is a small object in a JavaScript module, so specs and presets load without a server request and run in Node tests: a tree of terms with a symbol, colour, words, and the key that fetches its value from the trial record. One spec drives the MathML rendering, the words reading, the numbers reading, the legend, the hover links, and the arithmetic view. The code reading points at the line in the model module.

## Models

### Rescorla-Wagner

Rescorla and Wagner (1972). Summed-error learning:

$$\Delta V_A = \alpha_A \beta (\lambda - \Sigma V)$$

with learning rates $\alpha$ per cue and $\beta$ per outcome, and $\Sigma V$ over the cues present. Separate $\beta$ for reinforced and non-reinforced trials as an option.

- Gets: acquisition, extinction, blocking, overshadowing, conditioned inhibition.
- Gets wrong, shown as such: latent inhibition, backward blocking, negative patterning.
- Build-the-equation stages: single-cue error, add $\alpha$, summed error.
- Toggle: summed error off, which turns it into an individual-error rule and removes blocking.
- Tests: the asymptote equals λ; blocking appears; the overshadowing split at asymptote is in the ratio of the αs; extinction goes to zero.

### Mackintosh

Mackintosh (1975). Individual error with changing associability:

$$\Delta V_A = \theta \alpha_A (\lambda - V_A)$$

where $\alpha_A$ rises when A predicts the outcome better than the other cues present and falls when it does not. The 1975 paper gives the direction of the change in $\alpha$ but not a single formula for its size, so the plan is to use the explicit version in Le Pelley (2004) and say so on the page.

- Gets: blocking by attention rather than by shared error, overshadowing, latent inhibition.
- Second chart: each cue's associability beside its strength.
- Toggle: freeze α, which shows how much the attention rule does.
- Tests: worked examples from the paper and from Le Pelley (2004).

### Pearce-Hall

Pearce and Hall (1980), with the running average from Pearce, Kaye, and Hall (1982):

$$\alpha_A^{n} = \gamma \lvert \lambda^{n-1} - \Sigma V^{n-1} \rvert + (1 - \gamma)\alpha_A^{n-1}$$

Associability tracks recent surprise, so it falls as the outcome becomes predicted. Excitatory and inhibitory strengths are learned separately and the net strength is their difference.

- Gets: latent inhibition, the slower learning for well-predicted cues, blocking and unblocking.
- Second chart: associability beside strength, the opposite pattern from Mackintosh on the same designs.
- Toggle: freeze α; set γ to one or zero.
- Tests: the worked examples in the 1980 paper.

### SOP

Wagner (1981), with the computational details in Mazur and Wagner (1982) and Brandon, Vogel, and Wagner (2003). Each stimulus is a node of elements, and each element is in one of three states: inactive, primary activity A1, or secondary activity A2. Presenting a stimulus moves elements from inactive to A1 at rate $p_1$; elements decay from A1 to A2 at $p_{d1}$ and from A2 back to inactive at $p_{d2}$. An associated stimulus moves US elements from inactive straight to A2 at a rate set by the summed associative strength of the cues in A1.

Learning on every moment:

$$\Delta V_{CS,US} = L^{+}\, p_{A1,CS}\, p_{A1,US} - L^{-}\, p_{A1,CS}\, p_{A2,US}$$

Excitation when CS and US are both in A1, inhibition when the CS is in A1 while the US is in A2. The response is a weighted sum of US activity in A1 and A2, and the two weights can have opposite signs, which is the "sometimes opponent" in the name.

- Gets: everything Rescorla-Wagner gets, plus latent inhibition through context priming, the intertrial-interval effect, the CS-US interval function, backward conditioning producing inhibition, the US pre-exposure effect, and habituation within a trial. Blocking is explained differently: the pretrained cue puts US elements into A2, so the added cue earns excitation and inhibition that cancel.
- Why it is in the sequence: it is the first model where time inside the trial matters, and it is Wagner's own successor to Rescorla-Wagner. Students see the same author change the question from "how much surprise on this trial" to "what is active at this moment".
- Views: a three-state diagram per node with the proportions animated as the trial plays; a within-trial timeline of $p_{A1}$ and $p_{A2}$ for CS and US with the excitatory and inhibitory overlaps shaded in two colours, so the learning increment is visible as the area of overlap; a timeline scrubber inside the trial; and the shared per-trial chart.
- Toggles: inhibitory learning off; associative activation into A2 off; the A2 response weight set to zero.
- Design additions: timing profiles per trial type, intertrial interval, and context as a cue.
- Tests: reproduce the state trajectories and the simulation figures in Wagner (1981) and Mazur and Wagner (1982), including the CS-US interval function and backward conditioning.

### MINERVA-AL

Jamieson, Crump, and Hannah (2012). Events are feature vectors for cues and outcome. Memory is a matrix of stored traces. A probe retrieves an echo, the sum of traces weighted by their similarity to the probe raised to a power, and the outcome features of the echo are the expectation. What is stored on a trial is the discrepancy between the event and the expectation, with each feature encoded with probability $L$.

- Gets: the phenomena simulated in the paper, including acquisition, extinction, blocking, overshadowing, conditioned inhibition, latent inhibition, backward blocking, and negative patterning, without any associative strength at all.
- Why it ends the sequence: the same phenomena the earlier models handle with changing strengths or attention fall out of storing and retrieving instances. The comparison view makes this the final teaching point.
- Views: the trace matrix filling up, the echo for the current probe, and similarity per trace; a slider for the number of simulated learners with the spread shown.
- Toggles: the similarity exponent; discrepancy encoding on or off, which shows that storing raw events does not produce blocking.
- Tests: reproduce the key figures from the 2012 paper with fixed seeds.

## Milestones

### 1. Static site skeleton and Rescorla-Wagner

- [x] Repo layout above, a CLAUDE.md, and a README
- [x] GitHub Pages serving `index.html` from `main`, at https://crumplabsandbox.github.io/learning-model-demos/
- [x] Design format and parser, tested in Node on the blocking design
- [x] Runner and trial record format, with Rescorla-Wagner as the first model and tests for asymptote, blocking, overshadowing, and extinction
- [x] SVG chart with phases and a trial scrubber
- [x] Parameter sliders linked to the equation by colour and hover
- [x] Equation spec format, MathML rendering, and the four readings
- [x] Arithmetic view, trial table with CSV export, and step controls
- [x] Build-the-equation mode and the summed-error toggle
- [x] Phenomenon cards for the five phenomena Rescorla-Wagner gets and the three it gets wrong, plus a salience card that build mode needs to show what α adds
- [x] URL state and share link
- [ ] Try the page with two or three students and fix what confuses them before adding models

Notes from building it:

- Symbol colours mark who sets each quantity (experimenter, modeller, or computed by the model) rather than giving every symbol its own colour. Ten distinct colours on one page would clash with the cue colours on the chart. Hover links do the per-symbol matching instead.
- Equations render as inline MathML. Chromium does not stretch a horizontal brace without a math font, so the prediction-error bracket is drawn with CSS. Firefox and Safari still need checking.
- Tests also check that every equation on the page evaluates to the number the model used, for every combination of assumption toggles. This keeps the displayed equations and the code from drifting apart.
- A GitHub Actions workflow runs the tests on every push.

### 2. Reading equations primer and predict-first

Students who tried the Milestone 1 page liked it but asked for more scaffolding to follow what was going on. This milestone is the answer to that.

- [x] Primer page with live widgets for Δ, Σ, subscripts, trial superscripts, parameters, asymptotes, and fixed points
- [x] Notation map between the papers and common textbooks
- [x] Predict-first sketching on the chart, used by the phenomenon cards

Notes from building it:

- The primer (`primer.html`) has thirteen short sections. Most have a widget, and six end with a "check yourself" question whose wrong answers explain the mistake. The order follows how students read an equation: who sets each number, letters as names, Greek letters with pronunciations, Δ, Σ, multiplication, the error term, trial superscripts (with a warning that they are not powers), asymptotes, setting Δ to zero and solving, and a guided read of the whole rule.
- The "where learning stops" section solves three cases by algebra (one cue, a compound, and conditioned inhibition), then runs the real model to check the answer. Tests confirm each algebraic solution matches the model.
- The notation map's original-paper column follows the 1972 chapter's V<sub>AX</sub>, β<sub>1</sub>, λ<sub>1</sub> style. Its last column lists forms common across sources rather than citing particular textbooks. Check it against the course readings before class.
- Predict first: each phenomenon card now has "Predict, then run". The chart hides the model's lines and uses a range that gives nothing away. The student draws the lines named in the card's prompt, and the equations, arithmetic, trial table, and that card's result stay hidden until they press Reveal. The comparison then gives a verdict per line, the values at the end of each phase, and a button that jumps to the trial where the sketch and the model differ most. Any design can be sketched from the chart's "Sketch a prediction first" button.
- The model page also gained a collapsible "How to use this page" guide, a link from the equation panel to the primer, and a link from each row of the symbol guide to the primer section that explains that symbol.

### 2b. Entry points for students with no background

Students range from comfortable with equations to new to the area and anxious about maths, and some need help with basic arithmetic. So the site needs several ways in, and short overviews that say what each unit is about before a student commits to it.

- [x] Landing page organised around three starting points: new to all of this, know some psychology, comfortable with equations
- [x] Overview slide decks: the big picture (no maths), the maths warm-up, reading the equations, and Rescorla-Wagner
- [x] Maths warm-up page: decimals, numbers below zero, gaps, taking part of a number, adding up, reading a graph, a rule repeated (the glass-filling picture of learning), and letters as nicknames, each with a widget and a question with a hint
- [x] Glossary of every technical term, in plain language with an example, searchable and linked from every page
- [x] Essentials view on model pages, remembered between visits and settable by link, that hides the trial table, the code, and custom designs and starts with the words reading
- [x] Consistent navigation on every page: Start here, Maths warm-up, Reading the equations, the models, Glossary

Notes from building it:

- Decks are plain HTML in `decks/`, with no build step. They have keyboard, swipe, and button navigation, a link to each slide, speaker notes (N), an outline (O), full screen (F), and print-as-handout. Charts on slides are drawn by running the real model, and slides can embed any primer or warm-up widget.
- Tests check that every link between pages, into page sections, and into the glossary resolves; that every check question has exactly one right answer with an explanation for every option; and that every deck has slides and a way back.
- From here on, every new model ships with an overview deck, glossary entries for its new terms, and the same Essentials view.

### Tooling: build, serve, and check like GitHub Pages

After the scaffolding went live, the slide decks broke for some visitors. The cause was browser caching: GitHub Pages lets browsers keep files for ten minutes, so a browser could combine a new deck script with an old cached copy of a module it imports. When one ES module import fails, the whole page script stops, and all the slides showed at once with no controls.

- [x] `tools/site_tool.py` (Python standard library): `build` writes `_site/` with every script and stylesheet address version-stamped and fails on broken imports or links; `serve` serves it under `/learning-model-demos/` like GitHub Pages; `check` builds, serves, and runs the browser checks
- [x] `tools/check_site.py` (Playwright): every page at desktop and phone size, with no console errors, failed requests, unstamped assets, or sideways scrolling, plus the decks, model page, predict-first, primer, warm-up, and glossary; screenshots to `_check/`
- [x] A load guard on every page: if a page's script never finishes starting, a reload message appears instead of a broken page
- [x] CI runs the browser checks in Chromium, Firefox, and WebKit on every push; deploys from `main` go through GitHub Actions and only happen when the checks pass
- [ ] Switch Settings > Pages > Source to GitHub Actions so the built, version-stamped site is what gets published

### 3. Attention models

- [ ] Mackintosh, with the explicit associability rule documented on the page
- [ ] Pearce-Hall with separate excitatory and inhibitory strengths
- [ ] Associability chart beside the strength chart, and the freeze-α toggles
- [ ] Phenomenon cards for latent inhibition and the different accounts of blocking
- [ ] Tests against the worked examples in the papers
- [ ] Overview decks for Mackintosh and Pearce-Hall, and glossary entries for their new terms

### 4. SOP

- [ ] Timing profiles and intertrial interval in the design format, context as a cue
- [ ] Moment-by-moment runner path and per-trial summary for the shared chart
- [ ] SOP module from Wagner (1981) and Mazur and Wagner (1982)
- [ ] Three-state diagram, within-trial timeline with shaded excitatory and inhibitory overlap, and timeline scrubber
- [ ] Phenomenon cards: intertrial interval, CS-US interval, backward conditioning, US pre-exposure, latent inhibition by priming, and blocking as cancelling excitation and inhibition
- [ ] Tests reproducing the published state trajectories and figures
- [ ] Overview deck and glossary entries for SOP

### 5. MINERVA-AL

- [ ] Vector events, trace matrix, echo with the similarity exponent, and discrepancy encoding, from the paper's equations
- [ ] Seeded generator, many learners, mean and spread on the chart
- [ ] Trace matrix, echo, and similarity views
- [ ] Tests reproducing the key figures with fixed seeds
- [ ] Overview deck and glossary entries for MINERVA-AL

### 6. Comparison and teaching

- [ ] Comparison page: one design, several models, overlaid or as small multiples, including SOP through its per-trial summary
- [ ] Phenomenon-by-model table generated by running the presets through every model, published on the landing page and asserted in tests
- [ ] Three to five tutorials, for example "why blocking happens, five ways", "where Rescorla-Wagner fails", "time inside the trial", and "learning without associations"
- [ ] Link from the lab website and the course materials

### Later

- Mirror on Coolify following the coolify-deploy skill.
- R and Quarto versions of the models for course materials, checked against the JavaScript tests.
- Pearce's configural model and AESOP.
- The instance theory of semantics as an extension of the MINERVA-AL page.

## Risks

| Risk | Mitigation |
|---|---|
| A model is implemented subtly wrong, and students learn the wrong thing. | Implement from the original papers, not secondary sources. Reproduce published results in automated tests before anything is used in class. |
| Mackintosh's rule for changing α is underspecified in the original paper. | Use one explicit published version, name it on the page, and show the direction rule from the 1975 paper beside it. |
| Notation differs between papers and textbooks. | One notation across the site, chosen on the primer page, with a notation map to the alternatives. |
| The equation panel becomes a wall of symbols that students skip. | Default to the words reading and the arithmetic view, with symbols one click away. Test the pages with students at the end of Milestone 1. |
| SOP's real-time structure does not fit the trial-level interface. | The runner handles moments, and the per-trial summary puts SOP on the shared chart. Build this in Milestone 4 rather than retrofitting it later. |
| MINERVA-AL results vary from run to run and are sensitive to its parameters. | Average over many learners by default, show the spread, and fix seeds for presets. |
| MathML renders differently across browsers. | Checked in Chromium in Milestone 1. Check Firefox and Safari before classroom use. Fall back to a vendored KaTeX file if needed, still with no build step. |
| The project grows into a general modeling toolkit. | Keep to the five models and the listed phenomena until the teaching version is in use. |
| Large designs make MINERVA-AL slow in the browser. | Cap trial counts and learners in the interface. Classroom designs are small anyway. |

## First steps

1. Lay out the repo, write the design parser, and test it in Node on the blocking design.
2. Implement Rescorla-Wagner against the model interface, returning a full trial record, with tests for asymptote, blocking, overshadowing, and extinction.
3. Build the Rescorla-Wagner page with the blocking preset, sliders, SVG chart, equation panel with the four readings, and the trial table. Open it in a browser and check that a trial selected on the chart shows its numbers in the equation.
4. Enable GitHub Pages so every push is viewable.
