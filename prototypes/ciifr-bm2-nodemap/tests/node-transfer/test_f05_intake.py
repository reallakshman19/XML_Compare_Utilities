"""Synthetic COMPLETE miniature F05 grammar authored without the converter.

These are NOT independent real customer CII models or native acceptance.
Numeric/control rows and pointers are assembled directly from an explicit
standalone grammar; the converter is never used to make expected bytes.
"""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'node-transfer'))
sys.path.insert(0,str(ROOT/'vendor'/'f05'))
from converter_adapter import extract_manifest, engine_identity, verify_f05, trial_structured_transfer
from cii_to_richinputxml import make_richxml
from richinputxml_to_cii2019 import render
from node_catalogue import load_model, conditions
from node_mapping import accept, propose
from transfer_plan import make_plan, approve
from export_audit import expected_bytes

SECTIONS=('VERSION','CONTROL','ELEMENTS','AUX_DATA','NODENAME','BEND','RIGID',
 'EXPJT','RESTRANT','DISPLMNT','FORCMNT','UNIFORM','WIND','OFFSETS','ALLOWBLS',
 'SIF&TEES','REDUCERS','FLANGES','EQUIPMNT','MISCEL_1','UNITS','COORDS')
PTRS=('BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT','UNIFORM',
 'WIND','OFFSETS','ALLOWBLS','SIF&TEES','NODENAME','REDUCERS','FLANGES','EQUIPMNT')
COUNT_ORDER=('ELEMENTS','NOZZLES','HANGERS','NODENAME','REDUCERS','FLANGES',
 'BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT','UNIFORM','WIND',
 'OFFSETS','ALLOWBLS','SIF&TEES','IZUP','EQUIPMNT')

def numeric(values):
    return b'  '+b''.join(str(v).encode('ascii').rjust(13,b' ') for v in values)

def label(s):
    v=s.encode('ascii');return b'       '+str(len(v)).encode('ascii').rjust(5,b' ')+b' '+v

def unitname(s):return b'  '+s.encode('ascii').ljust(12,b' ')

def synthetic_full(elements,aliases,displacement,izup=1):
    # each element: from, to, NODENAME 1-based pointer, DISPLMNT 1-based pointer
    # displacement records: (node_slot0,node_slot1, {(slot,vector,dof):token})
    counts={k:0 for k in COUNT_ORDER}
    counts.update(ELEMENTS=len(elements),NODENAME=len(aliases),DISPLMNT=len(displacement),IZUP=izup)
    body={k:[] for k in SECTIONS}
    body['VERSION']=[b'     5.0000      14.0000        1256']+[b'V14'.ljust(77,b' ')]*60
    vs=[counts[k] for k in COUNT_ORDER]
    body['CONTROL']=[numeric(vs[i:i+6]) for i in (0,6,12,18)]
    for (f,t,np,dp) in elements:
        rel=[f,t]+[0]*51
        r=[numeric(rel[i:i+6]) for i in range(0,53,6)]
        r.extend([label('ELEMENT'),label('LINE'),numeric([0,0])])
        p=[0]*15;p[PTRS.index('DISPLMNT')]=dp;p[PTRS.index('NODENAME')]=np
        r.extend([numeric(p[i:i+6]) for i in (0,6,12)])
        assert len(r)==15
        body['ELEMENTS']+=r
    body['NODENAME']=[b'  '+a.encode('ascii').ljust(25,b' ')+b' '+b.encode('ascii').ljust(25,b' ')
                      for a,b in aliases]
    for node0,node1,edits in displacement:
        for slot,node in ((0,node0),(1,node1)):
            body['DISPLMNT'].append(numeric([node]))
            for v in range(1,10):
                values=['9999.99']*6
                for (s,vector,d),value in edits.items():
                    if s==slot and vector==v: values[('DX','DY','DZ','RX','RY','RZ').index(d)]=value
                body['DISPLMNT'].append(numeric(values))
    nmat=(len(elements)+5)//6
    for i in range(nmat):body['MISCEL_1'].append(numeric([1]*min(6,len(elements)-6*i)))
    body['MISCEL_1'] += [numeric([0]*6),numeric([0]*6),numeric([0]*6),numeric([0])]
    body['UNITS'] = [numeric(['1.0000']*6) for _ in range(3)]+[numeric(['1.0000']*4)]
    body['UNITS'] += [unitname('UNIT'+str(i)) for i in range(1,25)]
    body['COORDS'] = [numeric([0])]
    return b''.join(b'#$ '+s.encode('ascii')+b'\r\n'+b''.join(row+b'\r\n' for row in body[s]) for s in SECTIONS)

