import assert from 'node:assert/strict';
import {
  ciiMultiSourceCorrespondenceAudit,
  ciiMultiSourceCorrespondenceAuditCsv,
  ciiMultiSourceCorrespondenceAuditJson,
  ciiMultiSourceCorrespondenceAuditMarkup,
} from '../tabs/cii-workspace/cii-workspace-multisource-correspondence-audit.js';

function member(sourceId, nodes, rows) {
  const elements = [];
  for (let index = 0; index < nodes.length - 1; index += 1) elements.push({ from: nodes[index], to: nodes[index + 1] });
  return {
    sourceId,
    preview: {
      sourceDocument: { parsed: { elements }, nodeNames: Object.fromEntries(nodes.map((id) => [id, `${sourceId}-${id}`])) },
      targetDocument: { contentSha256: 'target-sha', nodeNames: { '101': 'T-101', '102': 'T-102', '103': 'T-103' } },
      compareReview: { rows },
    },
  };
}

const preview = {
  sourceSetSha256: 'source-set-sha',
  targetAuthority: { originalSha256: 'original-target-sha' },
  memberPreviews: [
    member('S1', ['1', '2', '3', '4'], [
      { kind: 'NODE', source: '1', target: '101', confidence: 'HIGH', workflowStatus: 'HIGH', authority: 'ADJACENT_MATCH_BOUNDARY', identityEvidenceBasis: 'ADJACENT_EDGE_CONSENSUS', decision: 'REVIEW', identityBound: true, changeCount: 1, changeFamilies: ['NODE_NAME'] },
      { kind: 'NODE', source: '2', target: '102', confidence: 'HIGH', workflowStatus: 'HIGH', authority: 'PATH', decision: 'REVIEW', identityBound: true, changeCount: 0, changeFamilies: [] },
      { kind: 'NODE', source: '2', target: '103', confidence: 'REVIEW', workflowStatus: 'CONFLICT', authority: 'PATH_ALT', decision: 'REVIEW', identityBound: false, changeCount: 1, changeFamilies: ['GEOMETRY'] },
      { kind: 'ELEMENT', source: 'E1', target: 'TE1', confidence: 'HIGH', identityBound: true },
    ]),
    member('S2', ['10', '20'], [
      { kind: 'NODE', source: '10', target: '101', confidence: 'REVIEW', workflowStatus: 'REVIEW', authority: 'NETWORK', decision: 'REVIEW', identityBound: false, changeCount: 0, changeFamilies: [] },
    ]),
  ],
};

const audit = ciiMultiSourceCorrespondenceAudit(preview);
assert.equal(audit.rows.length, 6, 'census must start from all source nodes, not emitted correspondence rows');
assert.deepEqual(audit.summary, {
  totalSourceNodes: 6,
  emittedSourceNodes: 3,
  boundSourceNodes: 1,
  reviewSourceNodes: 1,
  unresolvedSourceNodes: 1,
  unemittedSourceNodes: 3,
  multiEmissionSourceNodes: 1,
});
const one = audit.rows.find((row) => row.auditRowId === 'S1:1');
assert.equal(one.status, 'BOUND');
assert.deepEqual(one.targetNodeIds, ['101']);
assert.deepEqual(one.targetNodeNames, ['T-101']);
assert.deepEqual(one.evidenceBasis, ['ADJACENT_EDGE_CONSENSUS']);
const two = audit.rows.find((row) => row.auditRowId === 'S1:2');
assert.equal(two.status, 'UNRESOLVED', 'competing TARGET claims must outrank a single bound row');
assert.equal(two.emittedRowCount, 2);
assert.deepEqual(two.targetNodeIds, ['102', '103']);
const three = audit.rows.find((row) => row.auditRowId === 'S1:3');
assert.equal(three.status, 'UNEMITTED');
assert.equal(three.emittedRowCount, 0);

const csv = ciiMultiSourceCorrespondenceAuditCsv(audit);
assert.equal(csv.trimEnd().split('\n').length, 7, 'CSV must contain header + every source node');
assert.match(csv, /S1,3,S1-3,UNEMITTED,0/);
assert.match(csv, /S1,2,S1-2,UNRESOLVED,2,102 \| 103/);
const json = JSON.parse(ciiMultiSourceCorrespondenceAuditJson(audit));
assert.equal(json.rows.length, 6);
assert.equal(json.sourceSetSha256, 'source-set-sha');
assert.equal(json.targetSha256, 'original-target-sha');
const markup = ciiMultiSourceCorrespondenceAuditMarkup(audit, { displayLimit: 2 });
assert.match(markup, /Correspondence · Source vs Target audit/);
assert.match(markup, /UI preview limited to 2 rows/);
assert.match(markup, /Exports contain all 6 source nodes/);
assert.match(markup, /data-ciiw-ms-correspondence-audit-csv/);
assert.match(markup, /data-ciiw-ms-correspondence-audit-json/);

console.log('CII multi-source correspondence audit checks: PASS');
