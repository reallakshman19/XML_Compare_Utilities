"""Encoding/DTD regression using an externally supplied diagnostic CII fixture."""
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--artifacts', type=Path, required=True)
    args = parser.parse_args()
    args.artifacts.mkdir(parents=True, exist_ok=True)
    source = args.input.read_bytes()
    status, result = request(args.url, {'mode': 'cii', 'input_b64': b64(source)})
    if status != 200:
        raise RuntimeError(f'Diagnostic CII failed: {result}')
    text = base64.b64decode(result['output']['data_b64']).decode()
    results = []
    for encoding in ('utf-8', 'utf-16-le', 'utf-16-be'):
        data = variant(text, encoding)
        (args.artifacts / f'valid-{encoding}.xml').write_bytes(data)
        status, actual = request(args.url, {'mode': 'xml', 'input_b64': b64(data)})
        correct = status == 200 and base64.b64decode(actual['output']['data_b64']) == source
        if correct:
            correct = ET.fromstring(base64.b64decode(actual['inspection_b64'])).tag == 'RichInputXMLv2'
        results.append({'case': f'{encoding} exact CII and UTF8 inspection', 'status': 'PASS' if correct else 'FAIL'})
    dtd = '<!DOCTYPE RichInputXMLv2 [<!ENTITY zerotoken "0">]>'
    entity_text = text.replace('?>', '?>' + dtd, 1).replace('value="0"', 'value="&zerotoken;"', 1)
    for encoding in ('utf-8', 'utf-16-le', 'utf-16-be', 'utf-32-le', 'utf-32-be'):
        data = variant(entity_text, encoding)
        status, actual = request(args.url, {'mode': 'xml', 'input_b64': b64(data)})
        rejected = status == 422 and 'DTD/entities prohibited' in actual.get('error', '') and 'output' not in actual
        results.append({'case': f'{encoding} DTD and entity rejected', 'status': 'PASS' if rejected else 'FAIL'})
    report = {'basis': '[SYNTHETIC] supplied diagnostic CII; exact bytes, no native model claim',
              'summary': {s: sum(r['status'] == s for r in results) for s in ('PASS', 'FAIL')}, 'cases': results}
    (args.artifacts / 'encoding-results.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report['summary']))
    raise SystemExit(1 if report['summary']['FAIL'] else 0)


if __name__ == '__main__':
    main()
