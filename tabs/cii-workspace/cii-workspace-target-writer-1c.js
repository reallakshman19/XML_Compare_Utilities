import { ciiPhysicalFileBytes } from './cii-workspace-physical-file.js';
import { buildWriter1CNodeNamePlan } from './cii-workspace-writer1c-nodename.js';

function asciiFromBytes(bytes, start, end) {
  let out = '';
  for (let index = start; index < end; index += 1) out += String.fromCharCode(bytes[index]);
  return out;
}

function writeAscii(bytes, start, value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0x7f) throw new Error('CII_WRITER_1C_NODENAME_NON_ASCII');
    bytes[start + index] = code;
  }
}

export function ciiWriter1CReadiness(transferPlan, targetDocument) {
  const plan = buildWriter1CNodeNamePlan({ transferPlan, targetDocument });
  return Object.freeze({
    schema: 'CIIWorkspaceWriter1CReadiness.v1',
    status: plan.ready ? 'READY' : 'BLOCKED', ready: plan.ready,
    mutationCount: plan.mutationCount, blockers: plan.blockers,
  });
}

export function applyCiiTargetWriter1C({ targetDocument, transferPlan }) {
  const plan = buildWriter1CNodeNamePlan({ transferPlan, targetDocument });
  if (!plan.ready) throw new Error(`CII_WRITER_1C_BLOCKED:${plan.blockers.join('|')}`);
  const original = ciiPhysicalFileBytes(targetDocument.physicalFile); const bytes = new Uint8Array(original);
  const mutations = [];
  for (const mutation of plan.mutations) {
    const actual = asciiFromBytes(bytes, mutation.byteStart, mutation.byteEnd);
    if (actual !== mutation.beforeField) {
      throw new Error(`CII_WRITER_1C_NODENAME_PREIMAGE_MISMATCH:${mutation.operationIds.join(',')}:${mutation.spanKey}`);
    }
    if (mutation.afterField.length !== mutation.width) {
      throw new Error(`CII_WRITER_1C_NODENAME_LAYOUT_DRIFT:${mutation.spanKey}`);
    }
    writeAscii(bytes, mutation.byteStart, mutation.afterField);
    mutations.push(Object.freeze({
      lineNumber: mutation.lineNumber,
      startColumn: mutation.startColumn + 1,
      endColumn: mutation.endColumn,
      absoluteByteStart: mutation.byteStart,
      absoluteByteEnd: mutation.byteEnd,
      beforeField: mutation.beforeField,
      afterField: mutation.afterField,
      operationIds: mutation.operationIds,
      section: 'NODENAME', recordIdentity: `NODENAME_ROW:${mutation.owners?.[0]?.rowIndex ?? 'unknown'}`,
      fieldIdentity: mutation.fieldIdentity,
      targetNodeIds: mutation.targetNodeIds,
    }));
  }
  if (bytes.length !== original.length) throw new Error('CII_WRITER_1C_BYTE_LENGTH_CHANGED');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return Object.freeze({
    schema: 'CIIWorkspaceWriter1CResult.v1', writerVersion: '1C',
    bytes, text, byteLength: bytes.length,
    mutationCount: mutations.length, mutations: Object.freeze(mutations),
  });
}
