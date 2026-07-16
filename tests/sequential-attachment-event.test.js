import assert from 'node:assert/strict';
import { buildSequentialEvidenceModel, indexSequentialEvidence } from '../tabs/sequential-sketcher/source/sequential-evidence-model.js';
import {
  createSequentialConstructionSession,
  runConstructionUntilBlocked,
} from '../tabs/sequential-sketcher/construction/sequential-construction-runtime.js';

function setup(records, branchId) {
  const evidence = buildSequentialEvidenceModel(records);
  return { evidence, indexes: indexSequentialEvidence(evidence), session: createSequentialConstructionSession(branchId) };
}

{
  const main = '/EVENT/MAIN';
  const side = '/EVENT/SIDE';
  const records = [
    { type: 'BRANCH', name: main, attributes: { NAME: main, HPOS: { x: 0, y: 0, z: 0 } }, children: [
      { type: 'PIPE', name: 'P1', attributes: { APOS: { x: 0, y: 0, z: 0 }, LPOS: { x: 100, y: 0, z: 0 } } },
      { type: 'OLET', name: 'O1', attributes: { NAME: 'O1', POS: { x: 100, y: 0, z: 0 }, CREF: side } },
      { type: 'PIPE', name: 'P2', attributes: { APOS: { x: 100, y: 0, z: 0 }, LPOS: { x: 200, y: 0, z: 0 } } },
      { type: 'CAP', name: 'C1', attributes: { APOS: { x: 200, y: 0, z: 0 } } },
    ] },
    { type: 'BRANCH', name: side, attributes: { NAME: side, HPOS: { x: 100, y: 20, z: 0 } }, children: [
      { type: 'PIPE', name: 'SP1', attributes: { APOS: { x: 100, y: 20, z: 0 }, LPOS: { x: 100, y: 80, z: 0 } } },
      { type: 'CAP', name: 'SC1', attributes: { APOS: { x: 100, y: 80, z: 0 } } },
    ] },
  ];
  const { evidence, indexes, session } = setup(records, main);
  const result = runConstructionUntilBlocked(session, evidence, indexes, {});
  assert.equal(result.session.state, 'ROUTE_COMPLETE');
  const components = result.session.confirmedComponentIds.map((id) => indexes.components.get(id)?.sourceComponentId);
  assert.deepEqual(components.slice(0, 4), ['P1', 'O1', 'P2', 'C1']);
  const operations = result.session.strokeLedger.map((row) => row.op);
  assert.ok(operations.indexOf('DRAW_OLET') > operations.indexOf('DRAW_PIPE'));
  assert.ok(operations.indexOf('DRAW_OLET') < operations.indexOf('DRAW_CAP'));
  assert.equal(result.session.currentDecisionRequest, null);
}

{
  const main = '/EVENT/BROKEN';
  const records = [{ type: 'BRANCH', name: main, attributes: { NAME: main, HPOS: { x: 0, y: 0, z: 0 } }, children: [
    { type: 'PIPE', name: 'P1', attributes: { APOS: { x: 0, y: 0, z: 0 }, LPOS: { x: 100, y: 0, z: 0 } } },
    { type: 'OLET', name: 'O1', attributes: { NAME: 'O1', POS: { x: 130, y: 0, z: 0 } } },
    { type: 'PIPE', name: 'P2', attributes: { APOS: { x: 100, y: 0, z: 0 }, LPOS: { x: 200, y: 0, z: 0 } } },
  ] }];
  const { evidence, indexes, session } = setup(records, main);
  const result = runConstructionUntilBlocked(session, evidence, indexes, {});
  assert.equal(result.session.state, 'USER_DECISION_REQUIRED');
  assert.equal(result.session.currentDecisionRequest.reason, 'ATTACHMENT_EVENT_GAP_EXCEEDS_LIMIT');
  assert.deepEqual(result.session.confirmedComponentIds.map((id) => indexes.components.get(id)?.sourceComponentId), ['P1']);
  assert.equal(result.session.strokeLedger.filter((row) => row.op === 'DRAW_PIPE').length, 1, 'later pipe must not bypass broken OLET event');
}

console.log('sequential attachment event tests passed');
