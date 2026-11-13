import {readCii14} from '../kit/cii14.mjs';
import {attempt, require, sha256Hex} from '../kit/core.mjs';
import {validate} from '../vendor/vendor/validate.mjs';

export function validateNamesDoc(doc, format) {
  const errors = validate(doc);
  require(doc?.format === format && !errors.length, 'NAMES_DOCUMENT_INVALID', format,
    errors.map(e => `${e.code} ${e.msg}`).join('; ') || 'Wrong document format');
  if (format === 'topofix.changeset') {
    require(doc.base.kind === 'cii' && doc.changes.every(c => c.field === 'NODENAME/NAME' && c.target.kind === 'cii-node'),
      'NAMES_FIELD_NOT_ALLOWED', 'changeset', 'Only CII node names can be edited here.');
    for (const c of doc.changes) require(typeof c.newValue === 'string' && c.newValue.length <= 25,
      'NAMES_TOO_LONG', c.changeId, 'Name must be text of at most 25 characters.');
  }
}

// Track all slots and missing adjacent records, not just nonempty names. The kernel
// must update every adjacent element end or refuse; a blank slot is a real slot.
export function nameIndex(cii, role = 'source') {
  const nodes = new Map();
  for (const e of cii.elements) for (const side of ['from','to']) {
    const node = String(e[side]);
    if (!nodes.has(node)) nodes.set(node, {tokens:new Set(), missing:0, slots:0});
    const r = nodes.get(node), p = e.pointers.NODENAME;
    if (!p) {r.missing++; continue;}
    r.slots++; r.tokens.add(cii.nodeNames[p-1][side].token.trim());
  }
  for (const [node,r] of nodes) {
    require(r.tokens.size <= 1, 'NAMES_SOURCE_NAME_CONFLICT', `${role} node ${node}`, 'Different name tokens: ' + JSON.stringify([...r.tokens]));
    r.name = [...r.tokens][0] ?? '';
  }
  return nodes;
}

export async function planNames(sourceBytes, targetBytes, mapFile) {
  return attempt(async () => {
    validateNamesDoc(mapFile,'topofix.map');
    require(mapFile.source.kind === 'cii' && mapFile.target.kind === 'cii', 'NAMES_DOCUMENT_INVALID', 'map', 'Both files must be CII.');
    const [sourceHash,targetHash] = await Promise.all([sha256Hex(sourceBytes),sha256Hex(targetBytes)]);
    require(sourceHash === mapFile.source.sha256.toLowerCase() && targetHash === mapFile.target.sha256.toLowerCase(),
      'NAMES_MAP_FILE_MISMATCH','map','Map checksums do not match the source and target files.');
    const source = nameIndex(readCii14(sourceBytes),'source'), target = nameIndex(readCii14(targetBytes),'target');
    const changes = [], unchanged = [], noEntry = [], skipped = [], seenSource = new Set(), seenTarget = new Set();
    for (const p of mapFile.pairs) {
      if (p.status !== 'approved' || p.source.kind !== 'cii-node' || p.target.kind !== 'cii-node') continue;
      const sn = p.source.node, tn = p.target.node, s = source.get(sn), t = target.get(tn);
      require(s && t && !seenSource.has(sn) && !seenTarget.has(tn), 'NAMES_MAP_PAIR_INVALID',p.pairId,'Node missing or repeated in approved pairs.');
      seenSource.add(sn); seenTarget.add(tn);
      if (!s.name) {skipped.push({pairId:p.pairId,sourceNode:sn,node:tn,reason:'SOURCE_NAME_BLANK'});continue;}
      require(s.name.length <= 25,'NAMES_TOO_LONG',`node ${sn}`,'Source name exceeds 25 characters.');
      if (s.name === t.name) {unchanged.push({pairId:p.pairId,node:tn,name:s.name});continue;}
      if (!t.slots || t.missing) {
        noEntry.push({code:'NAMES_TARGET_HAS_NO_ENTRY',pairId:p.pairId,node:tn,name:s.name});continue;
      }
      changes.push({changeId:`name-${tn}`,field:'NODENAME/NAME',target:{kind:'cii-node',node:tn},oldToken:t.name,newValue:s.name,
        evidence:{source:'map',pairId:p.pairId,detail:`Source node ${sn} name`},approval:{approved:false}});
    }
    const changeset={format:'topofix.changeset',version:1,createdAt:new Date().toISOString(),
      base:{kind:'cii',fileName:mapFile.target.fileName,sha256:targetHash},changes};
    validateNamesDoc(changeset,'topofix.changeset');
    return {changeset,unchanged,noEntry,skipped,wouldRepeat:repeatNames(target,changes)};
  });
}

// Mirror the kernel's final-name rule: evaluate all proposed renames simultaneously.
// Only a planned node can trigger a repeat warning; existing unrelated duplicates are not edits.
function repeatNames(target, changes) {
  const renamed = new Map(changes.map(c=>[c.target.node,c.newValue]));
  const owners = new Map();
  for (const [node,r] of target) {
    if (!r.slots) continue;
    const name = renamed.get(node) ?? r.name;
    if (!name) continue;
    if (!owners.has(name)) owners.set(name, new Set());
    owners.get(name).add(node);
  }
  return changes.flatMap(c=>{
    const nodes = [...(owners.get(c.newValue) ?? [])];
    return nodes.length > 1 ? [{changeId:c.changeId,node:c.target.node,name:c.newValue,nodes,code:'KERNEL_NAME_IN_USE'}] : [];
  });
}
