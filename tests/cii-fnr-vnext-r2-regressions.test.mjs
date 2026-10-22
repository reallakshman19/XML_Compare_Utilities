import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { parseCii } from '../tabs/cii-workspace/cii-fnr-vnext/ui/physical.js';
import { admitLineNodeClaims } from '../tabs/cii-workspace/cii-fnr-vnext/ui/line-node-admission.js';
import { validatePostimage } from '../tabs/cii-workspace/cii-fnr-vnext/ui/writer.js';
import { createTestDom } from './helpers/vnext-dom-env.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const row = (v) => v.map((x, i) => String(x).padStart(i ? 13 : 15)).join('');
const rowLabel = (label) => ' '.repeat(7) + String(label.length).padStart(5, ' ') + ' ' + label.padEnd(67, ' ');
const element = (from, to, pointer) => Array.from({ length: 15 }, (_, i) => i === 0
  ? row([`${from}.0`, `${to}.0`, 120, 0, 0, 0])
  : i === 10 ? rowLabel('LINE-A/B2')
  : i === 13 ? row([0, 0, 0, 0, 0, pointer]) : row([0, 0, 0, 0, 0, 0]));

function fixtureSingle(le = '\r\n') {
  const lines = [
    '#$ VERSION', row([5, 14, 1252]),
    '#$ CONTROL', row([2, 0, 0, 1, 0, 0]),
    '#$ ELEMENTS', ...element(100, 110, 1),
    '#$ NODENAME',
    '  ' + 'OLD-A'.padEnd(26) + 'OLD-B'.padEnd(25)
  ];
  return new Uint8Array(Buffer.from(lines.join(le) + le));
}

// ---------------------------------------------------------------------------
// F03: Admission default policy and blocking diagnostic enforcement
// ---------------------------------------------------------------------------
for (const le of ['\r\n', '\n']) {
  test(`F03: admission default policy and fatal diagnostic enforcement (${JSON.stringify(le)})`, async () => {
    const bytes = fixtureSingle(le);
    const h = hash(bytes);
    const parsed = parseCii(bytes);
    const f = parsed.fields[0];
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

    // 1. Positive control: valid claim, no diagnostics, policy omitted -> ACCEPT
    const planClean = {
      schema: 'CiiFnrVnext.Proposals.v1',
      targetSha256: h,
      claims: [claim],
      incompleteSearch: false,
      diagnostics: []
    };
    const admittedOmitted = await admitLineNodeClaims({ original: bytes, plan: planClean, approvedIds: ['c1'], originalHash: h });
    assert.equal(admittedOmitted.length, 1, 'Clean plan must be accepted when policy omitted');

    // 2. Positive control: valid claim, no diagnostics, explicit empty policy -> ACCEPT
    const admittedExplicit = await admitLineNodeClaims({ original: bytes, plan: planClean, approvedIds: ['c1'], originalHash: h, policy: {} });
    assert.equal(admittedExplicit.length, 1, 'Clean plan must be accepted with explicit default policy');

    // 3. Defect regression: unrelated blocking diagnostic FORMAT_INVALID, policy omitted -> MUST REJECT
    const planWithFatalDiag = {
      schema: 'CiiFnrVnext.Proposals.v1',
      targetSha256: h,
      claims: [claim],
      incompleteSearch: false,
      diagnostics: [{ severity: 'ERROR', code: 'FORMAT_INVALID', detail: 'Invalid structure header' }]
    };
    await assert.rejects(
      admitLineNodeClaims({ original: bytes, plan: planWithFatalDiag, approvedIds: ['c1'], originalHash: h }),
      /PLAN_HAS_BLOCKING_DIAGNOSTICS/,
      'Admit must enforce blocking diagnostics when policy is omitted'
    );

    // 4. Parity check: same fatal diagnostic with explicit policy -> MUST REJECT
    await assert.rejects(
      admitLineNodeClaims({ original: bytes, plan: planWithFatalDiag, approvedIds: ['c1'], originalHash: h, policy: {} }),
      /PLAN_HAS_BLOCKING_DIAGNOSTICS/,
      'Admit must enforce blocking diagnostics with explicit policy'
    );
  });
}

