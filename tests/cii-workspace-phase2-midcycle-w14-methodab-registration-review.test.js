import assert from 'node:assert/strict';
import {parseCiiW14OriginalRegistration,diagnoseCiiW14MethodABMissingEvidence}
 from './cii-workspace-phase2-midcycle-w14-methodab-registration-review.js';
const fmt=n=>Number(n).toExponential(6).toUpperCase().padStart(13,' ');
const fixed=n=>String(n).padStart(13,' ');
function cii(count,{unit='SI (mm)',coordinateNode='1',coordinate=[0,0,0]}={}){
 const lines=['#$ ELEMENTS'];
 for(let i=1;i<count;i++)for(let j=0;j<15;j++)lines.push('  '+(
  j===0?[i,i+1,0,0,1000,273]:j===1?[25.4,0,0,0,0,0]:[0,0,0,0,0,0]).map(fmt).join(''));
 lines.push('#$ NODENAME','#$ UNITS');
 for(let i=0;i<4;i++)lines.push('  '+[1,1,1,1,1,1].map(fmt).join(''));
 lines.push('  '+unit,'#$ COORDS','  '+fixed(1));
 lines.push('  '+[coordinateNode,...coordinate].map((v,i)=>i===0?fixed(v):fmt(v)).join(''));
 return Buffer.from(lines.join('\n')+'\n');
}
const originalSources=[57,47,46].map((n,i)=>({
 sourceId:'S'+(i+1),bytes:cii(n)}));
const originalTarget=cii(150);
const reg=parseCiiW14OriginalRegistration(originalSources[0].bytes);
assert.equal(reg.declaredCoordinates,1);
assert.equal(reg.physicalOriginalUnitMm,true);
assert.deepEqual(reg.physicalCoordinateSeeds.get('1'),[0,0,0]);
assert.throws(()=>parseCiiW14OriginalRegistration(Buffer.from('#$ COORDS\n  2\n')),
 /ORIGINAL_COORDS_AND_UNITS_REQUIRED/);
assert.throws(()=>parseCiiW14OriginalRegistration(Buffer.from(
 '#$ UNITS\n   1\n#$ COORDS\n  2\n  1')),
 /ORIGINAL_COORDINATE_RECORD_COUNT_INVALID/);
const counts=[35,36,34],starts=[1,58,105],roots=[];
for(let m=0;m<3;m++)for(let j=1;j<=counts[m];j++)roots.push({
 sourcePhysicalKey:'S'+(m+1)+':'+j,
 targetPhysicalNodeId:String(starts[m]+j-1),
 certificateStatus:'INDEPENDENT_ORIGINAL_PHYSICAL_CERTIFIED',
 originalPhysicalWitnessIds:['CERTIFIED_ORIGINAL_NODE_PAIR'],
});
assert.equal(roots.length,105);
const eight=Array.from({length:8},(_,i)=>{
 const member=i<3?'S1':i<5?'S2':'S3';
 const nodeId=i<3?String(36+i):i<5?String(37+i-3):String(35+i-5);
 const sourcePhysicalKey=member+':'+nodeId;
 return {sourcePhysicalKey,originalHypothesisTarget:String(1600+i),
  hypothesisOriginalGeometryAllRootsPass:true,
  alternateOriginalGeometryAllRootsPass:false};
});
const w11={rows:[
 ...eight.map((x,i)=>({
  sourcePhysicalKey:x.sourcePhysicalKey,
  sourceMemberId:x.sourcePhysicalKey.split(':')[0],
  sourceNodeId:x.sourcePhysicalKey.split(':')[1],
  provisionalOriginalTargetPhysicalNodeId:x.originalHypothesisTarget,
  productionReviewedTargetPhysicalNodeIds:[String(1500+i)],
  productionReviewedTargetMethodEvidence:[{
   targetPhysicalNodeId:String(1500+i),identityBound:false,decision:'REVIEW',
   authority:'MULTI_BASE_LOOP',identityEvidenceBasis:'METHOD_B',winnerGap:null,
  }],
  w11Disposition:'PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET',
  exactProductionPairReviewRows:0,matcherState:'UNRESOLVED',matcherConfidence:'REVIEW',
  matcherBlockers:['METHOD_A_BOUNDARY_UPSTREAM_SUPPORT_MISSING'],
  targetPhysicalCustodyUncontested:true,originalMethodABoundaryDiagnostics:[],
 })),
 ...Array.from({length:14},(_,i)=>({
  sourcePhysicalKey:'S1:'+(40+i),
  w11Disposition:'PRODUCTION_NO_NODE_CORRESPONDENCE_EMITTED',
 }))]};
