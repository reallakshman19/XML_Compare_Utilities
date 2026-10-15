#!/usr/bin/env node
/**
 * CII #102 / CII102-F2-RCA-01: original-only, unanchored geometric discriminator.
 *
 * Select one ORIGINAL SOURCE ELEMENT with BOTH endpoint domains empty after
 * A2-05, per S1/S2/S3, deterministically from the canonical 147-factor report.
 * Independently enumerate target paths with physically comparable metrics.
 * This is NOT correspondence search/claim/certificate/Writer input; absent
 * TARGET anchor and global rigid registration make even a unique local path
 * unproved. No expected PS/SL Owner names are accepted or read.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve,relative} from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import {prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge}
  from '../tabs/cii-workspace/cii-workspace-source-set.js';

const h=bytes=>createHash('sha256').update(bytes).digest('hex');
const compare=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
const expected={
 S1:'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
 S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
 S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
 T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
const args=process.argv.slice(2), options={};
for(let i=0;i<args.length;i+=2) {
 const flag=args[i],value=args[i+1];
 if(!['--report','--out'].includes(flag)||!value||options[flag])
  throw Error('CII102_BAD_PROBE_ARGUMENT');
 options[flag]=value;
}
if(args.length!==4||!options['--report']||!options['--out'])
 throw Error('CII102_EXACT_INPUT_AND_OUTPUT_REQUIRED');
const reportBytes=readFileSync(resolve(options['--report']));
const report=JSON.parse(reportBytes.toString('utf8'));
if(report.schema!=='CiiARCH01F2JointSolverReport.v1'||report.writerReady!==false
 ||report.certifiedNodeCount!==0||report.originalPhysicalSourceNodeCount!==150
 ||report.originalPhysicalSourceElementCount!==147
 ||report.physicalGapLedger?.totalPhysicalSourceElements!==147
 ||report.physicalGapLedger?.currentEndpointMissingFactors!==33
 ||report.physicalGapLedger?.writerReady!==false
 ||report.physicalGapLedger?.rows?.length!==147)
 throw Error('CII102_EXPECT_CANONICAL_NONWRITING_ORIGINAL_REPORT');
for(const [member,digest] of Object.entries(expected)) {
 const actual=member==='T'?report.custody.originalTargetSha256:report.custody.originalSourceShaById?.[member];
 if(actual!==digest)throw Error('CII102_REPORT_ORIGINAL_INPUT_CUSTODY_DRIFT:'+member);
}
const doubleMissingRows=report.physicalGapLedger.rows.filter(row=>
 row.recheckedStatus==='ENDPOINT_CANDIDATE_MISSING'
 &&row.endpointDiagnosis?.length===2&&row.endpointDiagnosis.every(e=>e.missingAfter));
const doubleBlankByMember=Object.fromEntries(['S1','S2','S3'].map(member=>[
 member,doubleMissingRows.filter(row=>row.sourceMember===member).length
]));
if(doubleMissingRows.length!==21||JSON.stringify(doubleBlankByMember)!==
 JSON.stringify({S1:15,S2:3,S3:3}))
 throw Error('CII102_DOUBLE_BLANK_ORIGINAL_CENSUS_DRIFT');
function clusters(member){
 const rows=doubleMissingRows.filter(r=>r.sourceMember===member);
 const incident=new Map();
 for(const r of rows)for(const end of r.sourceEndpoints){
  if(!incident.has(end))incident.set(end,[]);
  incident.get(end).push(r);
 }
 const seen=new Set(),groups=[];
 for(const row of rows){
  if(seen.has(row.sourceElementKey))continue;
  const work=[row],keys=[];
  seen.add(row.sourceElementKey);
  while(work.length){
   const current=work.pop();
   keys.push(current.sourceElementKey);
   for(const end of current.sourceEndpoints)for(const next of incident.get(end)||[]){
    if(!seen.has(next.sourceElementKey)){
     seen.add(next.sourceElementKey);work.push(next);
    }
   }
  }
  groups.push({physicalFactorCount:keys.length,
   sourceElementKeys:keys.sort(compare)});
 }
 return groups.sort((a,b)=>b.physicalFactorCount-a.physicalFactorCount
  ||compare(a.sourceElementKeys[0],b.sourceElementKeys[0]));
}
const doubleBlankClusters=Object.fromEntries(['S1','S2','S3'].map(m=>[m,clusters(m)]));
const selected=['S1','S2','S3'].map(member=>{
 const options=doubleMissingRows.filter(row=>row.sourceMember===member);
 options.sort((a,b)=>compare(a.sourceElementId,b.sourceElementId));
 if(!options.length)throw Error('CII102_SOURCE_NO_DOUBLE_BLANK_FACTOR:'+member);
 const row=options[0];
 if(row.endpointDiagnosis.some(e=>e.originalTargets.length||e.recheckedTargets.length)
   ||row.recheckedCandidatePairCount!==0
   ||row.recheckedPathWitnesses!==0
   ||row.originalRootCause!=='BOTH_ENDPOINT_HYPOTHESES_ABSENT')
  throw Error('CII102_SELECTED_FACTOR_NOT_GENUINELY_DOUBLE_BLANK:'+member);
 return row;
});
const sources=['S1','S2','S3'].map(sourceId=>{
 const bytes=readFileSync(resolve('Benchmark/'+sourceId+'.CII'));
 if(h(bytes)!==expected[sourceId])throw Error('CII102_SOURCE_BYTES_DIFFER:'+sourceId);
 return {sourceId,fileName:sourceId+'.CII',bytes};
});
const targetBytes=readFileSync(resolve('Benchmark/T.CII'));
if(h(targetBytes)!==expected.T)throw Error('CII102_TARGET_BYTES_DIFFER');
const {preparedSession}=await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
 {sources,targetBytes,targetFileName:'T.CII'},{cryptoRef:globalThis.crypto||webcrypto}
);
const sourceGraphs=Object.fromEntries(preparedSession.members.map(m=>[m.sourceId,m.sourceGraph]));
const target=preparedSession.target.targetGraph;
if(target.side!=='TARGET'||!(target.adjacency instanceof Map))
 throw Error('CII102_TARGET_GRAPH_NOT_CANONICAL');
const BUDGET=150000,MAX_STEPS=4,EPSILON_MM=25,MIN_STRAIGHT=0.995;
function shape(edge){
 const length=Number(edge.lengthMm),vector=[Number(edge.dx),Number(edge.dy),Number(edge.dz)];
 return {kind:String(edge.componentKind||'PIPE'),lengthMm:length,
  diameterMm:Number(edge.diameter),wallMm:Number(edge.wall),
  deltaMm:vector,
  sourceVectorNormMm:Math.hypot(...vector)};
}
function geometricPaths(sourceEdge){
 const source=shape(sourceEdge);
 if(!Number.isFinite(source.lengthMm)||source.lengthMm<=0
   ||source.deltaMm.some(n=>!Number.isFinite(n)))
  throw Error('CII102_INVALID_SOURCE_GEOMETRY:'+sourceEdge.elementId);
 const all=new Map(),reasons={},stats={visits:0,complete:true,seenGeometryRoutes:0,acceptedRoutes:0};
 const count=reason=>{reasons[reason]=(reasons[reason]||0)+1;};
 const graph=target.adjacency;
 // Traverse each original TARGET physical node, not just existing accepted
 // candidate endpoints: BOTH source endpoints currently have no seed.
 const starts=[...graph.keys()].sort(compare);
 const dfs=(origin,node,steps,visited,sum,vector)=>{
  if(!stats.complete)return;
  if(stats.visits>=BUDGET){stats.complete=false;return;}
  stats.visits++;
  if(steps.length){
   stats.seenGeometryRoutes++;
   const endpoint=node;
   const straight=Math.hypot(...vector)/Math.max(sum,1);
   const residual=Math.abs(sum-source.lengthMm);
   const sourceStraight=source.sourceVectorNormMm/source.lengthMm;
   const kindOk=steps.every(step=>String(step.edge.componentKind||'PIPE')===source.kind);
   const valid=kindOk&&residual<=EPSILON_MM
     &&(steps.length===1||(
       source.kind==='PIPE'&&straight>=MIN_STRAIGHT&&Math.abs(straight-sourceStraight)<=0.01));
   if(valid){
    const route=steps.map(x=>String(x.edge.elementId));
    const reversed=[...route].reverse();
    const routeId=[JSON.stringify(route),JSON.stringify(reversed)].sort()[0];
    if(!all.has(routeId)){
     const deltaOd=steps.map(x=>Math.abs(Number(x.edge.diameter)-source.diameterMm));
     const deltaWall=steps.map(x=>Math.abs(Number(x.edge.wall)-source.wallMm));
     all.set(routeId,{
      targetEndpoints:[origin,endpoint].sort(compare),
      targetElementIds:route,
      targetNodePath:[origin,...steps.map(x=>x.to)],
      lengthMm:Number(sum.toFixed(3)),
      lengthResidualMm:Number(residual.toFixed(3)),segments:steps.length,
      targetStraightness:Number(straight.toFixed(6)),
      originalSourceStraightness:Number(sourceStraight.toFixed(6)),
      odRevisionWarning:deltaOd.some(x=>x>2),
      wallRevisionWarning:deltaWall.some(x=>x>1),
      identityCertified:false,writerReady:false,
     });
    }
   }else count(!kindOk?'COMPONENT_KIND_DIFFERS':
      residual>EPSILON_MM?'PATH_LENGTH_MISMATCH':
      steps.length>1&&source.kind!=='PIPE'?'NONPIPE_SUBDIVISION':
      'SUBDIVISION_STRAIGHTNESS_MISMATCH');
   if(steps.length>=MAX_STEPS)return;
  }
  // No internal branch traversal, matching the bounded physical contract.
  if(steps.length>0&&(graph.get(node)||[]).length!==2){
   count('BRANCH_INTERIOR_NOT_ALLOWED');return;
  }
  for(const edge of [...(graph.get(node)||[])].sort((a,b)=>compare(a.elementId,b.elementId))){
   const next=String(edge.from)===node?String(edge.to):String(edge.from);
   if(visited.has(next))continue;
   const len=Number(edge.lengthMm);
   if(!Number.isFinite(len)||len<=0){count('INVALID_TARGET_EDGE_LENGTH');continue;}
   if(sum+len>source.lengthMm+EPSILON_MM){count('TARGET_PATH_EXCEEDS_LENGTH_BOUND');continue;}
   const sign=String(edge.from)===node?1:-1;
   const newVector=[vector[0]+Number(edge.dx)*sign,vector[1]+Number(edge.dy)*sign,vector[2]+Number(edge.dz)*sign];
   visited.add(next);
   dfs(origin,next,[...steps,{edge,from:node,to:next}],visited,sum+len,newVector);
   visited.delete(next);
   if(!stats.complete)return;
  }
 };
 for(const start of starts){
  if(!stats.complete)break;
  dfs(start,start,[],new Set([start]),0,[0,0,0]);
 }
 const paths=[...all.values()].sort((a,b)=>a.lengthResidualMm-b.lengthResidualMm
   ||a.segments-b.segments||compare(a.targetElementIds.join(','),b.targetElementIds.join(',')));
 stats.acceptedRoutes=paths.length;
 return {sourceGeometry:source,stats,rejectionReasonObservations:reasons,allRoutes:paths,
  evidenceStatus:stats.complete?'BOUNDED_ENUMERATION_COMPLETE_UNANCHORED_NOT_CERTIFIED':
   'SEARCH_BUDGET_EXHAUSTED_NO_ABSENCE_CLAIM'};
}
// Frozen, original-source-bound NODE custody; never Writer input.
const sourceNodeDomains=new Map();
for(const factor of report.physicalGapLedger.rows)for(const endpoint of factor.endpointDiagnosis){
 const key=endpoint.sourceNodeKey,targets=[...endpoint.recheckedTargets].map(String).sort(compare);
 if(sourceNodeDomains.has(key)&&JSON.stringify(sourceNodeDomains.get(key))!==JSON.stringify(targets))
  throw Error('CII102_INCONSISTENT_NODE_DOMAIN:'+key);
 sourceNodeDomains.set(key,targets);
}
if(sourceNodeDomains.size!==150)throw Error('CII102_INCOMPLETE_150_NODE_CENSUS');
const targetClaimers=new Map();
for(const [sourceNode,targets] of sourceNodeDomains)for(const targetNode of targets){
 if(!targetClaimers.has(targetNode))targetClaimers.set(targetNode,new Set());
 targetClaimers.get(targetNode).add(sourceNode);
}
const owners=targetNode=>[...(targetClaimers.get(String(targetNode))||[])].sort(compare);
const geometryCache=new Map();
function inspectOriginalGeometry(member,edge){
 const k=member+':'+String(edge.elementId);
 if(geometryCache.has(k))return geometryCache.get(k);
 let result;
 try{result=geometricPaths(edge);}catch(e){
  if(!String(e.message).startsWith('CII102_INVALID_SOURCE_GEOMETRY:'))throw e;
  result={sourceGeometry:shape(edge),
   stats:{visits:0,complete:false,seenGeometryRoutes:0,acceptedRoutes:0},
   rejectionReasonObservations:{INVALID_SOURCE_GEOMETRY:1},
   allRoutes:[],evidenceStatus:'INVALID_SOURCE_GEOMETRY_CANNOT_TEST_TARGET_ABSENCE'};
 }
 geometryCache.set(k,result);
 return result;
}
const allCases=doubleMissingRows.slice()
 .sort((a,b)=>compare(a.sourceMember,b.sourceMember)||compare(a.sourceElementId,b.sourceElementId))
 .map(row=>{
 const graph=sourceGraphs[row.sourceMember];
 const edge=graph.edges.find(x=>String(x.elementId)===String(row.sourceElementId));
 if(!edge||String(edge.from)!==String(row.sourceEndpoints[0])
  ||String(edge.to)!==String(row.sourceEndpoints[1]))
  throw Error('CII102_ORIGINAL_EDGE_IDENTITY_DRIFT:'+row.sourceElementKey);
 const neighbors=row.sourceEndpoints.map(id=>({
  sourceNodeId:id,sourceDegree:(graph.adjacency.get(id)||[]).length,
  otherSourceElements:(graph.adjacency.get(id)||[]).map(e=>String(e.elementId))
   .filter(k=>k!==String(edge.elementId)).sort(compare)
 }));
 const result=inspectOriginalGeometry(row.sourceMember,edge);
 // Test immediate SOURCE neighbors that already have a TARGET candidate on
 // their far endpoint. Compare only original physical paths reachable from the
 // existing seed; never insert these diagnostic observations into A2 domains.
 const boundary=[];
 for(const missingEndpoint of row.sourceEndpoints){
  for(const adjacent of graph.adjacency.get(missingEndpoint)||[]){
   if(String(adjacent.elementId)===String(edge.elementId))continue;
   const sourceOther=String(adjacent.from)===missingEndpoint
     ?String(adjacent.to):String(adjacent.from);
   const neighborFactor=report.physicalGapLedger.rows.find(r=>
     r.sourceMember===row.sourceMember&&String(r.sourceElementId)===String(adjacent.elementId));
   if(!neighborFactor)throw Error('CII102_ADJACENT_FACTOR_MISSING');
   const otherDiagnosis=neighborFactor.endpointDiagnosis.find(e=>
     e.sourceNodeKey===row.sourceMember+':'+sourceOther);
   if(!otherDiagnosis)throw Error('CII102_NEIGHBOR_SOURCE_DOMAIN_MISSING');
   const seeds=[...otherDiagnosis.recheckedTargets];
   const originalSeeds=[...otherDiagnosis.originalTargets];
   const recoveredUnverifiedSeeds=seeds.filter(t=>!originalSeeds.includes(t));
   const candidate=seeds.length?inspectOriginalGeometry(row.sourceMember,adjacent):null;
   const continuation=[];
   for(const targetSeed of seeds){
    const rooted=(candidate?.allRoutes||[]).filter(p=>p.targetEndpoints.includes(targetSeed));
    const candidateMissingNodeTargets=[...new Set(rooted.map(p=>
      p.targetEndpoints.find(n=>n!==targetSeed)))].sort(compare);
    continuation.push({
     existingTargetSeed:targetSeed,
     existingTargetSeedOtherClaimers:owners(targetSeed).filter(n=>n!==row.sourceMember+':'+sourceOther),
     independentlyCompatibleAnchoredRoutes:rooted.length,
     candidateMissingNodeTargets,
     proposedTargetNodeCustody:candidateMissingNodeTargets.map(targetNodeId=>({
      targetNodeId,claimedByOtherSourceNodes:owners(targetNodeId)
       .filter(n=>n!==row.sourceMember+':'+missingEndpoint),
      unclaimedTargetDoesNotProveOriginalIdentity:true
     })),
     targetRouteExamples:rooted.slice(0,5).map(p=>({
       targetEndpoints:p.targetEndpoints,targetElementIds:p.targetElementIds,
       lengthResidualMm:p.lengthResidualMm,segments:p.segments,
     })),
     completeOriginalTargetEnumeration:candidate?.stats.complete===true,
    });
   }
   boundary.push({
    viaSourceElementId:String(adjacent.elementId),
    missingSourceEndpoint:missingEndpoint,seedSourceNodeId:sourceOther,
    existingTargetSeedCount:seeds.length,existingTargetSeedIds:seeds,
    originalTargetSeedIds:originalSeeds,
    newlyRecoveredUnverifiedTargetSeedIds:recoveredUnverifiedSeeds,
    seedLineage:originalSeeds.length?'CONTAINS_ORIGINAL_CANDIDATE':
      recoveredUnverifiedSeeds.length?'RECOVERED_SPECULATIVE_FRONTIER_ONLY':'NO_TARGET_SEED',
    seedBoundaryGeometry:shape(adjacent),continuations:continuation,
    qualification:'PHYSICAL_PATH_PROBE_ONLY_NO_NEW_HYPOTHESIS',
   });
  }
 }
 boundary.sort((a,b)=>compare(a.viaSourceElementId,b.viaSourceElementId));
 return {member:row.sourceMember,sourceElementKey:row.sourceElementKey,
  sourceEndpoints:row.sourceEndpoints,endpointNeighborEvidence:neighbors,
  sourceGeometry:result.sourceGeometry,
  adjacentSeedBoundaryAnalysis:boundary,
  boundaryDiagnosis:(()=>{
   const root=boundary.flatMap(b=>b.continuations);
   const routes=root.reduce((s,x)=>s+x.independentlyCompatibleAnchoredRoutes,0);
   const originalRooted=boundary.reduce((sum,b)=>sum+b.continuations
    .filter(x=>b.originalTargetSeedIds.includes(x.existingTargetSeed))
    .reduce((v,x)=>v+x.independentlyCompatibleAnchoredRoutes,0),0);
   const recoveredRooted=boundary.reduce((sum,b)=>sum+b.continuations
    .filter(x=>b.newlyRecoveredUnverifiedTargetSeedIds.includes(x.existingTargetSeed))
    .reduce((v,x)=>v+x.independentlyCompatibleAnchoredRoutes,0),0);
   if(!root.length)return 'NO_IMMEDIATE_TARGET_SEED_REQUIRES_INDEPENDENT_COMPONENT_BASIS';
   if(!routes)return 'CURRENT_SEEDS_WITH_NO_BOUNDED_ROOTED_PHYSICAL_PATH';
   if(recoveredRooted&&originalRooted===0)return 'ONLY_UNVERIFIED_RECOVERED_SEEDS_HAVE_ROOTED_PATHS';
   return 'ROOTED_PATHS_REQUIRE_INDEPENDENT_GLOBAL_IDENTITY_NO_CERTIFICATE';
  })(),
  originalCause:row.originalRootCause,originalTargets:row.endpointDiagnosis.map(e=>e.originalTargets),
  currentTargets:row.endpointDiagnosis.map(e=>e.recheckedTargets),
  unanchoredGeometry:result.evidenceStatus,
  searchPolicy:{maxSegments:MAX_STEPS,maxVisits:BUDGET,lengthToleranceMm:EPSILON_MM,
   minTargetStraightness:MIN_STRAIGHT,usesOriginalTarget:true,globalRigidFrameAttested:false},
  searchStats:result.stats,
  targetRoutesWithGeometryOnly:result.allRoutes.length,
  originalRoutesWithGeometryOnly:result.allRoutes.slice(0,12),
  allCandidateRouteDigest:h(JSON.stringify(result.allRoutes)),
  relativeRouteCounts:{singleSegment:result.allRoutes.filter(p=>p.segments===1).length,
   subdivided:result.allRoutes.filter(p=>p.segments>1).length,
   odWarnings:result.allRoutes.filter(p=>p.odRevisionWarning).length,
   wallWarnings:result.allRoutes.filter(p=>p.wallRevisionWarning).length},
  geometryRankCannotBindSourceToTarget:true,
  independentIdentityCertificate:null,writerReady:false,
  nextDecision:!result.stats.complete?'SEARCH_BUDGET_EXHAUSTED_REMAIN_UNKNOWN':
   !result.allRoutes.length?'NO_BOUNDED_GEOMETRIC_TARGET_ROUTE_REMAIN_UNKNOWN':
   'PHYSICALLY_PLAUSIBLE_UNANCHORED_ROUTES_REQUIRE_INDEPENDENT_REGISTRATION_AND_UNIQUENESS',
  rejectionReasonObservations:result.rejectionReasonObservations
 };
});
if(allCases.length!==doubleMissingRows.length||new Set(allCases.map(x=>x.sourceElementKey)).size!==21)
 throw Error('CII102_POPULATION_DIAGNOSIS_NOT_EXHAUSTIVE');
const cases=selected.map(row=>{
 const matching=allCases.filter(c=>c.sourceElementKey===row.sourceElementKey);
 if(matching.length!==1)throw Error('CII102_SELECTED_CASE_DIAGNOSIS_MISSING');
 return matching[0];
});
const populationSummary=Object.fromEntries(['S1','S2','S3'].map(member=>{
 const part=allCases.filter(c=>c.member===member);
 const states={};
 for(const c of part)states[c.boundaryDiagnosis]=(states[c.boundaryDiagnosis]||0)+1;
 return [member,{
  factors:part.length,
  independentlyEnumeratedUnanchoredRoutes:part.reduce((a,c)=>a+c.targetRoutesWithGeometryOnly,0),
  allOriginalTargetSearchesComplete:part.every(c=>c.searchStats.complete),
  sourceGeometryNotTestable:part.filter(c=>c.unanchoredGeometry.startsWith('INVALID_SOURCE_GEOMETRY')).length,
  boundaryStates:states,
 }];
}));
const output={
 schema:'CII102F2DoubleBlankGeometryProbe.v1',authority:'READ_ONLY_DIAGNOSTIC_NO_CORRESPONDENCE',
 originalReportSha256:h(reportBytes), originalSourceShaById:Object.fromEntries(sources.map(s=>[s.sourceId,h(s.bytes)])),
 originalTargetSha256:h(targetBytes),sourceSetSha256:report.custody.sourceSetSha256,
 policySource:'INDEPENDENT_25MM_A2_PHYSICAL_PATH_GEOMETRY_NOT_METHOD_A_100_200',
 originalPhysicalSourceNodes:150,originalPhysicalSourceElements:147,
 originalDoubleBlankFactors:doubleMissingRows.length,
 doubleBlankByMember,doubleBlankClusters,populationSummary,
 allDoubleBlankFactorCases:allCases,selectedSourceFactors:cases,
 physicalCertifications:0,writerReady:false,transferPlan:null,writeScope:null,
 limitations:[
  'An unanchored geometric route is never SOURCE_TARGET_CORRESPONDENCE',
  'No independently attested global 3D rigid registration or target identity',
  'Target routes are within declared segment/length/search bounds only',
  'OD and wall are engineering revision warnings, not identity hard veto',
  'Owner lexical expected relation list is not read, never an oracle for candidate generation',
  '100/200 Method A score settings do not alter this independent 25mm physical path enumeration'
 ]
};
const dest=resolve(options['--out']);
const rel=relative(process.cwd(),dest).replaceAll('\\','/');
if(rel==='Benchmark'||rel.startsWith('Benchmark/')||rel.startsWith('../')||rel.startsWith('/')||rel==='.')
 throw Error('CII102_PROBE_MAY_NOT_OVERWRITE_ORIGINALS_OR_LEAVE_REPO');
mkdirSync(dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(output,null,2)+'\n','utf8');
console.log('CII102_DOUBLE_BLANK_GEOMETRY_PROBE',JSON.stringify({
 originalReportSha256:output.originalReportSha256,
 populationSummary:output.populationSummary,
 cases:cases.map(c=>({source:c.member,key:c.sourceElementKey,endpoints:c.sourceEndpoints,
  sourceGeometry:c.sourceGeometry,sourceDegrees:c.endpointNeighborEvidence.map(n=>n.sourceDegree),
  unanchoredTargetRoutes:c.targetRoutesWithGeometryOnly,segments:c.relativeRouteCounts,
  anchoredNeighbors:c.adjacentSeedBoundaryAnalysis.map(b=>({
   sourceEdge:b.viaSourceElementId,sourceSeed:b.seedSourceNodeId,
   targetSeedCount:b.existingTargetSeedCount,originalTargetSeedCount:b.originalTargetSeedIds.length,
   recoveredUnverifiedCount:b.newlyRecoveredUnverifiedTargetSeedIds.length,
   seedLineage:b.seedLineage,rootedRouteCounts:b.continuations.map(x=>
    ({seed:x.existingTargetSeed,routes:x.independentlyCompatibleAnchoredRoutes,
      claimedAlternatives:x.proposedTargetNodeCustody.filter(
        t=>t.claimedByOtherSourceNodes.length>0).length,
      unclaimedAlternatives:x.proposedTargetNodeCustody.filter(
        t=>t.claimedByOtherSourceNodes.length===0).length})),
  })),
  visits:c.searchStats.visits,enumerationComplete:c.searchStats.complete,
  boundaryDiagnosis:c.boundaryDiagnosis,decision:c.nextDecision})),
 certified:0,writerReady:false
}));
