import assert from 'node:assert/strict';
import { appendCandidateLedger } from '../tabs/navis-tag-isonote/navis-tag-candidate-evidence.js';
import { buildFinalOutputRows, UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE } from '../tabs/navis-tag-isonote/navis-tag-final-output.js';
import { _test as evidenceUi } from '../tabs/navis-tag-isonote/navis-tag-isonote-ui-evidence.js';

const candidateLedger = [];
appendCandidateLedger(candidateLedger, {
  tableRowId: 'ROW-72', tableRowIndex: 72, canonicalIdentity: 'PS-11171.5',
}, [{
  evidenceId: 'VIEW:164', tagId: '164', commentBody: 'A1', withinTolerance: true, score: 100,
  confidenceReasons: ['ALL_AXES_WITHIN_TOLERANCE', 'NORMALIZED_GEOMETRY_RMS_0.000000'],
}], {
  status: 'AMBIGUOUS', selected: null, decisionReason: 'CONFLICTING_NEARBY_COMMENTS',
  topCandidateTagId: '164', topCandidateScore: 100, runnerUpTagId: '1', runnerUpScore: 98.271633,
  scoreGap: 1.728367, requiredScoreGap: 15, distinctCommentCount: 2,
});
assert.match(candidateLedger[0].auditRemark, /Review required/);
assert.match(candidateLedger[0].auditRemark, /score lead 1\.728367 is below the required 15/);
assert.deepEqual(candidateLedger[0].confidenceReasons, [
  'ALL_AXES_WITHIN_TOLERANCE',
  'NORMALIZED_GEOMETRY_RMS_0.000000',
]);

const candidateUiRows = evidenceUi.candidateRows({ audit: { candidateLedger } });
assert.equal(candidateUiRows[0].auditRemark, candidateLedger[0].auditRemark);
assert.equal(candidateUiRows[0].confidenceReasonCodesDisplay,
  'ALL_AXES_WITHIN_TOLERANCE | NORMALIZED_GEOMETRY_RMS_0.000000');

const supportPosition = { x: 188530, y: 729150, z: 1066.551 };
const tagPosition = { x: 189592.258, y: 729160.315, z: 898.08 };
const nearestCandidate = {
  ledgerId: 'ROW-562:NEAREST-REJECTED', ledgerKind: 'NEAREST_REJECTED',
  tableRowId: 'ROW-562', tableRowIndex: 562,
  canonicalIdentity: 'PS-11366/DATUM', groupedIdentities: ['/PS-11366/DATUM', '/PS-11366/SREF'],
  resolvedPipe: '/ASIM-1835-4"-B8810069-11441T3-PP', supportPosition,
  evidenceId: 'VIEW:165', viewGuid: 'view-165', viewName: 'Tag View 165',
  tagId: '165', commentId: '165', commentBody: 'A2', tagPosition,
  positionSource: 'RLTAG_POS3D', withinTolerance: false, accepted: false, candidateRank: 1, score: 0,
  deltaEMm: 1062.258, deltaNMm: 10.315, deltaElMm: -168.471,
  verticalBasis: 'OD_HALF_BELOW', verticalResidualMm: 111.321,
  normalizedToleranceDistance: 10.62258, spatialDistanceMm: 1068.129,
  failedAxes: ['E', 'EL'], rejectionReasons: ['E_OUTSIDE_TOLERANCE', 'EL_OUTSIDE_TOLERANCE'],
  confidenceReasons: ['E_OUTSIDE_TOLERANCE', 'EL_OUTSIDE_TOLERANCE'],
  decisionStatus: 'UNRESOLVED', decisionReason: 'NO_IN_TOLERANCE_CANDIDATE',
};
const nearestAudit = {
  config: { eastingToleranceMm: 100, northingToleranceMm: 100, elevationToleranceMm: 100 },
  decisions: [], candidateLedger: [nearestCandidate], propagationLedger: [],
};
const nearestRows = buildFinalOutputRows(nearestAudit, {}, {
  tags: [{ evidenceId: 'VIEW:165', viewGuid: 'view-165', tagId: '165', commentId: '165', commentBody: 'A2', position: tagPosition }],
});
assert.equal(nearestRows.length, 1);
assert.equal(nearestRows[0]['Name of the element'], '/PS-11366/DATUM');
assert.equal(nearestRows[0]['Navis Tag ID'], '165');
assert.equal(nearestRows[0]['Navis Tag POS'], 'E=189592.258;N=729160.315;EL=898.08');
assert.equal(nearestRows[0].confidence, 'OUTSIDE_TOLERANCE');
assert.match(nearestRows[0].Basis, /closest recorded candidate/);
assert.match(nearestRows[0].Basis, /easting and vertical exceeded/);
assert.match(nearestRows[0].Basis, /easting \+1062\.258 mm versus ±100 mm/);
assert.match(nearestRows[0].Basis, /OD-half-below vertical residual 111\.321 mm versus 100 mm/);
assert.match(nearestRows[0].Basis, /NEAREST_REJECTED/);
assert.ok(!nearestRows.some((row) => row['Name of the element'] === UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE));

