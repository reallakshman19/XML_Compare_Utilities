import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseSupportReportClashXml } from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js';
import {
  buildSupportReportTypicalityAudit,
  compareSupportTypeMultisets,
  extractStructuralFamilyFeatures,
  normalizePipeClass,
  supportTypeMultiset,
} from '../tabs/support-steel-relationship-builder/support-report-typicality.js';

const leftXml = readFileSync('benchmarks/11168.xml', 'utf8');
const rightXml = readFileSync('benchmarks/14168.xml', 'utf8');
const leftEvidence = parseSupportReportClashXml(leftXml);
const rightEvidence = parseSupportReportClashXml(rightXml);

function close(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('raw structural clash geometry is retained independently of report-row eligibility', () => {
  assert.equal(leftEvidence.rawClashCount, 41);
  assert.equal(rightEvidence.rawClashCount, 41);
  assert.equal(leftEvidence.rawClashes.length, 41);
  assert.equal(rightEvidence.rawClashes.length, 41);
  assert.equal(leftEvidence.rawClashes.every((item) => item.guid), true);
  assert.equal(rightEvidence.rawClashes.every((item) => item.guid), true);
});

test('11168 and 14168 preserve five pipe classes across ten physical support locations', () => {
  const [left] = extractStructuralFamilyFeatures(leftEvidence);
  const [right] = extractStructuralFamilyFeatures(rightEvidence);

  assert.equal(left.familyId, 'PS-11168');
  assert.equal(right.familyId, 'PS-14168');
  assert.equal(left.locationCount, 10);
  assert.equal(right.locationCount, 10);
  assert.equal(left.numericPrimarySupportMemberCount, 9);
  assert.equal(right.numericPrimarySupportMemberCount, 9);
  assert.equal(left.memberMultiplicitySpectrum.length, 10);
  assert.deepEqual(left.memberMultiplicitySpectrum, right.memberMultiplicitySpectrum);
  assert.deepEqual(left.normalizedPipeClassPopulation, right.normalizedPipeClassPopulation);
  assert.equal(left.normalizedPipeClassPopulation.length, 10);
  assert.deepEqual([...new Set(left.normalizedPipeClassPopulation)], [
    '2|A|13421',
    '2|P|31441C4|HT',
    '4|P|31441C4|PP',
    '4|W|31441C4',
    '8|P|31441C4|PP',
  ]);

  close(left.geometryEnvelopeMm.span.x, 1945);
  close(right.geometryEnvelopeMm.span.x, 1945);
  close(left.geometryEnvelopeMm.span.z, 1100);
  close(right.geometryEnvelopeMm.span.z, 1100);
});

test('11168 -> 14168 benchmark is accepted from auditable structural signals', () => {
  const audit = buildSupportReportTypicalityAudit(leftEvidence, rightEvidence);
  assert.equal(audit.schema, 'SupportReportTypicalityAudit.v1');
  assert.equal(audit.leftFamilyCount, 1);
  assert.equal(audit.rightFamilyCount, 1);
  assert.equal(audit.matches.length, 1);
  assert.deepEqual(audit.matches[0], {
    leftFamilyId: 'PS-11168',
    rightFamilyId: 'PS-14168',
    auditId: 'TYP-PS-11168--PS-14168',
    result: 'TYPICAL',
    reasonCode: 'TYPICAL_ACCEPTED',
  });

  const comparison = audit.familyComparisons[0];
  assert.equal(comparison.result, 'TYPICAL');
  assert.equal(comparison.signals.find((item) => item.reasonCode === 'STRUCT_LOCATION_COUNT_EQUAL').result, 'PASS');
  assert.equal(comparison.signals.find((item) => item.reasonCode === 'STRUCT_MEMBER_MULTIPLICITY_EQUAL').result, 'PASS');
  assert.equal(comparison.signals.find((item) => item.reasonCode === 'STRUCT_PIPE_CLASS_POPULATION_EQUAL').result, 'PASS');
  assert.equal(comparison.signals.find((item) => item.reasonCode === 'STRUCT_GEOMETRY_ENVELOPE_WITHIN_TOLERANCE').result, 'PASS');

  const distance = comparison.signals.find((item) => item.reasonCode === 'STRUCT_PAIR_DISTANCE_WITHIN_TOLERANCE');
  assert.equal(distance.result, 'PASS');
  assert.ok(distance.residual.median <= 10);
  assert.ok(distance.residual.p95 <= 25);
  assert.ok(distance.residual.max <= 50);
});

test('pipe normalization removes location and line serial identity but preserves engineering class', () => {
  assert.equal(normalizePipeClass('ASIM-1835-4"-P8810203-31441C4-PP-01'), '4|P|31441C4|PP');
  assert.equal(normalizePipeClass('ASIM-1836-4"-P8810023-31441C4-PP-01'), '4|P|31441C4|PP');
  assert.equal(normalizePipeClass('ASIM-1835-2"-P8810320-31441C4-HT-01'), '2|P|31441C4|HT');
});

test('SUPPORT TYPE canonicalization is order-independent and duplicate-sensitive', () => {
  assert.deepEqual(supportTypeMultiset('REST-50, BP-50, GUIDE-50'), {
    'BP-50': 1,
    'GUIDE-50': 1,
    'REST-50': 1,
  });
  const exact = compareSupportTypeMultisets(
    'REST-50, BP-50, GUIDE-50',
    'GUIDE-50, REST-50, BP-50',
  );
  assert.equal(exact.result, 'EXACT');
  assert.deepEqual(exact.reasonCodes, ['SUPPORT_TYPE_MULTISET_EXACT']);

  const duplicateMismatch = compareSupportTypeMultisets(
    'REST-15, BP-15, GUIDE-15, REST-15, GUIDE-15, BP-15',
    'REST-15, BP-15, GUIDE-15',
  );
  assert.equal(duplicateMismatch.result, 'PARTIAL');
  assert.deepEqual(duplicateMismatch.missingFromRight, [
    { type: 'BP-15', count: 1 },
    { type: 'GUIDE-15', count: 1 },
    { type: 'REST-15', count: 1 },
  ]);
  assert.deepEqual(duplicateMismatch.extraInRight, []);
  assert.deepEqual(duplicateMismatch.reasonCodes, ['SUPPORT_TYPE_MEMBER_MISSING']);
});
