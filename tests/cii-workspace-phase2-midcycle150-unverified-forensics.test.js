import assert from 'node:assert/strict';
import {diagnoseCiiMidcycle150Unverified} from './cii-workspace-phase2-midcycle150-unverified-forensics.js';
const num=n=>Number(n).toExponential(6).toUpperCase().padStart(13,' ');
function originalCii(count){
 const lines=['#$ ELEMENTS'];
 for(let n=1;n<count;n++){
  for(let row=0;row<15;row++)lines.push('  '+(
   row===0?[n,n+1,0,0,1000,273]:
   row===1?[25.4,0,0,0,0,0]:[0,0,0,0,0,0]).map(num).join(''));
 }
 lines.push('#$ NODENAME');
 return Buffer.from(lines.join('\n')+'\n');
}
const sizes=[57,47,46],starts=[1,58,105];
const originalSources=sizes.map((count,i)=>({sourceId:'S'+(i+1),bytes:originalCii(count)}));
const originalTarget=originalCii(150);
const rows=sizes.flatMap((count,i)=>Array.from({length:count},(_,j)=>{
 const bound=j<count-1;
 return {sourceId:'S'+(i+1),sourceNodeId:String(j+1),
   identityBound:bound,state:bound?'BOUND':'UNEMITTED',
   targetNodeIds:bound?[String(starts[i]+j)]:[],reasons:bound?[]:['NO_NODE_CORRESPONDENCE_EMITTED'],
 };
}));
const certs=rows.filter(r=>r.identityBound).map(r=>({
 sourcePhysicalKey:r.sourceId+':'+r.sourceNodeId,targetPhysicalNodeId:r.targetNodeIds[0],
 certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
 originalPhysicalWitnessIds:['SYNTHETIC_INDEPENDENT_TRUSTED_SOURCE_NODE'],
}));
const options={originalSources,originalTarget,audit:{rows},
 rooted:{certificates:certs,independentlyRootedVerifiedPhysicalNodes:certs.length}};
const score=diagnoseCiiMidcycle150Unverified(options);
assert.equal(score.unverifiedSourcePhysicalNodeCount,3);
assert.deepEqual(score.unverifiedByMember.map(r=>r.unverified),[1,1,1]);
assert.equal(score.newlyCreditedPhysicalNodes,0);
assert(score.rows.every(r=>r.status==='ONE_ORIGINAL_T_CANDIDATE_BUT_MATCHER_NOT_BOUND'));
assert(score.rows.every(r=>r.originalTargetPhysicalCandidateCount===1));
assert.deepEqual(score.rows.map(r=>r.candidateOriginalTargetNodeIds[0]),['57','104','150']);
assert.throws(()=>diagnoseCiiMidcycle150Unverified({...options,
 rooted:{...options.rooted,certificates:[certs[0],...certs]}}),
 /TRUSTED_ROOT_PROVENANCE_UNQUALIFIED/);
assert.throws(()=>diagnoseCiiMidcycle150Unverified({...options,
 audit:{rows:[...rows.slice(0,149),rows[0]]}}),
 /DUPLICATED_SOURCE_PHYSICAL_AUDIT/);
assert.throws(()=>diagnoseCiiMidcycle150Unverified({...options,
 rooted:{...options.rooted,certificates:certs.map((x,i)=>i===0?{...x,targetPhysicalNodeId:'999'}:x)}}),
 /TRUSTED_ROOT_DISAGREES_WITH_PHYSICAL_BINDING/);
const omitS1=certs.filter(x=>!x.sourcePhysicalKey.startsWith('S1:'));
const noS1Roots=diagnoseCiiMidcycle150Unverified({...options,
 rooted:{certificates:omitS1,independentlyRootedVerifiedPhysicalNodes:omitS1.length}});
assert.equal(noS1Roots.rows.filter(r=>r.sourceMemberId==='S1').length,57);
assert.equal(noS1Roots.rows.filter(r=>r.sourceMemberId==='S1'&&
 r.status==='NO_TRUSTED_ORIGINAL_SOURCE_COMPONENT_ROOT').length,1);
assert.equal(noS1Roots.rows.filter(r=>r.sourceMemberId==='S1'&&
 r.status==='BOUND_NOT_IN_CERTIFIED_ROOT_SET').length,56);
assert.equal(noS1Roots.newlyCreditedPhysicalNodes,0);
console.log('PASS 150-node unverified 45 forensics: exhaustive original T candidate search stays read-only and fails closed on fake root, duplicate SOURCE, rootless component');
