import assert from 'node:assert/strict';
import { buildCiiParallelAnchorEvidence } from '../tabs/cii-workspace/cii-workspace-parallel-anchor-evidence.js';

const suggestion = (s,t) => ({ sourceNodeId:String(s),targetNodeId:String(t),basisMethod:'METHOD_B_NETWORK',methodB:{status:'READY'},confidence:'HIGH' });
const inspection = {
  sourceSet: { sourceSetSha256:'set-sha',members:[{sourceId:'S1',originalSha256:'sha-S1'},{sourceId:'S2',originalSha256:'sha-S2'}] },
  versionBridge: { target:{ originalSha256:'sha-T'} },
  memberInspections: [
    { sourceId:'S1', inspection:{ baseAnchorSuggestions:[suggestion(10,5010)] } },
    { sourceId:'S2', inspection:{ baseAnchorSuggestions:[suggestion(40,5040)] } },
  ],
};
const auto=new Map([['S1',new Set(['10=>5010'])],['S2',new Set(['40=>5040'])]]);
const manual=new Map([['S1',[{sourceNodeId:'10',targetNodeId:'5010'}]],['S2',[]]]);
const dedup=buildCiiParallelAnchorEvidence(inspection,auto,manual);
assert.equal(dedup.status,'EVIDENCE_ONLY');
assert.equal(dedup.rawAutoAnchorClaimCount,2);
assert.equal(dedup.rawManualAnchorClaimCount,1);
assert.equal(dedup.physicalPairClaimCount,2);
assert.equal(dedup.doubleSourcedClaimCount,1);
assert.deepEqual(dedup.claims.find(r=>r.sourceId==='S1').lanes,['AUTO','MANUAL']);
assert.equal(dedup.writerAuthorizationGranted,false);
assert.equal(dedup.physicalIdentityCertified,false);
assert.equal(dedup.operationalDispatchChanged,false);
assert(Object.isFrozen(dedup.claims[0]));
assert(Object.isFrozen(dedup.claims[0].provenances));
assert(Object.isFrozen(dedup.conflicts));
const disagreement=buildCiiParallelAnchorEvidence(inspection,auto,new Map([['S1',[{sourceNodeId:'10',targetNodeId:'5020'}]]]));
assert.equal(disagreement.status,'CONFLICT');
assert(disagreement.conflicts.some(r=>r.kind==='SOURCE_TO_MULTIPLE_TARGETS'));
assert.equal(disagreement.physicalPairClaimCount,3);
const cross=buildCiiParallelAnchorEvidence(inspection,auto,new Map([['S2',[{sourceNodeId:'40',targetNodeId:'5010'}]]]));
assert(cross.conflicts.some(r=>r.kind==='TARGET_TO_MULTIPLE_SOURCES'));
assert.equal(cross.writerAuthorizationGranted,false);
const manualOnly=buildCiiParallelAnchorEvidence(inspection,new Map(),manual);
assert.equal(manualOnly.claims.length,1);
assert.deepEqual(manualOnly.claims[0].lanes,['MANUAL']);
assert.throws(()=>buildCiiParallelAnchorEvidence(inspection,auto,new Map([['S1',[{sourceNodeId:'NaN',targetNodeId:'5010'}]]])),/PHYSICAL_NODE_INVALID/);
assert.throws(()=>buildCiiParallelAnchorEvidence({ ...inspection,memberInspections:[inspection.memberInspections[0],inspection.memberInspections[0]] },auto,manual),/DUPLICATE_OR_MISSING_SOURCE_MEMBER/);
console.log('PASS CII Phase2 parallel anchor evidence: independent tracks, dedup, physical custody conflicts, zero Writer authority');
