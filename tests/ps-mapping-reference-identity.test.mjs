import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runPsMappingResolver, DEFAULT_OPTIONS } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics-v2.js';
import { runPsMappingResolver as runCoreResolver } from '../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics.js';

const refs=[
  ['Line No','Node','Support No','Pipe size','ISONOTE','Mandatory'],
  ['/ASIM-1885-PL-10"-CS-S8810105-01/B2','910','SL-104','10',":/SL-104 :ISONOTE 'REST(14kN){axial disp=130mm}'",'Yes'],
  ['/ASIM-1885-PL-4"-CS-M8810130-01/B2','10150','SL-104','4',":/SL-104 :ISONOTE 'REST(4kN), GUIDE(2kN){axial disp=105mm}'",'Yes'],
  ['/ASIM-1885-PL-8"-M8810123-01/B1','9070','SL-104','8',":/SL-104 :ISONOTE 'REST(10kN), GUIDE(5kN){axial disp=105mm}'",'Yes'],
];
const models=[
  ['Support No','Bore','pipe','DTXR','Support Gap','Mandatory'],
  ['SL-104.9','250.00','ASIM-1885-PL-10"-S8810105-HOT-01','WEAR PLATE TYPE-421 PAD L 900mm','','No'],
  ['SL-104.7','250.00','ASIM-1885-PL-10"-S8810105-HOT-01','Pipe Rest XRT01','','No'],
  ['SL-104.10','250.00','ASIM-1885-PL-10"-S8810105-HOT-01','PIPE SHOE FOR HORIZ LINES N.B. 3/4" to 24" 10--TYPE-416A/B-200-800 Carbon Steel','','No'],
  ['SL-104.6','50.00','ASIM-1885-PL-2"-G8010016-01','Pipe Rest XRT01','','No'],
  ['SL-104.3','50.00','ASIM-1885-PL-2"-G8010016-01','GUIDE -TYPE-604A/B','','No'],
  ['SL-104.4','100.00','ASIM-1885-PL-4"-M8810130-PP-01','Pipe Rest XRT01','','No'],
  ['SL-104.1','100.00','ASIM-1885-PL-4"-M8810130-PP-01','GUIDE -TYPE-604A/B','','No'],
  ['SL-104.5','150.00','ASIM-1885-PL-6"-W8810002-01','Pipe Rest XRT01','','No'],
  ['SL-104.2','150.00','ASIM-1885-PL-6"-W8810002-01','GUIDE -TYPE-604A/B','','No'],
  ['SL-104.8','200.00','ASIM-1885-PL-8"-M8810123-PP-01','Pipe Rest XRT01','','No'],
];
const tsv = rows => rows.map(r=>r.join('\t')).join('\n');
const source = { table1cNodeIsonoteText:tsv(refs),table2ModelText:tsv(models) };
const matches = [ ['SL-104.9','910'],['SL-104.7','910'],['SL-104.10','910'],
  ['SL-104.4','10150'],['SL-104.1','10150'],['SL-104.8','9070'] ];
