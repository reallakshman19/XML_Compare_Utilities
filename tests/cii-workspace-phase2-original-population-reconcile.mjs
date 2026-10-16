/**
 * Issue #106 W9.2: original physical SOURCE population reconstruction.
 * Look for an authentic 300-node SOURCE candidate in ALL checked-in, non-mirror
 * CII files. Do not manufacture synthetic nodes, graft unrelated jobs into
 * SOURCE set or reinterpret repeated NodeNames as independent physical nodes.
 * Outputs are evidence-only, never production matcher seeds or Writer authority.
 */
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseIndependentNodeNameState} from './cii-workspace-multisource-texpected-oracle.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=fileURLToPath(new URL('../test-results/cii-phase2/',import.meta.url));
const originals=readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-phase2-manifest.json',import.meta.url),'utf8'));
const owner=JSON.parse(readFileSync(new URL('./fixtures/cii-phase2/owner-confirmed-direction.json',import.meta.url),'utf8'));
const hash=data=>createHash('sha256').update(data).digest('hex');
assert.equal(hash(originals),manifest.originalUploadSha256);
assert.equal(owner.ownerConfirmedDirection,true);
const pairs=originals.toString('utf8').split(/\r?\n/).map(t=>t.trim().match(/^(PS\S+)\s+(SL\S+)$/)).filter(Boolean)
 .map(([,ps,sl],i)=>({ownerOrdinal:i+1,sourceNodeName:sl,targetNodeName:ps}));
