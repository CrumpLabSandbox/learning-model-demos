"""Browser checks for the built site, using Playwright.

Run through `python3 tools/site_tool.py check`. Every page is loaded the way a
student would load it from GitHub Pages: over HTTP, under the
/learning-model-demos/ prefix. A check fails on any console error, uncaught
exception, failed request, missing version stamp, or sideways scrolling on a
phone, as well as on its own assertions.

Screenshots of every page go to _check/<browser>/ for a person to look at,
and a summary goes to _check/report.md.
"""

from __future__ import annotations

import json
import re
import traceback
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

from site_tool import BASE, ROOT, serve_in_background  # tools/ is on sys.path

OUT = ROOT / "_check"
DESKTOP = {"width": 1366, "height": 860}
PHONE = {"width": 390, "height": 780}
MODEL_DECKS = {"rescorla-wagner", "mackintosh", "pearce-hall", "sop", "pearce", "delamater", "minerva-al"}
# Whether the site is marked as in development (js/site-status.js).
IN_DEVELOPMENT = "IN_DEVELOPMENT = true" in (ROOT / "js/site-status.js").read_text()


class Checker:
    def __init__(self, base: str, browser_name: str, built: bool):
        self.base = base
        self.browser_name = browser_name
        self.built = built
        self.results: list[tuple[str, bool, str]] = []
        self.shots = OUT / browser_name
        self.shots.mkdir(parents=True, exist_ok=True)

    # -- helpers -----------------------------------------------------------
    def record(self, name: str, ok: bool, detail: str = "") -> None:
        self.results.append((name, ok, detail))
        mark = "PASS" if ok else "FAIL"
        print(f"  {mark}  {name}" + (f"  ({detail})" if detail and not ok else ""))

    def check(self, name: str, cond: bool, detail: str = "") -> None:
        self.record(name, bool(cond), detail)

    def open(self, ctx, path: str, wait: int = 500) -> Page:
        page = ctx.new_page()
        problems: list[str] = []
        page.on("pageerror", lambda e: problems.append(f"uncaught: {e}"))
        page.on("console", lambda m: problems.append(f"console: {m.text}") if m.type == "error" else None)
        page.on("requestfailed", lambda r: problems.append(f"request failed: {r.url}"))

        def on_response(r):
            if r.status >= 400 and r.url.startswith(self.base.split(BASE)[0]):
                problems.append(f"HTTP {r.status}: {r.url}")
            if self.built and re.search(r"\.(js|css|woff2)(\?|$)", r.url) and "v=" not in r.url and r.request.resource_type in ("script", "stylesheet", "font"):
                problems.append(f"not version-stamped: {r.url}")

        page.on("response", on_response)
        page.problems = problems  # type: ignore[attr-defined]
        page.goto(self.base + path)
        page.wait_for_timeout(wait)
        return page

    def clean(self, page: Page, label: str) -> None:
        probs = page.problems  # type: ignore[attr-defined]
        self.check(f"{label}: no errors or failed requests", not probs, "; ".join(probs[:4]))

    @staticmethod
    def too_wide(page: Page, width: int) -> str:
        """The innermost elements that stick out past the right edge and are
        not inside a scrolling box, so a failure says what to fix."""
        return page.evaluate(
            """(w) => {
              const scrolls = (e) => { for (let a = e.parentElement; a; a = a.parentElement) {
                const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
              // Content can stick out of its own box (text that will not wrap),
              // so measure the content's width as well as the box.
              const right = (e) => { const r = e.getBoundingClientRect(); return getComputedStyle(e).overflowX === 'visible' ? Math.max(r.right, r.left + e.scrollWidth) : r.right; };
              const bad = [...document.body.querySelectorAll('*')].filter((e) => right(e) > w + 1 && !scrolls(e));
              const inner = bad.filter((e) => !bad.some((o) => o !== e && e.contains(o)));
              return inner.slice(0, 3).map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : ''} "${(e.textContent || '').trim().slice(0, 40)}" ends at ${Math.round(right(e))}px`).join('; ') || 'unknown';
            }""",
            width,
        )

    def shot(self, page: Page, name: str, full: bool = False) -> None:
        page.screenshot(path=str(self.shots / f"{name}.png"), full_page=full)

    def run(self, name: str, fn, *args) -> None:
        try:
            fn(*args)
        except Exception as e:  # a crashed check is a failed check
            self.record(f"{name} (crashed)", False, f"{type(e).__name__}: {str(e).splitlines()[0][:200]}")
            traceback.print_exc(limit=1)

    # -- every page ----------------------------------------------------------
    def pages(self, browser) -> None:
        pages = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob("*.html")) + sorted(
            f"{d}/{p.name}" for d in ("decks", "models", "tutorials", "phenomena") for p in (ROOT / d).glob("*.html")
        )
        for size_name, size in (("desktop", DESKTOP), ("phone", PHONE)):
            ctx = browser.new_context(viewport=size)
            for path in pages:
                page = self.open(ctx, path, wait=700)
                label = f"{path} ({size_name})"
                self.clean(page, label)
                if "load-guard.js" in (ROOT / path).read_text():
                    self.check(f"{label}: finished starting", page.evaluate("document.documentElement.hasAttribute('data-ready')"))
                if size_name == "desktop":
                    self.check(f"{label}: development strip matches js/site-status.js", page.is_visible(".dev-strip") == IN_DEVELOPMENT)
                    self.check(f"{label}: footer credits the developer", "Matthew J. C. Crump" in (page.text_content(".site-footer") or ""))
                if size_name == "phone":
                    width = page.evaluate("document.documentElement.scrollWidth")
                    self.check(f"{label}: no sideways scrolling", width <= size["width"] + 1, f"page is {width}px wide; too wide: {self.too_wide(page, size['width'])}")
                self.shot(page, f"{size_name}-{path.replace('/', '-').removesuffix('.html')}", full=(size_name == "desktop"))
                page.close()
            ctx.close()

    def dev_toggle(self, browser) -> None:
        """Turning IN_DEVELOPMENT off in js/site-status.js hides the strip everywhere."""
        ctx = browser.new_context(viewport=DESKTOP)
        for flag in ("true", "false"):
            page = ctx.new_page()
            body = (ROOT / "js/site-status.js").read_text().replace(f"IN_DEVELOPMENT = {str(IN_DEVELOPMENT).lower()}", f"IN_DEVELOPMENT = {flag}")
            assert f"IN_DEVELOPMENT = {flag}" in body
            # Playwright passes the request too if the handler takes two arguments, so bind body in a closure.
            serve = (lambda b: lambda route: route.fulfill(content_type="text/javascript", body=b))(body)
            page.route(re.compile(r".*/js/site-status\.js(\?.*)?$"), serve)
            for path in ("models/sop.html", "decks/sop.html"):
                page.goto(self.base + path)
                page.wait_for_timeout(300)
                self.check(f"development strip with IN_DEVELOPMENT = {flag}: {path}", page.is_visible(".dev-strip") == (flag == "true"))
            page.close()
        ctx.close()

    # -- decks ---------------------------------------------------------------
    def decks(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        for deck in sorted(p.name for p in (ROOT / "decks").glob("*.html")):
            path = f"decks/{deck}"
            page = self.open(ctx, path)
            count = page.eval_on_selector_all(".slide", "s => s.length")
            visible = page.eval_on_selector_all(".slide", "s => s.filter(x => getComputedStyle(x).display !== 'none').length")
            self.check(f"{deck}: shows exactly one slide of {count}", visible == 1, f"{visible} visible")
            self.check(f"{deck}: has slide controls", page.is_visible(".deck-bar") and page.text_content(".deck-count") == f"1 / {count}")
            empty_widgets = 0
            empty_figures = 0
            charts_expected = 0
            charts_drawn = 0
            for i in range(1, count):
                if i % 2:
                    page.keyboard.press("ArrowRight")
                else:
                    page.click('[data-go="next"]')
                page.wait_for_timeout(120)
                empty_widgets += page.eval_on_selector_all(".slide.current .widget", "ws => ws.filter(w => w.innerHTML.length < 50).length")
                empty_figures += page.eval_on_selector_all(".slide.current [data-figure]", "fs => fs.filter(f => !f.querySelector('svg[role=img]') || !f.querySelector('figcaption')).length")
                charts_expected += page.eval_on_selector_all(".slide.current [data-mini]", "s => s.length")
                charts_drawn += page.eval_on_selector_all(".slide.current [data-mini] svg.mini :is(path.mini-line, polyline.tl-line)", "s => s.length > 0 ? 1 : 0")
            self.check(f"{deck}: keys and Next button reach the last slide", page.text_content(".deck-count") == f"{count} / {count}" and page.url.endswith(f"#{count}"))
            self.check(f"{deck}: every widget renders", empty_widgets == 0, f"{empty_widgets} empty")
            if deck[:-5] in MODEL_DECKS:
                self.check(f"{deck}: shows the model's figure", page.query_selector(f"[data-figure='{deck[:-5]}'] svg") is not None and empty_figures == 0, f"{empty_figures} empty")
            self.check(f"{deck}: every model chart draws", charts_drawn >= min(charts_expected, 1) if charts_expected else True, f"{charts_drawn} of {charts_expected}")
            page.click('[data-go="prev"]')
            self.check(f"{deck}: Previous button goes back", page.text_content(".deck-count") == f"{count - 1} / {count}")
            page.keyboard.press("Home")
            page.keyboard.press("n")
            notes = page.eval_on_selector_all(".slide.current .notes", "s => s.length")
            if notes:
                self.check(f"{deck}: N shows speaker notes", page.is_visible(".slide.current .notes"))
            page.keyboard.press("n")
            page.keyboard.press("o")
            self.check(f"{deck}: O opens the slide list", page.is_visible(".deck-outline"))
            page.click('.deck-outline [data-to="2"]')
            self.check(f"{deck}: slide list jumps to slide 3", page.text_content(".deck-count") == f"3 / {count}" and not page.is_visible(".deck-outline"))
            page.goto(self.base + path + "#4")
            page.wait_for_timeout(400)
            self.check(f"{deck}: a link to slide 4 opens slide 4", page.text_content(".deck-count") == f"4 / {count}")
            self.clean(page, deck)
            page.close()
        # A deck whose module fails to load (here, a deliberately broken file)
        # must tell the reader to reload rather than show a broken page.
        page = ctx.new_page()
        page.route("**/js/ui/primer.js*", lambda r: r.fulfill(body="export const nothing = 1;", content_type="text/javascript"))
        page.goto(self.base + "decks/big-picture.html")
        page.wait_for_timeout(3500)
        self.check("a page that fails to start shows a reload message", page.is_visible(".load-warning"))
        page.close()
        page = self.open(ctx, "decks/warm-up.html#5")
        page.click(".slide.current [data-act='pour']")
        page.click(".slide.current [data-act='pour']")
        page.wait_for_timeout(500)
        self.check("warm-up deck: the glass widget fills inside a slide", "0.750" in page.text_content(".slide.current .wr-level"))
        page.close()
        ctx.close()

    # -- model page ----------------------------------------------------------
    def model(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP, accept_downloads=True)
        page = self.open(ctx, "models/rescorla-wagner.html#view=everything")
        label = lambda: page.text_content("#trial-label")
        self.check("model: opens on blocking, trial 21, cue B", page.input_value("#preset") == "blocking" and label() == "Trial 21 of 60" and page.get_attribute('[data-focus="B"]', "aria-pressed") == "true")
        page.click('[data-act="fwd"]')
        self.check("model: Step moves forward", label() == "Trial 22 of 60")
        page.click('[data-act="back"]')
        page.click('[data-act="back"]')
        self.check("model: back moves back", label() == "Trial 20 of 60")
        page.focus("svg.chart")
        page.keyboard.press("ArrowRight")
        self.check("model: arrow keys on the chart", label() == "Trial 21 of 60")
        page.click('[data-act="reset"]')
        self.check("model: reset shows the before-training note", "Before training" in page.text_content("#eq-list"))
        page.click('[data-act="play"]')
        page.wait_for_timeout(900)
        page.click('[data-act="play"]')
        t = int(re.search(r"Trial (\d+)", label()).group(1))
        self.check("model: Play advances", t >= 2, f"stopped at {t}")
        page.click('[data-act="all"]')
        self.check("model: run all", label() == "Trial 60 of 60")
        page.click('#table tr[data-t="21"]')
        self.check("model: clicking a table row selects it", label() == "Trial 21 of 60")
        page.hover('#eq-list .reading.symbols [data-sym="beta"]')
        self.check("model: hovering β lights its slider", len(page.query_selector_all(".slider.linked")) >= 1)
        self.check("model: the idea card has a figure and the deck button", page.query_selector("#idea-card figure svg[role='img']") is not None and "Overview slides" in page.text_content("#idea-card a.btn.primary"))
        self.check("model: the formulas tab shows every equation first", page.is_visible("#formulas") and page.is_hidden("#arith") and len(page.query_selector_all("#formulas .formula-row")) == 3)
        page.hover('#formulas [data-sym="beta"]')
        self.check("model: hovering β in the formulas lights its slider", len(page.query_selector_all(".slider.linked")) >= 1)
        page.click('[data-arith-tab="arithmetic"]')
        self.check("model: the arithmetic tab draws the number line", page.is_visible("#arith svg") and page.is_hidden("#formulas") and page.text_content("#arith-title") == "The arithmetic")
        page.click('[data-arith-tab="formulas"]')
        page.click('[data-focus="C"]')
        self.check("model: an absent cue explains itself", "C is not on this trial" in page.text_content("#eq-list"))
        page.click('[data-focus="B"]')
        page.click('[data-reading="code"]')
        page.wait_for_selector("pre.code", timeout=3000)
        self.check("model: code reading shows the model source", "deltaV" in page.text_content("pre.code"))
        before = page.text_content(".card.active .badge")
        page.click('[data-opt="summedError"]')
        page.wait_for_timeout(200)
        after = page.text_content(".card.active .badge")
        self.check("model: switching off summed error removes blocking", "Shows" in before and "Does not" in after, f"{before} -> {after}")
        page.click('[data-opt="summedError"]')
        page.click('[data-act="start"]')
        page.wait_for_timeout(200)
        build = page.text_content("#build")
        self.check("model: build stage 1 shows acquisition and extinction but not blocking", "✓ Acquisition" in build and "✓ Extinction" in build and "✗ Blocking" in build)
        page.click('[data-act="next"]')
        page.click('[data-act="next"]')
        page.wait_for_timeout(200)
        self.check("model: build stage 3 marks blocking as new", re.search(r"✓ Blocking \(new\)", page.text_content("#build")) is not None)
        page.click('[data-act="done"]')
        page.fill("#design-text", "Phase 1: 20 A+\nPhase 2: 20 AB?")
        page.wait_for_timeout(450)
        self.check("model: a design error names its line", page.text_content("#design-error").startswith("Line 2:"))
        page.fill("#design-text", "Phase 1: 10 A+\nPhase 2: 10 AB+, 10 C-, random")
        page.wait_for_timeout(450)
        self.check("model: a custom design runs", label().endswith("of 30") and page.is_visible("#reshuffle"))
        page.wait_for_timeout(300)
        other = self.open(ctx, page.url.split(BASE, 1)[1])
        self.check("model: the share link restores the design and trial", other.input_value("#design-text") == page.input_value("#design-text") and other.text_content("#trial-label") == label())
        other.close()
        with page.expect_download() as dl:
            page.click("#csv")
        lines = Path(dl.value.path()).read_text().strip().splitlines()
        self.check("model: CSV has one row per trial", len(lines) == 31 and lines[0].startswith("trial,phase,type,lambda"))
        self.clean(page, "model page")
        page.close()

        # Predict first
        page = self.open(ctx, "models/rescorla-wagner.html#view=everything")
        page.click('.card:has(h3:text("Blocking")) [data-predict="1"]')
        page.wait_for_timeout(1500)
        self.check("predict: hides the answer while sketching", page.is_hidden("#eq-panel") and page.is_hidden("#stepper") and not page.query_selector_all("path.series"))
        box = page.eval_on_selector("svg.chart", "s => { const r = s.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }")
        X = lambda tr: box["x"] + 58 + (tr / 60) * (box["w"] - 100)
        page.mouse.move(X(0), box["y"] + box["h"] * 0.45)
        page.mouse.down()
        for tr in range(0, 61, 5):
            page.mouse.move(X(tr), box["y"] + box["h"] * 0.45, steps=2)
        page.mouse.up()
        page.click('[data-sketch-cue="D"]')
        page.mouse.click(X(30), box["y"] + box["h"] * 0.6)
        page.mouse.click(X(60), box["y"] + box["h"] * 0.4)
        self.check("predict: drawing makes sketch lines", len(page.query_selector_all("path.sketch")) == 2)
        self.shot(page, "predict-sketching")
        page.click('[data-pact="reveal"]')
        page.wait_for_timeout(300)
        self.check("predict: reveal compares each line", len(page.query_selector_all(".fb-cue")) == 2 and page.is_visible("#eq-panel"))
        page.click('[data-pact="worst"]')
        page.wait_for_timeout(300)
        self.check("predict: jumps to the biggest difference", label() != "Trial 21 of 60")
        self.shot(page, "predict-revealed")
        self.clean(page, "predict first")
        page.close()
        ctx.close()

        # Essentials view, remembered between visits
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "models/rescorla-wagner.html#view=essentials")
        self.check("essentials: hides the advanced parts", page.is_hidden("#design-text") and page.is_hidden("#table") and page.is_hidden('[data-reading="code"]'))
        self.check("essentials: starts with words only", page.get_attribute('[data-reading="words"]', "aria-pressed") == "true" and page.get_attribute('[data-reading="symbols"]', "aria-pressed") == "false")
        self.shot(page, "model-essentials")
        page.close()
        page = self.open(ctx, "models/rescorla-wagner.html")
        self.check("essentials: remembered on the next visit", page.is_hidden("#table"))
        page.close()
        ctx.close()

    # -- attention models ----------------------------------------------------
    def attention_models(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        cases = [
            # page, preset, option to switch, card whose badge must flip
            ("models/mackintosh.html", "blocking", "directionRule", "Latent inhibition"),
            ("models/pearce-hall.html", "latent-inhibition", "inhibition", "Extinction"),
        ]
        for path, preset, opt, card in cases:
            name = path.split("/")[-1].removesuffix(".html")
            page = self.open(ctx, f"{path}#view=everything&preset={preset}")
            self.check(f"{name}: no preview notice (checked against the paper)", page.query_selector(".preview-note") is None)
            self.check(f"{name}: attention chart draws a line per cue", len(page.query_selector_all("#chart-alpha path.series")) >= 2)
            page.click('[data-act="fwd"]')
            # Follow a cue that is on this trial.
            page.click('#cue-chips [data-focus]:not(:has(.muted))')
            self.check(f"{name}: equations render for the selected trial", len(page.query_selector_all("#eq-list .eq-card")) >= 4)
            badge = lambda: page.text_content(f'.card:has(h3:text("{card}")) .badge')
            before = badge()
            page.click(f'[data-opt="{opt}"]')
            page.wait_for_timeout(250)
            after = badge()
            self.check(f"{name}: switching '{opt}' flips the {card.lower()} badge", before != after, f"{before} -> {after}")
            page.click(f'[data-opt="{opt}"]')
            page.click('[data-act="start"]')
            page.wait_for_timeout(200)
            self.check(f"{name}: build stage 1 runs", "Stage 1 of" in page.text_content("#build"))
            while page.query_selector('#build [data-act="next"]'):
                page.click('#build [data-act="next"]')
                page.wait_for_timeout(150)
            self.check(f"{name}: build reaches the full model", page.query_selector('#build [data-act="done"]') is not None)
            page.click('#build [data-act="done"]')
            page.click('[data-act="reset"]')
            page.click('[data-act="fwd"]')
            page.click(f'.card:has(h3:text("{card}")) [data-predict="1"]')
            page.wait_for_timeout(1500)
            self.check(f"{name}: predicting hides the attention chart", page.is_hidden("#panel-alpha"))
            page.click('[data-pact="skip"]')
            self.shot(page, f"{name}-page")
            self.clean(page, name)
            page.close()
        ctx.close()

    # -- a model that runs moment by moment (SOP) -----------------------------
    def real_time_model(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "models/sop.html#view=everything&preset=acquisition&t=1")
        self.check("sop: no preview notice (checked against the papers)", page.query_selector(".preview-note") is None)
        self.check("sop: inside the trial draws the cue and the US in A1 and A2", len(page.query_selector_all("#timeline polyline.tl-line")) == 4)
        self.check("sop: inside the trial shades the gain and the loss", page.query_selector("#timeline path.tl-gain") is not None and page.query_selector("#timeline path.tl-loss") is not None)
        self.check("sop: starts at the moment the US arrives", page.text_content(".tl-label") == "Moment 9 of 110")
        self.check("sop: three-state bars for the cue and the US", len(page.query_selector_all(".tl-state-row")) == 2)
        page.click('[data-mact="fwd"]')
        self.check("sop: stepping moves one moment", page.text_content(".tl-label") == "Moment 10 of 110")
        page.click('[data-mact="play"]')
        page.wait_for_timeout(700)
        page.click('[data-mact="play"]')
        moment = int(re.search(r"Moment (\d+)", page.text_content(".tl-label")).group(1))
        self.check("sop: play moves through the moments", moment > 11, f"at moment {moment}")
        box = page.locator("#timeline svg").bounding_box()
        page.mouse.click(box["x"] + box["width"] * 0.2, box["y"] + box["height"] / 2)
        self.check("sop: clicking the timeline picks a moment", page.text_content(".tl-label") != f"Moment {moment} of 110")
        self.check("sop: the moment readout works the arithmetic", "elements on the move" in page.text_content(".tl-readout") and "Gain:" in page.text_content(".tl-readout"))
        self.check("sop: chart of what each cue calls up draws", len(page.query_selector_all("#chart-recall path.series")) >= 1)
        self.check("sop: equations render for the selected trial", len(page.query_selector_all("#eq-list .eq-card")) == 5)

        self.clean(page, "sop acquisition")
        page.close()

        # Following a cue in the timeline follows it everywhere.
        page = self.open(ctx, "models/sop.html#view=everything&preset=blocking&t=21&cue=A")
        page.click('.tl-cues [data-tl-focus="B"]')
        page.wait_for_timeout(150)
        self.check("sop: following a cue in the timeline focuses the equations on it", page.get_attribute('#cue-chips [data-focus="B"]', "aria-pressed") == "true")

        # Timing written in the design reaches the model.
        page.fill("#design-text", "Training: 10 A+ [CS 1-5, US 20-21]")
        page.wait_for_timeout(600)
        page.click('[data-act="fwd"]')
        page.wait_for_timeout(150)
        self.check("sop: timing in square brackets is read", page.text_content("#design-error") == "" and page.text_content(".tl-label").endswith("of 121"), page.text_content(".tl-label"))

        badge = lambda: page.text_content('.card:has(h3:text("Extinction")) .badge')
        before = badge()
        page.click('[data-opt="inhibition"]')
        # SOP's badges wait for the sliders to settle, then take a moment to compute.
        page.wait_for_function("b => document.querySelector('.card:has(h3) .badge') && [...document.querySelectorAll('.card h3')].find(h => h.textContent.startsWith('Extinction')).querySelector('.badge').textContent !== b", arg=before, timeout=5000)
        self.check("sop: switching off inhibitory learning flips the extinction badge", before != badge(), f"{before} -> {badge()}")
        page.click('[data-opt="inhibition"]')
        page.click('[data-act="start"]')
        page.wait_for_timeout(200)
        while page.query_selector('#build [data-act="next"]'):
            page.click('#build [data-act="next"]')
            page.wait_for_timeout(200)
        self.check("sop: build reaches the full model", page.query_selector('#build [data-act="done"]') is not None)
        page.click('#build [data-act="done"]')
        page.click('.card:has(h3:text("Backward conditioning")) [data-predict="1"]')
        page.wait_for_timeout(1500)
        self.check("sop: predicting hides inside the trial", page.is_hidden("#inside-panel"))
        page.click('[data-pact="skip"]')
        self.shot(page, "sop-page", full=True)
        self.clean(page, "sop")
        page.close()
        page = self.open(ctx, "models/sop.html#view=essentials")
        self.check("sop: essentials hides the advanced sliders", page.is_hidden('#p-pd1') and page.is_visible('#p-Lp'))
        page.close()
        ctx.close()

    # -- an instance model (MINERVA-AL) -----------------------------------------
    def memory_model(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "models/minerva-al.html#view=everything&preset=backward-blocking&t=45")
        self.check("minerva: no preview notice (checked against the paper)", page.query_selector(".preview-note") is None)
        self.check("minerva: the chart shows the spread across learners", len(page.query_selector_all("#chart path.spread")) >= 2)
        self.check("minerva: the memory view draws", page.is_visible("#memory canvas") and "traces stored before this trial" in page.text_content(".mem-head"))
        page.locator("#memory canvas").scroll_into_view_if_needed()
        box = page.locator("#memory canvas").bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.3, box["y"] + box["height"] * 0.4)
        page.wait_for_timeout(100)
        self.check("minerva: hovering a trace reads it out", "similarity" in page.text_content(".mem-readout"))
        self.check("minerva: six equations on a trial with memory", len(page.query_selector_all("#eq-list .eq-card")) == 6)
        self.check("minerva: the equations are not per cue", page.query_selector("#cue-chips [data-focus]") is None)
        page.click('[data-act="reset"]')
        page.click('[data-act="fwd"]')
        page.wait_for_timeout(150)
        self.check("minerva: trial 1 skips the comparison with an empty memory", len(page.query_selector_all("#eq-list .eq-card")) == 4)
        badge = lambda: page.text_content('.card:has(h3:text("Backward blocking")) .badge')
        before = badge()
        page.click('[data-opt="discrepancy"]')
        page.wait_for_function("b => [...document.querySelectorAll('.card h3')].find(h => h.textContent.startsWith('Backward blocking')).querySelector('.badge').textContent !== b", arg=before, timeout=8000)
        self.check("minerva: storing the event itself loses backward blocking", before != badge(), f"{before} -> {badge()}")
        page.click('[data-opt="discrepancy"]')
        page.click('[data-act="start"]')
        page.wait_for_timeout(300)
        while page.query_selector('#build [data-act="next"]'):
            page.click('#build [data-act="next"]')
            page.wait_for_timeout(300)
        self.check("minerva: build reaches the full model", page.query_selector('#build [data-act="done"]') is not None)
        page.click('#build [data-act="done"]')
        page.eval_on_selector("#p-learners", "el => { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
        page.wait_for_timeout(300)
        self.check("minerva: the learners slider reruns the model", "5" in page.text_content("#o-learners"))
        page.click('.card:has(h3:text("Negative patterning")) [data-predict="1"]')
        page.wait_for_timeout(1500)
        self.check("minerva: predicting hides the memory view", page.is_hidden("#memory-panel"))
        page.click('[data-pact="skip"]')
        self.shot(page, "minerva-page", full=True)
        self.clean(page, "minerva")
        page.close()
        page = self.open(ctx, "models/minerva-al.html#view=essentials")
        self.check("minerva: essentials hides the advanced sliders", page.is_hidden("#p-k") and page.is_visible("#p-L"))
        page.close()
        ctx.close()

    # -- comparison page and tutorials -----------------------------------------
    # -- a configural model (Pearce) ------------------------------------------
    def configural_model(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "models/pearce.html#view=everything&preset=negative-patterning", wait=900)
        self.check("pearce: no preview notice (checked against the paper)", page.query_selector(".preview-note") is None)
        page.click('[data-act="all"]')
        page.wait_for_timeout(300)
        rows = page.query_selector_all("#spec-panel .config-table tbody tr")
        self.check("pearce: the configurations view lists A, B, and AB", len(rows) == 3, f"{len(rows)} rows")
        text = page.text_content("#spec-panel") or ""
        self.check("pearce: the compound carries inhibition", "AB" in text and page.query_selector("#spec-panel tr.current") is not None)
        self.check("pearce: equations render for the configuration", len(page.query_selector_all("#eq-list .eq-card")) >= 6)
        self.check("pearce: the own-strength chart draws a line per cue", len(page.query_selector_all("#chart-own path.series")) >= 2)
        badge = lambda: page.text_content('.card:has(h3:text("Blocking")) .badge')
        before = badge()
        page.click('[data-opt="generalisation"]')
        page.wait_for_timeout(250)
        self.check("pearce: switching off generalisation removes blocking", before != badge(), f"{before} -> {badge()}")
        page.click('[data-opt="generalisation"]')
        page.click('[data-act="start"]')
        page.wait_for_timeout(200)
        self.check("pearce: build stage 1 runs", "Stage 1 of" in page.text_content("#build"))
        while page.query_selector('#build [data-act="next"]'):
            page.click('#build [data-act="next"]')
            page.wait_for_timeout(150)
        self.check("pearce: build reaches the full model", page.query_selector('#build [data-act="done"]') is not None)
        self.shot(page, "pearce-page", full=True)
        self.clean(page, "pearce")
        page.close()

        page = self.open(ctx, "models.html")
        cards = page.query_selector_all(".model-card")
        self.check("models page: one card per model", len(cards) == 7, f"{len(cards)} cards")
        self.check("models page: every card links to its page and slides", all(c.query_selector('a[href^="models/"]') and c.query_selector('a[href^="decks/"]') for c in cards))
        self.shot(page, "models-page", full=True)
        self.clean(page, "models")
        page.close()
        ctx.close()

    # -- a network model (Delamater) ------------------------------------------
    def network_model(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "models/delamater.html#view=everything&preset=acquired-equivalence", wait=1500)
        self.check("delamater: no preview notice (checked against the paper)", page.query_selector(".preview-note") is None)
        self.check("delamater: the second outcome chart is shown for a two-outcome design", page.is_visible("#panel-out2") and len(page.query_selector_all("#chart-out2 path.series")) >= 4)
        page.click('[data-act="all"]')
        page.wait_for_timeout(600)
        cells = page.query_selector_all("#spec-panel .net-cell")
        self.check("delamater: the network view shows inputs, hidden units, and outcomes", len(cells) >= 14, f"{len(cells)} cells")
        self.check("delamater: equations render for the trial", len(page.query_selector_all("#eq-list .eq-card")) >= 4)
        page.select_option("#preset", "negative-patterning")
        page.wait_for_timeout(1200)
        self.check("delamater: a one-outcome design hides the second outcome chart", page.is_hidden("#panel-out2"))
        # Averaged over networks the one-layer version can look as if it solved
        # negative patterning (each network gives up on a different element),
        # so look at a single network, as the page's build-stage text says to.
        page.eval_on_selector("#p-learners", "el => { el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
        page.wait_for_timeout(800)
        badge = lambda: page.text_content('.card:has(h3:text("Negative patterning")) .badge')
        before = badge()
        page.click('[data-opt="hidden"]')
        page.wait_for_timeout(1200)
        self.check("delamater: without the hidden layer a single network fails negative patterning", before.strip().startswith("✓") and badge().strip().startswith("✗"), f"{before} -> {badge()}")
        page.click('[data-opt="hidden"]')
        page.click('[data-act="start"]')
        page.wait_for_timeout(300)
        self.check("delamater: build stage 1 runs", "Stage 1 of" in page.text_content("#build"))
        while page.query_selector('#build [data-act="next"]'):
            page.click('#build [data-act="next"]')
            page.wait_for_timeout(300)
        self.check("delamater: build reaches the full model", page.query_selector('#build [data-act="done"]') is not None)
        self.shot(page, "delamater-page", full=True)
        self.clean(page, "delamater")
        page.close()
        ctx.close()

    def comparison(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "compare.html#preset=blocking", wait=900)
        cards = page.query_selector_all(".cmp-card")
        self.check("compare: one panel per model", len(cards) == 7, f"{len(cards)} panels")
        self.check("compare: every panel draws its lines", all(c.query_selector("path.series") for c in cards))
        self.check("compare: every panel has a verdict", len(page.query_selector_all(".cmp-card .badge")) == 7)
        page.click('#cmp-stepper [data-act="start"]')
        page.click('#cmp-stepper [data-act="fwd"]')
        page.wait_for_timeout(150)
        self.check("compare: one stepper moves every chart", "Trial 1 of 60" in page.text_content("#cmp-label") and all("Trial 1" in r.text_content() for r in page.query_selector_all(".cmp-card .chart-readout")))
        page.locator("#cmp-chart-2 svg").scroll_into_view_if_needed()
        box = page.locator("#cmp-chart-2 svg").bounding_box()
        page.mouse.click(box["x"] + box["width"] * 0.55, box["y"] + box["height"] / 2)
        page.wait_for_timeout(150)
        texts = [r.text_content().split("·")[0] for r in page.query_selector_all(".cmp-card .chart-readout")]
        self.check("compare: clicking one chart moves them all", len(set(texts)) == 1 and "Trial 1 " not in texts[0], "; ".join(texts))
        page.click('[data-model="sop"]')
        page.wait_for_timeout(300)
        self.check("compare: unticking a model removes its panel", len(page.query_selector_all(".cmp-card")) == 6)
        page.select_option("#cmp-preset", "negative-patterning")
        page.wait_for_timeout(600)
        self.check("compare: only MINERVA-AL shows negative patterning", page.text_content('[data-model-card="minerva-al"] .badge').strip().startswith("✓") and page.text_content('[data-model-card="rescorla-wagner"] .badge').strip().startswith("✗"))
        page.click(".cmp-own summary")
        page.fill("#cmp-design", "Training: 10 A+, 10 B-")
        page.wait_for_timeout(800)
        self.check("compare: a custom design runs without verdicts", len(page.query_selector_all(".cmp-card")) == 6 and not page.query_selector_all(".cmp-card .badge") and page.text_content("#cmp-error") == "")
        self.shot(page, "compare-page", full=True)
        self.clean(page, "compare")
        page.close()

        for path in sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "tutorials").glob("*.html")):
            page = self.open(ctx, path, wait=1200)
            name = path.split("/")[-1].removesuffix(".html")
            figs = len(page.query_selector_all("figure[data-mini]"))
            drawn = len(page.query_selector_all("figure[data-mini] svg"))
            self.check(f"{name}: every chart draws", figs > 0 and drawn == figs, f"{drawn} of {figs}")
            strips = page.query_selector_all("[data-verdicts]")
            self.check(f"{name}: every verdict strip covers seven models", all(len(s.query_selector_all(".verdict")) == 7 for s in strips))
            first = page.query_selector("[data-check] [data-opt='0']")
            if first:
                first.click()
                self.check(f"{name}: a check question answers", "Yes" in page.text_content("[data-check] .check-why"))
            self.clean(page, name)
            page.close()

        page = self.open(ctx, "index.html")
        self.check("landing: five tutorials", len(page.query_selector_all("#tutorials .entry-card")) == 5)
        self.check("landing: points at the phenomenon table on the models page", page.query_selector('#phenomena a[href="models.html#phenomena"]') is not None and not page.query_selector(".matrix"))
        page.close()
        page = self.open(ctx, "models.html#phenomena")
        rows = page.query_selector_all(".matrix tbody tr")
        self.check("models page: the phenomenon table covers every phenomenon and model", len(rows) == 21 and all(len(r.query_selector_all("td")) == 7 for r in rows))
        page.close()
        ctx.close()

    # -- streamed trials -------------------------------------------------------
    def streamed_trials(self, browser) -> None:
        """Watch a stream (skipped to the end), judge it, and see the table, ΔP,
        and every model's value for the same frames."""
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "stream.html#stream=positive-low&seed=11")
        self.check("stream: an idle frame is drawn before starting", page.query_selector(".stream-stage .stream-frame") is not None and "60 frames" in page.text_content("#st-count"))
        page.click("#st-start")
        page.wait_for_timeout(1300)
        self.check("stream: frames advance", re.match(r"Frame [2-9]|Frame 1\d", page.text_content("#st-count") or "") is not None, page.text_content("#st-count"))
        page.click("#st-skip")
        page.wait_for_timeout(200)
        self.check("stream: skipping shows the rating slider", page.is_visible("#st-judge") and page.query_selector("#st-rating") is not None)
        page.eval_on_selector("#st-rating", "el => { el.value = '40'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
        page.click("#st-submit")
        page.wait_for_timeout(600)
        result = page.text_content("#st-result") or ""
        self.check("stream: the reveal shows the table, ΔP, and the rating", "17" in result and "0.467" in result and "Your rating" in result and "+40" in result, result[:200])
        self.check("stream: every model reports a value for the same frames", len(page.query_selector_all("#st-result .models-table tbody tr")) == 7)
        self.check("stream: the session log has one row", page.is_visible("#st-log") and len(page.query_selector_all("#st-log tbody tr")) == 1)
        # Frequency estimates, on a two-cue stream.
        page.click(".stream-options summary")
        page.select_option("#st-ask", "frequency")
        page.select_option("#st-preset", "companion-perfect")
        page.click("#st-start")
        page.click("#st-skip")
        page.wait_for_timeout(200)
        self.check("stream: frequency estimates ask for four counts", len(page.query_selector_all("#st-judge .freq-cell input")) == 4)
        for k, v in (("a", "20"), ("b", "4"), ("c", "6"), ("d", "18")):
            page.fill(f"#st-freq-{k}", v)
        page.click("#st-submit")
        page.wait_for_timeout(600)
        result = page.text_content("#st-result") or ""
        self.check("stream: estimates are turned into a ΔP", "Your estimates" in result and "you said 20" in result)
        self.check("stream: the log grows and shows a scatter once ratings exist", len(page.query_selector_all("#st-log tbody tr")) == 2 and page.query_selector("#st-log .log-scatter") is not None)
        page.click("#st-random")
        page.wait_for_timeout(300)
        self.check("stream: a random stream hides which one it is", "hidden" in (page.text_content("#st-which") or ""))
        self.shot(page, "stream-page", full=True)
        self.clean(page, "stream")
        page.close()

        # The model page draws the ΔP reference line for a contingency preset.
        page = self.open(ctx, "models/rescorla-wagner.html#preset=contingency", wait=900)
        labels = page.eval_on_selector_all("#chart .ref-label", "els => els.map(e => e.textContent)")
        self.check("model page: the contingency preset draws ΔP reference lines", labels == ["ΔP = 0.47", "ΔP = 0"], str(labels))
        self.check("model page: the outcome density card averages over streams", "Averaged over 8 streams" in (page.text_content("#cards") or ""))
        page.close()
        ctx.close()

    # -- primer, warm-up, glossary, landing -----------------------------------
    # -- phenomena pages -------------------------------------------------------
    def phenomena_pages(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "phenomena.html")
        cards = page.query_selector_all(".phen-card")
        self.check("phenomena: one card per finding, each with a strength badge", len(cards) == 21 and len(page.query_selector_all(".phen-card .badge.strength")) == 21)
        self.check("phenomena: the header marks Phenomena as current", page.text_content(".site-header nav a[aria-current]") == "Phenomena")
        href = page.get_attribute(".phen-card h3 a", "href")
        self.check("phenomena: the first card links to the first finding's page", href is not None and href.endswith("phenomena/acquisition.html"))
        page.close()
        page = self.open(ctx, "phenomena/extinction.html", wait=900)
        self.check("phenomenon page: the five sections in order", [s.get_attribute("id") for s in page.query_selector_all(".phen-page section")] == ["finding", "evidence", "designs", "preset", "models"])
        self.check("phenomenon page: carries the preset and its criterion", "Extinction: 30 A-" in page.text_content("#finding .design-text") and "Counts as shown when" in page.text_content("#preset"))
        verdicts = page.eval_on_selector_all("#models .model-verdict", "ls => ls.map(l => [l.dataset.modelVerdict, l.classList.contains('yes')])")
        self.check("phenomenon page: a computed verdict for every model", len(verdicts) == 7 and dict(verdicts).get("rescorla-wagner") is True and dict(verdicts).get("delamater") is False, f"{verdicts}")
        self.check("phenomenon page: an unwritten evidence section says so", "has not been written up" in page.text_content("#evidence") and page.query_selector(".badge.strength-unwritten") is not None)
        self.check("phenomenon page: links to the glossary entry and the table", page.query_selector('a[href="../glossary.html#extinction"]') is not None and page.query_selector('a[href="../models.html#phenomena"]') is not None)
        self.check("phenomenon page: the header marks Phenomena as current", page.text_content(".site-header nav a[aria-current]") == "Phenomena")
        self.clean(page, "phenomenon page")
        page.close()
        page = self.open(ctx, "phenomena/blocking.html", wait=900)
        self.check("phenomenon page: a written entry shows its judgement, papers, and the paper's numbers", page.text_content(".badge.strength") == "Established" and len(page.query_selector_all("#evidence .ref-list li")) >= 1 and ".45" in page.text_content("#designs .results-table") and "Kamin" in page.text_content("#evidence"))
        self.check("phenomenon page: the designs are in the site's notation", "Pretraining: 16 A+" in page.text_content("#designs .design-text"))
        self.clean(page, "phenomenon page (written)")
        page.close()
        page = self.open(ctx, "phenomena/backward-blocking.html", wait=900)
        self.check("phenomenon page: backward blocking shows Shanks's three experiments and the DOI", page.text_content(".badge.strength") == "Established" and len(page.query_selector_all("#designs .results-table")) == 3 and page.query_selector('#evidence a[href="https://doi.org/10.1080/14640748508402082"]') is not None)
        page.close()
        page = self.open(ctx, "phenomena/conditioned-inhibition.html", wait=900)
        self.check("phenomenon page: conditioned inhibition shows both of Rescorla's tests", page.text_content(".badge.strength") == "Established" and len(page.query_selector_all("#designs .results-table")) == 2 and "Light + tone" in page.text_content("#designs") and "144 +" in " ".join(page.eval_on_selector_all("#designs .design-text", "es => es.map(e => e.textContent)")))
        page.close()
        page = self.open(ctx, "phenomena/latent-inhibition.html", wait=900)
        self.check("phenomenon page: a qualified judgement shows its badge, both tables, and the caution", page.text_content(".badge.strength") == "Qualified" and len(page.query_selector_all("#designs .results-table")) == 2 and "25.8" in page.text_content("#designs") and page.query_selector("#evidence .callout") is not None)
        page.close()
        page = self.open(ctx, "models.html#phenomena")
        self.check("models: the table's row headers link to the findings", page.get_attribute(".matrix tbody th a", "href") == "phenomena/acquisition.html")
        page.close()
        page = self.open(ctx, "models/rescorla-wagner.html#view=everything")
        self.check("model: each phenomenon card links to its finding's page", len(page.query_selector_all('#cards a[href^="../phenomena/"]')) == 21)
        page.close()
        page = self.open(ctx, "glossary.html#blocking")
        self.check("glossary: a finding's entry links to its page", page.query_selector('#blocking a[href="phenomena/blocking.html"]') is not None)
        page.close()
        ctx.close()

    def learning_pages(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "primer.html")
        self.check("primer: 24 sections with widgets", len(page.query_selector_all("article section")) == 24 and len(page.query_selector_all(".widget svg, .widget math")) > 10)
        page.click('#contingency [data-ct-preset="2"]')
        self.check("primer: the contingency table recomputes ΔP", "0" in (page.text_content("#contingency .ct-dp") or "") and "24" in page.input_value('#contingency [data-ct="a"]'))
        page.eval_on_selector("#sd-c", "el => { el.value = '-2'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
        self.check("primer: a low criterion calls nearly everything strong", "nearly everything" in page.text_content("#criterion .sd-out"))
        page.click('#vectors [data-vec="B"]')
        self.check("primer: ticking B adds its features to the event", page.eval_on_selector_all("#vectors .vec-event .vec-cell.on", "c => c.length") == 16)
        page.click('#echo [data-ec-probe="AB"]')
        self.check("primer: the AB probe brings back the opposite of the outcome", "opposite of the outcome" in page.text_content("#echo .ec-say"))
        self.check("primer: states section runs SOP", len(page.query_selector_all("#states .st-chart path")) == 2)
        page.eval_on_selector("#ov-us", "el => { el.value = '30'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
        self.check("primer: a long gap leaves nothing to add up", "almost nothing" in page.text_content("#overlap .ov-say"))
        page.click("#states [data-check] [data-opt='0']")
        self.check("primer: states question answered", "Yes" in page.text_content("#states .check-why"))
        self.check("primer: attention section draws three models", len(page.query_selector_all("#changing .ch-chart path")) == 3)
        page.click("#bar [data-check] [data-opt='0']")
        self.check("primer: bar question answered", "Yes" in page.text_content("#bar .check-why"))
        page.click('[data-role="modeller"]')
        self.check("primer: role button lights α and β", len(page.query_selector_all("#start .sym.linked")) == 2)
        page.click("#delta [data-check] [data-opt='0']")
        self.check("primer: right answer confirmed", "Yes" in page.text_content("#delta .check-why"))
        page.click("#fixed [data-case='2']")
        page.click("#fixed [data-act='all']")
        page.wait_for_timeout(200)
        self.check("primer: worked example checks against the model", "−1.000" in page.text_content(".fx-table"))
        for _ in range(5):
            page.click("#read [data-act='next']")
        self.check("primer: guided reading finishes", "All together" in page.text_content(".read-words"))
        self.clean(page, "primer")
        page.close()

        page = self.open(ctx, "warm-up.html")
        page.click("#decimals [data-hint]")
        self.check("warm-up: hints appear", "cents" in page.text_content("#decimals .check-hint"))
        page.click("#decimals [data-opt='1']")
        self.check("warm-up: wrong answers are gentle", "There is no score" in page.text_content("#decimals .check-why"))
        page.eval_on_selector("#wgr-t", "el => { el.value = '4'; el.dispatchEvent(new Event('input', { bubbles: true })); }")
        self.check("warm-up: graph slider reads the value", "0.590" in page.text_content(".wgr-say"))
        page.click("#recipe [data-act='pour']")
        page.click("#recipe [data-act='pour']")
        self.check("warm-up: glass fills", "0.750" in page.text_content("#recipe .wr-level"))
        self.clean(page, "warm-up")
        page.close()

        page = self.open(ctx, "glossary.html#blocking")
        self.check("glossary: a link highlights its entry", page.eval_on_selector("#blocking", "e => e.classList.contains('gl-target')"))
        page.fill("#gl-q", "surprise")
        shown = page.eval_on_selector_all(".gl-entry", "es => es.filter(e => !e.hidden).map(e => e.id)")
        self.check("glossary: search filters", "prediction-error" in shown and len(shown) < 8, ",".join(shown))
        page.close()

        # Safari draws equations wider than Chromium and ignores width limits
        # on <math>. Make every equation far too wide and check that each one
        # scrolls inside its own box instead of widening the page.
        phone = browser.new_context(viewport=PHONE)
        for path in ("primer.html", "models/rescorla-wagner.html#view=everything", "models/mackintosh.html#view=everything&cue=B", "models/pearce-hall.html#view=everything&preset=extinction&t=25&cue=A", "models/sop.html#view=everything&t=9", "models/minerva-al.html#view=everything&t=30", "decks/reading-equations.html#5"):
            pg = self.open(phone, path)
            pg.add_style_tag(content="math { font-size: 2.4rem !important; max-width: none !important; overflow: visible !important; }")
            pg.wait_for_timeout(200)
            width = pg.evaluate("document.documentElement.scrollWidth")
            self.check(f"{path}: oversized equations stay inside the page", width <= PHONE["width"] + 1, f"page is {width}px wide; too wide: {self.too_wide(pg, PHONE['width'])}")
            pg.close()
        phone.close()

        page = self.open(ctx, "index.html")
        if self.built:
            page.wait_for_timeout(300)
            self.check("landing: shows the build version", "Site version" in page.text_content("#build-info"))
        self.check("landing: three entry points and every unit", len(page.query_selector_all(".entry-cards .entry-card")) == 3 and len(page.query_selector_all(".units tbody tr")) == 11 and page.query_selector('.units a[href="models/minerva-al.html#view=essentials"]') is not None and not page.query_selector_all(".units tr.soon"))
        lines = page.eval_on_selector_all(".hero .hero-chart path.mini-line", "els => els.map(e => e.getAttribute('d').length)")
        self.check("landing: the hero chart is drawn by the model", len(lines) == 3 and all(n > 100 for n in lines), f"lines: {lines}")
        page.close()

        # The look: self-hosted fonts load, and the header marks where you are.
        page = self.open(ctx, "models/sop.html")
        page.evaluate("document.fonts.ready")
        fonts = page.evaluate("['Figtree', 'Bricolage Grotesque'].map(f => [...document.fonts].some(ff => ff.family.replace(/\"/g, '') === f && ff.status === 'loaded'))")
        self.check("look: Figtree and Bricolage Grotesque load", all(fonts), f"loaded: {fonts}")
        current = page.eval_on_selector_all(".site-header nav a[aria-current]", "els => els.map(e => [e.textContent, getComputedStyle(e).backgroundColor])")
        self.check("look: the header marks the current page", len(current) == 1 and current[0][0] == "All models" and current[0][1] not in ("rgba(0, 0, 0, 0)", "transparent"), f"{current}")
        page.close()
        ctx.close()


def run_checks(directory: Path, browsers: list[str]) -> bool:
    srv, base = serve_in_background(directory)
    built = directory != ROOT
    summary: dict[str, dict] = {}
    try:
        with sync_playwright() as pw:
            for name in browsers:
                print(f"\n== {name} ({'built site' if built else 'source'}, {base}) ==")
                browser = getattr(pw, name).launch()
                c = Checker(base, name, built)
                for section in (c.pages, c.dev_toggle, c.decks, c.model, c.attention_models, c.real_time_model, c.memory_model, c.configural_model, c.network_model, c.comparison, c.streamed_trials, c.phenomena_pages, c.learning_pages):
                    print(f"- {section.__name__}")
                    c.run(section.__name__, section, browser)
                browser.close()
                failed = [r for r in c.results if not r[1]]
                summary[name] = {"passed": len(c.results) - len(failed), "failed": [f"{n}: {d}" for n, _, d in failed]}
    finally:
        srv.shutdown()

    OUT.mkdir(exist_ok=True)
    lines = ["# Site check", ""]
    for name, s in summary.items():
        lines.append(f"## {name}: {s['passed']} passed, {len(s['failed'])} failed")
        lines += [f"- {f}" for f in s["failed"]] or ["- everything passed"]
        lines.append("")
    lines.append(f"Screenshots: `_check/<browser>/`.")
    (OUT / "report.md").write_text("\n".join(lines) + "\n")
    (OUT / "report.json").write_text(json.dumps(summary, indent=2) + "\n")
    print("\n" + "\n".join(lines))
    return all(not s["failed"] for s in summary.values())
