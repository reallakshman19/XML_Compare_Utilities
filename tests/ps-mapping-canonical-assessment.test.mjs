import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PS_MAPPING_V17_TEST } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v17.js';
import { PS_MAPPING_V20_TEST } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v20.js';
import { reconcileCanonicalPsMappingResult } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v25.js';

const iso123="://PS-123.1 :ISONOTE 'DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]'";
const physical=(id,node,ref,type,more={})=>({
  psnoModel:id, modelSourceId:more.modelSourceId||'T2:17',
  source:'TABLE1C_RICH', table1PsNo:ref, mappedTable1PsNo:ref, mappedNode:node, node,
  nodeLineFamily:more.line||'S8810109', lineFamily:more.line||'S8810109',
  derivedDn:more.dn||'50',modelBore:Number(more.dn||'50'),
  nodeIsonote:more.isonote||iso123,
  dtxr:more.dtxr||type, t2Keywords:type, supportTypesRequested:type,
  psBasis:more.psBasis||'PS_BASE', boreBasis:'BORE_DN_FROM_NPS',lineBasis:'LINE_EXACT',
  supportBasis:more.supportBasis||'SUPPORT_EXACT', supportMatch:type+' Match',
  mapped:true,selected:false,autoSelectable:more.autoSelectable??false,
  finalStatus:more.status||'USER_REVIEW_REQUIRED', reviewRequired:true,
  gapMatch:more.gapMatch||'', supportGapRaw:more.gapRaw||'',
  psNoWiseAction:more.action||'',warnings:more.warnings||'',
});
const proposal=(rep,id,type)=>({
  ...PS_MAPPING_V20_TEST.buildSyntheticRow(rep,{type,supportNo:id}),
  // Old v20 mistakenly inherited this state; v25 must block it.
  finalStatus:'MATCHED',mapped:true,selected:true,autoSelectable:true,
  eligible:true,reviewRequired:false,
});
const reconcile=rows=>reconcileCanonicalPsMappingResult({rows,candidateRows:rows,outputRows:rows,validatorRows:rows,candidates:rows});

test('PS-123.1: actual GUIDE counts despite missing Table-2 gap; false .X1 is dropped',()=>{
  const guide=physical('PS-123.1','5790','/PS-123.1','GUIDE',{gapMatch:'GUIDE_GAP_MISSING_TABLE2'});
  const rest=physical('PS-123.2','5790','/PS-123.1','REST',{
    modelSourceId:'T2:18',dtxr:'Pipe Rest XRT01',supportBasis:'SUPPORT_CONFLICT',
    gapMatch:'REST_CLEARANCE_EXACT',gapRaw:'25mm GAP BETWEEN BOP AND TOS',
    warnings:'SUPPORT_CONFLICT; SUPPORT_MISSING_REST',
  });
  assert.equal(PS_MAPPING_V17_TEST.isAcceptedMapping(guide),true);
  const result=reconcile([guide,rest,proposal(guide,'/PS-123.1.X1','GUIDE')]);
  assert.equal(result.candidateRows.length,2);
  assert.equal(result.candidateRows[0].t2CoveredRestraints,'GUIDE');
  assert.equal(result.candidateRows[0].missingNodeRestraints,'');
  assert.match(result.candidateRows[0].consolidatedNodeWiseAction,/GUIDE GAP is missing/);
  assert.doesNotMatch(result.candidateRows[0].consolidatedNodeWiseAction,/Add GUIDE/);
  assert.equal(result.candidateRows[1].gapMatch,'REST_CLEARANCE_EXACT');
  assert.doesNotMatch(result.candidateRows[1].warnings,/SUPPORT_MISSING_REST|SUPPORT_CONFLICT/);
});

test('PS-126.1: existing GUIDE remains present with 20 mm gap review',()=>{
  const guide=physical('PS-126.1','6690','PS-126.1','GUIDE',{
    psBasis:'PS_EXACT',modelSourceId:'T2:27',
    isonote:"/PS-126.1 :ISONOTE 'DO NOT REST [25mm GAP],GUIDE,[GUIDE GAP=20mm]'",
    gapMatch:'GUIDE_GAP_MISSING_TABLE2',
  });
  const out=reconcile([guide,proposal(guide,'PS-126.1.X1','GUIDE')]);
  assert.equal(out.candidateRows.length,1);
  assert.equal(out.candidateRows[0].missingNodeRestraints,'');
});

test('SL-042.12 and SL-042.8: GUIDE and STOP provide coverage independently of gap review',()=>{
  const ref="REST(13kN), GUIDE(6kN), [GUIDE GAP=10mm], LINE STOP(16kN)";
  const base={node:'20850',ref:'SL-042.6',line:'S8810109',dn:'100',isonote:ref};
  const rest=physical('SL-042.16',base.node,base.ref,'REST',{...base,modelSourceId:'T2:160',status:'MATCHED',autoSelectable:true});
  const guide=physical('SL-042.12',base.node,base.ref,'GUIDE',{...base,modelSourceId:'T2:162',gapMatch:'GUIDE_GAP_MISSING_TABLE2'});
  const stop=physical('SL-042.8',base.node,base.ref,'STOP',{...base,modelSourceId:'T2:165',gapMatch:'LINE_STOP_GAP_MISSING_TABLE1',gapRaw:'10mm GAP'});
  const result=reconcile([rest,guide,stop,proposal(rest,'SL-042.6.X1','GUIDE'),proposal(rest,'SL-042.6.X2','LINE_STOP')]);
  assert.equal(result.candidateRows.length,3);
  for(const row of result.candidateRows) {
    assert.equal(row.t2CoveredRestraints,'REST + GUIDE + LINE STOP');
    assert.equal(row.missingNodeRestraints,'');
  }
});

