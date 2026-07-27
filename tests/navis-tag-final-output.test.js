import assert from 'node:assert/strict';
import { appendCandidateLedger } from '../tabs/navis-tag-isonote/navis-tag-candidate-evidence.js';
import {
  buildFinalOutputRows,
  expandTagKeywords,
  keywordMappingRows,
  selectOutputSupportIdentity,
  UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE,
} from '../tabs/navis-tag-isonote/navis-tag-final-output.js';
import { _test as workflowTest } from '../tabs/navis-tag-isonote/navis-tag-isonote-ui-workflow.js';
import { _test as tabTest } from '../tabs/navis-tag-isonote/navis-tag-isonote-tab.js';

const sourcePosition = { x: 100, y: 200, z: 1000 };
const directDecision = {
  tableRowId: 'D1',
  tableRowIndex: 1,
  canonicalIdentity: 'PS-12244/SREF',
  groupedIdentities: ['/PS-12244/SREF', '/PS-12244/DATUM', '/PS-12244.1'],
  tableIdentityRaw: '/PS-12244/SREF|/PS-12244/DATUM|/PS-12244.1',
  resolvedPipe: '/ASIM-1885-6"-CURRENT-31441C4-PP-01',
  supportPosition: { x: 100, y: 200, z: 1000 },
  selectedTagId: '8',
  selectedNavisPosition: sourcePosition,
  selectedCandidate: { commentBody: 'R+G+LS (applies to /ASIM-1885-8"-P8810204-31441C4-PP-01).' },
  appliesToDirective: { note: 'R+G+LS', targets: ['/ASIM-1885-8"-P8810204-31441C4-PP-01'] },
  directSupportIsonote: 'R+G+LS',
  propagatedIsonotes: [],
  propagatedFromTagIds: [],
  confidence: 'HIGH',
};
const targetDecision = {
  tableRowId: 'T1',
  tableRowIndex: 2,
  canonicalIdentity: 'PS-12123.13',
  groupedIdentities: ['/PS-12123.13', '/PS-12123.1', '/PS-12123.2', '/PS-12123.6'],
  tableIdentityRaw: '/PS-12123.13|/PS-12123.1|/PS-12123.2|/PS-12123.6',
  resolvedPipe: '/ASIM-1885-8"-P8810204-31441C4-PP-01',
  supportPosition: { x: 450, y: 200, z: 1500 },
  directSupportIsonote: '',
  propagatedIsonotes: [{ sourceTagId: '8', sourceTableRowId: 'D1', baseIsonote: 'R+G+LS', note: 'R+G+LS (Based on Tag 8)' }],
  propagatedFromTagIds: ['8'],
  confidence: 'UNRESOLVED',
};
const audit = {
  config: {},
  decisions: [directDecision, targetDecision],
  propagationLedger: [{
    sourceTableRowId: 'D1',
    sourceTagId: '8',
    sourcePosition,
    targetTableRowId: 'T1',
    applied: true,
    pipeMatchBasis: 'FULL_PIPE_NAME_EXACT',
    sourceAxis: 'N-S',
    targetPipeAxis: 'N-S',
    alongAxisDeltaMm: 0,
    parallelOffsetMm: 350,
    elevationDeltaMm: 500,
  }],
};

const navisParse = {
  tags: [
    {
      evidenceId: 'view-8:tag-8',
      viewGuid: 'view-8',
      tagId: '8',
      commentId: '8',
      commentBody: 'R+G+LS (applies to /ASIM-1885-8"-P8810204-31441C4-PP-01).',
      position: sourcePosition,
    },
    {
      evidenceId: 'view-9:tag-9',
      viewGuid: 'view-9',
      tagId: '9',
      commentId: '9',
      commentBody: 'G+LS',
      position: { x: 900, y: 800, z: 1700 },
    },
  ],
};
directDecision.selectedEvidenceId = 'view-8:tag-8';
directDecision.selectedViewGuid = 'view-8';
directDecision.selectedCommentId = '8';

assert.equal(selectOutputSupportIdentity(directDecision), '/PS-12244/DATUM');
assert.equal(selectOutputSupportIdentity(targetDecision), '/PS-12123.1');
assert.deepEqual(expandTagKeywords('R+G+LS'), ['REST', 'GUIDE', 'LINE STOP']);
assert.deepEqual(keywordMappingRows({}).map((row) => row.key), ['R', 'G', 'LS']);

const rows = buildFinalOutputRows(audit);
assert.equal(rows.length, 2);
assert.deepEqual(Object.keys(rows[0]), [
  'Name of the element',
  'PIPE',
  'POS',
  'Navis Tag ID',
  'Navis Tag POS',
  'Tag',
  'Support ISONOTE',
  'confidence',
  'Basis',
]);
assert.equal(rows[0]['Name of the element'], '/PS-12244/DATUM');
assert.equal(rows[0].Tag, 'R+G+LS');
assert.equal(rows[0]['Support ISONOTE'], ':/PS-12244/DATUM REST, GUIDE, LINE STOP (C=H)');
assert.equal(rows[0]['Navis Tag ID'], '8');
assert.match(rows[0].Basis, /Direct match accepted/);
assert.match(rows[0].Basis, /DIRECT_TAG_PROXIMITY/);