// ---------------------------------------------------------------------------
// F04: Stale Validate error does not overwrite newer successful Validate
// ---------------------------------------------------------------------------
test('F04: stale Validate error does not overwrite newer successful Validate', async () => {
  const dom = createTestDom();
  await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 10}`);

  const bytes = fixtureSingle('\r\n');
  const mockFile = { name: 'TARGET0.CII', arrayBuffer: async () => bytes.buffer };
  dom.targetFile.files = [mockFile];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  const findInput = dom.root.querySelector('[data-field="find"]');
  findInput.value = 'OLD';
  await dom.root.dispatchEvent({ type: 'input', target: findInput });

  await dom.btnRun.click();
  assert(dom.tbodyProposals.children.length > 0, 'proposals must be generated');

  // Approve claim
  const selDecision = dom.tbodyProposals.querySelector('select');
  selDecision.value = 'APPROVED';
  await dom.root.dispatchEvent({ type: 'change', target: selDecision });

  // Hook digest to hold Validate A while Validate B runs and completes
  const origDigest = globalThis.crypto.subtle.digest;
  let holdValidateA = true;
  let rejectValidateA;
  let validateACalled = false;

  globalThis.crypto.subtle.digest = async function (algo, data) {
    if (holdValidateA && !validateACalled) {
      validateACalled = true;
      return new Promise((_, reject) => {
        rejectValidateA = () => reject(new Error('LATE_VALIDATE_FAILED'));
      });
    }
    return origDigest.call(globalThis.crypto.subtle, algo, data);
  };

  try {
    // 1. Start Validate A (held in flight)
    const validateAPromise = dom.btnValidate.click();

    // 2. Release hold for subsequent calls and trigger Validate B
    holdValidateA = false;
    await dom.btnValidate.click();

    // Validate B should have succeeded
    assert.equal(dom.btnApply.disabled, false, 'Validate B must succeed and enable Apply');
    assert.equal(dom.ulDiagnostics.children.length, 0, 'Validate B must have 0 diagnostics');

    // 3. Now fail Validate A
    rejectValidateA();
    await validateAPromise;

    // Validate B's success must remain completely intact!
    assert.equal(dom.btnApply.disabled, false, 'Late failure of Validate A must NOT clear Apply enablement');
    assert.equal(dom.ulDiagnostics.children.length, 0, 'Late failure of Validate A must NOT emit stale diagnostic');
  } finally {
    globalThis.crypto.subtle.digest = origDigest;
  }
});

// ---------------------------------------------------------------------------
// F05: Delayed CSV import bound to initiating tab and invalidated by tab switch or rule edit
// ---------------------------------------------------------------------------
test('F05: delayed CSV import does NOT mutate LINE_NODE tab after tab switch', async () => {
  const dom = createTestDom();
  await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 20}`);

  const tabLineNode = dom.root.querySelector('[data-tab="LINE_NODE"]');
  assert(tabLineNode, 'LINE_NODE tab button must exist');

  let resolveCsv;
  const delayedCsvFile = {
    name: 'rules.csv',
    text: () => new Promise((resolve) => { resolveCsv = () => resolve('find,replace\nOLD,NEW\n'); })
  };

  // Start CSV import while NORMAL is active
  dom.csvFile.files = [delayedCsvFile];
  const importPromise = dom.csvFile.dispatchEvent({ type: 'change', target: dom.csvFile });

  // Switch to LINE_NODE while CSV text read is pending
  await tabLineNode.click();

  // Release CSV
  resolveCsv();
  await importPromise;

  // Verify LINE_NODE rules were NOT mutated by CSV
  const tbodyRules = dom.root.querySelector('[data-rules]');
  const lineNodeInputs = tbodyRules.querySelectorAll('[data-field="find"]');
  assert(lineNodeInputs.length > 0, 'LINE_NODE rule inputs must exist in rules table');
  for (const input of lineNodeInputs) {
    assert.equal(input.value, '', 'LINE_NODE rule inputs must remain blank after delayed Normal CSV');
  }
});

