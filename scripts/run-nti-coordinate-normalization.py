from pathlib import Path
import re

_original_subn = re.subn

def _literal_subn(pattern, replacement, string, count=0, flags=0):
    if isinstance(replacement, str):
        return _original_subn(pattern, lambda _match: replacement, string, count=count, flags=flags)
    return _original_subn(pattern, replacement, string, count=count, flags=flags)

re.subn = _literal_subn
path = Path('scripts/apply-nti-coordinate-normalization.py')
source = path.read_text(encoding='utf-8')
old = '''source = replace_once(source, "  { key: 'tableRowIndex', label: 'Table Row' },", "  { key: 'tableRowIndex', label: 'Table Row' }, { key: 'identitySelectionEvidence', label: 'Identity Selection Evidence' }, { key: 'traceOnlyEvidence', label: 'Trace-only Evidence' }, { key: 'navisProximityEvidence', label: 'Navis Proximity Evidence' },")'''
new = old[:-1] + ''', 'identity evidence headers')'''
if old in source:
    source = source.replace(old, new, 1)
exec(compile(source, str(path), 'exec'), {'__name__': '__main__', '__file__': str(path)})
