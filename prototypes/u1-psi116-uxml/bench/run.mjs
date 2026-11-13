import {applyPsi116Edits} from '../engine/psi116-patchback.mjs';
import {fixture,edit,options} from '../tests/fixture.mjs';
const b=fixture(40,30),opts=await options(b),edits=[];
for(let i=0;i<40;i++)for(let j=0;j<30;j++)edits.push(edit('Node/Weight','10.0','12.5',i,j,30));
const run=()=>applyPsi116Edits(b,edits,opts);
const warmup=await run();
if(warmup.changes.length!==1200)throw new Error('warm-up change count');
const runs=[];
for(let i=0;i<5;i++){
  const cpu=process.cpuUsage(),start=performance.now();
  const result=await run();const ms=performance.now()-start,usage=process.cpuUsage(cpu);
  runs.push({ms,cpuUserMs:usage.user/1000,cpuSystemMs:usage.system/1000,cpuMs:(usage.user+usage.system)/1000,changes:result.changes.length});
}
const median=key=>runs.map(r=>r[key]).sort((a,b)=>a-b)[2];
const ms=median('ms'),cpuMs=median('cpuMs');
const result={branches:40,nodes:1200,edits:edits.length,bytes:b.length,warmupRuns:1,ms,cpuMs,runs,pass:ms<2000&&runs.every(r=>r.changes===1200)};
console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
