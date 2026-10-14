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
  // Default policy: wall is an engineering delta on 1:1 edges, but still
  // strict for a split 1:N target path. S3 has a genuine wall mismatch.
  const strict = trial(investigatedTarget);
  if (sourceId === 'S3') {
    assert.equal(strict.nodeRows.filter(row => row.sourceNodeId != null).length, 1,
      'real subdivided S3 path with wall change must stay fail-closed under the original 1-mm gate');
  }
  // This is a TEST-ONLY policy counterfactual, not a production default,
  // acceptance, or permission to relax wall matching on true subdivisions.
  const experiment = sourceId === 'S3' ? { pathRecoveryWallToleranceMm: 5 } : {};
  const result = sourceId === 'S3' ? trial(investigatedTarget, experiment) : strict;
  const nodeRows = result.nodeRows.filter(row => row.sourceNodeId != null);
  const claims = new Map();
  for (const row of nodeRows) {
    assert(!claims.has(String(row.sourceNodeId)), sourceId + ': duplicate SOURCE NODE identity');
    claims.set(String(row.sourceNodeId), String(row.targetNodeId));
  }
  assert.equal(new Set([...claims.values()]).size, claims.size, sourceId + ': duplicate TARGET NODE identity');
  assert.equal(result.targetCustodyConflicts.length, 0);
  console.log(JSON.stringify({
    inspect: sourceId, count: claims.size, blockers: result.blockers,
    sourceFrontier: (graph.adjacency.get(sourceNodeId) || []).map(e => ({
      id: e.elementId, from: e.from, to: e.to, kind: e.componentKind,
      len: e.lengthMm, od: e.diameter, wall: e.wall })),
    targetFrontier: (target.adjacency.get(investigatedTarget) || []).map(e => ({
      id: e.elementId, from: e.from, to: e.to, kind: e.componentKind,
      len: e.lengthMm, od: e.diameter, wall: e.wall })),
    sourceFollowing: ['410','440','450','460','1550','1580','1590'].map(n => ({
      node: n, edges: (graph.adjacency.get(n)||[]).map(e => ({id:e.elementId,kind:e.componentKind,od:e.diameter,wall:e.wall,len:e.lengthMm})) })).filter(x=>x.edges.length),
    targetFollowing: ['10320','10340','10350','10360','8870','8895','8900'].map(n => ({
      node: n, edges: (target.adjacency.get(n)||[]).map(e => ({id:e.elementId,kind:e.componentKind,od:e.diameter,wall:e.wall,len:e.lengthMm})) })).filter(x=>x.edges.length),
    blocked: result.elementRows.filter(e => e.status === 'UNRESOLVED').slice(0, 2)
      .map(e => ({ e: e.sourceElementId, recovery: e.evidence?.propagation?.pathRecoveryBlocker,
        blocker: e.evidence?.propagation?.blocker })),
  }));
  // Inspect both source members before imposing the hard retained recovery gate.

  candidates[sourceId] = { claims, result, strictBound: strict.nodeRows.filter(row => row.sourceNodeId != null).length };
}
for (const [member, item] of Object.entries(candidates)) {
  assert(item.claims.size >= 8, member + ': actual parser/rigid constraints yielded no path recovery');
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
    defaultWallPolicyBound: entry.strictBound,
    experimentalWallToleranceMm: sourceId === 'S3' ? 5 : 1,
    overlap, agreement, pathElements: entry.result.elementRows.filter(row => row.kind === 'ELEMENT_PATH').length,
    blockers: entry.result.blockers,
  };
}
console.log(JSON.stringify({ state: 'PASS', testAuthority: 'INDEPENDENT_AUTOMATIC_BASE_OVERLAP_ONLY',
  noOwnerGoldenOrWriterAuthority: true, metrics }));
