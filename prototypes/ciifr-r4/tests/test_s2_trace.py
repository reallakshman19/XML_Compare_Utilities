"""S2-TRACE-1: immutable XML Row/Field addresses; never derive slots by token search."""
from __future__ import annotations
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))
from ciifr_r4.core import snapshot, make_xml, hard_roundtrip, get_section, xml_only_rebuild
from ciifr_r4.cli import main
from ciifr_r4.viewer import render_hierarchy
from fixtures.make_synthetic import fixture


def synthetic_slot_change(data, section, ordinal, value):
    """Modify exactly one 13-column invented fixture slot, not its repeated value."""
    root = make_xml(data)
    record = get_section(root, section).find('Record')
    for row in record.findall('Row'):
        for index, field in enumerate(row.findall('Field')):
            if field.get('ordinal') == str(ordinal):
                raw = f'{float(value):13.6E}'.encode('ascii')
                assert len(raw) == 13
                rows = data.split(b'\r\n')
                lineno = int(row.get('line')) - 1
                offset = 2 + 13 * index
                assert rows[lineno][offset:offset + 13] == field.get('lexeme').encode('ascii')
                rows[lineno] = rows[lineno][:offset] + raw + rows[lineno][offset + 13:]
                return b'\r\n'.join(rows)
    raise AssertionError(f'Unknown synthetic slot: {section} {ordinal}')


