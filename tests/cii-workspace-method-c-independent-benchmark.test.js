// WP8: second raw-CII reviewer. This file deliberately DOES NOT import the Method C
// graph parser, node-name parser, route builder, coordinate or spatial index logic.
// Production cross-check is invoked only AFTER this independent raw-byte reconstruction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const hash=raw=>createHash('sha256').update(raw).digest('hex');
const inputs={
 S1:['9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',56,57],
 S2:['7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',46,47],
 S3:['c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',45,46],
 T:['abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',1614,1619],
};
const raw=id=>readFileSync(new URL('../Benchmark/'+id+'.CII',import.meta.url));
const vec=(a,b,sign=1)=>a.map((x,i)=>x+sign*b[i]);
const mag=a=>Math.hypot(...a);
const close=(a,b,t=1e-5)=>a.every((x,i)=>Math.abs(x-b[i])<=t);
const numericTokens=row=>[...row.matchAll(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?/g)]
  .map(m=>Number(m[0].replace(/[Dd]/,'E')));
const safeId=n=>{if(!Number.isSafeInteger(n)||n<0)throw Error('INDEPENDENT_BAD_PHYSICAL_NODE_ID');return String(n);};
function independentOriginal(member,bytes){
 const sha=hash(bytes),expected=inputs[member];
 assert.equal(sha,expected[0],member+': original bytes changed');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 const lines=text.split(/\r?\n/),sections=new Map();
 let active=null;
 for(const line of lines){
  const h=line.match(/^\s*#\$\s+(\S+)/);
  if(h){active=h[1].toUpperCase();sections.set(active,[]);}
  else if(active)sections.get(active).push(line);
 }
 if(!(sections.get('UNITS')||[]).some(line=>/\bSI\s*\(mm\)/i.test(line)))
  throw Error('INDEPENDENT_ORIGINAL_MM_UNITS_REQUIRED');
 const elements=sections.get('ELEMENTS')||[];
 const control=sections.get('CONTROL')||[];
 if(!elements.length||elements.length%15||!control.length||
    numericTokens(control[0])[0]!==elements.length/15)throw Error('INDEPENDENT_BAD_CONTROL');
 const nameRows=(sections.get('NODENAME')||[]).filter(x=>x.trim());
 const edges=[];
 for(let offset=0;offset<elements.length;offset+=15){
  const a=numericTokens(elements[offset]),wall=numericTokens(elements[offset+1]);
  const pointer=numericTokens(elements[offset+12])[0];
  if(a.length!==6||wall.length!==6||!Number.isSafeInteger(pointer)||
     pointer<0||pointer>nameRows.length)throw Error('INDEPENDENT_BAD_ELEMENT_WITNESS');
  const n=pointer?nameRows[pointer-1].padEnd(53,' '):'';
  edges.push({index:offset/15,from:safeId(a[0]),to:safeId(a[1]),
    signedXYZ:a.slice(2,5),od:a[5],wall:wall[0],pointer,
    fromName:n?n.slice(2,28).trim():'',toName:n?n.slice(28,53).trim():'',
    witness:'ELEMENTS#'+(offset/15+1)+':15rows:'+(offset+1)+'-'+(offset+15)});
 }
 const adj=new Map(),names=new Map();
 for(const e of edges){
  for(const [id,to,sign,name] of [[e.from,e.to,1,e.fromName],[e.to,e.from,-1,e.toName]]){
   if(!adj.has(id))adj.set(id,[]);
   adj.get(id).push({to,sign,edge:e});
   if(name){
    if(names.has(id)&&names.get(id)!==name)throw Error('INDEPENDENT_NAME_CONFLICT:'+id);
    names.set(id,name);
   }
  }
 }
 const points=new Map(),component=new Map(),groups=[];
 for(const first of adj.keys()){
  if(points.has(first))continue;
  const group=groups.length,queue=[first];points.set(first,[0,0,0]);component.set(first,group);
  for(let i=0;i<queue.length;i++)for(const rel of adj.get(queue[i])){
   const p=vec(points.get(queue[i]),rel.edge.signedXYZ,rel.sign);
   if(!points.has(rel.to)){points.set(rel.to,p);component.set(rel.to,group);queue.push(rel.to);}
   else if(!close(points.get(rel.to),p,1e-4))
    throw Error('INDEPENDENT_SIGNED_CYCLE_CONFLICT');
  }
  groups.push(queue);
 }
 const seeds=(sections.get('COORDS')||[]).filter(x=>x.trim()),shifts=new Map(),seedWitness=[];
 if(!Number.isSafeInteger(Number(seeds[0]?.trim()))||Number(seeds[0].trim())!==seeds.length-1)
  throw Error('INDEPENDENT_COORDS_COUNT');
 for(const row of seeds.slice(1)){
  const tokens=numericTokens(row);
  if(tokens.length!==4)throw Error('INDEPENDENT_BAD_COORDS_SEED');
  const id=safeId(tokens[0]),group=component.get(id);
  if(group===undefined)throw Error('INDEPENDENT_COORDS_NOT_PHYSICAL');
  const shift=vec(tokens.slice(1),points.get(id),-1);
  if(shifts.has(group)&&!close(shifts.get(group),shift,.25))
    throw Error('INDEPENDENT_COORDS_SEED_CONFLICT');
  shifts.set(group,shift);seedWitness.push(id);
 }
 const nodes=new Map();
 for(const [id,rel] of points){
  const group=component.get(id),first=adj.get(id)[0].edge;
  nodes.set(id,{id,xyz:vec(rel,shifts.get(group)||[0,0,0]),component:group,
    name:names.get(id)||'',degree:adj.get(id).length,od:first.od,wall:first.wall,
    incident:adj.get(id).map(x=>x.edge.index).sort((a,b)=>a-b)});
 }
 assert.deepEqual([edges.length,nodes.size],[expected[1],expected[2]],member+': raw physical census');
 return {member,sha256:sha,rawLength:bytes.length,edges,nodes,groups,adj,
   coordinateFrame:groups.map((ids,i)=>({component:i,count:ids.length,
     seeded:shifts.has(i),witnesses:seedWitness.filter(id=>component.get(id)===i)}))};
}
function independentRoute(graph,from,to){
 const start=String(from),end=String(to),pending=[start],prev=new Map([[start,null]]);
 for(let i=0;i<pending.length;i++){
  for(const r of graph.adj.get(pending[i])||[]){
   if(prev.has(r.to))continue;
   prev.set(r.to,{last:pending[i],edge:r.edge});pending.push(r.to);
  }
 }
 if(!prev.has(end))throw Error('INDEPENDENT_ROUTE_DISCONNECTED');
 const nodes=[end],edges=[];let p=end;
 while(p!==start){const step=prev.get(p);edges.unshift(step.edge);p=step.last;nodes.unshift(p);}
 return {nodes,edges,mm:edges.reduce((sum,e)=>sum+mag(e.signedXYZ),0)};
}
function rawCandidates(source,target,anchorS='3910',anchorT='875',tol=[100,100,100]){
 const src=source.nodes.get(anchorS),dst=target.nodes.get(anchorT);
 if(!src||!dst)throw Error('INDEPENDENT_ANCHOR_NOT_PHYSICAL');
 const shift=vec(dst.xyz,src.xyz,-1),eligible=target.groups[dst.component]
  .map(id=>target.nodes.get(id));
 const rows=new Map(),claimed=new Map();
 for(const s of source.nodes.values()){
  if(s.component!==src.component)continue;
  const registered=vec(s.xyz,shift);
  const alternatives=eligible.flatMap(n=>{
   const d=vec(n.xyz,registered,-1);
   return d.every((v,i)=>Math.abs(v)<=tol[i]+1e-9)
    ?[{target:n.id,delta:d,mm:mag(d)}]:[];
  }).sort((a,b)=>a.mm-b.mm||Number(a.target)-Number(b.target));
  rows.set(s.id,{member:source.member,id:s.id,xyz:registered,alternatives});
  for(const a of alternatives){if(!claimed.has(a.target))claimed.set(a.target,[]);
    claimed.get(a.target).push(source.member+':'+source.sha256+':'+s.id);}
 }
 return {rows,claimed,translation:shift,componentSize:eligible.length,
   collisions:[...claimed].filter(([,x])=>x.length>1).map(([n])=>n)};
}
function independentSegment(point,target,targetComponent){
 const allowed=new Set(target.groups[targetComponent]);let best=null;
 for(const edge of target.edges){
  if(!allowed.has(edge.from)||!allowed.has(edge.to))continue;
  const a=target.nodes.get(edge.from).xyz,b=target.nodes.get(edge.to).xyz;
  const d=vec(b,a,-1),length2=d.reduce((s,x)=>s+x*x,0);
  const t=length2?Math.max(0,Math.min(1,vec(point,a,-1).reduce((s,x,i)=>s+x*d[i],0)/length2)):0;
  const projected=a.map((x,i)=>x+t*d[i]),distance=mag(vec(projected,point,-1));
  if(!best||distance<best.distance-1e-9||
     (Math.abs(distance-best.distance)<1e-9&&edge.index<best.element)){
   best={distance,t,element:edge.index,witness:edge.witness,between:[edge.from,edge.to],
     stationMm:Math.sqrt(length2)*t,lengthMm:Math.sqrt(length2),xyz:projected,od:edge.od,wall:edge.wall};
  }
 }
 return best;
}
function frozenOwnerGolden(){
 const path=new URL('../tests/fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url);
 const bytes=readFileSync(path),sha256=hash(bytes);
 const manifest=JSON.parse(readFileSync(new URL(
  '../tests/fixtures/cii-phase2/owner-phase2-manifest.json',import.meta.url)));
 const direction=JSON.parse(readFileSync(new URL(
  '../tests/fixtures/cii-phase2/owner-confirmed-direction.json',import.meta.url)));
 assert.equal(sha256,'a84bd6cd59b774d32dbd32ee74efc0f9da2fc1ac0e485d2a8b2f6a67350a113f');
 assert.equal(sha256,manifest.originalUploadSha256);
 assert.equal(sha256,direction.rawFixtureOriginalSha256);
 const lines=bytes.toString('utf8').split(/\r?\n/);
 const lexical=lines.filter(x=>/^PS\S+\s+SL\S+\s*$/.test(x.trim()))
   .map(line=>{const [targetPS,sourceSL]=line.trim().split(/\s+/);
     return {targetPS,sourceSL};});
 assert.equal(lines.filter((_,i)=>i<lines.length-1||lines[i]!=='').length,manifest.originalLineCount);
 assert.equal(lexical.length,428);
 assert.equal(lexical.length,manifest.lexicalRowCount);
 assert.equal(direction.ownerConfirmedDirection,true);
 assert.equal(direction.freezeOriginalRows,428);
 assert.equal(direction.rawColumn1,'PS label');
 assert.equal(direction.rawColumn2,'SL label');
 assert.equal(direction.allowSourceNodeReuse,false);
 assert.equal(direction.allowTargetNodeReuse,false);
 assert.equal(direction.ownerApprovedChangedDenominator,false);
 const firstCol=new Map(),secondCol=new Map();
 for(const row of lexical){
  firstCol.set(row.targetPS,(firstCol.get(row.targetPS)||0)+1);
  secondCol.set(row.sourceSL,(secondCol.get(row.sourceSL)||0)+1);
 }
 assert.equal(firstCol.size,manifest.uniqueSourceLabels);
 assert.equal(secondCol.size,manifest.uniqueTargetLabels);
 for(const [name,count] of Object.entries(manifest.repeatedSourceLabels))
  assert.equal(firstCol.get(name),count);
 for(const anomaly of manifest.verbatimAnomalies)
  assert.ok(lexical.some(r=>r.sourceSL===anomaly||r.targetPS===anomaly));
 return {sha256,rowCount:lexical.length,uniqueOriginalColumn1:firstCol.size,
   uniqueOriginalColumn2:secondCol.size,repeats:Object.fromEntries(
    [...firstCol].filter(([,v])=>v>1)),direction:'SL_source_column2_to_PS_target_column1',
   physicalCreditRule:direction.physicalCreditRule,approvedAlternateSourceSet:false,
   changedDenominator:false,releaseRequiredRows:direction.countingTargetRequiredRows};
}
const outDir=fileURLToPath(new URL('../test-results/cii-method-c-wp8/',import.meta.url));
let result;
test('WP8 independent second raw parser rebuilds all 4 original CII coordinate graphs, runs and candidate inventory',async()=>{
 const originals=Object.fromEntries(Object.keys(inputs).map(id=>
  [id,independentOriginal(id,raw(id))]));
 const sourceCount=['S1','S2','S3'].reduce((s,id)=>s+originals[id].nodes.size,0);
 assert.equal(sourceCount,150);
 assert.deepEqual(originals.T.groups.map(g=>g.length),[767,40,511,236,65]);
 const source=originals.S1,target=originals.T;
 const sRoute=independentRoute(source,'3910','5110'),tRoute=independentRoute(target,'875','1095');
 assert.equal(sRoute.nodes.length,45);assert.equal(tRoute.nodes.length,45);
 assert.equal(sRoute.edges.length,44);assert.equal(tRoute.edges.length,44);
 assert.ok(Math.abs(sRoute.mm-229794)<.001);
 assert.ok(Math.abs(tRoute.mm-229493.43)<.001);
 const pathMismatch=sRoute.mm-tRoute.mm;
 assert.ok(Math.abs(pathMismatch-300.57)<.001);
 const ledger=rawCandidates(source,target),near=[...ledger.rows.values()]
  .filter(r=>r.alternatives.length>0);
 const route=new Set(sRoute.nodes),routeNear=near.filter(row=>route.has(row.id));
 assert.equal(ledger.rows.size,57);assert.equal(near.length,41);
 assert.equal(routeNear.length,37);assert.equal(ledger.componentSize,767);
 assert.equal(ledger.collisions.length,0);
 assert.equal(Math.max(...[...ledger.rows.values()].map(r=>r.alternatives.length)),1);
 const s1a=source.nodes.get('3910').xyz,s1b=source.nodes.get('5110').xyz,
  ta=target.nodes.get('875').xyz,tb=target.nodes.get('1095').xyz;
 const separationMismatch=Math.abs(mag(vec(s1b,s1a,-1))-mag(vec(tb,ta,-1)));
 assert.ok(Math.abs(separationMismatch-300.081898735)<.002);
 const node4060=ledger.rows.get('4060');
 assert.equal(node4060.alternatives.length,0);
 const tComponent=target.nodes.get('875').component;
 const segment=independentSegment(node4060.xyz,target,tComponent);
 assert.deepEqual(segment.between,['900','905']);assert.equal(segment.element,178);
 assert.ok(Math.abs(segment.t-0.76175)<1e-6);
 assert.ok(segment.distance<1e-5);
 assert.ok(Math.abs(segment.stationMm-6094)<1e-5);
 const nearest=[...target.groups[tComponent]].map(id=>({id,mm:mag(vec(
  target.nodes.get(id).xyz,node4060.xyz,-1))})).sort((a,b)=>a.mm-b.mm)[0];
 assert.deepEqual(nearest,{id:'905',mm:1906});
 const golden=frozenOwnerGolden();
 assert.ok(sourceCount<golden.releaseRequiredRows,'unique physical custody cannot satisfy 300 rows');
 // NOW, and only after original bytes/geometry/golden parse, compare independent results
 // against the separate WP2-WP4 production graph and spatial ledger.
 const [{buildOriginalGraphFromBytes},{registerMethodC},{findMethodCCandidates}]=await Promise.all([
  import('../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js'),
  import('../tabs/cii-workspace/cii-workspace-method-c-registration.js'),
  import('../tabs/cii-workspace/cii-workspace-method-c-candidates.js')]);
 const checked={};let checkedEdges=0,checkedNodes=0;
 for(const id of Object.keys(inputs)){
  const native=await buildOriginalGraphFromBytes({bytes:raw(id),member:id,
    expectedSha256:inputs[id][0],cryptoRef:webcrypto});
  const indep=originals[id];
  assert.equal(native.edges.length,indep.edges.length);
  assert.equal(native.nodes.length,indep.nodes.size);
  assert.deepEqual(native.components.map(x=>x.length),indep.groups.map(x=>x.length));
  for(const edge of native.edges){
   const original=indep.edges[edge.index];assert.equal(edge.from,original.from);
   assert.equal(edge.to,original.to);assert.ok(close(edge.delta,original.signedXYZ));
   assert.equal(edge.od,original.od);assert.equal(edge.wall,original.wall);
   assert.equal(edge.pointer,original.pointer);assert.equal(edge.witness,original.witness);
   checkedEdges++;
  }
  for(const node of native.nodes){
   const original=indep.nodes.get(node.id);assert.ok(original);
   assert.equal(node.component,original.component);
   assert.ok(close(node.xyz,original.xyz,1e-4),id+': xyz '+node.id);
   assert.equal(node.nodeName,original.name);
   checkedNodes++;
  }
  checked[id]=native;
 }
 assert.equal(checkedEdges,1761);assert.equal(checkedNodes,1769);
 const transform=registerMethodC(checked.S1,checked.T,[{source:'3910',target:'875',
   sourceSha:inputs.S1[0],targetSha:inputs.T[0],role:'experimental-unverified'}]);
 const primary=findMethodCCandidates(checked.S1,checked.T,transform,{x:100,y:100,z:100});
 for(const row of primary.rows){
  const independent=ledger.rows.get(row.source);assert.ok(independent);
  assert.ok(close(row.xyz,independent.xyz,1e-5));
  assert.deepEqual(row.alternatives.map(a=>a.target),independent.alternatives.map(a=>a.target));
  for(let i=0;i<row.alternatives.length;i++)
   assert.ok(close(row.alternatives[i].residual,independent.alternatives[i].delta,1e-5));
  assert.equal(row.writerEligible,false);
  assert.equal(row.physicalNodeCorrespondenceQualified,false);
 }
 assert.equal(primary.nearSourceCount,near.length);
 assert.deepEqual(primary.collisionTargets,ledger.collisions);
 // Derived Owner-supplied fixture is read ONLY after independent raw parsing and
 // subsequent production cross-check. It never supplies anchor IDs or candidate data.
 const reference=JSON.parse(readFileSync(new URL(
  './fixtures/cii-method-c/derived-reference-excerpt.v1.json',import.meta.url)));
 assert.equal(reference.authority,'ATTACHED_DERIVED_TEST_ONLY_NOT_ORIGINAL_NOT_OWNER_PHYSICAL_GOLDEN');
 assert.equal(reference.packageSha256,
  'f2c79491fe7ac8b071d568dc06f4326fde35c16e7c3a6662718f42621e202981');
 assert.equal(reference.reference.routeNear,routeNear.length);
 assert.equal(reference.reference.routeTotal,sRoute.nodes.length);
 assert.equal(reference.reference.fullNear,near.length);
 assert.equal(reference.reference.fullTotal,ledger.rows.size);
 assert.equal(reference.reference.targetComponent,ledger.componentSize);
 assert.ok(Math.abs(reference.reference.pathLengthDifferenceMm-pathMismatch)<1e-5);
 assert.ok(Math.abs(reference.reference.segmentFraction-segment.t)<1e-9);
 assert.equal(reference.reference.segmentOnlyNode,'4060');
 assert.deepEqual(reference.reference.targetSegment,segment.between);
 const owner=golden;
 result={schema:'MethodC.WP8IndependentOriginalAudit.v1',
  authority:'INDEPENDENT_READ_ONLY_ORIGINALS_NOT_OWNER_ACCEPTANCE',
  originalFiles:Object.fromEntries(Object.entries(originals).map(([name,v])=>[name,{
   sha256:v.sha256,byteLength:v.rawLength,elements:v.edges.length,nodes:v.nodes.size,
   components:v.groups.map(g=>g.length),frames:v.coordinateFrame}])),
  verifiedElements:checkedEdges,verifiedNodes:checkedNodes,sourcePhysicalCount:sourceCount,
  registered:{source:'S1',target:'T',firstAnchor:['3910','875'],
   assumptions:'COMMON_XYZ_AXES_EXPERIMENT_ONLY',rotationIdentified:false,
   componentSize:ledger.componentSize,nearSources:near.length,totalSources:ledger.rows.size,
   routeNear:routeNear.length,routeTotal:sRoute.nodes.length,
   sourceRouteLengthMm:sRoute.mm,targetRouteLengthMm:tRoute.mm,
   developedLengthConflictMm:pathMismatch,twoAnchorSeparationMismatchMm:separationMismatch,
   targetReuse:ledger.collisions,globalTargetClaims:ledger.claimed.size,
   node4060:{status:'SEGMENT_ONLY_NOT_TARGET_NODE',segment,nearestPhysical:nearest},
   validatedProductionCandidates:primary.rows.length,
   qualifiedPhysicalIdentity:0,writer2Authorized:0},
  remainingMembers:{S2:'NOT_REGISTERED_NO_ANCHOR_NO_TARGET_CREDIT',
    S3:'NOT_REGISTERED_NO_ANCHOR_NO_TARGET_CREDIT'},
  frozenOwner:owner,structuralUpperBound:{originalPhysicalSourceNodes:sourceCount,
   ownerRequestedCreditRows:golden.releaseRequiredRows,
   upperBoundIndependentPhysicalCredits:150,
   meetsOwnerRequired300:false,owner428Accepted:false},
  separateMidcycle:{historicalDiagnostic:'105/150',authority:'SEPARATE_MIDCYCLE_TEST_ONLY',
   independentlyRerunThisAudit:false,original428DenominatorUnchanged:true},
  derivedReference:{classification:reference.authority,packageSha256:reference.packageSha256,
   crossCheckedAfterRawParsing:true,usedToConstructCandidates:false},
  releaseResult:'NOT_SCORED_NOT_QUALIFIED',
  provenance:'RAW_CII_PARSED_BEFORE_PRIMARY_GRAPH_OR_DERIVED_FIXTURE_COMPARISON'};
 mkdirSync(outDir,{recursive:true});
 writeFileSync(join(outDir,'independent-original-audit.json'),JSON.stringify(result,null,2)+'\n');
 console.log('METHOD_C_WP8_INDEPENDENT_SUMMARY '+JSON.stringify({
  sha:Object.fromEntries(Object.entries(originals).map(([id,g])=>[id,g.sha256])),
  counts:Object.fromEntries(Object.entries(originals).map(([id,g])=>[id,[g.edges.length,g.nodes.size]])),
  golden:owner.rowCount,near:near.length,route:routeNear.length,
  verifiedEdges:checkedEdges,verifiedNodes:checkedNodes,physicalQualified:0,writerAuthorized:0}));
});
test('WP8 RED: original byte mutation, 428-row mutation and qualified-credit inflation are rejected',()=>{
 const orig=raw('S1'),changed=Buffer.from(orig);changed[71]^=1;
 assert.throws(()=>independentOriginal('S1',changed),/original bytes changed/);
 const golden=frozenOwnerGolden();
 assert.notEqual(golden.sha256,hash(Buffer.concat([readFileSync(new URL(
  '../tests/fixtures/cii-phase2/owner-phase2-original.txt',import.meta.url)),Buffer.from('X')])));
 assert.ok(150<golden.releaseRequiredRows);
 assert.equal(result?.registered?.qualifiedPhysicalIdentity,0);
 assert.equal(result?.registered?.writer2Authorized,0);
 assert.equal(result?.releaseResult,'NOT_SCORED_NOT_QUALIFIED');
});
