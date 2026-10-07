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

**Real time.** SOP runs moment by moment. The design gives each trial type a timing (when the cue and the US are on, and the gap to the next trial, in moments), and the runner passes it to the model with each trial; trial-level models ignore it. The context is an always-present cue. SOP's trial record keeps every moment (each node's A1 and A2, what was on, what was called up) for its within-trial view and timeline scrubber, and the shared chart shows its link strengths V, so SOP sits on the same comparison chart as the trial-level models. Because V is not what an animal does in SOP (a faint cue needs a bigger V to call up the US as strongly), the model also reports, per cue and trial, how much of the US the cue would call up on a test presentation, and phenomenon checks that compare responses read that series (`responseKey`).

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
- Toggles: inhibitory learning off; associative activation into A2 off; cue-to-cue links off. The A2 response weight is a slider in Everything view, and can be set to zero or made negative.
- Design additions: timing profiles per trial type, intertrial interval, and context as a cue.
- Tests: reproduce the state trajectories and the simulation figures in Wagner (1981) and Mazur and Wagner (1982), including the CS-US interval function and backward conditioning.

### MINERVA-AL

Jamieson, Crump, and Hannah (2012). Events are feature vectors for cues and outcome. Memory is a matrix of stored traces. A probe retrieves an echo, the sum of traces weighted by their similarity to the probe raised to a power, and the outcome features of the echo are the expectation. What is stored on a trial is the discrepancy between the event and the expectation, with each feature encoded with probability $L$.

- Gets: the phenomena simulated in the paper, including acquisition, extinction, blocking, overshadowing, conditioned inhibition, latent inhibition, backward blocking, and negative patterning, without any associative strength at all.
- Why it ends the sequence: the same phenomena the earlier models handle with changing strengths or attention fall out of storing and retrieving instances. The comparison view makes this the final teaching point.
- Views: the trace matrix filling up, the echo for the current probe, and similarity per trace; a slider for the number of simulated learners with the spread shown.
- Toggles: the similarity exponent; discrepancy encoding on or off, which shows that storing raw events does not produce blocking.
- Tests: reproduce the paper's tables with fixed seeds (done; see Milestone 5).

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
- [x] Switch Settings > Pages > Source to GitHub Actions so the built, version-stamped site is what gets published

### 3. Attention models

- [x] Mackintosh, with the explicit associability rule documented on the page
- [x] Pearce-Hall with separate excitatory and inhibitory strengths
- [x] Associability chart beside the strength chart, and the freeze-α toggles
- [x] Phenomenon cards for latent inhibition and the different accounts of blocking, plus a new unblocking card
- [x] Tests: hand-worked single trials of every rule, analytic results, and the check that every displayed equation evaluates to the number the model used
- [ ] Tests against the simulations published in the original papers. Not done: the papers were not available while building. Both pages carry a "Preview" notice until this is done.
- [x] Overview decks for Mackintosh and Pearce-Hall, and glossary entries for their new terms
- [x] Primer sections on absolute value, attention that changes (a parameter that becomes computed), and the bar in V̄
- [x] The experimental context as a cue (`Context: Z` in a design), used in the latent inhibition card

Notes from building it:

- Mackintosh (1975) gives only the direction of the attention change. The page uses a continuous rule of the kind in Le Pelley (2004), Δα = θ<sub>α</sub>(|λ − ΣV<sub>others</sub>| − |λ − V<sub>A</sub>|), and offers the 1975 direction rule (a fixed step, with ties counting as "worse") as an assumption. They predict different things: with equal saliences the continuous rule gives blocking but not overshadowing or latent inhibition, and the direction rule gives the reverse. Tests pin this down, and the Mackintosh deck makes it a teaching point. Check the continuous rule's exact form and bounds against Le Pelley (2004).
- Pearce-Hall: excitatory learning ΔV = Sαλ happens when the outcome is bigger than predicted, and inhibitory learning ΔV̄ = Sα(ΣV − λ) when it is smaller. Letting excitation also happen on every reinforced trial makes the prediction settle at 2λ, so this is the choice made; it is stated in the code and should be checked against the 1980 paper. Attention uses the 1982 running average with γ = 0.8 by default; γ = 1 gives the 1980 model, in which latent inhibition lasts only one trial. Defaults (salience 0.15, starting attention 0.8) were chosen so that learning does not overshoot during pretraining, which keeps blocking an effect of attention.
- With these settings, each card's result per model is fixed by tests (`tests/phenomena.test.js`). Rescorla-Wagner gains unblocking; Mackintosh shows acquisition, extinction, salience, blocking, and unblocking; Pearce-Hall adds overshadowing, conditioned inhibition, and latent inhibition.
- The framework now supports per-cue internal values over trials (for the attention chart), two-case rules, absolute values, V̄, word subscripts, an arithmetic view with several calculations, presets that set salience whatever a model calls it, and build stages that name the equation to show.

