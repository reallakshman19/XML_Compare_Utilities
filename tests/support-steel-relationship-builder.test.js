import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSupportSteelRelationshipBundle } from '../tabs/support-steel-relationship-builder/support-steel-relationship-engine.js';
import { supportSteelRelationshipsToCsv } from '../tabs/support-steel-relationship-builder/support-steel-relationship-export.js';
import {
  SUPPORT_STEEL_SAMPLE_STEEL,
  SUPPORT_STEEL_SAMPLE_SUPPORT,
} from '../tabs/support-steel-relationship-builder/support-steel-relationship-samples.js';
import { collectSupportFamilies } from '../tabs/support-steel-relationship-builder/support-steel-source-reader.js';
import { parsePoint } from '../tabs/support-steel-relationship-builder/support-steel-source-utils.js';

function build(config = {}) {
  return buildSupportSteelRelationshipBundle({
    supportInput: SUPPORT_STEEL_SAMPLE_SUPPORT,
    steelInput: SUPPORT_STEEL_SAMPLE_STEEL,
    config,
  });
}

test('reconstructs one support family across multiple pipe branches', () => {
  const families = collectSupportFamilies(SUPPORT_STEEL_SAMPLE_SUPPORT);
  const family = families.find((row) => row.familyId === '/PS-14259');
  assert.ok(family);
  assert.equal(family.members.length, 4);
  assert.deepEqual(family.branchIds, [
    '/ASIM-1836-4"-P9001002/B3',
    '/ASIM-1836-6"-P9001001/B1',
  ]);
  assert.deepEqual(family.members.map((member) => member.semanticRole).sort(), [
    'DATUM',
    'PIPE_SHOE',
    'STRUCTURAL_REFERENCE',
    'WEAR_PLATE',
  ]);
});

test('resolves explicit support to steel relationship and retains unresolved family', () => {
  const bundle = build();
  assert.equal(bundle.schema, 'SupportSteelRelationshipBundle.v1');
  assert.equal(bundle.summary.supportFamilyCount, 2);
  assert.equal(bundle.summary.steelGroupCount, 2);
  assert.equal(bundle.summary.resolvedFamilyCount, 1);
  assert.equal(bundle.summary.unresolvedFamilyCount, 1);
  const resolved = bundle.relationships.find((row) => row.supportFamilyId === '/PS-14259');
  assert.equal(resolved.steelGroupId, '/SL-4201');
  assert.equal(resolved.relationshipStatus, 'RESOLVED_EXPLICIT');
  assert.ok(resolved.relationshipBasis.includes('EXPLICIT_REFERENCE'));
  const unresolved = bundle.relationships.find((row) => row.supportFamilyId === '/PS-14260');
  assert.equal(unresolved.relationshipStatus, 'UNRESOLVED');
  assert.equal(unresolved.nearestSteelGroupId, '/SL-4202');
  assert.equal(unresolved.distanceMm, 50);
});

test('uses point proximity only when no stronger explicit relationship exists', () => {
  const support = [{
    type: 'ATTA',
    attributes: { NAME: '/PS-15000/DATUM', POS: { x: 0, y: 0, z: 0 } },
  }];
  const steel = [{
    type: 'STEEL_GROUP',
    attributes: { NAME: '/SL-5000', POS: { x: 0, y: 0, z: 20 } },
  }];
  const bundle = buildSupportSteelRelationshipBundle({ supportInput: support, steelInput: steel });
  assert.equal(bundle.relationships[0].relationshipStatus, 'RESOLVED_SPATIAL');
  assert.equal(bundle.relationships[0].distanceMm, 20);
});

test('keeps tied spatial candidates ambiguous', () => {
  const support = [{
    type: 'ATTA',
    attributes: { NAME: '/PS-15001/DATUM', POS: { x: 0, y: 0, z: 0 } },
  }];
  const steel = [
    { type: 'STEEL_GROUP', attributes: { NAME: '/SL-5100', POS: { x: 10, y: 0, z: 0 } } },
    { type: 'STEEL_GROUP', attributes: { NAME: '/SL-5101', POS: { x: -10.5, y: 0, z: 0 } } },
  ];
  const bundle = buildSupportSteelRelationshipBundle({ supportInput: support, steelInput: steel });
  assert.equal(bundle.summary.ambiguousFamilyCount, 1);
  assert.equal(bundle.relationships.length, 2);
  assert.ok(bundle.relationships.every((row) => row.relationshipStatus === 'AMBIGUOUS'));
});

test('parses plant coordinates and exports one ledger row per relationship', () => {
  assert.deepEqual(parsePoint('E 437500mm S 1159000mm U 2100mm'), {
    x: 437500,
    y: -1159000,
    z: 2100,
  });
  const bundle = build();
  const csv = supportSteelRelationshipsToCsv(bundle);
  assert.match(csv, /supportFamilyId,steelGroupId,relationshipStatus/);
  assert.match(csv, /PS-14259/);
  assert.match(csv, /RESOLVED_EXPLICIT/);
});
