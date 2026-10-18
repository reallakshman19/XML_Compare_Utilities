/** I121: falsify negative Method A cache against an uncached same-source reference. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const mirrors=['tabs/cii-workspace/cii-workspace-anchor-method-a.js','docs/tabs/cii-workspace/cii-workspace-anchor-method-a.js'];
function once(s,a,b,label){assert.equal(s.split(a).length-1,1,'I121_SOURCE_DRIFT:'+label);return s.replace(a,b);}
function uncached(s){
  s=once(s,' const rejectedExpansionIds = new Set();','','negative-set');
  s=once(s,'    if (rejectedExpansionIds.has(expansionId)) continue;\n','','negative-lookup');
  s=once(s,"    if (geometry.status !== 'READY') { rejectedExpansionIds.add(expansionId); continue; }",
    "    if (geometry.status !== 'READY') continue;",'negative-store');
  return s;
}
const pt=(x,y,z)=>({x,y,z});
const add=(a,b)=>pt(a.x+b.x,a.y+b.y,a.z+b.z);
function fixture(rows){
  const source={nodes:[],adjacency:new Map()},target={nodes:[],adjacency:new Map()},candidates=[];
  rows.forEach(({position,shift},i)=>{
    const s=String(i+1),t=String(i+101);
    source.nodes.push({id:s,position});target.nodes.push({id:t,position:add(position,shift)});
    source.adjacency.set(s,[{diameter:100,from:s,to:'H'+s}]);
    target.adjacency.set(t,[{diameter:100,from:t,to:'H'+t}]);
    candidates.push({sourceNodeId:s,targetNodeId:t,score:100,winnerGap:20,sourceRank:1,targetRank:1});
  });
  return {source,target,candidates};
}
const primary=[pt(0,0,0),pt(1000,0,0),pt(0,1000,0),pt(0,0,1000),pt(1000,1000,1000)];
const region=fixture(primary.map(position=>({position,shift:pt(5000,-3000,150)})));
const mixed=fixture([
  ...primary.slice(0,4).map(position=>({position,shift:pt(5000,-3000,150)})),
  ...primary.slice(0,4).map(p=>({position:add(p,pt(30000,0,0)),shift:pt(-4500,2300,-300)})),
]);
const originalFiles=await Promise.all(mirrors.map(p=>readFile(path.join(root,p),'utf8')));
assert.equal(originalFiles[0],originalFiles[1],'SOURCE_DEPLOYED_METHOD_A_PARITY');

function rewriteForHarness(contents,dir){
  const rootUrl=new URL('../'+dir+'/',import.meta.url);
  contents=once(contents,"from './cii-workspace-contracts.js';",
    "from '"+new URL('cii-workspace-contracts.js',rootUrl).href+"';",'contracts');
  contents=once(contents,"import { qualifyCiiGeometryTransform, registeredCiiPoint } from './cii-workspace-geometry.js';",
    "import { qualifyCiiGeometryTransform as realQualify, registeredCiiPoint } from '"+new URL('cii-workspace-geometry.js',rootUrl).href+"';\n"+
    "const qualifyCiiGeometryTransform = (...args) => globalThis.__i121Qualify(...args,realQualify);",'geometry');
  return contents;
}
async function load(dir,mode,contents){
  const code=rewriteForHarness(mode==='reference'?uncached(contents):contents,dir);
  return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
function evaluate(module,graph,policy,options){
  const count={seed:0,expanded:0,forcedNegative:0};
  globalThis.__i121Qualify=(pairs,opts,real)=>{
    if(pairs.length<=3){count.seed++;return real(pairs,opts);}
    count.expanded++;
    if(policy==='reject-all'||(policy==='reject-first-region'&&pairs.some(p=>Number(p.sourceNodeId)<=4))){
      count.forcedNegative++;
      return {status:'AMBIGUOUS',reason:'I121_TEST_ONLY_FORCED_NON_READY'};
    }
    return real(pairs,opts);
  };
  try {
    const result=module.discoverCiiMethodABases(graph.source,graph.target,graph.candidates,options);
    return {result:JSON.parse(JSON.stringify(result)),count};
  }finally{delete globalThis.__i121Qualify;}
}
for(let m=0;m<mirrors.length;m++){
  const dir=m===0?'tabs/cii-workspace':'docs/tabs/cii-workspace';
  const [reference,cached]=await Promise.all([
    load(dir,'reference',originalFiles[m]),load(dir,'cached',originalFiles[m])]);
  const cases=[
    {name:'identical rejected expansions',graph:region,policy:'reject-all',options:{methodASeedPairLimit:5,methodAExpansionPairLimit:5},negative:true,ready:false},
    {name:'valid five-anchor READY preserved',graph:region,policy:'real',options:{methodASeedPairLimit:5,methodAExpansionPairLimit:5},negative:false,ready:true},
    {name:'rejected A region cannot hide valid B region',graph:mixed,policy:'reject-first-region',options:{methodASeedPairLimit:8,methodAExpansionPairLimit:8},negative:true,ready:true},
    {name:'reversed candidates remain reference-equivalent',graph:{...region,candidates:[...region.candidates].reverse()},policy:'reject-all',options:{methodASeedPairLimit:5,methodAExpansionPairLimit:5},negative:true,ready:false},
  ];
  for(const c of cases){
    const old=evaluate(reference,c.graph,c.policy,c.options);
    const now=evaluate(cached,c.graph,c.policy,c.options);
    assert.deepEqual(now.result,old.result,dir+':'+c.name+' full evidence parity');
    assert.equal(now.result.status,c.ready?'READY':'UNAVAILABLE',dir+':'+c.name+' status');
    assert.equal(now.count.seed,old.count.seed,'seed qualification unchanged');
    if(c.negative){
      assert(old.count.forcedNegative>now.count.forcedNegative,dir+':'+c.name+' dedup did not occur');
      assert(now.count.forcedNegative>=1,'must evaluate first negative');
    }else{
      assert.equal(now.count.forcedNegative,0);
      assert.equal(now.count.expanded,old.count.expanded,'READY expansions cannot be skipped');
    }
    assert.equal(now.result.bases.length>0,c.ready,dir+':'+c.name+' ready base presence');
    console.log(JSON.stringify({case:c.name,dir,baselineExpanded:old.count.expanded,cachedExpanded:now.count.expanded,status:now.result.status}));
  }
  const options={methodASeedPairLimit:5,methodAExpansionPairLimit:5};
  const a=evaluate(cached,region,'reject-all',options);
  const b=evaluate(cached,region,'reject-all',options);
  assert.deepEqual(b,a,dir+': per-call isolation without stale negative state');
}
console.log('I121 negative-cache evidence parity, READY preservation, no stale sessions: PASS');
