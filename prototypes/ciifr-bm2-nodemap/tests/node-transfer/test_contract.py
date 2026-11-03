"""Independent fixed-row slices, NOT a valid full CAESAR II file grammar.
Test oracle: manually computed positions and independent byte substitution.
"""
import copy, hashlib, json, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'node-transfer'))
from displacement_profile import node_locator,component_locator,parse_value,profile_hash,format_like,DOFS
from node_catalogue import load_model,InvalidModel,conditions
from node_mapping import propose,accept,verify
from transfer_plan import make_plan,approve,recheck_preview_against_inputs
from export_audit import expected_bytes,audit_candidate,apply_export_disabled

ACK='GLOBAL_BASES_ALIGNED_OWNER_CONFIRMED';VACK='VECTOR_CORRESPONDENCE_OWNER_CONFIRMED'

def row(cells):
    # Independently authored neutral 2X plus six 13-column numeric fields.
    return b'  '+b''.join(f'{v:.4f}'.rjust(13).encode('ascii') if isinstance(v,(int,float)) else str(v).rjust(13).encode('ascii') for v in cells)+b'\r\n'

def make_record(node0,node1,changes=None):
    changes=changes or {}
    lines=[]
    for slot,node in enumerate((node0,node1)):
        lines.append(row([str(node)]))
        for v in range(1,10):
            cells=['9999.99']*6
            for (s,vector,dof),value in changes.items():
                if slot==s and vector==v: cells['DX DY DZ RX RY RZ'.split().index(dof)]=value
            lines.append(row(cells))
    return b''.join(lines),lines

def make_fixture(folder,name,element_defs,record_defs,names=None,units=None):
    folder=Path(folder);payload=b'FIXTURE-NOT-A-CII-MODEL\r\n'; disps=[]
    for rid,(n0,n1,changes) in record_defs.items():
        record,lines=make_record(n0,n1,changes)
        offsets=[];pos=len(payload)
        for line in lines: offsets.append(pos);pos+=len(line)
        disps.append({'id':rid,'line_starts':offsets})
        payload+=record
    payload+=b'END-FIXTURE\r\n'
    data_path=folder/(name+'.synthetic-slice');data_path.write_bytes(payload)
    m={'schema':'ciifr-node-manifest/v1','complete_sections_attested':True,
       'cii_path':str(data_path),'cii_sha256':hashlib.sha256(payload).hexdigest(),
       'profile_sha256':profile_hash(),'parser_id':'SYNTHETIC_UNIT_ONLY_NO_REAL_CONVERTER',
       'units':units or {'displacement':{'conversion':'1.0','label':'in'},'izup':'Y'},
       'elements':element_defs,'nodenames':names or [],'displacements':disps}
    manifest_path=folder/(name+'.manifest.json');manifest_path.write_text(json.dumps(m,indent=2))
    return manifest_path,data_path

class TestDictionary(unittest.TestCase):
    def test_known_positions_both_slots_vectors_1_and_9(self):
        for s,nfield,nrow in ((0,1,1),(1,56,11)):
            n=node_locator(s); self.assertEqual((n.flat_field,n.row,n.column),(nfield,nrow,1))
        self.assertEqual((component_locator(0,1,'DX').flat_field,component_locator(0,1,'DX').row,component_locator(0,1,'DX').column),(2,2,1))
        self.assertEqual((component_locator(0,9,'RZ').flat_field,component_locator(0,9,'RZ').row,component_locator(0,9,'RZ').column),(55,10,6))
        self.assertEqual((component_locator(1,1,'DX').flat_field,component_locator(1,1,'DX').row,component_locator(1,1,'DX').column),(57,12,1))
        self.assertEqual((component_locator(1,9,'RZ').flat_field,component_locator(1,9,'RZ').row,component_locator(1,9,'RZ').column),(110,20,6))
    def test_distinguishes_state(self):
        self.assertEqual(parse_value(b'       0.0000')[0],'zero')
        self.assertEqual(parse_value(b'      -0.0000')[0],'signed_zero')
        self.assertEqual(parse_value(b'      9999.99')[0],'sentinel')
        self.assertEqual(parse_value(b'          NAN')[0],'unsupported')
    def test_decimal_style_safe(self):
        from decimal import Decimal
        self.assertEqual(format_like(b'       2.0000',Decimal('0')),b'       0.0000')
        with self.assertRaisesRegex(ValueError,'inexact'): format_like(b'       2.0000',Decimal('1.23456'))
        with self.assertRaisesRegex(ValueError,'overflow'): format_like(b'       2.0000',Decimal('1234567890123'))

