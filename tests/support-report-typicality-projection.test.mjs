import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseSupportReportClashXml } from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js';
import { buildSupportReportBundle } from '../tabs/support-steel-relationship-builder/support-report-engine.js';
import {
  buildSupportReportTypicalityComparison,
  projectTypicalityOntoSupportReportBundle,
  SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
  _test,
} from '../tabs/support-steel-relationship-builder/support-report-typicality-projection.js';

test('comparison profile preserves structural defaults when only location tolerance is overridden', () => {
  const profile = _test.comparisonProfile({
    pipingLocation: { geometryFingerprintToleranceMm: 125 },
  });
  assert.equal(profile.structural.geometryEnvelopeToleranceMm,
    SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL.structural.geometryEnvelopeToleranceMm);
  assert.equal(profile.structural.pairDistanceP95ToleranceMm,
    SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL.structural.pairDistanceP95ToleranceMm);
  assert.equal(profile.pipingLocation.geometryFingerprintToleranceMm, 125);
  assert.equal(profile.pipingLocation.assignmentWeights.supportTypeMember, 100000);
});

test('11168 -> 14168 projects family and row audit links without row ordinal matching', () => {
  const leftEvidence = parseSupportReportClashXml(readFileSync('benchmarks/11168.xml', 'utf8'));
  const rightEvidence = parseSupportReportClashXml(readFileSync('benchmarks/14168.xml', 'utf8'));
  const leftReport = buildSupportReportBundle({ clashEvidence: leftEvidence });
  const typicalityAudit = buildSupportReportTypicalityComparison(leftEvidence, rightEvidence, {
    leftReportBundle: leftReport,
    profile: { pipingLocation: { geometryFingerprintToleranceMm: 1000 } },
  });
  const projected = projectTypicalityOntoSupportReportBundle(leftReport, typicalityAudit, leftEvidence);

  assert.equal(typicalityAudit.structuralMatches[0].result, 'TYPICAL');
  assert.equal(typicalityAudit.matches[0].result, 'TYPICAL');
  assert.equal(typicalityAudit.matches[0].rightFamilyId, 'PS-14168');
  assert.equal(typicalityAudit.locationAssignments.length, 1);
  assert.equal(typicalityAudit.locationAssignments[0].selectedAssignments.length, 5);
  assert.equal(projected.rows.length, 5);
  assert.equal(projected.typicalityAudit, typicalityAudit);

  for (const row of projected.rows) {
    assert.equal(row.typicalStructure, 'PS-14168');
    assert.equal(row.pipingSupportArrangementMatch, 'TOPOLOGY ONLY (SUPPORT TYPE UNAVAILABLE)');
    assert.match(row.typicalityAuditId, /^TYP-PS-11168--PS-14168-L\d{2}$/);
  }
});

test('family match becomes review rather than typical when piping arrangement is partial', () => {
  const match = Object.freeze({
    leftFamilyId: 'PS-1', rightFamilyId: 'PS-2', auditId: 'TYP-PS-1--PS-2',
    result: 'TYPICAL', reasonCode: 'TYPICAL_ACCEPTED',
  });
  const resolved = _test.resolveFamilyMatch(match, { result: 'PARTIAL' });
  assert.equal(resolved.result, 'REVIEW');
  assert.equal(resolved.reasonCode, 'TYPICAL_REVIEW_SUPPORT_CONFIGURATION');
});
