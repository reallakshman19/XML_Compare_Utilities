import assert from 'node:assert/strict';
import { createPsFamilyInputReadinessFromTextInputs } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-actions.js';
import { renderPsFamilyReadiness } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-view.js';
import { _test } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-tab.js';
import { PS_FAMILY_CLASH_AUDIT_CONFIG } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-config.js';
import { PS_FAMILY_SAMPLE_STRUCTURE_XML, PS_FAMILY_SAMPLE_SUPPORT_XML } from '../tabs/ps-family-clash-audit/ps-family-clash-audit-samples.js';

function diagnosticCodes(readiness) { return new Set(readiness.diagnostics.map((item) => item.code)); }

const sampleReadiness = createPsFamilyInputReadinessFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
assert.equal(sampleReadiness.blocking, false);
assert.equal(sampleReadiness.summary.sourceFamily, 'PS-14396');
assert.equal(sampleReadiness.summary.structureContactCount, 2);
assert.equal(sampleReadiness.summary.supportChainCount, 3);
assert.equal(sampleReadiness.summary.expectedCount, 0);
assert.equal(sampleReadiness.summary.detailCount, 0);
assert.match(renderPsFamilyReadiness(sampleReadiness), /Input Readiness/);
assert.match(renderPsFamilyReadiness(sampleReadiness), /PS-14396/);
assert.match(renderPsFamilyReadiness(sampleReadiness), /Structure contacts \/ Support chain/);

const emptyReadiness = createPsFamilyInputReadinessFromTextInputs({
  structureXmlText: '',
  supportXmlText: '',
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
assert.equal(emptyReadiness.blocking, true);
assert.ok(diagnosticCodes(emptyReadiness).has('MISSING_STRUCTUREGROUP_SUPPORTS_XML'));
assert.ok(diagnosticCodes(emptyReadiness).has('MISSING_SUPPORT_CHAIN_XML'));
assert.ok(diagnosticCodes(emptyReadiness).has('UNKNOWN_SOURCE_FAMILY'));

const missingSupport = createPsFamilyInputReadinessFromTextInputs({
  structureXmlText: PS_FAMILY_SAMPLE_STRUCTURE_XML,
  supportXmlText: '',
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
assert.equal(missingSupport.blocking, true);
assert.ok(diagnosticCodes(missingSupport).has('MISSING_SUPPORT_CHAIN_XML'));
assert.equal(missingSupport.summary.sourceFamily, 'PS-14396');

const missingStructure = createPsFamilyInputReadinessFromTextInputs({
  structureXmlText: '',
  supportXmlText: PS_FAMILY_SAMPLE_SUPPORT_XML,
  config: { sourceSide: 'auto', sourceFamily: '', familyPrefixesText: 'PS, SL', posToleranceMm: 25 },
});
assert.equal(missingStructure.blocking, true);
assert.ok(diagnosticCodes(missingStructure).has('MISSING_STRUCTUREGROUP_SUPPORTS_XML'));
assert.equal(missingStructure.summary.sourceFamily, 'PS-14396');

const shell = _test.renderInputShell(PS_FAMILY_CLASH_AUDIT_CONFIG);
assert.match(shell, /Check Readiness/);
assert.match(shell, /data-psfa="readiness"/);
assert.match(shell, /StructureGroup vs Supports XML/);
assert.match(shell, /Clash within Supports XML/);

console.log('ps-family-readiness tests passed');
