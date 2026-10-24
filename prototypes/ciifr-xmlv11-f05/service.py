"""Local byte adapter for the unchanged reviewed XMLv1.1 F05 modules."""
import base64
import binascii
import hashlib
import re
import sys
import xml.etree.ElementTree as ET
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'engine'))
from cii_to_richinputxml import make_richxml
from richcii_schema import SCHEMA
from richcii_validate import validate_xml
from richinputxml_to_cii2019 import render

MAX_FILE = 16 * 1024 * 1024
PROFILE = 'CII-V14 / F05 qualified v1.1 layouts'


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
    first, count = None, abs(len(expected) - len(actual))
    for index, (left, right) in enumerate(zip(expected, actual)):
        if left != right:
            count += 1
            if first is None:
                first = index
    if first is None and count:
        first = min(len(expected), len(actual))
    return {'status': 'IDENTICAL' if count == 0 else 'CHANGED',
            'baseline': fingerprint(expected), 'different_bytes': count,
            'first_difference_zero_based': first}


def parse_xml(data):
    # Screen ASCII markup in UTF8/16/32 before ElementTree can resolve entities.
    if re.search(rb'<!\s*(?:DOCTYPE|ENTITY)', data.replace(b'\0', b''), re.I):
        raise ValueError('XML DTD/entities prohibited')
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        raise ValueError(f'Malformed XML: {exc}') from exc
    validate_xml(root)
    return root


def serialize(root):
    ET.indent(root)
    return ET.tostring(root, encoding='utf-8', xml_declaration=True) + b'\n'


def statistics(root):
    counts = validate_xml(root)
    elements = root.findall('./PIPINGMODEL/SECTIONS/SECTION[@name="ELEMENTS"]/PIPINGELEMENT')
    endpoints = {Decimal(field.get('value')) for element in elements for field in list(element[0])[:2]}
    return {'sections': len(root.findall('./PIPINGMODEL/SECTIONS/SECTION')),
            'elements': counts['ELEMENTS'], 'nodes': len(endpoints),
            'node_basis': 'distinct element endpoint values only', 'counts': counts}


def convert(payload):
    if not isinstance(payload, dict) or set(payload) - {'mode', 'input_b64', 'baseline_b64'}:
        raise ValueError('Expected mode, input_b64 and optional baseline_b64 only')
    mode = payload.get('mode')
    if mode not in ('cii', 'xml'):
        raise ValueError('mode must be cii or xml')
    data = decode_file(payload.get('input_b64'), 'Input')
    baseline = None
    if mode == 'cii':
        root, _ = make_richxml(data)
        output = serialize(root)
        if len(output) > MAX_FILE:
            raise ValueError('Generated XML exceeds the 16 MiB reconstruction limit; no output published')
        baseline = data
    else:
        root = parse_xml(data)
        output = render(root)
        if payload.get('baseline_b64') is not None:
            baseline = decode_file(payload['baseline_b64'], 'Baseline')
    comparison = compare_bytes(baseline, render(root) if mode == 'cii' else output)
    return {'ok': True, 'mode': mode, 'schema': SCHEMA, 'profile': PROFILE,
            'input': fingerprint(data), 'output': {**fingerprint(output),
            'data_b64': base64.b64encode(output).decode('ascii')},
            'inspection_b64': base64.b64encode(serialize(root)).decode('ascii') if mode == 'xml' else None,
            'stats': statistics(root), 'comparison': comparison}
