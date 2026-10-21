/* Standalone, fail-closed LINE_NODE writer admission. No bytes are modified here.
 * Independent of A2 planner and its evidence/alias metadata. Not wired to Apply.
 */
import { parseCii, scanLines } from './physical.js';
const fail = code => { throw new Error(code); };
const printable = s => typeof s === 'string' && /^[\x20-\x7e]*$/.test(s);
const key = (a, b) => `${a}:${b}`;
const fieldKey = f => key(f.byteStart, f.byteEnd);
const overlap = (a,b) => a.byteStart < b.byteEnd && b.byteStart < a.byteEnd;

function physicalElementRows(bytes, parsed) {
  const sections = new Map(); let active = null;
  for (const line of scanLines(bytes)) {
    const marker = /^\s*#\$\s*(\S.*?)\s*$/i.exec(line.text);
    if (marker) { active = marker[1].toUpperCase(); sections.set(active, []); }
    else if (active && line.text.trim()) sections.get(active).push(line);
  }
  const rows = sections.get('ELEMENTS');
  if (!rows || rows.length !== parsed.elements.length * 15) fail('ELEMENTS_PHYSICAL_ROWS_INVALID');
  return parsed.elements.map((element, index) => {
    const block = rows.slice(index * 15, index * 15 + 15);
    if (block.length !== 15 || block[0].text.length !== 80 || block[13].text.length !== 80) {
      fail('ELEMENTS_HEADER_OR_POINTER_WIDTH_INVALID');
    }
    const pointer = block[13].text.slice(67, 80);
    if (!/^\s*\d+\s*$/.test(pointer) || Number(pointer) !== element.pointer) fail('ELEMENTS_POINTER_CUSTODY_INVALID');
    const lineno = block[10];
    const before = lineno.text;
    const match = /^ {7}(.{5}) (.*)$/.exec(before);
    if (!match || !/^\s*\d+\s*$/.test(match[1])) fail('LINE_NUMBER_RECORD_INVALID');
    const declared = Number(match[1]), capacity = match[2].length;
    if (!Number.isSafeInteger(declared) || declared > capacity || match[2].slice(declared).trim()) fail('LINE_NUMBER_DECLARED_LENGTH_INVALID');
    return { element, byteStart: lineno.start, byteEnd: lineno.end,
      before, capacity, label: match[2].slice(0, declared) };
  });
}

function logicalNameCustody(parsed) {
  const groups = new Map(), fieldOwners = new Map();
  const fields = new Map(parsed.fields.map(f => [fieldKey(f), f]));
  for (const element of parsed.elements) {
    if (!element.pointer) continue;
    for (const [endpoint, logicalId, identity] of [
      ['FROM', element.from, 'NODENAME.FROM'], ['TO', element.to, 'NODENAME.TO']]) {
      const f = parsed.fields.find(field => field.pointer === element.pointer && field.fieldIdentity === identity);
      if (!f) fail('NODENAME_POINTER_OR_FIELD_MISSING');
      const span = fieldKey(f), id = String(logicalId);
      if (!groups.has(id)) groups.set(id, new Map());
      groups.get(id).set(span, f);
      const owners = fieldOwners.get(span) || [];
      owners.push({ id, elementIndex: element.index, endpoint, pointer: element.pointer });
      fieldOwners.set(span, owners);
    }
  }
  return { groups, fieldOwners, fields };
}

function checkLineClaim(c, record) {
  if (c.section !== 'ELEMENTS' || c.fieldIdentity !== 'LINE_NUMBER' ||
      c.byteStart !== record.byteStart || c.byteEnd !== record.byteEnd || c.before !== record.before) {
    fail('LINE_NUMBER_PHYSICAL_CUSTODY_INVALID');
  }
  // A physical LINE_NUMBER record is a complete 7X,I5,1X,A body, not only a label.
  const match = /^ {7}(.{5}) (.*)$/.exec(c.after);
  if (!match || !/^\s*\d+\s*$/.test(match[1]) || c.after.length !== c.before.length) {
    fail('LINE_NUMBER_SERIALIZATION_INVALID');
  }
  const length = Number(match[1]);
  if (!Number.isSafeInteger(length) || length < 1 || length > record.capacity ||
      match[1] !== String(length).padStart(5, ' ') ||
      !match[2].slice(0, length).trim() || match[2].slice(0, length).endsWith(' ') ||
      match[2].slice(length).trim() ||
      match[2].length !== record.capacity) fail('LINE_NUMBER_DECLARED_LENGTH_INVALID');
  // The record's independently parsed element witness is authoritative, not planner evidence.
  if (typeof c.targetElementWitness !== 'string' ||
      c.targetElementWitness !== `${record.element.from}->${record.element.to}@${record.element.index}`) {
    fail('LINE_NUMBER_ELEMENT_WITNESS_INVALID');
  }
}