assert.equal(pairs.length,428);
function walk(dir) {
 const files=[];
 for(const f of readdirSync(dir,{withFileTypes:true})){
  if(f.isDirectory()&&dir===root&&['.git','docs','node_modules','.cache'].includes(f.name))continue;
  const p=join(dir,f.name);
  if(f.isDirectory())files.push(...walk(p));
  else if(f.isFile()&&/\.cii$/i.test(f.name))files.push(p);
 }
 return files;
}
const memberIds=new Set(['Benchmark/S1.CII','Benchmark/S2.CII','Benchmark/S3.CII']);
const targetId='Benchmark/T.CII';
const rows=[],parsedByPath=new Map(),failures=[];
for(const file of walk(root).sort()){
 const rel=relative(root,file).replaceAll('\\','/');
 const raw=readFileSync(file);
 try{
  const parsed=parseIndependentNodeNameState(raw.toString('latin1'));
  if(parsed.conflicts.length)throw Error('ORIGINAL_NODENAME_MULTIPLE_VALUES_ON_SAME_PHYSICAL_NODE:'+parsed.conflicts.length);
  const physicalIds=new Set(parsed.elements.flatMap(e=>[e.from,e.to]));
  const names=new Map();
  for(const [nodeId,name] of parsed.names) {
   if(!names.has(name))names.set(name,[]);
   names.get(name).push(String(nodeId));
  }
  const exactOwnerSl=pairs.filter(row=>names.has(row.sourceNodeName));
  const distinctSlPhysical=new Set(exactOwnerSl.flatMap(row=>names.get(row.sourceNodeName)));
  const exactOwnerPs=pairs.filter(row=>names.has(row.targetNodeName));
  const row={
   path:rel,sha256:hash(raw),role:memberIds.has(rel)?'PINNED_SOURCE':
     rel===targetId?'PINNED_TARGET':rel==='Benchmark/TEXPECTED-PARTIALLLYDONE.CII'?'PARTIAL_WRITER_POSTIMAGE_ONLY':'UNAPPROVED_ALTERNATE',
   elementCount:parsed.elements.length,
   originalDistinctPhysicalNodeCount:physicalIds.size,
   originalNamedPhysicalNodeCount:parsed.names.size,
   uniqueOriginalNodeNameCount:names.size,
   ownerSourceSlRowPresence:exactOwnerSl.length,
   ownerSourceSlDistinctPhysicalNodeCount:distinctSlPhysical.size,
   ownerTargetPsRowPresence:exactOwnerPs.length,
   meets300PhysicalSourceNodeCapacity:physicalIds.size>=300,
   meets300OwnerSlNamedSourceCapacity:distinctSlPhysical.size>=300,
   ownerApprovedAsSource:memberIds.has(rel),
   neverWriterOrAutoSeed:true,
  };
  rows.push(row);
  parsedByPath.set(rel,{names,physicalIds,row});
 }catch(e){failures.push({path:rel,sha256:hash(raw),reason:String(e.message||e)})}
}
const originalSources=[...memberIds].sort().map(p=>parsedByPath.get(p));
const originalTarget=parsedByPath.get(targetId);
if(originalSources.some(x=>!x)||!originalTarget)throw Error('PINNED_ORIGINAL_CII_NOT_PARSEABLE');
const baselineCount=originalSources.reduce((n,x)=>n+x.physicalIds.size,0);
assert.equal(baselineCount,150);
const originalSourceByName=new Map();
for(const [ix,obj] of originalSources.entries()){
 const src=[...memberIds].sort()[ix];
 for(const [name,ids] of obj.names)for(const id of ids){
  if(!originalSourceByName.has(name))originalSourceByName.set(name,[]);
  originalSourceByName.get(name).push({sourceId:src,sourceNodeId:id});
 }
}
function uniquePairCount(sourceIndex,targetIndex) {
 return pairs.filter(row=>(sourceIndex.get(row.sourceNodeName)||[]).length===1
  &&(targetIndex.get(row.targetNodeName)||[]).length===1).length;
}
const existingExact=uniquePairCount(originalSourceByName,originalTarget.names);
assert.equal(existingExact,33);
const alternativeRows=rows.filter(r=>r.role==='UNAPPROVED_ALTERNATE').map(r=>{
 const candidate=parsedByPath.get(r.path);
 return {...r,uniqueOwnerPairsResolvedToPinnedT:uniquePairCount(candidate.names,originalTarget.names),
  independentlyApprovedReplacement:false};
});
const sourceCapacityCandidates=rows.filter(r=>r.meets300PhysicalSourceNodeCapacity);
const ownerSlNameCapacityCandidates=rows.filter(r=>r.meets300OwnerSlNamedSourceCapacity);
const insufficientConfirmedNames=pairs.filter(row=>!originalSourceByName.has(row.sourceNodeName));
const originalTargetMissing=pairs.filter(row=>!originalTarget.names.has(row.targetNodeName));
const summary={
 schema:'CiiPhase2OriginalPopulationReconciliation.v1',
 ownerDirection:'SL(S1/S2/S3)->PS(T)',ownerRawInputSha256:manifest.originalUploadSha256,
 originalOwnerRows:428,requiredDistinctPhysicalCredits:300,minimumPhysicalSourceNodesNeeded:300,
 pinnedSourcePhysicalNodes:baselineCount,
 pinnedSourceMaxAttainableCredits:baselineCount,pinnedSourceMaximumFraction:baselineCount/428,
 pinnedTargetPhysicalNodes:originalTarget.physicalIds.size,
 pinnedOwnerRowsWithUniqueBothNames:existingExact,
 pinnedOwnerSourceSlNamesAbsentRowCount:insufficientConfirmedNames.length,
 pinnedOwnerTargetPsNamesAbsentRowCount:originalTargetMissing.length,
 nonMirrorCiiFileCount:rows.length+failures.length,
 strictParsedCiiFileCount:rows.length,nonconformingOriginalCii:failures,
 filesWith300OrMorePhysicalNodes:sourceCapacityCandidates.map(r=>({
  path:r.path,physicalNodes:r.originalDistinctPhysicalNodeCount,role:r.role,
  ownerSlNamedPhysicalNodes:r.ownerSourceSlDistinctPhysicalNodeCount,
 })),
 filesWith300OrMoreMatchedOwnerSlPhysicalNodes:ownerSlNameCapacityCandidates.map(r=>r.path),
 validApprovedReplacementSourceFound:false,
 supplementaryCiiCombiningDifferentJobsAuthorized:false,
 physicallyCertifiedRecall:null,
 structuralAcceptance:'FAIL_ONE_TO_ONE_SOURCE_POPULATION_CAP',
 nextRequiredEvidence:'Owner-provided original CII SOURCE fixture set with >=300 real, independently distinct SOURCE NODEs, provenance and SL->PS NodeName/physical-occurrence oracle, with frozen 428 Owner row audit. Or a new explicitly approved and independently evidenced scoring contract.',
};
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'owner-original-physical-population-reconciliation.json'),JSON.stringify({
 summary,pinnedSources:originalSources.map(x=>x.row),pinnedTarget:originalTarget.row,
 alternateCandidates:alternativeRows,otherOriginalInputs:rows.filter(r=>r.role==='PARTIAL_WRITER_POSTIMAGE_ONLY'),
 unmatchedSourceOwnerRows:insufficientConfirmedNames,unmatchedTargetOwnerRows:originalTargetMissing,
},null,2)+'\n');
const cols=['path','role','sha256','elementCount','originalDistinctPhysicalNodeCount',
 'originalNamedPhysicalNodeCount','ownerSourceSlRowPresence','ownerSourceSlDistinctPhysicalNodeCount',
 'ownerTargetPsRowPresence','meets300PhysicalSourceNodeCapacity','meets300OwnerSlNamedSourceCapacity',
 'ownerApprovedAsSource'];
