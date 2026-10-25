/* Only complete logical nodes with no overlap with ANY claim may be bulk-approved. */
import { enforceNormalNodeClosure } from './normal-node-closure.js';
import { enforcePlanPolicy } from './config-policy.js';

export function safeNonConflictIds(parsed, plan, policy) {
  if (!parsed?.fields || !parsed?.elements || !Array.isArray(plan?.claims) ||
      plan.incompleteSearch !== false) return [];
  const claims=plan.claims, byWitness=new Map(parsed.elements.map(e=>[e.witness,e]));
  const bySpan=new Map(parsed.fields.map(f=>[f.byteStart+':'+f.byteEnd,f]));
  const grouped=new Map();
  for(const c of claims){
    if(c.status!=='PROPOSED' || claims.some(other=>other!==c &&
      c.byteStart<other.byteEnd && other.byteStart<c.byteEnd))continue;
    const f=bySpan.get(c.byteStart+':'+c.byteEnd);
    if(!f||f.owners.length!==1||f.fieldIdentity!==c.fieldIdentity)continue;
    const e=byWitness.get(f.owners[0]);
    if(!e)continue;
    const node=String(f.fieldIdentity==='NODENAME.FROM'?e.from:e.to);
    if(!grouped.has(node))grouped.set(node,[]);
    grouped.get(node).push(c);
  }
  const ids=[];
  for(const group of grouped.values()){
    try {
      enforceNormalNodeClosure(parsed,group);
      ids.push(...group.map(c=>c.id));
    } catch { /* Incomplete/ambiguous aliases remain pending. */ }
  }
  if(!ids.length)return [];
  try {
    enforceNormalNodeClosure(parsed,claims.filter(c=>ids.includes(c.id)));
    enforcePlanPolicy(plan,ids,policy);
    return ids;
  } catch {
    // Any non-isolatable error, BLOCK_PLAN policy, or overlap keeps the operation disabled.
    return [];
  }
}
