# Learning Model Demos

Interactive demos of associative learning models, built so students can see how each equation produces the model's behaviour. Run a classic experiment one trial at a time and read every equation four ways: in words, in symbols, with the numbers from the selected trial, and as the code that ran.

**Models:** Rescorla-Wagner is available. Mackintosh, Pearce-Hall, Wagner's SOP, and MINERVA-AL are planned. See [plan.md](plan.md).

## Run it

It is a static site with no build step. Serve the folder and open it in a browser:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk does not work, because browsers block ES modules on `file://`.

## Test it

```sh
npm test
```

Tests use Node's built-in runner and import the same model files the site uses. Node 20 or later.

## Publish it

Enable GitHub Pages under Settings, Pages, "Deploy from a branch", with `main` and `/ (root)`. The site has a `.nojekyll` file and needs no other setup.
