import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ciiA2Sha256Utf8,ciiA2HashJson} from '../scripts/cii-a2-json-sha256.mjs';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const samples=['','abc','hello world','λ ❤ 中文','\u0000\n\r\t',
 'a'.repeat(55),'a'.repeat(56),'a'.repeat(63),'a'.repeat(64),'a'.repeat(65),'a'.repeat(1023),
 JSON.stringify({b:[1,2,3],a:{nested:true}}),
 JSON.stringify(Array.from({length:1000},(_,i)=>({i,label:'test'+i})))];
for(const item of samples) assert.equal(ciiA2Sha256Utf8(item),sha(item),'portable SHA parity for '+item.length);
for(const item of [null,[],{},42,{originalSha256:'a'.repeat(64),source:'S2',paths:[1,2,3]}])
 assert.equal(ciiA2HashJson(item),sha(JSON.stringify(item)),'portable JSON SHA parity');
const coreFiles=[
 'cii-architecture-a2-shadow-joint-evidence.mjs',
 'cii-architecture-a2-physical-path-constraints.mjs',
 'cii-architecture-a2-global-constraint-shadow.mjs',
 'cii-architecture-a2-frontier-recovery.mjs',
 'cii-architecture-a2-frontier-reconciliation.mjs',
];
for(const name of coreFiles){
 const file=readFileSync(fileURLToPath(new URL('../scripts/'+name,import.meta.url)),'utf8');
 assert(!/from\s*['"]node:crypto['"]/.test(file),'canonical A2 core must load in browser '+name);
}
console.log('PASS F2 canonical browser-safe SHA parity + five isomorphic solver modules');
