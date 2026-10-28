import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcileCanonicalPsMappingResult, validateCanonicalPsMappingResult } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v25.js';

const line='S8810109';
function model(type,options={}) {
  const reference=options.reference||'SL-204.1';
  const node=options.node||'1800';
  const sourceId=options.sourceId||'T2:55';
  const id=options.id||'SL-204.1';
  const row={
    psnoModel:id,modelSourceId:sourceId,table2SourceId:sourceId,
    source:'TABLE1C_RICH',table1PsNo:reference,candidateNode:node,mappedNode:node,node,
    nodeLineFamily:line,lineFamily:line,derivedDn:'50',modelBore:50,
    nodeIsonote:options.note||'REST(5kN),LINE STOP(7kN), [LINE STOP GAP=20mm]',
    supportTypesRequested:type,t2Keywords:type,dtxr:type,
    gapMatch:options.status??'',supportGapMatch:options.status??'',
    gapMatchDetail:options.detail??'',supportGapRaw:options.gapRaw??'',
    psBasis:'PS_BASE',lineBasis:'LINE_EXACT',boreBasis:'BORE_DN_FROM_NPS',
    supportBasis:'SUPPORT_EXACT',supportMatch:type+' Match',
    mapped:true,selected:true,eligible:true,autoSelectable:true,reviewRequired:false,finalStatus:'MATCHED',
    warnings:options.warning||'',reason:options.reason||'',reviewAction:options.reviewAction||'',
    psNoWiseAction:options.action||'',
  };
  return {...row,...(options.override||{})};
}
function rawSource(row,gap) {
  return {psnoModel:row.psnoModel,modelSourceId:row.modelSourceId,supportGapRaw:gap};
}
function reconcile(rows,originals=[]) {
  return reconcileCanonicalPsMappingResult({
    rows,outputRows:rows,candidateRows:rows,validatorRows:rows,candidates:rows,
    consolidatedTable2Rows:originals,
  });
}
function candidate(result,id) {
  const row=result.candidateRows.find(r=>r.psnoModel===id);
  assert.ok(row,'missing '+id);
  return row;
}

test('an initially EXACT LINE STOP gap becomes a conflict when its physical Table-2 source changes',()=>{
  const r=model('STOP',{note:'REST(5kN), LINE STOP(7kN), [LINE STOP GAP=20mm]',
    gapRaw:'20mm GAP',status:'LINE_STOP_GAP_EXACT',
    id:'SL-204.1',node:'1800'});
  const out=reconcile([r],[rawSource(r,'5mm GAP')]);
  const x=candidate(out,'SL-204.1');
  assert.equal(x.supportGapRaw,'5mm GAP');
  assert.equal(x.gapMatch,'LINE_STOP_GAP_CONFLICT');
  assert.equal(x.nodeCoverageStatus,'PARTIAL'); // REST is also required, no real REST component supplied
  assert.equal(x.nodeComplianceStatus,'REVIEW_REQUIRED');
  assert.equal(x.reviewRequired,true);
  assert.equal(x.finalStatus,'USER_REVIEW_REQUIRED');
  assert.match(x.consolidatedNodeWiseAction,/5 mm.*20 mm/);
  assert.equal(x.missingNodeRestraints,'REST');
});

test('previously EXACT GUIDE with now empty Table-2 gap is still physically present',()=>{
  const r=model('GUIDE',{id:'PS-123.1',node:'5790',reference:'/PS-123.1',sourceId:'T2:17',
    note:'DO NOT REST [25mm GAP], GUIDE(1kN), [GUIDE GAP=10mm]',
    status:'GUIDE_GAP_EXACT',gapRaw:'10mm GAP'});
  const out=reconcile([r],[rawSource(r,'')]);
  const x=candidate(out,'PS-123.1');
  assert.equal(x.gapMatch,'GUIDE_GAP_MISSING_TABLE2');
  assert.equal(x.supportGapRaw,'');
  assert.equal(x.nodeCoverageStatus,'COVERED');
  assert.equal(x.t2CoveredRestraints,'GUIDE');
  assert.equal(x.missingNodeRestraints,'');
  assert.equal(x.reviewRequired,true);
  assert.doesNotMatch(x.consolidatedNodeWiseAction,/Add GUIDE/);
});

test('SL-204.1 and SL-294.8 exact model STOP gaps clear stale missing-gap actions',()=>{
  for(const [id,node,ref,gap] of [
    ['SL-204.1','1800','SL-204.1',20],['SL-294.8','2745','SL-294.7',10]]) {
    const oldDetail='Table-2 LINE STOP GAP is missing; Table-1C LINE STOP GAP is '+gap+' mm.';
    const r=model('STOP',{id,node,reference:ref,note:'LINE STOP(7kN), [LINE STOP GAP='+gap+'mm]',
      status:'LINE_STOP_GAP_MISSING_TABLE2',gapRaw:'',detail:oldDetail,
      warning:'LINE_STOP_GAP_MISSING_TABLE2',action:'Correct Table-2 LINE STOP GAP to Table-1',
      reviewAction:oldDetail,reason:oldDetail});
    const out=reconcile([r],[rawSource(r,gap+'mm GAP')]);
    const x=candidate(out,id);
    assert.equal(x.gapMatch,'LINE_STOP_GAP_EXACT',id);
    assert.equal(x.nodeCoverageStatus,'COVERED');
    assert.equal(x.missingNodeRestraints,'');
    assert.equal(x.psNoWiseAction,'');
    assert.equal(x.reviewAction,'');
    assert.equal(x.warnings,'');
    assert.equal(x.nodeComplianceStatus,'NO_OPEN_DIMENSIONAL_EXCEPTIONS');
  }
});

