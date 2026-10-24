"""Real BM2 Source/Target/reference HTTP checks; inputs supplied privately."""
import argparse
import base64
import copy
import hashlib
import json
from pathlib import Path
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/node-transfer'))
from displacement_profile import format_like, parse_value
from converter_adapter import extract_manifest
from node_catalogue import validate_model


def b64(data):
    return base64.b64encode(data).decode()


def request(url, payload, route='/api/analyse', headers=None):
    req = urllib.request.Request(url + route, data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read())


def run(args):
    source, target, reference = args.source.read_bytes(), args.target.read_bytes(), args.reference.read_bytes()
    payload = {'source_b64': b64(source), 'target_b64': b64(target), 'reference_b64': b64(reference), 'mode': 'NAME'}
    results = []
    def check(name, passed, observation):
        results.append({'name': name, 'status': 'PASS' if passed else 'FAIL', 'observation': observation,
                        'oracle': 'parent-authored actual HTTP check; no engineering approval'})
    status, analysis = request(args.url, payload)
    check('Actual models analyse', status == 200 and analysis.get('export') == 'EXPORT_DISABLED', f'HTTP{status}')
    if status != 200:
        return results
    for role in ('source', 'target'):
        check(role + ' catalogue', analysis[role]['node_count'] == 517 and len(analysis[role]['auxiliary_only_nodes']) == 6,
              'Current three-file fixture, endpoint+displacement scope')
    ref = analysis['reference']
    check('BM2 raw name reference', ref['changed_records'] == 7 and ref['changed_bytes'] == 56 and ref['outside_name_bytes'] == 0,
          'Independent prior raw audit expected7/56/0')
    check('Input and code identities', analysis['source']['cii_sha256'] == hashlib.sha256(source).hexdigest()
          and analysis['target']['cii_sha256'] == hashlib.sha256(target).hexdigest() and 'code_identity' in analysis,
          'Actual original digests and patched implementation metadata')
    base = {k: v for k, v in payload.items() if k != 'reference_b64'}
    for mode, count in [('NUMBER', 20), ('NAME', 76), ('BOTH', 0), ('EITHER', 96)]:
        status, result = request(args.url, {**base, 'mode': mode})
        check(mode + ' proposal count', status == 200 and len(result['proposals']) == count
              and result['status'] == 'PROPOSED_NOT_ACCEPTED', 'Prior separately computed fixture counts, no implicit acceptance')
    auxiliary = sorted(set(analysis['source']['auxiliary_only_nodes']) & set(analysis['target']['auxiliary_only_nodes']))
    pairs = [[n, n] for n in auxiliary]
    preview = {**base, 'pairs': pairs, 'source_vector': 1, 'target_vector': 1, 'components': ['DX', 'DY', 'DZ'],
               'input_digests': {'source': hashlib.sha256(source).hexdigest(), 'target': hashlib.sha256(target).hexdigest()}}
    status, inspected = request(args.url, preview, '/api/preview')
    check('Real selection informational preview', status == 200 and inspected['status'] == 'INFORMATIONAL_PREVIEW_NOT_APPROVED'
          and inspected['engineering_mapping'] == 'NOT_ACCEPTED' and inspected['export'] == 'EXPORT_DISABLED',
          'Explicit unapproved inspection selection; no map/basis/Owner claim fabricated')
    check('No CII or approval result', not {'output', 'data_b64', 'approval_digest', 'mapping_digest'} & set(inspected),
          'Only scoped decisions and informational digest returned')
    status, changed = request(args.url, {**preview, 'source_vector': 2, 'target_vector': 7}, '/api/preview')
    check('Different vectors change inspection digest', status == 200 and changed['inspection_digest'] != inspected['inspection_digest'],
          'Choices bound to new digest; no authorization asserted')
    negative_checks(args.url, base, preview, check)
    real_noops(args, check)
    return results


def negative_checks(url, base, preview, check):
    altered = copy.deepcopy(preview); altered['input_digests']['source'] = '0' * 64
    invalid = [('stale source digest', altered),
               ('duplicate selected source', {**preview, 'pairs': [preview['pairs'][0], preview['pairs'][0]]}),
               ('absent node', {**preview, 'pairs': [[999999999999, 999999999998]]}),
               ('bad vector', {**preview, 'source_vector': 0}),
               ('rotational DOF excluded', {**preview, 'components': ['RX']}),
               ('duplicate DOFs', {**preview, 'components': ['DX', 'DX']}),
               ('Owner claim field prohibited', {**preview, 'owner_acceptance': 'NOT_A_GRANT'})]
    for name, payload in invalid:
        status, result = request(url, payload, '/api/preview')
        check(name, status == 422 and not result.get('ok'), f'HTTP{status}')
    for route in ('/api/apply', '/api/export', '/api/convert', '/api/approve'):
        status, result = request(url, {}, route)
        check(route + ' absent', status == 404 and not result.get('ok'), f'HTTP{status}')
    for name, headers, expected in [('foreign origin', {'Origin': 'https://foreign.invalid'}, 403),
                                    ('foreign host', {'Host': 'foreign.invalid'}, 403),
                                    ('oversized request', {'Content-Length': str(65 * 1024 * 1024)}, 413)]:
        status, result = request(url, {}, headers=headers)
        check(name, status == expected and not result.get('ok'), f'HTTP{status}')
    status, _ = request(url, {**base, 'source_b64': '!bad!base64'})
    check('Invalid file rejected', status == 422, f'HTTP{status}')


def real_noops(args, check):
    model = validate_model(extract_manifest(args.target))
    count = 0
    for record in model['_records'].values():
        raw = model['_raw']
        for row, start in enumerate(record['line_starts']):
            if row % 10 == 0:
                continue
            for col in range(6):
                token = raw[start + 2 + 13 * col:start + 15 + 13 * col]
                state, value = parse_value(token)
                if state == 'finite':
                    count += 1
                    check(f'Real finite cell{count} no-op', format_like(token, value) == token,
                          'Independent expected bytes are the actual unchanged target token')
    check('All real finite cells checked', count == 18, 'Actual fixture has18finite nonzero cells, separately observed')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    for name in ('source', 'target', 'reference', 'artifacts'):
        parser.add_argument('--' + name, required=True, type=Path)
    args = parser.parse_args()
    results = run(args)
    report = {'summary': {s: sum(r['status'] == s for r in results) for s in ('PASS', 'FAIL')}, 'cases': results}
    args.artifacts.mkdir(parents=True, exist_ok=True)
    (args.artifacts / 'http-results.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report['summary']))
    raise SystemExit(1 if report['summary']['FAIL'] else 0)


if __name__ == '__main__':
    main()
