"""Run bounded B001 synthetic-derivative qualification; no product mutations."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import time

from cii_cases import build_cases, reverse_growth
from cii_oracle import audit_case, report_expectation, xml_pointer_expectation
from cii_raw import exact_integer, fingerprint, physical_check, sections


ORIGINAL_SHA = '5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57'
FROZEN_ID = 'a7dd4e1432d960f2969ebbb189ad55004e31d8e3f22a55ee557c94bd74f36163'


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate-root', type=Path, required=True)
    parser.add_argument('--fixture', type=Path, required=True)
    parser.add_argument('--scratch', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--cases', nargs='+')
    parser.add_argument('--preflight', action='store_true')
    return parser.parse_args()


def verify_candidate(root):
    inventory = root/'.agent-worklogs/20261027_0517_xmlv3-3a-integration-01a1746f/full-candidate.json'
    expected = json.loads(inventory.read_text())
    assert expected['identity'] == FROZEN_ID and len(expected['files']) == 16, 'Candidate inventory identity'
    for name, value in expected['files'].items():
        assert fingerprint((root/name).read_bytes()) == value, 'Frozen candidate drift'
    return expected['identity']


def integer_oracle_checks():
    assert exact_integer(b'2.000000E+00') == 2, 'Integral exponent'
    rejected = 0
    for token in (b'2.5', b'NaN', b'Infinity', b'-Infinity'):
        try:
            exact_integer(token)
        except ValueError:
            rejected += 1
    assert rejected == 4, 'Integer oracle truncated fraction/nonfinite'
    return {'integral_exponent': 'PASS', 'fractional_nonfinite_rejections': rejected}


def directory_state(folder):
    return {p.relative_to(folder).as_posix(): fingerprint(p.read_bytes())
            for p in folder.rglob('*') if p.is_file()}


def run_cli(root, folder, command, inputs):
    before = directory_state(folder) if command == 'inspect-dependencies' else None
    started = time.monotonic()
    result = subprocess.run([sys.executable, '-B', str(root/'prototypes/ciifr-xmlv3/cii_xmlv3.py'),
                             command, *map(str, inputs)], capture_output=True, timeout=180)
    if before is not None:
        assert before == directory_state(folder), 'Inspector changed scratch files'
    elapsed = round(time.monotonic()-started, 3)
    (folder/f'{command}.stdout').write_bytes(result.stdout)
    (folder/f'{command}.stderr').write_bytes(result.stderr)
    evidence = {'command': command, 'exit_code': result.returncode, 'seconds': elapsed,
                'stdout': fingerprint(result.stdout), 'stderr': fingerprint(result.stderr)}
    return result, evidence


def run_case(root, scratch, case, source):
    folder = scratch/case['id']
    folder.mkdir()
    raw, xml, output = folder/'derivative.CII', folder/'model.xml', folder/'rebuilt.CII'
    raw.write_bytes(case['data'])
    audit = audit_case(source, case)
    result, trace = run_cli(root, folder, 'to-xml', [raw, xml])
    if result.returncode:
        return {'id': case['id'], 'status': 'REJECTED_CURRENT_CANDIDATE',
                'raw_audit': audit, 'commands': [trace], 'published_xml': xml.exists()}
    xml_before = fingerprint(xml.read_bytes())
    inspected, inspect_trace = run_cli(root, folder, 'inspect-dependencies', [xml])
    assert inspected.returncode == 0, 'Inspector failed; private diagnostics retained'
    projected = json.loads(inspected.stdout)
    assert projected['input'] == xml_before, 'Inspector input fingerprint'
    assert fingerprint(xml.read_bytes()) == xml_before, 'Inspector modified XML'
    report = report_expectation(sections(case['data']), projected)
    graph = xml_pointer_expectation(sections(case['data']), xml.read_bytes())
    assert raw.read_bytes() == case['data'], 'Derivative changed unexpectedly'
    raw.resolve().relative_to(scratch.resolve())
    raw.unlink()  # Only this newly created derivative, never the original input.
    rebuilt, rebuild_trace = run_cli(root, folder, 'to-cii', [xml, output])
    assert rebuilt.returncode == 0, 'XML-only writer failed; private diagnostics retained'
    assert output.read_bytes() == case['data'], 'Derivative byte-exact reconstruction'
    return {'id': case['id'], 'status': 'PASS', 'input_kind': 'SYNTHETIC_SOURCE_DERIVATIVE',
            'raw_audit': audit, 'inspection': report, 'pointer_links': graph,
            'xml': xml_before, 'reconstructed': fingerprint(output.read_bytes()),
            'xml_only_invocation': True, 'case_source_removed_before_writer': not raw.exists(),
            'inspector_read_only': True, 'commands': [trace, inspect_trace, rebuild_trace]}


def preflight(source, cases):
    result = []
    for case in cases:
        audit = audit_case(source, case)
        if case['family'] == 'growth':
            assert reverse_growth(case, source) == source, 'Growth inverse'
            audit['literal_inverse_to_original'] = 'PASS'
        result.append({'id': case['id'], **audit})
    return result


def main():
    args = arguments()
    root, scratch = args.candidate_root.resolve(), args.scratch.resolve()
    assert scratch.is_dir() and not list(scratch.iterdir()), 'Explicit empty private scratch required'
    assert not args.receipt.exists(), 'Receipt must be a fresh destination'
    source = args.fixture.read_bytes()
    assert len(source) == 803776 and fingerprint(source)['sha256'] == ORIGINAL_SHA, 'Frozen private input'
    identity = verify_candidate(root)
    cases = build_cases(source)
    if args.cases:
        selected = set(args.cases)
        assert selected <= {c['id'] for c in cases}, 'Unknown case selection'
        cases = [c for c in cases if c['id'] in selected]
    receipt = {'at_utc': datetime.now(timezone.utc).isoformat(), 'status': 'IN_PROGRESS',
               'candidate_identity': identity, 'source': fingerprint(source),
               'source_kind': 'OWNER_PRIVATE_REF:ciifr-xmlv2-primary-20261024',
               'authorship': 'primary Oracle01a1746f; not distinct non-author review',
               'oracle': 'no product helper imports; shared lab raw decoder disclosed',
               'native_caesar': 'NOT_RUN', 'owner_acceptance': 'NOT_RUN',
               'production_structural_writer': 'UNSUPPORTED', 'cases': []}
    try:
        receipt['integer_oracle'] = integer_oracle_checks()
        receipt['original_physical'] = physical_check(sections(source))
        receipt['preflight'] = preflight(source, cases)
        if not args.preflight:
            for case in cases:
                current = run_case(root, scratch, case, source)
                receipt['cases'].append(current)
                print(json.dumps({'case': case['id'], 'status': current['status']}), flush=True)
        verify_candidate(root)
        assert args.fixture.read_bytes() == source, 'Original input mutated'
        receipt['status'] = 'PREFLIGHT_PASS' if args.preflight else (
            'PASS' if all(c['status'] == 'PASS' for c in receipt['cases']) else 'PARTIAL_QUALIFICATION')
    except (AssertionError, ValueError, OSError, subprocess.TimeoutExpired) as error:
        receipt['status'] = 'FAIL'
        receipt['failure_class'] = type(error).__name__
        receipt['failure_note'] = 'Qualification assertion/IO/timeout; inspect private scratch and source, no product repair'
        raise
    finally:
        receipt['tool_files'] = {p.name: fingerprint(p.read_bytes()) for p in
                                 sorted(Path(__file__).parent.glob('*.py'))}
        with args.receipt.open('x', encoding='utf-8') as target:
            json.dump(receipt, target, indent=2)
            target.write('\n')
    print(json.dumps({'status': receipt['status'], 'executed_cases': len(receipt['cases'])}), flush=True)
    return 0 if receipt['status'] in ('PASS', 'PREFLIGHT_PASS') else 1


if __name__ == '__main__':
    raise SystemExit(main())
