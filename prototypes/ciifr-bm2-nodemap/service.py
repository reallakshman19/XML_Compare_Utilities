"""Stateless, informational node-map preview. Never approves or exports CII."""
import base64
import binascii
from contextlib import contextmanager
import hashlib
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent / 'tools' / 'node-transfer'))
from converter_adapter import extract_manifest, engine_identity
from node_catalogue import validate_model, public_catalogue, canonical
from node_mapping import propose
from transfer_plan import _decision, implementation_code_hash

MAX_FILE = 16 * 1024 * 1024
MODES = ('NUMBER', 'NAME', 'BOTH', 'EITHER')
DOFS = ('DX', 'DY', 'DZ')


def identity():
    return {'node_map_core_sha256': implementation_code_hash(), 'engine': engine_identity(),
            'preview_adapter_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}


def decode_file(value, role):
    if not isinstance(value, str) or len(value) > (MAX_FILE + 2) // 3 * 4:
        raise ValueError(f'{role}: expected base64, up to16MiB')
    try:
        data = base64.b64decode(value, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError(f'{role}: invalid base64') from exc
    if not data or len(data) > MAX_FILE:
        raise ValueError(f'{role}: empty or oversized file')
    return data


def payload_check(payload):
    if not isinstance(payload, dict):
        raise ValueError('JSON object required')
    allowed = {'source_b64', 'target_b64', 'reference_b64', 'mode', 'pairs',
               'source_vector', 'target_vector', 'components', 'input_digests'}
    if set(payload) - allowed:
        raise ValueError('Unknown payload fields; paths/approval/export are prohibited')
    if payload.get('mode', 'NAME') not in MODES:
        raise ValueError('Choose NUMBER, NAME, BOTH or EITHER')


@contextmanager
def load_models(payload):
    payload_check(payload)
    with tempfile.TemporaryDirectory(prefix='ciifr-bm2-') as folder:
        models = {}
        for role in ('source', 'target'):
            raw = decode_file(payload.get(role + '_b64'), role)
            path = Path(folder) / (role + '.CII')
            path.write_bytes(raw)
            models[role] = validate_model(extract_manifest(path))
        yield models


def model_summary(model):
    result = public_catalogue(model)
    return {**result, 'bytes': len(model['_raw']), 'units': model['units'],
            'catalogue_scope': 'Element endpoints plus qualified displacement-only nodes'}


def name_rows(raw):
    rows, offset, active = [], 0, False
    for line in raw.splitlines(keepends=True):
        if line.startswith(b'#$ '):
            active = line[3:].strip() == b'NODENAME'
        elif active:
            rows.append((offset, line.rstrip(b'\r\n')))
        offset += len(line)
    return rows


def reference_audit(target, reference):
    # Full grammar + exact no-op is required before using reference row positions.
    with tempfile.TemporaryDirectory(prefix='ciifr-bm2-reference-') as folder:
        path = Path(folder) / 'reference.CII'
        path.write_bytes(reference)
        extract_manifest(path)
    before = target['_raw']
    changed = {i for i, (a, b) in enumerate(zip(before, reference)) if a != b}
    allowed, details = set(), []
    for index, ((at, left), (bt, right)) in enumerate(zip(name_rows(before), name_rows(reference)), 1):
        if at != bt or len(left) != 53 or len(right) != 53:
            continue
        for lo, hi, label in ((2, 27, 'FROM'), (28, 53, 'TO')):
            allowed.update(range(at + lo, at + hi))
            if left[lo:hi] != right[lo:hi]:
                details.append({'record': index, 'side': label,
                                'before': left[lo:hi].decode('ascii').rstrip(),
                                'reference': right[lo:hi].decode('ascii').rstrip()})
    outside = len(changed - allowed) + abs(len(before) - len(reference))
    return {'status': 'NAME_ONLY_REFERENCE' if outside == 0 else 'OTHER_DIFFERENCES',
            'sha256': hashlib.sha256(reference).hexdigest(), 'changed_bytes': len(changed) + abs(len(before) - len(reference)),
            'outside_name_bytes': outside, 'changed_records': len({d['record'] for d in details}),
            'name_changes': details, 'engineering_approval': 'NOT_PROVIDED'}


def analyse(payload):
    with load_models(payload) as models:
        source, target = models['source'], models['target']
        result = {'ok': True, 'source': model_summary(source), 'target': model_summary(target),
                  'mode': payload.get('mode', 'NAME'),
                  'proposals': propose(source, target, payload.get('mode', 'NAME')),
                  'status': 'PROPOSED_NOT_ACCEPTED', 'export': 'EXPORT_DISABLED', 'code_identity': identity()}
        if payload.get('reference_b64'):
            result['reference'] = reference_audit(target, decode_file(payload['reference_b64'], 'reference'))
        return result


def check_selection(payload, source, target):
    current = {'source': source['cii_sha256'], 'target': target['cii_sha256']}
    if payload.get('input_digests') != current:
        raise ValueError('Stale analysis: model digests changed; inspect files again')
    pairs = payload.get('pairs')
    if not isinstance(pairs, list) or not pairs or len(pairs) > 2000:
        raise ValueError('Choose1..2000pairs for informational preview')
    src = {n['node'] for n in source['_catalogue']}
    dst = {n['node'] for n in target['_catalogue']}
    ss, tt = set(), set()
    for pair in pairs:
        if not isinstance(pair, list) or len(pair) != 2 or any(type(n) is not int for n in pair):
            raise ValueError('Each selected pair must contain two integer node numbers')
        sn, tn = pair
        if sn not in src or tn not in dst or sn in ss or tn in tt:
            raise ValueError('Selections must exist and be one-to-one')
        ss.add(sn)
        tt.add(tn)
    return pairs


def preview(payload):
    with load_models(payload) as models:
        source, target = models['source'], models['target']
        pairs = check_selection(payload, source, target)
        sv, tv = payload.get('source_vector'), payload.get('target_vector')
        if any(type(v) is not int or not 1 <= v <= 9 for v in (sv, tv)):
            raise ValueError('Source and target vectors must each be1..9')
        components = payload.get('components')
        if not isinstance(components, list) or not components or len(set(components)) != len(components) or not set(components) <= set(DOFS):
            raise ValueError('Choose distinct DX/DY/DZ components')
        if source['units'] != target['units']:
            raise ValueError('Unit or IZUP metadata differs; no conversion/transform is permitted')
        decisions = [_decision(source, target, sn, tn, sv, tv, dof)
                     for sn, tn in pairs for dof in DOFS if dof in components]
        body = {'input_digests': payload['input_digests'], 'pairs': pairs,
                'source_vector': sv, 'target_vector': tv, 'components': components,
                'decisions': decisions, 'status': 'INFORMATIONAL_PREVIEW_NOT_APPROVED',
                'engineering_mapping': 'NOT_ACCEPTED', 'global_basis': 'NOT_VERIFIED',
                'export': 'EXPORT_DISABLED', 'code_identity': identity()}
        return {'ok': True, **body, 'inspection_digest': hashlib.sha256(canonical(body)).hexdigest()}
