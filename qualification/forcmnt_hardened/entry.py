"""Pinned, unoptimized entrypoint for the isolated strict-PI section candidate.

Run with python -B entry.py extract|reconstruct ... . No full-file CII admission.
The adjacent manifest is a trusted local consistency baseline, not a signature.
"""
import hashlib
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent
FILES = {'entry.py', 'runtime.py', 'io_guards.py', 'forcmnt_codec.py', 'forcmnt_physical.py'}
POLICY = 'forcmnt-entry-1/xml-declaration-only'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def fingerprint(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def verified_manifest(previous=None, phase='PRE_IMPORT'):
    raw = (ROOT / 'CANDIDATE.json').read_bytes()
    require(len(raw) <= 16000 and (previous is None or raw == previous), 'Manifest changed/size')
    spec = json.loads(raw)
    require(set(spec) == {'schema', 'policy', 'identity', 'files'}, 'Manifest keys')
    require(spec['schema'] == 1 and spec['policy'] == POLICY, 'Manifest policy')
    require(set(spec['files']) == FILES and {p.name for p in ROOT.glob('*.py')} == FILES,
            'Manifest closed executable inventory')
    for name, pin in spec['files'].items():
        require(set(pin) == {'bytes', 'sha256'} and 0 < pin['bytes'] <= 1_000_000, 'Invalid pin')
        require(fingerprint((ROOT / name).read_bytes()) == pin, 'PIN_FAIL ' + phase + ': ' + name)
    identity = hashlib.sha256(''.join(f'{p}\0{v["bytes"]}\0{v["sha256"]}\n'
                    for p, v in sorted(spec['files'].items())).encode('ascii')).hexdigest()
    require(identity == spec['identity'], 'Manifest aggregate identity')
    return raw, spec


def main():
    require(sys.flags.optimize == 0, 'Unoptimized Python required; -O/PYTHONOPTIMIZE refused')
    require(sys.dont_write_bytecode, 'Run with -B; no candidate bytecode writes')
    baseline, spec = verified_manifest()
    try:
        from runtime import prepare
        from io_guards import publish_new
        output, payload, info = prepare(ROOT, sys.argv[1:])
        verified_manifest(baseline, 'PRE_PUBLISH')
        publish_new(output, payload)
    finally:
        verified_manifest(baseline, 'POSTFLIGHT')
    info.update(candidate_identity=spec['identity'], policy=POLICY, code_pins='PRE_POST_MATCH',
                flags={'optimize': sys.flags.optimize, 'dont_write_bytecode': sys.dont_write_bytecode},
                qualification='PRIMARY_SCOPED_ONLY', native_acceptance='NOT_RUN',
                independent_acceptance='NOT_RUN', whole_file_conversion='NOT_SUPPORTED')
    print(json.dumps(info, indent=2))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(json.dumps({'status': 'FAIL_HARDENED_ENTRY', 'error': str(exc),
                          'error_class': type(exc).__name__}), file=sys.stderr)
        raise SystemExit(2)
