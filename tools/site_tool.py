#!/usr/bin/env python3
"""Build, serve, and check the static site.

    python3 tools/site_tool.py build     write the deployable site to _site/
    python3 tools/site_tool.py serve     serve it at http://localhost:8000/learning-model-demos/
    python3 tools/site_tool.py check     build, serve, and test it in a real browser

The source folders still work as they are with any static server. The build
copies only the site files and stamps every script and stylesheet address
with a version (?v=...), so a browser can never mix a cached old module with
a new one after a deploy. It also refuses to build if any import or link
points at a file that does not exist.

`serve` uses the same /learning-model-demos/ path prefix as GitHub Pages, so
what works here works there.
"""

from __future__ import annotations

import argparse
import functools
import hashlib
import http.server
import json
import re
import shutil
import socketserver
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
BASE = "/learning-model-demos/"

# What gets deployed. Everything else (tests, tools, plan, notes) stays out.
SITE_DIRS = ["css", "js", "content", "decks", "models"]
SITE_ROOT_GLOBS = ["*.html", ".nojekyll"]

# Relative module specifiers in JavaScript: import ... from './x.js',
# import './x.js', export ... from './x.js', and import('./x.js').
JS_SPEC = re.compile(r"""((?:\bfrom|\bimport)\s*\(?\s*)(['"])(\.{1,2}/[^'"?#]+?\.js)\2""")
# Stylesheets and classic scripts in HTML.
HTML_ASSET = re.compile(r"""(\b(?:href|src)=)(["'])((?!https?:|//|#|mailto:)[^"'?#]+?\.(?:css|js))\2""")
# Inline <script type="module"> blocks in HTML.
MODULE_BLOCK = re.compile(r"(<script\s+type=\"module\"[^>]*>)(.*?)(</script>)", re.S)
# Local page links in HTML.
HTML_LINK = re.compile(r"""\bhref=(["'])((?!https?:|//|#|mailto:)[^"'#?]+?\.html)(?:[#?][^"']*)?\1""")


def site_files() -> list[Path]:
    files: list[Path] = []
    for pattern in SITE_ROOT_GLOBS:
        files += [p for p in ROOT.glob(pattern) if p.is_file()]
    for d in SITE_DIRS:
        files += [p for p in (ROOT / d).rglob("*") if p.is_file() and "__pycache__" not in p.parts]
    return sorted(set(files))


def compute_version(files: list[Path]) -> str:
    h = hashlib.sha256()
    for p in files:
        h.update(str(p.relative_to(ROOT)).encode())
        h.update(p.read_bytes())
    return h.hexdigest()[:10]


def git_commit() -> str | None:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def stamp_js(text: str, version: str, here: Path, problems: list[str], rel: str) -> str:
    def repl(m: re.Match) -> str:
        spec = m.group(3)
        if not (here.parent / spec).resolve().is_file():
            problems.append(f"{rel}: imports {spec}, which does not exist")
        return f"{m.group(1)}{m.group(2)}{spec}?v={version}{m.group(2)}"

    return JS_SPEC.sub(repl, text)


def stamp_html(text: str, version: str, here: Path, problems: list[str], rel: str) -> str:
    def asset(m: re.Match) -> str:
        path = m.group(3)
        if not (here.parent / path).resolve().is_file():
            problems.append(f"{rel}: references {path}, which does not exist")
        return f"{m.group(1)}{m.group(2)}{path}?v={version}{m.group(2)}"

    text = HTML_ASSET.sub(asset, text)
    text = MODULE_BLOCK.sub(lambda m: m.group(1) + stamp_js(m.group(2), version, here, problems, rel) + m.group(3), text)
    for m in HTML_LINK.finditer(text):
        if not (here.parent / m.group(2)).resolve().is_file():
            problems.append(f"{rel}: links to {m.group(2)}, which does not exist")
    return text


