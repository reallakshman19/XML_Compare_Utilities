import { stableToken } from '../sequential-sketcher-contract.js';
import { sequentialSessionFingerprint } from '../construction/sequential-session-fingerprint.js';
import { sequentialSourceRecordsFingerprint } from './sequential-workspace-package.js';

export const SEQUENTIAL_WORKSPACE_IMPORT_PREVIEW_SCHEMA = 'SequentialWorkspaceImportPreview.v1';

function text(value) { return String(value ?? '').trim(); }
function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}
function canonicalJson(value) { return JSON.stringify(canonicalValue(value)); }
function sorted(values) { return [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function difference(left, right) { const other = new Set(right); return left.filter((value) => !other.has(value)); }
function intersection(left, right) { const other = new Set(right); return left.filter((value) => other.has(value)); }
function sessionFingerprint(snapshot) {
  return snapshot?.session ? sequentialSessionFingerprint(snapshot.session) : null;
}
function workspaceIdentity(snapshot) {
  return `${sessionFingerprint(snapshot) || ''}|${text(snapshot?.selectedCandidateId)}`;
}
function currentBranchIds(model) {
  if (model?.evidence?.branches) return sorted(model.evidence.branches.map((branch) => branch.branchId));
  return sorted(model?.branchRegistry?.ids?.() || []);
}
function currentWorkspaceRows(model) {
  return (model?.branchRegistry?.entries?.() || []).map(({ branchId, snapshot }) => ({
    branchId,
    sessionFingerprint: sessionFingerprint(snapshot),
    selectedCandidateId: text(snapshot?.selectedCandidateId),
  })).sort((left, right) => left.branchId.localeCompare(right.branchId));
}

export function sequentialWorkspaceCurrentStateFingerprint(model = {}) {
  const records = Array.isArray(model.records) ? model.records : null;
  return stableToken(canonicalJson({
    sourceFingerprint: records ? sequentialSourceRecordsFingerprint(records) : null,
    branchIds: currentBranchIds(model),
    activeBranchId: model.session?.rootBranchId || null,
    workspaces: currentWorkspaceRows(model),
  }));
}

function totals(workspaces) {
  const summary = {
    transactionCount: 0,
    undoEntryCount: 0,
    redoEntryCount: 0,
    deferredDecisionCount: 0,
    completeWorkspaceCount: 0,
    blockedWorkspaceCount: 0,
    failedWorkspaceCount: 0,
  };
  for (const row of workspaces) {
    const session = row.snapshot?.session;
    summary.transactionCount += session?.transactionLedger?.length || 0;
    summary.undoEntryCount += session?.undoStack?.length || 0;
    summary.redoEntryCount += session?.redoStack?.length || 0;
    summary.deferredDecisionCount += session?.deferredDecisionIds?.length || 0;
    if (session?.state === 'ROUTE_COMPLETE') summary.completeWorkspaceCount += 1;
    if (session?.state === 'USER_DECISION_REQUIRED') summary.blockedWorkspaceCount += 1;
    if (session?.state === 'FAILED') summary.failedWorkspaceCount += 1;
  }
  return Object.freeze(summary);
}

export function buildSequentialWorkspaceImportPreview(restoration, model = {}) {
  if (restoration?.schema !== 'SequentialWorkspaceRestoration.v1') {
    throw new Error('WORKSPACE_IMPORT_PREVIEW_RESTORATION_INVALID');
  }
  const currentSourceFingerprint = Array.isArray(model.records)
    ? sequentialSourceRecordsFingerprint(model.records)
    : null;
  const sourceRelation = !currentSourceFingerprint
    ? 'EMPTY'
    : currentSourceFingerprint === restoration.sourceFingerprint ? 'MATCH' : 'DIFFERENT';
  const currentBranches = currentBranchIds(model);
  const packageBranches = sorted(restoration.branchIds || []);
  const currentEntries = new Map((model.branchRegistry?.entries?.() || []).map((row) => [row.branchId, row.snapshot]));
  const packageEntries = new Map((restoration.workspaces || []).map((row) => [row.branchId, row.snapshot]));
  const newWorkspaceBranchIds = [];
  const overwrittenWorkspaceBranchIds = [];
  const unchangedWorkspaceBranchIds = [];
  for (const [branchId, snapshot] of packageEntries) {
    const current = currentEntries.get(branchId);
    if (!current) newWorkspaceBranchIds.push(branchId);
    else if (workspaceIdentity(current) === workspaceIdentity(snapshot)) unchangedWorkspaceBranchIds.push(branchId);
    else overwrittenWorkspaceBranchIds.push(branchId);
  }
  const removedWorkspaceBranchIds = [...currentEntries.keys()].filter((branchId) => !packageEntries.has(branchId));
  const packageTotals = totals(restoration.workspaces || []);
  const preview = {
    schema: SEQUENTIAL_WORKSPACE_IMPORT_PREVIEW_SCHEMA,
    packageFingerprint: restoration.packageFingerprint,
    currentStateFingerprint: sequentialWorkspaceCurrentStateFingerprint(model),
    sourceRelation,
    sourceReplacementRequired: sourceRelation === 'DIFFERENT',
    currentSourceFingerprint,
    packageSourceFingerprint: restoration.sourceFingerprint,
    currentBranchCount: currentBranches.length,
    packageBranchCount: packageBranches.length,
    addedBranchIds: difference(packageBranches, currentBranches),
    removedBranchIds: difference(currentBranches, packageBranches),
    commonBranchIds: intersection(packageBranches, currentBranches),
    currentSavedWorkspaceCount: currentEntries.size,
    packageSavedWorkspaceCount: packageEntries.size,
    newWorkspaceBranchIds: sorted(newWorkspaceBranchIds),
    overwrittenWorkspaceBranchIds: sorted(overwrittenWorkspaceBranchIds),
    unchangedWorkspaceBranchIds: sorted(unchangedWorkspaceBranchIds),
    removedWorkspaceBranchIds: sorted(removedWorkspaceBranchIds),
    activeBranchBefore: model.session?.rootBranchId || null,
    activeBranchAfter: restoration.activeBranchId || null,
    decisionRegisterSummary: restoration.decisionRegister?.summary || null,
    packageTotals,
    requiresExplicitApply: true,
    hasDestructiveChanges: sourceRelation === 'DIFFERENT'
      || overwrittenWorkspaceBranchIds.length > 0
      || removedWorkspaceBranchIds.length > 0
      || difference(currentBranches, packageBranches).length > 0,
  };
  return Object.freeze(preview);
}

export function formatSequentialWorkspaceImportPreview(preview) {
  if (preview?.schema !== SEQUENTIAL_WORKSPACE_IMPORT_PREVIEW_SCHEMA) {
    throw new Error('WORKSPACE_IMPORT_PREVIEW_INVALID');
  }
  const source = {
    EMPTY: 'will load source evidence into an empty workspace',
    MATCH: 'matches the current source evidence',
    DIFFERENT: 'will replace the current source evidence',
  }[preview.sourceRelation];
  const register = preview.decisionRegisterSummary
    ? ` Register: ${preview.decisionRegisterSummary.unresolvedCount || 0} unresolved, ${preview.decisionRegisterSummary.manualResolutionCount || 0} manual.`
    : '';
  return `Verified package ${preview.packageFingerprint}: source ${source}; ${preview.packageSavedWorkspaceCount} saved workspaces (${preview.newWorkspaceBranchIds.length} new, ${preview.overwrittenWorkspaceBranchIds.length} overwrite, ${preview.unchangedWorkspaceBranchIds.length} unchanged, ${preview.removedWorkspaceBranchIds.length} current removals); ${preview.packageTotals.transactionCount} transactions, ${preview.packageTotals.undoEntryCount} undo entries, ${preview.packageTotals.redoEntryCount} redo entries, ${preview.packageTotals.deferredDecisionCount} deferred decisions.${register} Nothing has been applied.`;
}
