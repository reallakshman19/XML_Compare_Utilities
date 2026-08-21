import { deepFreeze } from './cii-workspace-contracts.js';
import { applyCiiWriter2NodeNamePlanContract } from './cii-workspace-writer2-routing.js';
import {
  buildCiiWriter2NodeNameRelocationPlan,
  CII_WRITER_2_NODENAME_RELOCATION_POLICY,
} from './cii-workspace-writer2-nodename-relocation.js';
import {
  applyCiiWriter2SifDeletePlanContract,
  buildCiiWriter2SifDeleteRelocationPlan,
  CII_WRITER_2_SIF_CREATE_BLOCKER,
  CII_WRITER_2_SIF_DELETE_POLICY,
} from './cii-workspace-writer2-sif-delete.js';

const NODE_PROPERTY = 'Node name / to-name';
const SIF_PROPERTY = 'SIF/Tee record presence';
const GENERIC_NO_TRANSFER = 'NO_TRANSFERABLE_PREVIEW_OPERATIONS';
const UNSUPPORTED_POLICY = 'CII_WRITER_2_COMPOSITE_UNSUPPORTED_FAMILY';

function text(value) { return String(value ?? '').trim(); }
function operationId(operation) { return text(operation?.operationId); }
function isNodeRoute(operation) {
  return operation?.family === 'NODE_NAME' && operation?.property === NODE_PROPERTY;
}
function isSifPresenceRoute(operation) {
  return operation?.family === 'SIF_TEE' && operation?.property === SIF_PROPERTY;
}
function isNodeMutation(operation) {
  return operation?.scopeDecision === 'APPLY'
    && isNodeRoute(operation)
    && ['CREATE', 'DELETE'].includes(operation?.action);
}
function isSifDelete(operation) {
  return operation?.scopeDecision === 'APPLY'
    && isSifPresenceRoute(operation)
    && operation?.action === 'DELETE';
}
function isSifCreate(operation) {
  return operation?.scopeDecision === 'APPLY'
    && isSifPresenceRoute(operation)
    && operation?.action === 'CREATE';
}
function qualifiedCompositeMutation(operation) {
  if (operation?.status !== 'PREVIEW_READY') return false;
  if (isNodeRoute(operation) && ['CREATE', 'DELETE'].includes(operation?.action)) {
    return operation?.policyAuthority === CII_WRITER_2_NODENAME_RELOCATION_POLICY;
  }
  return isSifPresenceRoute(operation) && operation?.action === 'DELETE'
    && operation?.policyAuthority === CII_WRITER_2_SIF_DELETE_POLICY;
}
function operationMap(contract) {
  const rows = new Map();
  for (const operation of contract?.operations || []) {
    const id = operationId(operation);
    if (id && !rows.has(id)) rows.set(id, operation);
  }
  return rows;
}
function blockedOperation(operation, blocker) {
  return deepFreeze({
    ...operation,
    action: operation?.action === 'KEEP' ? 'KEEP' : 'BLOCKED',
    status: operation?.action === 'KEEP' ? operation?.status : 'BLOCKED',
    blockers: deepFreeze([...new Set([...(operation?.blockers || []), blocker])]),
    ...(operation?.action === 'KEEP' ? {} : { policyAuthority: UNSUPPORTED_POLICY }),
  });
}
function operationSummary(operations) {
  const byAction = {};
  for (const operation of operations || []) byAction[operation.action || 'UNKNOWN'] = (byAction[operation.action || 'UNKNOWN'] || 0) + 1;
  const mutations = (operations || []).filter(qualifiedCompositeMutation);
  return deepFreeze({
    operationCount: (operations || []).length,
    previewReadyCount: (operations || []).filter((item) => item.status === 'PREVIEW_READY').length,
    blockedCount: (operations || []).filter((item) => item.status === 'BLOCKED').length,
    protectedCount: (operations || []).filter((item) => item.status === 'PROTECTED').length,
    writer2CompositeMutationCount: mutations.length,
    nodeNameMutationCount: mutations.filter((item) => isNodeRoute(item)).length,
    sifDeleteMutationCount: mutations.filter((item) => isSifPresenceRoute(item)).length,
    byAction: deepFreeze(byAction),
  });
}

