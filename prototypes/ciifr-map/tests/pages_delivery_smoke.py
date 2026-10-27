#!/usr/bin/env python3
"""Stage the actual Pages exclusions and verify bundled sample HTTP custody."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import urljoin
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
ENTRY = Path('prototypes/ciifr-map')


def main():
    workflow = (ROOT / '.github/workflows/deploy.yml').read_text()
    exclusions = re.findall(r"--exclude='([^']+)'", workflow)
    assert exclusions, 'Read the actual deployment exclusion policy'
    receipt = json.loads((ROOT / ENTRY / 'tests/fixtures/manifest.json').read_text())
    temporary_root = ROOT / '.agent-worklogs'
    temporary_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='pages-samples-', dir=temporary_root) as folder:
        stage = Path(folder)
        subprocess.run(['rsync', '-a', *['--exclude=' + item for item in exclusions],
                        str(ROOT) + '/', str(stage) + '/'], check=True)
        app = (stage / ENTRY / 'app.js').read_text()
        match = re.search(r"fetch\(new URL\('([^']+)'\s*\+\s*name,", app)
        assert match, 'Locate the actual bundled-sample request prefix'
        prefix = match.group(1)
        for name, expected in receipt['files'].items():
            packaged = stage / ENTRY / prefix / name
            assert packaged.is_file(), 'Pages artifact omits bundled sample: ' + str(packaged.relative_to(stage))
            data = packaged.read_bytes()
            assert len(data) == expected['bytes'], name + ' packaged byte count changed'
            assert hashlib.sha256(data).hexdigest() == expected['sha256'], name + ' packaged input hash changed'
        server = subprocess.Popen([sys.executable, str(stage / ENTRY / 'server.py'),
                                   '--port', '0', '--no-browser'], cwd=stage,
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            line = server.stdout.readline().strip()
            base = line.split('XML Geometry Preview: ', 1)[1]
            for name, expected in receipt['files'].items():
                response = urlopen(urljoin(base, prefix + name), timeout=5)
                assert response.status == 200 and 'xml' in response.headers['Content-Type']
                data = response.read()
                assert len(data) == expected['bytes']
                assert hashlib.sha256(data).hexdigest() == expected['sha256']
            print('PAGES_RUNTIME_SAMPLES_PASS actual workflow rsync, both original XML hashes and staged HTTP200')
        finally:
            server.terminate()
            server.wait(timeout=5)


if __name__ == '__main__':
    main()
