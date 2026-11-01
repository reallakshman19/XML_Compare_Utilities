"""XV3-4A section-only lab and standalone XML-only body writer.

No populated FORCMNT/FLANGES product admission or force-field interpretation.
Only the pinned original is qualified; generated artifacts stay in private scratch.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

from forcmnt_codec import decode, encode, require, sha
from forcmnt_falsifiers import (compare_source, lexical_change, negative_checks,
                                serial, wrong_valid_owner)
from forcmnt_physical import source_evidence


ROOT = Path(__file__).resolve().parents[1]
SOURCE_RECEIPT = ROOT / '.agent-worklogs/20261027_1733_xmlv3-4a-card-01a1746f/forcmnt-source-evidence.json'
CANDIDATE = ROOT / '.agent-worklogs/20261027_0517_xmlv3-3a-integration-01a1746f/full-candidate.json'
TOOLS = ('forcmnt_codec.py', 'forcmnt_physical.py', 'forcmnt_falsifiers.py',
         'forcmnt_section_probe.py', 'cii_raw.py')
RAW_INVENTORY = ROOT / '.agent-worklogs/20261027_1033_xmlv3-3b-qualification-01a1746f/file-inventory.json'


def limited_read(path, limit):
    with path.open('rb') as stream:
        data = stream.read(limit + 1)
    require(len(data) <= limit, 'Qualification input size limit')
    return data


def fingerprint(data):
    return {'bytes': len(data), 'sha256': sha(data)}


def json_bytes(value):
    return (json.dumps(value, indent=2) + '\n').encode('utf-8')


def publish_new(path, data):
    require(not path.exists(), 'Destination already exists')
    fd, temp_name = tempfile.mkstemp(prefix='.forcmnt-', dir=path.parent)
    temp = Path(temp_name)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        if os.name == 'nt':
            os.rename(temp, path)
        else:
            os.link(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def pinned_inputs(source):
    pinned = json.loads(SOURCE_RECEIPT.read_text(encoding='utf-8-sig'))
    frozen = json.loads(CANDIDATE.read_text(encoding='utf-8-sig'))
    raw_pin = json.loads(RAW_INVENTORY.read_text(encoding='utf-8-sig'))['files']['qualification/cii_raw.py']
    require(fingerprint((ROOT / 'qualification/cii_raw.py').read_bytes()) == raw_pin,
            'Shared physical oracle differs from frozen3B source')
    for rel, expected in frozen['files'].items():
        require(fingerprint((ROOT / rel).read_bytes()) == expected, 'Frozen candidate changed: ' + rel)
    data = limited_read(source, 16_000_000)
    require(fingerprint(data) == {k: pinned[k] for k in ('bytes', 'sha256')},
            'Source differs from selected qualification fixture')
    return data, pinned, frozen['identity']


def private_scratch(path, receipt):
    private = ROOT / '.private-scratch'
    require(private.resolve().parent == ROOT.resolve(), 'Private root must remain in workspace')
    require((private / '.gitignore').read_text().strip() == '*', 'Private ignore guard missing')
    path = path.resolve()
    require(path.is_relative_to(private.resolve()) and path != private.resolve(),
            'Use an explicit child of workspace .private-scratch')
    require(not receipt.exists(), 'Receipt already exists')
    require(not path.exists() or (path.is_dir() and not any(path.iterdir())),
            'Scratch must be absent or empty')
    path.mkdir(parents=True, exist_ok=True)
    return path


def restrict_writer_open(xml_path, output):
    def audit(event, args):
        if event != 'open' or isinstance(args[0], int):
            return
        candidate = Path(os.fsdecode(args[0])).resolve()
        allowed_temp = candidate.parent == output.parent and candidate.name.startswith('.forcmnt-')
        if candidate != xml_path and not allowed_temp:
            raise PermissionError('XML-only writer open audit denied a non-input path')
    sys.addaudithook(audit)
    try:
        Path(__file__).read_bytes()
    except PermissionError:
        return
    raise ValueError('Writer audit control did not deny unrelated source-code read')


def reconstruct(xml_path, output):
    xml_path, output = xml_path.resolve(), output.resolve()
    require(not output.exists(), 'Destination already exists')
    data = limited_read(xml_path, 8_000_000)
    restrict_writer_open(xml_path, output)
    body, _ = decode(data)
    publish_new(output, body)
    return {'status': 'PASS_XML_ONLY_BODY', **fingerprint(body),
            'python_open_audit': 'only input XML and publisher temp; unrelated-read control denied',
            'os_sandbox_claim': False}


def child_writer(xml_path, output, scratch, label, succeeds=True):
    command = [sys.executable, '-B', str(Path(__file__).resolve()), '--reconstruct',
               str(xml_path), '--output', str(output)]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, timeout=60)
    publish_new(scratch / (label + '.stdout'), result.stdout)
    publish_new(scratch / (label + '.stderr'), result.stderr)
    require((result.returncode == 0) == succeeds, 'Standalone writer unexpected exit: ' + label)
    return {'case': label, 'exit': result.returncode, 'expected_success': succeeds,
            'status': 'PASS', 'stdout': fingerprint(result.stdout), 'stderr': fingerprint(result.stderr)}


def writer_cases(xml, source_body, scratch):
    changed_xml, expected, causal = lexical_change(xml, source_body)
    changed_input, changed_output = scratch / 'synthetic-field.xml', scratch / 'synthetic-body.bin'
    publish_new(changed_input, changed_xml)
    tests = [child_writer(changed_input, changed_output, scratch, 'synthetic-field-causality')]
    require(changed_output.read_bytes() == expected, 'Standalone causal literal splice differs')
    bad = ET.fromstring(xml)
    bad.find('Records/Record/Rows/Row/Field').set('value', '999')
    bad_input, absent_output = scratch / 'bad-value.xml', scratch / 'must-not-exist.bin'
    publish_new(bad_input, serial(bad))
    tests.append(child_writer(bad_input, absent_output, scratch, 'invalid-no-partial', False))
    require(not absent_output.exists(), 'Rejected artifact produced partial output')
    protected = scratch / 'protected-existing.bin'
    sentinel = b'XV3-4A EXISTING DESTINATION MUST SURVIVE\r\n'
    publish_new(protected, sentinel)
    tests.append(child_writer(scratch / 'forcmnt-evidence.xml', protected,
                              scratch, 'no-overwrite', False))
    require(protected.read_bytes() == sentinel, 'Existing destination was overwritten')
    return tests, causal


def experiment(data, pinned, scratch):
    source_body, meta, pointers = source_evidence(data)
    xml = encode(source_body, meta, pointers)
    _, inspection = decode(xml)
    xml_path, output = scratch / 'forcmnt-evidence.xml', scratch / 'FORCMNT-body.bin'
    publish_new(xml_path, xml)
    publish_new(scratch / 'forcmnt-inspection.json', json_bytes(inspection))
    subprocesses = [child_writer(xml_path, output, scratch, 'original-xml-only')]
    comparison = compare_source(data, output.read_bytes(), inspection, pinned)
    negatives = negative_checks(xml)
    wrong_owner = wrong_valid_owner(xml, data)
    writer_results, causal = writer_cases(xml, source_body, scratch)
    return {'section_reconstruction': 'PASS', 'source_comparison': comparison,
            'negative_checks': negatives, 'wrong_valid_owner': wrong_owner,
            'indexed_field_causality': causal, 'writer_processes': subprocesses + writer_results}


def probe(source, scratch, receipt):
    require(receipt is not None and scratch is not None, 'Explicit --scratch and --receipt required')
    data, pinned, candidate = pinned_inputs(source)
    scratch = private_scratch(scratch, receipt)
    results = experiment(data, pinned, scratch)
    unchanged, _, final_candidate = pinned_inputs(source)
    require(data == unchanged and candidate == final_candidate, 'Protected input/candidate changed')
    results.update(status='PASS_SCOPED_SECTION_QUALIFICATION', source=fingerprint(data),
                   frozen_candidate_identity=candidate, source_and_product16_unchanged=True,
                   tool_files={name: fingerprint((Path(__file__).parent / name).read_bytes()) for name in TOOLS},
                   whole_file_conversion='NOT_SUPPORTED', product_admission='NOT_DONE',
                   field_meanings='UNRESOLVED', independent_non_author_assessment='NOT_RUN',
                   native_acceptance='NOT_RUN', owner_acceptance='NOT_RUN',
                   authorship='Primary authored; prior core exposure; raw oracle shares cii_raw.py with3B',
                   protected_holds=['XMLv2 HOLD', 'F3_SOURCE_BLOCKED', 'E1 bounded acceptance preserved'])
    results['private_artifacts'] = {p.name: fingerprint(p.read_bytes()) for p in scratch.iterdir()
                                    if p.is_file()}
    publish_new(receipt, json_bytes(results))
    return {'status': results['status'], **results['source_comparison'],
            'negative_cases': len(results['negative_checks']), 'writer_processes': len(results['writer_processes'])}


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--source', type=Path)
    mode.add_argument('--reconstruct', type=Path)
    parser.add_argument('--scratch', type=Path)
    parser.add_argument('--receipt', type=Path)
    parser.add_argument('--output', type=Path)
    return parser.parse_args()


def main():
    args = arguments()
    try:
        if args.reconstruct:
            require(args.output and not args.scratch and not args.receipt,
                    'Writer takes only --reconstruct and --output')
            result = reconstruct(args.reconstruct, args.output)
        else:
            require(not args.output, '--output belongs to standalone writer mode')
            result = probe(args.source, args.scratch, args.receipt)
        print(json.dumps(result, indent=2))
        return 0
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        failure = {'status': 'FAIL_QUALIFICATION', 'error': str(exc),
                   'whole_file_conversion': 'NOT_SUPPORTED', 'engineering_acceptance': 'NOT_RUN'}
        if args.source and args.receipt and not args.receipt.exists():
            try:
                publish_new(args.receipt, json_bytes(failure))
            except OSError as receipt_error:
                failure['failure_receipt_not_written'] = str(receipt_error)
        print(json.dumps(failure), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
