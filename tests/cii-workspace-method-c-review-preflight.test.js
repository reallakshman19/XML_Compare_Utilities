import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ledger=JSON.parse(file('docs/METHOD_C_G2_REVIEW_STATUS.json'));
const packet=file('docs/METHOD_C_G2_REVIEW_PACKET.md');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const protectedPaths=[
 'tabs/cii-workspace/cii-workspace-multi-base-correspondence.js',
 'tabs/cii-workspace/cii-workspace-writer-version-bridge.js',
 'tests/cii-workspace-multi-base-correspondence.test.js',
 'tests/cii-workspace-writer2-product-routing.test.js',
 'tabs/cii-workspace/cii-workspace-geometry.js',
 'tabs/cii-workspace/cii-workspace-multisource-review-only-router.js',
 'Benchmark/S1.CII','Benchmark/S2.CII','Benchmark/S3.CII','Benchmark/T.CII',
];
// Owner-approved 2026-10-17 *test-only* scope: byte-pin both exact baselines
// and postimages. All other protected production and CII bytes stay identical.
const testOnlyGrant=Object.freeze({
  'tests/cii-workspace-multi-base-correspondence.test.js':Object.freeze({
    before:'bf5304efb01acc0ec597ca4903551fd6ee315f1b',
    after:'3a92e20b49d5383b9d6b45191c53b752eed623e7'}),
  'tests/cii-workspace-writer2-product-routing.test.js':Object.freeze({
    before:'9980a71c244f51992b176166c7bf92985999b7b7',
    after:'e9acba12ca6e454dd4b418e64217739280fbd4d5'}),
});
const authorizedTestPatch=path=>testOnlyGrant[path]
  && git('rev-parse',ledger.immutableBase+':'+path)===testOnlyGrant[path].before
  && git('rev-parse','HEAD:'+path)===testOnlyGrant[path].after;
