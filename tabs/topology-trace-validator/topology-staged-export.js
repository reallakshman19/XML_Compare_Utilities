/**
 * Staged JSON export: the loaded inputxml-managed-stage/v1 document with the
 * draft's geometry mutations and the attribute ledger applied, plus an
 * embedded StagedEditProvenance.v1 block mirroring the update-ledger table.
 *
 * Geometry mapping is a deterministic position remap derived from the
 * command payloads themselves (MOVE_NODE / MERGE_NODES / TRIM_EDGE move
 * existing nodes; other commands create or remove elements and are recorded
 * in provenance only). Any staged coordinate within tolerance of a moved
 * node's original position is rewritten to the new position — no entity-id
 * guessing.
 */

import { asArray, cleanText, objectRecord } from './topology-validator-values.js';
import { applyAttributeLedgerToStaged } from './topology-attribute-edit-ledger.js';
import { isIsoTimestamp } from '../../contracts/contract-values.js';

const COORD_FIELDS = Object.freeze(['APOS', 'LPOS', 'POS', 'BPOS', 'HPOS', 'TPOS']);

const xyz = (value) => {
  const record = objectRecord(value);
  const coords = [Number(record.x), Number(record.y), Number(record.z)];
  return coords.every(Number.isFinite) ? coords : null;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Replay command payloads over the base canonical node positions and emit
 * [{ from:[x,y,z], to:[x,y,z] }] remaps for every node that ended up moved.
 */
export function buildPositionRemaps(baseCanonical, draft) {
  const positions = new Map(asArray(baseCanonical.nodes).map(objectRecord)
    .map((node) => [cleanText(node.id), xyz(node.position)]));
  const original = new Map(positions);
  const applyOperation = (operation) => {
    const record = objectRecord(operation);
    const payload = objectRecord(record.payload);
    const type = cleanText(record.type);
    if (type === 'TRANSACTION') { asArray(payload.operations).forEach(applyOperation); return; }
    if (type === 'MOVE_NODE' || type === 'TRIM_EDGE') {
      const nodeId = cleanText(payload.nodeId);
      const next = xyz(payload.position);
      if (positions.has(nodeId) && next) positions.set(nodeId, next);
    } else if (type === 'MERGE_NODES') {
      const source = cleanText(payload.sourceNodeId), target = cleanText(payload.targetNodeId);
      if (positions.has(source) && positions.get(target)) positions.set(source, positions.get(target));
    }
  };
  asArray(draft?.commands).forEach(applyOperation);
  const remaps = [];
  for (const [nodeId, current] of positions) {
    const base = original.get(nodeId);
    if (base && current && dist(base, current) > 1e-6) remaps.push({ nodeId, from: base, to: current });
  }
  return Object.freeze(remaps);
}

function remapDocumentPositions(doc, remaps, toleranceMm) {
  if (!remaps.length) return 0;
  let touched = 0;
  const branches = Array.isArray(doc) ? doc : (doc.hierarchy ?? doc.branches ?? doc.objects ?? []);
  const rewrite = (attributes) => {
    for (const field of COORD_FIELDS) {
      const coords = attributes && xyz(attributes[field]);
      if (!coords) continue;
      for (const remap of remaps) {
        if (dist(coords, remap.from) <= toleranceMm) {
          attributes[field] = { x: remap.to[0], y: remap.to[1], z: remap.to[2] };
          touched += 1;
          break;
        }
      }
    }
  };
  for (const branch of branches) {
    rewrite(branch?.attributes);
    for (const child of Array.isArray(branch?.children) ? branch.children : []) rewrite(child?.attributes);
  }
  return touched;
}

/**
 * @param {{ baseStagedJson: unknown, baseCanonical: Record<string, unknown>,
 *           draft: Record<string, unknown>, editedCanonicalHash: string,
 *           attributeLedger: Record<string, unknown>, commandJournal: Record<string, unknown>, exportedAt: string,
 *           ledgerRows: ReadonlyArray<Record<string, unknown>>,
 *           toleranceMm?: number }} input
 * @returns {{ text: string, summary: { remaps: number, coordinatesTouched: number, attributeEdits: number } }}
 */
export function buildStagedExport(input) {
  if (!isIsoTimestamp(input.exportedAt)) throw new TypeError('Staged export requires an exact ISO exportedAt timestamp.');
  const toleranceMm = Number(input.toleranceMm) > 0 ? Number(input.toleranceMm) : 0.5;
  const withAttributes = applyAttributeLedgerToStaged(input.baseStagedJson, input.attributeLedger);
  const remaps = buildPositionRemaps(input.baseCanonical, input.draft);
  const coordinatesTouched = remapDocumentPositions(withAttributes, remaps, toleranceMm);
  const provenance = {
    schema: 'StagedEditProvenance.v1',
    exportedAt: input.exportedAt,
    baseCanonicalTopologyHash: cleanText(objectRecord(input.draft).baseCanonicalTopologyHash),
    topologyEditDraftHash: cleanText(objectRecord(input.draft).topologyEditDraftHash),
    editedCanonicalTopologyHash: cleanText(input.editedCanonicalHash),
    positionRemaps: remaps,
    commands: asArray(objectRecord(input.draft).commands),
    attributeEdits: asArray(objectRecord(input.attributeLedger).edits),
    commandJournal: input.commandJournal,
    ledger: asArray(input.ledgerRows).map((row) => ({
      seq: row.seq, id: row.id, kind: row.kind, target: row.target,
      before: row.before, after: row.after, origin: row.origin, remark: row.remark,
    })),
  };
  const doc = Array.isArray(withAttributes)
    ? { schema: 'inputxml-managed-stage/v1', objects: withAttributes, provenance }
    : { ...withAttributes, provenance };
  return {
    text: `${JSON.stringify(doc, null, 2)}\n`,
    summary: { remaps: remaps.length, coordinatesTouched, attributeEdits: provenance.attributeEdits.length },
  };
}
