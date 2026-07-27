import assert from 'node:assert/strict';

import { configuredAnchorSlots } from '../tabs/navis-tag-isonote/navis-tag-anchor-policy.js';
import { buildIdentityNodeTrace } from '../tabs/navis-tag-isonote/navis-tag-identity-trace.js';
import { refineStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-index-refinement.js';
import { resolveNavisTagIsonotes } from '../tabs/navis-tag-isonote/navis-tag-proximity-engine.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-staged-tree.js';
import { buildSupportTableRecords, parseSupportTableText } from '../tabs/navis-tag-isonote/navis-tag-table-source.js';
import { parseNavisTagXml } from '../tabs/navis-tag-isonote/navis-tag-xml-parser.js';
import { _test as tabTest } from '../tabs/navis-tag-isonote/navis-tag-isonote-tab.js';
import { _test as workflowTest } from '../tabs/navis-tag-isonote/navis-tag-isonote-ui-workflow.js';

const config = {
  tableIdentityColumns: ['Name of the element'],
  tablePositionMode: 'single',
  tablePositionColumn: 'POS',
  tableUnits: 'mm',
  jsonIdentityPaths: ['attributes.NAME'],
  jsonPositionPaths: ['attributes.POSI'],
  jsonUnits: 'mm',
  navisUnits: 'mm',
  supportCoordinateSource: 'prefer-table-fallback-json',
  eastingToleranceMm: 1,
  northingToleranceMm: 1,
  elevationToleranceMm: 1,
  coordinateDisagreementToleranceMm: 100,
  useOdHalfAlternatives: false,
  navisAnchorTagId: '164',
  navisAnchorSupportIdentity: '/PS-11171.5',
};

const table = buildSupportTableRecords(parseSupportTableText(
  'Name of the element\tPOS\n/PS-11171.5\t999999 999999 999999',
), config);
const staged = [{
  sourceFile: 'managed.json',
  data: {
    type: 'SUPPORT',
    name: 'SUPPORT PS-11171.5',
    attributes: {
      NAME: '/PS-11171.5',
      POSI: { x: 175057.718, y: 700947.6, z: 1144.64 },
    },
  },
}];
const tree = buildStagedJsonHierarchy(staged, config);
const rawIndex = buildStagedSupportIndex(tree, config);
const index = refineStagedSupportIndex(rawIndex, tree, config);
const identityTrace = buildIdentityNodeTrace(table.records, index, config);
assert.equal(identityTrace.summary.resolvedCount, 1);

const navisXml = `<?xml version="1.0"?>
<exchange units="mm">
  <viewpoints>
    <view name="Tag View 164" guid="view-164">
      <comments><comment id="164"><body>A1</body></comment></comments>
      <redlines><rltag id="164" commentid="164"><pos3d><pos3f x="229995.438" y="-1121056.464" z="101317.094"/></pos3d></rltag></redlines>
    </view>
  </viewpoints>
</exchange>`;
const navis = parseNavisTagXml(navisXml, config, identityTrace);
assert.equal(navis.anchor.active, true);
assert.equal(navis.anchor.policy, 'PRIORITY_FALLBACK');
assert.equal(navis.anchor.selectedPriority, 1);
assert.equal(navis.anchor.supportIdentity, 'PS-11171.5');
assert.equal(navis.anchor.attempts[0].status, 'SELECTED_PRIMARY');

const audit = resolveNavisTagIsonotes(table, identityTrace, navis, config);
assert.equal(audit.summary.resolvedCount, 1, 'active JSON anchor must not be invalidated by a conflicting table POS');
assert.equal(audit.decisions[0].selectedTagId, '164');
assert.equal(audit.decisions[0].supportPositionSource, 'STAGED_JSON');
assert.equal(audit.config.supportCoordinateSource, 'prefer-json-fallback-table');
assert.ok(audit.diagnostics.some((item) => item.code === 'ANCHOR_JSON_COORDINATE_SOURCE_OVERRIDE'));

const groupedTrace = {
  rows: [{
    canonicalIdentity: 'PS-11171.5',
    tableIdentityRaw: '/PS-11171.5|/PS-11171.3',
    groupedIdentities: ['/PS-11171.5', '/PS-11171.3'],
    position: { x: 175057.718, y: 700947.6, z: 1144.64 },
    selectedNodeId: 'SJ-3374',
    selectedJsonPath: '$[38].children[28]',
    resolvedBranch: '/ASIM-1835-4"-P8810203-31441C4-PP/B1',
  }],
};
const fallbackConfig = {
  ...config,
  navisAnchorTagId: '999',
  navisAnchorSupportIdentity: '/PS-11171.5',
  navisAnchorTagId2: '164',
  navisAnchorSupportIdentity2: '/PS-11171.5|/PS-11171.3',
};
const fallbackNavis = parseNavisTagXml(navisXml, fallbackConfig, groupedTrace);
assert.equal(fallbackNavis.anchor.active, true);
assert.equal(fallbackNavis.anchor.selectedPriority, 2);
assert.equal(fallbackNavis.anchor.fallbackUsed, true);
assert.equal(fallbackNavis.anchor.requestedSupportIdentity, '/PS-11171.5|/PS-11171.3');
assert.equal(fallbackNavis.anchor.supportIdentity, 'PS-11171.5');
assert.equal(fallbackNavis.anchor.groupedSourceIdentities, '/PS-11171.5|/PS-11171.3');
assert.equal(fallbackNavis.anchor.selectedNodeId, 'SJ-3374');
assert.equal(fallbackNavis.anchor.attempts[0].status, 'TAG_NOT_FOUND');
assert.equal(fallbackNavis.anchor.attempts[1].status, 'SELECTED_FALLBACK');
assert.match(fallbackNavis.anchor.summaryText, /Priority 2/);
assert.match(fallbackNavis.anchor.summaryText, /selected authority PS-11171\.5/);

const agreeingConfig = {
  ...config,
  navisAnchorTagId2: '164',
  navisAnchorSupportIdentity2: '/PS-11171.5',
};
const agreeingNavis = parseNavisTagXml(navisXml, agreeingConfig, identityTrace);
assert.equal(agreeingNavis.anchor.selectedPriority, 1);
assert.equal(agreeingNavis.anchor.attempts[1].status, 'AVAILABLE_FALLBACK_AGREES');

const conflictTrace = {
  rows: [
    groupedTrace.rows[0],
    {
      canonicalIdentity: 'PS-11171.3', tableIdentityRaw: '/PS-11171.3', groupedIdentities: ['/PS-11171.3'],
      position: { x: 176057.718, y: 700947.6, z: 1144.64 }, selectedNodeId: 'SJ-3375', selectedJsonPath: '$[38].children[29]',
    },
  ],
};
const conflictConfig = { ...agreeingConfig, navisAnchorSupportIdentity2: '/PS-11171.3' };
const conflictNavis = parseNavisTagXml(navisXml, conflictConfig, conflictTrace);
assert.equal(conflictNavis.anchor.selectedPriority, 1);
assert.equal(conflictNavis.anchor.attempts[1].status, 'AVAILABLE_FALLBACK_CONFLICT');
assert.equal(Math.round(conflictNavis.anchor.attempts[1].deltaDifferenceMm), 1000);

const slots = configuredAnchorSlots(fallbackConfig, true);
assert.equal(slots.length, 5);
assert.equal(slots[0].role, 'PRIMARY_AUTHORITY');
assert.equal(slots[1].role, 'FALLBACK_1');
const home = workflowTest.renderHome({
  config: fallbackConfig, navisParse: fallbackNavis, identityTrace: groupedTrace,
  sourceNames: {}, sourceTypes: {}, stagedDocuments: [], tableText: '', navisText: navisXml,
  inputsDirty: false, status: '', sessionMeta: {},
});
assert.match(home, /Multi-anchor coordinate matching/);
assert.match(home, /P1 → P2 → P3 → P4 → P5/);
assert.match(home, /data-nti-config="navisAnchorTagId2"/);
assert.match(home, /data-nti-config="navisAnchorSupportIdentity5"/);
assert.match(home, /SELECTED_FALLBACK/);
assert.match(home, /first valid Tag ↔ JSON support pair becomes the only coordinate authority/i);

const originalStorage = globalThis.localStorage;
const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};
try {
  const largeText = 'x'.repeat(1_500_000);
  const state = {
    tableText: '',
    tableImport: null,
    navisText: '',
    stagedDocuments: [{ sourceFile: 'large-managed.json', data: { payload: largeText } }],
    stagedStorageDirty: true,
    stagedStorageMeta: {},
    sourceNames: { table: '', navis: '', staged: 'large-managed.json' },
    sourceTypes: { table: '', navis: '', staged: 'JSON · 1 document(s)' },
    sessionMeta: {},
  };
  tabTest.saveSession(state);
  assert.ok(values.get('navisTagIsonote.staged.v1')?.length > 1_400_000, 'staged source must no longer be dropped at the old cutoff');
  assert.equal(JSON.parse(values.get('navisTagIsonote.session.v1')).stagedDocuments, undefined, 'large staged data must live outside the general session payload');

  values.set('navisTagIsonote.config.v4', JSON.stringify(fallbackConfig));
  const restored = tabTest.createState();
  assert.equal(restored.config.navisAnchorTagId, '999');
  assert.equal(restored.config.navisAnchorSupportIdentity, '/PS-11171.5');
  assert.equal(restored.config.navisAnchorTagId2, '164');
  assert.equal(restored.config.navisAnchorSupportIdentity2, '/PS-11171.5|/PS-11171.3');
  assert.equal(restored.stagedDocuments.length, 1);
  assert.equal(restored.stagedDocuments[0].sourceFile, 'large-managed.json');
  assert.equal(restored.stagedStorageMeta.restoredFrom, 'DEDICATED_STORE');
} finally {
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
}

console.log('navis-tag multi-anchor priority fallback and browser persistence tests passed');
