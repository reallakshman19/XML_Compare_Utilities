// Engineering provenance: a changed value gets the step that last changed it and today's source label from the branch row
// it agrees with; a change with no evidence is counted as unexplained; a popup weight is src popup.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENGINEERING_STEPS, engineeringProvenance, srcOfLabel } from '../uxml/v2/engineering/EngineeringProvenance.js';

const xml = ({ t1 = '', rating = '', weight = '0' } = {}) => `<PSI116><Branch><Branchname>B1</Branchname><Temperature><Temperature1>${t1}</Temperature1></Temperature>`
  + `<Node><NodeNumber>10</NodeNumber><ComponentType>RIGID</ComponentType><Position>0 0 0</Position><Rating>${rating}</Rating><Weight>${weight}</Weight></Node></Branch></PSI116>`;
/** Every snapshot is `before` until `step`, then `after`. */
const snaps = (step, before, after) => Object.fromEntries(ENGINEERING_STEPS.map((s, i) => [s, i < ENGINEERING_STEPS.indexOf(step) ? before : after]));

test('a value set in process parity carries the step and the line-list label of the row it agrees with', () => {
  const p = engineeringProvenance({ inputXml: xml(), snapshots: snaps('process', xml(), xml({ t1: '120' })),
    processRows: [{ branchName: 'B1', t1: '120', t1Source: 'linelist' }] });
  assert.deepEqual(p.rows.map((r) => [r.field, r.step, r.src, r.label]), [['Temperature1', 'process', 'lineList', 'linelist']]);
  assert.equal(p.counts.unexplained, 0);
});

test('a change with no evidence is unexplained (the check can fail)', () => {
  const p = engineeringProvenance({ inputXml: xml(), snapshots: snaps('process', xml(), xml({ rating: '300' })), processRows: [{ branchName: 'B1', rating: '150', ratingSource: 'auto' }] });
  assert.equal(p.counts.unexplained, 1);
  assert.equal(p.rows[0].src, 'stage');
});

test('a weight the branch pass took from the Run popup is src popup', () => {
  const p = engineeringProvenance({ inputXml: xml(), snapshots: snaps('branchPass', xml(), xml({ weight: '12.5' })),
    diagnostics: [{ type: 'rigid-weight-manual-override', branchName: 'B1', nodeNumber: '10', weight: 12.5 }] });
  assert.deepEqual(p.rows.map((r) => [r.field, r.step, r.src]), [['Weight', 'branchPass', 'popup']]);
  const none = engineeringProvenance({ inputXml: xml(), snapshots: snaps('branchPass', xml(), xml({ weight: '12.5' })) });
  assert.equal(none.rows[0].src, 'weightTable');
});

test('source labels map to families', () => {
  assert.deepEqual(['linelist', 'override', 'piping-class-master', 'branch-name', 'default-zero', 'auto', 'dtxr-rating-fetched'].map(srcOfLabel),
    ['lineList', 'override', 'pipingClass', 'branchName', 'default', 'auto', 'staged']);
});
