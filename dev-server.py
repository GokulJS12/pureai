#!/usr/bin/env python3
"""
Pure AI — local development server with clean / extensionless URLs.

Features
────────
  •  /              →  index.html
  •  /innovation    →  innovation.html
  •  /sol-banking   →  sol-banking.html
  •  /assets/x.png  →  served as-is (static files untouched)
  •  /innovation.html         →  301 redirect to /innovation
  •  /sol-banking.html#hero   →  301 redirect to /sol-banking#hero
  •  /innovation/             →  301 redirect to /innovation (drop trailing slash)
  •  unknown path              →  404 (no silent fall-through)
  •  no caching (so iterative changes show up instantly)

Run
───
  python3 dev-server.py              # default :8000
  python3 dev-server.py 3000         # custom port
"""
from __future__ import annotations

import os
import sys
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, urlunsplit


ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanURLHandler(SimpleHTTPRequestHandler):
    """Serves the site with extension-free URLs."""

    # Always resolve paths relative to the script's directory.
    def translate_path(self, path: str) -> str:  # noqa: D401
        return super().translate_path(path)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ───────── disable caching during development ─────────
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    # ───────── pretty logging ─────────
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        sys.stderr.write("  %s  %s\n" % (self.log_date_time_string(), fmt % args))

    # ───────── routing ─────────
    def do_GET(self) -> None:  # noqa: N802
        if self._route():
            return
        super().do_GET()

    def do_HEAD(self) -> None:  # noqa: N802
        if self._route():
            return
        super().do_HEAD()

    def _route(self) -> bool:
        """
        Inspect the requested URL and either:
          • issue a 301 redirect to the canonical clean URL, or
          • rewrite self.path to the on-disk .html file, or
          • fall through (return False) for static files.

        Returns True when the response has been fully sent (or a rewrite
        was performed so the caller should continue serving that path).
        """
        split = urlsplit(self.path)
        path, query, fragment = split.path, split.query, split.fragment

        # Root -> index.html
        if path in ("", "/"):
            self.path = "/index.html"
            return False

        # 301: strip trailing slash on non-directory routes (e.g. /innovation/)
        if len(path) > 1 and path.endswith("/"):
            stripped = path.rstrip("/")
            on_disk = os.path.join(ROOT, stripped.lstrip("/") + ".html")
            if os.path.isfile(on_disk):
                self._redirect(urlunsplit(("", "", stripped, query, fragment)))
                return True

        # 301: legacy `*.html` URL -> canonical clean URL
        if path.endswith(".html"):
            clean = path[: -len(".html")]
            # /index -> /
            if clean.endswith("/index") or clean == "/index":
                clean = clean[: -len("/index")] or "/"
            self._redirect(urlunsplit(("", "", clean, query, fragment)))
            return True

        # Try rewrite: /innovation -> /innovation.html (if no extension)
        if "." not in posixpath.basename(path):
            candidate = path.lstrip("/") + ".html"
            on_disk = os.path.join(ROOT, candidate)
            if os.path.isfile(on_disk):
                # Rewrite the path so SimpleHTTPRequestHandler serves the file.
                self.path = "/" + candidate
                if query:
                    self.path += "?" + query
                return False

        # Static asset or genuine 404 — let base class handle it.
        return False

    # ───────── helpers ─────────
    def _redirect(self, location: str, status: int = 301) -> None:
        self.send_response(status)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    addr = ("127.0.0.1", port)
    httpd = ThreadingHTTPServer(addr, CleanURLHandler)

    banner = (
        "\n  ┌─────────────────────────────────────────────┐\n"
        "  │  Pure AI  ·  Clean-URL dev server           │\n"
        "  └─────────────────────────────────────────────┘\n"
        f"    Serving   : {ROOT}\n"
        f"    Address   : http://{addr[0]}:{addr[1]}/\n"
        f"    Examples  : http://{addr[0]}:{addr[1]}/innovation\n"
        f"                http://{addr[0]}:{addr[1]}/sol-banking\n"
        f"                http://{addr[0]}:{addr[1]}/trading-desk\n"
        "    Stop      : Ctrl-C\n"
    )
    sys.stderr.write(banner)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("\n  Server stopped.\n")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
