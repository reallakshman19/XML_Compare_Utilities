import assert from 'node:assert/strict';
import {probeCiiW15NativeABOnDisputedHypotheses} from './cii-workspace-phase2-midcycle-w15-native-basis-direct-probe.js';
function edge(from,to,v,od=100){
 return {elementId:from+'_'+to,from:String(from),to:String(to),
 dx:v[0],dy:v[1],dz:v[2],lengthMm:Math.hypot(...v),
 diameter:od,componentKind:'PIPE'};
}
function graph(axes=1){
 const es=[edge('10','11',[600,0,0])];
 if(axes>=2)es.push(edge('10','12',[0,600,0]));
 if(axes>=3)es.push(edge('10','13',[0,0,600]));
 const adj=new Map(),nodes=[{id:'10',degree:es.length,position:{x:0,y:0,z:0},nodeName:'',neighbourhoodLayers:[]}];
 for(const e of es){
  for(const k of [e.from,e.to]){
   if(!adj.has(k))adj.set(k,[]);adj.get(k).push(e);
  }
  nodes.push({id:e.to,degree:1,position:{x:e.dx,y:e.dy,z:e.dz},nodeName:'',neighbourhoodLayers:[]});
 }
 return {nodes,edges:es,adjacency:adj};
}
const sourceA=graph(1),sourceB=graph(2),target=graph(2);
const members=[{sourceId:'S1',sourceGraph:sourceA},{sourceId:'S2',sourceGraph:sourceB},{sourceId:'S3',sourceGraph:sourceB}];
const disputes=Array.from({length:8},(_,i)=>({
 sourcePhysicalKey:'S'+(i%3+1)+':10',
 sourceMember:'S'+(i%3+1),provisionalOriginalTargetPhysicalNodeId:'10',
 productionReviewedTargetPhysicalNodeIds:['11'], 
}));
const candidates=disputes.map(r=>({
 sourcePhysicalKey:r.sourcePhysicalKey,
 provisionalOriginalTargetPhysicalNodeId:'10',
 targetPhysicalCustodyUncontested:true,
 provenanceAndProductionIdentitySupported:false,
 identityBound:false,
}));
const config={preparedSession:{members,target:{targetGraph:target}},
 w14:{productionMethodABMissingEvidence:disputes},
 w11Qualification:{rows:[...candidates,...Array.from({length:14},()=>({sourcePhysicalKey:'OTHER'}))]},
 inspection:{memberInspections:['S1','S2','S3'].map(sourceId=>({
  sourceId,inspection:{baseAnchorSuggestions:[]}}))}};
const probe=probeCiiW15NativeABOnDisputedHypotheses(config);
assert.equal(probe.totals.eightDisputedPhysicalPairs,8);
assert.equal(probe.totals.addedIndependentPhysicalNodeMatches,0);
assert.equal(probe.totals.nativeExactPairDiscovered,0);
assert.equal(probe.totals.sourceMissingSecondAxis,3);
assert(probe.details.every(row=>row.physicalCreditGranted===false&&
 row.nativeIndependentPhysicalQualificationMissing.includes('NO_NATIVE_DISCOVERED_PAIR_OR_MUTUAL_BEST_WINNER_GAP_EVIDENCE')));
assert(probe.details.filter(row=>row.sourcePhysicalKey.startsWith('S1:')).every(row=>
 row.nativeMethodBReason==='METHOD_B_TWO_AXIS_GATE_NOT_MET'));
const inNativeSuggestion={sourceNodeId:'10',targetNodeId:'10',status:'SUGGESTED',
 confidence:'HIGH',basisMethod:'METHOD_B_NETWORK',
 winnerGap:20,methodB:{status:'READY',selectedBasis:{},source:{independentAxisRunCount:2}},
 methodA:null,candidateGeneration:{authorityRole:'CANDIDATE_GENERATION_ONLY'}};
const enriched=probeCiiW15NativeABOnDisputedHypotheses({...config,
 inspection:{memberInspections:[
 {sourceId:'S1',inspection:{baseAnchorSuggestions:[]}},
 {sourceId:'S2',inspection:{baseAnchorSuggestions:[inNativeSuggestion]}},
 {sourceId:'S3',inspection:{baseAnchorSuggestions:[]}}]}});
assert.equal(enriched.totals.nativeExactPairDiscovered,1);
assert.equal(enriched.totals.nativeExactPairWithProvedWinnerGap,1);
assert.equal(enriched.totals.addedIndependentPhysicalNodeMatches,0);
assert.throws(()=>probeCiiW15NativeABOnDisputedHypotheses({...config,
 preparedSession:{members:members.slice(1),target:{targetGraph:target}}}),
 /ORIGINAL_NATIVE_PREPARED_GRAPH_AND_EIGHT_CONFLICTS_REQUIRED/);
assert.throws(()=>probeCiiW15NativeABOnDisputedHypotheses({...config,
 w11Qualification:{rows:candidates}}),
 /ORIGINAL_NATIVE_PREPARED_GRAPH_AND_EIGHT_CONFLICTS_REQUIRED/);
console.log('PASS W15 direct native Method B run basis: two-axis hard veto, native winner gap and zero geometric auto-credit');
