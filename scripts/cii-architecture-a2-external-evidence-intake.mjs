/**
 * ARCH-01 A2-SHADOW-15 — external engineering evidence intake.
 *
 * Provenance of a cryptographically intact DOCUMENT is not equivalent to
 * a trusted signer, an effective engineering revision, physical NODE identity,
 * two-ended closure, TARGET custody, or Writer admission.
 * No production import or automatic correspondence promotion is allowed.
 */
import {createHash,verify as verifySignature} from 'node:crypto';
const fail=k=>{throw Error('A215_'+k);};
const H=/^[0-9a-f]{64}$/i;
const cmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const freeze=x=>Array.isArray(x)?Object.freeze(x.map(freeze)):x&&typeof x==='object'
 ?Object.freeze(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,freeze(v)]))):x;
const sha=x=>createHash('sha256').update(x).digest('hex');
const str=(s,max=128)=>typeof s==='string'&&s.length>0&&s.length<=max
 &&s.trim()===s&&!/[\x00-\x1f]/.test(s);
const keys=(x,allowed)=>x&&typeof x==='object'&&!Array.isArray(x)
 &&Object.keys(x).sort().join('|')===allowed.slice().sort().join('|');
const number=x=>typeof x==='number'&&Number.isFinite(x);
const matchNumber=(a,b)=>number(a)&&Math.abs(a-b)<=0.000001;
function canonical(x){
 if(x===null||typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);
 if(typeof x==='number'){if(!Number.isFinite(x))fail('NONFINITE_CANONICAL_VALUE');return JSON.stringify(x);}
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(!x||typeof x!=='object'||Object.getPrototypeOf(x)!==Object.prototype)
  fail('NON_JSON_CANONICAL_VALUE');
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
/** Deterministic detached Ed25519 challenge; unsigned keys cannot be added to packets. */
export function ciiA215SignatureMessage(keyId,payload){
 if(!str(keyId,96))fail('BAD_KEY_ID');
 return Buffer.from('CII_ARCH_A215_SIGNED_EVIDENCE_V1\0'+canonical({keyId,payload}),'utf8');
}
function validateReview(review){
 if(review?.schema!=='CiiArchitectureA214EngineeringRevisionCustodyLedger.v1'
  ||review.status!=='ORIGINAL_DISCREPANCIES_REPRODUCED_EXTERNAL_REVISION_AND_CUSTODY_REQUIRED'
  ||review.writerReady!==false||review.transferPlan!==null||review.writeScope!==null
  ||review.certifiedNodeCount!==0||review.certifiedElementCount!==0
  ||review.admittedCandidateCount!==0||!Array.isArray(review.correspondenceCertificates)
  ||review.correspondenceCertificates.length!==0
  ||!H.test(String(review.provenance?.originalSourceSetSha256))
  ||!H.test(String(review.provenance?.sourceOriginalSha256))
  ||!H.test(String(review.provenance?.originalTargetSha256))
  ||!Array.isArray(review.zones)||review.zones.length!==3
  ||!Array.isArray(review.custodyConflicts)||review.custodyConflicts.length!==2
  ||review.summary.independentlyCertifiedSubchains!==0)
  fail('A214_UNQUALIFIED_ORIGINAL_REVIEW_REQUIRED');
 return review.provenance;
}
function originalIndex(review){
 const edges=new Map(),nodes=new Map(),custody=new Map();
 for(const z of review.zones){
  if(z.twoIndependentBoundariesProven!==false||z.certifiedNodeCount!==0)
   fail('UNEXPECTED_PARENT_ZONE_AUTHORITY');
  if(z.sourceNodes.length!==z.candidateTargetNodes.length)
   fail('INVALID_PARENT_NODE_CANDIDATE_SHAPE');
  z.sourceNodes.forEach((sourceNodeId,i)=>{
   const targetNodeId=z.candidateTargetNodes[i],key=String(sourceNodeId)+'|'+String(targetNodeId);
   if(nodes.has(key))fail('DUPLICATE_PARENT_NODE_CANDIDATE');
   nodes.set(key,{zone:z.zoneName,sourceNodeId:String(sourceNodeId),targetNodeId:String(targetNodeId)});
  });
  for(const b of z.boundaries){
   for(const p of b.provisionalTargetPaths){
    const key=b.source.elementId+'|'+p.targetOriginalElementIds.join('|');
    if(edges.has(key))fail('DUPLICATE_PARENT_EDGE_PATH');
    edges.set(key,{zone:z.zoneName,
      sourceElementId:b.source.elementId,targetElementIds:p.targetOriginalElementIds,
      sourceRecordedLengthMm:b.source.recordedLengthMm,
      targetRecordedLengthMm:p.targetTotalRecordedLengthMm,
      recordedDifferenceMm:p.lengthDifferenceMm,
      degreeChangePresent:z.degreeDisagreements.length>0});
   }
  }
 }
 for(const c of review.custodyConflicts){
  if(c.independentCustodyDecisionAvailable!==false
   ||!Array.isArray(c.competingSourceNodeKeys)||c.competingSourceNodeKeys.length<2
   ||custody.has(c.targetNodeId))fail('INVALID_PARENT_CUSTODY');
  custody.set(c.targetNodeId,c);
 }
 return {edges,nodes,custody};
}
function requestRows(review,idx){
 const rows=[];
 for(const edge of idx.edges.values()){
  if(edge.recordedDifferenceMm>25||edge.degreeChangePresent)
   rows.push({kind:'ENGINEERING_REVISION',zone:edge.zone,
    sourceElementId:edge.sourceElementId,targetElementIds:edge.targetElementIds,
    reason:edge.degreeChangePresent?'TOPOLOGY_DEGREE_REVISION_AUTHORITY_REQUIRED':
     'RECORDED_LENGTH_REVISION_AUTHORITY_REQUIRED'});
 }
 for(const zone of review.zones){
  const proposed=zone.sourceNodes.map((sourceNodeId,i)=>({
   sourceNodeId:String(sourceNodeId),targetNodeId:String(zone.candidateTargetNodes[i])
  }));
  // Both endpoints of a nontrivial zone are survey requests, not independently
  // certified double physical boundary closures.
  const ends=proposed.length>1?[proposed[0],proposed.at(-1)]:proposed;
  for(const p of ends)rows.push({kind:'SURVEY_NODE_PAIR',zone:zone.zoneName,...p,
   reason:'INDEPENDENT_DATUM_AND_PHYSICAL_NODE_IDENTITY_REQUIRED'});
 }
 for(const c of review.custodyConflicts)
  rows.push({kind:'TARGET_CUSTODY_DECISION',targetNodeId:c.targetNodeId,
   competingSourceNodeKeys:c.competingSourceNodeKeys,
   reason:'COMPETING_TARGET_PHYSICAL_IDENTITY_CLAIMS'});
 return rows;
}
function reviewPacket(payload,idx,provenance){
 if(!keys(payload,['schema','kind','sourceId','sourceOriginalSha256',
  'targetOriginalSha256','documentSha256','subject'])
  ||payload.schema!=='CiiA215ExternalEvidencePacket.v1'
  ||!['ENGINEERING_REVISION','SURVEY_NODE_PAIR','TARGET_CUSTODY_DECISION'].includes(payload.kind)
  ||payload.sourceId!=='S2'||payload.sourceOriginalSha256!==provenance.sourceOriginalSha256
  ||payload.targetOriginalSha256!==provenance.originalTargetSha256
  ||!H.test(String(payload.documentSha256)))
  fail('INVALID_STALE_OR_UNTRUSTED_PACKET_BASIS');
 const s=payload.subject;
 if(payload.kind==='ENGINEERING_REVISION'){
  if(!keys(s,['sourceElementId','targetElementIds','sourceRecordedLengthMm',
   'targetRecordedLengthMm','unit','revisionId'])||s.unit!=='mm'
   ||!str(s.sourceElementId)||!str(s.revisionId)
   ||!Array.isArray(s.targetElementIds)||!s.targetElementIds.length
   ||s.targetElementIds.length>8||s.targetElementIds.some(x=>!str(x)))
   fail('INVALID_ENGINEERING_REVISION_SUBJECT');
  const e=idx.edges.get(s.sourceElementId+'|'+s.targetElementIds.join('|'));
  if(!e||!matchNumber(e.sourceRecordedLengthMm,s.sourceRecordedLengthMm)
   ||!matchNumber(e.targetRecordedLengthMm,s.targetRecordedLengthMm))
   fail('ENGINEERING_REVISION_PHYSICAL_PAIR_NOT_REPRODUCED');
  return {zone:e.zone,subjectKey:'EDGE:'+s.sourceElementId+'|'+s.targetElementIds.join('|')};
 }
 if(payload.kind==='SURVEY_NODE_PAIR'){
  if(!keys(s,['sourceNodeId','targetNodeId','surveyId','datum',
    'surveyedSourceCoordinatesMm','surveyedTargetCoordinatesMm'])
   ||!str(s.sourceNodeId)||!str(s.targetNodeId)||!str(s.surveyId)
   ||!str(s.datum)||!Array.isArray(s.surveyedSourceCoordinatesMm)
   ||!Array.isArray(s.surveyedTargetCoordinatesMm)
   ||![s.surveyedSourceCoordinatesMm,s.surveyedTargetCoordinatesMm]
    .every(p=>p.length===3&&p.every(number)))
   fail('INVALID_SURVEY_SUBJECT');
  const n=idx.nodes.get(s.sourceNodeId+'|'+s.targetNodeId);
  if(!n)fail('SURVEY_PAIR_NOT_IN_ORIGINAL_CANDIDATE_SET');
  return {zone:n.zone,subjectKey:'NODE:'+s.sourceNodeId+'|'+s.targetNodeId};
 }
 if(!keys(s,['targetNodeId','winnerSourceNodeKey','loserSourceNodeKeys','decisionId'])
  ||!str(s.targetNodeId)||!str(s.winnerSourceNodeKey)||!str(s.decisionId)
  ||!Array.isArray(s.loserSourceNodeKeys)
  ||s.loserSourceNodeKeys.some(x=>!str(x))||new Set(s.loserSourceNodeKeys).size!==s.loserSourceNodeKeys.length)
  fail('INVALID_CUSTODY_DECISION_SUBJECT');
 const c=idx.custody.get(s.targetNodeId);
 if(!c||!c.competingSourceNodeKeys.includes(s.winnerSourceNodeKey)
  ||s.loserSourceNodeKeys.length!==c.competingSourceNodeKeys.length-1
  ||JSON.stringify(s.loserSourceNodeKeys.slice().sort(cmp))!==
     JSON.stringify(c.competingSourceNodeKeys.filter(x=>x!==s.winnerSourceNodeKey).sort(cmp)))
  fail('CUSTODY_DECISION_MISSING_OR_NOT_EXCLUSIVE');
 return {zone:null,subjectKey:'CUSTODY:'+s.targetNodeId};
}
function rootsOf(roots){
 if(!Array.isArray(roots)||roots.length>8)fail('INVALID_TRUST_ROOT_SET');
 const m=new Map();
 for(const root of roots){
  if(!keys(root,['keyId','publicKeyPem'])||!str(root.keyId,96)
   ||typeof root.publicKeyPem!=='string'||root.publicKeyPem.length>8192
   ||!root.publicKeyPem.includes('-----BEGIN PUBLIC KEY-----')||m.has(root.keyId))fail('INVALID_TRUST_ROOT');
  m.set(root.keyId,root.publicKeyPem);
 }
 return m;
}
/**
 * Signatures prove packet integrity relative to caller-configured keys ONLY.
 * This function CANNOT establish whether the Owner approved any key or record.
 */
export function inspectCiiA215ExternalEvidence({revisionLedger,packets=[],verificationKeys=[]}={}){
 const provenance=validateReview(revisionLedger),idx=originalIndex(revisionLedger);
 const roots=rootsOf(verificationKeys);
 if(!Array.isArray(packets)||packets.length>50)fail('PACKET_BUDGET_EXCEEDED');
 const signed=[],seen=new Set();
 for(const packet of packets){
  if(!keys(packet,['keyId','payload','documentText','signatureBase64'])
   ||!str(packet.keyId,96)||typeof packet.documentText!=='string'
   ||!packet.documentText.length||Buffer.byteLength(packet.documentText,'utf8')>8192
   ||!str(packet.signatureBase64,256)||!/^[a-zA-Z0-9+/]+={0,2}$/.test(packet.signatureBase64))
   fail('INVALID_EVIDENCE_ENVELOPE');
  if(!roots.has(packet.keyId))fail('SIGNER_NOT_IN_INDEPENDENT_KEY_SET');
  if(sha(Buffer.from(packet.documentText,'utf8'))!==packet.payload?.documentSha256)
   fail('DOCUMENT_BYTES_DIGEST_MISMATCH');
  const evidence=reviewPacket(packet.payload,idx,provenance);
  const unique=packet.payload.kind+'|'+evidence.subjectKey;
  if(seen.has(unique))fail('CONFLICTING_OR_DUPLICATE_SUBJECT');
  seen.add(unique);
  const signature=Buffer.from(packet.signatureBase64,'base64');
  if(signature.length!==64)fail('INVALID_ED25519_SIGNATURE_BYTES');
  let valid=false;
  try{valid=verifySignature(null,ciiA215SignatureMessage(packet.keyId,packet.payload),
   roots.get(packet.keyId),signature);}catch{fail('INVALID_VERIFICATION_KEY');}
  if(!valid)fail('DETACHED_SIGNATURE_MISMATCH');
  signed.push({kind:packet.payload.kind,subjectKey:evidence.subjectKey,zone:evidence.zone,
   keyId:packet.keyId,packetDigestSha256:sha(ciiA215SignatureMessage(packet.keyId,packet.payload)),
   documentSha256:packet.payload.documentSha256,
   cryptographicIntegrityVerified:true,
   ownerApprovedTrustRootVerified:false,
   independentEngineeringRevisionApplicabilityVerified:false,
   physicalNodeIdentityCertified:false,
   disposition:'SIGNED_INTAKE_AWAITING_INDEPENDENT_OWNER_AUTHORITY'});
 }
 const requests=requestRows(revisionLedger,idx).map(req=>{
  const key=req.kind==='ENGINEERING_REVISION'?'EDGE:'+req.sourceElementId+'|'+req.targetElementIds.join('|')
   :req.kind==='SURVEY_NODE_PAIR'?'NODE:'+req.sourceNodeId+'|'+req.targetNodeId
   :'CUSTODY:'+req.targetNodeId;
  return {...req,signedPacketReceived:signed.some(s=>s.subjectKey===key&&s.kind===req.kind),
   authorityAndGlobalClosureEstablished:false,
   status:signed.some(s=>s.subjectKey===key&&s.kind===req.kind)
    ?'SIGNED_INTAKE_REQUIRES_INDEPENDENT_REVIEW':'MISSING_ORIGINALLY_ATTESTED_EVIDENCE'};
 });
 return freeze({
  schema:'CiiArchitectureA215SignedEvidenceIntake.v1',
  status:'INDEPENDENT_ENGINEERING_AUTHORITY_NOT_ESTABLISHED_REVIEW_ONLY',
  provenance:{
   originalSourceSetSha256:provenance.originalSourceSetSha256,
   sourceOriginalSha256:provenance.sourceOriginalSha256,
   originalTargetSha256:provenance.originalTargetSha256,
   sourceA214RevisionCustodyDigest:sha(canonical({
    zones:revisionLedger.zones,custodyConflicts:revisionLedger.custodyConflicts})),
  },
  cryptographicPacketReceipts:signed,
  evidenceRequests:requests,
  summary:{
   externallySignedIntegrityVerifiedPackets:signed.length,
   requiredReviewRequests:requests.length,
   requestsWithoutSignedPackets:requests.filter(x=>!x.signedPacketReceived).length,
   ownerApprovedTrustedSigningKeysVerified:0,
   independentRevisionDocumentsAdmitted:0,
   independentlyCertifiedPhysicalNodePairs:0,
   globalTargetCustodyConflictsResolved:0,
   unresolvedOriginalGlobalElementFactors:33,
  },
  knownLimitations:[
   'CALLER_CONFIGURED_PUBLIC_KEYS_NOT_AN_OWNER_APPROVED_TRUST_STORE',
   'DETACHED_SIGNATURE_ALONE_CANNOT_ESTABLISH_ENGINEERING_REVISION_APPLICABILITY',
   'SIGNED_SURVEY_COORDINATES_NOT_INDEPENDENTLY_VALIDATED_AGAINST_DATUM',
   'S2_TERMINAL_DEGREE_CHANGE_AND_TWO_ENDED_CLOSURE_REMAIN_UNQUALIFIED',
   'NO_PROMOTION_INTO_A205_A203_GLOBAL_CORRESPONDENCE_OR_WRITER',
   'S1_AND_S3_OUTSIDE_THE_A215_S2_REVIEW_SET',
  ],
  certifiedNodeCount:0,certifiedElementCount:0,admittedCandidateCount:0,
  correspondenceCertificates:[],writerReady:false,transferPlan:null,writeScope:null,
 });
}
export function assertCiiA215NoWrite(x){
 if(x?.schema!=='CiiArchitectureA215SignedEvidenceIntake.v1')fail('RECEIPT_SCHEMA_REQUIRED');
 fail('SIGNED_INTAKE_NEVER_WRITER_AUTHORITY');
}
