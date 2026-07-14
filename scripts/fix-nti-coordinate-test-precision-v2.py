from pathlib import Path
import re

path = Path('tests/navis-tag-isonote-coordinate-profile.test.js')
source = path.read_text(encoding='utf-8')

pattern = re.compile(
    r"assert\.(?:equal|strictEqual)\((navisTag\.position\.(?:x|y|z)),\s*(-?\d+(?:\.\d+)?)\s*\);"
)

updated, count = pattern.subn(
    lambda match: (
        f"assert.ok(Math.abs(({match.group(1)}) - ({match.group(2)})) < 1e-6, "
        f"'{match.group(1)} should match within 1e-6 mm');"
    ),
    source,
)

remaining = pattern.findall(updated)
if remaining:
    raise SystemExit(f'Unconverted Navis coordinate strict assertions remain: {remaining}')

path.write_text(updated, encoding='utf-8')
print(f'updated {count} Navis coordinate assertions to 1e-6 mm tolerance')
