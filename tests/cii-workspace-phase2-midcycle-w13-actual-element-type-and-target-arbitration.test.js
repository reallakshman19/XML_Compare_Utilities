import assert from 'node:assert/strict';
import {inspectCiiW13OriginalElementTypes,adjudicateCiiW13OriginalEvidence}
 from './cii-workspace-phase2-midcycle-w13-actual-element-type-and-target-arbitration.js';
const fmt=n=>Number(n).toExponential(6).toUpperCase().padStart(13,' ');
const integral=n=>String(n).padStart(13,' ');
function createCii(nodes,{bendElementIndex=null,rigidElementIndex=null,reducerElementIndex=null}={}){
 const lines=['#$ ELEMENTS'];
 for(let i=0;i<nodes-1;i++){
  const row12=[bendElementIndex===i?1:0,rigidElementIndex===i?1:0,0,0,0,0];
  const row13=[0,0,0,0,0,0],row14=[reducerElementIndex===i?1:0,0,0];
  for(let j=0;j<15;j++){
   const t=j===0?[i+1,i+2,0,0,500,273].map(fmt).join(''):
    j===1?[25.4,0,0,0,0,0].map(fmt).join(''):
    j===12?row12.map(integral).join(''):
    j===13?row13.map(integral).join(''):
    j===14?row14.map(integral).join(''):
    j>=9&&j<=11?' '.repeat(78):
    [0,0,0,0,0,0].map(fmt).join('');
   lines.push('  '+t);
  }
 }
 lines.push('#$ NODENAME');
 return Buffer.from(lines.join('\n')+'\n');
}
const base=createCii(5);
const clean=inspectCiiW13OriginalElementTypes(base,[0,1]);
assert.equal(clean.classification,'PLAIN_PIPE_COMPATIBLE_AUX_POINTERS_CLEAR_EXPLICIT_TYPE_UNPROVEN');
assert.equal(clean.plainPipeProvenByExplicitElementType,false);
assert.equal(clean.canRuleOutAuxiliaryFittings,true);
const bend=inspectCiiW13OriginalElementTypes(createCii(5,{bendElementIndex:0}),[0,1]);
assert.equal(bend.classification,'REJECT_PLAIN_PIPE_HYPOTHESIS_AUXILIARY_COMPONENT_PRESENT');
assert.equal(bend.records[0].physicalTypePointers.bend,1);
assert.equal(inspectCiiW13OriginalElementTypes(createCii(5,{rigidElementIndex:1}),[1])
 .canRuleOutAuxiliaryFittings,false);
assert.equal(inspectCiiW13OriginalElementTypes(createCii(5,{reducerElementIndex:0}),[0])
 .canRuleOutAuxiliaryFittings,false);
assert.throws(()=>inspectCiiW13OriginalElementTypes(base,[10]),/OUT_OF_BOUNDS/);
const originals=['S1','S2','S3'].map(sourceId=>({sourceId,bytes:createCii(5)}));
const emptyRow=(i)=>({sourcePhysicalKey:'S1:4',originalSourceNodeName:'',
 apparentSegmentSplittingProxy:i===0,
 lengthFitsButSignedVectorBreaks:i>=1&&i<=3,
 perRootOriginalPathEvidence:i===0?[{
  trustedOriginalSourceRoot:'S1:1',trustedOriginalTargetRoot:'1',
  closestODBranchCompatibleAlternatives:[{
   originalTargetId:'4',possibleOriginalSegmentSplittingProxy:true,
   within100mmIndependentLength:false,within100mmSignedVector:false,
  }],
 }]:i>=1&&i<=3?[{
  trustedOriginalSourceRoot:'S1:1',trustedOriginalTargetRoot:'1',
  closestODBranchCompatibleAlternatives:[{
   originalTargetId:'4',possibleOriginalSegmentSplittingProxy:false,
   within100mmIndependentLength:true,within100mmSignedVector:false,
  }],
 }]:[]});
