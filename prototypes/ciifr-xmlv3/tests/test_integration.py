"""Actual private-input integration plus explicitly identified fault injection."""
import argparse
import copy
import hashlib
import json
import profile as stdlib_profile
import subprocess
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
from unittest import mock


PROTOTYPE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROTOTYPE))
from xmlv3 import (edit_diameter, from_cii, load_xml, storage_of, summary,
                   to_cii, validate, xml_bytes)
from xmlv3.baseline import ENGINE, ENGINE_SHA, verified_bytes
from xmlv3.publish import publish_new
from xmlv3.views import build_views, element_fields, field_index


SOURCE_SHA = '5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57'
POST_SHA = '331e5053e3d73660875828ed7b9efdeeba74652b02057f7f1158ad9e9ef853fb'
FIXTURE = None
SCRATCH = None
CHILD = '''import sys
sys.dont_write_bytecode=True
sys.path.insert(0,sys.argv[1])
from xmlv3 import load_xml,to_cii
def deny(event,args):
 if event=='open' or event.startswith(('socket.','subprocess.')):
  raise RuntimeError('XML-only denied '+event)
sys.addaudithook(deny)
sys.stdout.buffer.write(to_cii(load_xml(sys.stdin.buffer.read())))
'''


def expected_edit(source):
    start = source.index(b'\r\n', source.index(b'#$ ELEMENTS')) + 2
    offset = start + 2 + 5 * 13
    literal = b' 2.540000E+02'
    assert len(literal) == 13
    expected = source[:offset] + literal + source[offset + 13:]
    assert hashlib.sha256(expected).hexdigest() == POST_SHA
    return expected


class Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = FIXTURE.read_bytes()
        if len(cls.source) != 803776 or hashlib.sha256(cls.source).hexdigest() != SOURCE_SHA:
            raise ValueError('Wrong private fixture identity; no expected values regenerated')
        cls.root = from_cii(cls.source)
        cls.xml = xml_bytes(cls.root)

    def first_field(self, root, name):
        record = ENGINE.get_section(storage_of(root), 'ELEMENTS')[0]
        return element_fields(record)[name]

    def command(self, *args):
        return subprocess.run([sys.executable, '-B', str(PROTOTYPE / 'cii_xmlv3.py'),
                               *map(str, args)], capture_output=True, timeout=90, check=False)

    def test_xml_only_separate_process(self):
        result = subprocess.run([sys.executable, '-I', '-B', '-c', CHILD, str(PROTOTYPE)],
                                input=self.xml, capture_output=True, timeout=90, check=False)
        self.assertEqual(result.returncode, 0, result.stderr.decode('utf-8', 'replace'))
        self.assertEqual(result.stdout, self.source)
        self.assertEqual(hashlib.sha256(result.stdout).hexdigest(), SOURCE_SHA)

    def test_literal_edit_and_immutable_input(self):
        old_value = self.first_field(self.root, 'outside_diameter').get('value')
        edited = edit_diameter(self.root, 'element-000001', '254')
        self.assertEqual(to_cii(load_xml(xml_bytes(edited))), expected_edit(self.source))
        self.assertEqual(self.first_field(self.root, 'outside_diameter').get('value'), old_value)
        self.assertEqual(hashlib.sha256(FIXTURE.read_bytes()).hexdigest(), SOURCE_SHA)

    def test_numeric_rejections(self):
        for value in ('254.123456789012345', '1E1000', 'NaN', '0', '-1'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                edit_diameter(self.root, 'element-000001', value)
        candidate = copy.deepcopy(self.root)
        self.first_field(candidate, 'outside_diameter').set('value', '254')
        with self.assertRaisesRegex(ValueError, 'edited=true'):
            to_cii(candidate)

    def test_stale_or_duplicate_views(self):
        for change in ('stale', 'duplicate'):
            candidate = copy.deepcopy(self.root)
            elements = candidate.find('./EngineeringViews/Elements')
            if change == 'stale':
                elements[0].set('id', 'element-999999')
            else:
                elements.append(copy.deepcopy(elements[0]))
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, 'references'):
                to_cii(candidate)

    def test_structural_guard_after_relationship_rebuild(self):
        for name in ('from_node', 'pointer_nodename'):
            candidate = copy.deepcopy(self.root)
            field = self.first_field(candidate, name)
            value = Decimal(field.get('value'))
            self.assertEqual(value, value.to_integral_value())
            old = int(value)
            field.set('value', str(old + 1000000 if name == 'from_node' else 1 if old != 1 else 2))
            field.set('edited', 'true')
            storage = storage_of(candidate)
            storage.remove(storage.find('Relationships'))
            ENGINE.establish_links(storage)
            with self.subTest(field=name), self.assertRaisesRegex(ValueError, 'structural/lexical'):
                to_cii(candidate)

    def test_count_and_misc_rejections(self):
        for section, field_name in [('CONTROL', 'elements'), ('MISCEL_1', 'material_id_000001')]:
            candidate = copy.deepcopy(self.root)
            record = ENGINE.get_section(storage_of(candidate), section)[0]
            field = next(f for f in ENGINE.fields(record) if f.get('name') == field_name)
            field.set('value', '999999')
            field.set('edited', 'true')
            with self.subTest(section=section), self.assertRaises(ValueError):
                to_cii(candidate)

    def test_unsafe_xml_and_unknown_envelope(self):
        attacks = [b'<!DOCTYPE x [<!ENTITY p "data">]><x>&p;</x>',
                   '<!DOCTYPE x><x/>'.encode('utf-16'), b'<RichInputXMLv3/>']
        for attack in attacks:
            with self.subTest(attack=attack[:12]), self.assertRaises(ValueError):
                load_xml(attack)
        candidate = copy.deepcopy(self.root)
        candidate.set('unknown', 'value')
        with self.assertRaisesRegex(ValueError, 'attributes'):
            validate(candidate)

    def test_unsupported_physical_input(self):
        for data in (self.source.replace(b'\r\n', b'\n'), self.source[:-2]):
            with self.assertRaisesRegex(ValueError, 'CRLF'):
                from_cii(data)

    def test_derived_alias_conflict_is_visible(self):
        # [DERIVED] Contradictory names are not native engineering acceptance.
        candidate = copy.deepcopy(self.root)
        node = next(n for n in candidate.findall('./EngineeringViews/Nodes/Node')
                    if len({f.get('field') for f in n.findall('./Data/NameOccurrence')}) > 1)
        refs = list(dict.fromkeys(f.get('field') for f in node.findall('./Data/NameOccurrence')))
        index = field_index(storage_of(candidate))
        for ref, text in zip(refs[:2], ('CONFLICT_A', 'CONFLICT_B')):
            index[ref].set('value', text.ljust(25))
            index[ref].set('edited', 'true')
        candidate.remove(candidate.find('EngineeringViews'))
        candidate.append(build_views(storage_of(candidate)))
        report = summary(candidate)
        self.assertIn({'kind': 'conflicting-node-names', 'node': node.get('id')}, report['issues'])
        self.assertEqual(len(candidate.findall('./EngineeringViews/Elements/Element')), 521)

    def test_dependency_pin_and_import_isolation(self):
        self.assertIs(sys.modules['profile'], stdlib_profile)
        with tempfile.TemporaryDirectory(prefix='xmlv3-pin-', dir=SCRATCH) as name:
            temp = Path(name).resolve()
            temp.relative_to(SCRATCH)
            altered = temp / 'engine.py'
            altered.write_bytes(b'not the pinned engine')
            with self.assertRaisesRegex(ValueError, 'dependency changed'):
                verified_bytes(altered, ENGINE_SHA)

    def test_cli_real_journey_and_existing_destination(self):
        with tempfile.TemporaryDirectory(prefix='xmlv3-cli-', dir=SCRATCH) as name:
            temp = Path(name).resolve()
            temp.relative_to(SCRATCH)
            xml, output = temp / 'model.xml', temp / 'recovered.cii'
            edited, edited_cii = temp / 'edited.xml', temp / 'edited.cii'
            for args in [('to-xml', FIXTURE, xml), ('inspect', xml), ('to-cii', xml, output),
                         ('edit-diameter', xml, 'element-000001', '254', edited),
                         ('to-cii', edited, edited_cii)]:
                result = self.command(*args)
                self.assertEqual(result.returncode, 0, result.stderr.decode('utf-8', 'replace'))
                self.assertEqual(json.loads(result.stdout)['status'], 'PASS')
            self.assertEqual(output.read_bytes(), self.source)
            self.assertEqual(edited_cii.read_bytes(), expected_edit(self.source))
            result = self.command('to-cii', xml, output)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(output.read_bytes(), self.source)

    def test_simulated_publish_failures_preserve_destinations(self):
        # [SIMULATED] Inject filesystem faults; actual native disk failure NOT_RUN.
        with tempfile.TemporaryDirectory(prefix='xmlv3-publish-', dir=SCRATCH) as name:
            temp = Path(name).resolve()
            temp.relative_to(SCRATCH)
            output = temp / 'result.cii'
            with mock.patch('xmlv3.publish.os.fsync', side_effect=OSError('injected fsync failure')):
                with self.assertRaises(OSError):
                    publish_new(output, b'complete new bytes')
            self.assertFalse(output.exists())
            self.assertEqual(list(temp.iterdir()), [])
            operation = 'rename' if __import__('os').name == 'nt' else 'link'
            actual_link = getattr(__import__('os'), operation)

            def race(source, dest):
                Path(dest).write_bytes(b'competing writer')
                actual_link(source, dest)

            with mock.patch('xmlv3.publish.os.' + operation, side_effect=race):
                with self.assertRaises(FileExistsError):
                    publish_new(output, b'must not replace')
            self.assertEqual(output.read_bytes(), b'competing writer')
            self.assertEqual([p.name for p in temp.iterdir()], ['result.cii'])


if __name__ == '__main__':
    arguments = argparse.ArgumentParser()
    arguments.add_argument('--fixture', required=True, type=Path)
    arguments.add_argument('--scratch', required=True, type=Path)
    args = arguments.parse_args()
    FIXTURE = args.fixture.resolve()
    SCRATCH = args.scratch.resolve()
    if not SCRATCH.is_dir():
        raise ValueError('Create the explicit private scratch directory first')
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(Integration)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'status': 'PASS' if result.wasSuccessful() else 'FAIL',
                      'tests': result.testsRun, 'failures': len(result.failures),
                      'errors': len(result.errors), 'skipped': len(result.skipped)}))
    raise SystemExit(0 if result.wasSuccessful() else 1)
