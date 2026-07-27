import assert from 'node:assert/strict';

import { configuredAnchorSlots } from '../tabs/navis-tag-isonote/navis-tag-anchor-policy.js';
import { buildFinalOutputRows } from '../tabs/navis-tag-isonote/navis-tag-final-output.js';
import { buildIdentityNodeTrace } from '../tabs/navis-tag-isonote/navis-tag-identity-trace.js';
import { refineStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-index-refinement.js';
import { resolveNavisTagIsonotes } from '../tabs/navis-tag-isonote/navis-tag-proximity-engine.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-staged-tree.js';
import { buildSupportTableRecords, parseSupportTableText } from '../tabs/navis-tag-isonote/navis-tag-table-source.js';
import { parseNavisTagXml } from '../tabs/navis-tag-isonote/navis-tag-xml-parser.js';
import { _test as tabTest } from '../tabs/navis-tag-isonote/navis-tag-isonote-tab.js';
import { _test as workflowTest } from '../tabs/navis-tag-isonote/navis-tag-isonote-ui-workflow.js';

const baseConfig = {
  tableIdentityColumns: ['Name of the element'], tablePositionMode: 'single', tablePositionColumn: 'POS',
  tableUnits: 'mm', jsonIdentityPaths: ['attributes.NAME'], jsonPositionPaths: ['attributes.POSI'],
  jsonUnits: 'mm', navisUnits: 'mm', supportCoordinateSource: 'prefer-table-fallback-json',
  eastingToleranceMm: 1, northingToleranceMm: 1, elevationToleranceMm: 1,
  coordinateDisagreementToleranceMm: 100, ambiguityScoreGap: 15, useOdHalfAlternatives: false,
};
const tableText = [
  'Name of the element\tPOS',
  '/PS-11171.5\t999999 999999 999999',
  '/PS-11366/DATUM\t888888 888888 888888',
].join('\n');
const staged = [
  { sourceFile: 'managed-a.json', data: { type: 'SUPPORT', name: 'SUPPORT PS-11171.5', attributes: { NAME: '/PS-11171.5', POSI: { x: 175057.718, y: 700947.6, z: 1144.64 } } } },
  { sourceFile: 'managed-b.json', data: { type: 'SUPPORT', name: 'SUPPORT PS-11366', attributes: { NAME: '/PS-11366/DATUM', POSI: { x: 188530, y: 729150, z: 1066.551 } } } },
];
const navisXml = `<?xml version="1.0"?>
<exchange units="mm"><viewpoints>
  <view name="Tag View 164" guid="view-164"><comments><comment id="164"><body>A1</body></comment></comments><redlines><rltag id="164" commentid="164"><pos3d><pos3f x="229995.438" y="-1121056.464" z="101317.094"/></pos3d></rltag></redlines></view>
  <view name="Tag View 165" guid="view-165"><comments><comment id="165"><body>A2</body></comment></comments><redlines><rltag id="165" commentid="165"><pos3d><pos3f x="244529.978" y="-1092843.749" z="101070.534"/></pos3d></rltag></redlines></view>
</viewpoints></exchange>`;

function build(config) {
  const table = buildSupportTableRecords(parseSupportTableText(tableText), config);
  const tree = buildStagedJsonHierarchy(staged, config);
  const index = refineStagedSupportIndex(buildStagedSupportIndex(tree, config), tree, config);
  const trace = buildIdentityNodeTrace(table.records, index, config);
  const navis = parseNavisTagXml(navisXml, config, trace);
  const audit = resolveNavisTagIsonotes(table, trace, navis, config);
  audit.finalRows = buildFinalOutputRows(audit, config, navis);
  return { table, trace, navis, audit };
}

const singleConfig = { ...baseConfig, navisAnchorTagId: '164', navisAnchorSupportIdentity: '/PS-11171.5' };
const single = build(singleConfig);
assert.equal(single.navis.anchor.active, true);
assert.equal(single.navis.anchor.policy, 'EQUAL_AUTHORITY');
assert.equal(single.navis.anchor.validCount, 1);
assert.equal(single.navis.anchor.globalTransformApplied, true);
assert.equal(single.navis.anchor.attempts[0].status, 'VALID_HYPOTHESIS');
const single11171 = single.audit.decisions.find((row) => row.canonicalIdentity === 'PS-11171.5');
assert.equal(single11171.selectedTagId, '164');
assert.equal(single11171.selectedAnchorBasis, 'Tag 164 ↔ /PS-11171.5');
assert.equal(single11171.supportPositionSource, 'STAGED_JSON');
assert.equal(single.audit.config.supportCoordinateSource, 'prefer-json-fallback-table');

const multiConfig = {
  ...baseConfig,
  navisAnchorTagId: '164', navisAnchorSupportIdentity: '/PS-11171.5',
  navisAnchorTagId2: '165', navisAnchorSupportIdentity2: '/PS-11366/DATUM',
  navisAnchorTagId3: '999', navisAnchorSupportIdentity3: '/PS-11366/DATUM',
};
const multi = build(multiConfig);
assert.equal(multi.navis.anchor.policy, 'EQUAL_AUTHORITY');
assert.equal(multi.navis.anchor.validCount, 2);
assert.equal(multi.navis.anchor.globalTransformApplied, false);
assert.equal(multi.navis.anchor.attempts[0].status, 'VALID_HYPOTHESIS');
assert.equal(multi.navis.anchor.attempts[1].status, 'VALID_HYPOTHESIS');
assert.equal(multi.navis.anchor.attempts[2].status, 'TAG_NOT_FOUND');

const decision11171 = multi.audit.decisions.find((row) => row.canonicalIdentity === 'PS-11171.5');
const decision11366 = multi.audit.decisions.find((row) => row.canonicalIdentity === 'PS-11366/DATUM');
assert.equal(decision11171.selectedTagId, '164');
assert.equal(decision11171.selectedAnchorBasis, 'Tag 164 ↔ /PS-11171.5');
assert.equal(decision11171.supportIsonote, 'A1');
assert.equal(decision11366.selectedTagId, '165');
assert.equal(decision11366.selectedAnchorBasis, 'Tag 165 ↔ /PS-11366/DATUM');
assert.equal(decision11366.supportIsonote, 'A2', 'A/A1/A2 must not receive special filtering');
assert.equal(decision11171.selectedCandidate.eligibleAnchorCount, 1);
assert.equal(decision11366.selectedCandidate.eligibleAnchorCount, 1);

const row11171 = multi.audit.finalRows.find((row) => row['Name of the element'] === '/PS-11171.5');
const row11366 = multi.audit.finalRows.find((row) => row['Name of the element'] === '/PS-11366/DATUM');
assert.equal(row11171['Anchor pair basis'], 'Tag 164 ↔ /PS-11171.5');
assert.equal(row11366['Anchor pair basis'], 'Tag 165 ↔ /PS-11366/DATUM');
assert.ok(Object.keys(row11366).includes('Anchor pair basis'));

const ledger164 = multi.audit.candidateLedger.filter((row) => row.canonicalIdentity === 'PS-11171.5' && row.tagId === '164');
const ledger165 = multi.audit.candidateLedger.filter((row) => row.canonicalIdentity === 'PS-11366/DATUM' && row.tagId === '165');
assert.equal(ledger164.length, 1, 'one Tag must collapse to one candidate per support after anchor evaluation');
assert.equal(ledger165.length, 1);
assert.equal(ledger164[0].anchorEvaluations.length, 2);
assert.equal(ledger165[0].anchorEvaluations.length, 2);

const swappedConfig = {
  ...baseConfig,
  navisAnchorTagId: '165', navisAnchorSupportIdentity: '/PS-11366/DATUM',
  navisAnchorTagId2: '164', navisAnchorSupportIdentity2: '/PS-11171.5',
};
const swapped = build(swappedConfig);
function decisionSnapshot(audit) {
  return audit.decisions.map((row) => ({ identity: row.canonicalIdentity, tagId: row.selectedTagId, anchor: row.selectedAnchorBasis, score: row.confidenceScore, status: row.status })).sort((a, b) => a.identity.localeCompare(b.identity));
}
assert.deepEqual(decisionSnapshot(swapped.audit), decisionSnapshot(multi.audit), 'anchor slot order must not change engineering decisions');

const slots = configuredAnchorSlots(multiConfig, true);
assert.equal(slots.length, 5);
assert.equal(slots[0].role, 'EQUAL_AUTHORITY');
assert.equal(slots[1].role, 'EQUAL_AUTHORITY');
const home = workflowTest.renderHome({
  config: multiConfig, navisParse: multi.navis, identityTrace: multi.trace, audit: multi.audit,
  sourceNames: {}, sourceTypes: {}, stagedDocuments: [], tableText: '', navisText: navisXml,
  inputsDirty: false, status: '', sessionMeta: {},
});
assert.match(home, /Equal-authority rule/);
assert.match(home, /no primary anchor, no fallback order/i);
assert.match(home, /Anchor entry order does not affect matching/i);
assert.match(home, /data-nti-config="navisAnchorTagId2"/);
assert.match(home, /data-nti-config="navisAnchorSupportIdentity5"/);
assert.doesNotMatch(home, /P1 → P2/);
assert.doesNotMatch(home, /SELECTED_FALLBACK/);
assert.match(workflowTest.renderFinal({ audit: { finalRows: multi.audit.finalRows } }), /Anchor pair basis/);

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
    tableText: '', tableImport: null, navisText: '',
    stagedDocuments: [{ sourceFile: 'large-managed.json', data: { payload: largeText } }],
    stagedStorageDirty: true, stagedStorageMeta: {},
    sourceNames: { table: '', navis: '', staged: 'large-managed.json' },
    sourceTypes: { table: '', navis: '', staged: 'JSON · 1 document(s)' }, sessionMeta: {},
  };
  tabTest.saveSession(state);
  assert.ok(values.get('navisTagIsonote.staged.v1')?.length > 1_400_000);
  assert.equal(JSON.parse(values.get('navisTagIsonote.session.v1')).stagedDocuments, undefined);
  values.set('navisTagIsonote.config.v4', JSON.stringify(multiConfig));
  const restored = tabTest.createState();
  assert.equal(restored.config.navisAnchorTagId, '164');
  assert.equal(restored.config.navisAnchorSupportIdentity, '/PS-11171.5');
  assert.equal(restored.config.navisAnchorTagId2, '165');
  assert.equal(restored.config.navisAnchorSupportIdentity2, '/PS-11366/DATUM');
  assert.equal(restored.stagedDocuments.length, 1);
  assert.equal(restored.stagedStorageMeta.restoredFrom, 'DEDICATED_STORE');
} finally {
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
}

console.log('navis-tag equal-authority multi-anchor and browser persistence tests passed');
