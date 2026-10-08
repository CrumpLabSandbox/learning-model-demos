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
- [x] Tests against the original papers (`tests/mackintosh-paper.test.js`, `tests/pearce-hall-paper.test.js`). Neither paper publishes numerical simulations, so the tests pin the papers' equations and the predictions they state in words. The Preview notices are gone.
- [x] Overview decks for Mackintosh and Pearce-Hall, and glossary entries for their new terms
- [x] Primer sections on absolute value, attention that changes (a parameter that becomes computed), and the bar in V̄
- [x] The experimental context as a cue (`Context: Z` in a design), used in the latent inhibition card

Notes from building it:

- Mackintosh (1975) gives only the direction of the attention change. The page uses a continuous rule of the kind in Le Pelley (2004), Δα = θ<sub>α</sub>(|λ − ΣV<sub>others</sub>| − |λ − V<sub>A</sub>|), and offers the 1975 direction rule (a fixed step, with ties counting as "worse") as an assumption. They predict different things: with equal saliences the continuous rule gives blocking but not overshadowing or latent inhibition, and the direction rule gives the reverse. Tests pin this down, and the Mackintosh deck makes it a teaching point. Check the continuous rule's exact form and bounds against Le Pelley (2004).
- Pearce-Hall: excitatory learning ΔV = Sαλ happens when the outcome is bigger than predicted, and inhibitory learning ΔV̄ = Sα(ΣV − λ) when it is smaller. Letting excitation also happen on every reinforced trial makes the prediction settle at 2λ, so this is the choice made; it is stated in the code and should be checked against the 1980 paper. Attention uses the 1982 running average with γ = 0.8 by default; γ = 1 gives the 1980 model, in which latent inhibition lasts only one trial. Defaults (salience 0.15, starting attention 0.8) were chosen so that learning does not overshoot during pretraining, which keeps blocking an effect of attention.
- With these settings, each card's result per model is fixed by tests (`tests/phenomena.test.js`). Rescorla-Wagner gains unblocking; Mackintosh shows acquisition, extinction, salience, blocking, and unblocking; Pearce-Hall adds overshadowing, conditioned inhibition, and latent inhibition.
- The framework now supports per-cue internal values over trials (for the attention chart), two-case rules, absolute values, V̄, word subscripts, an arithmetic view with several calculations, presets that set salience whatever a model calls it, and build stages that name the equation to show.

Notes from reading the papers (added when the Preview notices were cleared):

- Mackintosh (1975) states the direction of the attention change in two rules (Eqs. 4 and 5, p. 287), with a tie counting as "at least as well", so down. It then suggests, as a further assumption, that the size of the change is proportional to the discrepancy between the two errors (p. 288). So the continuous rule the page uses is Mackintosh's own suggestion, not a later addition; the earlier attribution to Le Pelley (2004) was wrong and has been corrected. The two readings differ exactly on a tie. The paper also says (p. 288) that equal cues trained together should show "some reciprocal overshadowing", because a cue alone predicts better than nothing and gains attention while a cue in a compound ties; the test pins this as a small effect.
- Pearce and Hall (1980) write Equation 8 with V_A alone but use the summed strength of every cue present in the blocking account and in the general Equation 13; the page uses the sum. Equation 9 adds excitation on every reinforced trial and Equation 11 adds inhibition whenever the prediction exceeds λ, so an over-predicted reinforced trial would get both and the net prediction would settle at 2λ; the page applies whichever the sign of the error calls for, and now says so. Equation 15 already proposes averaging associability over recent trials, for the same reason the 1982 running average is used here.

### 4. SOP

