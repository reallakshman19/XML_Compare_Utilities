import assert from 'node:assert/strict';
import {auditCii102ChainContinuity} from '../scripts/cii-102-f2-chain-continuity.mjs';

// Independent SYNTHETIC controls: do not interpret them as Owner PS->SL proof.
const row=(id,from,to)=>({
 sourceElementKey:'S1:'+id,sourceMember:'S1',sourceElementId:id,
 sourceEndpoints:[from,to]});
const path=(nodes,id)=>({
 targetNodePath:nodes,targetElementIds:[id],
 lengthResidualMm:0,identityCertified:false,writerReady:false});
const a=row('E1','1','2'),b=row('E2','2','3'),c=row('E3','4','5');
const inputs={
 [a.sourceElementKey]:[path(['10','20'],'TA'),path(['10','30'],'TB')],
 [b.sourceElementKey]:[path(['20','40'],'TC'),path(['50','60'],'TD')],
 [c.sourceElementKey]:[path(['99','100'],'TE')],
};
const report=auditCii102ChainContinuity([b,c,a],inputs);
assert.equal(report.schema,'CII102PhysicalChainContinuity.v1');
assert.equal(report.authority,'ORIGINAL_TARGET_TOPOLOGY_ONLY_NONWRITING');
assert.equal(report.sourceFactorCount,3);
assert.equal(report.sharedNodePairCount,1);
assert.equal(report.originalGeometryOnlyRoutes,5);
assert.equal(report.locallyArcConsistentRoutes,3);
assert.equal(report.zeroArcSupportedFactors,0);
assert.equal(report.factorRows,undefined);
const by=Object.fromEntries(report.factors.map(x=>[x.sourceElementKey,x]));
assert.equal(by[a.sourceElementKey].locallyArcConsistentPhysicalRoutes,1);
assert.equal(by[b.sourceElementKey].locallyArcConsistentPhysicalRoutes,1);
assert.equal(by[c.sourceElementKey].locallyArcConsistentPhysicalRoutes,1);
assert.equal(by[c.sourceElementKey].localState,'ISOLATED_SOURCE_FACTOR_NO_PAIRWISE_CONSTRAINT');
assert.equal(report.pairwiseChecks[0].compatible,1);
assert.equal(report.hypothesesNotGlobalCertificates,true);
assert.equal(report.certifiedNodeCount,0);
assert.equal(report.writerReady,false);
assert.equal(report.transferPlan,null);
assert.equal(report.writeScope,null);
assert.deepEqual(report,auditCii102ChainContinuity([a,b,c],inputs));

// Same TARGET element cannot be independently owned by two SOURCE factors.
const wrong={...inputs,[b.sourceElementKey]:[path(['20','40'],'TA')]};
const collision=auditCii102ChainContinuity([a,b],wrong);
assert.equal(collision.pairwiseChecks[0].reusedTargetElement,1);
assert.equal(collision.pairwiseChecks[0].compatible,0);
assert.equal(collision.zeroArcSupportedFactors,2);
assert.equal(collision.certifiedNodeCount,0);

// Unconnected TARGET paths cannot share SOURCE physical endpoint.
const disconnected=auditCii102ChainContinuity([a,b],{
 [a.sourceElementKey]:[path(['10','20'],'TA')],
 [b.sourceElementKey]:[path(['90','100'],'TB')]
});
assert.equal(disconnected.pairwiseChecks[0].compatible,0);
assert.equal(disconnected.zeroArcSupportedFactors,2);

// Even a unique locally continuous chain is never an identity certificate.
const single=auditCii102ChainContinuity([a,b],{
 [a.sourceElementKey]:[path(['10','20'],'TA')],
 [b.sourceElementKey]:[path(['20','30'],'TB')]
});
assert.equal(single.locallyArcConsistentRoutes,2);
assert.equal(single.certifiedNodeCount,0);
assert.equal(single.writerReady,false);
assert(single.factors.every(f=>f.localState==='LOCAL_CONTINUITY_POSSIBLE_NO_GLOBAL_CERTIFICATE'));
assert.throws(()=>auditCii102ChainContinuity([a,a],inputs),/DUPLICATE_ORIGINAL_SOURCE_FACTOR/);
assert.throws(()=>auditCii102ChainContinuity([a,b],{
 [a.sourceElementKey]:inputs[a.sourceElementKey]
}),/MISSING_FULL_ORIGINAL_TARGET_ROUTES/);
assert.throws(()=>auditCii102ChainContinuity([a],{
 [a.sourceElementKey]:[path(['10','20','30'],'TA')]
}),/INVALID_TARGET_PATH_WITNESS/);
console.log('CII102_CHAIN_TOPOLOGY_SYNTHETIC_FALSIFIERS_PASS',JSON.stringify({
 syntheticInputPhysicalRoutes:5,locallySupportedRoutes:3,
 reusedTARGETCollisionVeto:true,missingSharedTargetVeto:true,
 certificatedNodeCount:0,writer:false,originalOwnerGoldenRead:false
}));
