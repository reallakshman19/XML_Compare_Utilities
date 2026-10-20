// Public Tab 2 read-only proposal adapter. Input/output contract: CiiFnrVnext.Proposals.v1.
import { sha256Hex } from './bytes.js';
import { parseCiiLineNode, fieldForEndpoint, renderLineField } from './cii.js';
import { compileSelector, replacementFor, lineFamily } from './selectors.js';
import { holdUnsafeLogicalNodeAliases } from './logical-aliases.js';

const DEFAULT_WEIGHTS = Object.freeze({ line: 70, node: 30 });
const decision = (code, extra = {}) => ({ code, ...extra });
const nameKey = f => `${f.start}:${f.end}`;

function deepFreeze(item) {
  if (item && typeof item === 'object' && !Object.isFrozen(item)) {
    for (const child of Object.values(item)) deepFreeze(child);
    Object.freeze(item);
  }
  return item;
}

function baseResult(sha) {
  return { schema: 'CiiFnrVnext.Proposals.v1', targetSha256: sha,
    claims: [], diagnostics: [], observations: [], incompleteSearch: false };
}

function weightsFrom(options) {
  const raw = options?.weights || DEFAULT_WEIGHTS;
  const line = raw.line ?? 70, node = raw.node ?? 30;
  if (![line,node].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)) {
    throw new Error('WEIGHTS_INVALID');
  }
  return { line, node };
}

function validateRules(rules) {
  if (!Array.isArray(rules)) throw new Error('RULES_NOT_ARRAY');
  const ids = new Set();
  return rules.map((rule,i) => {
    if (!rule || typeof rule !== 'object') throw new Error(`RULE_INVALID:${i}`);
    const id = String(rule.id ?? `line-node-${i + 1}`);
    if (ids.has(id)) throw new Error(`RULE_ID_DUPLICATE:${id}`);
    ids.add(id);
    const line = compileSelector(rule.line, 'LINE');
    const node = compileSelector(rule.node, 'NODE');
    if (!line && !node) throw new Error(`RULE_SELECTORS_MISSING:${id}`);
    if (node && !['FROM','TO','EITHER'].includes(rule.node.endpoint)) throw new Error(`NODE_ENDPOINT_REQUIRED:${id}`);
    if (![line,node].some(sel => sel?.spec.replace !== undefined)) throw new Error(`RULE_REPLACEMENT_MISSING:${id}`);
    if (rule.line?.family !== undefined && (typeof rule.line.family !== 'string' || !rule.line.family)) {
      throw new Error(`LINE_FAMILY_INVALID:${id}`);
    }
    return { id, line, node };
  });
}

function nodeCandidates(bytes, element, selector) {
  if (!selector) return [];
  const ends = selector.spec.endpoint === 'EITHER' ? ['FROM','TO'] : [selector.spec.endpoint];
  return ends.flatMap(endpoint => {
    const field = fieldForEndpoint(bytes,element,endpoint);
    if (!field || !field.label) return [];
    const match = selector.match(field.label);
    return match ? [{ ...field, match }] : [];
  });
}

function nameOwners(bytes, elements) {
  const owners = new Map();
  for (const e of elements) {
    for (const endpoint of ['FROM','TO']) {
      const f = fieldForEndpoint(bytes,e,endpoint);
      if (!f) continue;
      const key = nameKey(f);
      const group = owners.get(key) || [];
      group.push({ elementIndex: e.blockIndex, endpoint, nodeId: f.nodeId, pointer: f.pointer });
      owners.set(key,group);
    }
  }
  return owners;
}

function rowObservation(e, rule, lineMatch, nodeMatches, familyValid, weights) {
  const requiredLine = !!rule.line, requiredNode = !!rule.node;
  const linePass = !requiredLine || !!lineMatch && familyValid;
  const nodePass = !requiredNode || nodeMatches.length > 0;
  return { ruleId: rule.id, elementIndex: e.blockIndex, from: e.from, to: e.to,
    pointer: e.pointer, line: e.line.label, lineDeclaredLength: e.line.declared,
    lineState: e.line.blank ? 'BLANK' : 'VALID', component: e.component,
    lineFamily: lineFamily(e.line.label), lineMatched: requiredLine ? linePass : null,
    lineCaptures: lineMatch?.captures || [], lineNamedCaptures: lineMatch?.groups || {},
    nodeMatched: requiredNode ? nodePass : null, nodeMatches: nodeMatches.map(n => ({
      endpoint:n.endpoint, nodeId:n.nodeId, pointer:n.pointer, value:n.label,
      captures:n.match.captures, namedCaptures:n.match.groups, byteStart:n.start,byteEnd:n.end,
    })), score: (requiredLine && linePass ? weights.line : 0) +
      (requiredNode && nodePass ? weights.node : 0),
    mandatoryPassed: linePass && nodePass,
    outcome: linePass && nodePass ? 'MATCH' : (requiredLine && requiredNode && linePass !== nodePass ? 'HOLD' : 'NO_MATCH'),
    reason: !linePass ? 'LINE_SELECTOR_FAILED' : !nodePass ? 'NODE_SELECTOR_FAILED' : null };
}