test('F05: delayed CSV import does NOT overwrite intervening rule edit', async () => {
  const dom = createTestDom();
  await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 30}`);

  let resolveCsv;
  const delayedCsvFile = {
    name: 'rules.csv',
    text: () => new Promise((resolve) => { resolveCsv = () => resolve('find,replace\nCSV_FIND,CSV_REPLACE\n'); })
  };

  // Start CSV import while NORMAL is active
  dom.csvFile.files = [delayedCsvFile];
  const importPromise = dom.csvFile.dispatchEvent({ type: 'change', target: dom.csvFile });

  // Perform intervening edit on rule 0
  const findInput = dom.root.querySelector('[data-field="find"]');
  findInput.value = 'USER_EDIT';
  await dom.root.dispatchEvent({ type: 'input', target: findInput });

  // Release CSV
  resolveCsv();
  await importPromise;

  // User edit must be preserved; delayed CSV must be dropped
  const tbodyRules = dom.root.querySelector('[data-rules]');
  const findInputs = tbodyRules.querySelectorAll('[data-field="find"]');
  assert.equal(findInputs[0].value, 'USER_EDIT', 'Intervening user edit must NOT be overwritten by delayed CSV');
});

// ---------------------------------------------------------------------------
// F06: Pending TARGET and SOURCE file selection revokes export authorization immediately
// ---------------------------------------------------------------------------
test('F06: pending TARGET file selection immediately revokes export authorization', async () => {
  const dom = createTestDom();
  await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 40}`);

  const bytesA = fixtureSingle('\r\n');
  const fileA = { name: 'TARGET_A.CII', arrayBuffer: async () => bytesA.buffer };
  dom.targetFile.files = [fileA];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  const findInput = dom.root.querySelector('[data-field="find"]');
  findInput.value = 'OLD';
  await dom.root.dispatchEvent({ type: 'input', target: findInput });

  await dom.btnRun.click();
  const selDecision = dom.tbodyProposals.querySelector('select');
  selDecision.value = 'APPROVED';
  await dom.root.dispatchEvent({ type: 'change', target: selDecision });

  await dom.btnValidate.click();
  assert.equal(dom.btnApply.disabled, false, 'Apply must be enabled');
  await dom.btnApply.click();
  assert.equal(dom.btnExport.disabled, false, 'Export TARGET A must be authorized');

  // Start loading TARGET B with a deliberately delayed read
  let resolveFileB;
  const fileB = {
    name: 'TARGET_B.CII',
    arrayBuffer: () => new Promise((resolve) => { resolveFileB = () => resolve(bytesA.buffer); })
  };

  dom.targetFile.files = [fileB];
  const loadPromiseB = dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  // CRITICAL: During the pending delay, Export must NOT remain authorized!
  assert.equal(dom.btnExport.disabled, true, 'Export must be revoked immediately when TARGET B selection begins');
  assert.equal(dom.btnApply.disabled, true, 'Apply must be disabled immediately');
  assert.equal(dom.btnValidate.disabled, true, 'Validate must be disabled immediately');

  // Resolve file B
  resolveFileB();
  await loadPromiseB;

  // Even after B finishes, old plan/validation/export is not authorized until new run
  assert.equal(dom.btnExport.disabled, true, 'Export remains unauthorized until new run');
});

test('F06: failed TARGET selection fails closed without reviving stale export', async () => {
  const dom = createTestDom();
  await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 50}`);

  const bytesA = fixtureSingle('\r\n');
  const fileA = { name: 'TARGET_A.CII', arrayBuffer: async () => bytesA.buffer };
  dom.targetFile.files = [fileA];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  const findInput = dom.root.querySelector('[data-field="find"]');
  findInput.value = 'OLD';
  await dom.root.dispatchEvent({ type: 'input', target: findInput });

  await dom.btnRun.click();
  const selDecision = dom.tbodyProposals.querySelector('select');
  selDecision.value = 'APPROVED';
  await dom.root.dispatchEvent({ type: 'change', target: selDecision });

  await dom.btnValidate.click();
  await dom.btnApply.click();
  assert.equal(dom.btnExport.disabled, false, 'Export must be authorized');

  // Start loading TARGET B which fails
  const fileBFail = {
    name: 'BROKEN.CII',
    arrayBuffer: async () => { throw new Error('DISK_READ_FAILURE'); }
  };

  dom.targetFile.files = [fileBFail];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  // Export must remain disabled; stale authorization must NOT revive
  assert.equal(dom.btnExport.disabled, true, 'Export must stay disabled after failed load');
});

test('F06: pending SOURCE file selection immediately revokes export authorization', async () => {
  const dom = createTestDom();
  await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 60}`);

  const bytesA = fixtureSingle('\r\n');
  const fileA = { name: 'TARGET_A.CII', arrayBuffer: async () => bytesA.buffer };
  dom.targetFile.files = [fileA];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  const findInput = dom.root.querySelector('[data-field="find"]');
  findInput.value = 'OLD';
  await dom.root.dispatchEvent({ type: 'input', target: findInput });

  await dom.btnRun.click();
  const selDecision = dom.tbodyProposals.querySelector('select');
  selDecision.value = 'APPROVED';
  await dom.root.dispatchEvent({ type: 'change', target: selDecision });

  await dom.btnValidate.click();
  await dom.btnApply.click();
  assert.equal(dom.btnExport.disabled, false, 'Export must be authorized');

  // Start loading SOURCE B with delayed read
  let resolveSourceB;
  const sourceB = {
    name: 'SOURCE_B.CII',
    arrayBuffer: () => new Promise((resolve) => { resolveSourceB = () => resolve(bytesA.buffer); })
  };

  const sourceFileInput = dom.root.querySelector('[data-file="source"]');
  sourceFileInput.files = [sourceB];
  const loadPromise = sourceFileInput.dispatchEvent({ type: 'change', target: sourceFileInput });

  // SOURCE selection must also revoke export immediately
  assert.equal(dom.btnExport.disabled, true, 'Export must be revoked immediately when SOURCE selection begins');

  resolveSourceB();
  await loadPromise;
  assert.equal(dom.btnExport.disabled, true, 'Export remains unauthorized until revalidated');
});
