"""Real-file boundaries and CLI checks; injected delivery is SIMULATED."""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest import mock


PROTOTYPE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE))
from xmlv3.core import MAX_XML
from xmlv3.intake import read_bounded_xml


SCRATCH = None
SIZE_ERROR = 'XMLv3 input exceeds 150 MB'


@contextmanager
def private_directory():
    with tempfile.TemporaryDirectory(prefix='xmlv3-intake-', dir=SCRATCH) as name:
        path = Path(name).resolve()
        path.relative_to(SCRATCH)
        yield path


class TracedFile:
    """SIMULATED short delivery over an explicitly opened real file."""
    def __init__(self, stream):
        self.stream = stream
        self.requests = []
        self.consumed = 0

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, size):
        self.requests.append((size, self.consumed))
        data = self.stream.read(min(size, 8))
        self.consumed += len(data)
        return data


class Intake(unittest.TestCase):
    def test_real_file_boundaries(self):
        with private_directory() as temp:
            for size in (0, 63, 64, 65, 1024):
                path = temp / f'input-{size}.bin'
                data = b'x' * size
                path.write_bytes(data)
                with self.subTest(size=size):
                    if size <= 64:
                        self.assertEqual(read_bounded_xml(path, limit=64), data)
                    else:
                        with self.assertRaisesRegex(ValueError, SIZE_ERROR):
                            read_bounded_xml(path, limit=64)

    def test_real_growth_after_stat(self):
        with private_directory() as temp:
            path = temp / 'growing.bin'
            path.write_bytes(b'x' * 64)
            self.assertEqual(path.stat().st_size, 64)
            with path.open('ab') as handle:
                handle.write(b'y')
            with self.assertRaisesRegex(ValueError, SIZE_ERROR):
                read_bounded_xml(path, limit=64)

    def assert_budget(self, trace, limit):
        self.assertLessEqual(trace.consumed, limit + 1)
        for request, consumed_before in trace.requests:
            self.assertGreater(request, 0)
            self.assertLessEqual(request, limit + 1 - consumed_before)

    def test_simulated_short_reads_and_remaining_budget(self):
        with private_directory() as temp:
            for size in (63, 64, 65, 1024):
                path = temp / f'short-{size}.bin'
                data = b'x' * size
                path.write_bytes(data)
                with path.open('rb', buffering=0) as stream:
                    trace = TracedFile(stream)
                    with self.subTest(size=size), mock.patch(
                            'xmlv3.intake.Path.open', return_value=trace):
                        if size <= 64:
                            self.assertEqual(read_bounded_xml(path, limit=64), data)
                        else:
                            with self.assertRaisesRegex(ValueError, SIZE_ERROR):
                                read_bounded_xml(path, limit=64)
                    self.assert_budget(trace, 64)
                    self.assertGreater(len(trace.requests), 1)
                    print(json.dumps({'evidence': 'SIMULATED short delivery over real file',
                                      'size': size, 'consumed': trace.consumed,
                                      'requests_and_consumed_before': trace.requests}))

    def test_simulated_would_block_is_not_eof(self):
        with private_directory() as temp:
            path = temp / 'blocked.bin'
            path.write_bytes(b'not empty')
            with path.open('rb', buffering=0) as stream:
                trace = TracedFile(stream)
                with mock.patch('xmlv3.intake.Path.open', return_value=trace), \
                        mock.patch.object(trace, 'read', return_value=None):
                    with self.assertRaisesRegex(OSError, 'would block'):
                        read_bounded_xml(path, limit=64)

    def test_negative_limit_rejects_before_open(self):
        with private_directory() as temp:
            with self.assertRaisesRegex(ValueError, 'nonnegative'):
                read_bounded_xml(temp / 'absent.xml', limit=-1)

    def test_zero_limit(self):
        with private_directory() as temp:
            empty, nonempty = temp / 'empty.xml', temp / 'nonempty.xml'
            empty.write_bytes(b'')
            nonempty.write_bytes(b'x')
            self.assertEqual(read_bounded_xml(empty, limit=0), b'')
            with self.assertRaisesRegex(ValueError, SIZE_ERROR):
                read_bounded_xml(nonempty, limit=0)

    def assert_cli_size_rejection(self, *args):
        command = [sys.executable, '-B', str(PROTOTYPE / 'cii_xmlv3.py'), *map(str, args)]
        result = subprocess.run(command, capture_output=True, timeout=90, check=False)
        self.assertEqual(result.returncode, 2, result.stderr.decode('utf-8', 'replace'))
        self.assertEqual(result.stdout, b'')
        self.assertEqual(result.stderr.decode().strip(), 'XMLv3: ' + SIZE_ERROR)

    def test_cli_oversized_xml_and_bystanders(self):
        with private_directory() as temp:
            source, bystander = temp / 'oversized.xml', temp / 'bystander.cii'
            with source.open('xb') as stream:
                stream.write(b'<invalid XML')
                stream.truncate(MAX_XML + 1)
            self.assertEqual(source.stat().st_size, 150000001)
            protected = b'existing destination data'
            bystander.write_bytes(protected)
            expected_sha = hashlib.sha256(protected).hexdigest()
            output = temp / 'must-not-exist.cii'
            commands = [('inspect', source), ('to-cii', source, output),
                        ('to-cii', source, bystander),
                        ('edit-diameter', source, 'element-000001', '254', output),
                        ('edit-diameter', source, 'element-000001', '254', bystander)]
            for args in commands:
                with self.subTest(command=str(args[0]), destination=str(args[-1])):
                    self.assert_cli_size_rejection(*args)
                    self.assertFalse(output.exists())
                    self.assertEqual(bystander.read_bytes(), protected)
                    self.assertEqual(hashlib.sha256(bystander.read_bytes()).hexdigest(), expected_sha)
            self.assertEqual(sorted(p.name for p in temp.iterdir()),
                             ['bystander.cii', 'oversized.xml'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--scratch', required=True, type=Path)
    args = parser.parse_args()
    SCRATCH = args.scratch.resolve()
    if not SCRATCH.is_dir():
        raise ValueError('Create the explicit private scratch directory first')
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(Intake)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'status': 'PASS' if result.wasSuccessful() else 'FAIL',
                      'tests': result.testsRun, 'failures': len(result.failures),
                      'errors': len(result.errors), 'skipped': len(result.skipped),
                      'input_basis': 'synthetic bytes on real filesystem; labeled injected faults'}))
    raise SystemExit(0 if result.wasSuccessful() else 1)