const transformedXml = `<exchange units="m"><view name="Tag View 165" guid="view-165"><comment id="165"><body>A2</body></comment><rltag id="165" commentid="165"><pos3d><pos3f x="244.529978" y="-1092.843749" z="101.070534"/></pos3d></rltag></view></exchange>`;
globalThis.document = { querySelector: () => ({ value: transformedXml }) };
const transformedRows = buildFinalOutputRows({
  config: {
    navisUnits: 'm', navisEastingDatumMm: -54937.72,
    navisNorthingDatumMm: 1822004.064, navisElevationDatumMm: -100172.454,
  },
  decisions: [], candidateLedger: [], propagationLedger: [],
}, { navisEastingDatumMm: 0, navisNorthingDatumMm: 0, navisElevationDatumMm: 0 });
assert.equal(transformedRows[0]['Navis Tag POS'], 'E=189592.258;N=729160.315;EL=898.08');

const jsonRows = evidenceUi.jsonTraceRows({ identityTrace: { rows: [{
  tableRowIndex: 562, tableIdentityRaw: '/PS-11366/DATUM|/PS-11366/SREF',
  canonicalIdentity: 'PS-11366/DATUM', supportRoot: 'PS-11366',
  status: 'RESOLVED_EXACT_PIPE', selectionReason: 'EXACT_FULL_IDENTITY', candidateCount: 1,
  selectedNodeId: 'SJ-23052', selectedSourceFile: 'managed.json', selectedJsonPath: '$[267].children[10]',
  position: supportPosition, resolvedPipe: '/ASIM-1835-4"-B8810069-11441T3-PP', identityConfidence: 'HIGH',
}] } });
assert.match(jsonRows[0].selectionRemark, /complete support identity matched exactly/);
assert.match(jsonRows[0].selectionRemark, /resolved source pipe/);
assert.match(jsonRows[0].selectionRemark, /RESOLVED_EXACT_PIPE/);

const propagationRows = evidenceUi.propagationRows({ audit: { propagationLedger: [{
  sourceTagId: '8', targetIdentity: 'PS-12123.1', applied: false,
  outcome: 'REJECTED', rejectionReasons: ['TARGET_PIPE_NOT_PARALLEL', 'ELEVATION_OUTSIDE_TOLERANCE'],
}] } });
assert.match(propagationRows[0].auditRemark, /source and target pipe axes are not parallel/);
assert.match(propagationRows[0].auditRemark, /elevation difference exceeded tolerance/);
assert.match(propagationRows[0].auditRemark, /TARGET_PIPE_NOT_PARALLEL/);

console.log('navis-tag audit remarks and nearest-rejected tests passed');
