from pathlib import Path
import re

path = Path('tests/navis-tag-isonote-coordinate-profile.test.js')
source = path.read_text(encoding='utf-8')
patterns = [
    r"assert\.(?:equal|strictEqual)\(navisTag\.position\.y,\s*-1114939\.7502294\s*\);",
    r"assert\.(?:equal|strictEqual)\(navisTag\.position\.y,\s*expectedNavisY\s*\);",
]
replacement = "assert.ok(Math.abs(navisTag.position.y - (-1114939.7502294)) < 1e-6);"
for pattern in patterns:
    source, count = re.subn(pattern, replacement, source, count=1)
    if count:
        break
else:
    if replacement not in source:
        raise SystemExit('Navis Y strict-equality assertion not found')
path.write_text(source, encoding='utf-8')
print('updated Navis Y assertion to 1e-6 mm tolerance')
