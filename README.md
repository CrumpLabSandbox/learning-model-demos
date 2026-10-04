# Learning Model Demos

Interactive demos of associative learning models, built so students can see how each equation produces the model's behaviour. Run a classic experiment one trial at a time and read every equation four ways: in words, in symbols, with the numbers from the selected trial, and as the code that ran.

**Ways in:** short overview slides for every unit, a maths warm-up for students who need it, a guide to reading the equations, a plain-language glossary, and an Essentials view on each model page. The landing page suggests a starting point by background.

**Models:** Rescorla-Wagner is available. Mackintosh, Pearce-Hall, Wagner's SOP, and MINERVA-AL are planned. See [plan.md](plan.md).

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

The build copies the site files and stamps every script and stylesheet address with a version, so a browser never mixes a cached old file with a new one after an update. The check loads every page the way GitHub Pages serves it and writes screenshots to `_check/`.

`npm test` runs the unit tests (Node 20 or later).

## Publish it

Pushing to `main` builds the site, checks it in a browser, and publishes it to GitHub Pages only if every check passes. This needs Settings, Pages, Source set to **GitHub Actions**. The landing page shows the version it was built from.

Every push also runs the checks in Chromium, Firefox, and WebKit (Safari's engine). Each run's screenshots and report are attached to it under Actions, as artifacts.
