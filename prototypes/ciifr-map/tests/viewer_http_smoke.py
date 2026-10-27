#!/usr/bin/env python3
"""Actual HTTP delivery and denylist for the opt-in local 3D viewer; not WebGL/browser acceptance."""
from pathlib import Path
import hashlib
import re
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
EXPECTED = '3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6'

def main():
    server = subprocess.Popen([sys.executable, 'prototypes/ciifr-map/server.py', '--port', '0', '--no-browser'],
                              cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        base = server.stdout.readline().strip().split('XML Geometry Preview: ', 1)[1]
        origin = re.match(r'http://[^/]+', base)[0]
        with urlopen(origin + '/prototypes/ciifr-map/vendor/three-0.160.0/three.module.min.js', timeout=15) as response:
            assert response.status == 200 and 'javascript' in response.headers['Content-Type']
            body = response.read()
            assert hashlib.sha256(body).hexdigest() == EXPECTED, 'wrong bundled Three.js module bytes'
        with urlopen(origin + '/prototypes/ciifr-map/vendor/three-0.160.0/LICENSE') as response:
            assert response.status == 200 and b'Permission is hereby granted' in response.read()
        for path in ('/workbench3d/viewer/workbench-viewer.js', '/workbench3d/viewer/scene-derivation-worker.js'):
            with urlopen(origin + path, timeout=15) as response:
                assert response.status == 200 and 'javascript' in response.headers['Content-Type']
        for path in ('/.backups/log.json', '/.agent-worklogs/20261026_0730_ciifr-geo-viewer-r2/manifest.md', '/AGENTS.md'):
            try:
                urlopen(origin + path, timeout=5)
                raise AssertionError('unsafe route served: ' + path)
            except HTTPError as error:
                assert error.code == 404, (path, error.code)
        print('HTTP_VIEWER_ASSET_PASS sha256 official-r160, MIT, viewer+worker and denylist; browser/GPU NOT_RUN')
    finally:
        server.terminate()
        server.wait(timeout=5)

if __name__ == '__main__':
    main()
