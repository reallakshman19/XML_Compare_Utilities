import assert from 'node:assert/strict';
import {buildCiiMidcycle150OriginalPathWitnesses} from './cii-workspace-phase2-midcycle150-original-path-witness.js';
const num=n=>Number(n).toExponential(6).toUpperCase().padStart(13,' ');
function originalCii(start,count,{segmentLength=1000}={}){
 const lines=['#$ ELEMENTS'];
 for(let n=0;n<count-1;n++){
  const from=start+n,to=from+1;
  const fields=[from,to,0,0,segmentLength,0];
  for(let i=0;i<15;i++){
   const data=i===0?fields:[0,0,0,0,0,0];
   lines.push('  '+data.map(num).join(''));
  }
 }
 lines.push('#$ NODENAME');
 return lines.join('\n')+'\n';
}
const sizes=[57,47,46],starts=[1,58,105];
const originalSources=sizes.map((n,i)=>({
 sourceId:'S'+(i+1),bytes:Buffer.from(originalCii(1,n))
}));
const originalTarget=Buffer.from(originalCii(1,150));
const rows=sizes.flatMap((count,i)=>Array.from({length:count},(_,index)=>({
 sourceId:'S'+(i+1),sourceNodeId:String(index+1),
 targetNodeIds:[String(starts[i]+index)],
 identityBound:true,state:'BOUND',
})));
const matched=buildCiiMidcycle150OriginalPathWitnesses({
 originalSources,originalTarget,audit:{rows},pathTotalLengthToleranceMm:100,
});
assert.equal(matched.summary.denominator,150);
assert.equal(matched.summary.nodesWithLocalOriginalRouteLengthEvidence,150);
assert.equal(matched.summary.globalTargetCollisionCount,0);
assert.equal(matched.rows.every(x=>x.globalPhysicalIdentityCertificate===false),true);
assert.equal(matched.rows.every(x=>x.independentLocalRouteWitnessCount>0),true);
// Even perfect locally compatible routes are NOT global physical identity certificates.
const tampered=rows.map((r,i)=>i===6?{...r,targetNodeIds:['100']}:r);
const failed=buildCiiMidcycle150OriginalPathWitnesses({originalSources,originalTarget,audit:{rows:tampered}});
assert(failed.summary.nodesWithLocalOriginalRouteLengthEvidence<150);
assert.equal(failed.summary.globalTargetCollisionCount,1);
assert(failed.rows.some(x=>x.state==='GLOBAL_TARGET_COLLISION'));
assert.throws(()=>buildCiiMidcycle150OriginalPathWitnesses({
 originalSources:[...originalSources,originalSources[0]],originalTarget,audit:{rows}
}),/ORIGINAL_SOURCE_AND_TOLERANCE_REQUIRED/);
assert.throws(()=>buildCiiMidcycle150OriginalPathWitnesses({
 originalSources,originalTarget,audit:{rows:rows.slice(0,149)}
}),/CUMULATIVE_SOURCE_PHYSICAL_150_CENSUS_MISMATCH/);
console.log('PASS 150 independent CII original graph local path witness, conflict veto and no global identity inflation');
