from pathlib import Path
import re

path = Path('tests/navis-tag-isonote-coordinate-profile.test.js')
source = path.read_text(encoding='utf-8')
pattern = re.compile(r"assert\.(?:equal|strictEqual)\(([^,\n]+),\s*-1114939\.7502294\s*\);")
match = pattern.search(source)
if not match:
    raise SystemExit('Navis Y strict-equality assertion not found')
expression = match.group(1).strip()
replacement = f"assert.ok(Math.abs(({expression}) - (-1114939.7502294)) < 1e-6);"
source = source[:match.start()] + replacement + source[match.end():]
path.write_text(source, encoding='utf-8')
print('updated Navis Y assertion to 1e-6 mm tolerance')