- [x] Timing profiles and intertrial interval in the design format (`20 A+ [CS 1-10, US 9-10, ITI 100]`, a `Timing:` line, and `+` for the US alone), context as a cue
- [x] Moment-by-moment path: trial records keep every moment; the shared chart shows V, and a second chart shows what each cue calls up
- [x] SOP module from Wagner (1981) and Mazur and Wagner (1982), with every choice stated in the code and on the page
- [x] Three-state bars, within-trial timeline with the gain (L⁺ × both in A1) and the loss (L⁻ × cue in A1, US in A2) shaded, a moment scrubber with play, and the arithmetic of each moment
- [x] Phenomenon cards: trial spacing, CS-US interval, backward conditioning, and US pre-exposure (new, on every model page); latent inhibition by priming and blocking as cancelling gain and loss (SOP explanations on the existing cards)
- [x] Tests: hand-worked moments, the steady state of a stimulus left on, decay, overlap sums, analytic limits, the CS-US interval ordering, backward inhibition, and the check that every displayed equation evaluates to the number the model used
- [x] Tests reproducing the published figures (`tests/sop-paper.test.js`): the decay functions and Figures 1-2 to 1-8 of Mazur and Wagner (1982), with the papers' parameter values. The Preview notice is gone.
- [x] Overview deck with real within-trial figures, glossary entries, and primer sections on moments and states and on adding up over moments

Notes from building it:

- Choices the papers leave open, stated in `js/models/sop.js` and on the page: presentation acts before calling up (p<sub>2</sub> applies to the inactive elements presentation did not take); learning uses each moment's proportions after that moment's changes; a trial's increments, including the gap after it, are added up and V changes once, at the end of the trial; p<sub>2</sub> = Σ V (r<sub>1</sub> p<sub>A1</sub> + r<sub>2</sub> p<sub>A2</sub>), kept between 0 and 1, with r<sub>1</sub> (0.55 here, 1 in the papers) only setting the scale of V; every cue also links to every other cue by the same rule (needed for latent inhibition by context priming; it can be switched off); the US links to nothing; a bigger US, A+(2), multiplies the US intensity p<sub>1</sub> (up to 1); every node starts inactive; the response is R = w<sub>1</sub>p<sub>A1,US</sub> + w<sub>2</sub>p<sub>A2,US</sub>, averaged while the cue is on before the US.
- Default values are this site's, chosen with a search so that one set of numbers shows the classic effects: cue salience 0.2 (context 0.05), US intensity 0.5, p<sub>d1</sub> 0.15, p<sub>d2</sub> 0.03, L⁺ 0.3, L⁻ 0.02, r<sub>1</sub> 0.55, r<sub>2</sub> 0.01, C<sub>1</sub> 2, C<sub>2</sub> 10; timing CS 1-10, US 9-10, ITI 100. L⁻ must be much smaller than L⁺ because A2 lasts much longer than A1 (p<sub>d1</sub>/p<sub>d2</sub> = 5); otherwise every cue that outlasts the US, and the context, turns inhibitory. The papers' values are compared in the notes below.
- An earlier version made a bigger US "more elements" by scaling learning. It produced unblocking only through leftover A2 from a big US leaking into the next trial, so it was replaced by Wagner's own treatment of intensity as p<sub>1</sub>.
- With these settings SOP shows every card except backward blocking and negative patterning. Build stages: overlap alone already shows the CS-US interval and trial spacing; calling up the US adds acquisition, salience, blocking, unblocking, overshadowing, and US pre-exposure; inhibitory learning adds extinction, conditioned inhibition, and backward conditioning; cue-to-cue links add latent inhibition. The trial-level models now also get US pre-exposure through the context.
- Backward conditioning depends on the gap: with the cue starting 2 moments after the US it gains strongly (the US is still in A1), with a 13-moment gap it becomes an inhibitor. The card uses the gap and its "Try this" points at the other case.

Notes from reading the papers (added when the Preview notice was cleared):

