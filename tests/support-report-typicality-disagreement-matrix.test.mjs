import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStructuralAxisDisagreementMatrix,
  classifyStructuralAxisDisagreement,
} from './support-report-typicality-disagreement-matrix.mjs';

const structural = (result, rightFamilyId = '', extra = {}) => Object.freeze({
  leftFamilyId: 'PS-1', result, rightFamilyId, reasonCode: `STRUCT_${result}`, ...extra,
});
const axis = (result, rightFamilyId = '', extra = {}) => Object.freeze({
  leftFamilyId: 'PS-1', result, rightFamilyId, reasonCode: `AXIS_${result}`, ...extra,
});

test('A/B/C/D classes preserve independent structural and axis decisions', () => {
  assert.equal(classifyStructuralAxisDisagreement(structural('TYPICAL', 'PS-2'), axis('MATCH', 'PS-2')),
    'A_BOTH_MATCH_SAME_CANDIDATE');
  assert.equal(classifyStructuralAxisDisagreement(structural('TYPICAL', 'PS-2'), axis('NO_MATCH')),
    'B_STRUCTURAL_MATCH_AXIS_REJECT');
  assert.equal(classifyStructuralAxisDisagreement(structural('NO_MATCH'), axis('MATCH', 'PS-2')),
    'C_STRUCTURAL_REJECT_AXIS_MATCH');
  assert.equal(classifyStructuralAxisDisagreement(structural('NO_MATCH'), axis('NO_MATCH')),
    'D_BOTH_REJECT');
});

test('different accepted candidates are conflict rather than A agreement', () => {
  assert.equal(classifyStructuralAxisDisagreement(structural('TYPICAL', 'PS-2'), axis('MATCH', 'PS-3')),
    'MATCH_CONFLICT_DIFFERENT_CANDIDATE');
});

test('UNAVAILABLE and REVIEW stay outside A/B/C/D instead of being treated as rejection', () => {
  assert.equal(classifyStructuralAxisDisagreement(structural('TYPICAL', 'PS-2'), axis('UNAVAILABLE')),
    'STRUCTURAL_TYPICAL_AXIS_UNAVAILABLE');
  assert.equal(classifyStructuralAxisDisagreement(structural('REVIEW', 'PS-2'), axis('MATCH', 'PS-2')),
    'STRUCTURAL_REVIEW_AXIS_MATCH');
});

test('matrix exposes B/C cases as the priority calibration set', () => {
  const matrix = buildStructuralAxisDisagreementMatrix([
    { leftFamilyId: 'PS-1', rightFamilyId: 'PS-11', result: 'TYPICAL', reasonCode: 'TYPICAL_ACCEPTED' },
    { leftFamilyId: 'PS-2', rightFamilyId: '', result: 'NO_MATCH', reasonCode: 'TYPICAL_REJECTED' },
    { leftFamilyId: 'PS-3', rightFamilyId: 'PS-13', result: 'TYPICAL', reasonCode: 'TYPICAL_ACCEPTED' },
  ], [
    { leftFamilyId: 'PS-1', rightFamilyId: '', result: 'NO_MATCH', reasonCode: 'AXIS_TYPICALITY_NO_MATCH' },
    { leftFamilyId: 'PS-2', rightFamilyId: 'PS-12', result: 'MATCH', reasonCode: 'AXIS_TYPICALITY_MATCH' },
    { leftFamilyId: 'PS-3', rightFamilyId: 'PS-13', result: 'MATCH', reasonCode: 'AXIS_TYPICALITY_MATCH' },
  ]);

  assert.deepEqual(matrix.classificationHistogram, {
    A_BOTH_MATCH_SAME_CANDIDATE: 1,
    B_STRUCTURAL_MATCH_AXIS_REJECT: 1,
    C_STRUCTURAL_REJECT_AXIS_MATCH: 1,
  });
  assert.deepEqual(matrix.priorityCalibrationCases.map((item) => item.leftFamilyId), ['PS-1', 'PS-2']);
});
