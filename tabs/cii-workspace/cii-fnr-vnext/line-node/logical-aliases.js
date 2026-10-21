// Preserve logical TARGET node name consistency across distinct NODENAME records.
// Node IDs are used only within TARGET, never for SOURCE/TARGET correspondence.
import { fieldForEndpoint } from './cii.js';

const span = entry => entry.byteStart + ':' + entry.byteEnd;

function aliasesByNode(bytes, elements) {
  const byNode = new Map();
  for (const e of elements) {
    for (const endpoint of ['FROM', 'TO']) {
      const field = fieldForEndpoint(bytes, e, endpoint);
      if (!field?.label) continue; // Blank endpoints do not declare a name.
      const aliases = byNode.get(field.nodeId) || new Map();
      aliases.set(field.start + ':' + field.end, {
        byteStart: field.start, byteEnd: field.end,
        pointer: field.pointer, endpoint, label: field.label,
        nodeId: field.nodeId, elementIndex: e.blockIndex,
      });
      byNode.set(field.nodeId, aliases);
    }
  }
  return byNode;
}

function proposedByNode(claims) {
  const byNode = new Map();
  for (const claim of claims) {
    if (claim.section !== 'NODENAME' || claim.status !== 'PROPOSED') continue;
    const id = claim.evidence.nodeId;
    const group = byNode.get(id) || [];
    group.push(claim);
    byNode.set(id, group);
  }
  return byNode;
}

function logicalAliasIssue(aliases, claims) {
  if (new Set(aliases.map(a => a.label)).size > 1) return 'NODE_NAME_EXISTING_ALIAS_CONFLICT';
  const proposed = new Map(claims.map(c => [span(c), c]));
  if (aliases.some(a => !proposed.has(span(a)))) return 'NODE_NAME_LOGICAL_ALIAS_PARTIAL_SCOPE';
  if (new Set(claims.map(c => c.after.trim())).size > 1) return 'NODE_NAME_LOGICAL_ALIAS_REPLACEMENT_CONFLICT';
  return null;
}

export function holdUnsafeLogicalNodeAliases(output, elements, bytes) {
  const known = aliasesByNode(bytes, elements);
  for (const [nodeId, claims] of proposedByNode(output.claims)) {
    const aliases = [...(known.get(nodeId)?.values() || [])];
    const reason = logicalAliasIssue(aliases, claims);
    for (const claim of claims) {
      claim.evidence.logicalNodeAliases = aliases;
      claim.evidence.logicalNodeAliasScopePreserved = !reason;
      if (reason) { claim.status = 'HOLD'; claim.evidence.reason = reason; }
    }
    if (reason) output.diagnostics.push({
      code: reason, nodeId, aliases: aliases.length, selected: claims.length,
      byteSpans: aliases.map(a => [a.byteStart, a.byteEnd]),
    });
  }
}