const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
writeFileSync(join(out,'owner-source-population-candidate-inventory.csv'),
 [cols.join(','),...rows.map(r=>cols.map(c=>quote(r[c])).join(','))].join('\n')+'\n');
const md=[
 '# Owner Phase 2 — original physical SOURCE population reconciliation',
 '',
 'Owner direction: **SL original NodeName in S1/S2/S3 → PS original NodeName in T**.',
 'Original Owner 428 rows remain byte-for-byte unchanged and test-only.',
 '',
 '| Measurement | Result |',
 '|---|---:|',
 '| Independently physical original SOURCE nodes, S1+S2+S3 | '+baselineCount+' |',
 '| Original TARGET T physical nodes | '+originalTarget.physicalIds.size+' |',
 '| Required independent SOURCE-node credits | 300 |',
 '| Maximum possible R/N from pinned one-to-one SOURCE nodes | '+baselineCount+'/428 = '+(100*baselineCount/428).toFixed(2)+'% |',
 '| Original Owner rows with unique SOURCE/T NodeName→physical-node mappings | '+existingExact+' |',
 '| Owner SOURCE SL rows absent from pinned SOURCE name index | '+insufficientConfirmedNames.length+' |',
 '| Owner TARGET PS rows absent from pinned T name index | '+originalTargetMissing.length+' |',
 '| Independently parseable non-mirrored repository CII | '+rows.length+' of '+(rows.length+failures.length)+' |',
 '| Owner-approved replacement original SOURCE fixture with ≥300 source NODEs and matching labels | **None** |',
 '',
 '## Original CII physical-population candidates',
 '',
 '| Original CII file | Original physical NODEs | SOURCE SL owner name physical matches | Status |',
 '|---|---:|---:|---|',
 ...rows.map(x=>'| '+x.path.replace(/\|/g,'\\|')+' | '+x.originalDistinctPhysicalNodeCount+' | '+x.ownerSourceSlDistinctPhysicalNodeCount+' | '+x.role+' |'),
 '',
 '## Evidence and safeguards',
 '',
 '- Original physical NODEs counted from independent \`ELEMENTS\` FROM/TO identifiers, not NodeName labels, element count or repeated owner rows.',
 '- Original CII files whose 15-row ELEMENTS decode fails are reported, not patched or silently included.',
 '- The independently qualified SOURCE set is exactly S1, S2, S3. A T or Writer2 postimage cannot be recast as a SOURCE to reach 300.',
 '- Other original CII job/fixture revisions are unapproved and cannot be concatenated into the sourceSet.',
 '- The 33 name-derived physical owner pairs are conditional benchmark evidence, NOT 33 globally independently certified physical correspondences.',
 '- Full original 428-row global recall is NOT measurable; 70% structural feasibility is FAIL on pinned original SOURCE files.',
 '',
 '## Decisive remaining evidence',
 '',
 'Provide original CII SOURCE/T original revision bytes and SHA-256, SOURCE member occurrences and a physical one-to-one mapping for >=300 distinct eligible SOURCE NODE obligations; or an explicitly ratified alternative independent obligation unit and separate denominator. No relabeling, source-node recycling, or assertion-only inflation.',
];
writeFileSync(join(out,'owner-original-physical-population-reconciliation.md'),md.join('\n')+'\n');
console.log('PHASE2_SOURCE_POPULATION_RECONCILIATION '+JSON.stringify(summary));
console.log('PHASE2_SOURCE_POPULATION_CANDIDATES '+JSON.stringify(rows.map(x=>({
 path:x.path,role:x.role,physicalNodes:x.originalDistinctPhysicalNodeCount,matchedSourcePhysicalNodes:x.ownerSourceSlDistinctPhysicalNodeCount,
}))));
