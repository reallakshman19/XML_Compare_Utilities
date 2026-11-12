import { methodCProperFrameProposal } from './cii-workspace-method-c-proper-frame.js';
import { methodCOriginalPaths, methodCIndependentPathPairs,
  methodCOriginalPathCompatible, methodCVectorNonparallel, methodCScalarTriple } from './cii-workspace-method-c-signed-paths.js';

const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const norm=(a)=>Math.hypot(...a);
const rotate=(R,p)=>R.map(row=>row.reduce((v,x,i)=>v+x*p[i],0));
const transform=(R,t,p)=>add(rotate(R,p),t);
const maxAbs=(a)=>Math.max(...a.map(Math.abs));
const samePose=(a,b)=>a.rotation.every((row,i)=>row.every((v,j)=>
  Math.abs(v-b.rotation[i][j])<=1e-5))&&maxAbs(sub(a.translation,b.translation))<=0.025;
const disjoint=(pathA,pathB)=>{
  const a=new Set(pathA.elements.map(e=>e.index));
  return pathB.elements.every(e=>!a.has(e.index));
};
const basis=(pair)=>pair.map(path=>path.displacement);
const receipt=(path)=>({endPhysicalNode:path.id, signedVectorMm:path.displacement,
  originalElements:path.elements.map(e=>({...e}))});
const poseKey=(index)=>'POSE-'+String(index).padStart(4,'0');

function signedHeldOut(source,target,pose,D,{ endpointMm=0.05, minimumSine=0.01 }={}) {
  const sStart=source.nodeIndex.get(D.anchor.source).xyz;
  const tStart=target.nodeIndex.get(D.anchor.target).xyz;
  const unavailableS=new Set(D.source.flatMap(path=>path.elements.map(e=>e.index)));
  const unavailableT=new Set(D.target.flatMap(path=>path.elements.map(e=>e.index)));
  const targetEdges=target.edges.filter(e=>target.nodeIndex.get(e.from)?.component===D.targetComponent);
  const positive=[],rejected=[],claimed=new Set();
  const sourceEdges=source.edges.filter(e=>source.nodeIndex.get(e.from)?.component===D.sourceComponent);
  for (const edge of sourceEdges) {
    if (unavailableS.has(edge.index)) continue;
    const sFrom=source.nodeIndex.get(edge.from),sTo=source.nodeIndex.get(edge.to);
    const p=transform(pose.rotation,pose.translation,sFrom.xyz);
    const q=transform(pose.rotation,pose.translation,sTo.xyz);
    const near=targetEdges.map(e=>{
      const from=target.nodeIndex.get(e.from).xyz,to=target.nodeIndex.get(e.to).xyz;
      const forward=Math.max(maxAbs(sub(from,p)),maxAbs(sub(to,q)));
      const backward=Math.max(maxAbs(sub(from,q)),maxAbs(sub(to,p)));
      return {edge:e,errorMm:Math.min(forward,backward),sign:forward<=backward?1:-1};
    }).sort((a,b)=>a.errorMm-b.errorMm || a.edge.index-b.edge.index);
    const closest=near[0]??null;
    const matching=near.find(row=>row.errorMm<=endpointMm && !unavailableT.has(row.edge.index) &&
      !claimed.has(row.edge.index));
    const record={sourceElement:edge.witness,sourceIndex:edge.index,
      sourceSignedDeltaMm:edge.delta,originalSourceOD:edge.od,originalSourceWall:edge.wall,
      nearestTargetElement:closest?.edge.witness??null,nearestErrorMm:closest?.errorMm??null};
    if(!matching){rejected.push({...record,reason:closest?.errorMm<=endpointMm?
      'TARGET_ELEMENT_IN_D_OR_COLLISION':'NO_DISJOINT_ORIGINAL_TARGET_ELEMENT'});continue;}
    claimed.add(matching.edge.index);
    const t=matching.edge;
    const differences={odMm:edge.od-t.od,wallMm:edge.wall-t.wall};
    positive.push({...record,targetElement:t.witness,targetIndex:t.index,
      targetSign:matching.sign,targetSignedDeltaMm:t.delta.map(v=>v*matching.sign),
      errorMm:matching.errorMm,differences,
      engineeringStatus:Math.abs(differences.odMm)>0.01||Math.abs(differences.wallMm)>0.01?
        'ENGINEERING_DIFFERENCE_NOT_IDENTITY':'GEOMETRIC_ONLY_NO_IDENTITY'});
  }
  const hVectors=positive.map(row=>row.sourceSignedDeltaMm);
  const dVectors=basis(D.source);
  // An out-of-plane H witness prevents a 2D reflected arrangement from being called identified.
  const chiral=positive.some(row=>Math.abs(methodCScalarTriple(dVectors[0],dVectors[1],
    row.sourceSignedDeltaMm))>1e-6*norm(dVectors[0])*norm(dVectors[1])*norm(row.sourceSignedDeltaMm));
  const independent=positive.length>=2 && methodCVectorNonparallel(hVectors,minimumSine) && chiral;
  return {positive,rejected,independent,complete:true,originalOnly:true,
    signedOutOfPlaneWitness:chiral,disjointDiscoveryHeldOut:true,
    sourceAnchorXYZ:sStart,targetAnchorXYZ:tStart};
}

