import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign as edSign} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {originalA214TestInputs} from './cii-architecture-a2-whole-subchain-falsifiers.test.js';
import {reviewCiiA214EngineeringRevisionAndCustody}
 from '../scripts/cii-architecture-a2-revision-custody-adjudicator.mjs';
import {inspectCiiA215ExternalEvidence,ciiA215SignatureMessage,assertCiiA215NoWrite}
 from '../scripts/cii-architecture-a2-external-evidence-intake.mjs';

const basis=reviewCiiA214EngineeringRevisionAndCustody(originalA214TestInputs);
const base=()=>({revisionLedger:basis});
const review=inspectCiiA215ExternalEvidence(base());
assert.equal(review.schema,'CiiArchitectureA215SignedEvidenceIntake.v1');
assert.equal(review.status,'INDEPENDENT_ENGINEERING_AUTHORITY_NOT_ESTABLISHED_REVIEW_ONLY');
assert.equal(review.certifiedNodeCount,0);
assert.equal(review.certifiedElementCount,0);
assert.equal(review.admittedCandidateCount,0);
assert.deepEqual(review.correspondenceCertificates,[]);
assert.equal(review.writerReady,false);
assert.equal(review.writeScope,null);
assert.equal(review.transferPlan,null);
assert.equal(review.summary.externallySignedIntegrityVerifiedPackets,0);
assert.equal(review.summary.ownerApprovedTrustedSigningKeysVerified,0);
assert.equal(review.summary.unresolvedOriginalGlobalElementFactors,33);
assert.equal(review.summary.globalTargetCustodyConflictsResolved,0);
assert.equal(review.summary.requiredReviewRequests,9);
assert.equal(review.summary.requestsWithoutSignedPackets,9);
assert.deepEqual(review.evidenceRequests.map(x=>x.kind).sort(),[
 'ENGINEERING_REVISION','ENGINEERING_REVISION','ENGINEERING_REVISION',
 'SURVEY_NODE_PAIR','SURVEY_NODE_PAIR','SURVEY_NODE_PAIR','SURVEY_NODE_PAIR',
 'TARGET_CUSTODY_DECISION','TARGET_CUSTODY_DECISION'
].sort());
assert(review.evidenceRequests.some(x=>x.kind==='ENGINEERING_REVISION'
 &&x.sourceElementId==='E43:620->630'
 &&JSON.stringify(x.targetElementIds)===JSON.stringify(['E1017:10460->10470'])));
assert(review.evidenceRequests.some(x=>x.kind==='ENGINEERING_REVISION'
 &&x.sourceElementId==='E11:210->220'
 &&JSON.stringify(x.targetElementIds)===JSON.stringify(['E983:10130->10140'])));
assert(review.evidenceRequests.some(x=>x.kind==='ENGINEERING_REVISION'
 &&x.sourceElementId==='E1:40->50'
 &&JSON.stringify(x.targetElementIds)===JSON.stringify([
   'E1425:40030->40035','E1426:40035->40040'
 ])));
assert.deepEqual(review.evidenceRequests.filter(x=>x.kind==='SURVEY_NODE_PAIR')
 .map(x=>[x.sourceNodeId,x.targetNodeId]).sort(),[
  ['40','40030'],['210','10130'],['630','10470'],['669','10500']
 ].sort());
assert.deepEqual(review.evidenceRequests.filter(x=>x.kind==='TARGET_CUSTODY_DECISION')
 .map(x=>x.targetNodeId),['10170','40060']);
assert(Object.isFrozen(review));
assert(Object.isFrozen(review.evidenceRequests));
assert.equal(JSON.stringify(inspectCiiA215ExternalEvidence(base())),JSON.stringify(review));
assert.throws(()=>assertCiiA215NoWrite(review),/SIGNED_INTAKE_NEVER_WRITER_AUTHORITY/);

