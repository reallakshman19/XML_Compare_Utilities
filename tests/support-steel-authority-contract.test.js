import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  PS_FAMILY_EVIDENCE_MODE,
  PS_FAMILY_EVIDENCE_SOURCE_SCHEMA,
} from '../tabs/ps-family-clash-audit/ps-family-evidence-graph-shared.js';
import { createPsFamilyNativePipelineReadiness } from '../tabs/ps-family-clash-audit/ps-family-native-combined-input.js';
import { buildSupportSteelRelationshipBundle } from '../tabs/support-steel-relationship-builder/support-steel-evidence-bundle.js';
import { supportSteelBundleToJson } from '../tabs/support-steel-relationship-builder/support-steel-relationship-export.js';
import { SUPPORT_STEEL_DEFAULT_CONFIG } from '../tabs/support-steel-relationship-builder/support-steel-relationship-contracts.js';

const FIXTURE_URL = new URL('./fixtures/support-steel/support-steel-ps14259-combined.json', import.meta.url);
const MANIFEST_URL = new URL('./fixtures/support-steel/support-steel-ps14259-combined.manifest.json', import.meta.url);

async function fixture() {
  return JSON.parse(await readFile(FIXTURE_URL, 'utf8'));
}

async function manifest() {
  return JSON.parse(await readFile(MANIFEST_URL, 'utf8'));
}

function byName(rows, name) {
  const stack = [...rows];
  while (stack.length) {
    const row = stack.shift();
    if (row?.attributes?.NAME === name) return row;
    stack.push(...(row?.children || []));
  }
  return null;
}

function verticalGap(left, right) {
  const a = left.attributes.BOUNDS;
  const b = right.attributes.BOUNDS;
  if (a.max.z < b.min.z) return b.min.z - a.max.z;
  if (b.max.z < a.min.z) return a.min.z - b.max.z;
  return 0;
}

test('frozen combined fixture has durable provenance and cannot masquerade as Owner production input', async () => {
  const [source, meta] = await Promise.all([
    readFile(FIXTURE_URL),
    manifest(),
  ]);
  const digest = createHash('sha256').update(source).digest('hex');
  assert.equal(digest, meta.sha256);
  assert.equal(source.length, meta.byteLength);
  assert.equal(meta.classification, 'PRODUCTION_SHAPED_DEMO');
  assert.equal(meta.authority, 'DETERMINISTIC_ARCHITECTURE_FIXTURE_NOT_OWNER_PRODUCTION_INPUT');
  assert.ok(meta.forbiddenUse.includes('native source for the #1154 PS-007/SL-097 workbook oracle'));
});

test('combined fixture emits the frozen producer schema stack and authority states', async () => {
  const bundle = buildSupportSteelRelationshipBundle({ combinedInput: await fixture() });
  assert.equal(bundle.inputMode, 'COMBINED_STAGED_MODEL');
  assert.equal(bundle.schema, 'SupportSteelRelationshipBundle.v1');
  assert.equal(bundle.geometryEngineSchema, 'SupportSteelAnalyticalGeometry.v1');
  assert.equal(bundle.memberChainEngineSchema, 'SupportMemberChainBundle.v1');
  assert.equal(bundle.supportMemberChain.geometrySchema, 'SupportMemberAnalyticalGeometry.v1');
  assert.equal(bundle.carrierResolutionSchema, 'SupportCarrierResolution.v1');
  assert.equal(bundle.carrierCatalogSchema, 'SupportCarrierCatalog.v1');
  assert.equal(bundle.carrierAttachmentSchema, 'SupportCarrierAttachmentBundle.v1');
  assert.equal(bundle.carrierGeometrySchema, 'SupportCarrierAnalyticalGeometry.v1');
  assert.equal(bundle.carrierTopologyCatalogSchema, 'SupportCarrierTopologyCatalog.v1');
  assert.equal(bundle.carrierTopologySchema, 'SupportCarrierTopologyBundle.v1');
  assert.equal(bundle.carrierToStructurePathSchema, 'SupportCarrierToStructurePathBundle.v1');

  const resolved = bundle.relationships.find((row) => row.supportFamilyId === '/PS-14259');
  assert.equal(resolved?.steelGroupId, '/SL-4201');
  assert.equal(resolved?.relationshipStatus, 'RESOLVED_EXPLICIT');
  assert.ok(resolved?.relationshipBasis.includes('EXPLICIT_REFERENCE'));

  const unresolved = bundle.relationships.find((row) => row.supportFamilyId === '/PS-14260');
  assert.equal(unresolved?.relationshipStatus, 'UNRESOLVED');
});

test('same normalized combined input produces byte-stable canonical JSON', async () => {
  const source = await fixture();
  const first = supportSteelBundleToJson(buildSupportSteelRelationshipBundle({ combinedInput: source }));
  const second = supportSteelBundleToJson(buildSupportSteelRelationshipBundle({ combinedInput: source }));
  assert.equal(second, first);
  assert.equal(
    createHash('sha256').update(second).digest('hex'),
    createHash('sha256').update(first).digest('hex'),
  );
});

test('combined readiness fails closed when the structural domain is removed', async () => {
  const source = await fixture();
  const supportOnly = source.filter((row) => row.type !== 'STEEL_GROUP');
  const readiness = createPsFamilyNativePipelineReadiness({ combinedInput: supportOnly });
  assert.equal(readiness.blocking, true);
  assert.ok(readiness.diagnostics.some((row) => row.code === 'NO_STRUCTURAL_GROUPS_IN_COMBINED_MODEL'));
});

test('PS-14259 frozen geometry independently separates contact from nearby evidence', async () => {
  const source = await fixture();
  const shoe = byName(source, '/PS-14259.1');
  const wearPad = byName(source, '/PS-14259.2');
  const beam = byName(source, '/SL-4201/BEAM-01');
  assert.ok(shoe && wearPad && beam);

  assert.equal(verticalGap(shoe, beam), 6);
  assert.equal(verticalGap(wearPad, beam), 0);
  assert.equal(SUPPORT_STEEL_DEFAULT_CONFIG.memberContactToleranceMm, 2);
  assert.equal(SUPPORT_STEEL_DEFAULT_CONFIG.memberCandidateToleranceMm, 25);
  assert.ok(verticalGap(shoe, beam) > SUPPORT_STEEL_DEFAULT_CONFIG.memberContactToleranceMm);
  assert.ok(verticalGap(shoe, beam) <= SUPPORT_STEEL_DEFAULT_CONFIG.memberCandidateToleranceMm);
  assert.ok(verticalGap(wearPad, beam) <= SUPPORT_STEEL_DEFAULT_CONFIG.memberContactToleranceMm);
});

test('PS/SL Evidence Audit is pinned to the Support/Steel producer seam', () => {
  assert.equal(PS_FAMILY_EVIDENCE_MODE, 'RELATIONSHIP_BUNDLE');
  assert.equal(PS_FAMILY_EVIDENCE_SOURCE_SCHEMA, 'SupportSteelRelationshipBundle.v1');
});
