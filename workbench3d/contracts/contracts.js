/**
 * contracts.js — versioned data contracts for the 3D Data Compare Workbench.
 *
 * Core rule: the 3D viewer never matches; the matcher never renders; the
 * transfer planner never mutates XML; the exporter applies approved plans only.
 * Every stage communicates through the contracts defined here.
 */

export const CONTRACT_VERSIONS = Object.freeze({
  CanonicalObjectGraph: 'CanonicalObjectGraph.v1',
  VisualGeometryModel: 'VisualGeometryModel.v1',
  MatchCandidate: 'MatchCandidate.v1',
  ObjectDiff: 'ObjectDiff.v1',
  TransferPlan: 'TransferPlan.v1',
  ConflictLedger: 'ConflictLedger.v1',
  ManualOverrideLedger: 'ManualOverrideLedger.v1',
  RegistrationAudit: 'RegistrationAudit.v1',
  CompareAudit: 'CompareAudit.v1',
  ViewerStateSnapshot: 'ViewerStateSnapshot.v1',
  RollbackLedger: 'RollbackLedger.v1',
  BenchmarkResult: 'BenchmarkResult.v1',
});

/** Diff statuses — the only vocabulary the viewer and dashboard understand. */
export const DIFF_STATUS = Object.freeze({
  MATCHED_UNCHANGED: 'MATCHED_UNCHANGED',
  PROPERTY_CHANGED: 'PROPERTY_CHANGED',
  GEOMETRY_CHANGED: 'GEOMETRY_CHANGED',
  MISSING_IN_TARGET: 'MISSING_IN_TARGET',
  NEW_IN_TARGET: 'NEW_IN_TARGET',
  AMBIGUOUS: 'AMBIGUOUS',
  SPLIT: 'SPLIT',
  MERGE: 'MERGE',
  CONSUMED: 'CONSUMED',
  CONFLICT: 'CONFLICT',
});

export const PATH_OPS = Object.freeze({
  MATCH: 'MATCH',
  INSERT_TARGET: 'INSERT_TARGET',
  DELETE_SOURCE: 'DELETE_SOURCE',
  SPLIT: 'SPLIT',
  MERGE: 'MERGE',
  POSSIBLE_MATCH: 'POSSIBLE_MATCH',
  AMBIGUOUS: 'AMBIGUOUS',
});

export const CONFIDENCE = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW', NONE: 'NONE' });

export const TRANSFER_RULES = Object.freeze({
  FILL_BLANK_ONLY: 'FILL_BLANK_ONLY',
  OVERWRITE: 'OVERWRITE',
  APPEND: 'APPEND',
  CREATE_NEW_PROPERTY: 'CREATE_NEW_PROPERTY',
});

export const APPROVAL_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
});

/** Geometry fields that must never transfer unless the explicit flag is on. */
export const GEOMETRY_PROTECTED_FIELDS = Object.freeze([
  'FROM_NODE', 'TO_NODE', 'DELTA_X', 'DELTA_Y', 'DELTA_Z',
]);

function fail(errors, message) {
  errors.push(message);
  return errors;
}

/** CanonicalObjectGraph.v1 validator — the parse/canonicalize output contract. */
export function validateCanonicalObjectGraph(graph) {
  const errors = [];
  if (!graph || typeof graph !== 'object') return fail(errors, 'graph missing');
  if (graph.contract !== CONTRACT_VERSIONS.CanonicalObjectGraph) fail(errors, `contract must be ${CONTRACT_VERSIONS.CanonicalObjectGraph}`);
  if (!graph.modelId) fail(errors, 'modelId required');
  if (!Array.isArray(graph.objects)) fail(errors, 'objects[] required');
  const ids = new Set();
  for (const obj of graph.objects ?? []) {
    if (!obj.objectId) { fail(errors, 'object missing objectId'); continue; }
    if (ids.has(obj.objectId)) fail(errors, `duplicate objectId ${obj.objectId}`);
    ids.add(obj.objectId);
    if (!obj.kind) fail(errors, `object ${obj.objectId} missing kind`);
  }
  if (!Array.isArray(graph.nodes)) fail(errors, 'nodes[] required');
  if (!Array.isArray(graph.paths)) fail(errors, 'paths[] required');
  for (const path of graph.paths ?? []) {
    for (const objectId of path.elementIds ?? []) {
      if (!ids.has(objectId)) fail(errors, `path ${path.pathId} references unknown object ${objectId}`);
    }
  }
  return errors;
}

