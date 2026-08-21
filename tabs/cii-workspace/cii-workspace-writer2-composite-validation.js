import { stableStringify } from './cii-workspace-contracts.js';
import { CII_SIX_FIELD_WIDTHS, decodeCiiNumericRow } from '../../parser/fixed-field.js';
import { ciiPhysicalSectionRows } from './cii-workspace-physical-file.js';
import { buildCiiWriter2NodeNameRelocationPlan } from './cii-workspace-writer2-nodename-relocation.js';
import { buildCiiWriter2SifDeleteRelocationPlan } from './cii-workspace-writer2-sif-delete.js';

const NODE_PROPERTY = 'Node name / to-name';
const SIF_PROPERTY = 'SIF/Tee record presence';
const WIDTH = 13;
const SIF_ROWS = 10;

function text(value) { return String(value ?? '').trim(); }
function markerName(value) {
  const match = String(value ?? '').match(/^\s*#\$\s*(.*?)\s*$/);
  return match ? match[1].trim().toUpperCase() : null;
}
function isNodeMutation(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'NODE_NAME'
    && operation?.property === NODE_PROPERTY && ['CREATE', 'DELETE'].includes(operation?.action);
}
function isSifDelete(operation) {
  return operation?.scopeDecision === 'APPLY' && operation?.family === 'SIF_TEE'
    && operation?.property === SIF_PROPERTY && operation?.action === 'DELETE';
}
function supportedApply(operation) { return isNodeMutation(operation) || isSifDelete(operation); }
function projectPlan(transferPlan, predicate) {
  return Object.freeze({
    ...transferPlan,
    operations: Object.freeze((transferPlan?.operations || []).map((operation) => operation?.scopeDecision === 'APPLY' && !predicate(operation)
      ? Object.freeze({ ...operation, scopeDecision: 'EXCLUDE' }) : operation)),
    transferScope: Object.freeze({ ...(transferPlan?.transferScope || {}), status: 'BOUND' }),
  });
}
function integerField(value) {
  const number = Number(value); if (!Number.isSafeInteger(number) || number < 0) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_INTEGER_INVALID');
  const token = String(number); if (token.length > WIDTH) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_INTEGER_OVERFLOW');
  return token.padStart(WIDTH, ' ');
}
function exponential(value) {
  const [mantissa, rawExponent] = Number(value).toExponential(6).toUpperCase().split('E'); const exponent = Number(rawExponent);
  return `${mantissa}E${exponent < 0 ? '-' : '+'}${String(Math.abs(exponent)).padStart(2, '0')}`;
}
function independentSig6(value) {
  const number = Number(value); if (!Number.isFinite(number)) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_NUMERIC_INVALID');
  const absolute = Math.abs(number); if (absolute < 1e-12) return '0.000000';
  if (absolute >= 1e9 || absolute < 1e-6) return exponential(number); if (absolute < 1.0) return number.toFixed(6);
  const integerDigits = String(Math.trunc(absolute)).length; return number.toFixed(Math.max(1, 6 - integerDigits));
}
function numericField(value) {
  const token = independentSig6(value); if (token.length > WIDTH) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_NUMERIC_OVERFLOW');
  return token.padStart(WIDTH, ' ');
}
function lineEnding(kind) {
  if (kind === 'CRLF') return '\r\n'; if (kind === 'LF') return '\n'; if (kind === 'CR') return '\r'; if (kind === 'NONE') return '';
  throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_LINE_ENDING_UNSUPPORTED:${kind || 'EMPTY'}`);
}
function sectionEnvelope(document, wanted) {
  const names = new Set((Array.isArray(wanted) ? wanted : [wanted]).map((item) => String(item).toUpperCase()));
  const lines = document?.physicalFile?.lines || [];
  const markerIndex = lines.findIndex((line) => names.has(markerName(line.text)));
  if (markerIndex < 0) throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_SECTION_NOT_FOUND:${[...names].join('|')}`);
  let nextIndex = markerIndex + 1; while (nextIndex < lines.length && markerName(lines[nextIndex].text) === null) nextIndex += 1;
  if (nextIndex >= lines.length) throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_NEXT_SECTION_REQUIRED:${[...names].join('|')}`);
  return { marker: lines[markerIndex], nextMarker: lines[nextIndex], rows: lines.slice(markerIndex + 1, nextIndex) };
}
function controlField(before, rowIndex, fieldIndex, beforeCount, afterCount, kind, authorityFamily) {
  const rows = ciiPhysicalSectionRows(before?.physicalFile, 'CONTROL', { includeBlank: true }); const row = rows[rowIndex];
  if (!row) throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_CONTROL_ROW_REQUIRED:${rowIndex + 1}`);
  const startColumn = CII_SIX_FIELD_WIDTHS.slice(0, fieldIndex).reduce((sum, width) => sum + width, 0);
  const byteStart = Number(row.byteStart) + startColumn; const byteEnd = byteStart + WIDTH; const original = String(before.physicalFile.originalByteString || '');
  const beforeField = original.slice(byteStart, byteEnd); if (beforeField !== integerField(beforeCount)) throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_CONTROL_PREIMAGE:${kind}`);
  return { authorityFamily, kind, byteStart, byteEnd, beforeField, afterField: integerField(afterCount) };
}
function nodeExpectedClaims(before, plan) {
  const original = String(before?.physicalFile?.originalByteString || '');
  const claims = [controlField(before, 0, 3, plan.controlCountBefore, plan.controlCountAfter, 'CONTROL_NONAM', 'WRITER_2_NODENAME')];
  for (const change of plan.pointerChanges || []) {
    const byteStart = Number(change.pointerField?.byteStart); const byteEnd = Number(change.pointerField?.byteEnd);
    if (!Number.isSafeInteger(byteStart) || !Number.isSafeInteger(byteEnd) || byteEnd - byteStart !== WIDTH) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_NODE_POINTER_SPAN');
    claims.push({ authorityFamily: 'WRITER_2_NODENAME', kind: 'ELEMENT_NODENAME_POINTER', parsedElementIndex: Number(change.parsedElementIndex),
      byteStart, byteEnd, beforeField: original.slice(byteStart, byteEnd), afterField: numericField(change.newPointer) });
  }
  const envelope = sectionEnvelope(before, 'NODENAME');
  if (envelope.rows.some((row) => !String(row.text || '').trim())) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_BLANK_NODENAME_ROW');
  if (envelope.rows.some((row) => String(row.text || '').length !== 53)) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_NODENAME_WIDTH');
  if (envelope.rows.length !== Number(plan.rowCountBefore)) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_NODENAME_PRECOUNT');
  const appendEnding = envelope.rows.length ? envelope.rows[envelope.rows.length - 1].lineEnding : envelope.marker.lineEnding;
  const afterField = (plan.finalRows || []).map((row) => {
    const ending = row.oldPointer == null ? appendEnding : envelope.rows[Number(row.oldPointer) - 1]?.lineEnding;
    if (!ending || ending === 'NONE') throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_NODENAME_ENDING:${row.oldPointer ?? 'NEW'}`);
    return `${String(row.rowText)}${lineEnding(ending)}`;
  }).join('');
  claims.push({ authorityFamily: 'WRITER_2_NODENAME', kind: 'NODENAME_SECTION_PAYLOAD', byteStart: Number(envelope.marker.byteEnd), byteEnd: Number(envelope.nextMarker.byteStart),
    beforeField: original.slice(Number(envelope.marker.byteEnd), Number(envelope.nextMarker.byteStart)), afterField });
  return claims;
}
function sifExpectedClaims(before, plan) {
  const original = String(before?.physicalFile?.originalByteString || '');
  const claims = [controlField(before, 2, 4, plan.controlCountBefore, plan.controlCountAfter, 'CONTROL_SIF_TEE_COUNT', 'WRITER_2_SIF_DELETE')];
  for (const change of plan.pointerChanges || []) {
    const byteStart = Number(change.pointerField?.byteStart); const byteEnd = Number(change.pointerField?.byteEnd);
    if (!Number.isSafeInteger(byteStart) || !Number.isSafeInteger(byteEnd) || byteEnd - byteStart !== WIDTH) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_SIF_POINTER_SPAN');
    claims.push({ authorityFamily: 'WRITER_2_SIF_DELETE', kind: 'ELEMENT_SIF_TEE_POINTER', parsedElementIndex: Number(change.parsedElementIndex),
      byteStart, byteEnd, beforeField: original.slice(byteStart, byteEnd), afterField: numericField(change.newPointer) });
  }
  const envelope = sectionEnvelope(before, ['SIF&TEES', 'SIF']);
  if (envelope.rows.length !== Number(plan.blockCountBefore) * SIF_ROWS) throw new Error('WRITER_2_COMPOSITE_VALIDATOR_SIF_PRECOUNT');
  const retained = [];
  for (const pointer of plan.retainedPointers || []) {
    const start = (Number(pointer) - 1) * SIF_ROWS; const rows = envelope.rows.slice(start, start + SIF_ROWS);
    if (rows.length !== SIF_ROWS) throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_SIF_BLOCK_TRUNCATED:${pointer}`);
    for (const row of rows) {
      if (row.lineEnding === 'NONE') throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_SIF_ENDING:${pointer}:${row.lineNumber}`);
      retained.push(original.slice(Number(row.byteStart), Number(row.byteEnd)));
    }
  }
  claims.push({ authorityFamily: 'WRITER_2_SIF_DELETE', kind: 'SIF_TEE_SECTION_PAYLOAD', byteStart: Number(envelope.marker.byteEnd), byteEnd: Number(envelope.nextMarker.byteStart),
    beforeField: original.slice(Number(envelope.marker.byteEnd), Number(envelope.nextMarker.byteStart)), afterField: retained.join('') });
  return claims;
}
function arbitrateExpected(claims, original) {
  const sorted = claims.filter((item) => item.beforeField !== item.afterField).sort((a, b) => a.byteStart - b.byteStart || a.byteEnd - b.byteEnd || a.authorityFamily.localeCompare(b.authorityFamily));
  for (const claim of sorted) if (original.slice(claim.byteStart, claim.byteEnd) !== claim.beforeField) throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_PREIMAGE_MISMATCH:${claim.kind}`);
  for (let index = 1; index < sorted.length; index += 1) if (sorted[index].byteStart < sorted[index - 1].byteEnd) throw new Error(`WRITER_2_COMPOSITE_VALIDATOR_OVERLAP:${sorted[index - 1].kind}:${sorted[index].kind}`);
  return sorted;
}
function applyExpected(original, claims) {
  let cursor = 0; let output = '';
  for (const claim of claims) { output += original.slice(cursor, claim.byteStart) + claim.afterField; cursor = claim.byteEnd; }
  return output + original.slice(cursor);
}
function testimony(claims) {
  return (claims || []).map((item) => ({ authorityFamily: item.authorityFamily, kind: item.kind, byteStart: Number(item.byteStart), byteEnd: Number(item.byteEnd), afterField: item.afterField,
    ...(item.parsedElementIndex != null ? { parsedElementIndex: Number(item.parsedElementIndex) } : {}) }));
}
function nodePointerSnapshot(document) {
  return Object.values(document?.nodeNameEvidence?.physicalCustody?.byElementIndex || {}).map((item) => ({ parsedElementIndex: Number(item.parsedElementIndex), from: String(item.from), to: String(item.to), pointer: Number(item.pointer) }))
    .sort((a, b) => a.parsedElementIndex - b.parsedElementIndex);
}
function sifPointerSnapshot(document) {
  return Object.values(document?.sifWriter1CEvidence?.byParsedElementIndex || {}).map((item) => ({ parsedElementIndex: Number(item.parsedElementIndex), from: String(item.from), to: String(item.to), pointer: Number(item.pointer) }))
    .sort((a, b) => a.parsedElementIndex - b.parsedElementIndex);
}
function expectedPointerSnapshot(beforeSnapshot, plan) {
  const changes = new Map((plan?.pointerChanges || []).map((item) => [Number(item.parsedElementIndex), Number(item.newPointer)]));
  return beforeSnapshot.map((item) => ({ ...item, pointer: changes.has(item.parsedElementIndex) ? changes.get(item.parsedElementIndex) : item.pointer }));
}
function expectedNodeNames(before, transferPlan) {
  const expected = { ...(before?.nodeNames || {}) };
  for (const operation of transferPlan?.operations || []) {
    if (!isNodeMutation(operation)) continue;
    const nodeId = text(operation?.targetEvidence?.identity || operation?.targetEvidence?.nodeId); if (!nodeId) continue;
    if (operation.action === 'CREATE') expected[nodeId] = text(operation.proposed); else delete expected[nodeId];
  }
  return expected;
}
function connectivity(document) { return (document?.parsed?.elements || []).map((item) => ({ index: Number(item.index), from: String(item.from), to: String(item.to) })); }
function sectionOrder(document) { return (document?.physicalFile?.lines || []).map((line) => markerName(line.text)).filter(Boolean); }
function controlCount(document, rowIndex, fieldIndex) {
  const row = ciiPhysicalSectionRows(document?.physicalFile, 'CONTROL')[rowIndex]; const values = row ? decodeCiiNumericRow(row.text) : [];
  return Number(values?.[fieldIndex]);
}
function relocationTestimony(plan, family) {
  if (!plan) return null;
  if (family === 'NODE') return { rowCountAfter: Number(plan.rowCountAfter), oldToNewPointer: plan.oldToNewPointer || {}, pointerChanges: (plan.pointerChanges || []).map((item) => [Number(item.parsedElementIndex), Number(item.oldPointer), Number(item.newPointer)]) };
  return { blockCountAfter: Number(plan.blockCountAfter), deletedPointers: [...(plan.deletedPointers || [])], oldToNewPointer: plan.oldToNewPointer || {}, pointerChanges: (plan.pointerChanges || []).map((item) => [Number(item.parsedElementIndex), Number(item.oldPointer), Number(item.newPointer)]) };
}

export function validateCiiWriter2CompositeRoundTrip(before, after, targetGraph, transferPlan, writerResult) {
  const errors = []; const applied = (transferPlan?.operations || []).filter((operation) => operation?.scopeDecision === 'APPLY');
  const unsupported = applied.filter((operation) => !supportedApply(operation));
  if (unsupported.length) errors.push(`UNSUPPORTED_APPLY:${unsupported.map((item) => item.operationId || 'unknown').join(',')}`);
  const nodeCount = applied.filter(isNodeMutation).length; const sifCount = applied.filter(isSifDelete).length;
  if (!nodeCount && !sifCount) errors.push('NO_COMPOSITE_MUTATIONS');
  const nodePlan = nodeCount ? buildCiiWriter2NodeNameRelocationPlan({ targetDocument: before, transferPlan: projectPlan(transferPlan, isNodeMutation) }) : null;
  const sifPlan = sifCount ? buildCiiWriter2SifDeleteRelocationPlan({ targetDocument: before, targetGraph, transferPlan: projectPlan(transferPlan, isSifDelete) }) : null;
  if (nodePlan && !nodePlan.ready) errors.push(...nodePlan.blockers.map((item) => `INDEPENDENT_NODE_PLAN_BLOCKED:${item}`));
  if (sifPlan && !sifPlan.ready) errors.push(...sifPlan.blockers.map((item) => `INDEPENDENT_SIF_PLAN_BLOCKED:${item}`));
  if (sifPlan?.createAuthority?.ready !== false) errors.push('SIF_CREATE_AUTHORITY_UNEXPECTEDLY_READY');
  const original = String(before?.physicalFile?.originalByteString || '');
  let expectedClaims = []; let expectedBytes = null;
  if (!errors.length) {
    expectedClaims = arbitrateExpected([...(nodePlan ? nodeExpectedClaims(before, nodePlan) : []), ...(sifPlan ? sifExpectedClaims(before, sifPlan) : [])], original);
    expectedBytes = applyExpected(original, expectedClaims);
  }
  const actualBytes = String(after?.physicalFile?.originalByteString || '');
  if (expectedBytes != null && actualBytes !== expectedBytes) errors.push('EXACT_COMPOSITE_POSTIMAGE_MISMATCH');
  if (writerResult?.byteString != null && String(writerResult.byteString) !== actualBytes) errors.push('COMPOSITE_RESULT_BYTES_MISMATCH');
  if (stableStringify(testimony(writerResult?.mutations)) !== stableStringify(testimony(expectedClaims))) errors.push('COMPOSITE_MUTATION_TESTIMONY_MISMATCH');
  if (stableStringify(connectivity(before)) !== stableStringify(connectivity(after))) errors.push('CONNECTIVITY_CHANGED');
  if (stableStringify(sectionOrder(before)) !== stableStringify(sectionOrder(after))) errors.push('SECTION_ORDER_CHANGED');
  if (nodePlan) {
    if (after?.nodeNameEvidence?.physicalCustody?.status !== 'QUALIFIED') errors.push('POST_NODENAME_CUSTODY_NOT_QUALIFIED');
    if (controlCount(after, 0, 3) !== Number(nodePlan.controlCountAfter)) errors.push('CONTROL_NONAM_POSTCOUNT_MISMATCH');
    if (ciiPhysicalSectionRows(after?.physicalFile, 'NODENAME').length !== Number(nodePlan.rowCountAfter)) errors.push('NODENAME_ROW_COUNT_MISMATCH');
    if (stableStringify(nodePointerSnapshot(after)) !== stableStringify(expectedPointerSnapshot(nodePointerSnapshot(before), nodePlan))) errors.push('NODENAME_POINTER_POSTIMAGE_MISMATCH');
    if (stableStringify(after?.nodeNames || {}) !== stableStringify(expectedNodeNames(before, transferPlan))) errors.push('NODENAME_SEMANTIC_POSTIMAGE_MISMATCH');
    if (stableStringify(relocationTestimony(writerResult?.components?.nodeName?.relocationPlan, 'NODE')) !== stableStringify(relocationTestimony(nodePlan, 'NODE'))) errors.push('NODE_COMPONENT_RELOCATION_TESTIMONY_MISMATCH');
  }
  if (sifPlan) {
    if (after?.sifWriter1CEvidence?.status !== 'QUALIFIED') errors.push('POST_SIF_CUSTODY_NOT_QUALIFIED');
    if (controlCount(after, 2, 4) !== Number(sifPlan.controlCountAfter)) errors.push('CONTROL_SIF_POSTCOUNT_MISMATCH');
    if (ciiPhysicalSectionRows(after?.physicalFile, ['SIF&TEES', 'SIF']).length !== Number(sifPlan.blockCountAfter) * SIF_ROWS) errors.push('SIF_ROW_COUNT_MISMATCH');
    if (stableStringify(sifPointerSnapshot(after)) !== stableStringify(expectedPointerSnapshot(sifPointerSnapshot(before), sifPlan))) errors.push('SIF_POINTER_POSTIMAGE_MISMATCH');
    if (stableStringify(relocationTestimony(writerResult?.components?.sifDelete?.relocationPlan, 'SIF')) !== stableStringify(relocationTestimony(sifPlan, 'SIF'))) errors.push('SIF_COMPONENT_RELOCATION_TESTIMONY_MISMATCH');
  }
  if (errors.length) throw new Error(`CII_WRITER_2_COMPOSITE_ROUNDTRIP_FAILED:${[...new Set(errors)].join('|')}`);
  return Object.freeze({
    schema: 'CIIWorkspaceWriter2CompositeValidation.v1', status: 'PASS',
    checks: Object.freeze(['ONE_ORIGINAL_PREIMAGE', 'INDEPENDENT_COMPONENT_PLAN_REBUILD', 'ORIGINAL_COORDINATE_ARBITRATION', 'EXACT_FULL_BYTE_POSTIMAGE',
      'CONTROL_COUNTS', 'POINTER_RELOCATION', 'NODENAME_SEMANTICS', 'CONNECTIVITY_STABLE', 'SECTION_ORDER_STABLE', 'WRITER_TESTIMONY_MATCH', 'SIF_CREATE_REMAINS_BLOCKED']),
    nodeNameOperationCount: nodeCount, sifDeleteOperationCount: sifCount, expectedMutationCount: expectedClaims.length,
  });
}

export const _test = Object.freeze({ isNodeMutation, isSifDelete, supportedApply, projectPlan, integerField, numericField, sectionEnvelope,
  nodeExpectedClaims, sifExpectedClaims, arbitrateExpected, applyExpected, testimony });
