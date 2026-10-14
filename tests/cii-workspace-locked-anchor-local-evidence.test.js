import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { adaptCiiDocumentToTopologyGraph } from '../tabs/cii-workspace/cii-workspace-topology-adapter.js';
import { assessCiiLockedAnchorLocalEvidence } from '../tabs/cii-workspace/cii-workspace-anchor-local-evidence.js';
import { propagateSingleCiiAnchorCorrespondence } from '../tabs/cii-workspace/cii-workspace-propagation.js';
import { buildCiiCompareReviewModel } from '../tabs/cii-workspace/cii-workspace-compare-review.js';
import { ciiMultiSourceReviewMarkup } from '../tabs/cii-workspace/cii-workspace-multisource-review-ui.js';

const hashes = {
  'S2.CII': '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII': 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII': 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
};

// Test-only independent physical ELEMENT reader. It is not imported by production,
// and no hardcoded benchmark pair is allowed into the matcher or Writer2.
function originalGraph(fileName, side) {
  const bytes = readFileSync(new URL('../Benchmark/' + fileName, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[fileName], fileName + ': original bytes drift');
  const lines = bytes.toString('latin1').split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith('#$ ELEMENTS'));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('#$'));
  assert(start >= 0 && end > start);
  const elements = [];
  for (let i = start + 1; i < end; i += 15) {
    const vals = [...(lines[i] || '').matchAll(/[-+]?\d+\.\d+E[+-]\d+/gi)].map(item => Number(item[0]));
    if (vals.length < 6) continue;
    const [from, to, dx, dy, dz, od] = vals;
    elements.push({ index: elements.length, from, to, dx, dy, dz,
      length: Math.hypot(dx, dy, dz), od, wall: 0, hasBend: false });
  }
  assert(elements.length > 0, fileName + ': empty physical ELEMENTS');
  return adaptCiiDocumentToTopologyGraph({
    schema: 'CIIWorkspaceDocument.v1', side, contentSha256: hashes[fileName],
    nodeNames: {}, parsed: { elements, nodes: {}, rigids: [] },
  });
}
const s2 = originalGraph('S2.CII', 'SOURCE');
const s3 = originalGraph('S3.CII', 'SOURCE');
const t = originalGraph('T.CII', 'TARGET');
const s2Bad = assessCiiLockedAnchorLocalEvidence(s2, t, '420', '415');
assert.equal(s2Bad.authority, 'ADVISORY_LOCAL_CONTEXT_ONLY');
assert.equal(s2Bad.identityQualified, false);
assert.deepEqual(s2Bad.signals, ['INCIDENT_OD_CONTEXT_OVER_50_PERCENT', 'ONE_HOP_LENGTH_CONTEXT_DIFFERS']);
assert.equal(s2Bad.nearestOdMaxPercent, 91.69);
assert.equal(s2Bad.oneHopMaxLengthDeltaMm, 4000);
assert.deepEqual(s2Bad.sourceOdMm, [114.3, 114.3]);
assert.deepEqual(s2Bad.targetOdMm, [219.1, 219.1]);
const s2Physical = assessCiiLockedAnchorLocalEvidence(s2, t, '420', '10330');
assert.deepEqual(s2Physical.signals, [], 'historically corroborated physical target must not get a false one-hop warning');
assert.equal(s2Physical.identityQualified, false, 'physical agreement is corroboration, never an independent anchor approval');
const s3Bad = assessCiiLockedAnchorLocalEvidence(s3, t, '1560', '7880');
assert.equal(s3Bad.nearestOdMaxPercent, 0);
assert.equal(s3Bad.oneHopMaxLengthDeltaMm, 500);
assert.deepEqual(s3Bad.signals, ['ONE_HOP_LENGTH_CONTEXT_DIFFERS']);
const s3PathHypothesis = assessCiiLockedAnchorLocalEvidence(s3, t, '1560', '8890');
assert.equal(s3PathHypothesis.identityQualified, false);
assert(s3PathHypothesis.signals.includes('ONE_HOP_LENGTH_CONTEXT_DIFFERS'),
  'legitimate TARGET subdivisions can make a one-hop comparison appear inconsistent');
assert.match(s3PathHypothesis.caveat, /CANNOT_QUALIFY_IDENTITY/);
assert.equal(assessCiiLockedAnchorLocalEvidence(s2, t, '999999', '415'), null);

for (const [sourceId, graph, from, to, requiredSignal] of [
  ['S2', s2, '420', '415', 'INCIDENT_OD_CONTEXT_OVER_50_PERCENT'],
  ['S3', s3, '1560', '7880', 'ONE_HOP_LENGTH_CONTEXT_DIFFERS'],
]) {
  const correspondence = propagateSingleCiiAnchorCorrespondence(graph, t, { sourceNodeId: from, targetNodeId: to });
  const anchor = correspondence.nodeRows.find(row => row.status === 'LOCKED');
  assert(anchor, sourceId + ': retained manual lock must not disappear');
  assert.equal(anchor.targetNodeId, to, 'diagnostic must never substitute target');
  assert(anchor.evidence.anchorLocal.signals.includes(requiredSignal));
  assert.equal(anchor.evidence.anchorLocal.identityQualified, false);
  const review = buildCiiCompareReviewModel({}, {}, correspondence, {}, { rows: [], summary: {} });
  const row = review.rows.find(item => item.correspondenceId === anchor.correspondenceId);
  assert.equal(row.decision, 'LOCKED');
  assert.equal(row.identityBound, true, 'explicit lock remains accepted as direct user authority');
  assert.equal(row.anchorLocalEvidence.identityQualified, false);
  const marked = { compareReview: { rows: review.rows.map(item => ({ ...item, sourceId, memberCorrespondenceId: item.correspondenceId })) } };
  const markup = ciiMultiSourceReviewMarkup(marked);
  assert.match(markup, /independent physical identity is NOT established/);
  assert.match(markup, /target subdivisions may require independent path-level qualification/);
  assert.match(markup, /Manual reviewed anchor authority/);
  if (sourceId === 'S2') assert.match(markup, /91\.7%/);
  if (sourceId === 'S3') assert.match(markup, /500 mm/);
}
console.log('CII Writer2 source-authentic locked anchor physical context: S2 OD 91.7%, S3 one-hop delta 500 mm; no silent new authority PASS');
