import { deepFreeze, stableStringify } from './cii-workspace-contracts.js';

export const CII_TRANSFER_ACTIONS = Object.freeze({
  COPY: 'COPY',
  CREATE: 'CREATE',
  DELETE: 'DELETE',
  KEEP: 'KEEP',
  BLOCKED: 'BLOCKED',
});

export const CII_TRANSFER_STATUSES = Object.freeze({
  PREVIEW_READY: 'PREVIEW_READY',
  BLOCKED: 'BLOCKED',
  PROTECTED: 'PROTECTED',
});

const PROTECTED_CATEGORIES = new Set(['GEOMETRY', 'PIPE_SIZE', 'WALL']);
const RESTRAINT_PROPERTIES = new Set([
  'Restraint presence',
  'Restraint code set',
  'Restraint gap values',
  'Restraint friction values',
  'Restraint stiffness values',
  'Restraint direction-cosine set',
  'Qualified restraint numeric record set',
]);
const HANGER_PROPERTIES = new Set(['Hanger presence', 'Hanger record count at node']);
const SIF_TEE_PROPERTIES = new Set([
  'SIF/Tee record presence',
  'SIF/Tee raw code (field 2)',
  'SIF/Tee normalized raw payload',
]);

function sameValue(a, b) { return stableStringify(a) === stableStringify(b); }
function bool(value) { return value === true; }

function actionFromPresence(sourceValue, targetValue) {
  const source = bool(sourceValue); const target = bool(targetValue);
  if (source === target) return CII_TRANSFER_ACTIONS.KEEP;
  return source ? CII_TRANSFER_ACTIONS.CREATE : CII_TRANSFER_ACTIONS.DELETE;
}

function common(delta, family, action, status, blockers = [], extra = {}) {
  return deepFreeze({
    family,
    action,
    status,
    blockers: Object.freeze([...new Set(blockers)]),
    sourceValue: delta.sourceValue,
    targetValue: delta.targetValue,
    proposedValue: delta.sourceValue,
    evidenceStatus: delta.evidenceStatus || 'UNSPECIFIED',
    evidenceAuthority: delta.authority || null,
    semanticChange: delta.semanticChange || (delta.changed ? 'CHANGED' : 'UNCHANGED'),
    ...extra,
  });
}
function statusFromBlockers(blockers, ready = CII_TRANSFER_STATUSES.PREVIEW_READY) {
  return blockers.length ? CII_TRANSFER_STATUSES.BLOCKED : ready;
}

