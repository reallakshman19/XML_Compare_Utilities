import {readCii14} from '../kit/cii14.mjs';
import {sha256Hex} from '../kit/core.mjs';
import {validate} from '../vendor/vendor/validate.mjs';
import assert from 'node:assert/strict';
export const at='2026-11-12T20:00:00Z';
export const nodes=c=>new Set(c.elements.flatMap(e=>[String(e.from),String(e.to)]));
export async function makeMap(a,b,sourceFile='source.cii',targetFile='target.cii') {
 const an=nodes(readCii14(a)),bn=nodes(readCii14(b));
 const map={format:'topofix.map',version:1,createdAt:at,source:{kind:'cii',fileName:sourceFile,sha256:await sha256Hex(a)},target:{kind:'cii',fileName:targetFile,sha256:await sha256Hex(b)},method:'node-number',pairs:[...an].filter(n=>bn.has(n)).map(n=>({pairId:`pair-${n}`,source:{kind:'cii-node',node:n},target:{kind:'cii-node',node:n},status:'approved',evidence:{rule:'node-number',detail:'same number'},approvedBy:'test',approvedAt:at}))};
 assert.deepEqual(validate(map),[]);return map;
}
// Test-only copies of public S1 with invented tokens; never write production CII here.
export function renameFixture(bytes,node,newName,onlyFirst=false){
 const c=readCii14(bytes),out=new Uint8Array(bytes);let count=0;
 for(const row of c.nodeNames){if(row.element===null)continue;for(const s of ['from','to']){
  if(String(c.elements[row.element][s])!==String(node))continue;
  const span=row[s];assert.ok(newName.length<=span.end-span.start);
  out.set(new TextEncoder().encode(newName.padEnd(span.end-span.start,' ')),span.start);count++;
  if(onlyFirst)return out;
 }}assert.ok(count);return out;
}

// Explicit test/benchmark subset: take the first eligible pair per new name.
// Never silently filter production plans or override an existing target name.
export function uniqueNameSubset(changeset,targetBytes){
 const c=readCii14(targetBytes),used=new Map();
 for(const r of c.nodeNames){if(r.element===null)continue;const e=c.elements[r.element];for(const side of ['from','to']){const name=r[side].token.trim();if(!name)continue;if(!used.has(name))used.set(name,new Set());used.get(name).add(String(e[side]));}}
 const seen=new Set(),out=structuredClone(changeset);
 out.changes=out.changes.filter(c=>{if(seen.has(c.newValue)||[...(used.get(c.newValue)??[])].some(n=>n!==c.target.node))return false;seen.add(c.newValue);return true;});
 return out;
}
