import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { buildIdentityNodeTrace } from '../tabs/navis-tag-isonote/navis-tag-identity-trace.js';
import { refineStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-index-refinement.js';
import { resolveNavisTagIsonotes } from '../tabs/navis-tag-isonote/navis-tag-proximity-engine.js';
import { buildNavisTagIsonoteReadiness } from '../tabs/navis-tag-isonote/navis-tag-readiness.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-staged-tree.js';
import { parseNavisTagXml } from '../tabs/navis-tag-isonote/navis-tag-xml-parser.js';

const NAVIS_XML = `<?xml version="1.0" encoding="utf-8"?>
<exchange units="m" filename="AML_2026Jul14-1137.nwd">
  <viewpoints>
    <view name="Tag View 7" guid="7abae612-4e2a-46c6-86ff-ab1334bd4da9">
      <comments><comment id="8" status="new"><user>MUCM220</user><body>R+G+LS</body></comment></comments>
      <redlines><rltag id="8" commentid="8"><pos3d><pos3f x="614.7972929701" y="-1114.9397502294" z="101.2103381057"/></pos3d></rltag></redlines>
    </view>
    <view name="Tag View 9" guid="9724be25-f93f-419c-83b0-202c842a462c">
      <comments><comment id="9" status="new"><user>MUCM220</user><body>R</body></comment></comments>
      <redlines><rltag id="9" commentid="9"><pos3d><pos3f x="614.8209748358" y="-1112.7928853788" z="101.2787889225"/></pos3d></rltag></redlines>
    </view>
    <view name="Tag View 10" guid="0191778d-66e6-4c75-be7f-5065563b9712">
      <comments><comment id="10" status="new"><user>MUCM220</user><body>R</body></comment></comments>
      <redlines><rltag id="10" commentid="10"><pos3d><pos3f x="614.7986375973" y="-1110.2396357422" z="101.2509414640"/></pos3d></rltag></redlines>
    </view>
    <view name="Tag View 11" guid="f889cad4-88cf-4e82-a7e2-13a77b688995">
      <comments><comment id="11" status="new"><user>MUCM220</user><body>R+G</body></comment></comments>
      <redlines><rltag id="11" commentid="11"><pos3d><pos3f x="614.8343600912" y="-1107.2591450317" z="101.2843332780"/></pos3d></rltag></redlines>
    </view>
    <view name="Tag View 12" guid="6dd2c6d4-f775-49de-8160-13efec902c15">
      <comments><comment id="12" status="new"><user>MUCM220</user><body>R</body></comment></comments>
      <redlines><rltag id="12" commentid="12"><pos3d><pos3f x="614.8359427519" y="-1104.2864777889" z="101.2849888376"/></pos3d></rltag></redlines>
    </view>
    <view name="Tag View 13" guid="586ae82b-12d9-43c8-ab1a-3ff58fe86eab">
      <comments><comment id="13" status="new"><user>MUCM220</user><body>R</body></comment></comments>
      <redlines><rltag id="13" commentid="13"><pos3d><pos3f x="613.2702759153" y="-1102.6409794591" z="101.6465323755"/></pos3d></rltag></redlines>
    </view>
  </viewpoints>
</exchange>`;

function support(name, x, y, z) {
  return {
    name: `SUPPORT ${name.replace(/^\//, '').replace(/\..*$/, '')}`,
    type: 'SUPPORT',
    attributes: {
      NAME: name,
      TYPE: 'ATTA',
      POS: { x, y, z },
      ABORE: '100mm',
      LBORE: '100mm',
    },
  };
}

const STAGED_JSON = [
  {
    name: '/ASIM-1885-4\"-W8810126-31441C4-01/B4',
    type: 'BRANCH',
    children: [
      support('/PS-12123.13', 614860.813, -1114939.912, 1238.148),
      support('/PS-12120.16', 614860.813, -1112823.3, 1238.148),
      support('/PS-12119.20', 614860.813, -1110239.6, 1238.148),
      support('/PS-12118.10', 614860.813, -1107239.6, 1238.148),
      support('/PS-12115.13', 614860.813, -1104239.6, 1238.148),
    ],
  },
  {
    name: '/ASIM-1885-4\"-W8810126-31441C4-01/B1',
    type: 'BRANCH',
    children: [support('/PS-12865/DATUM', 613360, -1102597.625, 1613.15)],
  },
];

const EXPECTED_ISONOTES = new Map([
  ['PS-12123', 'R+G+LS'],
  ['PS-12120', 'R'],
  ['PS-12119', 'R'],
  ['PS-12118', 'R+G'],
  ['PS-12115', 'R'],
  ['PS-12865', 'R'],
]);

const BASE_CONFIG = Object.freeze({
  supportCoordinateSource: 'prefer-table-fallback-json',
  navisUnits: 'auto',
  jsonUnits: 'auto',
  navisElevationDatumMm: -100000,
  eastingToleranceMm: 100,
  northingToleranceMm: 100,
  elevationToleranceMm: 100,
  useOdHalfAlternatives: false,
});

function buildCurrentPipeline(config = BASE_CONFIG) {
  const navisParse = parseNavisTagXml(NAVIS_XML, config);
  const tree = buildStagedJsonHierarchy([{ sourceFile: 'navis-only-benchmark.json', data: STAGED_JSON }], config);
  const rawStagedIndex = buildStagedSupportIndex(tree, config);
  const stagedIndex = refineStagedSupportIndex(rawStagedIndex, tree, config);
  const tableBuild = { config, headers: [], records: [], diagnostics: [], summary: { rowCount: 0 } };
  const identityTrace = buildIdentityNodeTrace([], stagedIndex, config);
  const readiness = buildNavisTagIsonoteReadiness({
    config,
    tableBuild,
    tableImport: null,
    tree,
    stagedIndex,
    identityTrace,
    navisParse,
    hasSourceText: true,
  });
  const audit = resolveNavisTagIsonotes(tableBuild, identityTrace, navisParse, config);
  return { navisParse, tree, rawStagedIndex, stagedIndex, tableBuild, identityTrace, readiness, audit };
}

function referenceMatches(stagedIndex, navisParse, config) {
  const decisions = [];
  for (const entry of stagedIndex.entries || []) {
    if (!entry.position) continue;
    const candidates = (navisParse.tags || [])
      .filter((tag) => tag.position && tag.commentBody)
      .map((tag) => {
        const deltaE = tag.position.x - entry.position.x;
        const deltaN = tag.position.y - entry.position.y;
        const deltaEl = tag.position.z - entry.position.z;
        return {
          tag,
          deltaE,
          deltaN,
          deltaEl,
          distance: Math.hypot(deltaE, deltaN, deltaEl),
        };
      })
      .filter((candidate) => Math.abs(candidate.deltaE) <= config.eastingToleranceMm)
      .filter((candidate) => Math.abs(candidate.deltaN) <= config.northingToleranceMm)
      .filter((candidate) => Math.abs(candidate.deltaEl) <= config.elevationToleranceMm)
      .sort((a, b) => a.distance - b.distance || a.tag.evidenceId.localeCompare(b.tag.evidenceId));
    decisions.push({ entry, selected: candidates[0] || null, candidateCount: candidates.length });
  }
  return decisions;
}

function summarizeReference(decisions) {
  return {
    rowCount: decisions.length,
    resolvedCount: decisions.filter((decision) => decision.selected).length,
    unresolvedCount: decisions.filter((decision) => !decision.selected).length,
    matches: decisions.map((decision) => ({
      supportRoot: decision.entry.supportRoot,
      identity: decision.entry.identity,
      isonote: decision.selected?.tag.commentBody || '',
      viewName: decision.selected?.tag.viewName || '',
      deltaEMm: decision.selected?.deltaE ?? null,
      deltaNMm: decision.selected?.deltaN ?? null,
      deltaElMm: decision.selected?.deltaEl ?? null,
      candidateCount: decision.candidateCount,
    })),
  };
}

const current = buildCurrentPipeline();
assert.equal(current.navisParse.summary.viewCount, 6);
assert.equal(current.navisParse.summary.validTagCount, 6);
assert.equal(current.stagedIndex.summary.positionedEntryCount, 6);
assert.equal(current.identityTrace.summary.rowCount, 0);
assert.ok(current.readiness.blockers.some((item) => item.code === 'TABLE_ROWS_MISSING'));
assert.equal(current.readiness.canResolve, false);
assert.equal(current.audit.summary.resolvedCount, 0);

const reference = summarizeReference(referenceMatches(current.stagedIndex, current.navisParse, BASE_CONFIG));
assert.equal(reference.resolvedCount, 6);
for (const match of reference.matches) {
  assert.equal(match.isonote, EXPECTED_ISONOTES.get(match.supportRoot));
  assert.equal(match.candidateCount, 1);
}

const zeroDatumConfig = { ...BASE_CONFIG, navisElevationDatumMm: 0 };
const zeroDatum = buildCurrentPipeline(zeroDatumConfig);
const zeroDatumReference = summarizeReference(referenceMatches(zeroDatum.stagedIndex, zeroDatum.navisParse, zeroDatumConfig));
assert.equal(zeroDatumReference.resolvedCount, 0);

const iterations = Number(process.env.NTI_BENCH_ITERATIONS || 250);
const start = performance.now();
for (let index = 0; index < iterations; index += 1) buildCurrentPipeline();
const elapsedMs = performance.now() - start;

console.log(JSON.stringify({
  benchmark: 'navis-tag-isonote/navis-only',
  fixture: {
    navisViews: current.navisParse.summary.viewCount,
    validNavisTags: current.navisParse.summary.validTagCount,
    stagedSupportEntries: current.stagedIndex.summary.positionedEntryCount,
    tableRows: current.tableBuild.records.length,
  },
  currentPipeline: {
    readinessStatus: current.readiness.status,
    canResolve: current.readiness.canResolve,
    blockerCodes: current.readiness.blockers.map((item) => item.code),
    identityRows: current.identityTrace.summary.rowCount,
    resolvedCount: current.audit.summary.resolvedCount,
    verdict: 'BLOCKED_BY_MANDATORY_TABLE_PATH',
  },
  targetReference: {
    ...reference,
    requiredNavisElevationDatumMm: BASE_CONFIG.navisElevationDatumMm,
    verdict: 'SIX_UNIQUE_MATCHES_FROM_STAGED_JSON_AND_NAVIS_XML',
  },
  coordinateControl: {
    navisElevationDatumMm: 0,
    resolvedCount: zeroDatumReference.resolvedCount,
    verdict: 'NO_MATCHES_WITHOUT_DATUM_ALIGNMENT',
  },
  timing: {
    iterations,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    averageMs: Number((elapsedMs / iterations).toFixed(4)),
  },
}, null, 2));
