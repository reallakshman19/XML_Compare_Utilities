import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runPsMappingResolver } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v2.js';
import { reconcileCanonicalPsMappingResult } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v25.js';

const reference = [
  ['Line No','Node','Support No','Pipe size','ISONOTE','Mandatory'],
  ['/ASIM-1885-PL-3"-S8810109-91261M7-01','5790','/PS-123.1','2',
    "://PS-123.1 :ISONOTE 'DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]{axial disp=120mm}'",'Yes'],
].map(row=>row.join('\t')).join('\n');

const model = [
  ['Support No','Bore','pipe','DTXR','Support Gap','Mandatory'],
  ['PS-123.3','80','ASIM-1885-PL-3"-S8810109-91261M7-01','WEAR PLATE TYPE-421 PAD L 300mm','','No'],
  ['PS-123.1','50','ASIM-1885-PL-3"-S8810109-91261M7-01','GUIDE -TYPE-604A/B - 2 x L50x50x6x55HIGH','','No'],
  ['PS-123.2','50','ASIM-1885-PL-3"-S8810109-91261M7-01','Pipe Rest XRT01','25mm GAP BETWEEN BOP AND TOS','No'],
].map(row=>row.join('\t')).join('\n');

const modelRow=(result,id)=>[...(result.candidates||[]),...(result.candidateRows||[])].find(row=>
  (row.psnoModel||row.supportNoModel)===id);

test('PS-123 real source: Table-2 REST 25mm clearance is exact and GUIDE gap remains missing',()=>{
  const result=runPsMappingResolver({table1cNodeIsonoteText:reference,table2ModelText:model});
  const guide=modelRow(result,'PS-123.1');
  const rest=modelRow(result,'PS-123.2');
  assert.ok(guide,'Expected GUIDE component');
  assert.ok(rest,'Expected non-contact REST component');
  assert.equal(guide.supportGapRaw,'');
  assert.equal(guide.supportGapMatch||guide.gapMatch,'GUIDE_GAP_MISSING_TABLE2');
  assert.equal(rest.supportGapRaw,'25mm GAP BETWEEN BOP AND TOS');
  assert.equal(rest.supportGapMatch||rest.gapMatch,'REST_CLEARANCE_EXACT');
  assert.equal(rest.supportMatch,'REST non-contact clearance Match');
  assert.equal(rest.nodeRestClearanceMm,25);
  assert.equal(rest.supportGapMm,25);
  assert.equal(rest.t2CoveredRestraints,'GUIDE');
  assert.equal(rest.missingNodeRestraints,'');
  assert.doesNotMatch(String(rest.warnings||''),/SUPPORT_CONFLICT|SUPPORT_MISSING_REST/);
  assert.doesNotMatch(String(rest.psNoWiseAction||''),/Add REST|Correct Table-2 REST/i);
  assert.ok(!result.candidates.some(row=>row.syntheticMissingSupport && /PS-123\.1\.X\d/.test(row.psnoModel)));
});

const restRow = (supportGapRaw='stale value')=>({
  psnoModel:'PS-123.2',modelSourceId:'T2:18',table2SourceId:'T2:18',
  table1PsNo:'/PS-123.1',candidateNode:'5790',mappedNode:'5790',node:'5790',
  nodeLineFamily:'S8810109',lineFamily:'S8810109',derivedDn:'50',modelBore:50,
  nodeIsonote:"DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]",
  dtxr:'Pipe Rest XRT01',supportTypesRequested:'REST',supportGapRaw,
  gapMatch:'GUIDE_GAP_MISSING_TABLE2',supportGapMatch:'GUIDE_GAP_MISSING_TABLE2',
  supportMatch:'Missing REST',supportBasis:'SUPPORT_CONFLICT',psBasis:'PS_BASE',
  boreBasis:'BORE_DN_FROM_NPS',lineBasis:'LINE_EXACT',mapped:true,
  finalStatus:'USER_REVIEW_REQUIRED',reviewRequired:true,
  warnings:'SUPPORT_CONFLICT; SUPPORT_MISSING_REST; GUIDE_GAP_MISSING_TABLE2',
  psNoWiseAction:'Correct Table-2 REST clearance',
});
function modelRecord(raw){
  return {psnoModel:'PS-123.2',sourceRow:18,supportGapRaw:raw};
}
function reconcile(raw){
  const row=restRow();
  const result=reconcileCanonicalPsMappingResult({
    rows:[row],candidateRows:[row],consolidatedTable2Rows:[modelRecord(raw)],
  });
  return result.candidateRows[0];
}