test('SL-204.1 / SL-294.8: explicit STOP owns generic model gap, not incidental Pipe wording',()=>{
  for(const [id,node,ref,gap] of [['SL-204.1','1800','SL-204.1',20],['SL-294.8','2745','SL-294.7',10]]) {
    const iso="REST(15kN),LINE STOP(32kN), [LINE STOP GAP="+gap+"mm]";
    const row=physical(id,node,ref,'STOP',{
      modelSourceId:'T2:'+(gap===20?'672':'1790'),isonote:iso,
      dtxr:'Directional Anchor On Shoe for Hot Insulated Pipe NPS 1/2-36 12-XST06-40',
      gapMatch:'LINE_STOP_GAP_MISSING_TABLE2',gapRaw:gap+'mm GAP',
    });
    const result=reconcile([row]);
    assert.equal(result.candidateRows[0].gapMatch,'LINE_STOP_GAP_EXACT',id);
    assert.doesNotMatch(result.candidateRows[0].consolidatedNodeWiseAction,/Correct Table-2|LINE STOP GAP is missing/i,id);
  }
});

test('a legitimately absent GUIDE creates a review-only, not a matched, synthetic action',()=>{
  const rest=physical('SL-104.8','9070','SL-104','REST',{
    isonote:'REST(18kN), GUIDE(6kN)',modelSourceId:'T2:829',
    status:'MATCHED',autoSelectable:true,
  });
  const synthetic=proposal(rest,'SL-104.X1','GUIDE');
  const result=reconcile([rest,synthetic]);
  assert.equal(result.candidateRows.length,2);
  assert.equal(result.candidateRows[0].missingNodeRestraints,'GUIDE');
  assert.deepEqual(result.canonicalAssessments[0].proposed,['SL-104.X1']);
  const proposed=result.candidateRows[1];
  assert.equal(proposed.finalStatus,'SUPPORT_MISSING_REQUIRED');
  assert.equal(proposed.mapped,false);
  assert.equal(proposed.selected,false);
  assert.equal(proposed.autoSelectable,false);
  assert.equal(proposed.eligible,false);
  assert.equal(proposed.reviewRequired,true);
  assert.equal(proposed.modelSourceId,'');
  assert.equal(proposed['Chosen Mapping'],'NO');
});

test('placeholder zero or PS-XXXX cannot allocate .Xn and 19-node collisions are blocked',()=>{
  assert.equal(PS_MAPPING_V17_TEST.isValidProposedBase('0'),false);
  assert.equal(PS_MAPPING_V20_TEST.validProposedBase('0'),false);
  assert.equal(PS_MAPPING_V20_TEST.validProposedBase('PS-XXXX'),false);
  const rows=[];
  for(let i=0;i<19;i++) {
    const ref=physical('-','2067-'+i,'0','REST',{
      isonote:"/PS-XXXX :ISONOTE 'REST(5kN)'",modelSourceId:'',
      supportBasis:'SUPPORT_MISSING_MASTER_REQUIRED',status:'SUPPORT_MISSING_REQUIRED',
    });
    ref.modelSourceId='';
    rows.push(ref,proposal(ref,'0.X1','REST'));
  }
  const out=reconcile(rows);
  assert.equal(out.candidateRows.filter(r=>r.syntheticMissingSupport).length,0);
  assert.equal(out.canonicalAssessments.length,19);
  assert.ok(out.canonicalAssessments.every(g=>g.missing.includes('REST')));
});

test('synthetic factory resets all inherited matching flags at construction',()=>{
  const rep=physical('SL-104.8','9070','SL-104','REST',{status:'MATCHED',autoSelectable:true});
  Object.assign(rep,{selected:true,eligible:true,reviewRequired:false});
  const synthetic=PS_MAPPING_V20_TEST.buildSyntheticRow(rep,{type:'GUIDE',supportNo:'SL-104.X1'});
  assert.equal(synthetic.finalStatus,'SUPPORT_MISSING_REQUIRED');
  assert.equal(synthetic.selected,false);
  assert.equal(synthetic.autoSelectable,false);
  assert.equal(synthetic.mapped,false);
  assert.equal(synthetic.reviewRequired,true);
  assert.equal(synthetic.modelSourceId,'');
});

test('distinct contexts cannot reuse the same proposed support ID',()=>{
  const r1=physical('SL-104.1','9070','SL-104','REST',{isonote:'REST GUIDE',status:'MATCHED'});
  const r2=physical('SL-104.2','9080','SL-104','REST',{isonote:'REST GUIDE',status:'MATCHED',modelSourceId:'T2:19'});
  const out=reconcile([r1,r2,proposal(r1,'SL-104.X1','GUIDE'),proposal(r2,'SL-104.X1','GUIDE')]);
  assert.equal(out.candidateRows.filter(x=>x.syntheticMissingSupport).length,0);
  assert.equal(out.canonicalAssessments.length,2);
  assert.ok(out.canonicalAssessments.every(g=>g.missing.includes('GUIDE')));
});

test('canonical app modules and GitHub Pages copies are identical',()=>{
  for(const path of ['ps-mapping-engine-diagnostics-v2.js','ps-mapping-engine-diagnostics-v17.js',
    'ps-mapping-engine-diagnostics-v20.js','ps-mapping-engine-diagnostics-v25.js']) {
    const a=readFileSync(new URL('../tabs/ps-mapping-utility/'+path,import.meta.url),'utf8');
    const b=readFileSync(new URL('../docs/tabs/ps-mapping-utility/'+path,import.meta.url),'utf8');
    assert.equal(a,b,path);
  }
});
