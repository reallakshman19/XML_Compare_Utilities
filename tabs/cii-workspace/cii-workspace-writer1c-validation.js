import { stableStringify } from './cii-workspace-contracts.js';
import { ciiPhysicalSectionRows } from './cii-workspace-physical-file.js';

const POLICY = 'CII_WRITER_1C_NODENAME_EXISTING_ROW_FIELD';

function text(value) { return String(value ?? '').trim(); }
function targetNodeId(operation) { return text(operation?.targetEvidence?.identity || operation?.targetEvidence?.nodeId); }
function applyNodeNameOperations(plan) {
  return (plan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY'
    && operation?.family === 'NODE_NAME' && operation?.property === 'Node name / to-name'
    && operation?.action === 'COPY' && operation?.status === 'PREVIEW_READY'
    && operation?.policyAuthority === POLICY);
}
function encode(value, width) {
  const normalized = text(value);
  for (const char of normalized) if (char.codePointAt(0) > 0x7f) throw new Error('WRITER_1C_VALIDATOR_NON_ASCII');
  if (normalized.length > width) throw new Error('WRITER_1C_VALIDATOR_FIELD_OVERFLOW');
  return normalized.padEnd(width, ' ');
}
function independentAuthorizedSpans(beforeDocument, transferPlan, errors) {
  const custody = beforeDocument?.nodeNameEvidence?.physicalCustody; const operations = applyNodeNameOperations(transferPlan);
  const byNode = new Map(operations.map((operation) => [targetNodeId(operation), operation])); const spans = [];
  for (const [spanKey, span] of Object.entries(custody?.bySpan || {})) {
    const ownerNodes = [...new Set((span.owners || []).map((owner) => String(owner.nodeId)))];
    const selected = ownerNodes.map((nodeId) => byNode.get(nodeId)).filter(Boolean);
    if (!selected.length) continue;
    const desired = new Set(selected.map((operation) => encode(operation.proposed, Number(span.width))));
    if (desired.size !== 1) { errors.push(`AUTHORIZED_SPAN_CONFLICT:${spanKey}`); continue; }
    const unselected = ownerNodes.filter((nodeId) => !byNode.has(nodeId));
    const afterField = [...desired][0];
    if (unselected.length && afterField !== span.rawField) errors.push(`AUTHORIZED_SPAN_UNAPPROVED_ALIAS:${spanKey}:${unselected.join(',')}`);
    for (const operation of selected) {
      if (text(operation.before) !== text(span.value)) errors.push(`AUTHORIZED_SPAN_PREIMAGE_MISMATCH:${operation.operationId}:${spanKey}`);
    }
    spans.push(Object.freeze({
      spanKey, byteStart: Number(span.byteStart), byteEnd: Number(span.byteEnd), beforeField: span.rawField, afterField,
      targetNodeIds: Object.freeze(selected.map(targetNodeId).sort()),
    }));
  }
  const selectedNodes = new Set(operations.map(targetNodeId));
  for (const nodeId of selectedNodes) {
    if (!spans.some((span) => span.targetNodeIds.includes(nodeId))) errors.push(`AUTHORIZED_NODE_SPAN_MISSING:${nodeId}`);
  }
  return spans.sort((a, b) => a.byteStart - b.byteStart || a.byteEnd - b.byteEnd);
}
function actualByteDiff(beforeBytes, afterBytes, spans, errors) {
  if (beforeBytes.length !== afterBytes.length) { errors.push('BYTE_LENGTH_CHANGED'); return []; }
  const changed = []; let spanIndex = 0;
  for (let index = 0; index < beforeBytes.length; index += 1) {
    if (beforeBytes.charCodeAt(index) === afterBytes.charCodeAt(index)) continue;
    changed.push(index);
    while (spanIndex < spans.length && index >= spans[spanIndex].byteEnd) spanIndex += 1;
    const span = spans[spanIndex];
    if (!span || index < span.byteStart || index >= span.byteEnd) errors.push(`UNAUTHORIZED_BYTE_CHANGE:${index}`);
  }
  for (const span of spans) {
    if (beforeBytes.slice(span.byteStart, span.byteEnd) !== span.beforeField) errors.push(`VALIDATOR_BEFORE_FIELD_MISMATCH:${span.spanKey}`);
    if (afterBytes.slice(span.byteStart, span.byteEnd) !== span.afterField) errors.push(`VALIDATOR_AFTER_FIELD_MISMATCH:${span.spanKey}`);
  }
  return changed;
}
function sectionOrder(document) {
  return (document?.physicalFile?.lines || []).map((line) => String(line.text || '').match(/^\s*#\$\s*(.*?)\s*$/)?.[1]?.toUpperCase()).filter(Boolean);
}
function sectionCount(document, names) { return ciiPhysicalSectionRows(document?.physicalFile, names).length; }
function pointerSnapshot(document) {
  return Object.values(document?.auxiliaryEvidence?.elements || {}).map((item) => ({
    parsedElementIndex: item.parsedElementIndex, from: item.from, to: item.to, pointers: item.pointers,
  }));
}
function connectivity(document) {
  return (document?.parsed?.elements || []).map((item) => ({ index: item.index, from: item.from, to: item.to }));
}
function structuralChecks(before, after, errors) {
  if (before?.physicalFile?.byteLength !== after?.physicalFile?.byteLength) errors.push('PHYSICAL_BYTE_LENGTH_CHANGED');
  if ((before?.physicalFile?.lines || []).length !== (after?.physicalFile?.lines || []).length) errors.push('PHYSICAL_LINE_COUNT_CHANGED');
  if (stableStringify(before?.physicalFile?.lineEndings?.sequence) !== stableStringify(after?.physicalFile?.lineEndings?.sequence)) errors.push('LINE_ENDING_SEQUENCE_CHANGED');
  if (stableStringify(sectionOrder(before)) !== stableStringify(sectionOrder(after))) errors.push('SECTION_ORDER_CHANGED');
  const beforeElementRows = ciiPhysicalSectionRows(before?.physicalFile, 'ELEMENTS');
  const afterElementRows = ciiPhysicalSectionRows(after?.physicalFile, 'ELEMENTS');
  if (beforeElementRows.length !== afterElementRows.length || beforeElementRows.length % 15 !== 0 || afterElementRows.length % 15 !== 0) errors.push('ELEMENT_15_ROW_CARDINALITY_CHANGED');
  if (stableStringify(pointerSnapshot(before)) !== stableStringify(pointerSnapshot(after))) errors.push('AUXILIARY_POINTER_OWNERSHIP_CHANGED');
  if (stableStringify(ciiPhysicalSectionRows(before?.physicalFile, 'CONTROL').map((row) => row.text))
    !== stableStringify(ciiPhysicalSectionRows(after?.physicalFile, 'CONTROL').map((row) => row.text))) errors.push('CONTROL_VALUES_CHANGED');
  for (const [label, names] of [['NODENAME', 'NODENAME'], ['SIF_TEE', ['SIF&TEES', 'SIF']], ['RESTRANT', 'RESTRANT'], ['RIGID', 'RIGID'], ['MISCEL_1', 'MISCEL_1']]) {
    if (sectionCount(before, names) !== sectionCount(after, names)) errors.push(`${label}_ROW_COUNT_CHANGED`);
  }
  if (stableStringify(before?.parsed?.nodes || {}) !== stableStringify(after?.parsed?.nodes || {})) errors.push('NODE_IDENTITIES_OR_GEOMETRY_CHANGED');
  if (stableStringify(connectivity(before)) !== stableStringify(connectivity(after))) errors.push('ELEMENT_CONNECTIVITY_CHANGED');
}
function semanticChecks(before, after, transferPlan, errors) {
  const expected = { ...(before?.nodeNames || {}) }; const operations = applyNodeNameOperations(transferPlan); const intended = new Set();
  for (const operation of operations) {
    const nodeId = targetNodeId(operation); expected[nodeId] = text(operation.proposed); intended.add(nodeId);
  }
  if (stableStringify(expected) !== stableStringify(after?.nodeNames || {})) errors.push('NODE_NAME_SEMANTIC_POSTCONDITION_FAILED');
  if (stableStringify(before?.auxiliaryEvidence || {}) !== stableStringify(after?.auxiliaryEvidence || {})) errors.push('UNEXPECTED_AUXILIARY_SEMANTIC_CHANGE');
  if (stableStringify(before?.hangerEvidence || {}) !== stableStringify(after?.hangerEvidence || {})) errors.push('UNEXPECTED_HANGER_SEMANTIC_CHANGE');
  const actualChanged = new Set([...new Set([...Object.keys(before?.nodeNames || {}), ...Object.keys(after?.nodeNames || {})])]
    .filter((nodeId) => text(before?.nodeNames?.[nodeId]) !== text(after?.nodeNames?.[nodeId])));
  const unexpected = [...actualChanged].filter((nodeId) => !intended.has(nodeId));
  if (unexpected.length) errors.push(`UNEXPECTED_NODE_NAME_DELTA:${unexpected.join(',')}`);
  return { expectedSemanticDeltaCount: intended.size, actualSemanticDeltaCount: actualChanged.size, unexpectedSemanticDeltaCount: unexpected.length };
}
function writerClaimCheck(writerResult, spans, errors) {
  const expected = spans.map((span) => `${span.byteStart}:${span.byteEnd}`).sort();
  const reported = (writerResult?.mutations || []).map((item) => `${Number(item.absoluteByteStart)}:${Number(item.absoluteByteEnd)}`).sort();
  if (stableStringify(expected) !== stableStringify(reported)) errors.push('WRITER_REPORTED_SPAN_SET_MISMATCH');
}

export function validateCiiWriter1CRoundTrip(beforeDocument, afterDocument, transferPlan, writerResult) {
  const errors = [];
  if (beforeDocument?.writer1CByteEligible !== true || afterDocument?.writer1CByteEligible !== true) errors.push('ORIGINAL_BYTE_CUSTODY_REQUIRED');
  const spans = independentAuthorizedSpans(beforeDocument, transferPlan, errors);
  const changed = actualByteDiff(String(beforeDocument?.physicalFile?.originalByteString ?? ''), String(afterDocument?.physicalFile?.originalByteString ?? ''), spans, errors);
  structuralChecks(beforeDocument, afterDocument, errors);
  const semantic = semanticChecks(beforeDocument, afterDocument, transferPlan, errors);
  writerClaimCheck(writerResult, spans, errors);
  if (errors.length) throw new Error(`CII_WRITER_1C_NEGATIVE_ASSURANCE_FAILED:${[...new Set(errors)].join('|')}`);
  return Object.freeze({
    schema: 'CIIWorkspaceWriter1CValidation.v1', status: 'PASS',
    authorizedSpanCount: spans.length, changedByteCount: changed.length,
    expectedSemanticDeltaCount: semantic.expectedSemanticDeltaCount,
    actualSemanticDeltaCount: semantic.actualSemanticDeltaCount,
    unexpectedSemanticDeltaCount: semantic.unexpectedSemanticDeltaCount,
    checks: Object.freeze([
      'BYTE_DIFF_SUBSET_OF_INDEPENDENT_AUTHORIZATION', 'EXACT_AUTHORIZED_PREIMAGE_AND_POSTIMAGE',
      'LINE_AND_SECTION_STRUCTURE_UNCHANGED', 'ELEMENT_POINTERS_AND_CONTROL_UNCHANGED',
      'AUXILIARY_SECTION_COUNTS_UNCHANGED', 'NODE_AND_CONNECTIVITY_UNCHANGED',
      'EXPECTED_NODE_NAME_SEMANTICS_ONLY', 'WRITER_REPORT_MATCHES_INDEPENDENT_SPANS',
    ]),
  });
}