### 4. SOP

- [x] Timing profiles and intertrial interval in the design format (`20 A+ [CS 1-10, US 9-10, ITI 100]`, a `Timing:` line, and `+` for the US alone), context as a cue
- [x] Moment-by-moment path: trial records keep every moment; the shared chart shows V, and a second chart shows what each cue calls up
- [x] SOP module from Wagner (1981) and Mazur and Wagner (1982), with every choice stated in the code and on the page
- [x] Three-state bars, within-trial timeline with the gain (L⁺ × both in A1) and the loss (L⁻ × cue in A1, US in A2) shaded, a moment scrubber with play, and the arithmetic of each moment
- [x] Phenomenon cards: trial spacing, CS-US interval, backward conditioning, and US pre-exposure (new, on every model page); latent inhibition by priming and blocking as cancelling gain and loss (SOP explanations on the existing cards)
- [x] Tests: hand-worked moments, the steady state of a stimulus left on, decay, overlap sums, analytic limits, the CS-US interval ordering, backward inhibition, and the check that every displayed equation evaluates to the number the model used
- [ ] Tests reproducing the published state trajectories and figures. Not done: the papers were not available while building, so the page carries a "Preview" notice.
- [x] Overview deck with real within-trial figures, glossary entries, and primer sections on moments and states and on adding up over moments

Notes from building it:

- Choices the papers leave open, stated in `js/models/sop.js` and on the page: presentation acts before calling up (p<sub>2</sub> applies to the inactive elements presentation did not take); learning uses each moment's proportions after that moment's changes; a trial's increments, including the gap after it, are added up and V changes once, at the end of the trial; p<sub>2</sub> = ρ ΣV p<sub>A1</sub>, kept between 0 and 1, with ρ a parameter that only sets the scale of V; every cue also links to every other cue by the same rule (needed for latent inhibition by context priming; it can be switched off); the US links to nothing; a bigger US, A+(2), multiplies the US intensity p<sub>1</sub> (up to 1); every node starts inactive; the response is R = w<sub>1</sub>p<sub>A1,US</sub> + w<sub>2</sub>p<sub>A2,US</sub>, averaged while the cue is on before the US.
- Default values are this site's, chosen with a search so that one set of numbers shows the classic effects: cue salience 0.2 (context 0.05), US intensity 0.5, p<sub>d1</sub> 0.15, p<sub>d2</sub> 0.03, L⁺ 0.3, L⁻ 0.02, ρ 0.55; timing CS 1-10, US 9-10, ITI 100. L⁻ must be much smaller than L⁺ because A2 lasts much longer than A1 (p<sub>d1</sub>/p<sub>d2</sub> = 5); otherwise every cue that outlasts the US, and the context, turns inhibitory. Check all of these against Mazur and Wagner (1982).
- An earlier version made a bigger US "more elements" by scaling learning. It produced unblocking only through leftover A2 from a big US leaking into the next trial, so it was replaced by Wagner's own treatment of intensity as p<sub>1</sub>.
- With these settings SOP shows every card except backward blocking and negative patterning. Build stages: overlap alone already shows the CS-US interval and trial spacing; calling up the US adds acquisition, salience, blocking, unblocking, overshadowing, and US pre-exposure; inhibitory learning adds extinction, conditioned inhibition, and backward conditioning; cue-to-cue links add latent inhibition. The trial-level models now also get US pre-exposure through the context.
- Backward conditioning depends on the gap: with the cue starting 2 moments after the US it gains strongly (the US is still in A1), with a 13-moment gap it becomes an inhibitor. The card uses the gap and its "Try this" points at the other case.

### 5. MINERVA-AL

- [x] Vector events, trace matrix, echo with the similarity exponent, and discrepancy encoding, from the paper's equations (Eqs. 2-7)
- [x] Seeded generator, many learners (25 by default, as in the paper), mean and spread on the chart
- [x] Memory view: learner 1's traces as a heatmap with the probe, similarity and activation per trace, the echo, the event, and the new trace
- [x] Tests reproducing the paper's Tables 2, 3, 5, 7, 8, 9, 10, 12, and 13 (L = .67) and the extinction result of Figure 1, with a fixed seed. The page carries no Preview notice.
- [x] Overview deck, glossary entries, primer sections on events as vectors and on similarity and the echo, and notation map rows

Notes from building it:

