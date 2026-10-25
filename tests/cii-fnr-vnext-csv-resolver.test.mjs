import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { planNormal } from '../tabs/cii-workspace/cii-fnr-vnext/normal/plan.js';
import { resolveImportedCsv } from '../tabs/cii-workspace/cii-fnr-vnext/ui/csv-resolver.js';
import { safeNonConflictIds } from '../tabs/cii-workspace/cii-fnr-vnext/ui/nonconflict-review.js';
import { DEFAULT_POLICY } from '../tabs/cii-workspace/cii-fnr-vnext/ui/config-policy.js';
import { createTestDom } from './helpers/vnext-dom-env.mjs';

const HASH = 'a'.repeat(64);
const BRANCH = '/SYNTHETIC/B';
const row = v => v.map((x,i) => String(x).padStart(i ? 13 : 15)).join('');
const name = (from,to) => '  ' + from.padEnd(26) + to.padEnd(25);
const element = (from,to,pointer) => Array.from({length:15},(_,i) =>
  i===0 ? row([from,to,120,0,0,0]) :
  i===10 ? String(BRANCH.length).padStart(12)+' '+BRANCH :
  i===13 ? row([0,0,0,0,0,pointer]) : row([0,0,0,0,0,0]));
function fixture(names=['X','Y','Z']) {
  return new Uint8Array(Buffer.from([
    '#$ VERSION',row([5,14,1252]),'#$ CONTROL',row([2,0,0,6,0,0]),'#$ ELEMENTS',
    ...element(10,20,1),...element(20,30,2),...element(30,40,3),
    ...element(40,50,4),...element(50,60,5),...element(60,70,6),
    '#$ NODENAME',name('',names[0]),name(names[0],''),
    name('',names[1]),name(names[1],''),
    name('',names[2]),name(names[2],'')
  ].join('\r\n')+'\r\n','ascii'));
}
const rule = (find, replace, id) => ({id,find,replace,mode:'LITERAL',flags:'g',
  field:'NODENAME.BOTH',scope:'DOCUMENT'});
const options = bytes => ({targetBytes:bytes});
const baseRules = [rule('X','NEW-X','r1'),rule('Y','ONE','r2'),rule('Y','TWO','r3'),rule('Z','NEW-Z','r4')];

test('CSV resolver retains safe groups, holds competing replacements, preserves inputs', () => {
  const bytes=fixture(),original=Buffer.from(bytes);
  const rules=baseRules.map(r=>({...r}));
  const r=resolveImportedCsv(rules,parseCii(bytes),null,options(bytes),HASH);
  assert.equal(r.summary.total,4);
  assert.equal(r.summary.accepted,2);
  assert.equal(r.summary.held,2);
  assert.equal(r.summary.proposedNameFields,4);
  assert.deepEqual(r.acceptedRules.map(x=>x.id),['r1','r4']);
  assert.equal(r.report.filter(x=>x.reason==='ORIGINAL_FIND_HAS_COMPETING_REPLACEMENTS').length,2);
  assert.deepEqual(bytes,new Uint8Array(original),'immutable TARGET0');
  assert.deepEqual(rules,baseRules,'original imported CSV rules remain unchanged');
});

test('source-corroborated suffix alias may be normalized but unmatched source is held', () => {
  const bytes=fixture(['PS02097','Y','Z']);
  const change=rule('PS02097.1','NEW-NAME','r1');
  const source=fixture(['PS02097.1','Y','Z']);
  const done=resolveImportedCsv([change],parseCii(bytes),parseCii(source),options(bytes),HASH);
  assert.equal(done.summary.accepted,1);
  assert.equal(done.acceptedRules[0].find,'PS02097');
  assert.match(done.report[0].actions.join(','),/SOURCE_VERIFIED_SMART_NORMALIZATION/);
  const noSource=resolveImportedCsv([change],parseCii(bytes),null,options(bytes),HASH);
  assert.equal(noSource.summary.held,1);
  assert.equal(noSource.report[0].reason,'SOURCE_PHYSICAL_IDENTITY_NOT_VERIFIED');
});

test('ambiguous REF/optional .1 normalizations are not guessed', () => {
  const bytes=fixture(['SL-101','SL-101.1','Z']);
  const source=fixture(['SL-101(REF)','SL-101(REF)','Z']);
  const r=resolveImportedCsv([rule('SL-101(REF)','OTHER','r1')],parseCii(bytes),
    parseCii(source),options(bytes),HASH);
  assert.equal(r.summary.accepted,0);
  assert.equal(r.report[0].reason,'NORMALIZATION_AMBIGUOUS');
});

