"""XV3-3A: physical-file oracle and explicitly labeled isolated walker cases."""
import argparse
import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from decimal import Decimal
from pathlib import Path


PROTOTYPE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE))
from xmlv3.baseline import ENGINE_SHA, PROFILE_SHA
from xmlv3.core import edit_diameter, from_cii, storage_of, xml_bytes
from xmlv3.dependencies import (inspect_dependencies, material_associations,
                                packed_material_rows)

SOURCE_SHA = '5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57'
FIXTURE = None
SCRATCH = None
# Test-side literal section widths from raw physical CII evidence, independent of
# production section/record/count/report/link helpers. 0 => no qualified rows.
PHYSICAL_WIDTHS = {'ELEMENTS': 15, 'NODENAME': 1, 'REDUCERS': 2, 'FLANGES': 0,
                   'BEND': 3, 'RIGID': 1, 'EXPJT': 1, 'RESTRANT': 24,
                   'DISPLMNT': 20, 'FORCMNT': 20, 'UNIFORM': 6, 'WIND': 1,
                   'OFFSETS': 1, 'ALLOWBLS': 28, 'SIF&TEES': 14, 'EQUIPMNT': 6}
CONTROL_ORDER = ('ELEMENTS NOZZLES HANGERS NODENAME REDUCERS FLANGES BEND RIGID '
                 'EXPJT RESTRANT DISPLMNT FORCMNT UNIFORM WIND OFFSETS ALLOWBLS '
                 'SIF&TEES IZUP EQUIPMNT').split()


def split_physical(source):
    assert source.endswith(b'\r\n') and source.count(b'\n') == source.count(b'\r\n')
    lines = source.split(b'\r\n')[:-1]
    markers = [(row[3:].decode('ascii').strip(), i) for i, row in enumerate(lines)
               if row.startswith(b'#$ ')]
    assert len(markers) == 22
    result = {}
    for j, (name, head) in enumerate(markers):
        end = markers[j+1][1] if j+1 < len(markers) else len(lines)
        result[name] = (head+1, lines[head+1:end])
    return result


