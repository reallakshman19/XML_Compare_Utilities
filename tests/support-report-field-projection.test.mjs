import assert from 'node:assert/strict';
import test from 'node:test';
import { projectSupportReportFields } from '../tabs/support-steel-relationship-builder/support-report-field-projection.js';

const group = Object.freeze({
  scope: 'ASIM',
  secondarySupportFamilyId: 'PS-007',
  fullLineTag: 'ASIM-1885-PL-10"-S8810105-HOT-01',
  totalSupportPointsOnSecondary: 5,
  primaryPaths: [['/ASIM-1885-CU-PL', '/ASIM-1885-CU-PL-S']],
});
const member = Object.freeze({
  memberId: '/PS-007.7',
  semanticRole: 'OTHER_FAMILY_MEMBER',
  sourcePath: ['/ASIM-1885-CU-PL', '/ASIM-1885-CU-PL-S', '/PS-007.7'],
  attributes: Object.freeze({ CMPSUPTYPE: 'SHOE-250', PREV_NAME: 'PS05503' }),
});

function project(attributes) {
  return projectSupportReportFields({
    group,
    reportMembers: [member],
    carrierRows: [{ carrierObjectId: '/PIPE-10', attributes }],
    coordinatePoint: { x: 798423, y: -1125028, z: 100100.45 },
  });
}

test('native carrier attributes project revision and combined insulation without inference', () => {
  const fields = project({
    ABORE: '250',
    PIPE_SCHEDULE: 'PIPE Sch 100',
    PIPE_INSULATION_TYPE: 'HC',
    PIPE_INSULATION_THICKNESS: '80mm',
    STRESS_SYSTEM_NUMBER: 'QSP-SYS-01',
    NODE_NO: '280',
    REVISION: '5',
  });
  assert.equal(fields.previousName, 'PS05503');
  assert.equal(fields.pipeInsulationTypeAndThickness, 'HC 80mm');
  assert.equal(fields.stressSystemNumber, 'QSP-SYS-01');
  assert.equal(fields.nodeNumber, '280');
  assert.equal(fields.revision, '5');
});

test('missing revision stays blank rather than synthesized', () => {
  const fields = project({ PIPE_INSULATION_TYPE: 'HC', PIPE_INSULATION_THICKNESS: '80mm' });
  assert.equal(fields.revision, '');
});
