import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-source-set.js';
import { ciiAutomaticBaseSelection } from '../tabs/cii-workspace/cii-workspace-base-loop-selection.js';
import { createCiiWriter2SourceSetPreviewWithVersionBridge } from '../tabs/cii-workspace/cii-workspace-multisource-preview.js';
import { buildCiiSourceTargetAudit } from '../tabs/cii-workspace/cii-workspace-source-target-audit.js';
import { propagateSingleCiiAnchorCorrespondence } from '../tabs/cii-workspace/cii-workspace-propagation.js';

const contents = name => readFileSync(new URL('../Benchmark/' + name, import.meta.url));
const sources = ['S1.CII', 'S2.CII', 'S3.CII']
  .map((fileName, i) => ({ sourceId: 'S' + (i + 1), fileName, bytes: contents(fileName) }));
const targetBytes = contents('T.CII');
const prepared = await prepareAndInspectCiiWorkspaceSourceSetWithVersionBridge(
  { sources, targetBytes, targetFileName: 'T.CII' }, { cryptoRef: webcrypto });
const { inspection, preparedSession } = prepared;
assert.equal(preparedSession.members.length, 3);
const target = preparedSession.target.targetGraph;
const scenarios = [
  ['S2', '420', '415', '10330'],
  ['S3', '1560', '7880', '8890'],
];
const candidates = {};
for (const [sourceId, sourceNodeId, rejectedTarget, investigatedTarget] of scenarios) {
  const graph = preparedSession.members.find(item => item.sourceId === sourceId).sourceGraph;
  const trial = (targetNodeId, opts) => propagateSingleCiiAnchorCorrespondence(graph, target,
    { sourceNodeId, targetNodeId }, { singleAnchorPathRecovery: true, ...opts });
  const rejected = trial(rejectedTarget);
  assert.equal(rejected.nodeRows[0].targetNodeId, rejectedTarget);
  assert.equal(rejected.nodeRows.filter(row => row.sourceNodeId != null).length, 1,
    sourceId + ': an invalid manual seed must not generate other NODE authority');
  const result = trial(investigatedTarget);
  const nodeRows = result.nodeRows.filter(row => row.sourceNodeId != null);
  const claims = new Map();
  for (const row of nodeRows) {
    assert(!claims.has(String(row.sourceNodeId)), sourceId + ': duplicate SOURCE NODE identity');
    claims.set(String(row.sourceNodeId), String(row.targetNodeId));
  }
  assert.equal(new Set([...claims.values()]).size, claims.size, sourceId + ': duplicate TARGET NODE identity');
  assert.equal(result.targetCustodyConflicts.length, 0);
  assert(claims.size >= 8, sourceId + ': actual parser/rigid constraints yielded no path recovery');
  candidates[sourceId] = { claims, result };
}
// Compare against the independently qualified automatic Method-A base, not
// against a fixture-coded mutation list. This uses the full normalized neutral
// parsing, genuine BEND/RIGID classification, selected bases and target custody.
const loops = {};
for (const member of inspection.memberInspections) {
  const choice = ciiAutomaticBaseSelection(member.inspection.baseAnchorSuggestions || []);
  assert.equal(choice.status, 'READY', member.sourceId + ': baseline automatic base absent');
  loops[member.sourceId] = choice.baseLoops;
}
const preview = await createCiiWriter2SourceSetPreviewWithVersionBridge(
  { sources, targetBytes, targetFileName: 'T.CII', baseLoopsBySource: loops }, { cryptoRef: webcrypto });
const auto = buildCiiSourceTargetAudit(preview);
const metrics = {};
for (const [sourceId, entry] of Object.entries(candidates)) {
  const rows = auto.rows.filter(row => row.sourceId === sourceId && row.state === 'BOUND' && row.targetNodeId);
  const reference = new Map(rows.map(row => [String(row.sourceNodeId), String(row.targetNodeId)]));
  let overlap = 0, agreement = 0; const disagreements = [];
  for (const [src, targetId] of entry.claims) {
    if (!reference.has(src)) continue;
    overlap += 1;
    if (reference.get(src) === targetId) agreement += 1;
    else disagreements.push({ sourceNode: src, pathTarget: targetId, automaticTarget: reference.get(src) });
  }
  assert.deepEqual(disagreements, [], sourceId + ': bounded-path conflicts with independent qualified automatic source-to-target identity');
  assert(overlap >= 6, sourceId + ': no meaningful overlap with independent automatic reference');
  metrics[sourceId] = {
    methodAReferenceBound: rows.length, recoveryBound: entry.claims.size,
    overlap, agreement, pathElements: entry.result.elementRows.filter(row => row.kind === 'ELEMENT_PATH').length,
    blockers: entry.result.blockers,
  };
}
console.log(JSON.stringify({ state: 'PASS', testAuthority: 'INDEPENDENT_AUTOMATIC_BASE_OVERLAP_ONLY',
  noOwnerGoldenOrWriterAuthority: true, metrics }));
