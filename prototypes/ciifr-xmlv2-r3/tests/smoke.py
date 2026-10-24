"""Real local-HTTP checks. Supply a private CII externally; never bundle it."""
import argparse
import base64
import hashlib
import json
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


def request(url, payload=None, headers=None, route='/api/convert'):
    body = None if payload is None else json.dumps(payload).encode()
    all_headers = {'Content-Type': 'application/json', **(headers or {})}
    req = urllib.request.Request(url + route, data=body, headers=all_headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read())


def b64(data):
    return base64.b64encode(data).decode()


def run(url, source, artifacts):
    results = []
    def check(name, condition, basis):
        results.append({'name': name, 'status': 'PASS' if condition else 'FAIL',
                        'observation': basis, 'oracle': 'parent-authored HTTP check'})
    status, encoded = request(url, {'mode': 'cii', 'input_b64': b64(source)})
    check('CII reader HTTP', status == 200 and encoded.get('ok'), f'HTTP {status}')
    if status != 200:
        return results
    xml = base64.b64decode(encoded['output']['data_b64'])
    artifacts.mkdir(parents=True, exist_ok=True)
    (artifacts / 'primary.xml').write_bytes(xml)
    check('XML hierarchy', ET.fromstring(xml).tag == 'RichInputXMLv2', 'Parsed actual XML output')
    payload = {'mode': 'xml', 'input_b64': b64(xml), 'baseline_b64': b64(source)}
    status, rebuilt = request(url, payload)
    actual = base64.b64decode(rebuilt.get('output', {}).get('data_b64', ''))
    (artifacts / 'reconstructed.CII').write_bytes(actual)
    check('Actual bytes equal', actual == source, 'Direct bytes compared against uploaded original')
    check('Actual SHA equal', hashlib.sha256(actual).digest() == hashlib.sha256(source).digest(), 'Independent hashlib on actual response bytes')
    check('Comparison labels exact', rebuilt.get('comparison', {}).get('status') == 'IDENTICAL', 'Real original baseline')
    status, alone = request(url, {'mode': 'xml', 'input_b64': b64(xml)})
    check('XML-only HTTP', status == 200 and base64.b64decode(alone['output']['data_b64']) == source, 'Request contains XML only, no baseline or path')
    check('Absent baseline honest', alone.get('comparison', {}).get('status') == 'NOT_RUN', 'No independent baseline supplied')
    different = bytearray(source)
    different[0] ^= 1
    status, changed = request(url, {**payload, 'baseline_b64': b64(different)})
    comparison = changed.get('comparison', {})
    check('Independent differing baseline', comparison.get('status') == 'CHANGED' and comparison.get('different_bytes') == 1 and comparison.get('first_difference_zero_based') == 0, 'One literal byte changed in baseline, output unchanged')
    negative_checks(url, xml, check)
    return results


def negative_checks(url, xml, check):
    invalid = xml.replace(b'<Sections>', b'<Sections><Unexpected/>', 1)
    for name, payload in [('malformed XML', {'mode': 'xml', 'input_b64': b64(b'<broken>')}),
                          ('invalid structure', {'mode': 'xml', 'input_b64': b64(invalid)}),
                          ('DTD blocked', {'mode': 'xml', 'input_b64': b64(b'<!DOCTYPE x><x/>')}),
                          ('bad base64', {'mode': 'cii', 'input_b64': '!'}),
                          ('unknown mode', {'mode': 'no', 'input_b64': b64(b'x')}),
                          ('input path blocked', {'mode': 'cii', 'input_b64': b64(b'x'), 'path': 'x'})]:
        status, result = request(url, payload)
        check(name, status == 422 and not result.get('ok') and 'output' not in result, f'HTTP {status}; no output member')
    for name, headers, expected in [('foreign Origin', {'Origin': 'https://foreign.invalid'}, 403),
                                    ('foreign Host', {'Host': 'foreign.invalid'}, 403),
                                    ('cross site', {'Sec-Fetch-Site': 'cross-site'}, 403),
                                    ('wrong content type', {'Content-Type': 'text/plain'}, 415),
                                    ('oversized declaration', {'Content-Length': str(49 * 1024 * 1024)}, 413)]:
        status, result = request(url, {}, headers)
        check(name, status == expected and not result.get('ok'), f'HTTP {status}')
    status, _ = request(url, route='/server.py')
    check('No arbitrary file access', status == 404, f'HTTP {status}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--artifacts', type=Path, required=True)
    args = parser.parse_args()
    results = run(args.url.rstrip('/'), args.input.read_bytes(), args.artifacts)
    report = {'summary': {status: sum(r['status'] == status for r in results) for status in ('PASS', 'FAIL')}, 'cases': results}
    args.artifacts.mkdir(parents=True, exist_ok=True)
    (args.artifacts / 'http-results.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report['summary']))
    raise SystemExit(1 if report['summary']['FAIL'] else 0)


if __name__ == '__main__':
    main()
