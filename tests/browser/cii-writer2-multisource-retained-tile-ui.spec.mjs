import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const S1 = fileURLToPath(new URL('../../Benchmark/S1.CII', import.meta.url));
const S2 = fileURLToPath(new URL('../../Benchmark/S2.CII', import.meta.url));
const S3 = fileURLToPath(new URL('../../Benchmark/S3.CII', import.meta.url));
const TARGET = fileURLToPath(new URL('../../Benchmark/T.CII', import.meta.url));

test('Utilities Writer2 tile seeds retained S1/S2/S3 Auto Anchor and stops at explicit Compare review', async ({ page }) => {
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
});
