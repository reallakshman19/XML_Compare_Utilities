import assert from 'node:assert/strict';
import { parseSupportTableText, buildSupportTableRecords } from '../tabs/navis-tag-isonote/navis-tag-table-source.js';
import { buildStagedJsonHierarchy, buildStagedSupportIndex } from '../tabs/navis-tag-isonote/navis-tag-staged-tree.js';
import { parseNavisTagXml } from '../tabs/navis-tag-isonote/navis-tag-xml-parser.js';
import { buildIdentityNodeTrace } from '../tabs/navis-tag-isonote/navis-tag-identity-trace.js';
import { resolveNavisTagIsonotes } from '../tabs/navis-tag-isonote/navis-tag-proximity-engine.js';

const tableText = `Name of the element\tPIPE\tISOMETRIC NOTES\tPOS
PS-14416.2\tASIM-1836-2"-A8010850-13421\tEXISTING NOTE\t151763.923 125051.844 101634.463`;
const parsedTable = parseSupportTableText(tableText);
assert.equal(parsedTable.rows.length, 1);
assert.deepEqual(parsedTable.headers, ['Name of the element', 'PIPE', 'ISOMETRIC NOTES', 'POS']);
const tableBuild = buildSupportTableRecords(parsedTable, { tableIdentityColumns: ['Name of the element'], tablePositionColumn: 'POS', tableUnits: 'mm' });
assert.equal(tableBuild.records[0].identity, 'PS-14416.2');
assert.equal(tableBuild.records[0].supportRoot, 'PS-14416');
assert.equal(tableBuild.records[0].existingIsometricNotes, 'EXISTING NOTE');

const staged = {
  type: 'SITE',
  name: 'ASIM-1836',
  children: [{
    type: 'BRANCH',
    name: 'ASIM-1836-2"-A8010850-13421/B1',
    attributes: { OWNER: 'ASIM-1836-2"-A8010850-13421/B1' },
    children: [{
      type: 'SUPPORT',
      attributes: {
        CUSTOM_TAG: 'PS-14416.2',
        CUSTOM_POS: { x: 151763.923, y: 125051.844, z: 101634.463 },
        OD: 114.3,
      },
    }],
  }],
};
const config = {
  jsonIdentityPaths: ['attributes.CUSTOM_TAG'],
  jsonPositionPaths: ['attributes.CUSTOM_POS'],
  jsonBranchPaths: ['attributes.OWNER'],
  jsonOdPaths: ['attributes.OD'],
  jsonUnits: 'mm',
  navisUnits: 'm',
};
const tree = buildStagedJsonHierarchy([{ sourceFile: 'managed.json', data: staged }], config);
assert.ok(tree.summary.nodeCount >= 5);
assert.ok(tree.pathCatalogue.some((item) => item.path === 'attributes.CUSTOM_TAG'));
assert.ok(tree.pathCatalogue.some((item) => item.path === 'attributes.CUSTOM_POS'));
const index = buildStagedSupportIndex(tree, config);
assert.equal(index.entries.length, 1);
assert.equal(index.entries[0].identity, 'PS-14416.2');
assert.equal(index.entries[0].positionPath, 'attributes.CUSTOM_POS');
assert.equal(index.entries[0].resolvedBranch, 'ASIM-1836-2"-A8010850-13421/B1');

const identityTrace = buildIdentityNodeTrace(tableBuild.records, index, config);
assert.equal(identityTrace.summary.resolvedCount, 1);
assert.equal(identityTrace.rows[0].status, 'RESOLVED_EXACT');
assert.equal(identityTrace.rows[0].selectedIdentityPath, 'attributes.CUSTOM_TAG');
assert.equal(identityTrace.rows[0].positionSourcePath, 'attributes.CUSTOM_POS');

const navisXml = `<?xml version="1.0"?><exchange units="m"><viewpoints><view name="Tag View 1" guid="view-1"><comments><comment id="1" status="new"><user>reviewer</user><body>Model monofl ball valve (typ)</body><createddate><date year="2023" month="10" day="2" hour="7" minute="11" second="52"/></createddate></comment></comments><redlines><rltag id="1" commentid="1"><pos3d><pos3f x="151.763923" y="125.051844" z="101.634463"/></pos3d></rltag></redlines></view></viewpoints></exchange>`;
const navis = parseNavisTagXml(navisXml, config);
assert.equal(navis.tags.length, 1);
assert.equal(navis.tags[0].commentBody, 'Model monofl ball valve (typ)');
assert.ok(Math.abs(navis.tags[0].position.x - 151763.923) < 0.01);

const audit = resolveNavisTagIsonotes(tableBuild, identityTrace, navis, config);
assert.equal(audit.summary.resolvedCount, 1);
assert.equal(audit.augmentedRows[0]['Support ISONOTE'], 'Model monofl ball valve (typ)');
assert.equal(audit.augmentedRows[0]['ISOMETRIC NOTES'], 'EXISTING NOTE');
assert.equal(audit.augmentedRows[0]['Proximity PS/SL'], 'PS-14416');
assert.equal(audit.candidateLedger[0].jsonIdentityPath, 'attributes.CUSTOM_TAG');
assert.equal(audit.candidateLedger[0].resolvedBranch, 'ASIM-1836-2"-A8010850-13421/B1');

console.log('navis-tag-isonote tests passed');
