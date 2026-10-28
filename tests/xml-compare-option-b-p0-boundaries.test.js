import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createXmlCompareCanvasState, applyXmlCompareCanvasAction } from '../xml-compare/XmlCompareCanvasStateController.js';
import { ISO_NOTE_COMPOSITE_ID_POLICY } from '../xml-compare/XmlCompareIsoNoteIdentityAdapter.js';
import { createIsoNoteAuditIdentityLinks } from '../xml-compare/XmlCompareIsoNoteAuditIdentityLinks.js';

const source = [{ uid: 'S1', lineKey: 'PS_MAPPING_S1', pipe: 'PIPE-A', psNo: 'PS-001.1' }];
const target = [
  { uid: 'T1', lineKey: 'ISO_NOTES_S2', lineNoInCii: '/PIPE-A', nodeName: '/PS-001.1' },
  { uid: 'T2', lineKey: 'ISO_NOTES_S2', lineNoInCii: '/PIPE-B', nodeName: '/PS-001.1' },
];
const context = Object.freeze({
  scoped: true, sourceRecords: source, targetRecords: target, policy: ISO_NOTE_COMPOSITE_ID_POLICY,
});
const approved = { sourceUid: 'S1', targetUid: 'T1', score: 0.91, status: 'valid' };
const wrong = { sourceUid: 'S1', targetUid: 'T2', score: 0.99, status: 'valid' };
const pristine = createXmlCompareCanvasState();
const blocked = (action, state = pristine, opts = { approvalContext: context }) => {
  const next = applyXmlCompareCanvasAction(state, action, opts);
  assert.equal(next.approvedMatchSet?.approvedMatches?.length || 0, 0);
  assert.equal(next.matchDecisions.length, 0);
  assert.equal(next.logs.at(-1)?.code, 'XML-COMPARE-APPROVAL-BLOCKED');
  return next;
};
for (const type of ['accept-candidate', 'bulk-approve-candidate-pairs', 'approve-pending-connector']) {
  const action = type === 'accept-candidate' ? { type, candidate: wrong }
    : type === 'bulk-approve-candidate-pairs' ? { type, candidates: [approved, wrong] }
      : { type };
  const state = type === 'approve-pending-connector'
    ? createXmlCompareCanvasState({ pendingConnectorPreview: wrong }) : pristine;
  blocked(action, state);
}
blocked({ type: 'accept-candidate', candidate: approved }, pristine, {});
const wrongScope = blocked({ type: 'accept-candidate', candidate: approved }, pristine, {
  approvalContext: { scoped: false, sourceRecords: source, targetRecords: target },
});
assert.equal(wrongScope.logs.at(-1).message, 'DOMAIN_APPROVAL_POLICY_REQUIRED');
const missingRecords = blocked({ type: 'accept-candidate', candidate: approved }, pristine, {
  approvalContext: { scoped: false },
});
assert.equal(missingRecords.logs.at(-1).message, 'MISSING_APPROVAL_RECORD_SCOPE');
blocked({ type: 'accept-candidate', candidate: { sourceUid: 'S1', targetUid: 'missing' } });
const accepted = applyXmlCompareCanvasAction(pristine,
  { type: 'accept-candidate', candidate: approved }, { approvalContext: context });
assert.equal(accepted.approvedMatchSet.summary.approvedCount, 1);
const generic = applyXmlCompareCanvasAction(pristine,
  { type: 'accept-candidate', candidate: { sourceUid: 'G-S', targetUid: 'G-T', status: 'valid' } },
  { approvalContext: { scoped: false, sourceRecords: [{ uid: 'G-S' }], targetRecords: [{ uid: 'G-T' }] } });
assert.equal(generic.approvedMatchSet.summary.approvedCount, 1, 'explicit generic scope remains supported');

// An exact ISO correspondence is audit evidence, never a transfer approval.
const report = {
  ok: true, rows: [{
    status: 'MATCH', sourceUid: 'S1', targetUid: 'T1', pipe: 'PIPE-A',
    psNo: 'PS-001.1', s1Ref: 'S1:4', s2Ref: 'S2:9',
  }],
};
const elements = [
  { ...source[0], levelId: 'element' },
  { ...target[0], levelId: 'element' },
  { ...target[1], levelId: 'element' },
];
const links = createIsoNoteAuditIdentityLinks({
  report, sourceRecords: elements, targetRecords: elements,
});
assert.equal(links.linkedCount, 1);
assert.equal(links.links[0].sourceUid, 'S1');
assert.equal(links.links[0].s2Ref, 'S2:9');
assert.equal(links.links[0].disposition, 'IDENTITY_VERIFIED_NOT_TRANSFER_APPROVED');
assert.equal(pristine.approvedMatchSet, null);
const runtime = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
const auditBody = runtime.slice(runtime.indexOf('function linkExactIsoNotePairs('),
  runtime.indexOf('function requestAutoMap(', runtime.indexOf('function linkExactIsoNotePairs(')));
assert.match(auditBody, /state\.isoNoteAuditLinks = links/);
assert.doesNotMatch(auditBody, /state\.canvasState\s*=|state\.aim\s*=|approvedMatchSet|bulk-approve-candidate-pairs/);

assert.match(runtime, /state\.status = \{ kind: 'warn', message: 'Approval blocked: '/,
  'reducer-level denial must be shown as warning, not candidate approval');
console.log('Option B P0 approval and audit isolation tests passed');