/** VisualGeometryModel.v1 validator — the only thing the viewer renders. */
export function validateVisualGeometryModel(model) {
  const errors = [];
  if (!model || typeof model !== 'object') return fail(errors, 'model missing');
  if (model.contract !== CONTRACT_VERSIONS.VisualGeometryModel) fail(errors, `contract must be ${CONTRACT_VERSIONS.VisualGeometryModel}`);
  if (!model.modelId) fail(errors, 'modelId required');
  if (!Array.isArray(model.segments)) fail(errors, 'segments[] required');
  for (const seg of model.segments ?? []) {
    if (!seg.objectId) fail(errors, 'segment missing objectId');
    if (!Array.isArray(seg.start) || seg.start.length !== 3) fail(errors, `segment ${seg.objectId} bad start`);
    if (!Array.isArray(seg.end) || seg.end.length !== 3) fail(errors, `segment ${seg.objectId} bad end`);
  }
  if (!Array.isArray(model.markers)) fail(errors, 'markers[] required');
  return errors;
}

/**
 * CompareAudit.v1 validator — cross-reference integrity.
 * Every diff/conflict/transfer row must reference known object ids and the
 * ledgers must not contain orphan references.
 */
export function validateCompareAudit(audit) {
  const errors = [];
  if (!audit || typeof audit !== 'object') return fail(errors, 'audit missing');
  if (audit.contract !== CONTRACT_VERSIONS.CompareAudit) fail(errors, `contract must be ${CONTRACT_VERSIONS.CompareAudit}`);
  const sourceIds = new Set(audit.sourceObjectIds ?? []);
  const targetIds = new Set(audit.targetObjectIds ?? []);
  const diffIds = new Set();
  for (const row of audit.objectDiff?.rows ?? []) {
    if (!row.diffId) { fail(errors, 'diff row missing diffId'); continue; }
    if (diffIds.has(row.diffId)) fail(errors, `duplicate diffId ${row.diffId}`);
    diffIds.add(row.diffId);
    if (row.sourceObjectId && !sourceIds.has(row.sourceObjectId)) fail(errors, `diff ${row.diffId} orphan source ${row.sourceObjectId}`);
    if (row.targetObjectId && !targetIds.has(row.targetObjectId)) fail(errors, `diff ${row.diffId} orphan target ${row.targetObjectId}`);
    if (!Object.values(DIFF_STATUS).includes(row.status)) fail(errors, `diff ${row.diffId} unknown status ${row.status}`);
  }
  for (const row of audit.conflictLedger?.rows ?? []) {
    if (row.diffId && !diffIds.has(row.diffId)) fail(errors, `conflict ${row.conflictId} orphan diffId ${row.diffId}`);
  }
  for (const row of audit.transferPlan?.rows ?? []) {
    if (row.diffId && !diffIds.has(row.diffId)) fail(errors, `transfer ${row.rowId} orphan diffId ${row.diffId}`);
    if (row.targetObjectId && !targetIds.has(row.targetObjectId)) fail(errors, `transfer ${row.rowId} orphan target ${row.targetObjectId}`);
  }
  return errors;
}

/** TransferPlan.v1 validator. */
export function validateTransferPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return fail(errors, 'plan missing');
  if (plan.contract !== CONTRACT_VERSIONS.TransferPlan) fail(errors, `contract must be ${CONTRACT_VERSIONS.TransferPlan}`);
  const rowIds = new Set();
  for (const row of plan.rows ?? []) {
    if (!row.rowId) { fail(errors, 'transfer row missing rowId'); continue; }
    if (rowIds.has(row.rowId)) fail(errors, `duplicate transfer rowId ${row.rowId}`);
    rowIds.add(row.rowId);
    if (!row.property) fail(errors, `transfer ${row.rowId} missing property`);
    if (!Object.values(APPROVAL_STATUS).includes(row.approval)) fail(errors, `transfer ${row.rowId} bad approval ${row.approval}`);
    if (!Object.values(TRANSFER_RULES).includes(row.rule)) fail(errors, `transfer ${row.rowId} bad rule ${row.rule}`);
    if (GEOMETRY_PROTECTED_FIELDS.includes(String(row.property).toUpperCase()) && !plan.config?.allowGeometryTransfer && row.approval === APPROVAL_STATUS.APPROVED) {
      fail(errors, `transfer ${row.rowId} approves protected geometry field ${row.property}`);
    }
  }
  return errors;
}
