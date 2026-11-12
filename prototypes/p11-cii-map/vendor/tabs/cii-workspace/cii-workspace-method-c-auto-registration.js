// Candidate-only AUTO mode: authenticated Owner anchor mode cannot be minted by browser metadata.
import { discoverMethodCOriginalOrientations } from './cii-workspace-method-c-orientation-hypotheses.js';

const protectedFlags = { qualified:false, identified:false,
  ownerAnchorAuthenticated:false, physicalNodeCorrespondenceQualified:false,
  qualifiedIdentityCount:0, writerEligible:false, applyAuthorized:false,
  candidateOnly:true };
function hold(source,target,reason,anchor=null){
  return {...protectedFlags,status:'HOLD',reason,rotation:null,translation:null,
    sourceSha:source?.sha256??null,targetSha:target?.sha256??null,
    sourceMember:source?.member??null,targetMember:target?.member??null,
    anchors:anchor?[{source:String(anchor.source),target:String(anchor.target),
      role:'experimental-unverified'}]:[],originalDiscovery:{
      schema:'MethodC.OriginalOrientationDiscovery.v1',sourceSha:source?.sha256??null,
      targetSha:target?.sha256??null,reason,hypotheses:[],admissiblePoseIds:[]}};
}
export function registerMethodCAutoReview(source,target,anchors,options={}) {
  const mode=options.orientationMode??'AUTO_GEOMETRIC_PREVIEW';
  if(mode==='AUTO_OWNER_VERIFIED')return hold(source,target,'OWNER_ANCHOR_AUTHENTICATION_UNAVAILABLE',
    Array.isArray(anchors)&&anchors.length===1?anchors[0]:null);
  if(mode!=='AUTO_GEOMETRIC_PREVIEW')
    return hold(source,target,'UNSUPPORTED_ORIENTATION_MODE');
  if(!Array.isArray(anchors)||anchors.length!==1)
    return hold(source,target,'ONE_EXPERIMENTAL_PHYSICAL_ANCHOR_REQUIRED');
  const anchor=anchors[0];
  const discovered=discoverMethodCOriginalOrientations(source,target,anchor,
    options.discoveryPolicy??{});
  return {...discovered,...protectedFlags,
    sourceMember:source?.member??null,targetMember:target?.member??null,
    anchors:[{source:String(anchor.source),target:String(anchor.target),
      role:'experimental-unverified'}],
    warning:'METHOD_C_AUTO_GEOMETRIC_PREVIEW_ONLY; NOT_OWNER_AUTHENTICATED; B0_C0'};
}

function canonical(source,target,result) {
  if(!source?.sha256||!target?.sha256||!result?.status)
    throw new Error('METHOD_C_AUTO_EVIDENCE_INPUT_REQUIRED');
  return JSON.stringify({sourceSha:source.sha256,targetSha:target.sha256,
    sourceMember:source.member,targetMember:target.member,status:result.status,
    reason:result.reason??null,rotation:result.rotation??null,
    translation:result.translation??null,selectedPoseId:result.selectedPoseId??null,
    anchors:result.anchors??[],originalDiscovery:result.originalDiscovery??null});
}
export function snapshotMethodCAutoEvidence(source,target,result) {
  return {schema:'MethodC.AutoReviewSnapshot.v1',snapshot:canonical(source,target,result)};
}
export function methodCAutoEvidence(source,target,result,ticket) {
  if(ticket?.schema!=='MethodC.AutoReviewSnapshot.v1'||
     ticket.snapshot!==canonical(source,target,result))
    throw new Error('METHOD_C_AUTO_EXPORT_STALE_SNAPSHOT');
  const data=JSON.parse(ticket.snapshot);
  if(result.sourceSha!==data.sourceSha||result.targetSha!==data.targetSha||
     result.sourceMember!==data.sourceMember||result.targetMember!==data.targetMember)
    throw new Error('METHOD_C_AUTO_EXPORT_ORIGINAL_CUSTODY_MISMATCH');
  return {schema:'MethodC.AutoOriginalEvidence.v1',authority:'READ_ONLY_UNVERIFIED_GEOMETRY',
    ...data,qualified:false,identified:false,ownerAnchorAuthenticated:false,
    qualifiedPhysicalIdentityCount:0,writerEligible:false,applyAuthorized:false,
    rejectionLedger:data.originalDiscovery?.hypotheses?.flatMap(p=>p.heldOut?.rejected??[])??[]};
}
export function methodCAutoJsonExport(source,target,result,ticket) {
  return JSON.stringify(methodCAutoEvidence(source,target,result,ticket),null,2)+'\n';
}