function validateStatus(data){
 const issues=[];
 if(data.schema!=='MethodC.G2ReviewGateLedger.v1')issues.push('SCHEMA');
 if(data.labelSha!=='18d91c9'||data.plan!=='V36-108-PLAN-01')issues.push('LABEL_OR_PLAN');
 if(!Array.isArray(data.taskStates)||data.taskStates.length!==9||
  data.taskStates.some((t,i)=>t.wp!==i+1||t.child!==i+109))issues.push('CHILD_DECOMPOSITION');
 if(!['INTEGRATION_IN_PROGRESS','EVIDENCE_SUBMITTED_UNREVIEWED'].includes(data.taskStates?.find(t=>t.wp===6)?.state))issues.push('FALSE_WP6_ACCEPTANCE');
 if(data.taskStates?.find(t=>t.wp===7)?.state!=='HOLD')issues.push('FALSE_BLOCKED_TASK_ACCEPTANCE');
 if(data.taskStates?.find(t=>t.wp===9)?.state!=='REVIEW_REQUESTED')
  issues.push('FALSE_WP9_ACCEPTANCE');
 if(data.blockingDecisions?.nativeEntry?.grantRecorded!==true||
    data.blockingDecisions?.nativeEntry?.sharedSourceEditAuthorized!==true||
    data.blockingDecisions?.nativeEntry?.ownerGrantScope!=='NATIVE_ENTRY_AND_DOCS_MIRROR_EXACT_TWO_FILES'||
    !['PENDING_HOSTED_CHROMIUM','HOSTED_CHROMIUM_PASS'].includes(data.blockingDecisions?.nativeEntry?.applicationWalkthrough))
  issues.push('FALSE_NATIVE_APP_APPROVAL');
 if(data.blockingDecisions?.inheritedRegressions?.dispositionRecorded!==false||
    data.blockingDecisions?.inheritedRegressions?.protectedSuite?.failing!==2)
  issues.push('FALSE_PROTECTED_SUITE_GREEN');
 if(data.blockingDecisions?.physicalQualification?.methodCPhysicalNodeCredits!==0||
    data.blockingDecisions?.physicalQualification?.methodCWriter2Credits!==0||
    data.blockingDecisions?.physicalQualification?.releaseScore428!=='NOT_RUN')
  issues.push('FALSE_MATCH_OR_RELEASE_CREDIT');
 if(data.independentCheck?.mergeEligible!==false||
    data.independentCheck?.g2ReviewAtExactCandidateSha!=='NOT_DONE'||
    data.independentCheck?.independentCheckerOfG2Fixes!=='NOT_DONE'||
    data.independentCheck?.ownerMergeAuthorized!==false)
  issues.push('INVENTED_G2_OWNER_OR_CHECKER_APPROVAL');
 return issues;
}
test('WP9 review preflight: all nine v3.6 children and pending authority flags fail closed',()=>{
 assert.deepEqual(validateStatus(ledger),[]);
 assert.equal(ledger.pinnedReferencePr107,'86a2d3b40568c2bcb43dacbe32c862144d00fd53');
 assert.equal(ledger.immutableBase,'3a7c34cd1b8f2f88b36e55503a96378406ea0c71');
 assert.match(packet,/REQUEST_FOR_INDEPENDENT_REVIEW; NOT APPROVED/);
 assert.match(packet,/WP6.*?HOLD/s);
 assert.match(packet,/WP7.*?HOLD/s);
 assert.match(packet,/105\/150/);
 assert.match(packet,/300\/428/);
 assert.match(packet,/not yet an independent G2 human review|worker-owned|worker may prepare/i);
});
test('WP9 RED: falsified grant, green protected suite, fabricated physical credit or G2 approval vetoed',()=>{
 const copy=()=>structuredClone(ledger);
 const native=copy();native.blockingDecisions.nativeEntry.grantRecorded=false;
 assert.ok(validateStatus(native).includes('FALSE_NATIVE_APP_APPROVAL'));
 const protectedFake=copy();protectedFake.blockingDecisions.inheritedRegressions.protectedSuite.failing=0;
 assert.ok(validateStatus(protectedFake).includes('FALSE_PROTECTED_SUITE_GREEN'));
 const falseCredit=copy();falseCredit.blockingDecisions.physicalQualification.methodCPhysicalNodeCredits=41;
 assert.ok(validateStatus(falseCredit).includes('FALSE_MATCH_OR_RELEASE_CREDIT'));
 const falseApproval=copy();falseApproval.independentCheck.g2ReviewAtExactCandidateSha='PASS';
 assert.ok(validateStatus(falseApproval).includes('INVENTED_G2_OWNER_OR_CHECKER_APPROVAL'));
 const child=copy();child.taskStates[7].child=117;
 assert.ok(validateStatus(child).includes('CHILD_DECOMPOSITION'));
});
test('WP9 exact baseline Git trees: protected code/tests, docs mirror and original CIIs are byte-identical',()=>{
 const base=ledger.immutableBase;
 const head=git('rev-parse','HEAD');
 assert.match(head,/^[0-9a-f]{40}$/);
 assert.notEqual(head,base);
 const changed=git('diff','--name-only',base,head).split(/\r?\n/).filter(Boolean);
 assert.ok(changed.length>0);
 assert.deepEqual(changed.filter(p=>protectedPaths.includes(p)&&!authorizedTestPatch(p)),[],
  'PROTECTED_SOURCE_OR_ORIGINAL_BENCHMARK_MUST_NOT_CHANGE');
 for(const p of protectedPaths){
  const a=git('rev-parse',base+':'+p),b=git('rev-parse',head+':'+p);
  if(testOnlyGrant[p]){
   assert.equal(a,testOnlyGrant[p].before,'Owner-granted test changed at baseline: '+p);
   assert.equal(b,testOnlyGrant[p].after,'Owner-granted exact test postimage drift: '+p);
  }else assert.equal(b,a,'protected original must be exactly byte-identical: '+p);
 }
});
test('WP9 candidate diff must stay in new Method C-owned files, plan, WIP and dedicated workflow',()=>{
 const changed=git('diff','--name-only',ledger.immutableBase,'HEAD')
  .split(/\r?\n/).filter(Boolean);
 const allowed=path=>/^(?:tabs\/cii-workspace\/cii-workspace-method-c-[a-z-]+\.(?:js|css)|tabs\/cii-workspace\/cii-workspace-tab\.js|docs\/tabs\/cii-workspace\/cii-workspace-tab\.js|docs\/tabs\/cii-workspace\/cii-workspace-method-c-[a-z-]+\.(?:js|css)|tests\/cii-workspace-method-c-[a-z-]+\.test\.js|tests\/fixtures\/cii-method-c\/[a-z0-9.-]+\.json|\.github\/workflows\/cii-method-c-wp2\.yml|docs\/METHOD_C_[A-Z0-9_]+\.(?:md|json)|agents\/WIP-method-c-geometry-review_workreport\.md|plans\/V36-108-PLAN-01\.yaml|agents\/(?:PR119_workreport|WIP-G3-MC-20261017_workreport)\.md)$/.test(path);
 assert.deepEqual(changed.filter(p=>!allowed(p)&&!authorizedTestPatch(p)),[]);
 assert.ok(changed.includes('docs/METHOD_C_G2_REVIEW_STATUS.json'));
 assert.ok(changed.includes('docs/METHOD_C_G2_REVIEW_PACKET.md'));
 console.log('WP9_EXACT_HEAD_REVIEW_PREFLIGHT '+JSON.stringify({
  head:git('rev-parse','HEAD'),base:ledger.immutableBase,
  changedOwnedFiles:changed.length,protectedUnchanged:protectedPaths.length,
  G2IndependentReview:'NOT_DONE',ownerMergeAuthorized:false}));
});

