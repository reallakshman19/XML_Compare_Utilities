import assert from 'node:assert/strict';
import {
  buildFinalOutputRows,
  UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE,
} from '../tabs/navis-tag-isonote/navis-tag-final-output.js';

const supportPosition = { x: 175057.718, y: 700947.6, z: 1144.64 };
const tag164Position = { ...supportPosition };
const tag1Position = { x: 175057.718, y: 700950.48, z: 1144.64 };

const decision = {
  tableRowId: 'ROW-72',
  tableRowIndex: 72,
  canonicalIdentity: 'PS-11171.5',
  groupedIdentities: ['/PS-11171.5', '/PS-11171.3'],
  tableIdentityRaw: '/PS-11171.5|/PS-11171.3',
  resolvedPipe: '/ASIM-1835-4"-P8810203-31441C4-PP',
  supportPosition,
  status: 'AMBIGUOUS',
  ambiguity: 'CONFLICTING_NEARBY_COMMENTS',
  confidence: 'AMBIGUOUS',
  selectedTagId: '',
  selectedCandidate: null,
  supportIsonote: '',
};

function candidate({ tagId, commentBody, rank, score, position }) {
  return {
    ledgerId: `ROW-72:C${rank}`,
    ledgerKind: 'ACCEPTED_CANDIDATE',
    tableRowId: 'ROW-72',
    tableRowIndex: 72,
    canonicalIdentity: 'PS-11171.5',
    groupedIdentities: ['/PS-11171.5', '/PS-11171.3'],
    tableIdentityRaw: '/PS-11171.5|/PS-11171.3',
    inputPipe: '/ASIM-1835-4"-P8810203-31441C4-PP',
    resolvedPipe: '/ASIM-1835-4"-P8810203-31441C4-PP',
    supportPosition,
    supportPositionSource: 'STAGED_JSON',
    supportPositionPath: 'attributes.POSI',
    evidenceId: `VIEW:${tagId}`,
    viewGuid: `view-${tagId}`,
    viewName: `Tag View ${tagId}`,
    tagId,
    commentId: tagId,
    commentBody,
    tagPosition: position,
    positionSource: 'RLTAG_POS3D',
    withinTolerance: true,
    accepted: false,
    candidateRank: rank,
    score,
    decisionStatus: 'AMBIGUOUS',
    decisionReason: 'CONFLICTING_NEARBY_COMMENTS',
    topCandidateTagId: '164',
    topCandidateScore: 100,
    runnerUpTagId: '1',
    runnerUpScore: 98.271633,
    scoreGap: 1.728367,
    requiredScoreGap: 15,
  };
}

const candidate164 = candidate({ tagId: '164', commentBody: 'A1', rank: 1, score: 100, position: tag164Position });
const candidate1 = candidate({ tagId: '1', commentBody: 'R', rank: 2, score: 98.271633, position: tag1Position });
const unmatchedTag = {
  evidenceId: 'VIEW:9',
  viewGuid: 'view-9',
  viewName: 'Tag View 9',
  tagId: '9',
  commentId: '9',
  commentBody: 'R',
  position: { x: 200000, y: 800000, z: 1200 },
};

const audit = {
  config: {},
  decisions: [decision],
  candidateLedger: [candidate164, candidate1],
  propagationLedger: [],
};
const navisParse = {
  tags: [
    { evidenceId: 'VIEW:164', viewGuid: 'view-164', tagId: '164', commentId: '164', commentBody: 'A1', position: tag164Position },
    { evidenceId: 'VIEW:1', viewGuid: 'view-1', tagId: '1', commentId: '1', commentBody: 'R', position: tag1Position },
    unmatchedTag,
  ],
};

const rows = buildFinalOutputRows(audit, {}, navisParse);
assert.equal(rows.length, 3);

const row164 = rows.find((row) => row['Navis Tag ID'] === '164');
assert.ok(row164, 'Tag 164 must remain visible in final output');
assert.equal(row164['Name of the element'], '/PS-11171.5');
assert.equal(row164.Tag, 'A1');
assert.equal(row164['Support ISONOTE'], '');
assert.equal(row164.confidence, 'AMBIGUOUS');
assert.match(row164.Basis, /IN_TOLERANCE_AMBIGUOUS/);
assert.match(row164.Basis, /CONFLICTING_NEARBY_COMMENTS/);
assert.match(row164.Basis, /CANDIDATE_RANK=1/);
assert.match(row164.Basis, /SCORE=100/);
assert.match(row164.Basis, /SCORE_GAP=1\.728367<15/);
assert.doesNotMatch(row164.Basis, /NO_PS_MATCH/);

const row1 = rows.find((row) => row['Navis Tag ID'] === '1');
assert.ok(row1, 'runner-up candidate must remain visible against the same PS');
assert.equal(row1['Name of the element'], '/PS-11171.5');
assert.match(row1.Basis, /CANDIDATE_RANK=2/);
assert.doesNotMatch(row1.Basis, /NO_PS_MATCH/);

const unmatched = rows.find((row) => row['Navis Tag ID'] === '9');
assert.equal(unmatched['Name of the element'], UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE);
assert.match(unmatched.Basis, /NO_PS_MATCH/);

assert.ok(!rows.some((row) => row['Navis Tag ID'] === '164' && row['Name of the element'] === UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE));
assert.ok(!rows.some((row) => row['Navis Tag ID'] === '1' && row['Name of the element'] === UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE));

console.log('navis-tag ambiguous final-output tests passed');