const twentyThree=Array.from({length:23},(_,i)=>emptyRow(i));
const eight=Array.from({length:8},(_,i)=>({
 sourcePhysicalKey:'S'+(i%3+1)+':3',
 w10HypotheticalTargetNodeId:'3',
 originalRootComparisons:[{trustedOriginalSourceRoot:'S1:1',originalTargetRoot:'1',
  comparedTargetClaims:[
   {targetPhysicalNodeId:'3',isW10Hypothesis:true,
    targetAlreadyIndependentlyOccupied:false,originalGeometry:{
     originalRouteUnique:true,originalBranchCompatible:true,originalOdCompatible:true,
     within100mmIndependentLength:true,within100mmSignedVector:true}},
   {targetPhysicalNodeId:'4',isW10Hypothesis:false,
    targetAlreadyIndependentlyOccupied:false,originalGeometry:{
     originalRouteUnique:true,originalBranchCompatible:true,originalOdCompatible:true,
     within100mmIndependentLength:false,within100mmSignedVector:true}},
  ]}]}));
const twentyTwo=Array.from({length:22},(_,i)=>({
 sourcePhysicalKey:'S'+(i%3+1)+':3',
 w11Disposition:i<8?'PRODUCTION_NODE_REVIEW_EXISTS_FOR_DIFFERENT_TARGET':
  'PRODUCTION_NO_NODE_CORRESPONDENCE_EMITTED',
 productionReviewedTargetPhysicalNodeIds:i<8?['4']:[],
 productionReviewedTargetMethodEvidence:i<8?[{targetPhysicalNodeId:'4',authority:'METHOD_A',
  identityBound:false,decision:'REVIEW',winnerGap:null}]:[],
 matcherBlockers:['METHOD_B_WINNER_GAP_VETO'],
 originalMethodABoundaryDiagnostics:[],
 matcherState:'UNRESOLVED',
}));
const full=adjudicateCiiW13OriginalEvidence({
 originalSources:originals,originalTarget:createCii(6),
 w12:{noCandidateOriginalPathReviews:twentyThree,
  eightCompetingOriginalTargetReviews:eight},
 w11Qualification:{rows:twentyTwo},
});
assert.equal(full.summary.originalSegmentationProxyCount,1);
assert.equal(full.summary.originalSegmentationExplicitPipeTypeCertified,0);
assert.equal(full.summary.threeSignedVectorFailuresInvestigated,3);
assert.equal(full.summary.eightProductionTargetConflictsInvestigated,8);
assert.equal(full.summary.addedIndependentlyCertifiedPhysicalPairs,0);
assert(full.productionCompetingTargetMethodABChecks.every(x=>!x.acceptedNewPhysicalMatch));
assert(full.signedDisplacementFrameChecks.every(x=>!x.grantedNewBinding));
assert(full.segmentedRunElementTypeChecks.every(x=>!x.newCertifiedMatches));
assert.equal(full.changesToProductionMatcher,false);
assert.equal(full.newWriter2Authority,false);
assert.throws(()=>adjudicateCiiW13OriginalEvidence({
 originalSources:originals,originalTarget:createCii(6),
 w12:{noCandidateOriginalPathReviews:twentyThree,
  eightCompetingOriginalTargetReviews:eight},
 w11Qualification:{rows:twentyTwo},immutable100mmTolerance:200,
}),/COMPLETE_ORIGINAL_150_AND_100MM_EVIDENCE_REQUIRED/);
const badRows=structuredClone(twentyTwo);
badRows[0].productionReviewedTargetMethodEvidence[0].identityBound=true;
badRows[0].provenanceAndProductionIdentitySupported=true;
assert.throws(()=>adjudicateCiiW13OriginalEvidence({
 originalSources:originals,originalTarget:createCii(6),
 w12:{noCandidateOriginalPathReviews:twentyThree,
  eightCompetingOriginalTargetReviews:eight},
 w11Qualification:{rows:badRows},
}),/CONFLICT_CANNOT_COEXIST_WITH_CERTIFIED_PRODUCTION_BINDING/);
console.log('PASS W13 original CII aux-type records, direction/registration and conflicting Method A/B: zero unqualified physical credits');
