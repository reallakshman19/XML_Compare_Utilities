import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import { inspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { buildCiiSourceTargetAudit } from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';

const cryptoRef = globalThis.crypto || webcrypto;
const fixture = (name) => readFileSync(fileURLToPath(new URL('../Benchmark/' + name, import.meta.url)));
const sources = ['S1', 'S2', 'S3'].map((sourceId) =>
  ({ sourceId, fileName: sourceId + '.CII', bytes: fixture(sourceId + '.CII') }));
const input = { sources, targetFileName: 'T.CII', targetBytes: fixture('T.CII') };
const inspection = await inspectCiiWorkspaceSourceSetWithVersionBridge(input, { cryptoRef });
const baseLoopsBySource = Object.fromEntries((inspection.memberInspections || []).map(({ sourceId, inspection: member }) => {
  const choice = ciiAutomaticBaseSelection(member.baseAnchorSuggestions || []);
  assert.equal(choice.status, 'READY', 'authentic ' + sourceId + ' method A base must be READY');
  return [sourceId, choice.baseLoops];
}));
const previewInput = { ...input, baseLoopsBySource };
const baseline = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput, { cryptoRef });
const trial = await createCiiWriter2SourceSetPreviewWithVersionBridge(previewInput, {
  cryptoRef, methodATerminalContinuation: true,
});
const before = buildCiiSourceTargetAudit(baseline);
const after = buildCiiSourceTargetAudit(trial);
const expected = [
  ['S1','3830','860'], ['S1','4960','1060'],
  ['S2','80','40050'], ['S2','50','40040'], ['S2','620','10460'],
  ['S3','1920','21920'],
];
const extracted = trial.memberPreviews.map(({sourceId,preview}) => ({
  sourceId,
  correspondenceStatus: preview.correspondence?.status,
  regions: (preview.multiBaseCorrespondence?.loopResults || []).flatMap(({loop,correspondence}) =>
    loop.method === 'METHOD_A_SPATIAL' ? (correspondence.methodATerminalContinuation?.regions || []) : []),
  proposed: (preview.multiBaseCorrespondence?.loopResults || []).flatMap(({loop,correspondence}) =>
    loop.method === 'METHOD_A_SPATIAL'
      ? (correspondence.methodATerminalContinuation?.nodeRows || []).map(({sourceNodeId,targetNodeId}) =>
          ({sourceNodeId,targetNodeId})) : []),
}));
const discovered = extracted.flatMap(({sourceId,proposed}) => proposed.map(({sourceNodeId,targetNodeId}) =>
  [sourceId, String(sourceNodeId), String(targetNodeId)]));
const payload = {
  schema: 'CiiMethodATerminalContinuationOptInQualification.v1',
  baseline: before.summary, trial: after.summary,
  combinedStatus: trial.correspondence?.status,
  combinedConflicts: trial.correspondence?.conflicts || [],
  discovered, expected, members: extracted,
  expectedRows: expected.map(([sourceId,sourceNodeId,targetNodeId]) => {
    const row = after.rows.find((candidate) => candidate.rowKey === sourceId + ':' + sourceNodeId);
    return {sourceId,sourceNodeId,targetNodeId,state:row?.state || 'MISSING',
      actualTargetId:row?.targetNodeId || null,confidence:row?.confidence || null,
      reasons:row?.reasons || []};
  }),
};
const dir = fileURLToPath(new URL('../test-results/cii-method-a-qualification/', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'terminal-optin.json'), JSON.stringify(payload,null,2) + '\n', 'utf8');
console.log(JSON.stringify(payload,null,2));

assert.equal(before.summary.totalSourceNodes, 150);
assert.equal(after.summary.totalSourceNodes, 150);
assert.equal(trial.correspondence?.status, 'READY', 'opt-in terminal stage must never introduce target conflicts');
assert.equal(trial.correspondence?.conflicts?.length, 0);
assert.deepEqual(discovered.sort((a,b)=>a.join('|').localeCompare(b.join('|'))),
  expected.sort((a,b)=>a.join('|').localeCompare(b.join('|'))),
  'only six strict, registered M1+M2+OD exterior pairs may emit');
for(const [sourceId,sourceNodeId,targetNodeId] of expected) {
  const row = after.rows.find((candidate) => candidate.rowKey === sourceId + ':' + sourceNodeId);
  assert.equal(row?.state, 'BOUND', sourceId + ':' + sourceNodeId + ' physically qualified terminal must be BOUND');
  assert.equal(String(row?.targetNodeId), targetNodeId);
  assert.equal(row.confidence, sourceId === 'S2' ? 'HIGH' : 'MEDIUM',
    'selected Method A base ceiling must be preserved');
}
for(const row of before.rows.filter((item)=>item.state==='BOUND')) {
  const next = after.rows.find((candidate)=>candidate.rowKey===row.rowKey);
  assert.equal(next?.state, 'BOUND', row.rowKey + ' baseline identity regression');
  assert.equal(next?.targetNodeId, row.targetNodeId);
  assert.equal(next?.confidence, row.confidence);
}
assert.equal(after.summary.BOUND, before.summary.BOUND + 6, 'only independently qualified terminal nodes may be recovered');
assert.equal(after.summary.UNRESOLVED, before.summary.UNRESOLVED);
assert.equal(after.summary.UNEMITTED, before.summary.UNEMITTED - 6);
console.log('CII authentic Method A terminal opt-in exact-pair qualification: PASS');
