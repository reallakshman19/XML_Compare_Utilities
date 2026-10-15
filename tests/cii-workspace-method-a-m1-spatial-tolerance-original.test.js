import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {webcrypto,createHash} from 'node:crypto';
import {
 CII_METHOD_A_SPATIAL_TOLERANCE_DEFAULT_MM,validateCiiMultiSourceMethodASpatialToleranceMm,
 setCiiMultiSourceMethodASpatialToleranceMm,getCiiMultiSourceMethodAConfidenceOptions,
} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {evaluateCiiSpatialMethod} from '../tabs/cii-workspace/cii-workspace-match-methods.js';
import {qualifyCiiGeometryTransform} from '../tabs/cii-workspace/cii-workspace-geometry.js';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge} from '../tabs/cii-workspace/cii-workspace-source-set.js';
import {ciiAutomaticBaseSelection} from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import {createCiiCommonAnalysisCache,createCiiWriter2SourceSetPreviewFromPreparedSession}
  from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import {ciiCommonAnalysisOptions} from '../tabs/cii-workspace/cii-workspace-common-analysis-key.js';
import {ciiWriter2SessionPolicyMatches,createCiiWriter2SessionSnapshot}
  from '../tabs/cii-workspace/cii-workspace-multisource-session-persistence.js';
import {ciiMultiSourceReviewBySource,seedCiiMultiSourceReviewDecisions}
  from '../tabs/cii-workspace/cii-workspace-multisource-review-ui.js';

