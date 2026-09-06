import { deepFreeze } from './cii-workspace-contracts.js';
import { ciiMsBm001AliasKey, parseCiiMsBm001 } from './cii-workspace-multisource-nodename-authority.js';
import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from './cii-workspace-writer2-nodename-relocation.js';

const NODE_PROPERTY = 'Node name / to-name';
const APPROVED = new Set(['REVIEWED', 'LOCKED']);

function text(value) { return String(value ?? '').trim(); }
function operationId(operation) { return text(operation?.operationId); }
function sourceAliasCandidates(value) {
  const name = text(value);
  if (!name) return [];
  return name.startsWith('/') ? [name, name.slice(1)] : [name, `/${name}`];
}
function acceptanceSourceNames(acceptance) {
  return Array.isArray(acceptance?.sourceNames) ? acceptance.sourceNames.map(text).filter(Boolean) : [];
}
function acceptanceMatchesRow(acceptance, row) {
  const targetName = text(acceptance?.targetName);
  if (!targetName || targetName !== text(row?.targetName)) return false;
  const rowAliases = new Set((row?.sourceNames || []).map((name) => ciiMsBm001AliasKey(name, row.targetName)));
  return acceptanceSourceNames(acceptance).some((sourceName) => sourceAliasCandidates(sourceName)
    .some((candidate) => rowAliases.has(ciiMsBm001AliasKey(candidate, targetName))));
}
function candidateOperations(plan) {
  const byId = new Map();
  for (const operation of [...(plan?.operations || []), ...(plan?.excludedOperations || [])]) {
    const id = operationId(operation);
    if (id && !byId.has(id)) byId.set(id, operation);
  }
  return [...byId.values()];
}

export function ciiBm001CorrespondenceCoverage(plan, rows = parseCiiMsBm001()) {
  const authorityRows = [...(rows || [])];
  const matched = new Set(); const invalidOperationIds = []; const evidenceOperationIds = [];
  for (const operation of candidateOperations(plan)) {
    const acceptance = operation?.bm001Acceptance;
    if (acceptance?.benchmark !== 'BM-001' || acceptance?.status !== 'BOUND') continue;
    const id = operationId(operation); evidenceOperationIds.push(id);
    let found = false;
    authorityRows.forEach((row, index) => {
      if (!acceptanceMatchesRow(acceptance, row)) return;
      matched.add(Number(row?.rowNumber) || index + 1); found = true;
    });
    if (!found) invalidOperationIds.push(id || 'unknown');
  }
  const rowNumbers = authorityRows.map((row, index) => Number(row?.rowNumber) || index + 1);
  const missingRowNumbers = rowNumbers.filter((number) => !matched.has(number));
  const status = missingRowNumbers.length || invalidOperationIds.length ? 'BLOCKED' : 'READY';
  return deepFreeze({
    schema: 'CIIWorkspaceBm001CorrespondenceCoverage.v1',
    benchmark: 'BM-001', status,
    expectedRowCount: authorityRows.length,
    matchedRowCount: matched.size,
    missingRowNumbers: deepFreeze(missingRowNumbers),
    invalidOperationIds: deepFreeze([...new Set(invalidOperationIds)].sort()),
    evidenceOperationIds: deepFreeze([...new Set(evidenceOperationIds)].sort()),
  });
}

function targetIdentity(operation) {
  return text(operation?.targetEvidence?.identity || operation?.targetEvidence?.nodeId);
}
export function ciiWriter2NodeNameCardinalityOperation(operation) {
  if (!operationId(operation)) return false;
  if (operation?.family !== 'NODE_NAME' || operation?.property !== NODE_PROPERTY) return false;
  if (!['CREATE', 'DELETE'].includes(operation?.action) || operation?.status !== 'PREVIEW_READY') return false;
  if (operation?.policyAuthority !== CII_WRITER_2_NODENAME_RELOCATION_POLICY) return false;
  if (!APPROVED.has(operation?.matchAuthority?.status) || !targetIdentity(operation)) return false;
  const before = text(operation?.before ?? operation?.targetEvidence?.value);
  const proposed = text(operation?.proposed ?? operation?.sourceEvidence?.value);
  if (operation.action === 'CREATE') return !before && Boolean(proposed);
  return Boolean(before) && !proposed;
}

