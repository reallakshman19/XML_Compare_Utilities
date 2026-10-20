import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { methodCAOnlyReviewCounts, methodCAOnlyReviewReceipt } from '../docs/tabs/cii-workspace/cii-workspace-method-c-a-candidate-review.js';

const source = readFileSync(new URL('../docs/tabs/cii-workspace/cii-workspace-method-c-a-candidate-review.js', import.meta.url),'utf8');
const bridge = readFileSync(new URL('../docs/tabs/cii-workspace/cii-workspace-method-c-writer2-bridge.js', import.meta.url),'utf8');
// [SIMULATED] independent pure-input contract cases. Authentic originals are exercised in the real browser test.
function evidence() {
  const rows = [
    {sourceNode:'3910',status:'OWNER_ANCHOR_EXPERIMENT',alternatives:[{target:'875',distanceMm:0}],writerEligible:false},
    {sourceNode:'4060',status:'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT',alternatives:[],segmentOnly:{endpoints:['900','905']},writerEligible:false},
    {sourceNode:'4970',status:'OUTSIDE_TOLERANCE',alternatives:[],writerEligible:false},
  ];
  return Object.freeze({
    authority:'READ_ONLY_UNVERIFIED_GEOMETRY',sourceId:'S1',
    sourceOriginalSha256:'a'.repeat(64),targetOriginalSha256:'b'.repeat(64),
    sourceSetSha256:'c'.repeat(64),sessionEpoch:3,registration:{selectedPoseId:'POSE-0001'},
    rows,qualifiedPhysicalIdentityCount:0,writerEligible:false,applyAuthorized:false,
  });
}
test('independent A-only statuses are not a physical-match percentage',()=>{
  assert.deepEqual(methodCAOnlyReviewCounts(evidence().rows),
    {total:3,candidates:1,segmentOnly:1,outside:1});
});
test('review receipt carries every candidate and discrepancy; never enables BOUND / Writer2',()=>{
  const e=evidence(), rows=new Map([
    ['4060',{disposition:'EVIDENCE_REQUESTED',note:'Segment only; no physical TARGET NODE'}],
    ['4970',{disposition:'INVESTIGATE',note:'Check original signed ELEMENT length'}],
  ]);
  const receipt=methodCAOnlyReviewReceipt(e,rows);
  assert.equal(receipt.observations.length,3);
  assert.deepEqual(receipt.observations.map(r=>r.sourceNode),['3910','4060','4970']);
  assert.equal(receipt.dispositions.length,2);
  assert.equal(receipt.sourceOriginalSha256,'a'.repeat(64));
  assert.equal(receipt.sessionEpoch,3);
  assert.equal(receipt.selectedPoseId,'POSE-0001');
  assert.equal(receipt.qualifiedPhysicalIdentityCount,0);
  assert.equal(receipt.writerEligible,false);
  assert.equal(receipt.applyAuthorized,false);
  assert.deepEqual(receipt.mutationOperations,[]);
  assert.equal(e.rows[1].status,'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
});
test('reject forged physical authority and nonexistent original node review',()=>{
  assert.throws(()=>methodCAOnlyReviewReceipt({...evidence(),qualifiedPhysicalIdentityCount:1}),/UNVERIFIED_EVIDENCE/);
  assert.throws(()=>methodCAOnlyReviewReceipt({...evidence(),writerEligible:true}),/UNVERIFIED_EVIDENCE/);
  assert.throws(()=>methodCAOnlyReviewReceipt({...evidence(),applyAuthorized:true}),/UNVERIFIED_EVIDENCE/);
  assert.throws(()=>methodCAOnlyReviewReceipt(evidence(),new Map([['9999',{disposition:'INVESTIGATE',note:'unknown'}]])),/INVALID_DISPOSITION/);
  assert.throws(()=>methodCAOnlyReviewReceipt(evidence(),new Map([['3910',{disposition:'ACCEPT_BOUND',note:'wrong'}]])),/INVALID_DISPOSITION/);
});
test('real Writer2 bridge only inserts review-only workbench; existing trusted writer is untouched',()=>{
  assert.match(bridge,/mountMethodCAOnlyCandidateWorkbench/);
  assert.match(bridge,/candidateReview\.setEvidence\(sidecar\)/);
  assert.match(bridge,/candidateReview\.clear\(\)/);
  assert.match(bridge,/candidateReview\.destroy\(\)/);
  assert.match(source,/Review geometric candidates →/);
  assert.match(source,/Download review-only JSON/);
  assert.doesNotMatch(source,/identityBound\s*:\s*true|writerEligible\s*:\s*true|applyAuthorized\s*:\s*true/);
});
