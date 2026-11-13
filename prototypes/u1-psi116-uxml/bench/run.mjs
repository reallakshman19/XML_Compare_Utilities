import {applyPsi116Edits} from '../engine/psi116-patchback.mjs';
import {fixture,edit,options} from '../tests/fixture.mjs';
import {timeMedian} from '../../_kit/core.mjs';
const b=fixture(40,30),opts=await options(b),edits=[];
for(let i=0;i<40;i++)for(let j=0;j<30;j++)edits.push(edit('Node/Weight','10.0','12.5',i,j,30));
const {ms,runs,last}=await timeMedian(()=>applyPsi116Edits(b,edits,opts));
const result={branches:40,nodes:1200,edits:edits.length,bytes:b.length,changes:last.changes.length,ms,runs,pass:ms<2000&&last.changes.length===1200};
console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