test('WP9 Owner-scoped WP6 two-file grant: exact source and docs mount hunks, no Writer2 rewrites',()=>{
 const rel='tabs/cii-workspace/cii-workspace-tab.js',base=ledger.immutableBase;
 const orig=git('show',base+':'+rel);
 const expected=orig.replace(
  "import { mountCiiFindReplaceShell } from './cii-workspace-find-replace-ui.js?v=20260904-padded-find-scroll-1';\n",
  "import { mountCiiFindReplaceShell } from './cii-workspace-find-replace-ui.js?v=20260904-padded-find-scroll-1';\n"+
  "import { installMethodCReviewTile } from './cii-workspace-method-c-tile.js';\n"
 ).replace(
  "  if (findReplaceTile) container.appendChild(findReplaceTile);\n",
  "  if (findReplaceTile) container.appendChild(findReplaceTile);\n"+
  "  const methodCTile = installMethodCReviewTile(container, context.methodC || {});\n"
 ).replace(
  "    close(); tile.remove(); writer2Tile?.remove(); findReplaceTile?.remove();\n",
  "    methodCTile.destroy();\n"+
  "    close(); tile.remove(); writer2Tile?.remove(); findReplaceTile?.remove();\n"
 );
 assert.notEqual(expected,orig);
 for(const path of [rel,'docs/'+rel]){
  assert.equal(file(path),expected,path+' unexpected shared implementation change');
 }
 const mods=['original-geometry','rigid-fit','registration','candidates','svg',
  'exports','ui','native-adapter','tile'];
 for(const part of mods){
  const name='cii-workspace-method-c-'+part+'.js';
  assert.equal(file('docs/tabs/cii-workspace/'+name),file('tabs/cii-workspace/'+name),
   'deployment mirror differs from owned original '+name);
 }
 assert.equal(file('docs/tabs/cii-workspace/cii-workspace-method-c-ui.css'),
  file('tabs/cii-workspace/cii-workspace-method-c-ui.css'));
});
