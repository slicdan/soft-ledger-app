#!/usr/bin/env python3
"""Dev server for SoftLedger: serves ./public on :8001 with caching disabled,
so the browser always loads the latest HTML/JS/CSS.

Usage (from the project root):  python3 dev-server.py  [port]
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # Ignore conditional requests so a stale copy never gets a 304.
        for h in ("If-Modified-Since", "If-None-Match"):
            if h in self.headers:
                del self.headers[h]
        return super().send_head()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"Serving {ROOT} on http://localhost:{PORT} (no-cache)")
        httpd.serve_forever()
