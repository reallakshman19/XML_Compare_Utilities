import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';
import { applyCiiWorkspaceTargetWriter1C } from '../tabs/cii-workspace/cii-workspace-core.js';
import { CII_WRITER_1C_NODENAME_POLICY } from '../tabs/cii-workspace/cii-workspace-writer1c-nodename.js';

function nodeCandidate(custody) {
  const byNode = new Map();
  for (const span of Object.values(custody?.bySpan || {})) {
    const ownerNodes = [...new Set((span.owners || []).map((owner) => String(owner.nodeId)))];
    for (const nodeId of ownerNodes) {
      if (!byNode.has(nodeId)) byNode.set(nodeId, []);
      byNode.get(nodeId).push(span);
    }
  }
  for (const [nodeId, spans] of byNode) {
    if (!spans.length) continue;
    if (spans.some((span) => (span.owners || []).some((owner) => String(owner.nodeId) !== nodeId))) continue;
    const values = [...new Set(spans.map((span) => String(span.value || '')))];
    if (values.length !== 1) continue;
    const proposed = values[0] === 'W1C-QUAL' ? 'W1C-QUAL2' : 'W1C-QUAL';
    if (spans.every((span) => proposed.length <= Number(span.width))) return { nodeId, spans, before: values[0], proposed };
  }
  return null;
}

const targetPath = new URL('../Benchmark/CIICompare/BM_CII_TARGET1.CII', import.meta.url);
const targetBytes = new Uint8Array(await readFile(targetPath));
const targetDocument = await intakeCiiWorkspaceDocument(targetBytes, 'BM_CII_TARGET1.CII', { side: 'TARGET', cryptoRef: globalThis.crypto });
assert.equal(targetDocument.writer1CByteEligible, true);
assert.equal(targetDocument.nodeNameEvidence.physicalCustody.status, 'QUALIFIED',
  `benchmark NODENAME custody blockers: ${targetDocument.nodeNameEvidence.physicalCustody.blockers.join('|')}`);

const candidate = nodeCandidate(targetDocument.nodeNameEvidence.physicalCustody);
assert(candidate, 'benchmark must contain at least one non-aliased, preimage-consistent existing NODENAME node');

const operation = Object.freeze({
  operationId: `W1C_BENCH_${candidate.nodeId}`,
  family: 'NODE_NAME', property: 'Node name / to-name', action: 'COPY', status: 'PREVIEW_READY', scopeDecision: 'APPLY',
  policyAuthority: CII_WRITER_1C_NODENAME_POLICY,
  before: candidate.before, proposed: candidate.proposed,
  targetEvidence: Object.freeze({ identity: candidate.nodeId }),
  matchAuthority: Object.freeze({ status: 'REVIEWED' }),
});
const transferPlan = Object.freeze({
  status: 'PREVIEW_READY', blockers: Object.freeze([]), operations: Object.freeze([operation]),
  transferScope: Object.freeze({ status: 'BOUND', appliedOperationIds: Object.freeze([operation.operationId]), excludedOperationIds: Object.freeze([]) }),
});
const preview = Object.freeze({
  writerVersion: '1C', targetDocument, transferPlan,
  correspondence: Object.freeze({ status: 'READY' }),
});

const applied = await applyCiiWorkspaceTargetWriter1C(preview, targetBytes, { cryptoRef: globalThis.crypto });
assert.equal(applied.status, 'PASS');
assert.equal(applied.writer, 'WRITER_1C');
assert.equal(applied.byteLength, targetBytes.length);
assert(applied.mutationCount >= 1);
assert.equal(applied.validation.status, 'PASS');
assert.equal(applied.validation.expectedSemanticDeltaCount, 1);
assert.equal(applied.validation.unexpectedSemanticDeltaCount, 0);
assert.equal(applied.validation.authorizedSpanCount, applied.mutationCount);
assert(applied.validation.changedByteCount > 0);
assert.notEqual(applied.modifiedTargetSha256, applied.sourceTargetSha256);

console.log('Writer 1C benchmark production-parser round trip passed', {
  nodeId: candidate.nodeId,
  physicalSpanCount: candidate.spans.length,
  mutationCount: applied.mutationCount,
  changedByteCount: applied.validation.changedByteCount,
});
