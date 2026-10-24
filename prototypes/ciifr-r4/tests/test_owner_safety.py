"""S1 fail-closed output-path falsifiers independent of handoff's seven checks."""
import io
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))
from ciifr_r4.cli import main
from fixtures.make_synthetic import fixture


class OutputSafetyTests(unittest.TestCase):
    def test_failed_report_write_leaves_no_reconstructed_customer_file(self):
        """Failing-before witness: old CLI wrote CII before report, leaking partial success."""
        with tempfile.TemporaryDirectory() as d:
            src, out = Path(d) / 'synthetic.cii', Path(d) / 'final'
            src.write_bytes(fixture())
            argv = ['ciifr_r4', '--input', str(src), '--out', str(out)]
            orig_write = Path.write_text
            def sabotage(path, *args, **kwargs):
                if path.name == 'roundtrip_report.json':
                    raise OSError('simulated reporting failure')
                return orig_write(path, *args, **kwargs)
            with patch.object(sys, 'argv', argv), patch.object(Path, 'write_text', sabotage), redirect_stderr(io.StringIO()):
                code = main()
            self.assertNotEqual(code, 0)
            self.assertFalse(out.exists(), 'FAIL CLOSED must not leave a CII under successful output path')
            self.assertFalse(list(Path(d).glob('.final.pending-*')), 'private staging directory must be cleaned')

    def test_wrong_trusted_hash_does_not_create_out(self):
        from ciifr_r4.core import hard_roundtrip
        with tempfile.TemporaryDirectory() as d:
            xml, _, _ = hard_roundtrip(fixture())
            src, out = Path(d) / 'source.xml', Path(d) / 'success'
            src.write_bytes(xml)
            argv = ['ciifr_r4', '--xml', str(src), '--expected-sha256', '0' * 64,
                    '--expected-bytes', str(len(fixture())), '--out', str(out)]
            with patch.object(sys, 'argv', argv), redirect_stderr(io.StringIO()):
                code = main()
            self.assertNotEqual(code, 0)
            self.assertFalse(out.exists())

    def test_existing_output_folder_never_overwritten(self):
        with tempfile.TemporaryDirectory() as d:
            src, out = Path(d) / 'synthetic.cii', Path(d) / 'final'
            src.write_bytes(fixture())
            out.mkdir()
            sentinel = out / 'unrelated.txt'
            sentinel.write_text('keep', encoding='utf8')
            argv = ['ciifr_r4', '--input', str(src), '--out', str(out)]
            with patch.object(sys, 'argv', argv), redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit):
                    main()
            self.assertEqual(sentinel.read_text(encoding='utf8'), 'keep')

if __name__ == '__main__': unittest.main()