def build(out: Path = OUT, quiet: bool = False) -> str:
    files = site_files()
    version = compute_version(files)
    problems: list[str] = []
    if out.exists():
        shutil.rmtree(out)
    for src in files:
        rel = src.relative_to(ROOT)
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix == ".js":
            dest.write_text(stamp_js(src.read_text(), version, src, problems, str(rel)))
        elif src.suffix == ".html":
            dest.write_text(stamp_html(src.read_text(), version, src, problems, str(rel)))
        else:
            shutil.copy2(src, dest)
    info = {
        "version": version,
        "commit": git_commit(),
        "built": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "files": len(files),
    }
    # Write the version into any element with id="build-info", so a reader
    # can tell which build they are looking at.
    stamp = f"Site version {version}" + (f", from commit {info['commit']}" if info["commit"] else "") + f", built {info['built'].replace('T', ' at ').replace('+00:00', ' UTC')}."
    for page in out.rglob("*.html"):
        text = page.read_text()
        if 'id="build-info"></' in text:
            page.write_text(re.sub(r'(id="build-info"[^>]*>)(</)', lambda m: m.group(1) + stamp + m.group(2), text))
    (out / "build.json").write_text(json.dumps(info, indent=2) + "\n")
    if problems:
        for p in problems:
            print(f"error: {p}", file=sys.stderr)
        raise SystemExit(f"Build failed: {len(problems)} broken reference(s).")
    if not quiet:
        print(f"Built {len(files)} files into {out.relative_to(ROOT)}/ (version {version}).")
    return version


class SiteHandler(http.server.SimpleHTTPRequestHandler):
    """Serves a folder under BASE, like GitHub Pages serves a project site."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
    }

    def __init__(self, *args, cache: bool = False, **kwargs):
        self.cache = cache
        super().__init__(*args, **kwargs)

    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0].split("#", 1)[0]
        if path.startswith(BASE):
            path = "/" + path[len(BASE):]
        else:
            path = "/__outside_base__"
        return super().translate_path(path)

    def do_GET(self):
        if self.path in ("/", BASE.rstrip("/")):
            self.send_response(302)
            self.send_header("Location", BASE)
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        # GitHub Pages sends max-age=600. --cache imitates it; the default
        # turns caching off so a reload always shows the latest build.
        self.send_header("Cache-Control", "max-age=600" if self.cache else "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if getattr(self.server, "verbose", False):
            super().log_message(fmt, *args)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def make_server(directory: Path, port: int = 0, cache: bool = False, verbose: bool = False) -> Server:
    handler = functools.partial(SiteHandler, directory=str(directory), cache=cache)
    srv = Server(("127.0.0.1", port), handler)
    srv.verbose = verbose
    return srv


def serve_in_background(directory: Path, port: int = 0) -> tuple[Server, str]:
    srv = make_server(directory, port)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}{BASE}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("build", help="write the deployable site to _site/")
    s = sub.add_parser("serve", help="serve the site under /learning-model-demos/")
    s.add_argument("--port", type=int, default=8000)
    s.add_argument("--source", action="store_true", help="serve the source folders instead of _site/")
    s.add_argument("--cache", action="store_true", help="send GitHub Pages cache headers (max-age=600)")
    c = sub.add_parser("check", help="build, serve, and test the built site in a browser")
    c.add_argument("--browsers", default="chromium", help="comma-separated: chromium, firefox, webkit")
    c.add_argument("--no-build", action="store_true", help="test the existing _site/ without rebuilding")
    c.add_argument("--source", action="store_true", help="test the source folders instead of a build")
    args = ap.parse_args()

    if args.cmd == "build":
        build()
    elif args.cmd == "serve":
        directory = ROOT if args.source else OUT
        if not args.source:
            build()
        srv = make_server(directory, args.port, cache=args.cache, verbose=True)
        print(f"Serving {directory.relative_to(ROOT) if directory != ROOT else 'source'} at http://localhost:{args.port}{BASE} (Ctrl+C to stop)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
    elif args.cmd == "check":
        sys.path.insert(0, str(Path(__file__).parent))
        from check_site import run_checks  # noqa: E402

        if args.source:
            directory = ROOT
        else:
            directory = OUT
            if not args.no_build:
                build()
        ok = run_checks(directory, [b.strip() for b in args.browsers.split(",") if b.strip()])
        raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
