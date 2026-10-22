import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestDom } from './helpers/vnext-dom-env.mjs';

function fixture() {
  const row = (v) => v.map((x, i) => String(x).padStart(i ? 13 : 15)).join('');
  const element = (from, to, pointer) => Array.from({ length: 15 }, (_, i) => i === 0
    ? row([`${from}.0`, `${to}.0`, 120, 0, 0, 0])
    : i === 13 ? row([0, 0, 0, 0, 0, pointer]) : row([0, 0, 0, 0, 0, 0]));
  const lines = [
    '#$ VERSION', row([5, 14, 1252]),
    '#$ CONTROL', row([2, 0, 0, 1, 0, 0]),
    '#$ ELEMENTS', ...element(100, 110, 1),
    '#$ NODENAME',
    '  ' + 'OLD-A'.padEnd(26) + 'OLD-B'.padEnd(25)
  ];
  return new Uint8Array(Buffer.from(lines.join('\r\n') + '\r\n'));
}

test('F02: delayed Generate -> Config change -> proposals remain 0', async () => {
  const dom = createTestDom();
  const origDigest = globalThis.crypto.subtle.digest;
  let delayedResolve = null;
  let delayActive = false;

  globalThis.crypto.subtle.digest = async function (algo, bytes) {
    if (delayActive) {
      return new Promise((resolve) => { delayedResolve = () => resolve(origDigest.call(globalThis.crypto.subtle, algo, bytes)); });
    }
    return origDigest.call(globalThis.crypto.subtle, algo, bytes);
  };

  try {
    await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now()}`);

    const bytes = fixture();
    const mockFile = { name: 'TARGET0.CII', arrayBuffer: async () => bytes.buffer };
    dom.targetFile.files = [mockFile];
    await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

    const findInput = dom.root.querySelector('[data-field="find"]');
    findInput.value = 'OLD';
    await dom.root.dispatchEvent({ type: 'input', target: findInput });

    delayActive = true;
    const generatePromise = dom.btnRun.click();

    await dom.tabConfig.click();
    dom.selConflict.value = 'BLOCK_PLAN';
    await dom.root.dispatchEvent({ type: 'change', target: dom.selConflict });

    await dom.tabNormal.click();
    assert.equal(dom.tbodyProposals.children.length, 0, 'proposals must be 0 after config change');

    delayActive = false;
    if (delayedResolve) delayedResolve();
    await generatePromise;

    assert.equal(dom.tbodyProposals.children.length, 0, 'delayed Generate must NOT resurrect proposals after config change');
  } finally {
    globalThis.crypto.subtle.digest = origDigest;
  }
});

test('F02: late rejected digest does not emit stale error diagnostics after config change', async () => {
  const dom = createTestDom();
  const origDigest = globalThis.crypto.subtle.digest;
  let delayedReject = null;
  let delayActive = false;

  globalThis.crypto.subtle.digest = async function (algo, bytes) {
    if (delayActive) {
      return new Promise((_, reject) => { delayedReject = () => reject(new Error('LATE_DIGEST_FAILED')); });
    }
    return origDigest.call(globalThis.crypto.subtle, algo, bytes);
  };

  try {
    await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 1}`);

    const bytes = fixture();
    const mockFile = { name: 'TARGET0.CII', arrayBuffer: async () => bytes.buffer };
    dom.targetFile.files = [mockFile];
    await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

    const findInput = dom.root.querySelector('[data-field="find"]');
    findInput.value = 'OLD';
    await dom.root.dispatchEvent({ type: 'input', target: findInput });

    delayActive = true;
    const generatePromise = dom.btnRun.click();

    await dom.tabConfig.click();
    dom.selConflict.value = 'BLOCK_PLAN';
    await dom.root.dispatchEvent({ type: 'change', target: dom.selConflict });
    await dom.tabNormal.click();

    delayActive = false;
    if (delayedReject) delayedReject();
    await generatePromise;

    assert.equal(dom.ulDiagnostics.children.length, 0, 'stale rejection must not emit error diagnostics after config change');
  } finally {
    globalThis.crypto.subtle.digest = origDigest;
  }
});

test('F02: delayed target file load A followed by fast target B: target remains B', async () => {
  const dom = createTestDom();
  await import(`../tabs/cii-workspace/cii-fnr-vnext/ui/app.js?t=${Date.now() + 2}`);

  let resolveFileA;
  const fileA = {
    name: 'SLOW-A.CII',
    arrayBuffer: () => new Promise((resolve) => { resolveFileA = () => resolve(fixture().buffer); })
  };
  const fileB = {
    name: 'FAST-B.CII',
    arrayBuffer: async () => fixture().buffer
  };

  // Dispatch change A
  dom.targetFile.files = [fileA];
  const promiseA = dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  // Quickly dispatch change B
  dom.targetFile.files = [fileB];
  await dom.targetFile.dispatchEvent({ type: 'change', target: dom.targetFile });

  const targetMeta = dom.root.querySelector('[data-meta="target"]');
  assert(targetMeta.textContent.includes('FAST-B.CII'), 'target meta should show FAST-B');

  // Now resolve slow file A
  if (resolveFileA) resolveFileA();
  await promiseA;

  // Crucial: target must remain FAST-B, NOT be overwritten by SLOW-A!
  assert(targetMeta.textContent.includes('FAST-B.CII'), 'target meta must NOT be overwritten by late file A');
});
