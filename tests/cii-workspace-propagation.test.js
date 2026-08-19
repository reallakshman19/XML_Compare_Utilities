import assert from 'assert';

import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { propagateSingleCiiAnchorCorrespondence } from '../tabs/cii-workspace/cii-workspace-propagation.js';

function point(x = 0, y = 0, z = 0) { return { x, y, z }; }
function segment(from, to, fromPos, toPos, od = 88.9, wall = 5.5, includePositions = true) {
  const dx = toPos.x - fromPos.x; const dy = toPos.y - fromPos.y; const dz = toPos.z - fromPos.z;
  return {
    from, to, dx, dy, dz, length: Math.hypot(dx, dy, dz), od, wall,
    ...(includePositions ? { fromPos, toPos } : {}),
  };
}
function document(side, id, elements) {
  const nodes = {};
  for (const element of elements) {
    if (element.fromPos) nodes[element.from] = element.fromPos;
    if (element.toPos) nodes[element.to] = element.toPos;
  }
  return {
    schema: 'CIIWorkspaceDocument.v1', side, contentSha256: id, nodeNames: {},
    parsed: { elements, nodes, rigids: [] },
  };
}
function graph(side, id, elements) { return adaptCiiDocumentToTopologyGraph(document(side, id, elements)); }
function anchor(sourceNodeId, targetNodeId) { return { sourceNodeId: String(sourceNodeId), targetNodeId: String(targetNodeId), locked: true }; }

// A terminal seed must propagate beyond the old one-hop incident-edge limit.
{
  const source = graph('SOURCE', 'source-chain', [
    segment(10, 20, point(0), point(1000)),
    segment(20, 30, point(1000), point(2000)),
    segment(30, 40, point(2000), point(3000)),
    segment(40, 50, point(3000), point(4000)),
  ]);
  const target = graph('TARGET', 'target-chain', [
    segment(20010, 20020, point(0), point(1000)),
    segment(20020, 20030, point(1000), point(2000)),
    segment(20030, 20040, point(2000), point(3000)),
    segment(20040, 20050, point(3000), point(4000)),
  ]);
  const result = propagateSingleCiiAnchorCorrespondence(source, target, anchor(10, 20010));
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.propagation.matchedEdgeCount, 4);
  assert.strictEqual(result.propagation.matchedNodeCount, 5);
  assert.deepStrictEqual(result.propagation.unmatchedSourceElementIds, []);
  assert.deepStrictEqual(result.propagation.unmatchedTargetElementIds, []);
  assert(result.elementRows.every((row) => row.status === 'HIGH'));
}

// Benchmark-faithful node 205 pattern. Node 205 moves 200 mm while the gang
// end-to-end span is preserved. M1 must fail on endpoint displacement, M2 must
// retain identity, and MEDIUM correspondence must continue propagating.
{
  const source = graph('SOURCE', 'source-205', [
    segment(200, 205, point(0), point(-1213.79)),
    segment(205, 210, point(-1213.79), point(-2427.58)),
  ]);
  const target = graph('TARGET', 'target1-205', [
    segment(20200, 20205, point(0), point(-1013.79)),
    segment(20205, 20210, point(-1013.79), point(-2427.58)),
  ]);
  const result = propagateSingleCiiAnchorCorrespondence(source, target, anchor(200, 20200), { spatialToleranceMm: 100 });
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.propagation.matchedEdgeCount, 2);
  assert(result.elementRows.every((row) => row.status === 'REVIEW'));
  for (const row of result.elementRows) {
    assert.strictEqual(row.evidence.candidates.winnerIdentityConfidence, 'MEDIUM');
    assert.strictEqual(row.evidence.candidates.rankedCandidates[0].methods.m1Spatial.pass, false);
    assert.strictEqual(row.evidence.candidates.rankedCandidates[0].methods.m2Network.pass, true);
    assert.strictEqual(row.evidence.candidates.rankedCandidates[0].methods.m1Spatial.distanceMm, 200);
  }
}

const source250 = graph('SOURCE', 'source-250', [
  segment(250, 255, point(0, 0, 0), point(0, 0, -659.301), 60.3, 3.9),
  segment(255, 260, point(0, 0, -659.301), point(0, -0.000488281, -930.903), 60.3, 3.9),
  segment(260, 270, point(0, -0.000488281, -930.903), point(0, -0.000488281, -1388.202), 60.3, 3.9),
]);

