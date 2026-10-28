import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runPsMappingResolver as runCore } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics.js';
import { runPsMappingResolver as runFull } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v2.js';

const ref = (rows) => [
  '| Line No | Node | Support No | Pipe size | ISONOTE | Mandatory |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map(([line,node,ps,size,iso]) => `| ${line} | ${node} | ${ps} | ${size} | ${iso} | Yes |`),
].join('\n');
const model = (rows) => [
  'Support No\tBore\tpipe\tDTXR\tSupport Gap\tMandatory',
  ...rows.map(([ps,bore,line,dtxr]) => [ps,bore,line,dtxr,'','No'].join('\t')),
].join('\n');
const S = '/ASIM-1885-PL-6"-CS-S8810106-02/B3';
const D = 'ASIM-1885-PL-2"-D8813152-91261M7-PP-01';
const iso = ":/PS-109.1 :ISONOTE 'REST(1kN){lat disp=70mm}'";
const oneRef = ref([[S,'3180','PS-109.1',2,iso]]);
const oneModel = model([['PS-109.1',50,D,'Pipe Rest XRT01']]);
const run = (fn, refs=oneRef, models=oneModel) => fn({
  table1cNodeIsonoteText: refs, table2ModelText: models,
});

test('Pass 2: exact support base, DN and reference node retain REST but flag Ambiguous — Line Mismatch', () => {
  const core=run(runCore);
  assert.equal(core.rows.length,1);
  const row=core.rows[0];
  assert.equal(row.finalStatus,'USER_REVIEW_REQUIRED');
  assert.equal(row.enabled,false);
  assert.equal(row.lineMismatchReview,true);
  assert.equal(row.identityPass,'02_BASE_DN_REFERENCE_NODE');
  assert.match(row.reviewAction,/Ambiguous.*Line Mismatch/);
  assert.equal(core.candidates[0].supportBasis,'SUPPORT_EXACT');
  assert.equal(core.candidates[0].boreBasis,'BORE_DN_FROM_NPS');
  assert.equal(core.candidates[0].lineBasis,'LINE_CONFLICT');
  assert.equal(core.candidates[0].autoSelectable,false);
  const coverage=core.supportCoverageRows[0];
  assert.equal(coverage.coverageStatus,'IDENTITY_CONFLICT_REVIEW');
  assert.equal(coverage.unverifiedDtxrKeywords,'REST');
  assert.equal(coverage.missingMasterKeywords,'');
});

test('Full pipeline: unresolved line identity cannot generate a hardware addition or a synthetic .X1', () => {
  const result=run(runFull);
  const relevant=[...(result.rows||[]),...(result.candidateRows||[])];
  assert.equal(relevant.some(r => r.syntheticMissingSupport===true),false);
  assert.equal(relevant.some(r => /PS-109\\.1\\.X1/.test(String(r.psnoModel))),false);
  assert.equal(relevant.some(r => r.finalStatus==='MATCHED' && r.psnoModel==='PS-109.1'),false);
  const candidate=relevant.find(r => r.lineMismatchReview===true && r.table1PsNo==='PS-109.1');
  assert.ok(candidate,'identity review should remain visible');
  assert.match(candidate.consolidatedNodeWiseAction,/Ambiguous.*Line Mismatch/);
  assert.doesNotMatch(candidate.consolidatedNodeWiseAction,/Add (?:missing )?REST as .*\\.X1/i);
  const assessment=result.canonicalAssessments.find(r=>r.node==='3180');
  assert.ok(assessment);
  assert.deepEqual(assessment.unverifiedLine,['REST']);
  assert.deepEqual(assessment.present,[]);
  assert.deepEqual(assessment.missing,[]);
});

test('Pass 1 always wins: same base and DN with matching line family maps normally', () => {
  const result=run(runFull,ref([[D,'3180','PS-109.1',2,iso]]));
  const actual=result.rows.find(r=>r.psnoModel==='PS-109.1');
  assert.ok(actual);
  assert.equal(actual.finalStatus,'MATCHED');
  assert.notEqual(actual.lineMismatchReview,true);
});

test('Pass 2 never auto-maps when two reference nodes share base and DN', () => {
  const references=ref([[S,'3180','PS-109.1',2,iso],
    ['/ASIM-1885-PL-6"-CS-S8810107-02/B3','3190','PS-109.1',2,iso]]);
  const result=run(runFull,references);
  const rows=result.candidateRows.filter(r=>r.lineMismatchReview===true);
  assert.equal(new Set(rows.map(r=>r.candidateNode)).size,2);
  assert.equal(rows.filter(r=>r.selected===true || r.autoSelectable===true).length,0);
  assert.equal(result.candidateRows.filter(r=>r.syntheticMissingSupport===true).length,0);
  for (const node of ['3180','3190']) {
    const assessment=result.canonicalAssessments.find(r=>r.node===node);
    assert.ok(assessment);
    assert.deepEqual(assessment.unverifiedLine,['REST']);
  }
});

test('Base and line matching with DN conflict does not qualify for pass 2', () => {
  const result=run(runCore,oneRef,model([['PS-109.1',80,D,'Pipe Rest XRT01']]));
  assert.notEqual(result.rows[0].lineMismatchReview,true);
  assert.equal(result.candidates[0].finalStatus,'REJECTED');
  assert.equal(result.supportCoverageRows[0].unverifiedDtxrKeywords,'');
});