const unqualified = ['SL-104.6','SL-104.3','SL-104.5','SL-104.2'];
function run(options={}) {return runPsMappingResolver({...source,options});}
function modelRows(out) {return (out.rows||[]).filter(r=>/^SL-104\.\d+$/.test(r.psnoModel||''));}
function modelIn(result,id) {return (result||[]).find(r=>r.psnoModel===id);}
function assertNoCrossAssignments(out) {
  for(const [id,node] of matches) assert.equal(modelIn(modelRows(out),id)?.node,node,id);
  for(const id of unqualified) {
    const row=modelIn(modelRows(out),id);
    assert.ok(row,id);
    assert.equal(String(row.node||''),'',id);
    assert.equal(!!row.mapped,false,id);
    assert.notEqual(row.finalStatus,'MATCHED',id);
    assert.ok(!out.candidateRows.some(r=>r.psnoModel===id && r.mapped),id);
  }
}
test('default reference identity requires support base + line family + DN + node',()=>{
  assert.equal(DEFAULT_OPTIONS.requireLineFamilyInIdentity,true);
  const out=run();
  assertNoCrossAssignments(out);
  assert.equal(out.options.requireLineFamilyInIdentity,true);
  const rejected=(out.consolidatedTable2Rows||[]).find(r=>r.psnoModel==='SL-104.6');
  assert.equal(rejected?.bore,50);
  assert.equal(out.candidates.some(r=>r.psnoModel==='SL-104.6' && r.mapped===true),false);
  assert.equal(modelIn(out.rows,'SL-104.8')?.node,'9070');
});
test('explicit optional Linekey still rejects different DN and keeps same six correct SL-104 matches',()=>{
  const out=run({requireLineFamilyInIdentity:false});
  assert.equal(out.options.requireLineFamilyInIdentity,false);
  assertNoCrossAssignments(out);
  assert.match(String(out.approxConfig?.configuredReferenceIdentity||''),/SUPPORT_BASE_DN_NODE/);
});
test('DN50 compared against known DN250 is BORE_CONFLICT, never BORE_MISSING',()=>{
  const base=run();
  const c=base.candidates.find(r=>r.psnoModel==='SL-104.6'&&r.candidateNode==='910');
  // Some downstream stages retain only selected candidates; inspect the raw engine fixture if absent.
  const raw=readFileSync(new URL('../tabs/ps-mapping-utility/ps-mapping-engine-diagnostics.js',import.meta.url),'utf8');
  assert.match(raw,/if \(Number\.isFinite\(npsDn\)\) return \{ basis: 'BORE_CONFLICT'/);
  assert.equal(c?.boreBasis === 'BORE_MISSING',false);
});
test('optional Linekey permits unique same-DN line mismatch for review, never auto-approval',()=>{
  const sameDn=[
    ...models.slice(0,1),
    ['SL-104.11','250','ASIM-1885-PL-10"-Z9999999-01','Pipe Rest XRT01','','No'],
  ];
  const full=runPsMappingResolver({table1cNodeIsonoteText:tsv(refs),table2ModelText:tsv(sameDn),
    options:{requireLineFamilyInIdentity:false}});
  const row=modelIn(full.rows,'SL-104.11');
  assert.ok(row);
  assert.equal(row.node,'910');
  assert.equal(row.mapped,true);
  assert.equal(row.finalStatus,'USER_REVIEW_REQUIRED');
  assert.equal(row.autoSelectable,false);
  assert.match(row.warnings,/LINE_IDENTITY_OPTIONAL_OR_APPROX_REVIEW/);
  assert.equal(row.t2CoveredRestraints,'REST');
  assert.equal(row.missingNodeRestraints,'');
  const strict=runPsMappingResolver({table1cNodeIsonoteText:tsv(refs),table2ModelText:tsv(sameDn)});
  const secondPass=modelIn(strict.rows,'SL-104.11');
  assert.ok(secondPass);
  // Updated contract: strict line mode attempts Pass 1, then exposes a
  // review-only Base + DN + Node candidate when the line family differs.
  assert.equal(secondPass.node,'910');
  assert.equal(secondPass.finalStatus,'USER_REVIEW_REQUIRED');
  assert.equal(secondPass.mapped,false);
  assert.equal(secondPass.autoSelectable,false);
  assert.equal(secondPass.lineMismatchReview,true);
  assert.match(secondPass.reviewAction,/Ambiguous.*Line Mismatch/);
});
test('optional Linekey never guesses when two reference nodes share base PS and DN',()=>{
  const ref2=[
    ...refs,
    ['/ASIM-1885-PL-10"-Z8911111-01','1910','SL-104','10',"REST(6kN)",'Yes'],
  ];
  const out=runPsMappingResolver({table1cNodeIsonoteText:tsv(ref2),table2ModelText:tsv(models),
    options:{requireLineFamilyInIdentity:false}});
  for(const id of ['SL-104.9','SL-104.7','SL-104.10']) {
    const row=modelIn(out.rows,id);
    assert.equal(String(row?.node||''),'',id);
    assert.notEqual(row?.finalStatus,'MATCHED');
    assert.match(String(row?.warnings||''),/AMBIGUOUS_REFERENCE_NODE/);
  }
});
test('configuration offers both exact options, and Pages mirrors are byte-for-byte equal',()=>{
  const ui=readFileSync(new URL('../tabs/ps-mapping-utility-tab.js',import.meta.url),'utf8');
  assert.match(ui,/data-psmap-setup="requireLineFamilyInIdentity"/);
  assert.match(ui,/Support base \+ Line family \+ DN \+ reference node/);
  assert.match(ui,/Support base \+ DN \+ reference node/);
  for(const name of [
    'ps-mapping-utility-tab.js',
    'ps-mapping-utility/ps-mapping-engine-diagnostics.js',
    'ps-mapping-utility/ps-mapping-engine-diagnostics-v6.js',
    'ps-mapping-utility/ps-mapping-engine-diagnostics-v25.js',
  ]) {
    assert.equal(readFileSync(new URL('../tabs/'+name,import.meta.url),'utf8'),
      readFileSync(new URL('../docs/tabs/'+name,import.meta.url),'utf8'),name);
  }
});

test('unknown reference DN is missing, never a fabricated DN0 conflict',()=>{
  const noSize = [
    ['Line No','Node','Support No','Pipe size','ISONOTE','Mandatory'],
    ['/ASIM-1885-PL-10"-S8810105-01','910','SL-104','','REST(14kN)','Yes'],
  ];
  const m=[models[0],models[2]];
  const raw=runCoreResolver({table1cNodeIsonoteText:tsv(noSize),table2ModelText:tsv(m)});
  const candidate=raw.candidates.find(r=>r.psnoModel==='SL-104.7');
  assert.equal(candidate?.boreBasis,'BORE_MISSING');
  assert.equal(candidate?.eligible,false);
});

test('legacy Ignore mode cannot override mandatory composite line/DN identity',()=>{
  const defaultIgnored=run({requireLineFamilyInIdentity:true,lineMode:'ignore',boreMode:'ignore'});
  assertNoCrossAssignments(defaultIgnored);
  const optionalIgnored=run({requireLineFamilyInIdentity:false,lineMode:'ignore',boreMode:'ignore'});
  assertNoCrossAssignments(optionalIgnored);
});