- Two rules from Mazur and Wagner (1982) were missing and are now in: a cue's A2 activity also calls up the US, weighted by r₂ (Eq. 1.1; 0.01 in the papers), and the distractor rules (Eqs. 1.3 and 1.4): what enters A1 on a moment raises every node's decay from A1 by that share over C₁, and what enters A2 raises decay from A2 by that share over C₂. The parameter ρ is now r₁. The distractor increments count what presentation and calling up move, not decay, so that a stimulus left alone follows the papers' decay functions exactly (Eqs. 1.9 and 1.10); this reading is stated on the page.
- With the distractor rules on, SOP's latent inhibition falls below the margin: the context still primes the pre-exposed cue, but its own onset knocks the context out of A1 faster, so the context's link stays weak and the cue catches up within a few trials. The badge is now ✗ by default and ✓ with the activity limits off, and the card says so. Every other default result is unchanged.
- The papers set L⁺ = 5 L⁻ so that a static context gains no net strength (the ratio of its A1 and A2 overlaps with the US is pd₂ : pd₁, which the test checks). With that ratio on this page acquisition and salience fail, because the context here switches on and off with each trial, so L⁻ stays smaller than the papers' ratio and the page says why. r₁ = 1 in the papers; 0.55 here only sets the scale of V.
- The papers start every episode with all nodes inactive and run it for 100 moments after the last stimulus. The tests use trials 400 moments apart so that the previous trial's activity has faded. With the papers' parameters and a punctate cue four moments before the US, acquisition levels off by trial 50 with the gain and loss nearly balanced, overexpectation reduces both cues, an inhibitor does not extinguish alone, and supernormal conditioning does not appear on the first compound trial, all as the paper describes. One-trial overshadowing through the activity limits appears with a cue that is on for several moments, not with a punctate one, because the raised decay acts on A1 activity already present.

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

### 8. Pearce's configural model, and a models page

Pearce (1987) is the first configural model on the site: the whole pattern of cues on a trial learns as one unit and lends its strength to similar patterns. It answers negative patterning and one-trial overshadowing in a different way from MINERVA-AL. The header could not take a sixth model name, so the models now live on their own page.

