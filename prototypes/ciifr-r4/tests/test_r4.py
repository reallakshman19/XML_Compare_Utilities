import sys,unittest,tempfile
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE))
from ciifr_r4.core import hard_roundtrip,make_xml,snapshot,xml_only_rebuild
from fixtures.make_synthetic import fixture

class SourcePreservingTests(unittest.TestCase):
 def test_synthetic_roundtrip(self):
  b=fixture();x,out,r=hard_roundtrip(b)
  self.assertEqual(b,out);self.assertEqual(r['byte_differences'],0)
  self.assertEqual(len(x)>len(b),True)
 def test_graph_scope(self):
  tree=snapshot(make_xml(fixture()))
  self.assertEqual(tree['counts']['elements'],2)
  self.assertEqual(tree['counts']['lines'],1)
  self.assertEqual(tree['counts']['pointer_links'],6)
  self.assertEqual(len(tree['lines']['SYNTH-LINE-A']['elements']),2)
  self.assertTrue(any(x['type']=='connecting-node' for x in tree['nodes']['99']['events']))
  self.assertTrue(any(x['type']=='sif-tee' for x in tree['nodes']['20']['events']))
  self.assertTrue(any(x['section']=='RIGID' for x in tree['lines']['SYNTH-LINE-A']['elements'][0]['pointers']))
  self.assertFalse(any(x['type']=='rigid' for n in tree['nodes'].values() for x in n['events']))
 def test_no_blind_normalization(self):
  b=fixture().replace(b' 9.999990E+03',b' 9.999991E+03')
  x,out,r=hard_roundtrip(b);self.assertEqual(b,out)
 def test_standalone_xml_external_anchor(self):
  import hashlib
  b=fixture();x,_,_=hard_roundtrip(b)
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'source.xml';p.write_bytes(x)
   out,report=xml_only_rebuild(p,hashlib.sha256(b).hexdigest(),len(b))
   self.assertEqual(out,b)
   with self.assertRaises(ValueError):xml_only_rebuild(p,'0'*64,len(b))
   with self.assertRaises(ValueError):xml_only_rebuild(p,hashlib.sha256(b).hexdigest(),len(b)+1)
 def test_standalone_xml_corrupt_field(self):
  import hashlib
  b=fixture();x,_,_=hard_roundtrip(b)
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'source.xml'
   p.write_bytes(x.replace(b'1.000000E+02',b'1.000001E+02',1))
   with self.assertRaises(Exception):xml_only_rebuild(p,hashlib.sha256(b).hexdigest(),len(b))
 def test_bad_eol_fails(self):
  with self.assertRaises(Exception):hard_roundtrip(fixture().replace(b'\r\n',b'\n'))
 def test_bad_pointer_fails(self):
  b=fixture();self.assertIn(b'            1',b)
  # One pointer is set to an out-of-range index in a strict profile.
  # Patch a specific 15th-line slot in first element.
  lines=b.split(b'\r\n');idx=lines.index(b'#$ ELEMENTS')+1
  pointer_row=idx+12
  s=lines[pointer_row]
  # BEND is first pointer, replace original 1 with 999.
  lines[pointer_row]=s[:2]+f'{999:13d}'.encode()+s[15:]
  with self.assertRaises(Exception):hard_roundtrip(b'\r\n'.join(lines))

if __name__=='__main__':unittest.main()
