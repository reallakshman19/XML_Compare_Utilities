/**
 * CII #102 Phase 2 independent source-level product accuracy check.
 * Owner PS->SL labels are TEST-ONLY and never enter candidate generation.
 * Separately test the hypothesis that original TARGET PS is to be renamed to
 * the SOURCE SL label by S1/S2/S3->T physical correspondence.
 * Not an Owner-approved interpretation or a Writer/release certificate.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseIndependentNodeNameState} from './cii-workspace-multisource-texpected-oracle.js';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge}
  from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection}
  from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiCommonAnalysisCache,createCiiWriter2SourceSetPreviewFromPreparedSession}
  from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {buildCiiSourceTargetAudit}
  from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected={
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const original={};
for(const name of Object.keys(expected)){
 const bytes=readFileSync(join(root,'Benchmark',name+'.CII'));
 assert.equal(sha(bytes),expected[name],'original SHA custody '+name);
 original[name]={bytes,text:bytes.toString('latin1'),parsed:parseIndependentNodeNameState(bytes.toString('latin1'))};
 assert.deepEqual(original[name].parsed.conflicts,[],'original NODE name conflicts '+name);
}
const corpus3={};
for(const name of ['SOURCE 3','TARGET 3-1']){
 const bytes=readFileSync(join(root,'Benchmark/CIICompare',name+'.CII'));
 corpus3[name]={bytes,sha256:sha(bytes),parsed:parseIndependentNodeNameState(bytes.toString('latin1'))};
 assert.deepEqual(corpus3[name].parsed.conflicts,[]);
}
const manifest=JSON.parse(readFileSync(join(root,
 'tests/qualification/owner-phase2-20261015-intake-manifest.json'),'utf8'));
const raw=readFileSync(join(root,manifest.rawRelativePath));
assert.equal(sha(raw),manifest.rawUtf8Sha256);
assert.equal(raw.length,15633);
const relationRows=[];
for(const [i,line] of raw.toString('utf8').split('\n').entries()){
 const match=line.match(/^\s*(PS\S+)[\u00a0 \t]+(SL\S+)\s*$/u);
 if(match)relationRows.push({ordinal:relationRows.length+1,physicalLine:i+1,ps:match[1],sl:match[2]});
 else if(line.trim() && i>=7)throw Error('UNPARSED_OWNER_RELATION:'+String(i+1));
}
assert.equal(relationRows.length,428);
function namesToPhysical(parsed){
 const lookup=new Map();
 for(const [physicalId,label] of parsed.names){
  if(!lookup.has(label))lookup.set(label,[]);
  lookup.get(label).push(physicalId);
 }
 return lookup;
}
const originalLabels=Object.fromEntries(Object.entries(original).map(([k,x])=>[k,namesToPhysical(x.parsed)]));
const corpusLabels=Object.fromEntries(Object.entries(corpus3).map(([k,x])=>[k,namesToPhysical(x.parsed)]));
const sourceNames=['S1','S2','S3'];
const targetsByOwner=relationRows.map(row=>{
 const originalTargetPs=originalLabels.T.get(row.ps)||[];
 const currentTargetSl=originalLabels.T.get(row.sl)||[];
 const sourceSl=sourceNames.flatMap(member=>(originalLabels[member].get(row.sl)||[]).map(id=>({member,id})));
 return {
  ...row, originalTargetPs, currentTargetSl, sourceSl,
  alternateCorpusPs:{source3:corpusLabels['SOURCE 3'].get(row.ps)||[],
   target31:corpusLabels['TARGET 3-1'].get(row.ps)||[]},
 };
});
const count=p=>targetsByOwner.filter(p).length;
assert.equal(count(x=>x.originalTargetPs.length>0),106,'T original PS baseline');
assert.equal(count(x=>x.sourceSl.length>0),46,'S1/S2/S3 original SL baseline');
assert.equal(count(x=>x.originalTargetPs.length>0&&x.sourceSl.length>0),33,'joint old-T PS/new-S SL baseline');
assert.equal(count(x=>x.alternateCorpusPs.source3.length>0),88);
assert.equal(count(x=>x.alternateCorpusPs.target31.length>0),92);
assert.equal(count(x=>x.currentTargetSl.length>0),68);
const both=targetsByOwner.filter(x=>x.originalTargetPs.length&&x.sourceSl.length);
assert(both.every(x=>x.originalTargetPs.length===1&&x.sourceSl.length===1),
 'physical ambiguity must be reported; no first occurrence selection');
// Geometry independent of the production correspondence solver.
function sectionLines(text,name){
 let active=false,rows=[];
 for(const l of text.split('\n')){
  const line=l.replace(/\r$/,'');
  const h=line.match(/^\s*#\$\s+(\S+)/);
  if(h){active=h[1]===name;continue;}
  if(active)rows.push(line);
 }
 return rows;
}
function numericField(row,n){
 const str=(row||'').slice(2+13*n,2+13*(n+1)).trim().replace(/[dD]/g,'E');
 return Number(str);
}
function graph(text){
 const lines=sectionLines(text,'ELEMENTS');
 assert.equal(lines.length%15,0);
 const adjacency=new Map();
 for(let i=0;i<lines.length;i+=15){
  const from=String(Math.round(numericField(lines[i],0))),
   to=String(Math.round(numericField(lines[i],1)));
  const displacement=[2,3,4].map(j=>numericField(lines[i],j));
  const od=numericField(lines[i],5);
  for(const [id,next,sign] of [[from,to,1],[to,from,-1]]){
   if(!adjacency.has(id))adjacency.set(id,[]);
   adjacency.get(id).push({next,vector:displacement.map(n=>sign*n),od});
  }
 }
 const loc=new Map(),component=new Map();let cid=0;
 for(const root of adjacency.keys()){
  if(loc.has(root))continue;
  loc.set(root,[0,0,0]);component.set(root,cid);
  const queue=[root];
  for(let i=0;i<queue.length;i++){
   const node=queue[i],at=loc.get(node);
   for(const {next,vector} of adjacency.get(node)){
    const nextLoc=at.map((v,j)=>v+vector[j]);
    if(!loc.has(next)){
     loc.set(next,nextLoc);component.set(next,cid);queue.push(next);
    }
   }
  }
  cid++;
 }
 return {loc,component,adjacency,components:cid};
}
const g=Object.fromEntries(Object.entries(original).map(([k,v])=>[k,graph(v.text)]));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const vectorFrom=(g,id,anchorId)=>g.loc.get(id).map((v,i)=>v-g.loc.get(anchorId)[i]);
const anchors={};
for(const row of both){
 const s=row.sourceSl[0],t=row.originalTargetPs[0];
 if(!anchors[s.member])anchors[s.member]={sourceId:s.id,targetId:t,rowOrdinal:row.ordinal};
}
for(const row of both){
 const s=row.sourceSl[0],t=row.originalTargetPs[0],a=anchors[s.member];
 row.physical={
  member:s.member,sourceNodeId:s.id,originalTargetNodeId:t,
  sourceComponent:g[s.member].component.get(s.id),
  targetComponent:g.T.component.get(t),
  relativeDisplacementResidualMm:Number(distance(
   vectorFrom(g[s.member],s.id,a.sourceId),
   vectorFrom(g.T,t,a.targetId)).toFixed(4)),
  sourceIncidentOds:[...new Set((g[s.member].adjacency.get(s.id)||[]).map(x=>x.od))],
  targetIncidentOds:[...new Set((g.T.adjacency.get(t)||[]).map(x=>x.od))],
 };
}
const cryptoRef=globalThis.crypto||webcrypto;
const sources=sourceNames.map(sourceId=>({sourceId,fileName:sourceId+'.CII',bytes:original[sourceId].bytes}));
const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
 {sources,targetBytes:original.T.bytes,targetFileName:'T.CII'},{cryptoRef});
const bases={};
for(const member of inspection.memberInspections){
 const selected=ciiAutomaticBaseSelection(member.inspection?.baseAnchorSuggestions||[]);
 assert.equal(selected.status,'READY','auto base selection '+member.sourceId);
 bases[member.sourceId]=selected.baseLoops;
}
const cache=createCiiCommonAnalysisCache();
const auto=await createCiiWriter2SourceSetPreviewFromPreparedSession(
 preparedSession,{baseLoopsBySource:bases},{cryptoRef,commonAnalysisCache:cache});
const active=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,{
 baseLoopsBySource:{S1:bases.S1},
 anchorPairsBySource:{S2:[{sourceNodeId:'420',targetNodeId:'415'}],
  S3:[{sourceNodeId:'1580',targetNodeId:'7880'}]},
},{cryptoRef,commonAnalysisCache:cache});
const auditAuto=buildCiiSourceTargetAudit(auto),auditActive=buildCiiSourceTargetAudit(active);
const autoBySource=new Map(auditAuto.rows.map(x=>[x.rowKey,x]));
const activeBySource=new Map(auditActive.rows.map(x=>[x.rowKey,x]));
for(const row of both){
 const s=row.sourceSl[0],target=row.originalTargetPs[0],key=s.member+':'+s.id;
 const a=autoBySource.get(key),b=activeBySource.get(key);
 assert(a&&b,'source physical node census must contain named node '+key);
 const judge=x=>({
  status:x.state,
  bound:x.state==='BOUND',
  proposedPhysicalTargetNodeId:x.targetNodeId||null,
  targetCandidates:x.targetNodeIds||[],
  agreesWithOwnerTargetPs:(x.targetNodeIds||[]).map(String).includes(String(target))&&x.state==='BOUND',
  confidence:x.confidence||null,
 });
 row.product={auto:judge(a),manualActive:judge(b)};
}
const qualified=both.map(x=>({
 ordinal:x.ordinal,ps:x.ps,sl:x.sl,
 ...x.physical,
 auto:x.product.auto,manualActive:x.product.manualActive,
}));
const ci=(predicate)=>qualified.filter(predicate).length;
const summary={
 ownerRowCount:relationRows.length,
 ownerLeftPsFoundInOriginalT:count(x=>x.originalTargetPs.length>0),
 ownerRightSlFoundInOriginalSources:count(x=>x.sourceSl.length>0),
 originalBothSidesPhysicallyAddressable:qualified.length,
 originalAddressableByMember:Object.fromEntries(sourceNames.map(member=>[member,qualified.filter(x=>x.member===member).length])),
 originalTargetNamesAlreadySL:count(x=>x.currentTargetSl.length>0),
 alternateCorpusSource3Ps:count(x=>x.alternateCorpusPs.source3.length>0),
 alternateCorpusTarget31Ps:count(x=>x.alternateCorpusPs.target31.length>0),
 relativeDisplacementWithin25mm:ci(x=>x.relativeDisplacementResidualMm<=25),
 relativeDisplacementOver25mm:ci(x=>x.relativeDisplacementResidualMm>25),
 originalAutoCorrectBound:ci(x=>x.auto.agreesWithOwnerTargetPs),
 originalAutoWrongBound:ci(x=>x.auto.bound&&!x.auto.agreesWithOwnerTargetPs),
 originalAutoNotBound:ci(x=>!x.auto.bound),
 manualActiveCorrectBound:ci(x=>x.manualActive.agreesWithOwnerTargetPs),
 manualActiveWrongBound:ci(x=>x.manualActive.bound&&!x.manualActive.agreesWithOwnerTargetPs),
 manualActiveNotBound:ci(x=>!x.manualActive.bound),
 originalTargetCurrentPSButNoSourceSL:count(x=>x.originalTargetPs.length>0&&!x.sourceSl.length),
 sourceSLButNoTargetPS:count(x=>x.sourceSl.length>0&&!x.originalTargetPs.length),
};
assert.equal(summary.originalAutoCorrectBound+summary.originalAutoWrongBound+summary.originalAutoNotBound,33);
assert.equal(summary.manualActiveCorrectBound+summary.manualActiveWrongBound+summary.manualActiveNotBound,33);
const report={
 schema:'Cii102OwnerPhase2ActualSourceLevelComparison.v1',
 status:'READ_ONLY_PRODUCT_VS_33_ADDRESSABLE_OWNER_ROWS_NOT_FULL_428_RECALL',
 originalOwnerDigest:manifest.rawUtf8Sha256,
 originalPhysicalSha:expected,
 alternateCorpusSha:Object.fromEntries(Object.entries(corpus3).map(([k,v])=>[k,v.sha256])),
 meaning:'TEST ONLY: T current PS -> original S1/S2/S3 SL interpretation. Golden labels never passed to product matching.',
 summary,anchors,
 rows:targetsByOwner.map(r=>({
  ordinal:r.ordinal,physicalLine:r.physicalLine,ps:r.ps,sl:r.sl,
  sourceSL:r.sourceSl,targetCurrentPS:r.originalTargetPs,targetCurrentSL:r.currentTargetSl,
  alternateCorpusPS:r.alternateCorpusPs,
  finding:r.physical?{
   ...r.physical,product:r.product,
   provenance:'Independent original CII parser + blind product AUTO and manual-active replay',
  }:{status:'ONE_OR_BOTH_PHYSICAL_NAMES_ABSENT_OR_UNRESOLVED'},
 })),
 operationalOwnerValidatedRecallPct:null,
 ownerThreshold70Pct:'NOT_EVALUABLE_FOR_FULL_428',
 independentlyNewlyCertifiedPhysicalIdentities:0,
 ownerApproved:false,writerReady:false,
};
const path=join(root,'test-results/cii-method-a-qualification/owner-phase2-428-source-level-product-comparison.json');
mkdirSync(join(root,'test-results/cii-method-a-qualification'),{recursive:true});
writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log('CII102_OWNER_P2_SOURCE_LEVEL_PRODUCT_COMPARISON',JSON.stringify(summary));
console.log('CII102_OWNER_P2_SOURCE_LEVEL_ROW_DETAILS',JSON.stringify(qualified.map(x=>({
 ordinal:x.ordinal,ps:x.ps,sl:x.sl,member:x.member,
 sourceNodeId:x.sourceNodeId,targetNodeId:x.originalTargetNodeId,
 displacementErrorMm:x.relativeDisplacementResidualMm,
 auto:x.auto.status,autoCorrect:x.auto.agreesWithOwnerTargetPs,
 autoTarget:x.auto.proposedPhysicalTargetNodeId,
 manual:x.manualActive.status,manualCorrect:x.manualActive.agreesWithOwnerTargetPs,
}))));