const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pub=publicKey.export({type:'spki',format:'pem'}).toString();
const keyId='SYNTHETIC_NON_OWNER_KEY_1';
const keyring=[{keyId,publicKeyPem:pub}];
const h=x=>createHash('sha256').update(x).digest('hex');
const pack=(kind,subject,doc='SYNTHETIC_EXTERNAL_DOCUMENT_NOT_OWNER_APPROVED')=>{
 const payload={
  schema:'CiiA215ExternalEvidencePacket.v1',kind,sourceId:'S2',
  sourceOriginalSha256:basis.provenance.sourceOriginalSha256,
  targetOriginalSha256:basis.provenance.originalTargetSha256,
  documentSha256:h(Buffer.from(doc,'utf8')),subject,
 };
 const signatureBase64=edSign(null,ciiA215SignatureMessage(keyId,payload),privateKey)
  .toString('base64');
 return {keyId,payload,documentText:doc,signatureBase64};
};
const bendSubject={
 sourceElementId:'E43:620->630',targetElementIds:['E1017:10460->10470'],
 sourceRecordedLengthMm:774.55,targetRecordedLengthMm:574.55,
 unit:'mm',revisionId:'MOCK-BEND-REV-200',
};
const bendPacket=pack('ENGINEERING_REVISION',bendSubject,'SYNTHETIC BEND REVISION');
const accepted=inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[bendPacket]});
assert.equal(accepted.cryptographicPacketReceipts.length,1);
assert.equal(accepted.cryptographicPacketReceipts[0].cryptographicIntegrityVerified,true);
assert.equal(accepted.cryptographicPacketReceipts[0].ownerApprovedTrustRootVerified,false);
assert.equal(accepted.cryptographicPacketReceipts[0].independentEngineeringRevisionApplicabilityVerified,false);
assert.equal(accepted.summary.ownerApprovedTrustedSigningKeysVerified,0);
assert.equal(accepted.summary.independentRevisionDocumentsAdmitted,0);
assert.equal(accepted.summary.requiredReviewRequests,9);
assert.equal(accepted.summary.requestsWithoutSignedPackets,8);
assert.equal(accepted.certifiedNodeCount,0);
assert.equal(accepted.writerReady,false);
const signed200=accepted.evidenceRequests.find(x=>x.sourceElementId==='E43:620->630');
assert.equal(signed200.status,'SIGNED_INTAKE_REQUIRES_INDEPENDENT_REVIEW');
assert.equal(signed200.authorityAndGlobalClosureEstablished,false);

const sPos=originalA214TestInputs.sourceGraph.nodes.find(x=>String(x.id)==='630').position;
const tPos=originalA214TestInputs.targetGraph.nodes.find(x=>String(x.id)==='10470').position;
const p=x=>Array.isArray(x)?x:[x.x,x.y,x.z];
const survey=pack('SURVEY_NODE_PAIR',{
 sourceNodeId:'630',targetNodeId:'10470',surveyId:'MOCK-SURVEY-630',
 datum:'UNATTESTED-SYNTHETIC-DATUM',
 surveyedSourceCoordinatesMm:p(sPos),surveyedTargetCoordinatesMm:p(tPos),
},'UNTRUSTED SURVEY DOCUMENT');
const custody=pack('TARGET_CUSTODY_DECISION',{
 targetNodeId:'40060',winnerSourceNodeKey:'S2:50',
 loserSourceNodeKeys:['S2:90'],decisionId:'MOCK-CUSTODY-T40060'
},'UNTRUSTED CUSTODY DECISION');
const multiple=inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[custody,survey,bendPacket]});
assert.equal(multiple.summary.externallySignedIntegrityVerifiedPackets,3);
assert.equal(multiple.summary.requestsWithoutSignedPackets,6);
assert.equal(multiple.summary.globalTargetCustodyConflictsResolved,0);
assert.equal(multiple.certifiedNodeCount,0);
assert.equal(multiple.writerReady,false);
assert.equal(multiple.cryptographicPacketReceipts.filter(x=>x.ownerApprovedTrustRootVerified).length,0);

const mock=structuredClone;
const changes=[
 [{...bendPacket,documentText:'MODIFIED BEND REVISION'},/DOCUMENT_BYTES_DIGEST_MISMATCH/],
 [{...bendPacket,signatureBase64:Buffer.alloc(64,3).toString('base64')},/DETACHED_SIGNATURE_MISMATCH/],
 [{...bendPacket,payload:{...bendPacket.payload,sourceOriginalSha256:'0'.repeat(64)}},
  /INVALID_STALE_OR_UNTRUSTED_PACKET_BASIS/],
 [{...bendPacket,payload:{...bendPacket.payload,targetOriginalSha256:'0'.repeat(64)}},
  /INVALID_STALE_OR_UNTRUSTED_PACKET_BASIS/],
 [{...bendPacket,payload:{...bendPacket.payload,kind:'UNSUPPORTED_WRITER_APPLY'}},
  /INVALID_STALE_OR_UNTRUSTED_PACKET_BASIS/],
 [{...bendPacket,payload:{...bendPacket.payload,ownerApproved:true}},
  /INVALID_STALE_OR_UNTRUSTED_PACKET_BASIS/],
 [{...bendPacket,publicKeyPem:pub},/INVALID_EVIDENCE_ENVELOPE/],
 [{...bendPacket,keyId:'EMBEDDED_ATTACKER_KEY'},/SIGNER_NOT_IN_INDEPENDENT_KEY_SET/],
 [{...bendPacket,signatureBase64:'not-base64!'},/INVALID_EVIDENCE_ENVELOPE/],
];
for(const [packet,error] of changes)
 assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
  verificationKeys:keyring,packets:[packet]}),error);
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[bendPacket,bendPacket]}),
 /CONFLICTING_OR_DUPLICATE_SUBJECT/);
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:[],packets:[bendPacket]}),/SIGNER_NOT_IN_INDEPENDENT_KEY_SET/);
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:[{keyId,publicKeyPem:'INVALID'}],packets:[bendPacket]}),
 /INVALID_TRUST_ROOT/);
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:[...keyring,...keyring],packets:[bendPacket]}),
 /INVALID_TRUST_ROOT/);
