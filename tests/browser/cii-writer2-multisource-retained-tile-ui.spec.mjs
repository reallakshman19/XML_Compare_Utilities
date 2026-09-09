import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { evaluatePartialTExpectedPostimage } from '../cii-workspace-multisource-partial-texpected-oracle.js';
import { parseIndependentNodeNameState } from '../cii-workspace-multisource-texpected-oracle.js';

const S1 = fileURLToPath(new URL('../../Benchmark/S1.CII', import.meta.url));
const S2 = fileURLToPath(new URL('../../Benchmark/S2.CII', import.meta.url));
const S3 = fileURLToPath(new URL('../../Benchmark/S3.CII', import.meta.url));
const TARGET = fileURLToPath(new URL('../../Benchmark/T.CII', import.meta.url));
const PARTIAL_EXPECTED = fileURLToPath(new URL('../../Benchmark/TEXPECTED-PARTIALLLYDONE.CII', import.meta.url));

test('Utilities Writer2 tile walks retained S1/S2/S3 through explicit review, bound scope and validated TARGET export', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  await page.evaluate(async () => {
    const { installCiiWorkspaceTile } = await import('/tabs/cii-workspace/cii-workspace-tab.js');
    const host = document.createElement('section');
    host.setAttribute('data-ciiw-retained-tile-host', '1');
    document.body.appendChild(host);
    installCiiWorkspaceTile(host);
  });

  await expect(page.locator('[data-ciiw-open-writer2]')).toHaveCount(1);
  await page.locator('[data-ciiw-open-writer2]').click();

  const sourceInput = page.locator('[data-ciiw-source]');
  const targetInput = page.locator('[data-ciiw-target]');
  await expect(sourceInput).toHaveCount(1);
  await expect(targetInput).toHaveCount(1);
  await expect(sourceInput).toHaveAttribute('multiple', '');

  await sourceInput.setInputFiles([S1, S2, S3]);
  await targetInput.setInputFiles(TARGET);

  await expect(page.locator('[data-ciiw-status]')).toContainText('Inspect exact retained S1/S2/S3 custody');
  await page.locator('[data-ciiw-inspect]').click();

  const ledger = page.locator('[data-ciiw-ms-anchor-ledger="1"]');
  await expect(ledger).toBeVisible({ timeout: 120_000 });
  await expect(ledger).toContainText('3 / 3 SOURCE members covered');
  await expect(ledger).toContainText('Anchor authority READY');

  for (const sourceId of ['S1', 'S2', 'S3']) {
    const member = page.locator(`[data-ciiw-ms-member="${sourceId}"]`);
    await expect(member).toBeVisible();
    await expect(member.locator('[data-ciiw-evidence-card][data-selected="true"]')).toHaveCount(1);
  }

  await expect(page.locator('[data-ciiw-analyze]')).toBeEnabled();
  await expect(page.locator('[data-ciiw-ms-transfer-waiting="1"]')).toContainText('READY FOR COMPARE');
  await expect(page.locator('[data-ciiw-status]')).toContainText('Auto Anchor seeded deterministic qualified bases for all sources');

  await expect(page.locator('[data-ciiw-ms-review-table="1"]')).toHaveCount(0);
  await expect(page.locator('[data-ciiw-ms-transfer="1"]')).toHaveCount(0);

  await page.locator('[data-ciiw-ms-compare-now]').click();

  const reviewTable = page.locator('[data-ciiw-ms-review-table="1"]');
  await expect(reviewTable).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('[data-ciiw-status]')).toContainText('Multi-source correspondence READY');

  const decisionControls = page.locator('[data-ciiw-ms-decision]');
  expect(await decisionControls.count()).toBeGreaterThan(0);
  const decisionValues = await decisionControls.evaluateAll((nodes) => nodes.map((node) => node.value));
  expect(decisionValues.every((value) => value === '')).toBe(true);

  await expect(page.locator('[data-ciiw-refresh-review]')).toBeEnabled();
  await expect(page.locator('[data-ciiw-ms-transfer="1"]')).toBeVisible();
  await expect(page.locator('[data-ciiw-ms-apply]')).toBeDisabled();

  await page.locator('[data-ciiw-accept-high]').click();
  await page.locator('[data-ciiw-accept-medium]').click();
  await expect(page.locator('[data-ciiw-status]')).toContainText('Apply approvals to Transfer Preview');

  await page.locator('[data-ciiw-refresh-review]').click();
  await expect(page.locator('[data-ciiw-status]')).toContainText('Multi-source review bound', { timeout: 120_000 });

  const bindScope = page.locator('[data-ciiw-ms-bind-expected]');
  await expect(bindScope).toBeEnabled();
  await bindScope.click();

  await expect(page.locator('[data-ciiw-status]')).toContainText('BM-correspondence-qualified scope bound: 1 physical APPLY');
  const applyWriter2 = page.locator('[data-ciiw-ms-apply]');
  await expect(applyWriter2).toBeEnabled();
  await expect(page.locator('[data-ciiw-ms-transfer="1"]')).toContainText('APPLY: 1');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    applyWriter2.click(),
  ]);
  await expect(page.locator('[data-ciiw-status]')).toContainText('Modified TARGET exported', { timeout: 120_000 });
  await expect(page.locator('[data-ciiw-status]')).toContainText('version bridge PASS');
  expect(download.suggestedFilename().toUpperCase()).toContain('.CII');

  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const [actualBytes, beforeText, partialExpectedText] = await Promise.all([
    readFile(downloadedPath),
    readFile(TARGET, 'latin1'),
    readFile(PARTIAL_EXPECTED, 'latin1'),
  ]);
  const actualText = actualBytes.toString('latin1');
  const retainedStructuralOperation = Object.freeze({
    action: 'CREATE',
    targetEvidence: Object.freeze({ identity: '10330' }),
  });
  const structural = evaluatePartialTExpectedPostimage(
    beforeText,
    actualText,
    partialExpectedText,
    [retainedStructuralOperation],
  );
  expect(structural.status).toBe('READY');
  expect(structural.encoding.differences).toHaveLength(0);
  expect(structural.semantics.differences).toHaveLength(0);
  expect(structural.preservation.status).toBe('READY');
  expect(structural.nodeNamePayloadPreservation.status).toBe('READY');

  const actualNodeNames = parseIndependentNodeNameState(actualText);
  expect(actualNodeNames.names.get('10330')).toBe('SL-115A.4');
});
