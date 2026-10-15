/**
 * Issue #106: execute the actual pinned S1/S2/S3/T prepared-session engine
 * with AUTO bases and one MANUAL seed simultaneously. No benchmark owner
 * relation may be imported into the production solver.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiWriter2SourceSetPreviewFromPreparedSession} from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';

const cryptoRef=globalThis.crypto||webcrypto;
const sources=['S1.CII','S2.CII','S3.CII'].map((name,i)=>({
 sourceId:'S'+(i+1),fileName:name,bytes:readFileSync(new URL('../Benchmark/'+name,import.meta.url)),
}));
const targetBytes=readFileSync(new URL('../Benchmark/T.CII',import.meta.url));
const input=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge({
 sources,targetBytes,targetFileName:'T.CII',
},{cryptoRef});
const baseLoopsBySource={};
for(const member of input.inspection.memberInspections){
 const auto=ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions||[]);
 assert.equal(auto.status,'READY');
 baseLoopsBySource[member.sourceId]=auto.baseLoops;
}
const s1Base=baseLoopsBySource.S1.find(loop=>(loop.anchorPairs||[]).length);
assert(s1Base,'S1 selected automatic base has no physical-point anchor');
const original=s1Base.anchorPairs[0];
const manual=[{sourceNodeId:String(original.sourceNodeId),targetNodeId:String(original.targetNodeId)}];
const hybrid=await createCiiWriter2SourceSetPreviewFromPreparedSession(input.preparedSession,{
 baseLoopsBySource,anchorPairsBySource:{S1:manual},
},{cryptoRef,pathTotalLengthToleranceMm:100});
const s1=hybrid.memberPreviews.find(member=>member.sourceId==='S1')?.preview;
assert(s1,'S1 preview missing');
assert.equal(s1.multiBaseAuthority.inputMode,'PARALLEL_AUTO_MANUAL');
assert(s1.multiBaseAuthority.loops.some(row=>row.method==='METHOD_A_SPATIAL'||row.method==='METHOD_B_NETWORK'));
assert(s1.multiBaseAuthority.loops.some(row=>row.method==='USER_LOCKED_SEED'));
assert(s1.multiBaseCorrespondence.loopResults?.some(row=>row.loop.method==='USER_LOCKED_SEED'),
 'manual seed propagation must run in same common analysis as auto loops');
assert(s1.multiBaseCorrespondence.loopResults?.some(row=>['METHOD_A_SPATIAL','METHOD_B_NETWORK'].includes(row.loop.method)),
 'auto qualified base propagation must not be suppressed by presence of manual seed');
const dedup=s1.correspondence?.nodeRows?.filter(row=>String(row.sourceNodeId)===String(original.sourceNodeId)
 && String(row.targetNodeId)===String(original.targetNodeId))||[];
assert(dedup.length<=1,'same physical pair from separate tracks must not become two canonical node rows');
assert.equal(hybrid.sourceSetSha256,input.inspection.sourceSet.sourceSetSha256);
assert.equal(hybrid.targetAuthority.originalSha256,input.inspection.versionBridge.target.originalSha256);
console.log(JSON.stringify({
 status:'PASS_HYBRID_PROPAGATION_VISIBLE_NO_UNAUTHORIZED_WRITER_SCOPE',
 autoLoopCount:s1.multiBaseAuthority.loops.filter(row=>row.method!=='USER_LOCKED_SEED').length,
 manualLoopCount:s1.multiBaseAuthority.loops.filter(row=>row.method==='USER_LOCKED_SEED').length,
 autoPropagatedLoopCount:s1.multiBaseCorrespondence.loopResults.filter(row=>row.loop.method!=='USER_LOCKED_SEED').length,
 manualPropagatedLoopCount:s1.multiBaseCorrespondence.loopResults.filter(row=>row.loop.method==='USER_LOCKED_SEED').length,
 s1CorrespondenceStatus:s1.correspondence.status,
 targetOriginalSha256:hybrid.targetAuthority.originalSha256,
},null,2));
