/**
 * Independent original physical path holdout, NOT correspondence certification.
 * Examines every TARGET start node, not Owner labels.  3 collinear segments
 * per SOURCE EDGE; source length +/-25 mm; never grant Writer authority.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const F={
 S2:['Benchmark/S2.CII','7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',46,47],
 S3:['Benchmark/S3.CII','c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',45,46],
 T:['Benchmark/T.CII','abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',1614,1619]
};
function graph(name){
 const [file,sha,nEdges,nNodes]=F[name],bytes=readFileSync(file);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,name+' original SHA drift');
 const section=bytes.toString('utf8').split(/^#\$\s*ELEMENTS\s*$/mi)[1]?.split(/^#\$\s*/m)[0];
 assert(section,name+' missing ELEMENTS');
 const rows=section.split(/\r?\n/).filter(x=>x.trim()&&!x.trim().startsWith('*'));
 assert.equal(rows.length%15,0);
 const w=[15,13,13,13,13,13],row=s=>{let p=0;return w.map(k=>{const x=s.slice(p,p+k).trim();p+=k;return x?Number(x):null;});};
 const adj=new Map(),edges=[];
 for(let i=0;i<rows.length;i+=15){
  const [from,to,dx,dy,dz,od]=row(rows[i]),wall=row(rows[i+1])[0];
  assert([from,to,dx,dy,dz,od,wall].every(Number.isFinite));
  const e={id:i/15+1,from,to,dx,dy,dz,od,wall,length:Math.hypot(dx,dy,dz)};
  edges.push(e);
  for(const n of [from,to]){if(!adj.has(n))adj.set(n,[]);adj.get(n).push(e);}
 }
 assert.equal(edges.length,nEdges);assert.equal(adj.size,nNodes);
 return {adj,edges};
}
function extend(target,at,source,used,strictOd){
 const out=[];
 function walk(node,depth,length,previous,ids,nodes){
  if(depth && Math.abs(length-source.length)<=25)out.push({at:node,ids,nodes});
  if(depth===3||length>source.length+25)return;
  for(const e of target.adj.get(node)||[]){
   if(used.has(e.id)||ids.includes(e.id)||(strictOd&&Math.abs(e.od-source.od)>0.01))continue;
   const next=e.from===node?e.to:e.from;
   const v=e.from===node?[e.dx,e.dy,e.dz]:[-e.dx,-e.dy,-e.dz];
   if(depth){
    if(target.adj.get(node).length!==2)continue;
    const cosine=previous.reduce((sum,x,i)=>sum+x*v[i],0)/(Math.hypot(...previous)*Math.hypot(...v));
    if(cosine<0.995)continue;
   }
   walk(next,depth+1,length+e.length,v,[...ids,e.id],[...nodes,next]);
  }
 }
 walk(at,0,0,null,[],[at]);return out;
}
function solve(source,target,path,strictOd){
 let states=[...target.adj.keys()].map(n=>({start:n,at:n,used:new Set(),visited:new Set([n]),paths:[]}));
 for(let i=0;i<path.length-1;i++){
  const from=path[i],to=path[i+1];
  const e=(source.adj.get(from)||[]).find(x=>(x.from===to||x.to===to));
  assert(e,'SOURCE edge absent: '+from+'→'+to);
  const next=[];
  for(const s of states)for(const p of extend(target,s.at,e,s.used,strictOd)){
   if(p.nodes.slice(1).some(n=>s.visited.has(n)))continue;
   next.push({start:s.start,at:p.at,used:new Set([...s.used,...p.ids]),visited:new Set([...s.visited,...p.nodes]),paths:[...s.paths,p]});
  }
  states=next;assert(states.length<20000,'bounded search incomplete');
  if(!states.length)break;
 }
 return states;
}
const s2=graph('S2'),s3=graph('S3'),t=graph('T');
const p2=[420,440,450,470,480,500,510,540,560,570];
const p3=[1560,1580,1590,1600,1610,1620,1640,1650,1660,1670,1680,1690];
const s2Od=solve(s2,t,p2,true),s2Revised=solve(s2,t,p2,false);
const s3Od=solve(s3,t,p3,true),s3Revised=solve(s3,t,p3,false);
assert.equal(s2Od.length,1);assert.equal(s2Od[0].start,10330);assert.equal(s2Od[0].at,10420);
assert.equal(s2Revised.length,3,'S2 revision alternatives must remain visible');
assert.equal(s3Od.length,1);assert.equal(s3Revised.length,1);
assert.equal(s3Revised[0].start,8890);assert.equal(s3Revised[0].at,9000);
assert.deepEqual(s3Revised[0].paths[4].nodes,[8920,8930,8940]);
assert.equal(s3Revised[0].paths[4].ids.length,2);
console.log('CII102_ORIGINAL_CHAIN_HOLDOUT_PASS',JSON.stringify({
 S2:{matchingOdPaths:1,revisionPermissivePaths:3},
 S3:{matchingOdPaths:1,revisionPermissivePaths:1,splitTarget:[8920,8930,8940]},
 independentCertifiedIdentities:0,transferOperationsAdded:0,writerAuthorized:false
}));