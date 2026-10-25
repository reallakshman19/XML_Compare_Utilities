/* CSV preflight; suggestions are not approvals and never write CII bytes. */
import { planNormal } from '../normal/plan.js';
import { enforceNormalNodeClosure } from './normal-node-closure.js';

export const CLEANUP_DEFAULTS = Object.freeze({
  trim: true, collapseSpace: false, suffixOne: true, refSuffix: true,
  truncateTo: 0, customPattern: '', customReplace: ''
});
const trim = s => String(s ?? '').trim();
const fail = c => { throw new Error(c); };
function cleanName(raw, opts, replacement = false) {
  let s = String(raw ?? ''), applied = [];
  if (opts.trim && s !== s.trim()) { s = s.trim(); applied.push('TRIM'); }
  if (opts.collapseSpace && /\s{2,}/.test(s)) {
    s = s.replace(/\s+/g, ' '); applied.push('COLLAPSE_SPACE');
  }
  if (replacement && opts.truncateTo && s.length > opts.truncateTo) {
    s = s.slice(0, opts.truncateTo); applied.push('TRUNCATE_TO_' + opts.truncateTo);
  }
  return { value:s, applied };
}
function profile(s, opts) {
  let name = s;
  if (opts.refSuffix) name = name.replace(/\s*\(REF\)$/i, '');
  if (opts.suffixOne) name = name.replace(/\.1$/, '');
  return name;
}
function regexFromOptions(opts) {
  if (!opts.customPattern) return null;
  const p = opts.customPattern;
  if (p.length > 96 || /[^\x20-\x7e]/.test(p) ||
      /\((?:[^()]|\\.)*(?:\+|\*|\{\d+,?\d*\})(?:[^()]|\\.)*\)(?:\+|\*|\{\d+,?\d*\})/.test(p)) fail('CLEANUP_REGEX_UNSAFE');
  let re;
  try { re = new RegExp(p, 'i'); } catch { fail('CLEANUP_REGEX_INVALID'); }
  if (re.test('')) fail('CLEANUP_REGEX_EMPTY_MATCH');
  return re;
}
function canonical(name, opts, re) {
  let s=cleanName(name, opts).value;
  s=profile(s,opts);
  if (re) s=s.replace(re, opts.customReplace);
  return s;
}
function nodeOf(field, byWitness) {
  if (field.owners.length !== 1 || field.shared || field.orphan) return null;
  const e=byWitness.get(field.owners[0]);
  if (!e) return null;
  return String(field.fieldIdentity === 'NODENAME.FROM' ? e.from : e.to);
}
function physicalNames(parsed) {
  const byWitness=new Map(parsed.elements.map(e=>[e.witness,e]));
  return parsed.fields.filter(f=>f.before.trim()).map(f=>({
    field:f, name:f.before.trim(), node:nodeOf(f,byWitness),
    element:byWitness.get(f.owners[0])
  }));
}
function sourceCorroborates(find, targetFields, source) {
  if (!source?.elements || !source?.fields) return false;
  const byIndex=new Map(source.elements.map(e=>[e.index,e]));
  const sourceFieldsByWitness=new Map();
  for (const f of source.fields) for(const owner of f.owners) {
    const key=owner+':'+f.fieldIdentity;
    sourceFieldsByWitness.set(key,f.before.trim());
  }
  return targetFields.every(t=>{
    if (!t.element || !t.node) return false;
    const se=byIndex.get(t.element.index);
    if (!se || se.from!==t.element.from || se.to!==t.element.to) return false;
    return sourceFieldsByWitness.get(se.witness+':'+t.field.fieldIdentity)===find;
  });
}
function distinctNodeCollisions(fields, ruleMap) {
  const before=new Map(), after=new Map(), changedByName=new Map();
  const add=(map,name,node)=>{if(!name||!node)return; if(!map.has(name))map.set(name,new Set());map.get(name).add(node);};
  for(const f of fields) {
    add(before,f.name,f.node);
    const next=ruleMap.get(f.name)?.replace ?? f.name;
    add(after,next,f.node);
    if(next!==f.name&&f.node){
      if(!changedByName.has(next))changedByName.set(next,new Set());
      changedByName.get(next).add(f.name);
    }
  }
  const culprits=new Set();
  for(const [name,nodes] of after) {
    const oldNodes=before.get(name)||new Set();
    if(nodes.size>1 && [...nodes].some(n=>!oldNodes.has(n))){
      for(const origin of changedByName.get(name)||[]) culprits.add(origin);
    }
  }
  return culprits;
}
function closureCulprits(parsed,claims) {
  const byWitness=new Map(parsed.elements.map(e=>[e.witness,e]));
  const bySpan=new Map(parsed.fields.map(f=>[f.byteStart+':'+f.byteEnd,f]));
  const all=new Map(), changed=new Map();
  for(const f of parsed.fields){
    if(!f.before.trim())continue;
    const node=nodeOf(f,byWitness);
    if(node) {
      if(!all.has(node))all.set(node,new Set());
      all.get(node).add(f.byteStart+':'+f.byteEnd);
    }
  }
  for(const claim of claims){
    const f=bySpan.get(claim.byteStart+':'+claim.byteEnd),node=f&&nodeOf(f,byWitness);
    if(!node)continue;
    if(!changed.has(node))changed.set(node,[]);
    changed.get(node).push(claim);
  }
  const bad=new Set();
  for(const [node, group] of changed){
    const spans=new Set(group.map(c=>c.byteStart+':'+c.byteEnd));
    if(spans.size!==all.get(node)?.size ||
      [...all.get(node)].some(span=>!spans.has(span)) ||
      new Set(group.map(c=>c.after.trim())).size!==1){
      for(const c of group)bad.add(c.ruleId);
    }
  }
  return bad;
}
export function resolveImportedCsv(rules,target,source,options={},hash='0'.repeat(64)){
  if(!target?.fields || !target?.elements || !Array.isArray(rules))fail('CLEANUP_TARGET_REQUIRED');
  const opts={...CLEANUP_DEFAULTS,...options};
  if(!Number.isSafeInteger(opts.truncateTo)||opts.truncateTo<0||opts.truncateTo>26)
    fail('CLEANUP_TRUNCATE_RANGE_0_TO_26');
  const re=regexFromOptions(opts), physical=physicalNames(target),
    targetNames=new Map(),originalGroups=new Map();
  for(const p of physical){
    if(!targetNames.has(p.name))targetNames.set(p.name,[]);
    targetNames.get(p.name).push(p);
  }
  for(const row of rules){
    const key=trim(row.find);
    if(!originalGroups.has(key))originalGroups.set(key,new Set());
    originalGroups.get(key).add(trim(row.replace));
  }
  const audit=[],entries=[];
  for(const [i,r] of rules.entries()){
    const rowId=r.id||'row-'+(i+1);
    const log=(status,reason,next,steps=[])=>audit.push({row:i+1,ruleId:rowId,
      find:String(r.find??''),replace:String(r.replace??''),status,reason,
      cleanedFind:next?.find||'',cleanedReplace:next?.replace||'',actions:steps});
    if(!trim(r.find)||!trim(r.replace)){log('HELD','EMPTY_FIND_OR_REPLACE');continue;}
    if(originalGroups.get(trim(r.find)).size>1){log('HELD','ORIGINAL_FIND_HAS_COMPETING_REPLACEMENTS');continue;}
    const found=cleanName(r.find,opts), to=cleanName(r.replace,opts,true);
    let hit=targetNames.get(found.value),steps=[...found.applied,...to.applied],name=found.value;
    if(!hit?.length){
      const normalized=canonical(found.value,opts,re);
      const choices=[...targetNames].filter(([candidate])=>canonical(candidate,opts,re)===normalized);
      if(choices.length!==1){log('HELD',choices.length?'NORMALIZATION_AMBIGUOUS':'TARGET0_NO_MATCH');continue;}
      [name,hit]=choices[0];
      if(!sourceCorroborates(found.value,hit,source)) {
        log('HELD','SOURCE_PHYSICAL_IDENTITY_NOT_VERIFIED');continue;
      }
      steps.push('SOURCE_VERIFIED_SMART_NORMALIZATION');
    }
    if(!to.value||/[^\x20-\x7e]/.test(to.value)||to.value.length>Math.min(...hit.map(p=>p.field.before.length))){
      log('HELD','REPLACEMENT_INVALID_OR_FIELD_WIDTH');continue;
    }
    const next={...r,find:name,replace:to.value,mode:'LITERAL',flags:'g'};
    entries.push({row:r,rule:next,log,steps,hit});
  }
  // Prefer exact names; if normalization made a name ambiguous, do not make a choice.
  const groups=new Map();
  for(const e of entries){
    if(!groups.has(e.rule.find))groups.set(e.rule.find,[]);
    groups.get(e.rule.find).push(e);
  }
  let accepted=[];
  for(const [,items] of groups){
    const outcomes=new Set(items.map(e=>e.rule.replace));
    if(outcomes.size>1){
      for(const e of items)e.log('HELD','CLEANUP_INTRODUCES_COMPETING_FIND',e.rule,e.steps);
    }else{
      accepted.push(items[0]);
      for(const e of items.slice(1))e.log('DROPPED','IDENTICAL_DUPLICATE_RULE',e.rule,e.steps);
    }
  }
  let pass=0;
  // Reject unsafe exact-scope or node-alias sets as one group; the writer is still final authority.
  while(accepted.length && pass++<5){
    const ruleMap=new Map(accepted.map(e=>[e.rule.find,e.rule]));
    const culprits=distinctNodeCollisions(physical,ruleMap);
    const plan=planNormal({tab:'NORMAL',targetBytes:options.targetBytes,
      originalTargetSha256:hash,rules:accepted.map(e=>e.rule)});
    for(const d of plan.diagnostics){
      if(d.severity==='ERROR' && d.ruleId)culprits.add(accepted.find(e=>e.rule.id===d.ruleId)?.rule.find);
      if(d.code==='DUPLICATE_FIELD_CLAIM'){
        for(const c of plan.claims.filter(c=>c.byteStart+':'+c.byteEnd===d.detail)){
          culprits.add(accepted.find(e=>e.rule.id===c.ruleId)?.rule.find);
        }
      }
    }
    const nodeBad=closureCulprits(target,plan.claims);
    for(const id of nodeBad)culprits.add(accepted.find(e=>e.rule.id===id)?.rule.find);
    culprits.delete(undefined);
    if(!culprits.size)break;
    const dropped=accepted.filter(e=>culprits.has(e.rule.find));
    for(const e of dropped)e.log('HELD','CLEANUP_NAME_COLLISION_OR_NODE_CLOSURE',e.rule,e.steps);
    accepted=accepted.filter(e=>!culprits.has(e.rule.find));
  }
  if(pass>5)fail('CLEANUP_REVIEW_ITERATION_LIMIT');
  // A final complete-plan review is mandatory before any row is accepted.
  const final=planNormal({tab:'NORMAL',targetBytes:options.targetBytes,
    originalTargetSha256:hash,rules:accepted.map(e=>e.rule)});
  if(final.diagnostics.some(d=>d.severity==='ERROR') ||
    closureCulprits(target,final.claims).size)fail('CLEANUP_FINAL_PLAN_NOT_ADMISSIBLE');
  if(final.claims.length)enforceNormalNodeClosure(target,final.claims);
  for(const e of accepted)e.log(e.steps.length?'CLEANED':'KEPT','PLAN_MATCH_AND_UNIQUE',e.rule,e.steps);
  const acceptedRules=accepted.map(e=>e.rule);
  return { schema:'CiiFnrVnext.CsvResolution.v1',sourceAudited:!!source,
    acceptedRules,report:audit.sort((a,b)=>a.row-b.row),
    summary:{ total:rules.length,accepted:acceptedRules.length,
      cleaned:audit.filter(a=>a.status==='CLEANED').length,
      held:audit.filter(a=>a.status==='HELD').length,
      dropped:audit.filter(a=>a.status==='DROPPED').length,
      proposedNameFields:final.claims.length, newlyIntroducedNameDuplicates:0,
      note:'Read-only preview; original CSV and TARGET0 unchanged.' }};
}
