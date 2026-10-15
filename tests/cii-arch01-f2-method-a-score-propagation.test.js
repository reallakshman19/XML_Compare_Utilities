/**
 * ARCH-01 F2 — actual Method A scoring propagation (not an identity oracle).
 * Hard gates are OD-scaled and independent of the user-visible M1 score setting.
 */
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
 ciiMethodAResidualScorePolicy,qualifyCiiGeometryTransform
} from '../tabs/cii-workspace/cii-workspace-geometry.js';
import {
 prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge,
} from '../tabs/cii-workspace/cii-workspace-source-set.js';

const fixture=base=>readFileSync(fileURLToPath(new URL('../Benchmark/'+base+'.CII',import.meta.url)));
const digest=value=>createHash('sha256').update(value).digest('hex');
const custody=Object.freeze({
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const pairs=[
 [[0,0,0],[0,0,0]],
 [[1000,0,0],[1000,0,0]],
 [[0,1000,0],[0,1000,0]],
 [[0,0,1000],[0,0,1010]],
].map(([source,target],i)=>({
 sourceNodeId:String(i+1),sourceOdMm:100,
 source:{x:source[0],y:source[1],z:source[2]},
 target:{x:target[0],y:target[1],z:target[2]},
}));
const at=toleranceMm=>qualifyCiiGeometryTransform(pairs,{spatialToleranceMm:toleranceMm});
const registered100=at(100),registered200=at(200);
assert.equal(registered100.status,'READY',registered100.reason);
assert.equal(registered200.status,'READY',registered200.reason);
assert.equal(registered100.mode,'RIGID_3D');
assert.equal(registered200.mode,'RIGID_3D');
assert.deepEqual(registered100.tolerancePolicy,registered200.tolerancePolicy,'OD admission policy must remain identical');
assert.deepEqual(registered100.basisComparisons,registered200.basisComparisons,'basis conflict checks must remain identical');
assert.deepEqual(registered100.basisHypotheses,registered200.basisHypotheses,'admissible physical basis scores must be independent');
assert.deepEqual(registered100.anchorIndexes,registered200.anchorIndexes);
assert.equal(registered100.maxResidualMm,registered200.maxResidualMm);
assert.equal(registered100.weight.residualScorePolicy.spatialToleranceMm,100);
assert.equal(registered200.weight.residualScorePolicy.spatialToleranceMm,200);
assert.equal(registered100.weight.residualScorePolicy.admissionNormalizedResidual,
 registered200.weight.residualScorePolicy.admissionNormalizedResidual);
assert.equal(registered200.weight.residualScorePolicy.normalizedResidualForScore,
 registered100.weight.residualScorePolicy.normalizedResidualForScore/2);
assert(registered200.weight.residualQuality>registered100.weight.residualQuality,
 '200 mm must actually change Method A residual score after OD admission');
assert(registered200.weight.total>registered100.weight.total,
 'actual qualified Method A 100-point base score must change');
for(const bad of [-1,0,201,NaN,Infinity,'not-a-number']){
 assert.throws(()=>ciiMethodAResidualScorePolicy({maxNormalizedResidual:0.1},{spatialToleranceMm:bad}),
  /METHOD_A_M1_SPATIAL_TOLERANCE_INVALID/);
}
assert.throws(()=>ciiMethodAResidualScorePolicy({maxNormalizedResidual:NaN},{spatialToleranceMm:100}),
 /METHOD_A_ADMITTED_RESIDUAL_REQUIRED/);
const invalid=pairs.map((item,i)=>i===3?{...item,target:{x:0,y:0,z:1600}}:item);
const rejected100=qualifyCiiGeometryTransform(invalid,{spatialToleranceMm:100});
const rejected200=qualifyCiiGeometryTransform(invalid,{spatialToleranceMm:200});
assert.notEqual(rejected100.status,'READY');
assert.equal(rejected200.status,rejected100.status,
 'doubling M1 score tolerance MUST NOT admit invalid SOURCE-OD rigid base');
assert.equal(rejected200.registeredWeight,0);
assert.deepEqual(
 ciiMethodAResidualScorePolicy({maxNormalizedResidual:0.3},{spatialToleranceMm:100}).normalizedResidualForScore,
 0.3,'100mm baseline residual score identity must stay exact');
console.log('CII_F2_SYNTHETIC_SCORE_AND_ADMISSION_PASS',JSON.stringify({
 qualifiedBase:{residualMm:registered100.maxResidualMm,
  baseScore100:registered100.weight.total,baseScore200:registered200.weight.total,
  confidence100:registered100.confidence,confidence200:registered200.confidence,
  residualQuality100:registered100.weight.residualQuality,
  residualQuality200:registered200.weight.residualQuality},
 invalidBase:{status100:rejected100.status,status200:rejected200.status},
 odAdmissionUnchanged:true,writerAuthorization:false,
}));
const sources=['S1','S2','S3'].map(sourceId=>({
 sourceId,fileName:sourceId+'.CII',bytes:fixture(sourceId),
}));
const targetBytes=fixture('T');
for(const source of sources)assert.equal(digest(source.bytes),custody[source.sourceId]);
assert.equal(digest(targetBytes),custody.T);
const inspect=async spatialToleranceMm=>{
 const {inspection}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
 {sources,targetBytes,targetFileName:'T.CII'},
 {cryptoRef:globalThis.crypto||webcrypto,spatialToleranceMm});
 const metrics={};
 for(const m of inspection.memberInspections){
  const seen=new Map();
  for(const suggestion of m.inspection.baseAnchorSuggestions||[]){
   const base=suggestion?.methodA?.bestBase;
   if(base?.baseId&&!seen.has(base.baseId))seen.set(base.baseId,base);
  }
  const ordered=[...seen.values()].sort((a,b)=>a.baseId.localeCompare(b.baseId));
  metrics[m.sourceId]=ordered.map(b=>({
   baseId:b.baseId,anchorCount:b.anchorCount,
   score:b.weight?.total??null,confidence:b.confidence,
   maxResidualMm:b.maxResidualMm,
   residualScoringToleranceMm:b.weight?.residualScorePolicy?.spatialToleranceMm??null,
  }));
 }
 return {sourceSetSha256:inspection.sourceSet.sourceSetSha256,metrics};
};
const original100=await inspect(100),original200=await inspect(200);
assert.equal(original100.sourceSetSha256,original200.sourceSetSha256);
assert.equal(original100.sourceSetSha256,
 '5390166aab9504880bd4514af865c914ba8a41ce2922e7d473311d62b10723a3');
const changes={};
for(const sourceId of ['S1','S2','S3']){
 const a=new Map(original100.metrics[sourceId].map(x=>[x.baseId,x]));
 const b=new Map(original200.metrics[sourceId].map(x=>[x.baseId,x]));
 changes[sourceId]={
  qualifiedBaseCount100:a.size,qualifiedBaseCount200:b.size,
  sharedBaseCount:[...a.keys()].filter(id=>b.has(id)).length,
  gradeChanges:[...a.entries()].filter(([id,row])=>b.has(id)&&row.confidence!==b.get(id).confidence)
   .map(([id,row])=>({id,from:row.confidence,to:b.get(id).confidence})),
  scoreChanges:[...a.entries()].filter(([id,row])=>b.has(id)&&row.score!==b.get(id).score)
   .map(([id,row])=>({id,score100:row.score,score200:b.get(id).score,
    residualMm:row.maxResidualMm})),
 };
}
console.log('CII_F2_ORIGINAL_BASE_SCORE_IMPACT',JSON.stringify({
 sourceSetSha256:original100.sourceSetSha256,bySource:changes,
 noHardcodedOracle:true,allOriginalBytesUnchanged:true,
 writerAuthorizedByThisTest:false,
}));