export function ciiWriter2PhysicalMutationKey(operation) {
  if (!ciiWriter2NodeNameCardinalityOperation(operation)) return null;
  const before = text(operation?.before ?? operation?.targetEvidence?.value);
  const proposed = text(operation?.proposed ?? operation?.sourceEvidence?.value);
  return `NODE_NAME|${operation.action}|${targetIdentity(operation)}|${before}|${proposed}`;
}
function physicalTargetKey(operation) {
  return ciiWriter2NodeNameCardinalityOperation(operation) ? `NODE_NAME|${targetIdentity(operation)}` : null;
}

export function ciiWriter2PhysicalMutationConflicts(operations = []) {
  const byTarget = new Map();
  for (const operation of operations || []) {
    const targetKey = physicalTargetKey(operation); const mutationKey = ciiWriter2PhysicalMutationKey(operation);
    if (!targetKey || !mutationKey) continue;
    if (!byTarget.has(targetKey)) byTarget.set(targetKey, new Map());
    const mutations = byTarget.get(targetKey);
    if (!mutations.has(mutationKey)) mutations.set(mutationKey, []);
    mutations.get(mutationKey).push(operationId(operation));
  }
  const conflicts = [];
  for (const [targetKey, mutations] of byTarget) {
    if (mutations.size <= 1) continue;
    conflicts.push(deepFreeze({
      physicalTargetKey: targetKey,
      mutationKeys: deepFreeze([...mutations.keys()].sort()),
      operationIds: deepFreeze([...mutations.values()].flat().sort()),
    }));
  }
  return deepFreeze(conflicts.sort((a, b) => a.physicalTargetKey.localeCompare(b.physicalTargetKey, undefined, { numeric: true })));
}

function operationRank(operation) {
  const authority = operation?.matchAuthority?.status === 'LOCKED' ? '0' : '1';
  return `${authority}|${text(operation?.sourceId)}|${operationId(operation)}`;
}
export function ciiCanonicalWriter2MutationSelection(operations = []) {
  const conflicts = ciiWriter2PhysicalMutationConflicts(operations);
  const conflictedOperationIds = new Set(conflicts.flatMap((item) => item.operationIds));
  const groups = new Map();
  for (const operation of operations || []) {
    if (conflictedOperationIds.has(operationId(operation))) continue;
    const key = ciiWriter2PhysicalMutationKey(operation); if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(operation);
  }
  const appliedOperationIds = []; const duplicateOperationIds = []; const corroborationGroups = [];
  for (const [key, rows] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
    const ranked = [...rows].sort((a, b) => operationRank(a).localeCompare(operationRank(b), undefined, { numeric: true }));
    const chosen = ranked[0]; const duplicates = ranked.slice(1);
    appliedOperationIds.push(operationId(chosen));
    duplicateOperationIds.push(...duplicates.map(operationId));
    corroborationGroups.push(deepFreeze({
      physicalMutationKey: key,
      appliedOperationId: operationId(chosen),
      corroboratingOperationIds: deepFreeze(duplicates.map(operationId).sort()),
      sourceIds: deepFreeze([...new Set(ranked.map((row) => text(row?.sourceId)).filter(Boolean))].sort()),
    }));
  }
  return deepFreeze({
    appliedOperationIds: deepFreeze(appliedOperationIds.sort()),
    duplicateOperationIds: deepFreeze(duplicateOperationIds.sort()),
    corroborationGroups: deepFreeze(corroborationGroups),
    conflicts,
  });
}

export const _test = Object.freeze({
  text, operationId, sourceAliasCandidates, acceptanceSourceNames, acceptanceMatchesRow,
  candidateOperations, targetIdentity, physicalTargetKey, operationRank,
});
