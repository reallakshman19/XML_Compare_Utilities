"""Byte-preserving application boundary around the unchanged XMLv2 r3 engine."""
import base64
import binascii
import hashlib
import sys
import tempfile
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent / 'engine'
sys.path.insert(0, str(ENGINE_DIR))
from engine import make_xml, xml_bytes, load_xml, write_cii, validate
from profile import VERSION, PROFILE

MAX_FILE = 16 * 1024 * 1024


def decode_file(value, label):
    if not isinstance(value, str) or len(value) > (MAX_FILE + 2) // 3 * 4:
        raise ValueError(f'{label}: expected base64 file, maximum 16 MiB')
    try:
        data = base64.b64decode(value, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError(f'{label}: invalid base64') from exc
    if not data or len(data) > MAX_FILE:
        raise ValueError(f'{label}: empty file or larger than 16 MiB')
    return data


def fingerprint(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def compare_bytes(expected, actual):
    if expected is None:
        return {'status': 'NOT_RUN', 'reason': 'No original CII baseline supplied.'}
    different = [i for i in range(min(len(expected), len(actual))) if expected[i] != actual[i]]
    count = len(different) + abs(len(expected) - len(actual))
    first = different[0] if different else min(len(expected), len(actual))
    return {'status': 'IDENTICAL' if count == 0 else 'CHANGED',
            'baseline': fingerprint(expected), 'different_bytes': count,
            'first_difference_zero_based': None if count == 0 else first}


def convert(payload):
    if not isinstance(payload, dict) or set(payload) - {'mode', 'input_b64', 'baseline_b64'}:
        raise ValueError('Expected mode, input_b64 and optional baseline_b64 only')
    mode = payload.get('mode')
    if mode not in ('cii', 'xml'):
        raise ValueError('mode must be cii or xml')
    data = decode_file(payload.get('input_b64'), 'Input')
    baseline = None
    if mode == 'cii':
        root = make_xml(data)
        stats = validate(root)
        output = xml_bytes(root)
        if len(output) > MAX_FILE:
            raise ValueError('Generated XML exceeds the 16 MiB reconstruction limit; no output published')
        baseline = data
    else:
        with tempfile.TemporaryDirectory(prefix='ciifr-xmlv2-') as folder:
            path = Path(folder) / 'input.xml'
            path.write_bytes(data)  # Closed before engine access on Windows.
            root = load_xml(path)
        stats = validate(root)
        output = write_cii(root)
        if payload.get('baseline_b64') is not None:
            baseline = decode_file(payload['baseline_b64'], 'Baseline')
    comparison = compare_bytes(baseline, write_cii(root) if mode == 'cii' else output)
    inspection = output if mode == 'cii' else xml_bytes(root)
    return {'ok': True, 'mode': mode, 'schema': VERSION, 'profile': PROFILE,
            'input': fingerprint(data), 'output': {**fingerprint(output),
            'data_b64': base64.b64encode(output).decode('ascii')},
            'inspection_b64': base64.b64encode(inspection).decode('ascii') if mode == 'xml' else None,
            'stats': stats, 'comparison': comparison}