- The paper's details that matter, checked against the PDF: each stimulus is a field of 20 features set to 1 (salience α and a muted outcome multiply them); the context is in every probe; similarity is the cosine over the cue fields only (Eq. 7), so a trace's outcome features never change how similar it is; noise from ±0.001 is added to the echo before it is scaled by its largest feature (Eq. 4); retrieval X|P is Eq. 5; memory starts empty; and each trial stores E − C′ with probability L per feature (Eq. 6). A first version computed the cosine over every feature, and extinction failed: once A is learned, an A− trace holds almost nothing but the opposite of the outcome, and over the whole vector it barely resembles A.
- Choices this site adds: n in Eq. 5 is the number of outcome features (so perfect retrieval is 1, as in the tables); when a design has no Context line the model adds a context of its own; all learners see the same trial sequence; the outcome is written O, not X, because designs here use X as a cue.
- With these settings MINERVA-AL shows acquisition, extinction, salience, blocking, overshadowing, conditioned inhibition, latent inhibition, backward blocking, and negative patterning. Switching off discrepancy encoding (MINERVA 2) leaves acquisition, extinction, latent inhibition, and negative patterning. It does not show unblocking in this site's design (the size-2 outcome reaches D's echo through the shared context), US pre-exposure, or the timing effects.
- A new cue tested in a trained context already retrieves some of the outcome (about 0.6), because its probe shares the context with every trace and the echo is scaled to its largest feature. This is the model's behaviour, and the deck mentions it.
- The framework gained: an optional `summary()` for models with many learners and a spread band on the chart; equations that are not about one cue (`cueless`), equations that apply only on some trials (`when`), fraction, square root, power, and indexed-sum nodes; and the memory view.

### 6. Comparison and teaching

- [x] Comparison page (`compare.html`): one design, any of the five models, as small multiples with one shared trial cursor; for a preset, each panel shows the model's verdict and its explanation; custom designs too
- [x] Phenomenon-by-model table generated by running the presets through every model, published on the landing page and asserted in tests (`node tools/matrix.mjs` rewrites it; `tests/matrix.test.js` fails when it is stale)
- [x] Four tutorials: "Why blocking happens, five ways", "Where Rescorla-Wagner fails", "Time inside the trial", and "Learning without associations", each with live model charts, a verdict strip run across every model, and check questions
- [ ] Link from the lab website and the course materials (outside this repository)

Notes from building it:

