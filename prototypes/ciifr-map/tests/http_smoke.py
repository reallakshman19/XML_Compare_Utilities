#!/usr/bin/env python3
"""Actual static delivery check; does not claim browser interaction."""
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urljoin
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]


def main():
    server = subprocess.Popen([sys.executable, 'prototypes/ciifr-map/server.py', '--port', '0', '--no-browser'],
                              cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        line = server.stdout.readline().strip()
        base = line.split('XML Geometry Preview: ', 1)[1]
        response = urlopen(base, timeout=5)
        assert response.status == 200 and 'text/html' in response.headers['Content-Type']
        assert 'XML Geometry Preview' in response.read().decode()
        queue, visited = [urljoin(base, 'app.js')], set()
        while queue:
            url = queue.pop()
            if url in visited:
                continue
            visited.add(url)
            result = urlopen(url, timeout=5)
            assert result.status == 200 and 'javascript' in result.headers['Content-Type']
            text = result.read().decode()
            queue.extend(urljoin(url, match) for match in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+\.js)['\"]", text))
        print('HTTP_MODULE_GRAPH_PASS', len(visited), 'ES modules; browser interaction NOT_RUN')
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    main()
