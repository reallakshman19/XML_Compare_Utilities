"""S2 falsifiers: owner-qualified repeated nodes, auxiliary-only, offline/XSS and staging."""
from __future__ import annotations
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from contextlib import redirect_stderr
from unittest.mock import patch

BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE))
from ciifr_r4.core import hard_roundtrip,make_xml,snapshot
from ciifr_r4.viewer import render_hierarchy
from ciifr_r4.cli import main
from fixtures.make_synthetic import fixture

class ViewerRegressionTests(unittest.TestCase):
 def test_owner_qualified_shared_node_and_auxiliary_only(self):
  # First element line A, second line B, shared node 20. The first
  # element alone owns NODENAME, RESTRANT, RIGID and their references.
  b=fixture().replace(b'SYNTH-LINE-A',b'SYNTH-LINE-B',1)
  html,regenerated,report=hard_roundtrip(b)
  self.assertEqual(b,regenerated)
  self.assertEqual(report['original'],report['output'])
  model=snapshot(make_xml(b))
  A=model['lines']['SYNTH-LINE-B'];B=model['lines']['SYNTH-LINE-A']
  self.assertEqual(model['counts']['lines'],2)
  self.assertEqual(A['elements'][0]['element_index'],1)
  self.assertEqual(B['elements'][0]['element_index'],2)
  by_num=lambda r:{n['number']:n for n in r['node_occurrences']}
  nA=by_num(A);nB=by_num(B)
  self.assertIn(20,nA);self.assertIn(20,nB)
  self.assertEqual(nB[20]['endpoints'][0]['element_index'],2)
  self.assertEqual(nB[20]['events'],[],'cross-line event must not leak through shared node ID')
  self.assertIn('restraint-dof',{e['type'] for e in nA[20]['events']})
  self.assertIn(99,nA);self.assertTrue(nA[99]['auxiliary_only'])
  self.assertNotIn(99,nB,'aux-only connecting node belongs solely to first line')
  self.assertTrue(any(c['section']=='RIGID' for c in A['elements'][0]['components']))
  self.assertTrue(all(e['type']!='rigid' for n in nA.values() for e in n['events']))
  self.assertEqual(len(A['elements'][0]['properties']),53)
  for n in nA.values():
   for e in n['events']:
    self.assertEqual(e['owner_element'],1)
    self.assertIsInstance(e['source_line'],int)
    self.assertTrue(all('cii_line' in f and 'lexeme' in f for f in e['fields']))

 def test_blank_label_and_literal_parenthetical_are_different(self):
  b=fixture().replace(b'SYNTH-LINE-A',b'            ',1).replace(b'SYNTH-LINE-A',b'(BLANK)     ',1)
  x,out,report=hard_roundtrip(b)
  self.assertEqual(b,out)
  data=snapshot(make_xml(b))
  self.assertEqual(data['counts']['blank_label_elements'],1)
  self.assertIn('',data['lines'])
  self.assertIn('(BLANK)',data['lines'])
  self.assertEqual(data['lines']['']['elements'][0]['line_label'],'')

 def test_script_termination_is_json_escaped_and_offline(self):
  data=snapshot(make_xml(fixture()))
  data['lines']['SYNTH-LINE-A']['elements'][0]['properties'][0]['lexeme']='</script><img src=x onerror=alert(1)>&'
  html=render_hierarchy(data)
  self.assertNotIn('</script><img',html)
  self.assertIn('\\u003c/script\\u003e',html)
  self.assertNotIn('https://',html)
  self.assertNotIn('fetch(',html)
  self.assertNotIn('innerHTML',html.split('<script>')[-1])
  self.assertEqual(html.count('<script>'),1)

 def test_html_failure_cannot_publish_partial_results(self):
  with tempfile.TemporaryDirectory() as d:
   src,out=Path(d)/'synthetic.cii',Path(d)/'final'
   src.write_bytes(fixture())
   argv=['ciifr_r4','--input',str(src),'--out',str(out)]
   original=Path.write_text
   def fail_on_html(self,*args,**kwargs):
    if self.name=='hierarchy.html':raise OSError('deliberate disk write failure on HTML')
    return original(self,*args,**kwargs)
   with patch.object(sys,'argv',argv),patch.object(Path,'write_text',fail_on_html),redirect_stderr(io.StringIO()):
    code=main()
   self.assertNotEqual(code,0)
   self.assertFalse(out.exists())
   self.assertFalse(list(Path(d).glob('.final.pending-*')))

 def test_direct_html_and_cii_bytes(self):
  with tempfile.TemporaryDirectory() as d:
   src,out=Path(d)/'synthetic.cii',Path(d)/'run'
   src.write_bytes(fixture())
   with patch.object(sys,'argv',['ciifr_r4','--input',str(src),'--out',str(out)]):
    self.assertEqual(main(),0)
   html=(out/'hierarchy.html').read_text(encoding='utf-8')
   self.assertIn('CIIFR R4 · Engineering source hierarchy',html)
   self.assertIn('application/json',html)
   self.assertEqual((out/'reconstructed.CII').read_bytes(),fixture())
   self.assertEqual(hashlib.sha256((out/'reconstructed.CII').read_bytes()).hexdigest(),hashlib.sha256(fixture()).hexdigest())

if __name__=='__main__':unittest.main()
