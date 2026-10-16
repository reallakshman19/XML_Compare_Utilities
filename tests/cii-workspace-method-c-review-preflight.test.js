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
 'tabs/cii-workspace/cii-workspace-tab.js',
 'docs/tabs/cii-workspace/cii-workspace-tab.js',
 'tabs/cii-workspace/cii-workspace-multi-base-correspondence.js',
 'tabs/cii-workspace/cii-workspace-writer-version-bridge.js',
 'tests/cii-workspace-multi-base-correspondence.test.js',
 'tests/cii-workspace-writer2-product-routing.test.js',
 'tabs/cii-workspace/cii-workspace-geometry.js',
 'tabs/cii-workspace/cii-workspace-multisource-review-only-router.js',
 'Benchmark/S1.CII','Benchmark/S2.CII','Benchmark/S3.CII','Benchmark/T.CII',
];
function validateStatus(data){
 const issues=[];
 if(data.schema!=='MethodC.G2ReviewGateLedger.v1')issues.push('SCHEMA');
 if(data.labelSha!=='18d91c9'||data.plan!=='V36-108-PLAN-01')issues.push('LABEL_OR_PLAN');
 if(!Array.isArray(data.taskStates)||data.taskStates.length!==9||
  data.taskStates.some((t,i)=>t.wp!==i+1||t.child!==i+109))issues.push('CHILD_DECOMPOSITION');
 for(const wp of [6,7]){
  if(data.taskStates?.find(t=>t.wp===wp)?.state!=='HOLD')issues.push('FALSE_BLOCKED_TASK_ACCEPTANCE');
 }
 if(data.taskStates?.find(t=>t.wp===9)?.state!=='REVIEW_REQUESTED')
  issues.push('FALSE_WP9_ACCEPTANCE');
 if(data.blockingDecisions?.nativeEntry?.grantRecorded!==false||
    data.blockingDecisions?.nativeEntry?.sharedSourceEditAuthorized!==false||
    data.blockingDecisions?.nativeEntry?.applicationWalkthrough!=='NOT_RUN')
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
 const native=copy();native.blockingDecisions.nativeEntry.grantRecorded=true;
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
 assert.deepEqual(changed.filter(p=>protectedPaths.includes(p)),[],
  'PROTECTED_SOURCE_OR_ORIGINAL_BENCHMARK_MUST_NOT_CHANGE');
 for(const p of protectedPaths){
  const a=git('rev-parse',base+':'+p),b=git('rev-parse',head+':'+p);
  assert.equal(b,a,'protected original must be exactly byte-identical: '+p);
 }
});
test('WP9 candidate diff must stay in new Method C-owned files, plan, WIP and dedicated workflow',()=>{
 const changed=git('diff','--name-only',ledger.immutableBase,'HEAD')
  .split(/\r?\n/).filter(Boolean);
 const allowed=path=>/^(?:tabs\/cii-workspace\/cii-workspace-method-c-[a-z-]+\.(?:js|css)|tests\/cii-workspace-method-c-[a-z-]+\.test\.js|tests\/fixtures\/cii-method-c\/[a-z0-9.-]+\.json|\.github\/workflows\/cii-method-c-wp2\.yml|docs\/METHOD_C_[A-Z0-9_]+\.(?:md|json)|agents\/WIP-method-c-geometry-review_workreport\.md|plans\/V36-108-PLAN-01\.yaml)$/.test(path);
 assert.deepEqual(changed.filter(p=>!allowed(p)),[]);
 assert.ok(changed.includes('docs/METHOD_C_G2_REVIEW_STATUS.json'));
 assert.ok(changed.includes('docs/METHOD_C_G2_REVIEW_PACKET.md'));
 console.log('WP9_EXACT_HEAD_REVIEW_PREFLIGHT '+JSON.stringify({
  head:git('rev-parse','HEAD'),base:ledger.immutableBase,
  changedOwnedFiles:changed.length,protectedUnchanged:protectedPaths.length,
  G2IndependentReview:'NOT_DONE',ownerMergeAuthorized:false}));
});