- The models plot different quantities: V for Rescorla-Wagner and Mackintosh, V − V̄ for Pearce-Hall, link strength for SOP, and retrieval from −1 to 1 for MINERVA-AL. Overlaying them on one axis would invite comparisons of heights that mean nothing, so the comparison page shows small multiples, each with a line saying what it plots, and a note to compare shapes and orderings. An overlay was left out on purpose.
- The table on the landing page is static HTML between marker comments, so the landing page runs no models. Models marked preview say so in the column heading.
- `js/core/registry.js` lists the models in course order; the comparison page, the table, the tutorials' verdict strips, and the tests all read it.
- Navigation now includes Compare and Tutorials (the landing page's tutorial section). A content test checks that every page has the same navigation.

### 7. Human contingency judgement: the streamed-trial unit

People judge contingencies in experiments that are the human counterpart of conditioning, and the Rescorla-Wagner model has been applied to them since Dickinson, Shanks, and Evenden (1984). This unit brings the site's models to that task, using the streamed-trial studies (Crump, Hannah, Allan, & Hord, 2007; Allan, Hannah, Crump, & Siegel, 2008; Hannah, Crump, Allan, & Siegel, 2009; Siegel, Allan, Hannah, & Crump, 2009) as the source of the designs and the findings.

- [x] The design format can write a 2 × 2 contingency table: with a context, `-` is a frame with nothing on it, so a stream is `17 A+, 13 A-, 3 +, 27 -, random` with `Context: Z`
- [x] `js/core/contingency.js`: ΔP, the cells of a stream, designs from cells and from a contingency and an outcome density, and the frames a participant sees (the same sequence the models get, for the same seed)
- [x] Four phenomenon presets, badges computed as always: contingency (ΔP 0.47 against 0), outcome density (ΔP 0 at P(O) 0.2 against 0.8), one-phase blocking (the Tangen and Allan matrices from Hannah et al., Table 3), and probabilistic two-phase blocking in the forward order (Hannah et al., Table 4b, with the control's own first-phase companion)
- [x] Checks that should not depend on the order of frames average over eight streams (`h.overSeeds`); the criterion text says so
- [x] Dashed reference lines on the charts for ΔP, from the phenomenon (`reference`) and on mini charts (`data-ref`)
- [x] Streamed-trial page (`stream.html`): preset streams from the papers or custom cells, a random stream whose identity is hidden until judged, speed and blank options (gentle by default; the paper's 100 ms frames and black gaps are an option with a flashing warning), a rating or frequency estimates, then the table, ΔP, the judgement, every model's value for the same frames, and a session log with a ratings-against-ΔP scatter
- [x] Primer sections 21 (the 2 × 2 table and ΔP, with an editable table) and 22 (sensitivity and criterion, with a two-curve signal detection widget); check questions for both
- [x] Tutorial "Judging contingency: from ΔP to the learning rule", the overview deck, glossary entries, a landing page unit row and tutorial card, and Streamed trials in every page's navigation
- [x] Tests: the papers' matrices and their ΔP values, the stream frames against the model sequence, the Rescorla-Wagner asymptote at ΔP with a context (Chapman & Robbins, 1990), every stream preset's claimed ΔP, and the per-model badges; browser checks for the page and the reference lines

Notes from building it:

- A random stream is one particular order of frames, and for the effects that live before the asymptote the order decides the answer: Rescorla-Wagner's outcome density difference ranged from −0.19 to +0.15 across twelve orders. Badges for those presets therefore average over eight streams, as the experiments averaged over many streams per condition. The contingency preset is robust to the order and uses the single run, so its numbers match the chart.
- Two-phase blocking with probabilistic outcomes gives weak model predictions: averaged over streams, Rescorla-Wagner's forward effect is about 0.1, Mackintosh's is reversed, and in the backward order every model gives about 0, including MINERVA-AL with these frames. The forward order is a preset; the backward order is in the tutorial as prose and mini charts rather than a badge, because the results sit within noise of the margin for every model.
- With the context as a cue, Rescorla-Wagner's V levels off at ΔP (Chapman & Robbins, 1990). The test checks the mean over the second half of a 600-frame stream, over four orders, because V wanders around its fixed point under a random order. Without the context the model learns P(O | A) instead; the tutorial shows both.
- Rescorla-Wagner and Pearce-Hall barely show the outcome density effect; Mackintosh, SOP, and MINERVA-AL show it because a common outcome means many pairings. The signal detection papers place the effect, and one-phase blocking, in the decision criterion rather than in learning. The tutorial makes the input and output distinction the closing point, and the primer's section 22 gives the widget for it.
- SOP treats each frame as a well-spaced trial under the default timing, and its context becomes a strong inhibitor over the many frames with nothing on them, so its cue strengths run above 1. This is the model's behaviour under the site's trial-structured context; the page says so, and a `Timing: ITI 2` line is offered as something to try.
- The streamed-trial page flashes stimuli. The default is 500 ms frames with 150 ms gaps and a grey card between frames, and it follows `prefers-reduced-motion`; the paper's 100 ms frames with black gaps are an option with a warning. Nothing is saved between visits.

### Visual refresh: graph paper

- [x] Colour kept for data: the interface (links, buttons, current page, step numbers, focus) is drawn in ink (`--ui`), so the only blue on a model page is cue A
- [x] Self-hosted type pair: Figtree for text and controls, Bricolage Grotesque for headings; the build stamps and checks font addresses
- [x] Sticky header in three groups with the current page marked; one sideways-scrolling row on phones
- [x] Working panels lifted with a soft shadow; segmented Essentials/Everything switch; check questions on a solid panel
- [x] Landing hero with a live blocking chart on graph paper; graph paper behind the decks; centred tutorial column
- [x] Softer blue-black dark mode

Notes from building it:

- The review found that one blue served links, buttons, the scrubber, and cue A's line, so students could not tell controls from data at a glance. That was the main reason for the change, beyond looks.
- Atkinson Hyperlegible was tried first for its legibility, but it draws every zero with a slash ("2Ø A+"), which reads badly on a site full of numbers.
- The fonts cover Latin only; Greek letters in running text use the system font. Equations are unaffected, since MathML uses its own math font.
- Styling the current page exposed a bug: the MINERVA-AL page also marked Pearce-Hall as current. A content test now checks that each page marks only itself.

### Status, credit, and licence

- [x] A thin "In development" strip on every page and deck, linking to a status note; switched off by one line (`IN_DEVELOPMENT` in `js/site-status.js`)
- [x] Footer on every page: developed by Matthew J. C. Crump, Brooklyn College of CUNY, with both licences
- [x] About page: what "in development" means, who made the site, and how to reuse it, with a credit line
- [x] Licences: CC BY 4.0 for text, slides, figures, and teaching content (`LICENSE-CONTENT`); MIT for the code (`LICENSE`); fonts under the SIL OFL

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
