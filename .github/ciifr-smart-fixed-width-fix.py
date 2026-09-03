from pathlib import Path

path = Path('.github/ciifr-smart-fixed-width-patch.py')
text = path.read_text()
old = 'text, count = pattern.subn(replacement, text, count=1)'
new = 'text, count = pattern.subn(lambda _match: replacement, text, count=1)'
if text.count(old) != 1:
    raise SystemExit(f'expected one regex substitution anchor, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