class TestF05Intake(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory();self.base=Path(self.t.name)
        self.source=synthetic_full([(10,20,1,1)], [('FIRST','MATCH')],
            [(20,0,{(0,2,'DX'):'2.5000',(0,2,'DY'):'0.0000'})])
        self.target=synthetic_full([(700,800,1,0),(500,501,2,1),(550,600,3,0)],
            [('EXTRA','SOMETHING'),('OTHER','TEMP'),('SECOND','MATCH')],
            [(600,0,{(0,7,'DX'):'1.0000',(0,7,'DY'):'0.0000'})])
        self.sp=self.base/'source.CII';self.tp=self.base/'target.CII'
        self.sp.write_bytes(self.source);self.tp.write_bytes(self.target)
    def tearDown(self):self.t.cleanup()
    def test_f05_pin_and_full_synthetic_round_trip(self):
        self.assertTrue(verify_f05())
        self.assertTrue(engine_identity().startswith('F05:'))
        for data in (self.source,self.target):
            root,audit=make_richxml(data)
            self.assertEqual(render(root),data)
            self.assertEqual(audit['sections']['DISPLMNT']['records'],1)
    def test_extracted_catalogue_unequal_node_counts_and_owner(self):
        s=extract_manifest(self.sp);t=extract_manifest(self.tp)
        self.assertEqual(s['parser_id'],engine_identity())
        self.assertEqual(t['parser_id'],engine_identity())
        self.assertEqual((len(s['elements']),len(t['elements'])),(1,3))
        self.assertEqual((len(s['displacements']),len(t['displacements'])),(1,1))
        sm=load_model(self._save(s,'source.json'));tm=load_model(self._save(t,'target.json'))
        self.assertEqual(len(sm['_catalogue']),2)
        self.assertEqual(len(tm['_catalogue']),6)
        self.assertEqual(conditions(tm,600,7,'DX')[0]['record'],1)
        self.assertEqual(conditions(tm,600,7,'DX')[0]['owners'],[2])
        self.assertNotIn(600,(500,501))  # condition is stored on a non-endpoint owning element
        p=propose(sm,tm,'NAME')
        self.assertEqual([(x['source_node'],x['target_node']) for x in p if x['source_node']==20],[(20,600)])
        self.assertNotIn(600,(500,))
    def _save(self,doc,name):
        path=self.base/name;path.write_text(json.dumps(doc));return path
    def test_xml_value_edit_matches_independent_expected_byte_span(self):
        sm=load_model(self._save(extract_manifest(self.sp),'s.json'))
        tm=load_model(self._save(extract_manifest(self.tp),'t.json'))
        mapping=accept(sm,tm,[(20,600)],'OWNER_SYNTHETIC','NAME')
        plan=make_plan(sm,tm,mapping,2,7,['DX','DY'],
                  'GLOBAL_BASES_ALIGNED_OWNER_CONFIRMED','VECTOR_CORRESPONDENCE_OWNER_CONFIRMED')
        self.assertEqual(plan['status'],'PREVIEW_READY')
        self.assertEqual([x['status'] for x in plan['decisions']],['CHANGE_REQUIRES_CELL_ACCEPTANCE','NO_OP'])
        cell=plan['decisions'][0];approval=approve(plan,'OWNER_SYNTHETIC',[cell['decision_id']])
        expected=expected_bytes(self.target,plan,approval)
        trial=trial_structured_transfer(sm,tm,mapping,plan,approval)
        self.assertEqual(trial['expected_output_sha256'],hashlib.sha256(expected).hexdigest())
        self.assertFalse(trial['destination_written'])
        # This is the independently authored expected splice, not the output
        # of the converter under test. Check exact token spelling and position.
        off=cell['expected_span']['start']
        manual=self.target[:off]+b'       2.5000'+self.target[off+13:]
        self.assertEqual(manual,expected)
        root,audit=make_richxml(self.target)
        record=root.findall("./PIPINGMODEL/SECTIONS/SECTION[@name='DISPLMNT']/Record")[0]
        changed_field=record[7].findall('Field')[0]
        self.assertEqual(changed_field.get('value'),'1.0000')
        changed_field.set('value','2.5000')
        candidate=render(root)
        self.assertEqual(candidate,manual)
        self.assertEqual(hashlib.sha256(candidate).hexdigest(),hashlib.sha256(manual).hexdigest())
    def test_bad_skipped_prefix_and_nonrepresentable_edit_rejected(self):
        bad=self.target.replace(b'#$ ELEMENTS\r\n',b'#$ ELEMENTS EXTRA\r\n',1)
        with self.assertRaises(ValueError):make_richxml(bad)
        bad=self.target.replace(b'       7 ELEMENT',b'XXXXXXX7 ELEMENT',1)
        with self.assertRaises(ValueError):make_richxml(bad)
        root,_=make_richxml(self.target)
        record=root.findall("./PIPINGMODEL/SECTIONS/SECTION[@name='DISPLMNT']/Record")[0]
        record[7].findall('Field')[0].set('value','2.50001')
        with self.assertRaises(ValueError):render(root)

if __name__=='__main__':unittest.main()