export function applyCiiWriter2CompositePlanContract(plan) {
  if (!plan) return plan;
  const nodeContract = applyCiiWriter2NodeNamePlanContract(plan);
  const sifContract = applyCiiWriter2SifDeletePlanContract(plan);
  const nodeById = operationMap(nodeContract); const sifById = operationMap(sifContract);
  const blockers = (plan.blockers || []).filter((item) => item !== GENERIC_NO_TRANSFER);
  const seen = new Set(); const operations = [];

  for (const operation of plan.operations || []) {
    const id = operationId(operation);
    if (!id) {
      blockers.push('WRITER_2_COMPOSITE_ROUTING_OPERATION_ID_REQUIRED');
      operations.push(blockedOperation(operation, 'WRITER_2_COMPOSITE_ROUTING_OPERATION_ID_REQUIRED'));
      continue;
    }
    if (seen.has(id)) {
      const blocker = `WRITER_2_COMPOSITE_ROUTING_DUPLICATE_OPERATION_ID:${id}`;
      blockers.push(blocker); operations.push(blockedOperation(operation, blocker)); continue;
    }
    seen.add(id);
    if (isNodeRoute(operation)) {
      operations.push(nodeById.get(id) || blockedOperation(operation, `WRITER_2_COMPOSITE_NODE_ROUTE_MISSING:${id}`));
    } else if (isSifPresenceRoute(operation)) {
      operations.push(sifById.get(id) || blockedOperation(operation, `WRITER_2_COMPOSITE_SIF_ROUTE_MISSING:${id}`));
    } else if (operation?.action === 'KEEP') {
      operations.push(operation);
    } else {
      operations.push(blockedOperation(operation, 'WRITER_2_COMPOSITE_UNSUPPORTED_FAMILY'));
    }
  }

  const summary = operationSummary(operations);
  if (!summary.writer2CompositeMutationCount) blockers.push('NO_WRITER_2_COMPOSITE_TRANSFERABLE_OPERATIONS');
  const unique = deepFreeze([...new Set(blockers)]);
  return deepFreeze({
    ...plan,
    mutationAuthority: unique.length ? 'BLOCKED' : 'WRITER_2_COMPOSITE_CARDINALITY_CONDITIONAL',
    operations: deepFreeze(operations),
    status: unique.length ? 'BLOCKED' : 'PREVIEW_READY',
    blockers: unique,
    summary,
    policy: deepFreeze({
      ...(plan.policy || {}),
      geometryProtected: true,
      nodeNumberProtected: true,
      topologyProtected: true,
      nodeNameMutation: 'CREATE_DELETE_RELOCATION_ONLY',
      nodeNameOverwrite: 'WRITER_1C_ONLY',
      sifTeeMutation: 'V11_EXISTING_BLOCK_DELETE_REINDEX_ONLY',
      sifTeeCreate: 'BLOCKED_ITEMS_27_30_UNRESOLVED',
      mixedCardinalityMutation: 'ONE_ORIGINAL_PREIMAGE_COMPOSITE',
      processDefault: 'BLOCKED_WRITER_2_COMPOSITE',
      restraintCardinality: 'BLOCKED_WRITER_2_COMPOSITE',
      hangerMutation: 'BLOCKED_WRITER_2_COMPOSITE',
      topologyMutation: 'BLOCKED_WRITER_3_ONLY',
    }),
  });
}

function projectPlan(transferPlan, predicate) {
  return deepFreeze({
    ...transferPlan,
    operations: deepFreeze((transferPlan?.operations || []).map((operation) => operation?.scopeDecision === 'APPLY' && !predicate(operation)
      ? deepFreeze({ ...operation, scopeDecision: 'EXCLUDE' }) : operation)),
  });
}

export function ciiWriter2CompositeReadiness(transferPlan, targetDocument, targetGraph) {
  const blockers = [...(transferPlan?.blockers || [])];
  if (transferPlan?.status !== 'PREVIEW_READY') blockers.push('WRITER_2_COMPOSITE_TRANSFER_PLAN_NOT_PREVIEW_READY');
  if (transferPlan?.transferScope?.status !== 'BOUND') blockers.push('WRITER_2_COMPOSITE_BOUND_TRANSFER_SCOPE_REQUIRED');
  const applied = (transferPlan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY');
  const sifCreates = applied.filter(isSifCreate);
  if (sifCreates.length) blockers.push(CII_WRITER_2_SIF_CREATE_BLOCKER);
  const unsupported = applied.filter((operation) => !isNodeMutation(operation) && !isSifDelete(operation) && !isSifCreate(operation));
  for (const operation of unsupported) blockers.push(`WRITER_2_COMPOSITE_UNSUPPORTED_APPLY:${operationId(operation) || 'unknown'}`);

  const nodeOperations = applied.filter(isNodeMutation);
  const sifDeletes = applied.filter(isSifDelete);
  if (!nodeOperations.length && !sifDeletes.length) blockers.push('WRITER_2_COMPOSITE_NO_MUTATIONS');

  const nodePlan = nodeOperations.length
    ? buildCiiWriter2NodeNameRelocationPlan({ targetDocument, transferPlan: projectPlan(transferPlan, isNodeMutation) })
    : null;
  const sifPlan = sifDeletes.length
    ? buildCiiWriter2SifDeleteRelocationPlan({ targetDocument, targetGraph, transferPlan: projectPlan(transferPlan, isSifDelete) })
    : null;
  if (nodePlan && !nodePlan.ready) blockers.push(...nodePlan.blockers);
  if (sifPlan && !sifPlan.ready) blockers.push(...sifPlan.blockers);
  if (sifPlan?.createAuthority?.ready !== false) blockers.push('WRITER_2_SIF_CREATE_AUTHORITY_UNEXPECTEDLY_READY');

  const unique = deepFreeze([...new Set(blockers)]);
  const ready = unique.length === 0;
  return deepFreeze({
    schema: 'CIIWorkspaceWriter2CompositeReadiness.v1',
    status: ready ? 'READY' : 'BLOCKED',
    ready,
    mutationCount: nodeOperations.length + sifDeletes.length,
    mutationOperationCount: nodeOperations.length + sifDeletes.length,
    familyMutationCounts: deepFreeze({ nodeName: nodeOperations.length, sifDelete: sifDeletes.length }),
    blockers: unique,
    components: deepFreeze({ nodeName: nodePlan, sifDelete: sifPlan }),
    createAuthority: deepFreeze({ ready: false, blocker: CII_WRITER_2_SIF_CREATE_BLOCKER }),
  });
}

export const _test = deepFreeze({
  text, operationId, isNodeRoute, isSifPresenceRoute, isNodeMutation, isSifDelete, isSifCreate,
  qualifiedCompositeMutation, operationSummary, projectPlan,
});