class TestTransfer(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory(); self.base=Path(self.t.name)
        src_elements=[{'id':'s2','from':20,'to':30,'nodename_pointer':2,'displacement_pointers':[]},
                      {'id':'s1','from':10,'to':20,'nodename_pointer':1,'displacement_pointers':['A']}]
        dst_elements=[{'id':'t1','from':100,'to':200,'nodename_pointer':5,'displacement_pointers':[]},
                      {'id':'t3','from':300,'to':400,'nodename_pointer':6,'displacement_pointers':['B']},
                      {'id':'t2','from':200,'to':300,'nodename_pointer':7,'displacement_pointers':[]}]
        src_names=[{'id':1,'from':'START','to':'MATCH'},{'id':2,'from':'MATCH','to':'END'}]
        dst_names=[{'id':5,'from':'X','to':'MATCH'},{'id':6,'from':'OTHER','to':'ZZ'},{'id':7,'from':'MATCH','to':'OTHER'}]
        self.sp,self.sb=make_fixture(self.base,'source',src_elements,{'A':(20,0,{(0,2,'DX'):'2.5000',(0,2,'DY'):'0.0000',(0,2,'RX'):'13.0000'})},src_names)
        self.tp,self.tb=make_fixture(self.base,'target',dst_elements,{'B':(200,0,{(0,7,'DX'):'1.0000',(0,7,'DY'):'0.0000',(0,7,'RX'):'14.0000'})},dst_names)
        self.s=load_model(self.sp);self.d=load_model(self.tp)
        self.map=accept(self.s,self.d,[(20,200)],'OWNER_FIXTURE','NAME')
    def tearDown(self): self.t.cleanup()
    def plan(self,components=('DX',),sv=2,tv=7): return make_plan(self.s,self.d,self.map,sv,tv,components,ACK,VACK)
    def test_proposals_no_implicit_approval(self):
        name=propose(self.s,self.d,'NAME')
        self.assertTrue(any(x['source_node']==20 and x['target_node']==200 for x in name))
        self.assertTrue(all(x['status']=='PROPOSED_NOT_ACCEPTED' for x in name))
        self.assertFalse(any(x['source_node']==20 for x in propose(self.s,self.d,'NUMBER')))
        self.assertFalse(any(x['source_node']==20 for x in propose(self.s,self.d,'BOTH')))
        with self.assertRaisesRegex(ValueError,'many-to-one'): accept(self.s,self.d,[(10,200),(20,200)],'O','MANUAL')
        with self.assertRaisesRegex(ValueError,'one-to-many'): accept(self.s,self.d,[(20,200),(20,300)],'O','MANUAL')
    def test_auxiliary_only_node_and_nonendpoint_owner(self):
        self.assertEqual(self.s['_records']['A']['owners'],['s1'])
        self.assertEqual(self.d['_records']['B']['slots'][0],200)
        self.assertNotIn(200,(300,400)) # owning element t3 doesn't touch condition node
        self.assertEqual(conditions(self.d,200,7,'DX')[0]['owners'],['t3'])
        p,raw=make_fixture(self.base,'orphan-node',[{'id':'e','from':1,'to':2,'displacement_pointers':['C']}],{'C':(77,0,{})})
        m=load_model(p)
        self.assertEqual([x['node'] for x in m['_catalogue'] if x['auxiliary_only']],[77])
    def test_vector_selection_exact(self):
        plan=self.plan(('DX','DY'))
        self.assertEqual(plan['status'],'PREVIEW_READY')
        self.assertEqual(len(plan['decisions']),2)
        self.assertEqual(plan['decisions'][0]['status'],'CHANGE_REQUIRES_CELL_ACCEPTANCE')
        self.assertEqual(plan['decisions'][1]['status'],'NO_OP')
        self.assertEqual(len(plan['read_only_target_context'][0]['target_prescriptions'][0]['vectors']),9)
        approval=approve(plan,'OWNER_FIXTURE',[plan['decisions'][0]['decision_id']])
        expected=expected_bytes(self.tb.read_bytes(),plan,approval)
        self.assertEqual(len(expected),len(self.tb.read_bytes()))
        s=plan['decisions'][0]['expected_span']; old=self.tb.read_bytes()
        # Independently computed field fixed width; no converter-generated oracle.
        manual=old[:s['start']]+b'       2.5000'+old[s['end']:]
        self.assertEqual(expected,manual)
        cand=self.base/'candidate.slice';cand.write_bytes(manual)
        self.assertEqual(audit_candidate(self.tb,cand,plan,approval)['status'],'BYTE_AUDIT_PASS_NOT_NATIVE_ACCEPTANCE')
        cand.write_bytes(manual.replace(b'END-FIXTURE',b'BAD-FIXTURE'))
        with self.assertRaisesRegex(ValueError,'byte oracle violation'): audit_candidate(self.tb,cand,plan,approval)
    def test_all_changes_explicitly_accepted(self):
        p=self.plan(('DX',))
        with self.assertRaisesRegex(ValueError,'every and only'): approve(p,'OWNER',[])
        with self.assertRaisesRegex(ValueError,'every and only'): approve(p,'OWNER',['extra'])
        with self.assertRaisesRegex(ValueError,'basis'): make_plan(self.s,self.d,self.map,2,7,['DX'],'NO',VACK)
        with self.assertRaisesRegex(ValueError,'vector meaning'): make_plan(self.s,self.d,self.map,2,7,['DX'],ACK,'NO')
    def test_missing_and_sentinel_block(self):
        p=self.plan(('DX',),2,9)
        self.assertEqual(p['status'],'BLOCKED')
        self.assertIn('SENTINEL_STATE_TRANSITION_FORBIDDEN',p['decisions'][0]['reasons'])
        with self.assertRaisesRegex(ValueError,'blocked'):approve(p,'O',[])
        m=accept(self.s,self.d,[(30,300)],'O','MANUAL')
        p=make_plan(self.s,self.d,m,2,7,['DX'],ACK,VACK)
        self.assertIn('MISSING_SOURCE_PRESCRIPTION',p['decisions'][0]['reasons'])
    def test_conflict_and_shared_ownership(self):
        # Change target one more owner for the same pointer: explicitly block.
        j=json.loads(self.tp.read_text());j['elements'][0]['displacement_pointers']=['B']
        self.tp.write_text(json.dumps(j));m=load_model(self.tp)
        p=make_plan(self.s,m,self.map,2,7,['DX'],ACK,VACK)
        self.assertIn('UNSUPPORTED_SHARED_OWNERSHIP_TARGET',p['decisions'][0]['reasons'])
    def test_units_izup(self):
        j=json.loads(self.tp.read_text());j['units']['displacement']['label']='mm'
        self.tp.write_text(json.dumps(j));m=load_model(self.tp)
        with self.assertRaisesRegex(ValueError,'units'):make_plan(self.s,m,self.map,2,7,['DX'],ACK,VACK)
    def test_modified_or_stale_plan(self):
        p=self.plan();p['source_vector']=9
        with self.assertRaisesRegex(ValueError,'stale'):approve(p,'O',[p['decisions'][0]['decision_id']])
        self.tb.write_bytes(self.tb.read_bytes()+b'X')
        with self.assertRaisesRegex(InvalidModel,'stale'):load_model(self.tp)
    def test_apply_does_not_touch_output(self):
        f=self.base/'existing.out';f.write_bytes(b'EXISTING')
        with self.assertRaisesRegex(RuntimeError,'EXPORT_DISABLED'):apply_export_disabled()
        self.assertEqual(f.read_bytes(),b'EXISTING')
    def test_malformed_offset_blocked(self):
        j=json.loads(self.tp.read_text());j['displacements'][0]['line_starts'][2]+=1
        self.tp.write_text(json.dumps(j))
        with self.assertRaises(InvalidModel):load_model(self.tp)

    def test_second_slot_vector_nine_transfers_and_masks(self):
        sp,sraw=make_fixture(self.base,'src-second',
            [{'id':'u','from':1,'to':2,'displacement_pointers':['R']}],
            {'R':(0,77,{(1,9,'DZ'):'-3.2500',(1,9,'RX'):'33.0000'})})
        tp,traw=make_fixture(self.base,'dst-second',
            [{'id':'v','from':4,'to':5,'displacement_pointers':['R2']}],
            {'R2':(0,88,{(1,1,'DZ'):'1.0000',(1,1,'RX'):'22.0000'})})
        a=load_model(sp);b=load_model(tp)
        mapping=accept(a,b,[(77,88)],'FIXTURE','MANUAL')
        plan=make_plan(a,b,mapping,9,1,['DZ'],ACK,VACK)
        self.assertEqual(plan['decisions'][0]['target_locator']['row'],12)
        self.assertEqual(plan['decisions'][0]['target_slot'],1)
        approval=approve(plan,'FIXTURE',[plan['decisions'][0]['decision_id']])
        patched=expected_bytes(traw.read_bytes(),plan,approval)
        self.assertIn(b'      -3.2500',patched)
        self.assertIn(b'      22.0000',patched)
    def test_multiple_distinct_prescriptions_conflict(self):
        p,raw=make_fixture(self.base,'multi',
            [{'id':'x','from':1,'to':2,'displacement_pointers':['Q']},
             {'id':'y','from':3,'to':4,'displacement_pointers':['R']}],
            {'Q':(51,0,{(0,7,'DX'):'1.0000'}),'R':(51,0,{(0,7,'DX'):'1.0000'})})
        other=load_model(p)
        mp=accept(self.s,other,[(20,51)],'FIXTURE','MANUAL')
        plan=make_plan(self.s,other,mp,2,7,['DX'],ACK,VACK)
        self.assertEqual(plan['status'],'BLOCKED')
        self.assertIn('MULTIPLE_TARGET_PRESCRIPTIONS',plan['decisions'][0]['reasons'])
    def test_inexact_proposed_value_blocks_entire_transaction(self):
        sp,raw=make_fixture(self.base,'inexact-src',
            [{'id':'x','from':1,'to':2,'displacement_pointers':['Q']}],
            {'Q':(20,0,{(0,2,'DX'):'1.23456789'})})
        src=load_model(sp)
        remap=accept(src,self.d,[(20,200)],'FIXTURE','MANUAL')
        plan=make_plan(src,self.d,remap,2,7,['DX'],ACK,VACK)
        self.assertEqual(plan['status'],'BLOCKED')
        self.assertTrue(any('INEXACT_OR_OVERFLOW' in r for r in plan['decisions'][0]['reasons']))
    def test_noop_accepted_byte_oracle(self):
        p=self.plan(('DY',))
        self.assertEqual(p['decisions'][0]['status'],'NO_OP')
        approval=approve(p,'FIXTURE',[])
        self.assertEqual(expected_bytes(self.tb.read_bytes(),p,approval),self.tb.read_bytes())


    def test_either_disagreement_and_no_autoaccept(self):
        q,raw=make_fixture(self.base,'either-target',[
            {'id':'a','from':20,'to':21,'nodename_pointer':1,'displacement_pointers':[]},
            {'id':'b','from':200,'to':201,'nodename_pointer':2,'displacement_pointers':[]}],{},[
            {'id':1,'from':'DIFFERENT','to':'XX'},{'id':2,'from':'MATCH','to':'YY'}])
        candidate=load_model(q)
        c=[x for x in propose(self.s,candidate,'EITHER') if x['source_node']==20]
        self.assertEqual({x['target_node'] for x in c},{20,200})
        self.assertTrue(all(x['disagreement'] for x in c))
        self.assertTrue(all(x['status']=='PROPOSED_NOT_ACCEPTED' for x in c))
        with self.assertRaisesRegex(ValueError,'not proposed'):
            accept(self.s,candidate,[(20,21)],'FIXTURE','EITHER')
    def test_recheck_preview_before_approval(self):
        p=self.plan(('DX',))
        self.assertTrue(recheck_preview_against_inputs(p,self.s,self.d,self.map))
        changed=copy.deepcopy(p);changed['engine_id']='NEW_ENGINE'
        with self.assertRaisesRegex(ValueError,'stale'):
            recheck_preview_against_inputs(changed,self.s,self.d,self.map)
        j=json.loads(self.tp.read_text());j['units']['displacement']['conversion']='25.4'
        self.tp.write_text(json.dumps(j))
        with self.assertRaisesRegex(ValueError,'units'):
            recheck_preview_against_inputs(p,self.s,load_model(self.tp),self.map)
    def test_duplicate_pointer_single_record_deduplicated(self):
        j=json.loads(self.tp.read_text())
        j['elements'][1]['displacement_pointers']=['B','B']
        self.tp.write_text(json.dumps(j));m=load_model(self.tp)
        self.assertEqual(len(conditions(m,200,7,'DX')),1)
        self.assertEqual(conditions(m,200,7,'DX')[0]['owners'],['t3'])
    def test_signed_zero_and_reverse_sentinel(self):
        sp,src=make_fixture(self.base,'zerosrc',
            [{'id':'a','from':1,'to':2,'displacement_pointers':['A']}],
            {'A':(20,0,{(0,2,'DX'):'0.0000'})})
        tp,dst=make_fixture(self.base,'zerodst',
            [{'id':'b','from':3,'to':4,'displacement_pointers':['B']}],
            {'B':(200,0,{(0,7,'DX'):'-0.0000',(0,9,'DX'):'1.0000'})})
        a=load_model(sp);b=load_model(tp);m=accept(a,b,[(20,200)],'FIXTURE','MANUAL')
        p=make_plan(a,b,m,2,7,['DX'],ACK,VACK)
        self.assertEqual(p['decisions'][0]['status'],'NO_OP')
        self.assertEqual(p['decisions'][0]['target_state'],'signed_zero')
        q=make_plan(a,b,m,1,9,['DX'],ACK,VACK)
        self.assertIn('SENTINEL_STATE_TRANSITION_FORBIDDEN',q['decisions'][0]['reasons'])


    def test_missing_alias_and_izup_mismatch(self):
        n=next(x for x in self.s['_catalogue'] if x['node']==10)
        self.assertEqual(n['aliases'],['START'])
        p,raw=make_fixture(self.base,'empty-alias',[
            {'id':'blank','from':77,'to':78,'nodename_pointer':9,'displacement_pointers':[]}],{},[
            {'id':9,'from':'','to':''}])
        c=load_model(p)
        self.assertFalse(any(x['source_node']==77 for x in propose(c,self.d,'NAME')))
        j=json.loads(self.tp.read_text());j['units']['izup']='Z'
        self.tp.write_text(json.dumps(j));model=load_model(self.tp)
        with self.assertRaisesRegex(ValueError,'IZUP'):
            make_plan(self.s,model,self.map,2,7,['DX'],ACK,VACK)

    def test_name_conflicts_ambiguity(self):
        p,b=make_fixture(self.base,'badname',[
          {'id':'q1','from':11,'to':12,'nodename_pointer':1,'displacement_pointers':[]},
          {'id':'q2','from':11,'to':13,'nodename_pointer':2,'displacement_pointers':[]}],{},[
          {'id':1,'from':'A','to':'SAME'},{'id':2,'from':'B','to':'SAME'}])
        x=load_model(p);r=next(n for n in x['_catalogue'] if n['node']==11)
        self.assertEqual(r['aliases'],['A','B']);self.assertTrue(r['name_conflict'])
        self.assertTrue(any(n['aliases']==['SAME'] for n in x['_catalogue']))
        self.assertFalse(any(z['source_node']==11 for z in propose(x,self.d,'NAME')))

if __name__=='__main__':unittest.main()