function selectorEvidence(rule, observation) {
  return { line:rule.line ? { mode:rule.line.mode, flags:rule.line.spec.flags || '',
    matched:observation.lineMatched, fullValue:observation.line,
    family:observation.lineFamily, captures:observation.lineCaptures,
    namedCaptures:observation.lineNamedCaptures } : null,
    node:rule.node ? { mode:rule.node.mode, flags:rule.node.spec.flags || '',
      endpoint:rule.node.spec.endpoint, matched:observation.nodeMatched,
      witnesses:observation.nodeMatches } : null };
}

function makeClaim(rule, e, field, after, evidence, status = 'PROPOSED') {
  return { id: `${rule.id}:${field.identity}:${field.start}-${field.end}`,
    ruleId: rule.id, targetElementWitness: `${e.from}->${e.to}@${e.blockIndex}`,
    section: field.section, fieldIdentity: field.identity,
    byteStart:field.start, byteEnd:field.end, before:field.before, after,
    evidence, status };
}

function claimForLine(rule,e,lineMatch,observation) {
  if (!rule.line || rule.line.spec.replace === undefined || !lineMatch) return null;
  const row = e.line.row;
  const field = { identity: 'LINE_NUMBER', section: 'ELEMENTS',
    start:row.start, end:row.bodyEnd, before:e.line.before };
  let after = field.before, status = observation.mandatoryPassed ? 'PROPOSED' : 'HOLD';
  let reason = observation.reason;
  if (observation.mandatoryPassed) {
    try { after = renderLineField(e.line,replacementFor(rule.line,e.line.label)); }
    catch (error) { reason=error.message; status='HOLD'; }
  }
  return makeClaim(rule,e,field,after,{ fieldValue:e.line.label,
    fullLineIdentity:e.line.label, lineFamily:lineFamily(e.line.label), captures:lineMatch.captures,
    namedCaptures:lineMatch.groups, affectedRecords:[{ section:'ELEMENTS', blockIndex:e.blockIndex,physicalLine:row.lineNumber }],
    score:observation.score, mandatoryPassed:observation.mandatoryPassed, reason,
    selectors:selectorEvidence(rule,observation),
  },status);
}

function claimForNode(rule,e,n,observation) {
  if (rule.node.spec.replace === undefined) return null;
  const field = { identity:`NODENAME_${n.endpoint}`, section:'NODENAME',
    start:n.start,end:n.end,before:n.before };
  let after=field.before,status=observation.mandatoryPassed?'PROPOSED':'HOLD';
  let reason=observation.reason;
  if (observation.mandatoryPassed) {
    try {
      const replacement=replacementFor(rule.node,n.label);
      if (!replacement.trim()) throw new Error('NODE_REPLACEMENT_BLANK');
      if (replacement.length > n.before.length) throw new Error('NODE_REPLACEMENT_OVERFLOW');
      after=replacement.padEnd(n.before.length,' ');
    } catch (error) { reason=error.message;status='HOLD'; }
  }
  return makeClaim(rule,e,field,after,{ endpoint:n.endpoint,nodeId:n.nodeId,
    pointer:n.pointer, pointerOriginElementIndex:e.blockIndex,
    pointerOriginPhysicalLine:e.line.row.lineNumber + 3,
    fieldValue:n.label,captures:n.match.captures,namedCaptures:n.match.groups,
    affectedRecords:[{section:'NODENAME',pointer:n.pointer,physicalLine:n.row.lineNumber,
      endpoint:n.endpoint,elementIndex:e.blockIndex}],score:observation.score,
    mandatoryPassed:observation.mandatoryPassed,reason,
    selectors:selectorEvidence(rule,observation) },status);
}

function buildRuleCandidates(request, parsed, rule, weights, output) {
  const candidates=[];
  for (const e of parsed.elements) {
    const l = rule.line && !e.line.blank ? rule.line.match(e.line.label) : null;
    const familyValid = !rule.line?.spec.family || lineFamily(e.line.label).base === rule.line.spec.family;
    const nodes=nodeCandidates(request.targetBytes,e,rule.node);
    const obs=rowObservation(e,rule,l,nodes,familyValid,weights);
    output.observations.push(obs);
    if (l && familyValid) {
      const c=claimForLine(rule,e,l,obs);if(c)candidates.push(c);
    }
    if (nodes.length) for(const n of nodes) {
      const c=claimForNode(rule,e,n,obs);if(c)candidates.push(c);
    }
  }
  return candidates;
}

function enforceAmbiguity(candidates, observations, rule, output) {
  const matched=observations.filter(o=>o.ruleId===rule.id&&o.mandatoryPassed);
  const comps=new Set(matched.map(o=>o.component));
  const nodeIds=new Set(matched.flatMap(o=>o.nodeMatches.map(n=>n.nodeId)));
  const reason=comps.size>1?'DISCONNECTED_COMPETING_MATCHES':
    rule.node&&nodeIds.size>1?'COMPETING_NODE_IDENTITIES':null;
  if (!reason) return;
  for(const c of candidates) if(c.status==='PROPOSED') {
    c.status='HOLD';c.evidence.reason=reason;
  }
  output.diagnostics.push(decision(reason,{ruleId:rule.id,components:comps.size,nodeIdentities:nodeIds.size}));
}