function candidate(source,target,sourcePair,targetPair,policy) {
  const s0=source.nodeIndex.get(policy.anchor.source);
  const t0=target.nodeIndex.get(policy.anchor.target);
  const frame=methodCProperFrameProposal({sourceAnchor:s0.xyz,targetAnchor:t0.xyz,
    sourceVectors:basis(sourcePair),targetVectors:basis(targetPair),
    minimumSine:policy.minimumSine,lengthToleranceMm:policy.endpointMm,
    angleTolerance:policy.angleTolerance});
  if(!frame.rotation)return null;
  return {rotation:frame.rotation,translation:frame.translation,determinant:frame.determinant,
    sourceSha:source.sha256,targetSha:target.sha256,
    D:{anchor:policy.anchor,source:sourcePair,target:targetPair,
      sourceComponent:s0.component,targetComponent:t0.component}};
}

export function discoverMethodCOriginalOrientations(source,target,anchor,options={}) {
  const safe={status:'HOLD',rotation:null,translation:null,qualified:false,identified:false,
    ownerAnchorAuthenticated:false,physicalNodeCorrespondenceQualified:false,
    qualifiedIdentityCount:0,writerEligible:false,applyAuthorized:false,
    sourceSha:source?.sha256??null,targetSha:target?.sha256??null,
    hypotheses:[],selectedPoseId:null};
  const hold=(reason,details={})=>({...safe,reason,...details});
  if(source?.byteAuthority!=='ORIGINAL_BYTES'||target?.byteAuthority!=='ORIGINAL_BYTES')
    return hold('ORIGINAL_BYTES_REQUIRED');
  const a={source:String(anchor?.source??''),target:String(anchor?.target??''),
    sourceSha:source.sha256,targetSha:target.sha256,member:source.member};
  if(!source.nodeIndex?.has(a.source)||!target.nodeIndex?.has(a.target)||
     (anchor.member&&anchor.member!==source.member)||
     (anchor.sourceSha&&anchor.sourceSha!==source.sha256)||
     (anchor.targetSha&&anchor.targetSha!==target.sha256))return hold('ANCHOR_ORIGINAL_CUSTODY_INVALID');
  const policy={maxDepth:options.maxDepth??5,maxPaths:options.maxPaths??4000,
    maxCombinations:options.maxCombinations??50000,maxHypotheses:options.maxHypotheses??256,
    endpointMm:options.endpointMm??0.05,odMm:options.odMm??0.01,
    minimumSine:options.minimumSine??0.01,angleTolerance:options.angleTolerance??1e-5,anchor:a};
  if(!Number.isSafeInteger(policy.maxCombinations)||policy.maxCombinations<1||
     !Number.isSafeInteger(policy.maxHypotheses)||policy.maxHypotheses<1||
     !Number.isFinite(policy.endpointMm)||policy.endpointMm<0||
     !Number.isFinite(policy.odMm)||policy.odMm<0)throw new Error('METHOD_C_DISCOVERY_POLICY_INVALID');
  const s=methodCOriginalPaths(source,a.source,policy);
  const t=methodCOriginalPaths(target,a.target,policy);
  const counts={sourcePaths:s.paths.length,targetPaths:t.paths.length,
    sourceComplete:s.complete,targetComplete:t.complete,visited:0,possible:0,
    properProposers:0,distinctPoses:0};
  if(!s.complete||!t.complete)return hold('PATH_ENUMERATION_BUDGET_HOLD',{counts});
  const sPairs=methodCIndependentPathPairs(s.paths,policy.minimumSine);
  const tPairs=methodCIndependentPathPairs(t.paths,policy.minimumSine);
  counts.possible=sPairs.length*tPairs.length*2;
  if(counts.possible>policy.maxCombinations)
    return hold('COMPETITOR_ENUMERATION_BUDGET_HOLD',{counts});
  const hypotheses=[];
  for(const sp of sPairs) for(const tp of tPairs)for(const targetPair of [tp,[tp[1],tp[0]]]){
    counts.visited++;
    if(!sp.every((path,i)=>methodCOriginalPathCompatible(path,targetPair[i],
       policy.endpointMm,policy.odMm)))continue;
    const candidatePose=candidate(source,target,sp,targetPair,policy);
    if(!candidatePose)continue;
    counts.properProposers++;
    const existing=hypotheses.find(row=>samePose(row,candidatePose));
    if(existing){existing.proposers.push(candidatePose.D);continue;}
    if(hypotheses.length>=policy.maxHypotheses)
      return hold('HYPOTHESIS_BUDGET_HOLD',{counts});
    hypotheses.push({...candidatePose,poseId:poseKey(hypotheses.length+1),
      proposers:[candidatePose.D]});
  }
  counts.distinctPoses=hypotheses.length;
  const ledger=hypotheses.map(pose=>{
    const tested=pose.proposers.map(D=>({D:{source:D.source.map(receipt),
      target:D.target.map(receipt),sourceComponent:D.sourceComponent,
      targetComponent:D.targetComponent},
      H:signedHeldOut(source,target,pose,D,policy)}));
    tested.sort((a,b)=>Number(b.H.independent)-Number(a.H.independent)||
      b.H.positive.length-a.H.positive.length);
    const best=tested[0];
    return {poseId:pose.poseId,rotation:pose.rotation,translation:pose.translation,
      determinant:pose.determinant,sourceSha:pose.sourceSha,targetSha:pose.targetSha,
      competingProposers:tested,selectedDiscovery:best?.D??null,
      heldOut:best?.H??null,admissible:Boolean(best?.H.independent)};
  });
  const admissible=ledger.filter(row=>row.admissible);
  const evidence={schema:'MethodC.OriginalOrientationDiscovery.v1',originalByteAuthority:true,
    sourceMember:source.member,targetMember:target.member,sourceSha:source.sha256,
    targetSha:target.sha256,anchor:a,counts,hypotheses:ledger,
    admissiblePoseIds:admissible.map(row=>row.poseId),
    ownerAnchorAuthenticated:false,qualifiedIdentityCount:0,writerEligible:false};
  if(!ledger.length)return hold('NO_PROPER_SIGNED_ORIENTATION',{originalDiscovery:evidence});
  if(admissible.length!==1)return hold(admissible.length>1?
    'AMBIGUOUS_PROPER_POSE_HOLD':'NO_INDEPENDENT_SIGNED_HELD_OUT',{originalDiscovery:evidence});
  const selected=admissible[0];
  return {...safe,status:'UNVERIFIED_GEOMETRIC_PREVIEW',reason:null,
    sourceComponent:source.nodeIndex.get(a.source).component,
    targetComponent:target.nodeIndex.get(a.target).component,
    rotation:selected.rotation,translation:selected.translation,
    scale:1,determinant:selected.determinant,maxResidualMm:0,rmsResidualMm:0,
    residuals:[{source:a.source,target:a.target,distance:0,xyz:[0,0,0]}],
    anchors:[{source:a.source,target:a.target,role:'experimental-unverified'}],
    selectedPoseId:selected.poseId,originalDiscovery:evidence};
}
