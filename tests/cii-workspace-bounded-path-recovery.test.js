import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { propagateSingleCiiAnchorCorrespondence } from '../tabs/cii-workspace/cii-workspace-propagation.js';
import { recoverCiiBoundedFrontierPaths } from '../tabs/cii-workspace/cii-workspace-bounded-path-recovery.js';

const fixtures = {
  'S2.CII': '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII': 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII': 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};
function build(side, id, edges) {
  return adaptCiiDocumentToTopologyGraph({
    schema: 'CIIWorkspaceDocument.v1', side, contentSha256: id,
    nodeNames: {}, parsed: { elements: edges, nodes: {}, rigids: [] },
  });
}
function segment(from, to, length, od = 219.1, index = 0) {
  return { index, from, to, dx: length, dy: 0, dz: 0, length, od, wall: 8, hasBend: false };
}
function fromOriginal(fileName, side) {
  const bytes = readFileSync(new URL('../Benchmark/' + fileName, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), fixtures[fileName]);
  const lines = bytes.toString('latin1').split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith('#$ ELEMENTS'));
  const end = lines.findIndex((line, i) => i > start && line.startsWith('#$'));
  const edges = [];
  for (let i = start + 1; i < end; i += 15) {
    const values = [...(lines[i] || '').matchAll(/[-+]?\d+\.\d+E[+-]\d+/gi)].map(m => Number(m[0]));
    if (values.length < 6) continue;
    const [from, to, dx, dy, dz, od] = values;
    edges.push({ index: edges.length, from, to, dx, dy, dz,
      length: Math.hypot(dx, dy, dz), od, wall: 0, hasBend: false });
  }
  return build(side, fileName, edges);
}
function nodeMap(result) {
  return new Map(result.nodeRows.filter(row => row.sourceNodeId != null).map(row => [row.sourceNodeId, row.targetNodeId]));
}
function locked(graph, target, sourceId, targetId, flag = true) {
  return propagateSingleCiiAnchorCorrespondence(graph, target, {
    sourceNodeId: String(sourceId), targetNodeId: String(targetId),
  }, { singleAnchorPathRecovery: flag, pathRecoveryLengthToleranceMm: 25 });
}

// Pure synthetic: correct single PIPE -> TWO straight TARGET PIPES and
// a second independent branch resolved using 2 forward physical steps.
const source = build('SOURCE', 's', [
  segment(10, 20, 8000, 219.1, 0), segment(20, 21, 8000, 219.1, 1),
  segment(21, 22, 8000, 219.1, 2), segment(10, 30, 4000, 219.1, 3),
  segment(30, 31, 1112.57, 219.1, 4), segment(31, 32, 1250, 219.1, 5),
]);
const target = build('TARGET', 't', [
  segment(110, 120, 4000, 219.1, 0), segment(120, 121, 4000, 219.1, 1),
  segment(121, 122, 8000, 219.1, 2), segment(122, 123, 8000, 219.1, 3),
  segment(110, 130, 4000, 219.1, 4), segment(130, 131, 1112.57, 219.1, 5),
  segment(131, 132, 1250, 219.1, 6),
]);
const opt = locked(source, target, 10, 110);
assert.equal(nodeMap(opt).get('10'), '110', 'the caller must supply the manual seed');
assert.equal(nodeMap(opt).get('20'), '121', 'source 8000 path crosses one TARGET inserted midpoint');
assert.equal(nodeMap(opt).get('30'), '130', 'ambiguous 4000-vs-4000 target choice must be resolved from lookahead');
const paths = opt.elementRows.filter(row => row.authority === 'BOUNDED_PATH_LOOKAHEAD_M2');
assert(paths.length >= 2, 'both sides of ambiguous frontier must be independently qualified');
assert(paths.some(row => row.kind === 'ELEMENT_PATH' && row.targetElementIds.length === 2),
  'target subdivision is preserved as one source to two real target element IDs');
assert(paths.every(row => row.evidence?.identityConfidence === 'MEDIUM' && row.evidence?.identitySupported));
assert(paths.every(row => row.evidence.pathRecovery.lookaheadCount >= 2));
assert.equal(opt.targetCustodyConflicts.length, 0);
const defaultOff = locked(source, target, 10, 110, false);
assert.equal(defaultOff.elementRows.some(row => row.authority === 'BOUNDED_PATH_LOOKAHEAD_M2'), false,
  'ordinary propagation is unchanged until expressly opted in');
