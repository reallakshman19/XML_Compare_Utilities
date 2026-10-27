#!/usr/bin/env python3
"""Actual Pages staging + nested VNext/workbench HTTP graph; no browser claim."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from threading import Thread
from urllib.parse import urljoin
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def main():
    workflow = (ROOT / '.github/workflows/deploy.yml').read_text()
    excludes = re.findall(r"--exclude='([^']+)'", workflow)
    assert excludes
    ledger = ROOT / '.agent-worklogs'
    ledger.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='geo-tab-pages-', dir=ledger) as folder:
        stage = Path(folder)
        subprocess.run(['rsync', '-a', *['--exclude=' + x for x in excludes],
                        str(ROOT) + '/', str(stage) + '/'], check=True)
        server = ThreadingHTTPServer(('127.0.0.1', 0),
                                     partial(SimpleHTTPRequestHandler, directory=str(stage)))
        Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}/'
        try:
            html = urlopen(urljoin(base, 'docs/cii-fnr-vnext.html')).read().decode()
            assert 'data-tab="CIIFR_GEO"' in html
            assert 'data-ciifr-geo-panel hidden' in html
            # Workbench lives outside docs; a docs/prototypes route must fail.
            frame_url = urljoin(base, 'prototypes/ciifr-map/index.html')
            geo_html = urlopen(frame_url).read().decode()
            assert 'id="tab-A"' in geo_html and 'id="tab-C"' in geo_html
            entries = [(urljoin(base, 'docs/cii-fnr-vnext.html'), html), (frame_url, geo_html)]
            queue = []
            for parent, markup in entries:
                queue.extend(urljoin(parent, x) for x in
                             re.findall(r'(?:src|href)=["\']([^"\']+\.(?:js|css))["\']', markup))
            visited = set()
            while queue:
                url = queue.pop()
                if url in visited:
                    continue
                visited.add(url)
                response = urlopen(url, timeout=5)
                content = response.read().decode()
                assert response.status == 200
                assert 'javascript' in response.headers['Content-Type'] or 'css' in response.headers['Content-Type']
                queue.extend(urljoin(url, x) for x in re.findall(
                    r"(?:from\s*|import\s*)['\"]([^'\"]+\.js)['\"]", content))
            assert urljoin(base, 'docs/tabs/cii-workspace/cii-fnr-vnext/ui/geo-tab.js') in visited
            samples = stage / 'prototypes/ciifr-map/samples'
            receipt = json.loads((samples / 'manifest.json').read_text())
            for name, expected in receipt['files'].items():
                data = urlopen(urljoin(frame_url, 'samples/' + name), timeout=5).read()
                assert len(data) == expected['bytes']
                assert hashlib.sha256(data).hexdigest() == expected['sha256']
            print('VNEXT_GEO_PAGES_PASS', len(visited), 'served module/style assets; original sample hashes; browser NOT_RUN')
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    main()
