import {resolve} from 'node:path';
import {parseArgs,readBenchmark,writeResult} from '../kit/node.mjs';
import {timeMedian} from '../kit/core.mjs';
import {rigidInventory,baseFor} from '../engine/inventory.mjs';
import {proposeFromTable} from '../engine/propose.mjs';
import {approveAll} from '../engine/approve.mjs';
import {applyWeights} from '../engine/run.mjs';
const args=parseArgs();if(args['repo-root'])args.roots.XCU=resolve(args['repo-root']);
const at='2026-11-12T19:00:00Z',rows=[];
for(const [bench,id,limit] of [['B1','X-T',1000],['B2','X-S2',null]]){
 const {bytes,entry}=await readBenchmark(id,args);
 const t=await timeMedian(async()=>{const inv=rigidInventory(bytes),base=await baseFor(bytes,entry.path.split('/').at(-1));const cs=proposeFromTable(inv,inv.map(r=>({fromNode:r.fromNode,toNode:r.toNode,newWeight:Math.ceil(r.weight*1.4)+1,note:'invented benchmark weight'})),{base,createdAt:at});const approved=approveAll(cs,{by:'benchmark',at}).changeset;return applyWeights(bytes,approved);});
 const count=t.last.report?.length||0,expected=id==='X-T'?124:1;
 rows.push({bench,input:id,sha256:entry.sha256,changes:expected,readBackOk:t.last.report?.filter(r=>r.ok).length||0,ms:t.ms,runs:t.runs,...(limit?{limitMs:limit}:{}),pass:t.last.ok&&count===expected&&(!limit||t.ms<limit)});
}
console.log(JSON.stringify(writeResult(rows),null,2));process.exitCode=rows.every(r=>r.pass)?0:1;