const wrongAnchor = locked(source, target, 10, 130);
assert.equal(nodeMap(wrongAnchor).get('10'), '130', 'never silently replace manual authority');
assert(!nodeMap(wrongAnchor).has('20'), 'unsupported anchor cannot fabricate a better neighboring mapping');

const symmetricS = build('SOURCE', 'sym-s', [
  segment(1, 2, 8000, 219.1, 0), segment(2, 3, 1112.57, 219.1, 1),
  segment(3, 4, 1250, 219.1, 2), segment(1, 5, 8000, 219.1, 3),
  segment(5, 6, 1112.57, 219.1, 4), segment(6, 7, 1250, 219.1, 5),
]);
const symmetricT = build('TARGET', 'sym-t', [
  segment(101, 102, 8000, 219.1, 0), segment(102, 103, 1112.57, 219.1, 1),
  segment(103, 104, 1250, 219.1, 2), segment(101, 105, 8000, 219.1, 3),
  segment(105, 106, 1112.57, 219.1, 4), segment(106, 107, 1250, 219.1, 5),
]);
const symmetry = locked(symmetricS, symmetricT, 1, 101);
assert.equal(nodeMap(symmetry).size, 1, 'equal physical hypotheses must remain unbound');
assert(symmetry.elementRows.every(row => row.status === 'UNRESOLVED'));
const scoreSource = symmetricS.adjacency.get('1'), scoreTarget = symmetricT.adjacency.get('101');
const overDegree = recoverCiiBoundedFrontierPaths(symmetricS, symmetricT, '1', '101', scoreSource, scoreTarget,
  { pathRecoveryMaxAssignments: 1 });
assert.equal(overDegree.status, 'BLOCKED', 'truncated assignment search must never certify uniqueness');
assert.match(overDegree.blocker, /OVERFLOW/);
const wrongOD = build('TARGET', 'od-t', [
  segment(110, 120, 4000, 400, 0), segment(120, 121, 4000, 400, 1),
  segment(121, 122, 8000, 400, 2), segment(122, 123, 8000, 400, 3),
  segment(110, 130, 4000, 400, 4), segment(130, 131, 1112.57, 400, 5),
  segment(131, 132, 1250, 400, 6),
]);
assert.equal(nodeMap(locked(source, wrongOD, 10, 110)).size, 1, 'strong OD conflict veto remains intact');

// Genuine untouched SHA-pin physical inputs; these pair assertions are TEST-only
// hypotheses, not implicit Owner approvals or production hardcoded IDs.
const s2 = fromOriginal('S2.CII', 'SOURCE');
const s3 = fromOriginal('S3.CII', 'SOURCE');
const t = fromOriginal('T.CII', 'TARGET');
const invalidS2 = locked(s2, t, 420, 415);
const invalidS3 = locked(s3, t, 1560, 7880);
assert.equal(nodeMap(invalidS2).get('420'), '415');
assert.equal(nodeMap(invalidS3).get('1560'), '7880');
assert.equal(nodeMap(invalidS2).size, 1, 'OD-incompatible S2 lock cannot spread physical identity');
assert.equal(nodeMap(invalidS3).size, 1, 'path-incompatible S3 lock cannot spread physical identity');
const plausibleS2 = locked(s2, t, 420, 10330);
const plausibleS3 = locked(s3, t, 1560, 8890);
const plausibleS3Nodes = nodeMap(plausibleS3);
assert.equal(plausibleS3Nodes.get('1560'), '8890');
assert.equal(plausibleS3Nodes.get('1580'), '8895', 'bounded unique outgoing evidence must recover S3 1580');
assert.equal(plausibleS3Nodes.get('1550'), '8870', '8000-mm source edge may span two TARGET 4000-mm elements');
assert(plausibleS3.elementRows.some(row => row.kind === 'ELEMENT_PATH' && row.targetElementIds.length === 2));
assert.equal(plausibleS3.targetCustodyConflicts.length, 0);
assert(nodeMap(plausibleS2).size >= 1);
console.log(JSON.stringify({
  state: 'PASS',
  syntheticRecoveredNodes: nodeMap(opt).size,
  authenticS2DisputedMappedNodes: nodeMap(invalidS2).size,
  authenticS3DisputedMappedNodes: nodeMap(invalidS3).size,
  authenticS2CandidateMappedNodes: nodeMap(plausibleS2).size,
  authenticS3CandidateMappedNodes: plausibleS3Nodes.size,
  authenticS3Paths: plausibleS3.elementRows.filter(row => row.kind === 'ELEMENT_PATH').length,
  authority: 'TEST_ONLY_NO_AUTO_APPROVAL', defaultOff: true,
}));