test('component MATCHED and node PARTIAL are separate, with engineering review flagged',()=>{
  const r=model('REST',{id:'SL-104.8',node:'9070',reference:'SL-104',
    note:'REST(18kN),GUIDE(6kN)',status:'',gapRaw:''});
  const out=reconcile([r]);
  const x=candidate(out,'SL-104.8');
  assert.equal(x.finalStatus,'MATCHED');
  assert.equal(x.nodeCoverageStatus,'PARTIAL');
  assert.equal(x.missingNodeRestraints,'GUIDE');
  assert.equal(x.reviewRequired,true);
  assert.match(x.nodeCoverageNote,/T2:55/);
  assert.match(x.consolidatedNodeWiseAction,/Missing GUIDE/);
  assert.equal(out.canonicalAssessments[0].nodeCoverageStatus,'PARTIAL');
});

test('an invented synthetic with an unrelated identifier is suppressed',()=>{
  const r=model('REST',{id:'SL-104.8',node:'9070',reference:'SL-104',
    note:'REST(18kN),GUIDE(6kN)'});
  const bad={...r,source:'TABLE1C_MISSING_SUPPORT',syntheticMissingSupport:true,
    psnoModel:'SL-999.X1',modelSourceId:'',supportTypesRequested:'GUIDE',t2Keywords:'GUIDE',
    finalStatus:'MATCHED',selected:true,mapped:true,autoSelectable:true};
  const out=reconcile([r,bad]);
  assert.equal(out.candidateRows.length,1);
  assert.equal(out.canonicalAssessments[0].proposed.length,0);
  assert.deepEqual(out.canonicalInvariantViolations,[]);
});

test('synthetic proposals never gain Table-2 identity or inherited mapping flags',()=>{
  const r=model('REST',{id:'SL-104.8',node:'9070',reference:'SL-104',
    note:'REST(18kN), GUIDE(6kN)'});
  const synthetic={...r,source:'TABLE1C_MISSING_SUPPORT',syntheticMissingSupport:true,
    psnoModel:'SL-104.X1',supportTypesRequested:'GUIDE',t2Keywords:'GUIDE',
    finalStatus:'MATCHED',selected:true,mapped:true,autoSelectable:true,
    modelSourceId:'T2:777',table2Row:777};
  const out=reconcile([r,synthetic]);
  const p=candidate(out,'SL-104.X1');
  assert.equal(p.finalStatus,'SUPPORT_MISSING_REQUIRED');
  assert.equal(p.mapped,false);assert.equal(p.selected,false);
  assert.equal(p.autoSelectable,false);assert.equal(p.reviewRequired,true);
  assert.equal(p.modelSourceId,'');assert.equal(p.table2Row,'');
  assert.deepEqual(out.canonicalInvariantViolations,[]);
});

test('unanchored physical alternative cannot introduce a node-wide gap action',()=>{
  const r=model('REST',{id:'SL-104.8',node:'9070',reference:'SL-104',note:'REST GUIDE'});
  const unanchored=model('GUIDE',{id:'SL-104.9',node:'9070',reference:'SL-104',
    sourceId:'T2:56',note:'REST GUIDE [GUIDE GAP=10mm]',
    status:'GUIDE_GAP_MISSING_TABLE2',gapRaw:'',
    override:{mapped:false,selected:false,finalStatus:'USER_REVIEW_REQUIRED',supportBasis:'SUPPORT_PARTIAL'}});
  const out=reconcile([r,unanchored]);
  const x=candidate(out,'SL-104.8');
  assert.equal(x.nodeCoverageStatus,'PARTIAL');
  assert.doesNotMatch(x.consolidatedNodeWiseAction,/GUIDE GAP is missing/);
});

test('validator detects fabricated mapped proposals and incorrect node review flags',()=>{
  const valid={canonicalAssessments:[{key:'s',required:['GUIDE'],present:[],missing:['GUIDE']}],
    candidateRows:[{source:'TABLE1C_MISSING_SUPPORT',syntheticMissingSupport:true,
      psnoModel:'SL-104.X1',table1PsNo:'SL-104',finalStatus:'MATCHED',
      mapped:true,selected:true,autoSelectable:true,reviewRequired:false}]};
  assert.ok(validateCanonicalPsMappingResult(valid).some(x=>x.code==='SYNTHETIC_MAPPED'));
  assert.ok(validateCanonicalPsMappingResult({...valid,
    canonicalAssessments:[{key:'s',required:['GUIDE'],present:['GUIDE'],missing:['GUIDE']}]})
    .some(x=>x.code==='PRESENT_AND_MISSING'));
});

test('app, Pages, and exported CSV detail columns preserve canonical hardening',()=>{
  for(const f of ['ps-mapping-utility/ps-mapping-engine-diagnostics-v25.js',
    'ps-mapping-utility-tab-candidate-copy-ui.js']) {
    const a=readFileSync(new URL('../tabs/'+f,import.meta.url),'utf8');
    const b=readFileSync(new URL('../docs/tabs/'+f,import.meta.url),'utf8');
    assert.equal(a,b,f);
  }
  const ui=readFileSync(new URL('../tabs/ps-mapping-utility-tab-candidate-copy-ui.js',import.meta.url),'utf8');
  assert.match(ui,/'nodeCoverageStatus', 'Node Coverage Status'/);
  assert.match(ui,/'nodeComplianceStatus', 'Node Compliance Status'/);
});
