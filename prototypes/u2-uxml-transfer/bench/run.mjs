import {timeMedian,sha256Hex} from '../kit/core.mjs';
import {writeResult} from '../kit/node.mjs';
import {planTransfer} from '../engine/plan.mjs';
import {large} from '../tests/fixtures.mjs';
const {source,target,pairs}=large(),t=await timeMedian(()=>planTransfer(source,target,pairs,{items:['name','weight','element']}));
const r=t.last,pass=r.ok&&r.summary.pairs===1640&&r.edits.length===4961&&!r.ambiguities.length&&!r.refused.length&&t.ms<2000;
console.log(writeResult([{bench:'B1',input:'invented 41 x 40 nodes',sha256:await sha256Hex(source),targetSha256:await sha256Hex(target),...r.summary,ms:t.ms,runs:t.runs,limitMs:2000,pass}]));process.exitCode=pass?0:1;