def numeric_slots(raw):
    assert raw.startswith(b'  ') and (len(raw)-2) % 13 == 0
    return [int(Decimal(raw[2+i*13:2+(i+1)*13].decode('ascii').strip()))
            for i in range((len(raw)-2)//13)]


def physical_oracle(source):
    sections = split_physical(source)
    element_count = len(sections['ELEMENTS'][1]) // 15
    assert len(sections['ELEMENTS'][1]) == 15*element_count
    raw_control = [n for row in sections['CONTROL'][1] for n in numeric_slots(row)]
    assert len(raw_control) == len(CONTROL_ORDER) == 19
    derived = {}
    for name, width in PHYSICAL_WIDTHS.items():
        rows = sections[name][1]
        assert len(rows) % width == 0 if width else not rows
        derived[name] = len(rows)//width if width else 0
    misc_start, misc_rows = sections['MISCEL_1']
    material_row_count = (element_count+5)//6
    assert len(misc_rows) == material_row_count+4
    materials = [n for row in misc_rows[:material_row_count] for n in numeric_slots(row)]
    assert len(materials) == element_count
    return sections, dict(zip(CONTROL_ORDER, raw_control)), derived, materials, misc_start


def tiny_associations(n):
    """SYNTHETIC pure-element and material-slot walker; not a qualified CII."""
    elements = [ET.Element('Record', id=f'element-{i:06d}') for i in range(1, n+1)]
    material = ET.Element('Record', id='miscel-000001')
    links = {}
    for i in range(1, n+1):
        row_index, slot = divmod(i-1, 6)
        if slot == 0:
            ET.SubElement(material, 'Row', line=str(101+row_index), key='material_id')
        ET.SubElement(material[-1], 'Field', name=f'material_id_{i:06d}',
                              value=str(i+20), ordinal=str(i))
        links[elements[i-1].get('id')] = ET.Element('Link', to=f'material-{i+20}',
                                                    resolution='external-catalog-unloaded')
    return material_associations(elements, material, links)


class Dependencies(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = FIXTURE.read_bytes()
        if len(cls.source) != 803776 or hashlib.sha256(cls.source).hexdigest() != SOURCE_SHA:
            raise ValueError('Private fixture identity mismatch; independent oracle not regenerated')
        cls.sections, cls.declared, cls.physical_counts, cls.materials, cls.misc_start = physical_oracle(cls.source)
        cls.root = from_cii(cls.source)
        cls.xml = xml_bytes(cls.root)
        cls.report = inspect_dependencies(cls.root)

    def command(self, *args):
        return subprocess.run([sys.executable, '-B', str(PROTOTYPE / 'cii_xmlv3.py'),
                               *map(str, args)], capture_output=True, timeout=120, check=False)

    def test_physical_control_oracle_and_counting_units(self):
        entries = self.report['control']['entries']
        self.assertEqual(len(entries), 19)
        self.assertEqual(self.report['control']['observed_row_fields'], [6, 6, 6, 1])
        self.assertEqual([e['name'] for e in entries], CONTROL_ORDER)
        for e in entries:
            with self.subTest(name=e['name']):
                self.assertEqual(e['declared'], self.declared[e['name']])
                if e['name'] in PHYSICAL_WIDTHS:
                    self.assertEqual(e['derived_count'], self.physical_counts[e['name']])
                    self.assertEqual(e['comparison'], 'MATCH')
                    self.assertEqual(e['role'], 'logical-record-count')
                else:
                    self.assertIsNone(e['derived_count'])
                    self.assertNotEqual(e['role'], 'logical-record-count')
        self.assertEqual(self.physical_counts['NODENAME'], 177)
        self.assertEqual(self.physical_counts['RIGID'], 156)
        self.assertEqual(self.physical_counts['RESTRANT'], 122)
        self.assertEqual(len(self.sections['RIGID'][1]), 156)
        self.assertEqual(sum(len(numeric_slots(r)) for r in self.sections['RIGID'][1]), 312)
        self.assertEqual(len(self.sections['RESTRANT'][1]), 2928)
        self.assertEqual(next(e for e in entries if e['name'] == 'IZUP')['comparison'], 'NOT_A_COUNT')
        endpoints = set()
        for i in range(self.physical_counts['ELEMENTS']):
            endpoints.update(numeric_slots(self.sections['ELEMENTS'][1][15*i])[:2])
        self.assertEqual(len(endpoints), 511)
        self.assertNotEqual(len(endpoints), self.physical_counts['NODENAME'])

    def test_every_material_matches_raw_slot_and_link(self):
        items = self.report['misc']['material_associations']
        self.assertEqual(len(items), 521)
        self.assertEqual(len(items), len(self.materials))
        for i, (item, number) in enumerate(zip(items, self.materials), 1):
            with self.subTest(ordinal=i):
                row, slot = divmod(i-1, 6)
                self.assertEqual(item['element_ordinal'], i)
                self.assertEqual(item['element_record_id'], f'element-{i:06d}')
                self.assertEqual(item['material_field_ref'], f'miscel-000001/material_id_{i:06d}')
                self.assertEqual(item['material_number'], number)
                self.assertEqual(item['link_target'], f'material-{number}')
                self.assertEqual(item['row_index_zero_based'], row)
                self.assertEqual(item['slot_index_zero_based'], slot)
                self.assertEqual(item['source_line'], self.misc_start+row+1)
                self.assertEqual(item['lexical_span_in_row'], [2+13*slot, 2+13*(slot+1)])
        layout = self.report['misc']
        self.assertEqual(layout['expected_material_row_count'], 87)
        self.assertEqual(layout['observed_material_row_count'], 87)
        self.assertEqual(layout['observed_material_field_count'], 521)
        self.assertEqual([r['observed_field_count'] for r in layout['material_rows']], [6]*86+[5])
        self.assertEqual([r['observed_field_count'] for r in layout['execution_rows']], [6,6,6,1])
        self.assertEqual([[f['kind'] for f in r['fields']] for r in layout['execution_rows']], [
            ['integer','integer','integer','integer','real','integer'],
            ['integer','integer','real','real','integer','integer'],
            ['integer','integer','integer','integer','real','integer'], ['integer']])
        self.assertTrue(all(r['field_count_match'] for r in layout['execution_rows']))

    def test_packing_boundaries_isolated_arithmetic(self):
        vectors = {0:[], 1:[1], 5:[5], 6:[6], 7:[6,1],
                   12:[6,6], 13:[6,6,1]}
        for count, expected in vectors.items():
            with self.subTest(count=count):
                self.assertEqual(packed_material_rows(count), expected)
        with self.assertRaises(ValueError):
            packed_material_rows(-1)

    def test_synthetic_discriminating_slots(self):
        for n in (6, 7, 12, 13):
            with self.subTest(n=n):
                items = tiny_associations(n)
                self.assertEqual([x['material_number'] for x in items], list(range(21, 21+n)))
                self.assertEqual([x['row_index_zero_based'] for x in items], [(i-1)//6 for i in range(1,n+1)])
                self.assertEqual([x['slot_index_zero_based'] for x in items], [(i-1)%6 for i in range(1,n+1)])
                self.assertEqual(items[-1]['link_target'], f'material-{20+n}')

    def test_inspection_does_not_mutate_and_edit_keeps_storage_sections(self):
        before = ET.tostring(self.root)
        report = inspect_dependencies(self.root)
        self.assertEqual(ET.tostring(self.root), before)
        self.assertEqual(report, self.report)
        edited = edit_diameter(self.root, 'element-000001', '254')
        for name in ('CONTROL', 'MISCEL_1'):
            path = f"./Sections/Section[@name='{name}']"
            original_section = storage_of(self.root).find(path)
            edited_section = storage_of(edited).find(path)
            self.assertEqual(ET.tostring(original_section), ET.tostring(edited_section))
        self.assertEqual(ET.tostring(self.root), before)
        self.assertEqual(hashlib.sha256(FIXTURE.read_bytes()).hexdigest(), SOURCE_SHA)

    def test_actual_cli_xml_fingerprint_and_no_publication(self):
        with tempfile.TemporaryDirectory(prefix='xv3-dependencies-', dir=SCRATCH) as directory:
            folder = Path(directory).resolve()
            folder.relative_to(SCRATCH)
            source = folder/'model.xml'
            bystander = folder/'protected.bin'
            source.write_bytes(self.xml)
            bystander.write_bytes(b'untouched')
            before = sorted(x.name for x in folder.iterdir())
            completed = self.command('inspect-dependencies', source)
            self.assertEqual(completed.returncode, 0, completed.stderr.decode(errors='replace'))
            obj = json.loads(completed.stdout)
            self.assertEqual(obj['status'], 'PASS')
            self.assertEqual(obj['input'], {'bytes':len(self.xml),
                             'sha256':hashlib.sha256(self.xml).hexdigest()})
            self.assertEqual(obj['dependency_pins'], {'engine_sha256':ENGINE_SHA,
                                                       'profile_sha256':PROFILE_SHA})
            self.assertEqual(obj['model'], self.report)
            self.assertEqual(source.read_bytes(), self.xml)
            self.assertEqual(bystander.read_bytes(), b'untouched')
            self.assertEqual(sorted(x.name for x in folder.iterdir()), before)

    def test_invalid_protected_and_stale_refs_fail_closed(self):
        cases = [('CONTROL', 'elements', '999999'),
                 ('CONTROL', 'izup', '1'), ('CONTROL', 'nozzles', '1'),
                 ('MISCEL_1', 'material_id_000001', '700'),
                 ('MISCEL_1', 'material_id_000001', '339')]
        for section, name, value in cases:
            candidate = copy.deepcopy(self.root)
            field = next(f for f in candidate.findall(f"./Storage/RichInputXMLv2/Sections/Section[@name='{section}']/Record/Row/Field")
                         if f.get('name') == name)
            field.set('value', value)
            field.set('edited', 'true')
            with self.subTest(section=section, name=name), self.assertRaises(ValueError):
                inspect_dependencies(candidate)
        candidate = copy.deepcopy(self.root)
        element = candidate.find('./EngineeringViews/Elements/Element/Data')
        matref = next(f for f in element if f.get('role') == 'material-id')
        matref.set('ref', 'miscel-000001/material_id_000002')
        with self.assertRaises(ValueError):
            inspect_dependencies(candidate)
        candidate = copy.deepcopy(self.root)
        misc = candidate.find("./Storage/RichInputXMLv2/Sections/Section[@name='MISCEL_1']/Record")
        misc[0].remove(misc[0][-1])
        with self.assertRaises(ValueError):
            inspect_dependencies(candidate)
        candidate = copy.deepcopy(self.root)
        misc = candidate.find("./Storage/RichInputXMLv2/Sections/Section[@name='MISCEL_1']/Record")
        misc[-1][0].set('kind', 'real')
        with self.assertRaises(ValueError):
            inspect_dependencies(candidate)



class OversizedIntake(unittest.TestCase):
    def test_new_cli_oversized_real_file(self):
        with tempfile.TemporaryDirectory(prefix='xv3-dep-oversize-', dir=SCRATCH) as directory:
            folder = Path(directory).resolve()
            folder.relative_to(SCRATCH)
            source, bystander = folder/'oversized.xml', folder/'protected.txt'
            with source.open('xb') as output:
                output.write(b'<no')
                output.truncate(150000001)
            bystander.write_bytes(b'keep')
            result = subprocess.run([sys.executable, '-B', str(PROTOTYPE / 'cii_xmlv3.py'),
                                     'inspect-dependencies', str(source)],
                                    capture_output=True, timeout=90, check=False)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(result.stdout, b'')
            self.assertEqual(result.stderr.strip(), b'XMLv3: XMLv3 input exceeds 150 MB')
            self.assertEqual(bystander.read_bytes(), b'keep')
            self.assertEqual(sorted(x.name for x in folder.iterdir()),
                             ['oversized.xml', 'protected.txt'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixture', required=True, type=Path)
    parser.add_argument('--scratch', required=True, type=Path)
    args = parser.parse_args()
    FIXTURE, SCRATCH = args.fixture.resolve(), args.scratch.resolve()
    if not SCRATCH.is_dir():
        raise ValueError('Create the explicitly authorized private scratch directory first')
    suite = unittest.TestSuite([
        unittest.defaultTestLoader.loadTestsFromTestCase(OversizedIntake),
        unittest.defaultTestLoader.loadTestsFromTestCase(Dependencies)])
    outcome = unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'status':'PASS' if outcome.wasSuccessful() else 'FAIL',
                      'tests':outcome.testsRun, 'errors':len(outcome.errors),
                      'failures':len(outcome.failures), 'skipped':len(outcome.skipped),
                      'basis':'verified private original + independently parsed physical records + labeled synthetic walkers'}))
    raise SystemExit(0 if outcome.wasSuccessful() else 1)