const save=getCiiMultiSourceMethodAConfidenceOptions();
try {
 assert.equal(CII_METHOD_A_SPATIAL_TOLERANCE_DEFAULT_MM,100);
 assert.equal(validateCiiMultiSourceMethodASpatialToleranceMm('100'),100);
 assert.equal(validateCiiMultiSourceMethodASpatialToleranceMm('200'),200);
 assert.equal(validateCiiMultiSourceMethodASpatialToleranceMm('150.5'),150.5);
 for(const val of ['',null,undefined,0,-10,'NaN',NaN,Infinity,'200.01','not-a-number']){
  assert.throws(()=>setCiiMultiSourceMethodASpatialToleranceMm(val),/METHOD_A_M1_SPATIAL_TOLERANCE_INVALID/);
  assert.equal(getCiiMultiSourceMethodAConfidenceOptions().spatialToleranceMm,save.spatialToleranceMm);
 }
 const tr={status:'READY',mode:'RIGID_3D',rotation:[[1,0,0],[0,1,0],[0,0,1]],translation:[0,0,0]};
 const edge=(delta=0)=>({fromPos:{x:delta,y:0,z:0},toPos:{x:delta+1000,y:0,z:0}});
 const source=edge(),target=edge(150);
 const m100=evaluateCiiSpatialMethod(source,target,{geometryTransform:tr,spatialToleranceMm:100});
 const m200=evaluateCiiSpatialMethod(source,target,{geometryTransform:tr,spatialToleranceMm:200});
 assert.equal(m100.distanceMm,150);assert.equal(m100.toleranceMm,100);assert.equal(m100.pass,false);
 assert.equal(m200.distanceMm,150);assert.equal(m200.toleranceMm,200);assert.equal(m200.pass,true);
 const pts=[[0,0,0],[1000,0,0],[0,1000,0]].map(([x,y,z])=>({
  source:{x,y,z},target:{x:x+20,y:y+30,z},sourceOdMm:100,
 }));
 const reg100=qualifyCiiGeometryTransform(pts,{spatialToleranceMm:100});
 const reg200=qualifyCiiGeometryTransform(pts,{spatialToleranceMm:200});
 assert.equal(reg100.status,'READY');assert.equal(reg200.status,'READY');
 assert.deepEqual(reg100.tolerancePolicy,reg200.tolerancePolicy,
   'M1 tolerance must NOT alter OD-scaled Method A rigid basis admission');
 assert.equal(ciiCommonAnalysisOptions({spatialToleranceMm:200}).spatialToleranceMm,200);

 const original=name=>readFileSync(fileURLToPath(new URL('../Benchmark/'+name+'.CII',import.meta.url)));
 const names=['S1','S2','S3'];
 const sources=names.map(sourceId=>({sourceId,fileName:sourceId+'.CII',bytes:original(sourceId)}));
 const targetBytes=original('T'),cryptoRef=globalThis.crypto||webcrypto;
 const input={sources,targetBytes,targetFileName:'T.CII'};
 const current=()=>getCiiMultiSourceMethodAConfidenceOptions();
 const run=async toleranceMm=>{
  setCiiMultiSourceMethodASpatialToleranceMm(toleranceMm);
  const options=current();
  const {inspection,preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(input,{
   cryptoRef,...options,
  });
  const bases={};
  for(const m of inspection.memberInspections){
   const auto=ciiAutomaticBaseSelection(m.inspection.baseAnchorSuggestions||[]);
   assert.equal(auto.status,'READY',m.sourceId+' original automatic base with '+toleranceMm);
   bases[m.sourceId]=auto.baseLoops;
  }
  const p=await createCiiWriter2SourceSetPreviewFromPreparedSession(preparedSession,{
   baseLoopsBySource:bases,
  },{cryptoRef,commonAnalysisCache:createCiiCommonAnalysisCache(),...options});
  // Transfer rows, unlike M1 element pass/fail scores, are generated only by
  // the exact Compare→review→Transfer Preview projection. Hold active authority
  // and independent decision policy identical at both tolerance settings.
  const summary=preview=>({
   compareRows:preview.compareReview?.rows?.length||0,
   nodeNameDeltaRows:preview.engineeringDeltas?.rows?.filter(x=>String(x.category).toUpperCase()==='NODE_NAME').length||0,
   transferOperations:preview.transferPlan?.summary?.operationCount??null,
   transferPreviewReady:preview.transferPlan?.summary?.previewReadyCount??null,
   transferBlocked:preview.transferPlan?.summary?.blockedCount??null,
   transferProtected:preview.transferPlan?.summary?.protectedCount??null,
   nodeNameReplacements:preview.transferPlan?.summary?.nodeNameReplacementCount??null,
   byAction:preview.transferPlan?.summary?.byAction||{},
   transferStatus:preview.transferPlan?.status||null,
   writerReadiness:preview.writerReadiness?.status||null,
   operationIds:(preview.transferPlan?.operations||[]).map(op=>op.operationId).sort(),
  });
  const reviewedFor=raw=>{
   // Use the EXACT application Review→Transfer Preview projection, preserving
   // member ledgers and the prefix-stripped correspondence IDs.
   const decisions=seedCiiMultiSourceReviewDecisions(raw,new Map());
   return ciiMultiSourceReviewBySource(raw,decisions);
  };
  const replay=async(payload,unreviewed)=>{
   const raw=unreviewed||await createCiiWriter2SourceSetPreviewFromPreparedSession(
    preparedSession,payload,{cryptoRef,commonAnalysisCache:createCiiCommonAnalysisCache(),...options});
   const accepted=await createCiiWriter2SourceSetPreviewFromPreparedSession(
    preparedSession,{...payload,reviewBySource:reviewedFor(raw)},
    {cryptoRef,commonAnalysisCache:createCiiCommonAnalysisCache(),...options});
   return {unreviewed:summary(raw),accepted:summary(accepted)};
  };
  const autoTransfer=await replay({baseLoopsBySource:bases},p);
  const ownerActiveInput={
   baseLoopsBySource:{S1:bases.S1},
   anchorPairsBySource:{
    S2:[{sourceNodeId:'420',targetNodeId:'415'}],
    S3:[{sourceNodeId:'1580',targetNodeId:'7880'}],
   },
  };
  const ownerTransfer=await replay(ownerActiveInput);
  const transferComparison={AUTO_ONLY:autoTransfer,OWNER_MANUAL_ACTIVE:ownerTransfer};
  for(const v of Object.values(transferComparison))for(const state of Object.values(v)){
   assert(state.transferOperations>=0);
   assert(state.transferPreviewReady>=0);
   assert(state.transferPreviewReady<=state.transferOperations);
   assert.equal(state.transferOperations,state.transferPreviewReady+state.transferBlocked+state.transferProtected);
  }
  console.log('METHOD_A_M1_TRANSFER_ROWS',JSON.stringify({
   toleranceMm,byAuthority:Object.fromEntries(Object.entries(transferComparison).map(([k,v])=>[k,
    Object.fromEntries(Object.entries(v).map(([stage,x])=>[stage,
     {...x,operationIds:undefined}]))])),
  }));
  assert.equal(p.correspondence?.memberCount,3);
  assert.equal(p.targetAuthority.originalSha256,createHash('sha256').update(targetBytes).digest('hex'));
  const review=(p.compareReview?.rows||[]).filter(r=>r.kind==='ELEMENT'&&r.methodA?.available);
  assert(review.length>0,'must obtain genuine original-file M1 spatial evidence');
  assert(review.every(r=>r.methodA.toleranceMm===toleranceMm),'genuine M1 evidence must be rescored under new tolerance');
  const registry=new Map();
  for(const x of review)registry.set(x.correspondenceId,{distanceMm:x.methodA.distanceMm,pass:x.methodA.pass,score:x.methodA.score});
  const saved=createCiiWriter2SessionSnapshot({
   sourceSetSha256:inspection.sourceSet.sourceSetSha256,
   targetOriginalSha256:p.targetAuthority.originalSha256,
   confidencePolicy:options,
   reviewDecisions:{fake:'ACCEPT'},
  });
  assert.equal(saved.confidencePolicy.spatialToleranceMm,toleranceMm);
  assert.equal(ciiWriter2SessionPolicyMatches(saved,options),true);
  assert.equal(ciiWriter2SessionPolicyMatches(saved,{...options,spatialToleranceMm:toleranceMm===100?200:100}),false);
  const stats={toleranceMm,sourceSetSha256:inspection.sourceSet.sourceSetSha256,
   originalSourceSha256:Object.fromEntries(inspection.sourceSet.members.map(m=>[m.sourceId,m.originalSha256])),
   targetOriginalSha256:p.targetAuthority.originalSha256,
   M1ElementRows:review.length,M1Pass:review.filter(r=>r.methodA.pass).length,
   M1Fail:review.filter(r=>!r.methodA.pass).length,registry,
   activeStatus:p.correspondence.status,transferComparison,writerCertificationGrantedByTest:false};
  console.log('METHOD_A_M1_ORIGINAL',JSON.stringify({...stats,registry:undefined}));
  return stats;
 };
 const a=await run(100),b=await run(200);
 assert.equal(a.sourceSetSha256,b.sourceSetSha256);
 assert.equal(a.targetOriginalSha256,b.targetOriginalSha256);
 assert.deepEqual(a.originalSourceSha256,b.originalSourceSha256);
 assert.equal(current().spatialToleranceMm,200);
 const commonIds=[...a.registry.keys()].filter(id=>b.registry.has(id));
 const reweighted=commonIds.filter(id=>{
  const oldEvidence=a.registry.get(id),newEvidence=b.registry.get(id);
  return oldEvidence.distanceMm===newEvidence.distanceMm && oldEvidence.score!==newEvidence.score;
 });
 assert(reweighted.length>0,'200mm must change actual M1 quality scoring for original nonzero residuals, not only the display');
 console.log('METHOD_A_M1_SCORE_EFFECT',JSON.stringify({
  matchedOriginalElementEvidenceCount:commonIds.length,
  rescoredActualM1ElementCount:reweighted.length,
  oldAndNewSample:reweighted.slice(0,5).map(id=>({
   id,distanceMm:a.registry.get(id).distanceMm,
   score100:a.registry.get(id).score,score200:b.registry.get(id).score,
  })),
  M1PassCountUnchanged:a.M1Pass===b.M1Pass,
 }));
 const transferDiff=Object.fromEntries(['AUTO_ONLY','OWNER_MANUAL_ACTIVE'].map(mode=>[mode,
  Object.fromEntries(['unreviewed','accepted'].map(stage=>{
   const x=a.transferComparison[mode][stage],y=b.transferComparison[mode][stage];
   return [stage,{
    transferRows100:x.transferOperations,transferRows200:y.transferOperations,
    change:y.transferOperations-x.transferOperations,
    previewReady100:x.transferPreviewReady,previewReady200:y.transferPreviewReady,
    previewReadyChange:y.transferPreviewReady-x.transferPreviewReady,
    nodeNameReplacements100:x.nodeNameReplacements,
    nodeNameReplacements200:y.nodeNameReplacements,
    addedOperationIds:y.operationIds.filter(id=>!x.operationIds.includes(id)),
    removedOperationIds:x.operationIds.filter(id=>!y.operationIds.includes(id)),
   }];
  }))]));
 console.log('METHOD_A_M1_TRANSFER_EFFECT',JSON.stringify(transferDiff));
 console.log('METHOD_A_M1_TOLERANCE_PASS',JSON.stringify({default100:{M1Pass:a.M1Pass,rows:a.M1ElementRows},
  custom200:{M1Pass:b.M1Pass,rows:b.M1ElementRows},
  originalSourcesUnchanged:true,mode:'M1_SPATIAL_CANDIDATE_SCORING_ONLY',
  transformedGeometryUnaffected:true,writerReadyGranted:false}));
}finally{
 setCiiMultiSourceMethodASpatialToleranceMm(save.spatialToleranceMm);
}