test('truncation that makes two new node names equal is held, never accepted', () => {
  const bytes=fixture();
  const r=resolveImportedCsv([rule('X','ABCD','r1'),rule('Z','ABCE','r2')],
    parseCii(bytes),null,{...options(bytes),truncateTo:3},HASH);
  assert.equal(r.summary.accepted,0);
  assert.equal(r.summary.held,2);
  assert.equal(r.summary.newlyIntroducedNameDuplicates,0);
  assert(r.report.every(a=>a.reason==='CLEANUP_NAME_COLLISION_OR_NODE_CLOSURE'));
});

test('unsafe regex and invalid truncation fail closed', () => {
  const bytes=fixture(), target=parseCii(bytes),rules=[rule('X','AAA','r1')];
  assert.throws(()=>resolveImportedCsv(rules,target,null,
    {...options(bytes),customPattern:'(a+)+$'},HASH),/CLEANUP_REGEX_UNSAFE/);
  assert.throws(()=>resolveImportedCsv(rules,target,null,
    {...options(bytes),truncateTo:28},HASH),/CLEANUP_TRUNCATE_RANGE/);
});

test('Approve Non-Conflict collects whole X and Z nodes despite Y duplicate claims', () => {
  const bytes=fixture(),parsed=parseCii(bytes), plan=planNormal({
    tab:'NORMAL',targetBytes:bytes,originalTargetSha256:HASH,rules:baseRules});
  assert.equal(plan.claims.length,8);
  assert.equal(plan.diagnostics.filter(d=>d.code==='DUPLICATE_FIELD_CLAIM').length,2);
  const ids=safeNonConflictIds(parsed,plan,DEFAULT_POLICY);
  assert.equal(ids.length,4);
  assert(ids.every(x=>x.startsWith('r1:')||x.startsWith('r4:')));
  assert.deepEqual(safeNonConflictIds(parsed,plan,{...DEFAULT_POLICY,conflictPolicy:'BLOCK_PLAN'}),[]);
});

test('DOM mock includes preview and bulk-approval controls for existing UI tests', () => {
  const dom=createTestDom();
  assert(dom.btnResolve && dom.btnUseResolved && dom.btnApproveNonconflict);
  assert(dom.root.querySelector('[data-cleanup="trim"]').checked);
  assert.equal(dom.root.querySelector('[data-cleanup="truncateTo"]').value,'0');
});

test('buttons preview, apply accepted CSV, then approve only unrelated proposals', async () => {
  const dom=createTestDom();
  await import('../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?csv-resolver=' + Date.now());
  const bytes=fixture();
  dom.targetFile.files=[{name:'synthetic.cii',arrayBuffer:async()=>bytes.buffer.slice(
    bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}];
  await dom.targetFile.dispatchEvent({type:'change',target:dom.targetFile});
  const uploadCsv=async()=>{
    dom.csvFile.files=[{name:'synthetic.csv',text:async()=>[
      'Find,Replace','X,NEW-X','Y,ONE','Y,TWO','Z,NEW-Z'
    ].join('\\r\\n')}];
    await dom.csvFile.dispatchEvent({type:'change',target:dom.csvFile});
  };
  await uploadCsv();
  assert.equal(dom.btnResolve.disabled,false);
  await dom.btnResolve.click();
  assert.match(dom.cleanupLog.textContent,/Accepted rules: 2/);
  assert.match(dom.cleanupLog.textContent,/ORIGINAL_FIND_HAS_COMPETING_REPLACEMENTS/);
  assert.equal(dom.btnUseResolved.disabled,false);
  await dom.btnUseResolved.click();
  await dom.btnRun.click();
  assert.equal(dom.tbodyProposals.children.length,4);
  assert.equal(dom.btnApproveAll.disabled,false);
  await uploadCsv();
  await dom.btnRun.click();
  assert.equal(dom.tbodyProposals.children.length,8);
  assert.equal(dom.btnApproveAll.disabled,true);
  assert.equal(dom.btnApproveNonconflict.disabled,false);
  await dom.btnApproveNonconflict.click();
  assert.equal(dom.tbodyProposals.children.filter(tr=>
    tr.querySelector('[data-decision]')?.value==='APPROVED').length,4);
  assert.equal(dom.btnValidate.disabled,false);
  assert.equal(dom.btnExport.disabled,true, 'approval cannot bypass Apply or Export');
  // Editing a rule clears old cleanup preview authority.
  const grid=dom.root.querySelector('[data-rules]').children[0];
  const find=grid.querySelector('[data-field="find"]');
  find.value='CHANGED';
  await find.dispatchEvent({type:'input',target:find});
  assert.equal(dom.cleanupReport.hidden,true);
});
