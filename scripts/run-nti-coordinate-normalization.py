import re
import runpy

_original_subn = re.subn

def _literal_subn(pattern, replacement, string, count=0, flags=0):
    if isinstance(replacement, str):
        return _original_subn(pattern, lambda _match: replacement, string, count=count, flags=flags)
    return _original_subn(pattern, replacement, string, count=count, flags=flags)

re.subn = _literal_subn
runpy.run_path('scripts/apply-nti-coordinate-normalization.py', run_name='__main__')
