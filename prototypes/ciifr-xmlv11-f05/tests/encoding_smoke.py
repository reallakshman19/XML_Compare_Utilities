"""Encoding guards against a caller-supplied real primary XML and CII pair."""
import argparse
import base64
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from smoke import request, b64


def variant(text, encoding):
    declaration = 'utf-8' if encoding == 'utf-8' else 'utf-16' if encoding.startswith('utf-16') else 'utf-32'
    text = re.sub(r"encoding=['\"]utf-8['\"]", f"encoding='{declaration}'", text, count=1)
    bom = {'utf-8': b'', 'utf-16-le': b'\xff\xfe', 'utf-16-be': b'\xfe\xff',
           'utf-32-le': b'\xff\xfe\0\0', 'utf-32-be': b'\0\0\xfe\xff'}[encoding]
    return bom + text.encode(encoding)


def run(url, xml, source):
    results = []
    for encoding in ('utf-8', 'utf-16-le', 'utf-16-be'):
        status, actual = request(url, {'mode': 'xml', 'input_b64': b64(variant(xml, encoding))})
        correct = status == 200 and base64.b64decode(actual['output']['data_b64']) == source
        if correct:
            correct = ET.fromstring(base64.b64decode(actual['inspection_b64'])).tag == 'CAESARII'
        results.append({'case': f'{encoding} exact CII and UTF8 inspection', 'status': 'PASS' if correct else 'FAIL'})
    # Small envelope isolates the pre-parse guard from the separate upload cap.
    text = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE CAESARII [<!ENTITY zero "0">]><CAESARII/>'
    for encoding in ('utf-8', 'utf-16-le', 'utf-16-be', 'utf-32-le', 'utf-32-be'):
        status, actual = request(url, {'mode': 'xml', 'input_b64': b64(variant(text, encoding))})
        rejected = status == 422 and 'DTD/entities prohibited' in actual.get('error', '') and 'output' not in actual
        results.append({'case': f'{encoding} DTD/entities rejected', 'status': 'PASS' if rejected else 'FAIL'})
    for encoding in ('utf-32-le', 'utf-32-be'):
        data = variant(xml, encoding)
        status, actual = request(url, {'mode': 'xml', 'input_b64': b64(data)})
        limited = len(data) > 16 * 1024 * 1024 and status == 422 and '16 MiB' in actual.get('error', '')
        results.append({'case': f'{encoding} oversized primary upload rejected', 'status': 'PASS' if limited else 'FAIL'})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--xml', required=True, type=Path)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--report', required=True, type=Path)
    args = parser.parse_args()
    results = run(args.url, args.xml.read_text(encoding='utf-8'), args.input.read_bytes())
    report = {'basis': 'Real primary XML; independent expected original CII bytes',
              'summary': {s: sum(r['status'] == s for r in results) for s in ('PASS', 'FAIL')}, 'cases': results}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2))
    print(json.dumps(report['summary']))
    raise SystemExit(1 if report['summary']['FAIL'] else 0)


if __name__ == '__main__':
    main()