assert.equal(rows[1]['Name of the element'], '/PS-12123.1');
assert.equal(rows[1].Tag, 'R+G+LS');
assert.equal(rows[1]['Support ISONOTE'], ':/PS-12123.1 REST, GUIDE, LINE STOP (C=H)');
assert.equal(rows[1]['Navis Tag ID'], '8');
assert.equal(rows[1].confidence, 'HIGH');
assert.match(rows[1].Basis, /propagation was accepted/i);
assert.match(rows[1].Basis, /FULL_PIPE_NAME_EXACT/);
assert.match(rows[1].Basis, /OFFSET=350mm/);

const rowsWithUnmatched = buildFinalOutputRows(audit, {}, navisParse);
assert.equal(rowsWithUnmatched.length, 3);
const unmatched = rowsWithUnmatched[2];
assert.equal(unmatched['Name of the element'], UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE);
assert.equal(unmatched['Navis Tag ID'], '9');
assert.equal(unmatched['Navis Tag POS'], 'E=900;N=800;EL=1700');
assert.equal(unmatched.Tag, 'G+LS');
assert.equal(unmatched['Support ISONOTE'], '');
assert.equal(unmatched.confidence, 'UNRESOLVED');
assert.match(unmatched.Basis, /No accepted, in-tolerance or nearest-rejected support relationship/);
assert.match(unmatched.Basis, /NO_PS_MATCH/);
assert.match(unmatched.Basis, /REFER_NAVIS_FILE_TO_LOCATE_TAG/);
assert.ok(!rowsWithUnmatched.some((row) => row['Navis Tag ID'] === '8' && row['Name of the element'] === UNMATCHED_NAVIS_TAG_LOCATION_MESSAGE));

const customRows = buildFinalOutputRows(audit, {
  isonoteKeywordMappings: [
    { key: 'R', value: 'RESTRAINT' },
    { key: 'G', value: 'GUIDED' },
    { key: 'LS', value: 'AXIAL STOP' },
  ],
});
assert.equal(customRows[0]['Support ISONOTE'], ':/PS-12244/DATUM RESTRAINT, GUIDED, AXIAL STOP (C=H)');

