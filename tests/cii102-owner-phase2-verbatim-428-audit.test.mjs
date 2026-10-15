import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {parseIndependentNodeNameState}
  from './cii-workspace-multisource-texpected-oracle.js';
import {reconcileCiiOwnerLexicalGolden,CII_OWNER_GOLDEN_STATUS}
  from './cii-workspace-owner-lexical-golden.js';

/**
 * Exact OWNER source text and lexical census only. This test MUST NOT
 * mutate CII, infer 428 physical identities, use expected SL labels for
 * correspondence candidate generation or silently repair anomalies.
 */
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(readFileSync(join(root,
  'tests/qualification/owner-phase2-20261015-intake-manifest.json'),'utf8'));
const raw=readFileSync(join(root,manifest.rawRelativePath));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(raw),manifest.rawUtf8Sha256,'verbatim Owner input must not change');
assert.equal(raw.length,manifest.rawUtf8ByteCount);
assert.equal(manifest.declaredLiteralRelationRows,428);
assert.equal(manifest.rawLineCount,436);
assert.equal(manifest.allowProductionCandidateGeneration,false);
const original=new TextDecoder('utf-8',{fatal:true}).decode(raw);
const physicalLines=original.split('\n');
assert.equal(physicalLines.length,436);
const literalRows=[];
for(let i=0;i<physicalLines.length;i++){
  const line=physicalLines[i];
  const match=line.match(/^\s*(PS\S+)[\u00a0 \t]+(SL\S+)\s*$/u);
  if(match)literalRows.push(Object.freeze({
    ordinal:literalRows.length+1,physicalLine:i+1,
    originalLine:line,sourceLabel:match[1],targetLabel:match[2],
  }));
  else if(line.trim()&&i>6)
    throw Error('CII102_UNKNOWN_OWNER_GOLDEN_ROW:'+String(i+1));
}
assert.equal(literalRows.length,428);
const count=(items,x)=>items.filter(x).length;
const srcGroups=new Map(),tgtGroups=new Map(),tupleSet=new Set();
for(const row of literalRows){
  if(!srcGroups.has(row.sourceLabel))srcGroups.set(row.sourceLabel,[]);
  srcGroups.get(row.sourceLabel).push(row);
  if(!tgtGroups.has(row.targetLabel))tgtGroups.set(row.targetLabel,[]);
  tgtGroups.get(row.targetLabel).push(row);
  assert(!tupleSet.has(row.sourceLabel+'\u0000'+row.targetLabel),
    'identical Owner relationship row must be retained but separately reported');
  tupleSet.add(row.sourceLabel+'\u0000'+row.targetLabel);
}
assert.equal(srcGroups.size,350);
assert.equal(tgtGroups.size,428);
assert.equal(srcGroups.get('PS02687.1').length,78);
assert.equal(srcGroups.get('PS02694.1').length,2);
const exceptions=literalRows.filter(r=>!/^SL-\d+\.\d+$/.test(r.targetLabel));
assert.deepEqual(exceptions.map(r=>r.targetLabel),
  ['SL-263..5','SL-265..4','SL-275-A.8']);