function coalesceAndCheckAliases(candidates, parsed, bytes, output) {
  const owners=nameOwners(bytes,parsed.elements);
  const groups=new Map();
  for (const c of candidates) {
    const key=`${c.ruleId}:${c.byteStart}:${c.byteEnd}`;
    const arr=groups.get(key)||[];arr.push(c);groups.set(key,arr);
  }
  for (const arr of groups.values()) {
    const first=arr[0];
    const all=first.section==='NODENAME' ? owners.get(`${first.byteStart}:${first.byteEnd}`)||[] : [];
    const eligible=arr.filter(x=>x.evidence.mandatoryPassed && x.status==='PROPOSED');
    const matched=new Set(eligible.map(x=>x.evidence.pointerOriginElementIndex));
    const changed=new Set(eligible.map(x=>x.after));
    first.evidence.owners=all;
    first.evidence.affectedRecords=arr.flatMap(x=>x.evidence.affectedRecords);
    first.evidence.aliasCount=all.length;
    first.evidence.aliasScopePreserved=first.section!=='NODENAME'||
      (eligible.length>0 && all.every(o=>matched.has(o.elementIndex)));
    if (changed.size>1) { first.status='CONFLICT';first.evidence.reason='COMPETING_ALIAS_REPLACEMENTS'; }
    else if (eligible.length && !first.evidence.aliasScopePreserved) { first.status='HOLD';first.evidence.reason='SHARED_POINTER_PARTIAL_SCOPE'; }
    else if (arr.some(x=>x.status==='HOLD')) {
      first.status='HOLD';first.evidence.reason=arr.find(x=>x.status==='HOLD').evidence.reason;
    }
    output.claims.push(first);
    if(first.status!=='PROPOSED')output.diagnostics.push(decision(first.evidence.reason||'CLAIM_HELD',{
      ruleId:first.ruleId,byteStart:first.byteStart,fieldIdentity:first.fieldIdentity }));
  }
}

function detectCrossRuleCollisions(output) {
  const spans=new Map();
  for (const c of output.claims.filter(x=>x.status==='PROPOSED')) {
    const key=`${c.byteStart}:${c.byteEnd}`;
    const arr=spans.get(key)||[];arr.push(c);spans.set(key,arr);
  }
  for (const group of spans.values()) {
    if (group.length<2) continue;
    for(const c of group){c.status='CONFLICT';c.evidence.reason='OVERLAPPING_RULE_CLAIMS';}
    output.diagnostics.push(decision('OVERLAPPING_RULE_CLAIMS',{
      byteStart:group[0].byteStart,ruleIds:group.map(x=>x.ruleId)}));
  }
}

export function planLineNodeRules(request) {
  const suppliedSha=request?.originalTargetSha256;
  const output=baseResult(typeof suppliedSha==='string'?suppliedSha:'');
  try {
    if (request?.tab!=='LINE_NODE') throw new Error('TAB_MUST_BE_LINE_NODE');
    const bytes=request.targetBytes;
    if (!(bytes instanceof Uint8Array)) throw new Error('TARGET0_ORIGINAL_BYTES_REQUIRED');
    const actualSha=sha256Hex(bytes);
    output.targetSha256=actualSha;
    if (typeof suppliedSha!=='string'||suppliedSha.toLowerCase()!==actualSha) throw new Error('TARGET0_SHA256_MISMATCH');
    const weights=weightsFrom(request.options);
    const rules=validateRules(request.rules);
    const parsed=parseCiiLineNode(bytes);
    if (request.sourceBytes!==undefined) {
      const source=parseCiiLineNode(request.sourceBytes);
      output.observations.push({type:'SOURCE_OBSERVATION_ONLY',sourceVersion:source.version,
        sourceElementCount:source.elements.length,sourceSha256:sha256Hex(request.sourceBytes),
        correspondenceAuthority:'NONE_NUMERIC_NODE_IDS_NOT_CROSS_FILE_IDENTITIES'});
    }
    output.observations.push({type:'TARGET_LAYOUT',version:parsed.version,
      elementCount:parsed.elements.length,nodeNameRecords:parsed.nameRows.length,
      weightedEvidence:weights,scoreAuthorization:false});
    for (const rule of rules) {
      const candidates=buildRuleCandidates(request,parsed,rule,weights,output);
      enforceAmbiguity(candidates,output.observations,rule,output);
      coalesceAndCheckAliases(candidates,parsed,bytes,output);
    }
    // Resolve cross-rule collisions before assessing the final proposed set.
    // The last guard must reject any incomplete logical TARGET node alias.
    detectCrossRuleCollisions(output);
    holdUnsafeLogicalNodeAliases(output,parsed.elements,bytes);
  } catch (error) {
    output.diagnostics.push(decision(error.message||'UNHANDLED_INPUT_ERROR'));
    output.incompleteSearch=true;
    output.claims=[];
  }
  return deepFreeze(output);
}