- [x] `js/models/pearce.js` from Pearce (1987): configurations with their own E and I, similarity by the shares of the common stimuli (Eq. 3), generalised excitation and inhibition (Eq. 6), net strength (Eq. 9), and learning from the discrepancy (Eq. 10) with inhibition as new learning
- [x] Tests (`tests/pearce.test.js`): hand-worked trials, the asymptotes of the paper's Figures 1 and 2 (E = 4/3, I = 2/3, the feature at 2/3), one-trial overshadowing, the symmetry of overshadowing and external inhibition, overexpectation only with a context, blocking by relative intensity, the summation-test asymmetry, and the check that every displayed equation evaluates to the number the model used
- [x] A configurations view on the page (the spec's `panel`), an own-strength chart, cueless equations about the configuration on the trial, and build stages: each pattern alone, lend by similarity, learn about absence
- [x] Explanations for every phenomenon, an overview deck, glossary entries (configuration, generalisation, generalisation decrement, external inhibition, overexpectation), and primer section 23 with a similarity widget
- [x] `models.html`: one card per model in course order, from the registry (`INFO`), with the idea, what it explains and misses, and links. The header's Models group is now All models and Compare; model pages mark All models as current
- [ ] Attention in the buffer (Pearce's suggestion for latent inhibition) and the 1994 revision, if they are wanted for teaching

Notes from building it:

- With equal intensities and no context, a compound and either element have similarity 0.5 exactly, which is the value Pearce's simulations set by hand, and two single cues have similarity 0. The tests reproduce both figures' asymptotes to three decimals: in A+ / AB− the element's excitation ends at 4/3 and the compound's inhibition at 2/3, so that the element predicts λ and the compound 0; the feature-positive case mirrors it, with the feature alone at 2/3.
- The paper describes inhibitory learning for nonreinforced trials; this page applies the same rule to an over-predicted reinforced trial, so overexpectation (which needs a context, as the paper says) reduces both cues through inhibition. Without a context the compound of two trained cues predicts exactly λ and nothing changes.
- With the default intensities (cues 0.5, context 0.15) the model shows acquisition, extinction, blocking, unblocking, overshadowing, conditioned inhibition, negative patterning, and the four streamed-trial effects. It misses salience (intensity only acts through a context), latent inhibition (nothing changes when nothing is predicted and nothing happens), backward blocking (absent patterns do not change), and the timing effects. The salience card says how to see the paper's account with a context line.
- The models page reads a small `INFO` table in the registry rather than the model files, which stay maths only.

### 9. Delamater's network, and designs with more than one outcome

Delamater (2012) is the first model on the site with a hidden layer: the representation of a cue is learned, not given. It needed two additions to the framework: numbered outcomes in the design format (`A+1`, `B+2`) and a way to say which cues are of one modality (`Modalities: AB, CD`), both of which the other models ignore.

- [x] `js/models/delamater.js`: input features (one per cue, one shared per modality, the context), hidden pathways (one per modality, plus a multimodal one, as in the paper's Figure 4), outcome units, the shifted logistic (Eq. 2), and backpropagation with momentum (Appendix Eqs. 1 to 3), averaged over seeded random networks
- [x] Framework: `outcome` on trial types and `outcomes` on designs; `Modalities`; `multiOutcome` models; `probeSeries` for a second outcome's values per probe, plotted by an extra chart with `when(run)`; `h.outcome` in checks; a `panel` the spec draws (also used by Pearce)
- [x] Three phenomena from the paper, with explanations for every model: acquired equivalence (Delamater, 1998, Exp. 3), the biconditional discrimination, and the feature-positive effect
- [x] Tests (`tests/delamater.test.js`) with the paper's parameter values and trial counts: the equations worked from the record; two outcomes learned by two units; Figure 5 (reversal faster with different outcomes), Figure 6 (positive patterning ahead early, with a context; negative patterning ahead by the end without one), Figure 7 (biconditional faster with differential outcomes), Figure 8 (positive ahead of negative patterning within one task), Figure 10 (feature-positive faster than feature-negative), and the one-layer network's failure on negative patterning
- [x] The network view (inputs, hidden units by pathway, outcomes), cueless equations about network 1's most active hidden unit, three build stages, a deck, glossary entries, primer section 24 with a logistic-unit widget

Notes from building it:

- The paper's "30-trial blocks" are 30 trials of each trial type: with the paper's learning rate (0.1) and momentum (0.9) the acquired-equivalence discrimination is learned in 8 such blocks (960 trials), as its Figure 5 shows, and not in 240 trials. The page's defaults are faster (learning rate 0.5, starting weights within ±1, 16 networks) so that the network learns within the shared experiments; the paper's orderings hold at both settings, and the tests use the paper's values.
- Three results of the paper did not reproduce with this implementation and are not claimed: the lower panel of Figure 6 (in a negative patterning task with a less salient element, the compound was discriminated from the less salient element first; here the more salient element separates first), the biconditional discrimination being slower than negative patterning in Figure 8 (here it starts slower and overtakes), and the positive component of ambiguous occasion setting being learned faster than the negative component in Figure 9 (here they run together). The paper does not give the number of hidden units beyond its figure, the starting weight range, or how salience was coded, and these results may depend on them.
- With a context, positive patterning leads negative patterning early and then its separation falls back, because the context-alone trials and the element-alone trials pull the same way; the paper reports only the lead. The test pins the first 600 trials.
- The network's acquisition curve is S-shaped, so the shared acquisition check (first step bigger than the last) counts it as not shown, and most of the classic cue-competition effects need more trials than the shared presets give. The cards say so. With 16 networks the random starting weights no longer produce false ticks on the timing presets, which they did with 8.
- Two shared checks were written with strength models in mind and have been generalised. Acquisition now asks that the curve end above half of λ and level off (the last step smaller than the biggest), which an S-shaped learner can meet; the preset runs 60 trials rather than 30, which the network needs to level off. Conditioned inhibition now uses the summation test (AX below half of A, with X alone predicting little or less than nothing), which is how an inhibitor is measured and which a logistic unit, unable to go below zero, can meet. Every model's results on both are unchanged except the network's, which now shows both.
- Averaging over networks can hide a failure: without the hidden layer, each network solves negative patterning by giving up on one element, a different one in different networks, and the mean over sixteen looks like a solution. The build-stage text says so, and the test pins single networks.

### Coherence pass after the growth to seven models

- [x] The phenomenon table moved from the landing page to the models page, where the models are; the landing page points to it. `tools/matrix.mjs` writes it there.
- [x] The big-picture deck's timeline lists all seven models by year, without the "Available now" labels. The About page names what each of the seven was checked against.
- [x] "Why blocking happens, five ways" became seven ways, with sections for Pearce (generalisation from A to AB, then dilution to B) and Delamater (the shared error, with a hidden layer in between). The Rescorla-Wagner failures tutorial names all three models that solve negative patterning.
- [x] The landing page's "comfortable with equations" card links to the models page.

### 10. Phenomena pages: the findings on their own terms

The site so far is organised around the models, with the phenomena as what the models explain. But a student should be able to learn about a phenomenon without any theory: what the finding is, how solid the evidence for it is, and what the experiments that measured it actually looked like. A finding without solid empirical support is not worth modelling, and the site should say so where it applies. The phenomenon cards on the model pages stay as they are; this milestone gives each phenomenon a home of its own.

- [x] `phenomena.html`: one card per phenomenon, in the order of the table, each with a one-line description, how strong the evidence is, and a link to its page. Added to the header's Models group (All models, Phenomena, Compare), so a student can start from either side
- [x] `phenomena/<id>.html`: one page per phenomenon, rendered from a content file, with these sections in this order: what the finding is, in plain words and with the site's design notation; the evidence, with the key papers and an honest statement of how well established the finding is (robust, qualified, or disputed, and in which species and preparations); the experimental designs, how the original and the best later studies were run, what was measured, and what the control conditions were; how the site's preset relates to those designs and what it leaves out; and which models show it, with a link to the table and to each model's card. Where the empirical picture is mixed, the page says so rather than smoothing it over
- [ ] `content/phenomena/evidence.js` (the file and its format exist; every entry is still `unwritten`): the references in a consistent format, with DOIs where they exist, the sentence or two each paper supports, and the strength-of-evidence judgement with its basis. Written from the papers, not from memory, so the folder of papers (`TrainingPapers/Phenomena/`, gitignored) grows as the pages do
- [x] The phenomenon cards on the model pages, the comparison page, and the models page's table link to the phenomenon's page
- [x] Glossary entries link to the phenomenon pages where they exist; the tutorials' "the finding" paragraphs link to them too
- [x] Tests: every phenomenon in `content/phenomena/index.js` has a page and an evidence entry; every reference has an author, a year, a title, and a source; every link resolves; the strength-of-evidence judgement is one of a fixed set. Browser checks for the phenomena page and one phenomenon page
- [ ] Start with the phenomena the models disagree about, since those are where the evidence matters most for teaching: latent inhibition, backward blocking, negative patterning, unblocking, the outcome density effect, and the feature-positive effect. Then the rest. Written so far: blocking and unblocking, from Kamin (1969), the first paper in `TrainingPapers/Phenomena/Blocking/`; both are "established" on one chapter and one preparation, and rise to "robust" when other laboratories and preparations are added. Latent inhibition, from Lubow and Moore (1959) alone, is "qualified": sixteen sheep and goats, significant in one experiment of two, and present for the light but not the rotor; the page says the founding paper is not the strongest demonstration, and the judgement waits on the later literature

Notes before building it:

- A written entry can carry the paper's own numbers as a small table (`results` on a design), so a student sees the suppression ratios Kamin reported beside the design that produced them, and the preset note says where the site's criterion is looser than the paper's result (Kamin's block was complete; the preset only asks for B below half of λ and below D).
- The scaffolding was built first, before any paper was read, so that the structure could be reviewed early and the per-phenomenon work is pure content: every entry in `content/phenomena/evidence.js` is `unwritten`, and its page says so in the evidence and designs sections while still showing the finding, the preset, its criterion, and the computed verdict of every model. A written entry needs a strength, its basis, at least one paper, at least one design, and a note on the preset; the test enforces that, so a half-written entry cannot look finished.
- The strength-of-evidence judgement needs a fixed vocabulary so that pages can be compared: for example "robust" (many replications across preparations), "established" (replicated, but in a narrow range of preparations or with known boundary conditions), "qualified" (real but dependent on conditions that the page names), and "disputed" (replication failures or live disagreement, with the sides named). Each judgement cites what it rests on.
- The experimental-design section should use the site's design notation alongside the prose, so that a student can see exactly how the preset simplifies the original (for example, the original blocking experiments used a conditioned-suppression measure with specific trial counts and controls that the two-line preset does not show).
- Some of the site's phenomena are the streamed-trial findings, where the papers are already in the folder; others, such as unblocking by a bigger US or backward conditioning, need their primary sources gathered first. The folder of phenomenon papers is the input to this milestone, as the model papers were to the Preview checks.

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
