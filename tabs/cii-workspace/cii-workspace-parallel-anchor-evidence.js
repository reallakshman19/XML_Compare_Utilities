/**
 * Issue #106: independently collect AUTO base anchor claims and reviewed MANUAL
 * anchor claims without choosing a single active lane.
 *
 * This is read-only evidence arbitration. Base-qualified AUTO is not a
 * globally certified physical correspondence; manual review is not Method A/B
 * qualification. NEVER pass these claims directly to Writer2 mutation scope.
 */
import { buildCiiSelectedBaseLoops } from './cii-workspace-base-loop-selection.js';

const freeze = Object.freeze;
const item = (source, key) => source instanceof Map ? source.get(key) : source?.[key];
const id = (value) => {
  const raw = String(value ?? '').trim();
  const n = Number(raw);
  if (!raw || !Number.isSafeInteger(n) || n < 0) throw new Error('CII_PHASE2_ANCHOR_PHYSICAL_NODE_INVALID');
  return String(n);
};
const sort = (a, b) => a.localeCompare(b, undefined, { numeric: true });
function ledgerRows(source, key) {
  const rows = item(source, key) || [];
  if (!Array.isArray(rows)) throw new Error('CII_PHASE2_MANUAL_LEDGER_INVALID');
  return rows;
}
export function buildCiiParallelAnchorEvidence(inspection, selectedBySource = new Map(), manualBySource = new Map()) {
  const members = inspection?.memberInspections || [];
  const originals = new Map((inspection?.sourceSet?.members || []).map(row => [String(row.sourceId), String(row.originalSha256 || '')]));
  const targetOriginalSha256 = String(inspection?.versionBridge?.target?.originalSha256 || '');
  const byPair = new Map();
  const seenMembers = new Set();
  const memberRows = [];
  function addClaim(sourceId, sourceOriginalSha256, sourceNode, targetNode, lane, reference) {
    const sourceNodeId = id(sourceNode);
    const targetNodeId = id(targetNode);
    const key = [sourceId, sourceOriginalSha256, sourceNodeId, targetOriginalSha256, targetNodeId].join('|');
    let claim = byPair.get(key);
    if (!claim) {
      claim = { sourceId, sourceOriginalSha256, targetOriginalSha256, sourceNodeId, targetNodeId, provenances: [] };
      byPair.set(key, claim);
    }
    if (!claim.provenances.some(row => row.lane === lane && row.reference === reference)) {
      claim.provenances.push({ lane, reference });
    }
  }
  for (const member of members) {
    const sourceId = String(member?.sourceId || '').trim();
    if (!sourceId || seenMembers.has(sourceId)) throw new Error('CII_PHASE2_DUPLICATE_OR_MISSING_SOURCE_MEMBER');
    seenMembers.add(sourceId);
    const sourceOriginalSha256 = originals.get(sourceId) || String(member?.originalSha256 || '');
    const chosen = item(selectedBySource, sourceId) || new Set();
    const loops = buildCiiSelectedBaseLoops(member?.inspection?.baseAnchorSuggestions || [], chosen);
    const manual = ledgerRows(manualBySource, sourceId);
    let autoCount = 0;
    for (const loop of loops) {
      for (const pair of loop.anchorPairs || []) {
        // Retain exactly the already selected basis; no automatic promotion.
        addClaim(sourceId, sourceOriginalSha256, pair.sourceNodeId, pair.targetNodeId, 'AUTO', String(loop.loopId || loop.baseId || loop.method || 'SELECTED_BASE'));
        autoCount++;
      }
    }
    for (let index = 0; index < manual.length; index++) {
      const pair = manual[index];
      addClaim(sourceId, sourceOriginalSha256, pair?.sourceNodeId, pair?.targetNodeId, 'MANUAL', 'REVIEWED_' + (index + 1));
    }
    memberRows.push(freeze({ sourceId, autoAnchorClaims: autoCount, manualAnchorClaims: manual.length }));
  }
  const pairRows = [...byPair.values()].map(row => freeze({
    ...row,
    provenances: freeze(row.provenances.sort((a, b) => sort(a.lane + a.reference, b.lane + b.reference)).map(p => freeze(p))),
    lanes: freeze([...new Set(row.provenances.map(p => p.lane))].sort()),
    qualification: 'PHYSICAL_IDENTITY_NOT_CERTIFIED',
    writerAuthorized: false,
  })).sort((a, b) => sort(a.sourceId, b.sourceId) || sort(a.sourceNodeId, b.sourceNodeId) || sort(a.targetNodeId, b.targetNodeId));
  const bySource = new Map(), byTarget = new Map();
  for (const row of pairRows) {
    const sk = [row.sourceId, row.sourceOriginalSha256, row.sourceNodeId].join('|');
    const tk = [row.targetOriginalSha256, row.targetNodeId].join('|');
    if (!bySource.has(sk)) bySource.set(sk, []);
    if (!byTarget.has(tk)) byTarget.set(tk, []);
    bySource.get(sk).push(row);
    byTarget.get(tk).push(row);
  }
  const conflicts = [];
  for (const [sourceKey, rows] of bySource) if (new Set(rows.map(r => r.targetNodeId)).size > 1) {
    conflicts.push(freeze({ kind: 'SOURCE_TO_MULTIPLE_TARGETS', key: sourceKey,
      claims: freeze(rows.map(r => freeze({ sourceId: r.sourceId, sourceNodeId: r.sourceNodeId, targetNodeId: r.targetNodeId, lanes: r.lanes }))) }));
  }
  for (const [targetKey, rows] of byTarget) {
    const claimants = new Set(rows.map(r => [r.sourceId, r.sourceOriginalSha256, r.sourceNodeId].join('|')));
    if (claimants.size > 1) conflicts.push(freeze({ kind: 'TARGET_TO_MULTIPLE_SOURCES', key: targetKey,
      claims: freeze(rows.map(r => freeze({ sourceId: r.sourceId, sourceNodeId: r.sourceNodeId, targetNodeId: r.targetNodeId, lanes: r.lanes }))) }));
  }
  conflicts.sort((a, b) => sort(a.kind + a.key, b.kind + b.key));
  const missingCustody = !targetOriginalSha256 || pairRows.some(row => !row.sourceOriginalSha256);
  return freeze({
    schema: 'CiiParallelAnchorEvidence.v1',
    status: missingCustody ? 'CUSTODY_INCOMPLETE' : conflicts.length ? 'CONFLICT' : 'EVIDENCE_ONLY',
    sourceSetSha256: String(inspection?.sourceSet?.sourceSetSha256 || ''),
    targetOriginalSha256,
    memberRows: freeze(memberRows),
    claims: freeze(pairRows),
    conflicts: freeze(conflicts),
    rawAutoAnchorClaimCount: memberRows.reduce((n, row) => n + row.autoAnchorClaims, 0),
    rawManualAnchorClaimCount: memberRows.reduce((n, row) => n + row.manualAnchorClaims, 0),
    physicalPairClaimCount: pairRows.length,
    doubleSourcedClaimCount: pairRows.filter(row => row.lanes.length === 2).length,
    physicalIdentityCertified: false,
    writerAuthorizationGranted: false,
    // This result is additional visibility; existing Writer2 active-mode
    // dispatch is left unchanged until joint physical arbitration is qualified.
    operationalDispatchChanged: false,
  });
}