const another=generateKeyPairSync('ed25519');
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:[{keyId,publicKeyPem:another.publicKey.export({format:'pem',type:'spki'}).toString()}],
 packets:[bendPacket]}),/DETACHED_SIGNATURE_MISMATCH/);
const revisedLength=pack('ENGINEERING_REVISION',{
 ...bendSubject,targetRecordedLengthMm:774.55},'SYNTHETIC BEND WITH FALSE LENGTH');
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[revisedLength]}),
 /ENGINEERING_REVISION_PHYSICAL_PAIR_NOT_REPRODUCED/);
const revisedPair=pack('ENGINEERING_REVISION',{
 ...bendSubject,targetElementIds:['E983:10130->10140']},
 'SYNTHETIC CROSS PAIR');
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[revisedPair]}),
 /ENGINEERING_REVISION_PHYSICAL_PAIR_NOT_REPRODUCED/);
const revisedUnit=pack('ENGINEERING_REVISION',{
 ...bendSubject,unit:'m'},'SYNTHETIC UNIT SUBSTITUTION');
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[revisedUnit]}),
 /INVALID_ENGINEERING_REVISION_SUBJECT/);
const forgedSurvey=pack('SURVEY_NODE_PAIR',{
 ...survey.payload.subject,targetNodeId:'10480'},'WRONG SURVEY PHYSICAL NODE');
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[forgedSurvey]}),
 /SURVEY_PAIR_NOT_IN_ORIGINAL_CANDIDATE_SET/);
const forgedCustody=pack('TARGET_CUSTODY_DECISION',{
 ...custody.payload.subject,winnerSourceNodeKey:'S2:90',
 loserSourceNodeKeys:['S2:220']},'WRONG CUSTODY SIBLING');
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[forgedCustody]}),
 /CUSTODY_DECISION_MISSING_OR_NOT_EXCLUSIVE/);
const huge=pack('ENGINEERING_REVISION',bendSubject,'A'.repeat(8200));
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),
 verificationKeys:keyring,packets:[huge]}),
 /INVALID_EVIDENCE_ENVELOPE/);
assert.throws(()=>inspectCiiA215ExternalEvidence({...base(),packets:Array(51).fill(bendPacket)}),
 /PACKET_BUDGET_EXCEEDED/);
const fakeReview=mock(basis);
fakeReview.certifiedNodeCount=1;
assert.throws(()=>inspectCiiA215ExternalEvidence({revisionLedger:fakeReview}),
 /A214_UNQUALIFIED_ORIGINAL_REVIEW_REQUIRED/);
const staleReview=mock(basis);
staleReview.provenance.originalTargetSha256='unverified';
assert.throws(()=>inspectCiiA215ExternalEvidence({revisionLedger:staleReview}),
 /A214_UNQUALIFIED_ORIGINAL_REVIEW_REQUIRED/);

const report={
 schema:review.schema,status:review.status,
 provenance:review.provenance,
 summary:review.summary,
 evidenceRequests:review.evidenceRequests,
 realOriginalSourceRevisionBasis:review.evidenceRequests.filter(x=>x.kind==='ENGINEERING_REVISION'),
 globalTargetCustodyConflicts:review.evidenceRequests.filter(x=>x.kind==='TARGET_CUSTODY_DECISION'),
 trustedExternalDocumentsProvided:0,
 certifiedNodeCount:0,certifiedElementCount:0,writerReady:false,
};
const filename=process.argv.find(a=>a.startsWith('--out='))?.slice(6);
if(filename){
 const file=resolve(filename);
 if(file.replaceAll('\\','/').includes('/Benchmark/'))throw Error('A215_BENCHMARK_WRITE_FORBIDDEN');
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(report,null,2),'utf8');
 assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),report);
}
console.log('A2_15_REQUIRED_OWNER_ENGINEERING_INPUT',JSON.stringify({
 required:review.evidenceRequests.map(x=>({kind:x.kind,zone:x.zone||null,
  source:x.sourceElementId||x.sourceNodeId||null,
  target:x.targetElementIds||x.targetNodeId||null,
  custodyTarget:x.kind==='TARGET_CUSTODY_DECISION'?x.targetNodeId:null})),
 signingPositiveTests:3,signedInputGrantedAuthority:0,
 missingOriginalOwnerEvidence:review.summary.requestsWithoutSignedPackets,
 certifiedNodeCount:0,writerReady:false,
}));
console.log('PASS A2-15: original SOURCE/TARGET physical revision, survey and custody evidence requests, detached signed packet negative controls, zero Writer');
