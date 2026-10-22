import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { planNormal } from '../tabs/cii-workspace/cii-fnr-vnext/normal/plan.js';
import { validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
const row = v => v.map((x,i)=>String(x).padStart(i?13:15)).join('');
const sci = n => Number(n).toExponential(6).toUpperCase().replace('E+','E+0');
const elem = (a,b,p) => Array.from({length:15},(_,i)=>i===0?row([sci(a),sci(b),120,0,0,0]):i===13?row([0,0,0,0,0,sci(p)]):row([0,0,0,0,0,0]));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const lineEnding of ['\n','\r\n']) {
 const rows=['#$ VERSION',row([5,14,1252]),'#$ CONTROL',row([2,0,0,sci(2),0,0]),'#$ ELEMENTS',
  ...elem(10,20,1),...elem(20,30,2),'#$ NODENAME',
  '  '+'LEFT'.padEnd(26)+'SHARED'.padEnd(25),
  '  '+'SHARED'.padEnd(26)+'RIGHT'.padEnd(25)];
 const target0 = new TextEncoder().encode(rows.join(lineEnding)+lineEnding);
 const originalHash=sha(target0),parsed=parseCii(target0);
 assert.equal(parsed.elements.length,2);assert.equal(parsed.elements[0].to,20);
 assert.equal(parsed.elements[1].from,20);assert.equal(parsed.fields.length,4);
 const plan=planNormal({tab:'NORMAL',targetBytes:target0,originalTargetSha256:originalHash,rules:[{
  id:'S',find:'SHARED',replace:'RENAMED',mode:'LITERAL',field:'NODENAME.BOTH',scope:'DOCUMENT'}],options:{}});
 assert.equal(plan.claims.length,2);
 await assert.rejects(validatePostimage({original:target0,originalHash,plan,approvedIds:[plan.claims[0].id],tab:'NORMAL'}),/NORMAL_NODE_ALIAS_APPROVAL_INCOMPLETE/);
 const before=new Uint8Array(target0);
 const result=await validatePostimage({original:target0,originalHash,plan,approvedIds:plan.claims.map(x=>x.id),tab:'NORMAL'});
 assert.deepEqual(target0,before);
 assert.equal(sha(result.bytes),result.target1Hash);
 assert.equal(parseCii(result.bytes).elements.length,2);
 const changed=[...target0].map((x,i)=>x!==result.bytes[i]?i:-1).filter(x=>x>=0);
 assert(changed.length>0 && changed.every(i=>result.audit.some(c=>c.byteStart<=i&&i<c.byteEnd)));
}
console.log('PASS v14 exponent notation, immutable original, alias closure, LF/CRLF');
