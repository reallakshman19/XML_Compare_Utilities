#!/usr/bin/env python3
"""Local static launcher only. Uploaded XML never leaves the browser."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
ENTRY = '/prototypes/ciifr-map/'


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/':
            self.send_response(302)
            self.send_header('Location', ENTRY)
            self.end_headers()
            return
        parts = path.split('/')
        if any(part.startswith('.') for part in parts if part) or not (
            path.startswith(ENTRY) or path.startswith('/tabs/cii-workspace/') or path.startswith('/workbench3d/')):
            self.send_error(404)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8873)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(ROOT))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        url = f'http://127.0.0.1:{server.server_port}{ENTRY}'
        print('XML Geometry Preview: ' + url, flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
