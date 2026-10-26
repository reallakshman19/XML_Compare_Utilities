import test from 'node:test';
import assert from 'node:assert/strict';
import {searchResolution} from '../resolution-search.js';
const I=[[1,0,0],[0,1,0],[0,0,1]];
function inputFor(fixed,options) {
 const source={nodeIndex:new Map()},target={nodeIndex:new Map()},unique=[],groups=[];
 const add=(s,t,d,groupKey,xyz)=>{
  source.nodeIndex.set(s,{xyz,component:0});target.nodeIndex.set(t,{xyz:xyz.map((x,i)=>x-d[i]),component:0});
  return {source:s,target:t,key:t,groupKey,targetKey:t,sourceComponent:0,targetComponent:0,origins:[]};
 };
 fixed.forEach((d,i)=>unique.push(add('f'+i,'fixed'+i,d,'fixed'+i,[i*1000,0,0])));
 options.forEach((list,g)=>groups.push({key:'g'+g,source:'s'+g,options:list.map((d,i)=>
  add('s'+g,'g'+g+'o'+i,d,'g'+g,[100+g*100,100,0]))}));
 return {source,target,union:{unique,groups,allPairs:[...unique,...groups.flatMap(g=>g.options)],invalid:[]},
  policy:{mode:'TRANSLATION',rotation:I},snapshotId:'independent-declared-vectors',pins:{}};
}
test('distinct-target best-response cycle terminates with disclosed minmax compromise and per-group conditional alternatives',async()=>{
 const input=inputFor([[-8,-2,-3]],[[[-5,-8,-7],[-3,6,5]],[[4,-6,4],[6,2,1]]]);
 const result=await searchResolution(input);
 assert.equal(result.exact,true);assert.equal(result.totalAssignments,'4');
 assert.equal(result.status,'COUPLED_COMPROMISE');assert.deepEqual(result.chosen.choices,['g0o0','g1o0']);
 assert(Math.abs(result.recommendations[1].regret-2/3)<1e-9);
 assert.equal(result.recommendations[1].recommendedPairKey,'g1o1');
 assert(result.trials.every(t=>t.custody.length===0));
});
test('minimum-worst regret is different from minimum-sum/global-error; pins remain authoritative',async()=>{
 const input=inputFor([[-9,-19,-14],[4,-3,-14]],[
  [[-3,19,19],[-9,-2,0]],[[6,-2,12],[2,-10,-6]],[[-17,0,19],[-10,-5,18]]]);
 const result=await searchResolution(input);
 assert.deepEqual(result.chosen.choices,['g0o1','g1o1','g2o0']);assert(Math.abs(result.chosen.total-116)<1e-9);
 const pinned=await searchResolution({...input,pins:{g2:'g2o1'}});
 assert.equal(pinned.chosen.choices[2],'g2o1');
 assert(pinned.recommendations[2].options.every(o=>o.evaluated));
});
test('incomplete slices expose lower-bound regret and zero witnesses never imply numerical support',async()=>{
 const input=inputFor([[-8,-2,-3]],[[[-5,-8,-7],[-3,6,5]],[[4,-6,4],[6,2,1]]]);
 const partial=await searchResolution(input,{maxCases:1});
 assert.equal(partial.status,'BEST_FOUND_PARTIAL');assert.equal(partial.exact,false);
 assert(partial.recommendations.every(r=>r.regretBoundKind==='LOWER_BOUND'&&r.support==='PROVISIONAL'));
 const zero=await searchResolution(inputFor([],[[[0,0,0],[10,-10,0]]]));
 assert.equal(zero.recommendations[0].witnessCount,0);assert.equal(zero.recommendations[0].support,'ZERO_WITNESSES');
 assert(zero.recommendations[0].options.every(o=>o.score===0));
});