const nearestTagPosition = { x: 189592.258, y: 729160.315, z: 898.08 };
const nearestCandidate = {
  ledgerId: 'ROW-562:NEAREST-REJECTED',
  ledgerKind: 'NEAREST_REJECTED',
  tableRowId: 'ROW-562',
  tableRowIndex: 562,
  canonicalIdentity: 'PS-11366/DATUM',
  groupedIdentities: ['/PS-11366/DATUM', '/PS-11366/SREF'],
  resolvedPipe: '/ASIM-1835-4"-B8810069-11441T3-PP',
  supportPosition: { x: 188530, y: 729150, z: 1066.551 },
  evidenceId: 'VIEW:165',
  viewGuid: 'view-165',
  viewName: 'Tag View 165',
  tagId: '165',
  commentId: '165',
  commentBody: 'A2',
  tagPosition: nearestTagPosition,
  positionSource: 'RLTAG_POS3D',
  withinTolerance: false,
  accepted: false,
  candidateRank: 1,
  score: 0,
  deltaEMm: 1062.258,
  deltaNMm: 10.315,
  deltaElMm: -168.471,
  verticalBasis: 'OD_HALF_BELOW',
  verticalResidualMm: 111.321,
  normalizedToleranceDistance: 10.62258,
  spatialDistanceMm: 1068.129,
  failedAxes: ['E', 'EL'],
  rejectionReasons: ['E_OUTSIDE_TOLERANCE', 'EL_OUTSIDE_TOLERANCE'],
  confidenceReasons: ['E_OUTSIDE_TOLERANCE', 'EL_OUTSIDE_TOLERANCE'],
  decisionStatus: 'UNRESOLVED',
  decisionReason: 'NO_IN_TOLERANCE_CANDIDATE',
};
const nearestAudit = {
  config: { eastingToleranceMm: 100, northingToleranceMm: 100, elevationToleranceMm: 100 },
  decisions: [],
  candidateLedger: [nearestCandidate],
  propagationLedger: [],
};
const nearestRows = buildFinalOutputRows(nearestAudit, {}, {
  tags: [{ evidenceId: 'VIEW:165', viewGuid: 'view-165', tagId: '165', commentId: '165', commentBody: 'A2', position: nearestTagPosition }],
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

const candidateLedger = [];
appendCandidateLedger(candidateLedger, { tableRowId: 'ROW-72', tableRowIndex: 72, canonicalIdentity: 'PS-11171.5' }, [{
  evidenceId: 'VIEW:164', tagId: '164', withinTolerance: true, score: 100,
  confidenceReasons: ['ALL_AXES_WITHIN_TOLERANCE', 'NORMALIZED_GEOMETRY_RMS_0.000000'],
}], {
  status: 'AMBIGUOUS', selected: null, decisionReason: 'CONFLICTING_NEARBY_COMMENTS',
  topCandidateTagId: '164', topCandidateScore: 100, runnerUpTagId: '1', runnerUpScore: 98.271633,
  scoreGap: 1.728367, requiredScoreGap: 15, distinctCommentCount: 2,
});
assert.match(candidateLedger[0].confidenceReasons[0], /Review required/);
assert.match(candidateLedger[0].confidenceReasons[0], /score lead 1\.728367 is below the required 15/);
assert.deepEqual(candidateLedger[0].confidenceReasonCodes, ['ALL_AXES_WITHIN_TOLERANCE', 'NORMALIZED_GEOMETRY_RMS_0.000000']);

const transformedXml = `<exchange units="m"><view name="Tag View 165" guid="view-165"><comment id="165"><body>A2</body></comment><rltag id="165" commentid="165"><pos3d><pos3f x="244.529978" y="-1092.843749" z="101.070534"/></pos3d></rltag></view></exchange>`;
globalThis.document = { querySelector: () => ({ value: transformedXml }) };
const transformedRows = buildFinalOutputRows({
  config: { navisUnits: 'm', navisEastingDatumMm: -54937.72, navisNorthingDatumMm: 1822004.064, navisElevationDatumMm: -100172.454 },
  decisions: [], candidateLedger: [], propagationLedger: [],
}, { navisEastingDatumMm: 0, navisNorthingDatumMm: 0, navisElevationDatumMm: 0 });
assert.equal(transformedRows[0]['Navis Tag POS'], 'E=189592.258;N=729160.315;EL=898.08');

const configHtml = workflowTest.renderConfig({
  config: {
    isonoteKeywordMappings: [{ key: 'R', value: 'REST' }],
    tableIdentityColumns: ['Name of the element'],
    tableReferenceColumns: ['Reference of the element'],
    tablePipeColumns: ['PIPE'],
    jsonIdentityPaths: ['attributes.NAME'],
    jsonReferencePaths: ['attributes.REF'],
    jsonPositionPaths: ['attributes.POSI'],
    jsonBranchPaths: ['attributes.OWNER'],
    jsonPipePaths: ['attributes.PIPE'],
    jsonZonePaths: ['attributes.ZONE'],
    jsonOdPaths: ['attributes.OD'],
    jsonBorePaths: ['attributes.BORE'],
    boreToOdLookup: {},
  },
  status: '',
});
assert.match(configHtml, /DEDICATED CONFIGURATION/);
assert.match(configHtml, /Tag keyword mappings/);
assert.match(configHtml, /data-nti-action="add-keyword"/);
assert.match(configHtml, /data-nti-keyword-key/);
assert.match(configHtml, /Same-station tolerance mm/);

const homeHtml = workflowTest.renderHome({
  tableText: 'Name of the element',
  navisText: '<exchange/>',
  stagedDocuments: [{ sourceFile: 'managed.json', data: {} }],
  sourceNames: { table: 'supports.csv', navis: 'tags.xml', staged: 'managed.zip' },
  sourceTypes: { table: 'CSV', navis: 'XML', staged: 'ZIP' },
  sessionMeta: { restoredAt: '2026-07-15T18:00:00.000Z' },
  inputsDirty: true,
  status: 'Ready',
});
assert.match(homeHtml, /Restored from this browser/);
assert.match(homeHtml, /Build evidence/);
assert.match(homeHtml, /Open Config/);

const finalHtml = workflowTest.renderFinal({ audit: { finalRows: rows, augmentedRows: [], ambiguousRows: [], rejectedRows: [] } });
assert.match(finalHtml, /Name of the element/);
assert.match(finalHtml, /Navis Tag POS/);
assert.match(finalHtml, /Export final CSV/);

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
const savedState = {
  tableText: 'Name of the element\tPIPE\tPOS',
  navisText: '<exchange units="m"/>',
  stagedDocuments: [{ sourceFile: 'managed.json', data: { type: 'SITE' } }],
  tableImport: { kind: 'text', candidates: [], diagnostics: [] },
  sourceNames: { table: 'supports.tsv', navis: 'tags.xml', staged: 'managed.json' },
  sourceTypes: { table: 'TSV', navis: 'XML', staged: 'JSON' },
};
tabTest.saveSession(savedState);
const restoredState = tabTest.createState();
assert.equal(restoredState.tableText, savedState.tableText);
assert.equal(restoredState.navisText, savedState.navisText);
assert.equal(restoredState.stagedDocuments.length, 1);
assert.equal(restoredState.sourceNames.navis, 'tags.xml');
assert.equal(restoredState.sourceTypes.staged, 'JSON');
assert.ok(restoredState.sessionMeta.restoredAt);

console.log('navis-tag final output and workflow UI tests passed');