class TraceSourceTests(unittest.TestCase):
    def test_equal_lexemes_keep_distinct_physical_slots(self):
        model = snapshot(make_xml(fixture()))
        element = model['lines']['SYNTH-LINE-A']['elements'][0]
        x, y = element['properties'][3:5]
        self.assertEqual(x['lexeme'], y['lexeme'])
        self.assertEqual(x['cii_line'], y['cii_line'])
        self.assertEqual([x['field_ordinal_in_row'], y['field_ordinal_in_row']], [4, 5])
        self.assertNotEqual(x['xml_field_identity'], y['xml_field_identity'])
        self.assertEqual(x['source_section'], 'ELEMENTS')
        self.assertEqual(x['xml_record_id'], 'element-000001')
        self.assertEqual(x['xml_row_ordinal_in_record'], 1)
        displaced = next(c for c in element['components'] if c['section'] == 'DISPLMNT')
        a, b = displaced['fields'][1:3]
        self.assertEqual(a['lexeme'], b['lexeme'])
        self.assertEqual(a['cii_line'], b['cii_line'])
        self.assertEqual([a['field_ordinal_in_row'], b['field_ordinal_in_row']], [1, 2])
        self.assertNotEqual(a['xml_field_identity'], b['xml_field_identity'])

    def test_event_source_and_owning_pointer_are_distinct(self):
        model = snapshot(make_xml(fixture()))
        line = model['lines']['SYNTH-LINE-A']
        element = line['elements'][0]
        nodes = {n['number']: n for n in line['node_occurrences']}
        sif = next(e for e in nodes[20]['events'] if e['type'] == 'sif-tee')
        self.assertEqual(sif['owner_element'], 1)
        self.assertEqual(sif['source_anchor']['source_section'], 'SIF&TEES')
        self.assertEqual(sif['source_anchor']['field_ordinal_in_row'], 1)
        self.assertEqual(sif['pointer_source']['source_section'], 'ELEMENTS')
        self.assertEqual(sif['aux_record_id'], 'sif_tees-000001')
        self.assertIn(sif['source_anchor']['xml_field_identity'],
                      [f['xml_field_identity'] for f in sif['fields']])
        restraint = next(e for e in nodes[20]['events'] if e['type'] == 'restraint-dof')
        self.assertEqual(restraint['source_anchor']['source_section'], 'RESTRANT')
        cn = next(e for e in nodes[99]['events'] if e['type'] == 'connecting-node')
        self.assertTrue(nodes[99]['auxiliary_only'])
        self.assertTrue(cn['source_anchor']['key'].endswith('connecting_node'))
        self.assertNotEqual(cn['source_anchor']['xml_field_identity'],
                            restraint['source_anchor']['xml_field_identity'])
        self.assertEqual(element['endpoint_sources']['FROM']['field_ordinal_in_row'], 1)
        self.assertEqual(element['endpoint_sources']['TO']['field_ordinal_in_row'], 2)
        self.assertEqual(element['material_source']['source_section'], 'MISCEL_1')

    def test_first_second_nodal_positions_have_independent_addresses(self):
        raw = synthetic_slot_change(fixture(), 'DISPLMNT', 56, 30)
        raw = synthetic_slot_change(raw, 'SIF&TEES', 43, 30)
        _, regenerated, gate = hard_roundtrip(raw)
        self.assertEqual(raw, regenerated)
        self.assertTrue(gate['verified'])
        line = snapshot(make_xml(raw))['lines']['SYNTH-LINE-A']
        nodes = {n['number']: n for n in line['node_occurrences']}
        self.assertIn(30, nodes)
        for kind, section, first_node in [('displacement', 'DISPLMNT', 99),
                                          ('sif-tee', 'SIF&TEES', 20)]:
            first = next(e for e in nodes[first_node]['events'] if e['type'] == kind)
            second = next(e for e in nodes[30]['events'] if e['type'] == kind)
            self.assertEqual(first['source_anchor']['source_section'], section)
            self.assertEqual(second['source_anchor']['source_section'], section)
            self.assertNotEqual(first['source_anchor']['xml_field_identity'],
                                second['source_anchor']['xml_field_identity'])
            self.assertNotEqual(first['source_anchor']['cii_line'],
                                second['source_anchor']['cii_line'])
            self.assertEqual(second['owner_element'], 1)

    def test_cross_line_shared_node_must_not_leak_source(self):
        b = fixture().replace(b'SYNTH-LINE-A', b'SYNTH-LINE-B', 1)
        model = snapshot(make_xml(b))
        a = {n['number']: n for n in model['lines']['SYNTH-LINE-B']['node_occurrences']}
        other = {n['number']: n for n in model['lines']['SYNTH-LINE-A']['node_occurrences']}
        self.assertIn(20, a)
        self.assertIn(20, other)
        self.assertTrue(a[20]['events'])
        self.assertFalse(other[20]['events'])
        self.assertIn(99, a)
        self.assertNotIn(99, other)
        for e in a[20]['events']:
            self.assertEqual(e['owner_element'], 1)
            self.assertIsNotNone(e['source_anchor'])
            self.assertIsNotNone(e['pointer_source'])
        self.assertFalse(any(e['type'] == 'rigid' for n in a.values() for e in n['events']))

    def test_viewer_json_roundtrip_and_wrong_trusted_hash_fail_closed(self):
        raw = fixture()
        model = snapshot(make_xml(raw))
        html = render_hierarchy(model)
        self.assertIn('Field ordinal within row (1-based)', html)
        self.assertIn('XML field identity', html)
        self.assertIn('CAESAR semantic interpretation NOT VERIFIED', html)
        self.assertNotIn('fetch(', html)
        self.assertNotIn('innerHTML', html)
        with tempfile.TemporaryDirectory() as root:
            src, out = Path(root) / 'synthetic.cii', Path(root) / 'success'
            src.write_bytes(raw)
            with patch.object(sys, 'argv', ['ciifr_r4', '--input', str(src), '--out', str(out)]):
                self.assertEqual(main(), 0)
            self.assertEqual((out / 'reconstructed.CII').read_bytes(), raw)
            tree = json.loads((out / 'hierarchy.json').read_text())
            fields = tree['lines']['SYNTH-LINE-A']['elements'][0]['properties']
            self.assertEqual(fields[3]['field_ordinal_in_row'], 4)
            self.assertIn('XML field identity', (out / 'hierarchy.html').read_text())
            with self.assertRaises(ValueError):
                xml_only_rebuild(out / 'model.xmlv2.xml', '0' * 64, len(raw))
            wrong = Path(root) / 'wrong'
            args = ['ciifr_r4', '--xml', str(out / 'model.xmlv2.xml'), '--expected-sha256',
                    '0' * 64, '--expected-bytes', str(len(raw)), '--out', str(wrong)]
            with patch.object(sys, 'argv', args), redirect_stderr(io.StringIO()):
                self.assertNotEqual(main(), 0)
            self.assertFalse(wrong.exists())


if __name__ == '__main__':
    unittest.main()
