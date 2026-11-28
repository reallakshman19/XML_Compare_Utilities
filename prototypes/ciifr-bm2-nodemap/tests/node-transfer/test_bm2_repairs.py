"""Independent literal/alias regressions for the isolated BM2 repair."""
from decimal import Decimal
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/node-transfer'))
from displacement_profile import format_like
from node_mapping import propose, accept
from converter_adapter import extract_manifest, trial_structured_transfer
from node_catalogue import validate_model
from transfer_plan import make_plan, approve
from test_f05_intake import synthetic_full


class ScientificTests(unittest.TestCase):
    def test_literal_normalized_tokens(self):
        cases = [(b' 0.000000E+03', '123.456', b' 1.234560E+02'),
                 (b' 0.000000D-03', '0.00000123', b' 1.230000D-06'),
                 (b' 0.000000e+00', '-12.34', b'-1.234000e+01'),
                 (b'+0.000000E+00', '12.34', b'+1.234000E+01'),
                 (b' 1.000000E+03', '0', b' 0.000000E+00'),
                 (b' 1.000000D-03', '-0', b'-0.000000D+00')]
        for before, value, expected in cases:
            with self.subTest(value=value, before=before):
                self.assertEqual(format_like(before, Decimal(value)), expected)

    def test_noop_original_spelling_and_zero_policy(self):
        for raw in (b' 1.234560E+02', b' 0.123456D+03', b'+1.234560e+02'):
            value = Decimal(raw.decode().replace('D', 'E'))
            self.assertEqual(format_like(raw, value), raw)
        self.assertEqual(format_like(b'-0.000000E-03', Decimal('0')), b'-0.000000E-03')
        self.assertEqual(format_like(b' 0.000000E+03', Decimal('-0')), b' 0.000000E+03')

    def test_inexact_overflow_sentinel_and_invalid_reject(self):
        for raw, value in ((b' 0.000000E+00', '1.23456789'),
                           (b' 0.000000E+00', '1E+12345'),
                           (b' 0.000000E+00', '9999.99'),
                           (b' 9.999990E+03', '1'),
                           (b'          NAN', '1')):
            with self.subTest(value=value, before=raw), self.assertRaises((ValueError, ArithmeticError)):
                format_like(raw, Decimal(value))


class AliasTests(unittest.TestCase):
    def model(self, nodes):
        return {'_catalogue': [{'node': n, 'aliases': aliases, 'name_conflict': len(aliases) > 1} for n, aliases in nodes]}

    def test_conflicting_source_alias_still_counts(self):
        self.assertEqual(propose(self.model([(1, ['A', 'B']), (2, ['A'])]), self.model([(101, ['A'])]), 'NAME'), [])

    def test_conflicting_target_alias_still_counts(self):
        self.assertEqual(propose(self.model([(1, ['A'])]), self.model([(101, ['A', 'B']), (102, ['A'])]), 'NAME'), [])

    def test_real_unique_and_number_conflict_evidence(self):
        a = self.model([(1, ['A'])]); b = self.model([(101, ['A'])])
        self.assertEqual(propose(a, b, 'NAME')[0]['reasons'], ['EXACT_UNIQUE_NAME'])
        a = self.model([(1, ['A', 'B'])]); b = self.model([(1, ['A'])])
        self.assertEqual(propose(a, b, 'BOTH'), [])
        self.assertEqual(propose(a, b, 'EITHER')[0]['reasons'], ['NUMBER_EQUAL'])

    def test_complete_F05_alias_counterexample(self):
        with tempfile.TemporaryDirectory() as folder:
            s = Path(folder) / 's.CII'; t = Path(folder) / 't.CII'
            s.write_bytes(synthetic_full([(1, 2, 1, 0), (1, 3, 2, 0)], [('A', 'A'), ('B', 'C')], []))
            t.write_bytes(synthetic_full([(101, 102, 1, 0)], [('A', 'T')], []))
            self.assertEqual(propose(validate_model(extract_manifest(s)), validate_model(extract_manifest(t)), 'NAME'), [])


class ScientificWriterTrial(unittest.TestCase):
    def test_changed_scientific_value_matches_literal_CII_and_F05(self):
        with tempfile.TemporaryDirectory() as folder:
            s = Path(folder) / 's.CII'; t = Path(folder) / 't.CII'
            s.write_bytes(synthetic_full([(10, 20, 1, 1)], [('S', 'MATCH')], [(20, 0, {(0, 2, 'DX'): '2.500000E+00'})]))
            raw = synthetic_full([(500, 600, 1, 1)], [('T', 'MATCH')], [(600, 0, {(0, 7, 'DX'): '1.000000E+00'})])
            t.write_bytes(raw)
            sm = validate_model(extract_manifest(s)); tm = validate_model(extract_manifest(t))
            mapping = accept(sm, tm, [(20, 600)], 'SYNTHETIC_TEST_ONLY', 'NAME')
            plan = make_plan(sm, tm, mapping, 2, 7, ['DX'], 'GLOBAL_BASES_ALIGNED_OWNER_CONFIRMED', 'VECTOR_CORRESPONDENCE_OWNER_CONFIRMED')
            decision = plan['decisions'][0]
            self.assertEqual(decision['proposed_lexeme'], ' 2.500000E+00')
            approval = approve(plan, 'SYNTHETIC_TEST_ONLY', [decision['decision_id']])
            reply = trial_structured_transfer(sm, tm, mapping, plan, approval)
            lines = raw.splitlines(keepends=True)
            header = next(i for i, line in enumerate(lines) if line == b'#$ DISPLMNT\r\n')
            lines[header + 8] = lines[header + 8][:2] + b' 2.500000E+00' + lines[header + 8][15:]
            import hashlib
            self.assertEqual(reply['f05_rendered_sha256'], hashlib.sha256(b''.join(lines)).hexdigest())
            self.assertFalse(reply['destination_written'])


if __name__ == '__main__':
    unittest.main()
