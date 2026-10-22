import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { admitLineNodeClaims } from '../tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js';
import { validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const row = (values) => values.map((x, i) => String(x).padStart(i ? 13 : 15)).join('');
const rowLabel = (label) => ' '.repeat(7) + String(label.length).padStart(5, ' ') + ' ' + label.padEnd(67, ' ');
const element = (from, to, pointer) => Array.from({ length: 15 }, (_, i) => i === 0
  ? row([`${from}.0`, `${to}.0`, 120, 0, 0, 0])
  : i === 10 ? rowLabel('LINE-A/B2')
  : i === 13 ? row([0, 0, 0, 0, 0, pointer]) : row([0, 0, 0, 0, 0, 0]));

function fixtureSharedPointer(le = '\r\n') {
  const lines = [
    '#$ VERSION', row([5, 14, 1252]),
    '#$ CONTROL', row([2, 0, 0, 1, 0, 0]),
    '#$ ELEMENTS', ...element(100, 110, 1), ...element(100, 110, 1),
    '#$ NODENAME',
    '  ' + 'OLD-A'.padEnd(26) + 'OLD-B'.padEnd(25)
  ];
  return new Uint8Array(Buffer.from(lines.join(le) + le));
}

function fixtureSinglePointer(le = '\r\n') {
  const lines = [
    '#$ VERSION', row([5, 14, 1252]),
    '#$ CONTROL', row([2, 0, 0, 1, 0, 0]),
    '#$ ELEMENTS', ...element(100, 110, 1),
    '#$ NODENAME',
    '  ' + 'OLD-A'.padEnd(26) + 'OLD-B'.padEnd(25)
  ];
  return new Uint8Array(Buffer.from(lines.join(le) + le));
}

for (const le of ['\r\n', '\n']) {
  test(`P2-A malformed evidence / ruleId: admission and writer parity (${JSON.stringify(le)})`, async () => {
    const bytes = fixtureSinglePointer(le);
    const h = hash(bytes);
    const parsed = parseCii(bytes);
    const f = parsed.fields[0];
    const claimBase = {
      id: 'c1',
      ruleId: 'r1',
      section: 'NODENAME',
      fieldIdentity: 'NODENAME_FROM',
      byteStart: f.byteStart,
      byteEnd: f.byteEnd,
      before: f.before,
      after: 'NEW-A'.padEnd(f.before.length, ' '),
      targetElementWitness: '100->110@0',
      status: 'PROPOSED'
    };

    // Missing evidence
    const planNoEv = { schema: 'CiiFnrVnext.Proposals.v1', targetSha256: h, claims: [claimBase], incompleteSearch: false, diagnostics: [] };
    await assert.rejects(admitLineNodeClaims({ original: bytes, plan: planNoEv, approvedIds: ['c1'], originalHash: h }), /CLAIM_SCHEMA_INVALID/);
    await assert.rejects(validatePostimage({ original: bytes, originalHash: h, plan: planNoEv, approvedIds: ['c1'], tab: 'LINE_NODE' }), /CLAIM_SCHEMA_INVALID/);

    // Array evidence
    const planArrEv = { schema: 'CiiFnrVnext.Proposals.v1', targetSha256: h, claims: [{ ...claimBase, evidence: [] }], incompleteSearch: false, diagnostics: [] };
    await assert.rejects(admitLineNodeClaims({ original: bytes, plan: planArrEv, approvedIds: ['c1'], originalHash: h }), /CLAIM_SCHEMA_INVALID/);
    await assert.rejects(validatePostimage({ original: bytes, originalHash: h, plan: planArrEv, approvedIds: ['c1'], tab: 'LINE_NODE' }), /CLAIM_SCHEMA_INVALID/);

    // Missing ruleId
    const { ruleId: _, ...claimNoRule } = claimBase;
    const planNoRule = { schema: 'CiiFnrVnext.Proposals.v1', targetSha256: h, claims: [{ ...claimNoRule, evidence: {} }], incompleteSearch: false, diagnostics: [] };
    await assert.rejects(admitLineNodeClaims({ original: bytes, plan: planNoRule, approvedIds: ['c1'], originalHash: h }), /CLAIM_SCHEMA_INVALID/);
    await assert.rejects(validatePostimage({ original: bytes, originalHash: h, plan: planNoRule, approvedIds: ['c1'], tab: 'LINE_NODE' }), /CLAIM_SCHEMA_INVALID/);
  });

  test(`P2-B shared physical pointer: admission and writer parity (${JSON.stringify(le)})`, async () => {
    const bytes = fixtureSharedPointer(le);
    const h = hash(bytes);
    const parsed = parseCii(bytes);
    const f = parsed.fields[0];
    assert.equal(f.shared, true, 'fixture field must have shared: true');
    const claim = {
      id: 'c1',
      ruleId: 'r1',
      section: 'NODENAME',
      fieldIdentity: 'NODENAME_FROM',
      byteStart: f.byteStart,
      byteEnd: f.byteEnd,
      before: f.before,
      after: 'NEW-A'.padEnd(f.before.length, ' '),
      targetElementWitness: '100->110@0',
      status: 'PROPOSED',
      evidence: {}
    };
    const plan = { schema: 'CiiFnrVnext.Proposals.v1', targetSha256: h, claims: [claim], incompleteSearch: false, diagnostics: [] };

    // Both admission and writer must reject the shared pointer claim!
    await assert.rejects(admitLineNodeClaims({ original: bytes, plan, approvedIds: ['c1'], originalHash: h }), /NODENAME_SHARED_POINTER_FORBIDDEN/);
    await assert.rejects(validatePostimage({ original: bytes, originalHash: h, plan, approvedIds: ['c1'], tab: 'LINE_NODE' }), /NODENAME_SHARED_POINTER_FORBIDDEN|FIELD_OWNERSHIP_OR_PREIMAGE_INVALID/);
  });
}
