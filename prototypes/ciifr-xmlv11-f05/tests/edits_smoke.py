"""Prove XML values control CII output using independent literal byte splices."""
import argparse
import base64
import copy
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from smoke import request, b64


def submit(url, root):
    return request(url, {'mode': 'xml', 'input_b64': b64(ET.tostring(root, encoding='utf-8', xml_declaration=True))})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--xml', required=True, type=Path)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--report', required=True, type=Path)
    args = parser.parse_args()
    source = args.input.read_bytes()
    base = ET.fromstring(args.xml.read_bytes())
    sections = './PIPINGMODEL/SECTIONS'
    element_path = sections + '/SECTION[@name="ELEMENTS"]/PIPINGELEMENT'
    lines = source.splitlines(keepends=True)
    start = next(i for i, line in enumerate(lines) if line.rstrip(b'\r\n') == b'#$ ELEMENTS')
    results = []
    root = copy.deepcopy(base)
    root.find(element_path)[3][0].set('value', '123.456')
    expected = list(lines)
    expected[start + 4] = expected[start + 4][:2] + b'1.234560E+02'.rjust(13) + expected[start + 4][15:]
    status, output = submit(args.url, root)
    exact = status == 200 and base64.b64decode(output['output']['data_b64']) == b''.join(expected)
    results.append({'case': 'numeric edit exact independent 13-byte splice', 'status': 'PASS' if exact else 'FAIL'})
    root = copy.deepcopy(base)
    label = 'PROTO-EDIT'
    root.find(element_path)[9].set('value', label)
    expected = list(lines)
    expected[start + 10] = b'       ' + str(len(label)).rjust(5).encode() + b' ' + label.encode() + b'\r\n'
    status, output = submit(args.url, root)
    exact = status == 200 and base64.b64decode(output['output']['data_b64']) == b''.join(expected)
    results.append({'case': 'label edit regenerates I5 and only literal row', 'status': 'PASS' if exact else 'FAIL'})
    for name in ('unrepresentable value', 'missing pointer', 'duplicate section'):
        root = copy.deepcopy(base)
        if name == 'unrepresentable value':
            root.find(element_path)[3][0].set('value', '123.456789')
        elif name == 'missing pointer':
            last = root.find(element_path)[14]
            last.remove(last[-1])
        else:
            container = root.find(sections)
            container.append(copy.deepcopy(container[0]))
        status, output = submit(args.url, root)
        rejected = status == 422 and not output.get('ok') and 'output' not in output
        results.append({'case': name + ' rejected without output', 'status': 'PASS' if rejected else 'FAIL'})
    report = {'basis': 'Real primary with DERIVED XML edits; independent direct-source byte expectations',
              'summary': {s: sum(r['status'] == s for r in results) for s in ('PASS', 'FAIL')}, 'cases': results}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2))
    print(json.dumps(report['summary']))
    raise SystemExit(1 if report['summary']['FAIL'] else 0)


if __name__ == '__main__':
    main()
