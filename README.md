# Learning Model Demos

Interactive demos of associative learning models, built so students can see how each equation produces the model's behaviour. Run a classic experiment one trial at a time and read every equation four ways: in words, in symbols, with the numbers from the selected trial, and as the code that ran.

**Ways in:** short overview slides for every unit, a maths warm-up for students who need it, a guide to reading the equations, a plain-language glossary, and an Essentials view on each model page. The landing page suggests a starting point by background.

**Models:** Rescorla-Wagner, Mackintosh, Pearce-Hall, Wagner's SOP, and MINERVA-AL. Mackintosh, Pearce-Hall, and SOP are marked as previews until they are checked against the simulations in their original papers. A comparison page runs one experiment through every model, and four tutorials work across models. See [plan.md](plan.md).

**Status:** in development. Every page shows a thin strip saying so. To turn it off, set `IN_DEVELOPMENT` to `false` in [`js/site-status.js`](js/site-status.js).

## Run it

The source is a static site with no build step. Serve the folder and open it in a browser:

```sh
python3 tools/site_tool.py serve --source
# open http://localhost:8000/learning-model-demos/
```

Any static server works, but browsers block ES modules on `file://`, so opening `index.html` directly from disk does not work.

## Build and check it

```sh
pip install -r requirements-dev.txt     # Playwright, for the browser checks
python3 tools/site_tool.py build        # the deployable site, in _site/
python3 tools/site_tool.py serve        # build, then serve it like GitHub Pages does
python3 tools/site_tool.py check        # build, then test every page in a real browser
```

The build copies the site files and stamps every script, stylesheet, and font address with a version, so a browser never mixes a cached old file with a new one after an update. The check loads every page the way GitHub Pages serves it and writes screenshots to `_check/`.

`npm test` runs the unit tests (Node 20 or later).

## Publish it

Pushing to `main` builds the site, checks it in a browser, and publishes it to GitHub Pages only if every check passes. This needs Settings, Pages, Source set to **GitHub Actions**. The landing page shows the version it was built from.

Every push also runs the checks in Chromium, Firefox, and WebKit (Safari's engine). Each run's screenshots and report are attached to it under Actions, as artifacts.

## Credit and licence

Developed by [Matthew J. C. Crump](https://www.crumplab.com), Brooklyn College of CUNY.

- Text, slides, figures, and teaching content: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0). See [LICENSE-CONTENT](LICENSE-CONTENT).
- Code (`js/`, `css/`, `tools/`, `tests/`): MIT License. See [LICENSE](LICENSE).
- Fonts (`fonts/`): Figtree and Bricolage Grotesque, under the SIL Open Font License; their licences are beside them.

A credit line for reuse: *Learning Model Demos by Matthew J. C. Crump, https://crumplabsandbox.github.io/learning-model-demos/, licensed under CC BY 4.0.*