export function classifyCiiTransferDelta(delta, options = {}) {
  if (!delta) return null;
  if (PROTECTED_CATEGORIES.has(delta.category)) {
    return common(delta, delta.category, CII_TRANSFER_ACTIONS.KEEP, CII_TRANSFER_STATUSES.PROTECTED,
      delta.changed ? ['TARGET_PROPERTY_PROTECTED_BY_DEFAULT'] : [],
      { protected: true, policyAuthority: 'CII_TRANSFER_PROTECTED_MODEL_DEFINING_PROPERTIES' });
  }

  if (delta.category === 'NODE_NAME' && delta.property === 'Node name / to-name') {
    if (!delta.changed) return common(delta, 'NODE_NAME', CII_TRANSFER_ACTIONS.KEEP, CII_TRANSFER_STATUSES.PREVIEW_READY);
    const source = String(delta.sourceValue || ''); const target = String(delta.targetValue || '');
    if (!source && target) {
      return common(delta, 'NODE_NAME', CII_TRANSFER_ACTIONS.DELETE, CII_TRANSFER_STATUSES.BLOCKED,
        ['NODE_NAME_DELETE_REQUIRES_EXPLICIT_POLICY']);
    }
    if (source && target && source !== target && options.allowNodeNameOverwrite !== true) {
      return common(delta, 'NODE_NAME', CII_TRANSFER_ACTIONS.COPY, CII_TRANSFER_STATUSES.BLOCKED,
        ['TARGET_NODENAME_NONBLANK']);
    }
    return common(delta, 'NODE_NAME', CII_TRANSFER_ACTIONS.COPY, CII_TRANSFER_STATUSES.PREVIEW_READY);
  }

  if (delta.category === 'RESTRAINT' && RESTRAINT_PROPERTIES.has(delta.property)) {
    const blockers = [];
    if (!String(delta.authority || '').includes('PROTECTED_WRITER_RESTRANT')) blockers.push('RESTRAINT_FIXED_FIELD_AUTHORITY_REQUIRED');
    if (delta.property === 'Restraint presence') {
      const action = actionFromPresence(delta.sourceValue, delta.targetValue);
      return common(delta, 'RESTRAINT', action, statusFromBlockers(blockers), blockers,
        { rawNumericSemantics: true });
    }
    const action = delta.changed ? CII_TRANSFER_ACTIONS.COPY : CII_TRANSFER_ACTIONS.KEEP;
    return common(delta, 'RESTRAINT', action, statusFromBlockers(blockers), blockers,
      { rawNumericSemantics: delta.evidenceStatus === 'PARTIAL' });
  }

  if (delta.category === 'HANGER' && HANGER_PROPERTIES.has(delta.property)) {
    const blockers = [];
    if (!String(delta.authority || '').includes('CONTROL_NOHGRS_PLUS_MISCEL_1_IHGRNODE')) blockers.push('HANGER_NODE_PRESENCE_AUTHORITY_REQUIRED');
    if (delta.property === 'Hanger presence') {
      const action = actionFromPresence(delta.sourceValue, delta.targetValue);
      if (action === CII_TRANSFER_ACTIONS.CREATE) blockers.push('HANGER_CREATE_PAYLOAD_NOT_QUALIFIED');
      // DELETE can be semantically previewed from qualified node presence alone;
      // actual writer/mutation remains globally blocked outside this phase.
      return common(delta, 'HANGER', action, statusFromBlockers(blockers), blockers,
        { nodePresenceOnly: true });
    }
    const action = delta.changed ? CII_TRANSFER_ACTIONS.BLOCKED : CII_TRANSFER_ACTIONS.KEEP;
    if (delta.changed) blockers.push('HANGER_RECORD_COUNT_IS_EVIDENCE_ONLY');
    return common(delta, 'HANGER', action, statusFromBlockers(blockers), blockers,
      { nodePresenceOnly: true });
  }

  if (delta.category === 'SIF_TEE' && SIF_TEE_PROPERTIES.has(delta.property)) {
    if (!delta.changed) return common(delta, 'SIF_TEE', CII_TRANSFER_ACTIONS.KEEP, CII_TRANSFER_STATUSES.PREVIEW_READY,
      [], { rawSemanticsOnly: true });
    const blockers = [];
    if (!String(delta.authority || '').includes('ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD')) blockers.push('SIF_TEE_POINTER_AUTHORITY_REQUIRED');
    if (delta.property === 'SIF/Tee record presence') {
      const action = actionFromPresence(delta.sourceValue, delta.targetValue);
      if (action === CII_TRANSFER_ACTIONS.CREATE) blockers.push('SIF_TEE_TARGET_NODE_REWRITE_NOT_IMPLEMENTED');
      return common(delta, 'SIF_TEE', action, statusFromBlockers(blockers), blockers,
        { rawSemanticsOnly: true });
    }
    blockers.push('SIF_TEE_RAW_RECORD_REWRITE_NOT_IMPLEMENTED');
    return common(delta, 'SIF_TEE', CII_TRANSFER_ACTIONS.COPY, CII_TRANSFER_STATUSES.BLOCKED, blockers,
      { rawSemanticsOnly: true });
  }

  if (delta.category === 'WEIGHT_RIGID' && delta.property === 'Rigid weight') {
    const blockers = [];
    if (!String(delta.authority || '').includes('ELEMENT_RIGID_POINTER_TO_RIGID_RECORD')) blockers.push('RIGID_POINTER_WEIGHT_AUTHORITY_REQUIRED');
    const action = sameValue(delta.sourceValue, delta.targetValue) ? CII_TRANSFER_ACTIONS.KEEP : CII_TRANSFER_ACTIONS.COPY;
    return common(delta, 'WEIGHT_RIGID', action, statusFromBlockers(blockers), blockers);
  }

  if (delta.category === 'PROCESS') {
    if (!delta.changed) return common(delta, 'PROCESS', CII_TRANSFER_ACTIONS.KEEP, CII_TRANSFER_STATUSES.PROTECTED,
      ['PROCESS_TRANSFER_PARTIAL_AUTHORITY'], { protected: true });
    const blockers = [options.enablePartialProcessPreview === true ? 'PROCESS_TRANSFER_WRITER_NOT_QUALIFIED' : 'PROCESS_TRANSFER_PARTIAL_AUTHORITY'];
    return common(delta, 'PROCESS', CII_TRANSFER_ACTIONS.COPY, CII_TRANSFER_STATUSES.BLOCKED, blockers);
  }

  return common(delta, delta.category || 'UNKNOWN', CII_TRANSFER_ACTIONS.BLOCKED, CII_TRANSFER_STATUSES.BLOCKED,
    ['TRANSFER_FAMILY_NOT_QUALIFIED']);
}

export function ciiTransferPolicySummary(classifications) {
  const rows = classifications || [];
  const byAction = Object.fromEntries(Object.values(CII_TRANSFER_ACTIONS).map((action) => [action, 0]));
  for (const row of rows) byAction[row.action] = (byAction[row.action] || 0) + 1;
  return deepFreeze({
    byAction: deepFreeze(byAction),
    protectedCount: rows.filter((row) => row.status === CII_TRANSFER_STATUSES.PROTECTED).length,
    blockedCount: rows.filter((row) => row.status === CII_TRANSFER_STATUSES.BLOCKED).length,
    previewReadyCount: rows.filter((row) => row.status === CII_TRANSFER_STATUSES.PREVIEW_READY).length,
  });
}
