"""Loopback-only local converter. Uploaded files stay in this Python process."""
import argparse
import json
import socket
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from service import convert

ROOT = Path(__file__).resolve().parent / 'web'
MAX_BODY = 48 * 1024 * 1024
ASSETS = {'/': ('index.html', 'text/html; charset=utf-8'),
          '/app.js': ('app.js', 'text/javascript; charset=utf-8'),
          '/inspect.js': ('inspect.js', 'text/javascript; charset=utf-8'),
          '/styles.css': ('styles.css', 'text/css; charset=utf-8')}


class Handler(BaseHTTPRequestHandler):
    """HTTP adapter with strict host/origin, route and body boundaries."""
    server_version = 'CIIFRLocal/1'

    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def trusted_request(self):
        port = self.server.server_port
        hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
        origins = {f'http://{host}' for host in hosts}
        return (self.headers.get('Host') in hosts
                and self.headers.get('Origin') in (None, *origins)
                and self.headers.get('Sec-Fetch-Site') != 'cross-site')

    def respond(self, code, body, mime='application/json; charset=utf-8'):
        self.send_response(code)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.end_headers()
        self.wfile.write(body)

    def json_response(self, code, value):
        self.respond(code, json.dumps(value, separators=(',', ':')).encode())

    def do_GET(self):
        if not self.trusted_request():
            return self.json_response(403, {'ok': False, 'error': 'Local origin required'})
        if self.path == '/api/health':
            return self.json_response(200, {'ok': True, 'service': 'CIIFR XMLv1.1 F05'})
        if self.path not in ASSETS:
            return self.json_response(404, {'ok': False, 'error': 'Unknown route'})
        name, mime = ASSETS[self.path]
        self.respond(200, (ROOT / name).read_bytes(), mime)

    def do_POST(self):
        if not self.trusted_request():
            return self.json_response(403, {'ok': False, 'error': 'Local origin required'})
        if self.path != '/api/convert':
            return self.json_response(404, {'ok': False, 'error': 'Unknown route'})
        if self.headers.get_content_type() != 'application/json':
            return self.json_response(415, {'ok': False, 'error': 'Use application/json'})
        try:
            length = int(self.headers.get('Content-Length', '-1'))
            if length <= 0 or length > MAX_BODY or self.headers.get('Transfer-Encoding'):
                return self.json_response(413, {'ok': False, 'error': 'Body must be 1..48 MiB'})
            data = self.rfile.read(length)
            if len(data) != length:
                raise ValueError('Incomplete request body')
            result = convert(json.loads(data))
        except (ValueError, TypeError, KeyError, UnicodeError) as exc:
            return self.json_response(422, {'ok': False, 'error': str(exc)[:1800]})
        except (OSError, socket.timeout):
            return self.json_response(500, {'ok': False, 'error': 'Local I/O failed; no output published'})
        self.json_response(200, result)

    def log_message(self, fmt, *args):
        pass  # Do not log uploaded contents or model identifiers.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--open-browser', action='store_true')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://127.0.0.1:{server.server_port}'
    print(json.dumps({'url': url, 'local_only': True}), flush=True)
    if args.open_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