const expectedOriginal=Object.freeze({
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const sourceRows=[],targetRows=[];
const perMember={};
for(const member of ['S1','S2','S3','T']){
 const originalBytes=readFileSync(join(root,'Benchmark',member+'.CII'));
 assert.equal(sha(originalBytes),expectedOriginal[member],
   'original CII SHA must be frozen: '+member);
 const parsed=parseIndependentNodeNameState(originalBytes.toString('latin1'));
 assert.deepEqual(parsed.conflicts,[],member+' conflicting original raw NODE names');
 const physicalNodeIds=[...new Set(parsed.elements.flatMap(e=>[e.from,e.to]))];
 perMember[member]={physicalNodes:physicalNodeIds.length,
   originalNamedPhysicalNodes:physicalNodeIds.filter(n=>Boolean(parsed.names.get(n))).length};
 for(const id of physicalNodeIds){
   const name=parsed.names.get(id)||'';
   if(member==='T')targetRows.push(Object.freeze({id,nodeName:name}));
   else sourceRows.push(Object.freeze({rowKey:member+':'+id,sourceId:member,
     sourceNodeId:id,sourceNodeName:name,
     identityBound:false,targetNodeIds:[],confidence:'UNVERIFIED_ORIGINAL_CUSTODY'}));
 }
}
assert.equal(sourceRows.length,150);
assert.equal(targetRows.length,1619);
const srcIndex=new Map(),targetIndex=new Map();
for(const row of sourceRows){if(!row.sourceNodeName)continue;
  if(!srcIndex.has(row.sourceNodeName))srcIndex.set(row.sourceNodeName,[]);
  srcIndex.get(row.sourceNodeName).push(row.rowKey);
}
for(const row of targetRows){if(!row.nodeName)continue;
  if(!targetIndex.has(row.nodeName))targetIndex.set(row.nodeName,[]);
  targetIndex.get(row.nodeName).push(row.id);
}
const diagnosticRows=literalRows.map(r=>Object.freeze({
  ordinal:r.ordinal,physicalLine:r.physicalLine,
  sourceLabel:r.sourceLabel,targetLabel:r.targetLabel,
  candidateSourcePhysicalNodeKeys:Object.freeze([...(srcIndex.get(r.sourceLabel)||[])]),
  candidateTargetPhysicalNodeIds:Object.freeze([...(targetIndex.get(r.targetLabel)||[])]),
  ownerSourceMember:'NOT_SUPPLIED',
  invalidPunctuation:!/^SL-\d+\.\d+$/.test(r.targetLabel),
  repeatedSourceLabel:(srcGroups.get(r.sourceLabel)||[]).length>1,
  physicalIdentityCertified:false,
  status:'TEST_ONLY_OWNER_RELATION_NOT_PHYSICALLY_CERTIFIED',
}));
const presentSource=count(diagnosticRows,r=>r.candidateSourcePhysicalNodeKeys.length>0);
const presentTarget=count(diagnosticRows,r=>r.candidateTargetPhysicalNodeIds.length>0);
const coPresent=count(diagnosticRows,r=>r.candidateSourcePhysicalNodeKeys.length>0
 &&r.candidateTargetPhysicalNodeIds.length>0);
assert.equal(presentSource,0,
  'Original SOURCE lexical namespace unexpectedly changed; do not infer correspondence');
assert.equal(presentTarget,68,
  'Original TARGET lexical baseline drift; update only through independent analysis');
assert.equal(coPresent,0);
const DERIVED_PREFIX='TEST_ONLY_DERIVED_FROM_VERBATIM_NOT_NEW_OWNER_AUTHORITY';
const transformed=literalRows.map(r=>r.sourceLabel+' → '+r.targetLabel).join('\n')+'\n';
const derivedBytes=Buffer.from(transformed,'utf8');
const lexical=reconcileCiiOwnerLexicalGolden({
  goldenBytes:derivedBytes,declaredSha256:sha(derivedBytes),
  declaredRowCount:literalRows.length,
  ownerEvidenceRef:manifest.sourceProvenance,
  sourceRows,targetNodes:targetRows,
  sourceSetSha256:'5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3',
  requiredSourceSetSha256:'5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3',
  targetOriginalSha256:expectedOriginal.T,requiredTargetOriginalSha256:expectedOriginal.T,
});
assert.equal(lexical.observedRowCount,428);
assert.equal(lexical.status,CII_OWNER_GOLDEN_STATUS.EXCEPTIONS);
assert.equal(lexical.summary.MISSING,428,
  'all PS source labels absent from original S1/S2/S3 physical census');
assert.equal(lexical.summary.MATCHED,0);
assert.equal(lexical.canAuthorizeWriter2,false);
assert.equal(lexical.ownerAccepted,false);
assert(lexical.rows.every(r=>r.ownerAdjudicationRequired===false||
  r.lexicalAnomalies.length>0||r.disposition==='AMBIGUOUS'));
const report=Object.freeze({
 schema:'Cii102OwnerPhase2Verbatim428Baseline.v1',
 state:'OWNER_TEXT_RECEIVED_LEXICAL_NAMESPACE_MISMATCH_NO_PHYSICAL_RECALL_SCORE',
 authority:DERIVED_PREFIX,
 input:{rawSha256:manifest.rawUtf8Sha256,rawBytes:raw.byteLength,
  rawLineCount:manifest.rawLineCount,relations:literalRows.length,
  distinctSourceLabels:srcGroups.size,distinctTargetLabels:tgtGroups.size,
  ownerIssueComment:manifest.sourceProvenance},
 originalCii:expectedOriginal,perMember,
 labelChecks:{ownerRowsWithExactSourceNameInPhysicalCii:presentSource,
  ownerRowsWithExactTargetNameInPhysicalCii:presentTarget,
  ownerRowsWithBothExactNamesInPhysicalCii:coPresent,
  missingSourceLabelRows:literalRows.length-presentSource,
  missingTargetLabelRows:literalRows.length-presentTarget,
  sourceMemberAttributionMissingRows:literalRows.length,
  repeatedSourceLabelRows:literalRows.filter(r=>r.repeatedSourceLabel).length,
  repeatedSourceLabelGroups:[{label:'PS02687.1',rows:78},{label:'PS02694.1',rows:2}],
  punctuationAnomalies:exceptions.map(r=>({ordinal:r.ordinal,line:r.physicalLine,label:r.targetLabel}))},
 derivedIndependentStrictGoldenParser:{status:lexical.status,
   summary:lexical.summary,
   rawSha256OfCanonicalizedDerivedTestInput:sha(derivedBytes),
   warning:'Derived canonical input is test-only; it is NOT the 15633-byte Owner source file'},
 acceptance:{ownerRelationsNowAvailable:true,
   candidateSourcePhysicalNodeCrosswalkAvailable:false,
   denominatorOriginalOwnerRows:literalRows.length,
   independentlyGloballyPhysicallyValidatedRelations:0,
   validatedRecallPercentage:null,
   thresholdReached:'NOT_EVALUABLE_NO_PHYSICAL_CROSSWALK',
   originalOwnerHighMediumPreference:'SOME_HIGH_SOME_MEDIUM_NOT_ALL_HIGH',
   writerReady:false,transferOperationsAdded:0,releaseAuthorized:false},
 rows:diagnosticRows,
});
const dir=join(root,'test-results','cii-method-a-qualification');
mkdirSync(dir,{recursive:true});
writeFileSync(join(dir,'owner-phase2-428-current-custody-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log('CII102_OWNER_428_VERBATIM_CUSTODY_AUDIT_PASS',JSON.stringify({
  originalSha256:manifest.rawUtf8Sha256,
  originalBytes:raw.length,ownerRelations:literalRows.length,
  distinctSourceLabels:srcGroups.size,distinctTargetLabels:tgtGroups.size,
  originalSourcesNamed:sourceRows.filter(r=>r.sourceNodeName).length,
  originalTargetNamed:targetRows.filter(r=>r.nodeName).length,
  rowsWithSourceExactName:presentSource,rowsWithTargetExactName:presentTarget,
  anomalousPunctuationRows:exceptions.length,
  repeatedPS02687Rows:78,
  independentlyValidatedRelations:0,
  validatedRecallPct:null,
  status:report.state,writerReady:false,
}));
