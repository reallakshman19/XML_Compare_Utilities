/**
 * Issue #106: independently verify that SOURCE = the cumulative S1 + S2 + S3
 * member-scoped physical NODE population, NOT any single member and NOT
 * a single shared numeric NODE-ID namespace. Never feed golden into matcher.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildCiiOwnerOriginalNodeNameIndexes,resolveCiiOwnerPhase2RowsByOriginalNodeName}
 from './cii-workspace-phase2-owner-nodename-index.js';
const members=['S1','S2','S3'].map((sourceId,i)=>({
  sourceId,fileName:sourceId+'.CII',
  bytes:readFileSync(new URL('../Benchmark/'+sourceId+'.CII',import.meta.url)),
}));
const targetBytes=readFileSync(new URL('../Benchmark/T.CII',import.meta.url));
const rawOwner=readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-manifest.json',import.meta.url)));
const confirmation=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-confirmed-direction.json',import.meta.url)));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(rawOwner),manifest.originalUploadSha256);
assert.equal(confirmation.ownerConfirmedDirection,true);
const originals=rawOwner.toString('utf8').split(/\r?\n/).map((t,index)=>({t,index}))
 .filter(x=>/^(PS\S+)\s+(SL\S+)\s*$/.test(x.t.trim()))
 .map(({t,index},i)=>{
   const [,ps,sl]=t.trim().match(/^(PS\S+)\s+(SL\S+)$/);
   return {ordinal:i+1,originalLine:index+1,rawSourceLabel:ps,rawTargetLabel:sl};
 });
assert.equal(originals.length,428);
const indexes=buildCiiOwnerOriginalNodeNameIndexes(members,targetBytes);
const resolved=resolveCiiOwnerPhase2RowsByOriginalNodeName(originals,indexes,{
  ownerConfirmedSlSourceToPsTarget:true,
});
assert.equal(resolved.ownerDirectionReinterpretationAuthorized,true);
const sourceSetMemberCounts=indexes.sourceStats.map(s=>s.physicalNodeCount);
const sourceSetPopulation=sourceSetMemberCounts.reduce((sum,n)=>sum+n,0);
assert.deepEqual(sourceSetMemberCounts,[57,47,46]);
assert.equal(sourceSetPopulation,150);
assert.equal(indexes.targetStats.physicalNodeCount,1619);
const perMember=members.map((member,i)=>{
 const id=member.sourceId,stats=indexes.sourceStats[i];
 const sourcePhysicalNodes=new Set([...indexes.sourceByName.values()]
   .flatMap(rows=>rows.filter(x=>x.sourceId===id).map(x=>x.nodeId)));
 const memberMatches=resolved.rows.filter(r=>r.transposedDiagnostic.sourceMembers.includes(id));
 const exactNameSourcePairs=resolved.rows.flatMap(r=>r.transposedDiagnostic.candidatePairs
   .filter(p=>p.sourceMemberId===id&&r.transposedDiagnostic.uniquePhysicalPair)
   .map(p=>({ordinal:r.ownerOrdinal,sourceNodeName:p.sourceNodeName,
     sourcePhysicalNodeId:p.sourcePhysicalNodeId,
     targetNodeName:p.targetNodeName,targetPhysicalNodeId:p.targetPhysicalNodeId})));
 const uniqueSourceNameKeys=new Set(memberMatches.flatMap(r=>r.transposedDiagnostic.candidatePairs
   .filter(p=>p.sourceMemberId===id).map(p=>p.sourceNodeName)));
 const row={
  sourceId:id,originalPath:'Benchmark/'+member.fileName,originalSha256:hash(member.bytes),
  physicalNodeCount:stats.physicalNodeCount,namedPhysicalNodeCount:stats.namedPhysicalNodeCount,
  ownerSourceSlRowsWithMemberOccurrence:memberMatches.length,
  ownerSourceSlNameCount:uniqueSourceNameKeys.size,
  independentlyLocatableOwnerPhysicalPairs:exactNameSourcePairs.length,
  exactOwnerPairs:exactNameSourcePairs,
 };
 assert.equal(sourcePhysicalNodes.size,stats.namedPhysicalNodeCount);
 return row;
});
const sourceOccurrences=resolved.rows.filter(r=>r.transposedDiagnostic.sourceLookupCount>0);
const targetOccurrences=resolved.rows.filter(r=>r.transposedDiagnostic.targetLookupCount>0);
const both=resolved.rows.filter(r=>r.transposedDiagnostic.sourceLookupCount>0&&r.transposedDiagnostic.targetLookupCount>0);
const unique=resolved.rows.filter(r=>r.transposedDiagnostic.uniquePhysicalPair);
assert.equal(sourceOccurrences.length,46);
assert.equal(targetOccurrences.length,106);
assert.equal(both.length,33);
assert.equal(unique.length,33);
assert.deepEqual(perMember.map(x=>x.ownerSourceSlRowsWithMemberOccurrence),[1,24,21]);
assert.deepEqual(perMember.map(x=>x.independentlyLocatableOwnerPhysicalPairs),[0,19,14]);
// Crucially: one member's numeric NODE ID is NEVER considered equal to
// another member's same numeric NODE ID. SOURCE identity = (member,NODE).
const allNamedSourcePhysicalKeys=new Set([...indexes.sourceByName.values()]
 .flatMap(rows=>rows.map(x=>x.sourceId+':'+x.nodeId)));
assert.equal(allNamedSourcePhysicalKeys.size,104);
const nameCollisions=[...indexes.sourceByName].filter(([,rows])=>rows.length>1)
 .map(([nodeName,rows])=>({nodeName,physicalMemberIds:rows.map(x=>x.sourceId+':'+x.nodeId)}));
const idToMembers=new Map();
for(const member of perMember) {
 const src=member.sourceId;
 for(const rows of indexes.sourceByName.values())for(const x of rows)if(x.sourceId===src){
  if(!idToMembers.has(x.nodeId))idToMembers.set(x.nodeId,new Set());
  idToMembers.get(x.nodeId).add(src);
 }
}
const repeatedNumericIdAcrossMembers=[...idToMembers].filter(([,set])=>set.size>1)
 .map(([physicalNumericNodeId,set])=>({physicalNumericNodeId,members:[...set].sort()}));
const reasonCounts={SOURCE_AND_TARGET_FOUND:0,SOURCE_ONLY:0,TARGET_ONLY:0,NEITHER:0,MULTIPLE_PHYSICAL_PAIR_CANDIDATES:0};
const allRows=resolved.rows.map(r=>{
 const physical=r.transposedDiagnostic;
 let reason=!physical.sourceLookupCount?(!physical.targetLookupCount?'NEITHER':'TARGET_ONLY')
  :!physical.targetLookupCount?'SOURCE_ONLY':'SOURCE_AND_TARGET_FOUND';
 reasonCounts[reason]++;
 if(physical.candidatePairs.length>1)reasonCounts.MULTIPLE_PHYSICAL_PAIR_CANDIDATES++;
 return {
  ownerOrdinal:r.ownerOrdinal,ownerOriginalLine:r.originalLine,
  ownerPsTargetName:r.rawSourceLabel,ownerSlSourceName:r.rawTargetLabel,
  sourceMemberNodeCandidates:physical.sourceNodeIds,targetNodeCandidates:physical.targetNodeIds,
  sourceMembers:physical.sourceMembers,reason,
  uniquePhysicalPair:physical.uniquePhysicalPair,
  candidatePairs:physical.candidatePairs,
 };
});
assert.deepEqual(reasonCounts,{
 SOURCE_AND_TARGET_FOUND:33,SOURCE_ONLY:13,TARGET_ONLY:73,NEITHER:309,
 MULTIPLE_PHYSICAL_PAIR_CANDIDATES:0,
});
assert.equal(allRows.length,428);
assert.equal(Object.values(reasonCounts).slice(0,4).reduce((a,b)=>a+b,0),428);
const report={
 schema:'CiiPhase2CumulativeS1S2S3NodeNameReconciliation.v1',
 ownerConfirmedDirection:'SL(S1/S2/S3)->PS(T)',
 sourceSetComposition:'CUMULATIVE_MEMBER_SCOPED_UNION_S1_PLUS_S2_PLUS_S3',
 rawOwnerSha256:manifest.originalUploadSha256,
 originalTargetSha256:hash(targetBytes),
 sourcePopulation:sourceSetPopulation,sourcePopulationByMember:sourceSetMemberCounts,
 targetPopulation:indexes.targetStats.physicalNodeCount,
 originalOwnerRows:428,ownerRowsWithCumulativeSourceSlName:sourceOccurrences.length,
 ownerRowsWithOriginalTargetPsName:targetOccurrences.length,
 originalOwnerRowsWithBothOriginalNames:both.length,
 uniquePhysicalOriginalPairs:unique.length,
 requiredOneToOnePhysicalCredits:300,
 absoluteMaximumUniqueSourceNodeCredits:sourceSetPopulation,
 theoreticalOneToOneRecallCap:sourceSetPopulation/428,
 reasonCounts,sourceByMember:perMember,
 crossMemberDuplicateNodeNames:nameCollisions,
 repeatedNumericNodeIdsAcrossMembers:repeatedNumericIdAcrossMembers,
 unmatchedSourceOwnerRows:allRows.filter(x=>!x.sourceMemberNodeCandidates.length),
 unmatchedTargetOwnerRows:allRows.filter(x=>!x.targetNodeCandidates.length),
 // Not a proposal to modify Owner's contractual one-to-one denominator.
 full428IndependentPhysicalRecall:null,structuralAcceptance:'FAIL_150_CUMULATIVE_SOURCE_NODES_LT_300_REQUIRED',
 ownerInputUsedForMatcherRanking:false,writerAuthorized:false,
 rows:allRows,
};
const root=new URL('../test-results/cii-phase2/',import.meta.url);
mkdirSync(root,{recursive:true});
writeFileSync(new URL('owner-cumulative-S1-S2-S3-reconciliation.json',root),JSON.stringify(report,null,2)+'\n');
const csv=v=>'"'+String(v&&typeof v==='object'?JSON.stringify(v):v??'').replaceAll('"','""')+'"';
const columns=['ownerOrdinal','ownerOriginalLine','ownerSlSourceName','ownerPsTargetName',
 'sourceMembers','sourceMemberNodeCandidates','targetNodeCandidates','reason','uniquePhysicalPair'];
writeFileSync(new URL('owner-cumulative-S1-S2-S3-428-rows.csv',root),
 [columns.join(','),...allRows.map(r=>columns.map(k=>csv(r[k])).join(','))].join('\n')+'\n');
const md=[
 '# Reconciliation of cumulative SOURCE S1 + S2 + S3 (Owner-confirmed direction)',
 '',
 '**SOURCE = all three original CII files combined.** Every physical source node has identity \`(S1|S2|S3, numeric NODE ID)\`, preventing cross-file collisions. Original owner text stays PS first, SL second; source NodeName is SL, target NodeName is PS.',
 '',
 '| Member | Original physical NODEs | Named original physical NODEs | Owner SL name rows present | Both sides uniquely resolvable |',
 '|---|---:|---:|---:|---:|',
 ...perMember.map(r=>'| '+r.sourceId+' | '+r.physicalNodeCount+' | '+r.namedPhysicalNodeCount+' | '+r.ownerSourceSlRowsWithMemberOccurrence+' | '+r.independentlyLocatableOwnerPhysicalPairs+' |'),
 '| **Combined S1+S2+S3** | **'+sourceSetPopulation+'** | **104** | **46** | **33** |',
 '',
 '## Complete 428-row outcome',
 '',
 '| Outcome | Owner rows |',
 '|---|---:|',
 '| Both SL source and PS target NodeNames found | 33 |',
 '| Only source SL found (PS missing from T) | 13 |',
 '| Only target PS found (SL missing from all S1/S2/S3) | 73 |',
 '| Neither found | 309 |',
 '| **Total** | **428** |',
 '',
 'Numeric NODE IDs are never collapsed across SOURCE members. Cross-member NodeName repeats/collisions: '+nameCollisions.length+'. Numeric NODE IDs reused across members (only within named nodes): '+repeatedNumericIdAcrossMembers.length+'.',
 '',
 'One-to-one physical SOURCE-node ceiling across ALL THREE members: '+sourceSetPopulation+'/428 = '+(100*sourceSetPopulation/428).toFixed(2)+'%. Owner threshold needs 300 independently distinct SOURCE NODE credits. The 33 name-locatable Owner pairs are distinct and already conditionally solver-agreed in the main benchmark, but that does not establish global independently certified recall.',
 '',
 'No single-file SOURCE count was used to impose the 150-node cap: it is the sum of S1, S2 and S3. All 428 rows retained with original ordinals, member-scoped original physical ID candidates, T candidates and missing-name reasons in the companion JSON/CSV.',
];
writeFileSync(new URL('owner-cumulative-S1-S2-S3-reconciliation.md',root),md.join('\n')+'\n');
console.log('PHASE2_CUMULATIVE_SOURCE_RECONCILIATION '+JSON.stringify({
 ownerConfirmedDirection:report.ownerConfirmedDirection,
 sourceMemberCounts:sourceSetMemberCounts,sourcePopulation:sourceSetPopulation,
 namedMemberCounts:perMember.map(x=>x.namedPhysicalNodeCount),
 matchedMemberOwnerSourceNames:perMember.map(x=>x.ownerSourceSlRowsWithMemberOccurrence),
 matchedMemberUniquePairs:perMember.map(x=>x.independentlyLocatableOwnerPhysicalPairs),
 totalRows:report.originalOwnerRows,reasonCounts,sourcePhysicalUpperBound:report.absoluteMaximumUniqueSourceNodeCredits,
 upperBound:report.theoreticalOneToOneRecallCap,
 crossMemberDuplicateNodeNames:nameCollisions.length,
 overlappingNumericNodeIdsAmongMembers:repeatedNumericIdAcrossMembers.length,
}));
