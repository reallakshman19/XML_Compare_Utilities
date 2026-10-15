/**
 * Owner Phase2 exact retained S1/S2/S3/T diagnostic.
 * NEVER imports expected labels into a matcher or turns lexical agreement or
 * legacy identityBound into globally validated physical correspondence.
 * Independent physical proof and SOURCE-member occurrence adjudication are
 * mandatory before publishing P2_VALIDATED_RECALL.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiWriter2SourceSetPreviewFromPreparedSession} from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {buildCiiSourceTargetAudit} from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';

const files=['S1.CII','S2.CII','S3.CII'].map((fileName,i)=>({
  sourceId:'S'+(i+1),fileName,bytes:readFileSync(new URL('../Benchmark/'+fileName,import.meta.url)),
}));
const targetBytes=readFileSync(new URL('../Benchmark/T.CII',import.meta.url));
const raw=readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-manifest.json',import.meta.url),'utf8'));
assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.originalUploadSha256);
const originals=raw.toString('utf8').split(/\r?\n/).map((line,index)=>({line,index})).filter(x=>/^(PS\S+)\s+(SL\S+)\s*$/.test(x.line.trim())).map(({line,index},i)=>{
  const match=line.trim().match(/^(PS\S+)\s+(SL\S+)$/);
  return {ordinal:i+1,originalLine:index+1,rawSourceLabel:match[1],rawTargetLabel:match[2]};
});
assert.equal(originals.length,428);
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge({
  sources:files,targetBytes,targetFileName:'T.CII',
},{cryptoRef:globalThis.crypto||webcrypto});
const loops={};const choices=[];
for(const member of inspection.memberInspections){
  const choice=ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions||[]);
  choices.push({sourceId:member.sourceId,status:choice.status,confidence:choice.confidence||null,basisMethod:choice.basisMethod||null});
  if(choice.status==='READY')loops[member.sourceId]=choice.baseLoops;
}
const preview=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,{
  baseLoopsBySource:loops,
},{cryptoRef:globalThis.crypto||webcrypto,pathTotalLengthToleranceMm:100});
const audit=buildCiiSourceTargetAudit(preview);
const sourceByLabel=new Map(),targetByLabel=new Map();
for(const row of audit.rows){
  const name=String(row.sourceNodeName||'');
  if(!name)continue;
  if(!sourceByLabel.has(name))sourceByLabel.set(name,[]);
  sourceByLabel.get(name).push(row);
}
for(const node of preparedSession.target.targetGraph.nodes){
  const name=String(node.nodeName||'');
  if(!name)continue;
  if(!targetByLabel.has(name))targetByLabel.set(name,[]);
  targetByLabel.get(name).push(node);
}
const usedPhysicalSourceKeys=new Map();
const diagnostics=originals.map(o=>{
  const src=sourceByLabel.get(o.rawSourceLabel)||[];
  const tgt=targetByLabel.get(o.rawTargetLabel)||[];
  const targetIds=new Set(tgt.map(n=>String(n.id)));
  const legacyHits=src.filter(s=>s.identityBound===true && (s.targetNodeIds||[]).some(t=>targetIds.has(String(t))));
  const uniquelyAttributed=src.length===1 && tgt.length===1;
  const observedNameAndLegacyBound=legacyHits.length>0;
  if(observedNameAndLegacyBound)for(const s of legacyHits){
    const key=String(s.rowKey);
    if(!usedPhysicalSourceKeys.has(key))usedPhysicalSourceKeys.set(key,[]);
    usedPhysicalSourceKeys.get(key).push(o.ordinal);
  }
  const discrepancy=src.length===0?'SOURCE_LEXICAL_LABEL_ABSENT'
    :tgt.length===0?'TARGET_LEXICAL_LABEL_ABSENT'
    :src.length>1?'SOURCE_LEXICAL_LABEL_REUSED'
    :tgt.length>1?'TARGET_LEXICAL_LABEL_REUSED'
    :observedNameAndLegacyBound?'LEGACY_BOUND_AND_LABEL_AGREEMENT_NOT_VALIDATED'
    :'NO_LEGACY_BINDING_TO_EXPECTED_LABEL';
  return Object.freeze({...o,sourceMemberCandidates:[...new Set(src.map(s=>s.sourceId))],
    sourcePhysicalNodeCandidates:src.map(s=>s.rowKey),
    targetPhysicalNodeCandidates:tgt.map(n=>String(n.id)),
    sourceCandidateCount:src.length,targetCandidateCount:tgt.length,
    uniquelyAttributed,legacyBoundAndLabelAgreement:observedNameAndLegacyBound,
    observedTargetIds:src.flatMap(s=>s.targetNodeIds||[]),discrepancy,
    physicalValidationTier:'INDEPENDENT_GLOBAL_PROOF_NOT_PERFORMED',
    verifiedPhysicalCorrespondence:false});
});
const count=(fn)=>diagnostics.filter(fn).length;
const missingSource=count(r=>r.sourceCandidateCount===0);
const missingTarget=count(r=>r.targetCandidateCount===0);
const presentBoth=count(r=>r.sourceCandidateCount>0&&r.targetCandidateCount>0);
const agreement=count(r=>r.legacyBoundAndLabelAgreement);
const manyRows=[...usedPhysicalSourceKeys.entries()].filter(([,ids])=>ids.length>1).map(([key,ids])=>({sourceKey:key,ownerOrdinals:ids}));
const report={
  schema:'CiiPhase2OwnerBenchmarkDiagnostic.v1',
  status:'NOT_EVALUABLE_INDEPENDENT_GLOBAL_PHYSICAL_CERTIFICATION_MISSING',
  originalOwnerInputSha256:manifest.originalUploadSha256,
  originalBenchmarkRows:428,requiredValidatedRows:300,targetValidatedRecall:0.70,
  sourceSetOriginalSha256:inspection.sourceSet.sourceSetSha256,
  targetOriginalSha256:inspection.versionBridge.target.originalSha256,
  sourcePhysicalNodeCensus:audit.summary.totalSourceNodes,
  sourcePhysicalNodePerMember:audit.summary.bySource.map(r=>({sourceId:r.sourceId,nodeCount:r.enumeratedNodeCount,bound:r.BOUND,ambiguous:r.AMBIGUOUS,unresolved:r.UNRESOLVED,unemitted:r.UNEMITTED})),
  targetPhysicalNodeCensus:preparedSession.target.targetGraph.nodes.length,
  autoChoices:choices,
  physicalCandidateCorrespondenceStatus:preview.correspondence.status,
  observedLegacyBoundWithNameAgreement:agreement,
  observedLegacyAgreementFractionOfOwnerInput:agreement/428,
  rowsWithSourceLabelFound:428-missingSource,rowsWithTargetLabelFound:428-missingTarget,
  rowsWithBothLabelsFound:presentBoth,
  rowsMissingSourceLabel:missingSource,rowsMissingTargetLabel:missingTarget,
  rowsUniquelyAttributedByLabels:count(r=>r.uniquelyAttributed),
  sourcePhysicalNodesWithRepeatedLegacyOwnerCredits:manyRows,
  independentGlobalPhysicalValidatedCount:null,
  P2_VALIDATED_RECALL:null,
  Phase2ThresholdMet:null,
  physicallyValidatedCreditingRule:'NO NAME-ONLY, NO LEGACY IDENTITYBOUND; requires full original physical source-member and global target custody proof and independent falsifiers',
  note:'The uploaded owner labels are unpartitioned by S1/S2/S3 and may encode repeated group relations. 428 lexical records are not automatically 428 distinct physical source-node obligations. Do not infer a 70% physical benchmark success or failure from lexical diagnostics alone.',
};
const root=new URL('../test-results/cii-phase2/',import.meta.url);
mkdirSync(root,{recursive:true});
writeFileSync(new URL('phase2-owner-diagnostic.json',root),JSON.stringify({report,rows:diagnostics},null,2)+'\n');
const keys=['ordinal','originalLine','rawSourceLabel','rawTargetLabel','sourceMemberCandidates','sourcePhysicalNodeCandidates','targetPhysicalNodeCandidates','sourceCandidateCount','targetCandidateCount','uniquelyAttributed','legacyBoundAndLabelAgreement','discrepancy','physicalValidationTier'];
const csv=v=>'"'+String(Array.isArray(v)?JSON.stringify(v):v??'').replace(/"/g,'""')+'"';
writeFileSync(new URL('phase2-owner-diagnostic.csv',root),[keys.join(','),...diagnostics.map(row=>keys.map(k=>csv(row[k])).join(','))].join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
console.log('PHASE2_OWNER_DIAGNOSTIC_COMPLETE: 428 rows accounted; validated physical recall NOT_EVALUABLE until independent physical proof');