const three=['S1:36','S1:37','S1:38'].map((sourcePhysicalKey,i)=>({
 sourcePhysicalKey,
 alternatives:[{trustedRoot:'S1:1',targetPhysicalNodeId:String(41+i),
  originalLengthResidualMm:0,signedResidualMm:1000,reversedResidualMm:800,
 }],
}));
const w12={noCandidateOriginalPathReviews:[
 ...three.map((x,i)=>({sourcePhysicalKey:x.sourcePhysicalKey,
  perRootOriginalPathEvidence:[{trustedOriginalSourceRoot:'S1:1',
   trustedOriginalTargetRoot:'1',closestODBranchCompatibleAlternatives:[{
    originalTargetId:String(41+i),within100mmIndependentLength:true,
    within100mmSignedVector:false,
   }]}]})),
 ...Array.from({length:20},(_,i)=>({sourcePhysicalKey:'S3:'+(200+i),
  perRootOriginalPathEvidence:[]})),
]};
const config={originalSources,originalTarget,w11Qualification:w11,
 w13:{productionCompetingTargetMethodABChecks:eight,signedDisplacementFrameChecks:three},
 w12,rooted:{certificates:roots},
 suggestionsByMember:{S1:[],S2:[],S3:[]}};
const report=diagnoseCiiW14MethodABMissingEvidence(config);
assert.equal(report.totals.eightOriginalProductionTargetConflicts,8);
assert.equal(report.totals.noReadyMethodA,8);
assert.equal(report.totals.noReadyMethodB,8);
assert.equal(report.totals.noProvedWinnerGap,8);
assert.equal(report.totals.nativeAutoSuggestionsForProvisionalPairs,0);
assert.equal(report.totals.originalDisplacementCases,3);
assert.equal(report.totals.newIndependentNodeCredits,0);
assert.equal(report.totals.registeredOriginalSourceComponents,3);
assert.equal(report.totals.registeredOriginalPairBothSides,105);
assert(report.originalCiiAbsoluteRegistrationAndDisplacements.every(x=>
 x.availableOriginalTargetFrameAlternatives[0].independentlyRegisteredRelativeVectorResidualMm!==null));
assert(report.productionMethodABMissingEvidence.every(x=>!x.independentlyCertifiedNewMatch));
const suggestion={sourceNodeId:eight[0].sourcePhysicalKey.split(':')[1],
 targetNodeId:eight[0].originalHypothesisTarget,basisMethod:'METHOD_A_AND_B',
 winnerGap:14,methodA:{status:'READY',bestBase:{baseId:'A1',
 anchorPairs:[{sourceNodeId:'1',targetNodeId:'1'},{sourceNodeId:'2',targetNodeId:'2'},{sourceNodeId:'3',targetNodeId:'3'}],
 weight:{total:90}}},methodB:{status:'READY',independentAxes:['DX','DZ']}};
const revised=diagnoseCiiW14MethodABMissingEvidence({
 ...config,suggestionsByMember:{...config.suggestionsByMember,S1:[suggestion]}});
assert.equal(revised.totals.nativeAutoSuggestionsForProvisionalPairs,1);
assert.equal(revised.totals.noReadyMethodA,7);
assert.equal(revised.totals.noReadyMethodB,7);
assert.equal(revised.totals.newIndependentNodeCredits,0);
assert(revised.productionMethodABMissingEvidence[0].missingIndependentEvidence.includes(
 'PRODUCTION_REVIEW_REFERENCES_DIFFERENT_TARGET_AND_NO_EXACT_PAIR_BINDING'));
assert.throws(()=>diagnoseCiiW14MethodABMissingEvidence({
 ...config,suggestionsByMember:{S1:[],S2:[]}}),/NATIVE_SUGGESTIONS_MEMBER_MISSING/);
console.log('PASS W14 original CII COORDS/UNITS, exact native Method A/B basis and nonpromotion of eight disputed pairs + three signed vector roots');
