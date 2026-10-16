import assert from 'node:assert/strict';
import {buildCiiMidcycle150OriginalPathWitnesses} from './cii-workspace-phase2-midcycle150-original-path-witness.js';
import {verifyCiiMidcycle150RootedCorrespondences} from './cii-workspace-phase2-midcycle150-rooted-verify.js';
import {scoreCiiMidcycle150} from './cii-workspace-phase2-midcycle150-score.js';
const field=n=>Number(n).toExponential(6).toUpperCase().padStart(13,' ');
function cii(start,count,step=1000){
 const data=['#$ ELEMENTS'];
 for(let i=0;i<count-1;i++){
   const line=[start+i,start+i+1,0,0,step,0];
   for(let index=0;index<15;index++)data.push('  '+(index===0?line:[0,0,0,0,0,0]).map(field).join(''));
 }
 data.push('#$ NODENAME');
 return Buffer.from(data.join('\n')+'\n');
}
const count=[57,47,46],starts=[1,58,105];
const files=count.map((size,i)=>({sourceId:'S'+(i+1),bytes:cii(1,size)}));
const target=cii(1,150);
const rows=count.flatMap((size,i)=>Array.from({length:size},(_,index)=>({
 sourceId:'S'+(i+1),sourceNodeId:String(index+1),rowKey:'S'+(i+1)+':'+(index+1),
 identityBound:true,state:'BOUND',targetNodeIds:[String(starts[i]+index)],
})));
const originalSourceSetSha256='test-original-source-set',originalTargetSha256='test-original-target';
const certifiedRoot=(i)=>({
 sourcePhysicalKey:'S'+(i+1)+':1',targetPhysicalNodeId:String(starts[i]),
 originalSourceSetSha256,originalTargetSha256,
 certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
 originalPhysicalWitnessIds:['OWNER_GOLDEN_ORIGINAL_CII:'+i],
});
const local=buildCiiMidcycle150OriginalPathWitnesses({
 originalSources:files,originalTarget:target,audit:{rows},
});
assert.equal(local.summary.nodesWithLocalOriginalRouteLengthEvidence,150);
const run=({rowData=rows,ownerRoots=[certifiedRoot(0),certifiedRoot(1),certifiedRoot(2)],
 globalUniqueNodes=[],path=local,targetBytes=target}={})=>verifyCiiMidcycle150RootedCorrespondences({
 originalSources:files,originalTarget:targetBytes,audit:{rows:rowData},
 ownerCertificates:{certificates:ownerRoots},globalShape:{uniquePlacementPhysicalNodes:globalUniqueNodes},
 localPathWitness:path,originalSourceSetSha256,originalTargetSha256,
});
const full=run();
assert.equal(full.ownerGoldenSeeds,3);
assert.equal(full.independentlyRootedVerifiedPhysicalNodes,150);
assert.equal(full.strict70PercentPhysicalGoalMet,true);
assert.deepEqual(full.sourcePerMember.map(x=>x.independentlyRootedPhysicalMatches),count);
assert.equal(full.targetReuseConflicts,0);
const score=scoreCiiMidcycle150({originalSourcePhysicalNodeCount:150,
 originalSourceSetSha256,originalTargetSha256,
 audit:{rows},independentCertificates:full.certificates,
 originalLocalPathWitnesses:local,
});
assert.equal(score.MIDCYCLE_150_VALIDATED_RECALL,1);
assert.equal(score.thresholdMet,true);
// No bootstrap from mutually consistent BOUND hypotheses without a trusted
// Owner / original globally unique geometric physical anchor.
const noRoot=run({ownerRoots:[]});
assert.equal(noRoot.independentlyRootedVerifiedPhysicalNodes,0);
assert.equal(noRoot.strict70PercentPhysicalGoalMet,false);
const oneRoot=run({ownerRoots:[certifiedRoot(0)]});
assert.equal(oneRoot.independentlyRootedVerifiedPhysicalNodes,57);
assert.equal(oneRoot.strict70PercentPhysicalGoalMet,false);
// An incorrect but BOUND T claim must not be credited without an independent,
// uniquely located correct target rooted physical vector+path witness.
const wrong=rows.map((r,i)=>i===3?{...r,targetNodeIds:['149']}:r);
const wrongLocal=buildCiiMidcycle150OriginalPathWitnesses({
 originalSources:files,originalTarget:target,audit:{rows:wrong},
});
const rejected=run({rowData:wrong,path:wrongLocal});
assert(rejected.independentlyRootedVerifiedPhysicalNodes<150);
assert(rejected.certificates.every(x=>x.sourcePhysicalKey!=='S1:4'));
assert.equal(rejected.strict70PercentPhysicalGoalMet,true);
// Invalid original source custody must not be admitted as trusted anchor.
assert.throws(()=>run({ownerRoots:[{...certifiedRoot(0),originalTargetSha256:'changed'}]}),
 /ORIGINAL_SHA_OR_STATUS_MISMATCH/);
// Global TARGET reused by different SOURCE nodes must not receive duplicate
// physical credits, even if local geometry elsewhere is valid.
const shared=rows.map((r,i)=>i===1?{...r,targetNodeIds:['1']}:r);
const sharedLocal=buildCiiMidcycle150OriginalPathWitnesses({
 originalSources:files,originalTarget:target,audit:{rows:shared},
});
assert.throws(()=>run({rowData:shared,path:sharedLocal}),
 /TRUSTED_SEED_CONFLICT_OR_MISSING_ORIGINAL_WITNESS/);
console.log('PASS Midcycle 150 independent original-rooted physical proof: trusted seeds, exhaustive alternatives, no circular bootstrap, wrong TARGET/sha/collision veto');
