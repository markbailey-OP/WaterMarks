#!/usr/bin/env python3
"""Local server for Water Marks.

Run:  python serve.py        (or: py serve.py on Windows)
Then Chrome opens http://localhost:8000/game.html

Chrome refuses ES modules from file:// pages, and some Windows setups serve
.js files as text/plain (which Chrome also blocks), so this sets the types.
"""
import http.server
import os
import socketserver
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


os.chdir(os.path.dirname(os.path.abspath(__file__)))
socketserver.TCPServer.allow_reuse_address = True

# 127.0.0.1 keeps it private to this computer.
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as server:
    url = f"http://localhost:{PORT}/game.html"
    print(f"Water Marks is running at {url}  (Ctrl+C to stop)")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
