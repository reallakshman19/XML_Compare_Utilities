import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { _test as uiTest } from '../tabs/navis-tag-isonote/navis-tag-isonote-ui-evidence.js';

const utilityTab = readFileSync('tabs/navis-tag-isonote/navis-tag-isonote-tab.js', 'utf8');
const utilityView = readFileSync('tabs/navis-tag-isonote/navis-tag-isonote-ui-view.js', 'utf8');
const utilityEvidence = readFileSync('tabs/navis-tag-isonote/navis-tag-isonote-ui-evidence.js', 'utf8');
const readiness = readFileSync('tabs/navis-tag-isonote/navis-tag-readiness.js', 'utf8');
const identityTrace = readFileSync('tabs/navis-tag-isonote/navis-tag-identity-trace.js', 'utf8');
const stagedTree = readFileSync('tabs/navis-tag-isonote/navis-tag-staged-tree.js', 'utf8');
const boreOdMaster = readFileSync('tabs/navis-tag-isonote/navis-tag-bore-od-master.js', 'utf8');
const refinement = readFileSync('tabs/navis-tag-isonote/navis-tag-index-refinement.js', 'utf8');
const benchmarkRunner = readFileSync('scripts/navis-tag-isonote-full-benchmark.mjs', 'utf8');
const benchmarkWorkflow = readFileSync('.github/workflows/navis-tag-isonote-full-benchmark.yml', 'utf8');
const utilitiesRegistry = readFileSync('tabs/psnm-utility-tab.js', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

assert.match(utilityTab, /Navis Tag to ISONOTE/);
assert.match(utilityTab, /1\. JSON Trace/);
assert.match(utilityTab, /2\. Navis Tag Coordinates/);
assert.match(utilityTab, /3\. Tag ↔ JSON Match/);
assert.match(utilityTab, /Export Results/);
assert.match(utilityTab, /attachNavisResolutionToIdentityTrace/);
assert.match(utilityTab, /refineStagedSupportIndex/);
assert.match(utilityTab, /download-trace/);
assert.match(utilityView, /Support ISONOTE/);
assert.match(utilityEvidence, /JSON Trace — selected support nodes/);
assert.match(utilityEvidence, /Navis Tag Coordinate Resolution — one row per Tag ID/);
assert.match(utilityEvidence, /Navis Tag ↔ JSON Node Match — final decisions/);
assert.match(utilityEvidence, /Transformed E \(JSON comparison mm\)/);
assert.match(utilityEvidence, /raw XML XYZ × detected\/configured unit scale \+ Navis datum offsets/);
assert.match(utilityView, /data-nti-config="tableIdentityColumns"/);
assert.match(utilityView, /data-nti-config="tableReferenceColumns"/);
assert.match(utilityView, /data-nti-config="tablePositionMode"/);
assert.match(utilityView, /data-nti-config="tableEastingColumn"/);
assert.match(utilityView, /data-nti-config="tableNorthingColumn"/);
assert.match(utilityView, /data-nti-config="tableElevationColumn"/);
assert.match(utilityView, /data-nti-config="tableElevationDatumMm"/);
assert.match(utilityView, /data-nti-config="jsonElevationDatumMm"/);
assert.match(utilityView, /data-nti-config="navisElevationDatumMm"/);
assert.match(utilityEvidence, /jsonTraceRows/);
assert.match(utilityEvidence, /navisCoordinateRows/);
assert.match(utilityEvidence, /matchRows/);
assert.match(utilityView, /data-nti-config="jsonIdentityPaths"/);
assert.match(utilityView, /data-nti-config="jsonReferencePaths"/);
assert.match(utilityView, /data-nti-config="jsonPositionPaths"/);
assert.match(utilityView, /data-nti-config="jsonPipePaths"/);
assert.match(utilityView, /data-nti-config="jsonZonePaths"/);
assert.match(utilityView, /data-nti-config="boreToOdLookupEnabled"/);
assert.match(utilityView, /selectedNavisCommentId/);
assert.match(utilityView, /selectedReferencePath/);
assert.match(utilityView, /data-nti-path-select/);
assert.match(utilityView, /Discovered staged JSON paths/);
assert.match(utilityView, /Source Readiness/);
assert.match(utilityView, /data-nti-table-filter/);
assert.match(readiness, /TABLE_SEPARATE_POSITION_COLUMNS_INCOMPLETE/);
assert.match(readiness, /BORE_TO_OD_LOOKUP_PROFILE_INVALID/);
assert.match(identityTrace, /attachNavisResolutionToIdentityTrace/);
assert.match(identityTrace, /selectedNavisCommentId/);
assert.match(identityTrace, /RESOLVED_EXACT_REFERENCE/);
assert.match(stagedTree, /resolvedPipe/);
assert.match(stagedTree, /resolvedZone/);
assert.match(stagedTree, /derivedFacts/);
assert.match(stagedTree, /CUSTOM_EXPLICIT_BORE_TO_OD_LOOKUP/);
assert.match(stagedTree, /BUILT_IN_ASME_BORE_TO_OD_PROFILE/);
assert.match(boreOdMaster, /ASME_B36_10M_B36_19M_2018/);
assert.match(boreOdMaster, /ASME B36\.10M-2018/);
assert.match(boreOdMaster, /resolveBuiltInBoreToOd/);
assert.match(refinement, /suppressedMirrorEntryCount/);
assert.match(refinement, /DERIVED_FROM_BRANCH/);
assert.match(benchmarkRunner, /asim1836-managed-stage-2\/v1/);
assert.match(benchmarkRunner, /DISJOINT_COORDINATE_EXTENTS/);
assert.match(benchmarkRunner, /verifyExpectations/);
assert.match(benchmarkWorkflow, /asim1836-benchmark-expected\.json/);
assert.match(benchmarkWorkflow, /Frozen benchmark verified/);
assert.match(utilitiesRegistry, /installNavisTagIsonoteUtilityTile/);
assert.match(utilitiesRegistry, /mountNavisTagIsonote/);
assert.equal(typeof packageJson.scripts['test:navis-tag-isonote'], 'string');
assert.ok(packageJson.scripts['test:navis-tag-isonote'].includes('navis-tag-isonote-contracts-v3.test.js'));
assert.ok(packageJson.scripts['test:navis-tag-isonote'].includes('navis-tag-isonote-index-refinement.test.js'));
assert.ok(packageJson.scripts['test:navis-tag-isonote'].includes('navis-tag-isonote-bore-od-master.test.js'));
assert.ok(packageJson.scripts.test.includes('test:navis-tag-isonote'));

const navisCoordinateRows = uiTest.navisCoordinateRows({
  navisParse: {
    tags: [{
      viewIndex: 1,
      viewName: 'Tag View 8',
      viewGuid: 'view-8',
      tagId: '8',
      commentId: '8',
      commentBody: 'Tag 8 coordinate match',
      commentUser: 'reviewer',
      positionSource: 'RLTAG_POS3D',
      rawPosition: { x: 423.170971, y: -1141.125, z: 101.18415 },
      units: 'm',
      position: {
        x: 423170.971,
        y: -1141125,
        z: 1184.15,
        unitScale: 1000,
        sourceUnit: 'm',
        datumOffsetMm: { x: 0, y: 0, z: -100000 },
        profileName: 'NAVIS_DEFAULT',
        axisBasis: 'OBJECT_XYZ',
      },
      diagnostics: [],
    }],
  },
});
assert.equal(navisCoordinateRows[0].tagId, '8');
assert.equal(navisCoordinateRows[0].xmlZ, 101.18415);
assert.equal(navisCoordinateRows[0].unitScaleToMm, 1000);
assert.equal(navisCoordinateRows[0].datumEL, -100000);
assert.equal(navisCoordinateRows[0].navisToJsonEL, 1184.15);
assert.equal(navisCoordinateRows[0].coordinateStatus, 'VALID_FOR_MATCHING');

const stagedUiRows = uiTest.jsonTraceRows({
  identityTrace: { rows: [{
    tableRowIndex: 1,
    tableIdentityRaw: '/PS-12244/DATUM|/PS-12244/SREF',
    canonicalIdentity: 'PS-12244/DATUM',
    supportRoot: 'PS-12244',
    status: 'RESOLVED_EXACT_REFERENCE',
    selectionReason: 'EXACT_FULL_IDENTITY',
    candidateCount: 1,
    selectedNodeId: 'SJ-25',
    selectedSourceFile: 'managed.json',
    selectedJsonPath: '$[0].children[4]',
    selectedRawType: 'SUPPORT',
    selectedRawName: 'SUPPORT PS-12244',
    selectedIdentityPath: 'attributes.NAME',
    selectedReferenceRaw: '=1006649732/51230',
    selectedReferencePath: 'attributes.REF',
    positionSourcePath: 'attributes.POSI',
    position: { x: 423170.971, y: -1141125, z: 1184.15, sourceUnit: 'mm', unitScale: 1, datumOffsetMm: { x: 0, y: 0, z: 0 }, profileName: 'JSON_DEFAULT' },
    resolvedBranch: '/PIPE/B2', resolvedPipe: '/PIPE', resolvedZone: '', identityConfidence: 'HIGH',
  }] },
});
assert.equal(stagedUiRows[0].groupedIdentityRaw, '/PS-12244/DATUM|/PS-12244/SREF');
assert.equal(stagedUiRows[0].jsonE, 423170.971);

const matchUiRows = uiTest.matchRows({
  identityTrace: { rows: [{
    tableRowIndex: 1,
    tableIdentityRaw: '/PS-12244/DATUM|/PS-12244/SREF',
    canonicalIdentity: 'PS-12244/DATUM',
    selectedNodeId: 'SJ-25',
    selectedJsonPath: '$[0].children[4]',
    position: { x: 423170.971, y: -1141125, z: 1184.15 },
    navisResolutionStatus: 'RESOLVED',
    selectedNavisTagId: '8',
    selectedNavisViewName: 'Tag View 8',
    selectedNavisCommentId: '8',
    selectedNavisCommentBody: 'Tag 8 coordinate match',
    selectedNavisPosition: { x: 423170.971, y: -1141125, z: 1184.15 },
    deltaEMm: 0, deltaNMm: 0, deltaElMm: 0,
    verticalBasis: 'CENTERLINE', verticalResidualMm: 0,
    navisProximityEvidence: { candidateCount: 1 },
    navisAmbiguity: 'UNAMBIGUOUS', navisConfidence: 'HIGH', supportIsonote: 'Tag 8 coordinate match',
  }] },
});
assert.equal(matchUiRows[0].navisTagId, '8');
assert.equal(matchUiRows[0].deltaE, 0);
assert.equal(matchUiRows[0].selectedIsonote, 'Tag 8 coordinate match');

console.log('navis-tag-isonote static tests passed');
