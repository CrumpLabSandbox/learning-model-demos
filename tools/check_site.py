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
            if self.built and re.search(r"\.(js|css)(\?|$)", r.url) and "v=" not in r.url and r.request.resource_type in ("script", "stylesheet"):
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
            f"{d}/{p.name}" for d in ("decks", "models") for p in (ROOT / d).glob("*.html")
        )
        for size_name, size in (("desktop", DESKTOP), ("phone", PHONE)):
            ctx = browser.new_context(viewport=size)
            for path in pages:
                page = self.open(ctx, path, wait=700)
                label = f"{path} ({size_name})"
                self.clean(page, label)
                if "load-guard.js" in (ROOT / path).read_text():
                    self.check(f"{label}: finished starting", page.evaluate("document.documentElement.hasAttribute('data-ready')"))
                if size_name == "phone":
                    width = page.evaluate("document.documentElement.scrollWidth")
                    self.check(f"{label}: no sideways scrolling", width <= size["width"] + 1, f"page is {width}px wide; too wide: {self.too_wide(page, size['width'])}")
                self.shot(page, f"{size_name}-{path.replace('/', '-').removesuffix('.html')}", full=(size_name == "desktop"))
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
            charts_expected = 0
            charts_drawn = 0
            for i in range(1, count):
                if i % 2:
                    page.keyboard.press("ArrowRight")
                else:
                    page.click('[data-go="next"]')
                page.wait_for_timeout(120)
                empty_widgets += page.eval_on_selector_all(".slide.current .widget", "ws => ws.filter(w => w.innerHTML.length < 50).length")
                charts_expected += page.eval_on_selector_all(".slide.current [data-mini]", "s => s.length")
                charts_drawn += page.eval_on_selector_all(".slide.current [data-mini] svg.mini path.mini-line", "s => s.length > 0 ? 1 : 0")
            self.check(f"{deck}: keys and Next button reach the last slide", page.text_content(".deck-count") == f"{count} / {count}" and page.url.endswith(f"#{count}"))
            self.check(f"{deck}: every widget renders", empty_widgets == 0, f"{empty_widgets} empty")
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
        self.check("model: build stage 1 shows two phenomena", page.text_content("#build").count("✓") == 2)
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

    # -- primer, warm-up, glossary, landing -----------------------------------
    def learning_pages(self, browser) -> None:
        ctx = browser.new_context(viewport=DESKTOP)
        page = self.open(ctx, "primer.html")
        self.check("primer: 13 sections with widgets", len(page.query_selector_all("article section")) == 13 and len(page.query_selector_all(".widget svg, .widget math")) > 10)
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
        for path in ("primer.html", "models/rescorla-wagner.html#view=everything", "decks/reading-equations.html#5"):
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
        self.check("landing: three entry points and every unit", len(page.query_selector_all(".entry-card")) == 3 and len(page.query_selector_all(".units tbody tr")) == 8)
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
                for section in (c.pages, c.decks, c.model, c.learning_pages):
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