test('REST non-contact exact is sourced from same Table-2 ID, not stale row or GUIDE value',()=>{
  const row=reconcile('25mm GAP BETWEEN BOP AND TOS');
  assert.equal(row.supportGapRaw,'25mm GAP BETWEEN BOP AND TOS');
  assert.equal(row.supportGapMatch,'REST_CLEARANCE_EXACT');
  assert.equal(row.supportMatch,'REST non-contact clearance Match');
  assert.equal(row.psNoWiseAction,'');
  assert.equal(row.nodeRestClearanceMm,25);
  assert.doesNotMatch(row.warnings,/SUPPORT_MISSING_REST|SUPPORT_CONFLICT/);
});

test('REST non-contact conflict reports actual measured clearance, not REST hardware shortage',()=>{
  const row=reconcile('20mm GAP BETWEEN BOP AND TOS');
  assert.equal(row.supportGapRaw,'20mm GAP BETWEEN BOP AND TOS');
  assert.equal(row.supportGapMatch,'REST_CLEARANCE_CONFLICT');
  assert.match(row.psNoWiseAction,/20 mm.*25 mm/);
  assert.equal(row.reviewRequired,true);
  assert.equal(row.finalStatus,'USER_REVIEW_REQUIRED');
  assert.match(row.consolidatedNodeWiseAction,/20 mm.*25 mm/);
  assert.doesNotMatch(row.warnings,/SUPPORT_MISSING_REST/);
});

test('missing model REST clearance is not populated from the reference ISONOTE or another model',()=>{
  const row=reconcile('');
  assert.equal(row.supportGapRaw,'');
  assert.equal(row.supportGapMatch,'REST_CLEARANCE_MISSING_TABLE2');
  assert.match(row.psNoWiseAction,/REST clearance is missing/);
  assert.equal(row.supportGapMm,'');
  assert.equal(row.reviewRequired,true);
});

test('candidate UI and complete CSV have requested first 19 columns in identical order',()=>{
  const code=readFileSync(new URL('../tabs/ps-mapping-utility-tab-candidate-copy-ui.js',import.meta.url),'utf8');
  const basic=code.match(/const BASIC_COLUMNS = \[([\s\S]*?)\];/);
  assert.ok(basic);
  const labels=[...basic[1].matchAll(/\['[^']+',\s*'([^']+)'\]/g)].map(m=>m[1]);
  assert.deepEqual(labels,[
    'Model Support No','Reference Node','Reference Support No','Model Restraints',
    'Required at Node','Covered by Model','Reference ISONOTE',
    'Node-wide Action (all mapped rows)','Missing Restraints','Extra Model Restraints',
    'Restraint Verdict','Support Gap','Gap / Clearance Verdict','Mapping Status',
    'Required Model Action','Assessment / Evidence','Model Bore',
    'Model Line Family','Reference Line Family',
  ]);
  assert.match(code,/if \(key === 'supportGapRaw'\) return row\.supportGapRaw \?\? '';/);
  assert.match(code,/const columns = \[\.\.\.BASIC_COLUMNS, \.\.\.DETAIL_COLUMNS\]/);
  assert.match(code,/valueFor\(row, col\[0\]\)/);
});

test('candidate UI, canonical engine and Pages mirrors are synchronized',()=>{
  for(const name of ['ps-mapping-utility-tab-candidate-copy-ui.js',
    'ps-mapping-utility/ps-mapping-engine-diagnostics-v25.js']) {
    const a=readFileSync(new URL('../tabs/'+name,import.meta.url),'utf8');
    const b=readFileSync(new URL('../docs/tabs/'+name,import.meta.url),'utf8');
    assert.equal(a,b,name);
  }
});