/** Returns independently authorized immutable field spans; NEVER patches TARGET0. */
export async function admitLineNodeClaims({ original, plan, approvedIds, originalHash }) {
  if (!(original instanceof Uint8Array) || plan?.schema !== 'CiiFnrVnext.Proposals.v1' ||
      plan.incompleteSearch !== false || !Array.isArray(plan.claims) ||
      !Array.isArray(approvedIds) || approvedIds.length === 0 ||
      new Set(approvedIds).size !== approvedIds.length) fail('LINE_NODE_ADMISSION_INPUT_INVALID');
  if (typeof originalHash !== 'string' || !/^[a-f0-9]{64}$/.test(originalHash) ||
      originalHash !== plan.targetSha256) fail('LINE_NODE_SHA_BINDING_INVALID');
  const actualHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', original))]
    .map(v=>v.toString(16).padStart(2,'0')).join('');
  if (actualHash !== originalHash) fail('LINE_NODE_TARGET0_STALE');
  const parsed = parseCii(original);
  const records = physicalElementRows(original, parsed);
  const linesBySpan = new Map(records.map(r => [key(r.byteStart, r.byteEnd), r]));
  const custody = logicalNameCustody(parsed);
  const byId = new Map();
  const affected = new Map();
  const claimsBySpan = new Map();
  for (const c of plan.claims) {
    if (!c || typeof c.id !== 'string' || !c.id || byId.has(c.id) ||
        !['PROPOSED','HOLD','CONFLICT','REJECTED'].includes(c.status) ||
        !Number.isSafeInteger(c.byteStart) || !Number.isSafeInteger(c.byteEnd) ||
        c.byteStart < 0 || c.byteEnd <= c.byteStart || c.byteEnd > original.length ||
        !printable(c.before) || !printable(c.after) ||
        c.before.length !== c.byteEnd - c.byteStart || c.after.length !== c.before.length) {
      fail('LINE_NODE_CLAIM_SCHEMA_INVALID');
    }
    byId.set(c.id, c);
    const span = key(c.byteStart,c.byteEnd);
    const previous = claimsBySpan.get(span) || [];
    previous.push(c); claimsBySpan.set(span,previous);
  }
  const chosen = approvedIds.map(id => {
    const c = byId.get(id);
    if (!c || c.status !== 'PROPOSED') fail('LINE_NODE_UNAPPROVABLE_CLAIM');
    return c;
  }).sort((a,b) => a.byteStart - b.byteStart);
  for (let i=1;i<chosen.length;i++) if (chosen[i].byteStart < chosen[i-1].byteEnd) fail('LINE_NODE_APPROVAL_OVERLAP');
  for (const c of chosen) {
    const span = key(c.byteStart,c.byteEnd);
    if (plan.claims.some(other => other !== c && overlap(other,c))) fail('LINE_NODE_PLAN_COLLISION');
    const data = original.subarray(c.byteStart,c.byteEnd);
    if (!data.every((b,i) => b === c.before.charCodeAt(i))) fail('LINE_NODE_BEFORE_BYTES_INVALID');
    if (c.section === 'ELEMENTS' && c.fieldIdentity === 'LINE_NUMBER') {
      const physical = linesBySpan.get(span);
      if (!physical) fail('LINE_NUMBER_PHYSICAL_CUSTODY_INVALID');
      checkLineClaim(c, physical);
    } else if (c.section === 'NODENAME' && ['NODENAME_FROM','NODENAME_TO','NODENAME.FROM','NODENAME.TO'].includes(c.fieldIdentity)) {
      const canonicalIdentity = (c.fieldIdentity === 'NODENAME_FROM' || c.fieldIdentity === 'NODENAME.FROM') ? 'NODENAME.FROM' : 'NODENAME.TO';
      const field = custody.fields.get(span);
      if (!field || field.fieldIdentity !== canonicalIdentity ||
          field.before !== c.before || field.orphan || !c.after.trim() ||
          c.after !== c.after.trim().padEnd(c.after.length, ' ')) fail('NODENAME_PHYSICAL_CUSTODY_INVALID');
      const owners = custody.fieldOwners.get(span) || [];
      // One physical span must not alias two distinct logical IDs.
      if (!owners.length || new Set(owners.map(o=>o.id)).size !== 1) fail('NODENAME_SHARED_POINTER_IDENTITY_AMBIGUOUS');
      const actualWitnesses = new Set(owners.map(o=>{
        const e = parsed.elements[o.elementIndex];return `${e.from}->${e.to}@${e.index}`;
      }));
      for (const o of owners) {
        actualWitnesses.add(`${o.elementIndex}:${parsed.elements[o.elementIndex].from}:${parsed.elements[o.elementIndex].to}`);
      }
      if (!actualWitnesses.has(c.targetElementWitness)) fail('NODENAME_ELEMENT_WITNESS_INVALID');
      const groupId = owners[0].id;
      const list = affected.get(groupId) || [];
      list.push(c);affected.set(groupId,list);
    } else fail('LINE_NODE_FIELD_UNAUTHORIZED');
  }
  // Approval is an all-physical-representations closure, even if planner status was PROPOSED.
  for (const [nodeId, claims] of affected) {
    const fields = custody.groups.get(nodeId);
    const spans = new Set(claims.map(c => key(c.byteStart,c.byteEnd)));
    if (!fields || spans.size !== fields.size || [...fields.keys()].some(s => !spans.has(s))) {
      fail('NODENAME_LOGICAL_ALIAS_APPROVAL_INCOMPLETE');
    }
    const befores = new Set([...fields.values()].map(f => f.before.trim()));
    const afters = new Set(claims.map(c => c.after.trim()));
    if (befores.size !== 1 || afters.size !== 1) fail('NODENAME_LOGICAL_ALIAS_VALUES_CONFLICT');
    for (const span of spans) {
      // Held/conflicting duplicate from any other rule invalidates this alias membership.
      if ((claimsBySpan.get(span) || []).length !== 1) fail('NODENAME_LOGICAL_ALIAS_COLLISION');
    }
  }
  // A subset containing only a different field in a logical alias group cannot prove closure.
  // Numeric IDs and physical spans come entirely from TARGET0, not planner evidence.
  return Object.freeze(chosen.map(c => Object.freeze({ id:c.id, ruleId:c.ruleId,
    section:c.section, fieldIdentity:c.fieldIdentity, byteStart:c.byteStart,
    byteEnd:c.byteEnd, before:c.before, after:c.after,
    targetElementWitness:c.targetElementWitness })));
}
