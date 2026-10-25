/**
 * CII #102 independent forensic control, TEST ONLY.
 * Replays complete SOURCE chains against every TARGET physical NODE.
 *
 * Not a production matcher, certificate, Writer input, or golden-answer source.
 * Expected TARGET IDs appear ONLY in post-search assertions. A bounded
 * search is marked incomplete rather than turning its first result into truth.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parse} from '../parser/caesar-parser.js';

const expectedSha = Object.freeze({
  S2:'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  S3:'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  T:'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const options = Object.freeze({
  maxSegmentsPerSourceElement:3,
  maxSearchStates:30000,
  lengthToleranceMm:25,
  minimumSubdivisionCosine:0.995,
  exactOdToleranceMm:0.01,
});
function graph(name) {
  const bytes=readFileSync(fileURLToPath(new URL('../Benchmark/'+name+'.CII',import.meta.url)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expectedSha[name],
    'original fixture SHA changed: '+name);
  const parsed=parse(bytes.toString('utf8'),name+'.accdb');
  assert(parsed.elements.length>0,'no original ELEMENTS: '+name);
  const adjacency=new Map();
  for (const e of parsed.elements) {
    const edge=Object.freeze({
      id:String(e.index),from:String(e.from),to:String(e.to),
      lengthMm:Math.hypot(Number(e.dx),Number(e.dy),Number(e.dz)),
      vector:Object.freeze([Number(e.dx),Number(e.dy),Number(e.dz)]),
      odMm:Number(e.od),wallMm:Number(e.wall),
    });
    for (const node of [edge.from,edge.to]) {
      if (!adjacency.has(node)) adjacency.set(node,[]);
      adjacency.get(node).push(edge);
    }
  }
  return Object.freeze({adjacency,elementCount:parsed.elements.length,
    nodeCount:adjacency.size});
}
function sourceEdges(source,sourceNodes) {
  const result=[];
  for(let i=1;i<sourceNodes.length;i++){
    const from=String(sourceNodes[i-1]),to=String(sourceNodes[i]);
    const edge=(source.adjacency.get(from)||[]).find(e=>
      (e.from===from&&e.to===to)||(e.from===to&&e.to===from));
    assert(edge,'missing original SOURCE edge '+from+'->'+to);
    result.push(edge);
  }
  return result;
}
function nextNode(edge,node){return edge.from===node?edge.to:edge.from;}
function orientedVector(edge,node){
  const sign=edge.from===node?1:-1;
  return edge.vector.map(v=>v*sign);
}
function cosine(a,b){
  const denom=Math.hypot(...a)*Math.hypot(...b);
  return denom>0?a.reduce((total,n,i)=>total+n*b[i],0)/denom:-1;
}
function routesForOneSourceElement(target,start,sourceEdge,globalUsed,policy){
  const found=[];
  function walk(node,steps,used,visited,lengthMm,lastVector){
    if(steps.length>0&&Math.abs(lengthMm-sourceEdge.lengthMm)<=policy.lengthToleranceMm){
      found.push(Object.freeze({endpoint:node,steps:Object.freeze([...steps])}));
      return;
    }
    if(steps.length>=policy.maxSegmentsPerSourceElement
      ||lengthMm>sourceEdge.lengthMm+policy.lengthToleranceMm)return;
    for(const edge of target.adjacency.get(node)||[]){
      if(globalUsed.has(edge.id)||used.has(edge.id))continue;
      if(policy.requireExactOd&&
        Math.abs(edge.odMm-sourceEdge.odMm)>policy.exactOdToleranceMm)continue;
      const next=nextNode(edge,node);
      if(visited.has(next))continue;
      const vector=orientedVector(edge,node);
      if(steps.length&&((target.adjacency.get(node)||[]).length!==2
        ||cosine(lastVector,vector)<policy.minimumSubdivisionCosine))continue;
      const segment=Object.freeze({edgeId:edge.id,to:next,odMm:edge.odMm,
        wallMm:edge.wallMm,lengthMm:edge.lengthMm});
      walk(next,[...steps,segment],new Set([...used,edge.id]),
        new Set([...visited,next]),lengthMm+edge.lengthMm,vector);
    }
  }
  walk(start,[],new Set(),new Set([start]),0,null);
  return found;
}
function enumerateCompleteOriginalChains(source,target,sourceNodes,policy){
  const sourceChain=sourceEdges(source,sourceNodes);
  let states=[...target.adjacency.keys()].map(node=>({
    start:node,at:node,used:new Set(),visited:new Set([node]),path:[],
  }));
  const remainingPerSourceEdge=[];
  for(let i=0;i<sourceChain.length;i++){
    const next=[];
    for(const state of states){
      for(const route of routesForOneSourceElement(target,state.at,sourceChain[i],
        state.used,policy)){
        if(route.steps.some(step=>state.visited.has(step.to)))continue;
        const visited=new Set(state.visited);
        for(const step of route.steps)visited.add(step.to);
        const used=new Set(state.used);
        for(const step of route.steps)used.add(step.edgeId);
        next.push({start:state.start,at:route.endpoint,used,visited,
          path:[...state.path,Object.freeze({
            sourceFrom:String(sourceNodes[i]),sourceTo:String(sourceNodes[i+1]),
            targetNodes:[state.at,...route.steps.map(s=>s.to)],
            targetElementIds:route.steps.map(s=>s.edgeId),
            odDifferencesMm:route.steps.map(s=>
              Number(Math.abs(s.odMm-sourceChain[i].odMm).toFixed(2))),
          })]});
        if(next.length>policy.maxSearchStates)throw Error(
          'CII102_CHAIN_SEARCH_INCOMPLETE_STATE_BUDGET; never infer uniqueness');
      }
    }
    states=next;
    remainingPerSourceEdge.push(states.length);
    if(!states.length)break;
  }
  return Object.freeze({complete:remainingPerSourceEdge.length===sourceChain.length,
    chains:Object.freeze(states.map(s=>Object.freeze({
      firstTargetNode:s.start,lastTargetNode:s.at,path:Object.freeze(s.path),
    }))),
    exploredSourceElements:remainingPerSourceEdge.length,
    expectedSourceElements:sourceChain.length,
    remainingPerSourceEdge:Object.freeze(remainingPerSourceEdge),
    boundedSearchComplete:true,
    identityIndependentlyCertified:false,writerEligible:false,
  });
}

const s2=graph('S2'),s3=graph('S3'),t=graph('T');
assert.deepEqual([s2.nodeCount,s2.elementCount],[47,46]);
assert.deepEqual([s3.nodeCount,s3.elementCount],[46,45]);
assert.deepEqual([t.nodeCount,t.elementCount],[1619,1614]);
const s2Nodes=['420','440','450','470','480','500','510','540','560','570'];
const s3Nodes=['1560','1580','1590','1600','1610','1620','1640',
  '1650','1660','1670','1680','1690'];
const s2WithOd=enumerateCompleteOriginalChains(s2,t,s2Nodes,
  {...options,requireExactOd:true});
const s2Revision=enumerateCompleteOriginalChains(s2,t,s2Nodes,
  {...options,requireExactOd:false});
const s3WithOd=enumerateCompleteOriginalChains(s3,t,s3Nodes,
  {...options,requireExactOd:true});
const s3Revision=enumerateCompleteOriginalChains(s3,t,s3Nodes,
  {...options,requireExactOd:false});

for(const result of [s2WithOd,s2Revision,s3WithOd,s3Revision]){
  assert.equal(result.complete,true);
  assert.equal(result.boundedSearchComplete,true);
  assert.equal(result.identityIndependentlyCertified,false);
  assert.equal(result.writerEligible,false);
}
assert.equal(s2WithOd.chains.length,1,'S2 full chain with OD must have one witness');
assert.equal(s2WithOd.chains[0].firstTargetNode,'10330');
assert.equal(s2WithOd.chains[0].lastTargetNode,'10420');
assert.equal(s2Revision.chains.length,3,
  'S2 has three length-consistent TARGET chains if OD revision is permitted');
assert(s2Revision.chains.some(x=>x.firstTargetNode==='10330'));
assert(!s2Revision.chains.some(x=>x.firstTargetNode==='415'),
  'suspect manual 420->415 must not pass the complete original chain');
assert.equal(s3WithOd.chains.length,1);
assert.equal(s3Revision.chains.length,1);
assert.equal(s3Revision.chains[0].firstTargetNode,'8890');
assert.equal(s3Revision.chains[0].lastTargetNode,'9000');
assert(!s3Revision.chains.some(x=>x.firstTargetNode==='7880'),
  'suspect manual 1560->7880 must not pass the original source chain');
const subdivision=s3Revision.chains[0].path.find(x=>
  x.sourceFrom==='1610'&&x.sourceTo==='1620');
assert.deepEqual(subdivision.targetNodes,['8920','8930','8940'],
  'one SOURCE PIPE element must retain two TARGET element witnesses');
assert.equal(subdivision.targetElementIds.length,2);
assert.throws(()=>enumerateCompleteOriginalChains(s2,t,s2Nodes,
  {...options,requireExactOd:true,maxSearchStates:5}),
  /CHAIN_SEARCH_INCOMPLETE_STATE_BUDGET/);
const summary=Object.freeze({
  schema:'CII102IndependentOriginalChainFalsifier.v1',
  status:'TEST_ONLY_NOT_PHYSICALLY_CERTIFIED',
  sourceSha:{S2:expectedSha.S2,S3:expectedSha.S3},
  targetSha:expectedSha.T,
  physicalNodeCounts:{S2:s2.nodeCount,S3:s3.nodeCount,T:t.nodeCount},
  physicalElementCounts:{S2:s2.elementCount,S3:s3.elementCount,T:t.elementCount},
  conditions:options,
  s2:{withOd:s2WithOd.chains.length,allowOdRevision:s2Revision.chains.length,
    targetStarts:s2Revision.chains.map(x=>x.firstTargetNode)},
  s3:{withOd:s3WithOd.chains.length,allowOdRevision:s3Revision.chains.length,
    targetStarts:s3Revision.chains.map(x=>x.firstTargetNode),
    subdivision:subdivision.targetNodes},
  writerReady:false,certifiedNodeCount:0,transferPlan:null,
  ownerFullGoldenRecall:'NOT_EVALUABLE',
});
console.log('CII102_INDEPENDENT_ORIGINAL_CHAIN_FALSIFIER_PASS',JSON.stringify(summary));