// TARGET1: geometry same, OD and wall both materially change. Identity must
// remain propagatable as MEDIUM instead of being hard-blocked by dimensions.
{
  const target1 = graph('TARGET', 'target1-250', [
    segment(20250, 20255, point(0, 0, 0), point(0, 0, -659.301), 114.3, 4.7752),
    segment(20255, 20260, point(0, 0, -659.301), point(0, -0.000488281, -930.903), 114.3, 4.7752),
    segment(20260, 20270, point(0, -0.000488281, -930.903), point(0, -0.000488281, -1388.202), 114.3, 4.7752),
  ]);
  const result = propagateSingleCiiAnchorCorrespondence(source250, target1, anchor(250, 20250));
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.propagation.matchedEdgeCount, 3);
  assert(result.elementRows.every((row) => row.status === 'REVIEW'));
  assert(result.elementRows.every((row) => row.evidence.candidates.rankedCandidates[0].dimensions.diameter.pass === false));
  assert(result.elementRows.every((row) => row.evidence.candidates.rankedCandidates[0].dimensions.wall.pass === false));
}

// TARGET2 blind/generalisation geometry: first two internal legs redistribute
// +200/-200 mm while total span remains -1388.202 mm and numbering changes to
// 102xx. No +20000 rule can satisfy this fixture.
{
  const target2 = graph('TARGET', 'target2-250', [
    segment(10250, 10255, point(0, 0, 0), point(0, 0, -459.301), 88.9, 5.4864),
    segment(10255, 10260, point(0, 0, -459.301), point(0, -0.000488281, -930.903), 88.9, 5.4864),
    segment(10260, 10270, point(0, -0.000488281, -930.903), point(0, -0.000488281, -1388.202), 88.9, 5.4864),
  ]);
  const result = propagateSingleCiiAnchorCorrespondence(source250, target2, anchor(250, 10250), { spatialToleranceMm: 100 });
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.propagation.matchedEdgeCount, 3);
  assert.deepStrictEqual(result.elementRows.map((row) => row.targetElementIds[0].match(/\d+->\d+$/)?.[0]), [
    '10250->10255', '10255->10260', '10260->10270',
  ]);
  assert.strictEqual(result.elementRows[0].evidence.candidates.rankedCandidates[0].methods.m1Spatial.pass, false);
  assert.strictEqual(result.elementRows[1].evidence.candidates.rankedCandidates[0].methods.m1Spatial.pass, false);
  assert.strictEqual(result.elementRows[2].evidence.candidates.rankedCandidates[0].methods.m1Spatial.pass, true);
  assert(result.elementRows.every((row) => row.evidence.candidates.rankedCandidates[0].methods.m2Network.pass));
}

// Deliberately symmetric branch: after a unique trunk, two topology-identical
// arms provide two equal one-to-one assignments. Propagation must stop rather
// than arbitrarily choosing one target arm.
{
  const source = graph('SOURCE', 'source-ambiguous', [
    segment(1, 2, point(0), point(1000), 273, 8, false),
    segment(2, 3, point(1000), point(2000), 273, 8, false),
    segment(2, 4, point(1000), point(2000), 273, 8, false),
  ]);
  const target = graph('TARGET', 'target-ambiguous', [
    segment(101, 102, point(0), point(1000), 273, 8, false),
    segment(102, 103, point(1000), point(2000), 273, 8, false),
    segment(102, 104, point(1000), point(2000), 273, 8, false),
  ]);
  const result = propagateSingleCiiAnchorCorrespondence(source, target, anchor(1, 101), { winnerGap: 8 });
  assert.strictEqual(result.status, 'UNRESOLVED');
  assert(result.blockers.includes('FRONTIER_WINNER_GAP_NOT_SATISFIED'));
  assert(result.blockers.includes('PROPAGATION_AMBIGUITY_RETAINED'));
  assert.strictEqual(result.propagation.matchedEdgeCount, 1);
  assert.strictEqual(result.propagation.matchedNodeCount, 2);
  assert.strictEqual(result.elementRows.filter((row) => row.status === 'UNRESOLVED').length, 2);
}

console.log('CII anchor-seeded propagation checks passed.');