test('Unrelated support base never qualifies for pass 2', () => {
  const result=run(runCore,oneRef,model([['PS-888.1',50,D,'Pipe Rest XRT01']]));
  assert.notEqual(result.rows[0].lineMismatchReview,true);
  assert.equal(result.rows[0].finalStatus,'NO_MATCH');
});


test('PS-131.1: PIPE STOP is LINE_STOP; DO NOT REST is not a positive REST requirement', () => {
  const refs=ref([['/ASIM-1885-PL-6"-CS-W8810003-01/B1','4190','/PS-131.1',2,
    "://PS-131.1 :ISONOTE 'DO NOT REST [25mm GAP](1kN),LINE STOP(2kN)'"]]);
  const models=model([
    ['PS-131.3',50,'ASIM-1885-PL-3"-S8810107-91261M7-01','Pipe Rest XRT01'],
    ['PS-131.1',50,'ASIM-1885-PL-3"-S8810107-91261M7-01','PIPE STOP TYPE-602'],
  ]);
  const result=run(runFull,refs,models);
  const rows=[...(result.rows||[]),...(result.candidateRows||[])];
  const stop=rows.find(r=>r.psnoModel==='PS-131.1' && r.lineMismatchReview===true);
  assert.ok(stop,'existing PIPE STOP must remain visible as line-mismatch review');
  assert.equal(stop.modelDtxrKeywords,'LINE STOP');
  assert.equal(stop.selected,false);
  const group=result.canonicalAssessments.find(g=>g.node==='4190');
  assert.ok(group);
  assert.deepEqual(group.required,['LINE_STOP']);
  assert.ok(group.unverifiedLine.includes('LINE_STOP'));
  assert.ok(!group.missing.includes('LINE_STOP'));
  assert.ok(!group.missing.includes('REST'));
  assert.equal(rows.some(r=>r.syntheticMissingSupport===true),false);
});

test('SL-211.2: same-base DN300 REST and directional-anchor LINE STOP are unverified, not absent', () => {
  const refs=ref([['/ASIM-1885-PL-8"-CS-S8810104-01','720','SL-211.2',12,
    ":/SL-211.2 :ISONOTE 'REST(10kN),LINE STOP(18kN), [LINE STOP GAP=25mm]'"]]);
  const models=model([
    ['SL-211.2',300,'ASIM-1885-PL-10"-S8810105-HOT-01','PIPE SHOE FOR HORIZ LINES N.B. 3/4" to 24" 12-PDO-TYPE-416A/B-200-800 Carbon Steel'],
    ['SL-211.4',300,'ASIM-1885-PL-10"-S8810105-HOT-01','Pipe Rest XRT01'],
    ['SL-211.3',300,'ASIM-1885-PL-10"-S8810105-HOT-01','WEAR PLATE TYPE-421 PAD L 900mm'],
    ['SL-211.1',300,'ASIM-1885-PL-10"-S8810105-HOT-01','Directional Anchor On Shoe for Hot Insulated Pipe NPS 1/2- 36 12-XST06-40'],
    ['SL-117.4',250,'ASIM-1885-PL-10"-S8810105-HOT-01','Pipe Rest XRT01'],
    ['SL-117.8',250,'ASIM-1885-PL-10"-S8810105-HOT-01','GUIDE PDO-TYPE-603'],
  ]);
  const result=run(runFull,refs,models);
  const rows=[...(result.rows||[]),...(result.candidateRows||[])];
  const stop=rows.find(r=>r.psnoModel==='SL-211.1' && r.lineMismatchReview===true);
  const rest=rows.find(r=>r.psnoModel==='SL-211.4' && r.lineMismatchReview===true);
  assert.ok(stop,'directional anchor provides potential LINE_STOP hardware');
  assert.ok(rest,'existing DN300 REST must be retained as line-mismatch candidate');
  assert.equal(stop.selected,false);
  assert.equal(rest.selected,false);
  assert.equal(stop.autoSelectable,false);
  const group=result.canonicalAssessments.find(g=>g.node==='720');
  assert.ok(group);
  assert.deepEqual(group.required,['REST','LINE_STOP']);
  assert.ok(group.unverifiedLine.includes('REST'));
  assert.ok(group.unverifiedLine.includes('LINE_STOP'));
  assert.deepEqual(group.missing,[]);
  assert.equal(rows.some(r=>r.syntheticMissingSupport===true),false);
  assert.equal(rows.some(r=>/SL-211\.2\.X[12]/.test(String(r.psnoModel))),false);
});

test('Application modules and GitHub Pages copies are byte-identical', () => {
  for(const p of ['ps-mapping-engine-diagnostics.js','ps-mapping-engine-diagnostics-v6.js','ps-mapping-engine-diagnostics-v17.js',
    'ps-mapping-engine-diagnostics-v25.js']) {
    assert.equal(readFileSync(new URL('../docs/tabs/ps-mapping-utility/'+p,import.meta.url),'utf8'),
      readFileSync(new URL('../tabs/ps-mapping-utility/'+p,import.meta.url),'utf8'),p);
  }
});
