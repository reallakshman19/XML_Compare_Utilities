import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const S1 = fileURLToPath(new URL('../../Benchmark/S1.CII', import.meta.url));
const S2 = fileURLToPath(new URL('../../Benchmark/S2.CII', import.meta.url));
const S3 = fileURLToPath(new URL('../../Benchmark/S3.CII', import.meta.url));
const TARGET = fileURLToPath(new URL('../../Benchmark/T.CII', import.meta.url));

test('Slice 6 retained review state is explicit at a semantics-reaching validation budget', async ({ page }) => {
  await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
  await expect(page.locator('[data-cii-writer2-bridge-fixture="1"]')).toBeVisible();

  await page.evaluate(async () => {
    const { installCiiWorkspaceTile } = await import('/tabs/cii-workspace/cii-workspace-tab.js');
    const host = document.createElement('section');
    host.setAttribute('data-ciiw-retained-tile-host', '1');
    document.body.appendChild(host);
    installCiiWorkspaceTile(host);
  });

  await page.locator('[data-ciiw-open-writer2]').click();

  const searchLimit = page.locator('[data-ciiw-method-a-search-limit]');
  await expect(searchLimit).toHaveCount(1);
  await searchLimit.fill('11');
  await searchLimit.dispatchEvent('change');
  expect(await searchLimit.inputValue()).toBe('11');

  const sourceInput = page.locator('[data-ciiw-source]');
  const targetInput = page.locator('[data-ciiw-target]');
  await sourceInput.setInputFiles([S1, S2, S3]);
  await targetInput.setInputFiles(TARGET);

  await expect(page.locator('[data-ciiw-status]')).toContainText('Inspect exact retained S1/S2/S3 custody');
  await page.locator('[data-ciiw-inspect]').click();

  const ledger = page.locator('[data-ciiw-ms-anchor-ledger="1"]');
  await expect(ledger).toBeVisible({ timeout: 120_000 });
  await expect(ledger).toContainText('3 / 3 SOURCE members covered');
  await expect(ledger).toContainText('Anchor authority READY');

  await expect(page.locator('[data-ciiw-analyze]')).toBeEnabled();
  await expect(page.locator('[data-ciiw-ms-transfer-waiting="1"]')).toContainText('READY FOR COMPARE');
  await page.locator('[data-ciiw-ms-compare-now]').click();

  const reviewTable = page.locator('[data-ciiw-ms-review-table="1"]');
  await expect(reviewTable).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('[data-ciiw-status]')).toContainText('Multi-source correspondence READY');

  const decisionControls = page.locator('[data-ciiw-ms-decision]');
  expect(await decisionControls.count()).toBeGreaterThan(0);
  const decisionValues = await decisionControls.evaluateAll((nodes) => nodes.map((node) => node.value));
  expect(decisionValues.every((value) => value === '')).toBe(true);

  const applyReview = page.locator('[data-ciiw-refresh-review]');
  const acceptHigh = page.locator('[data-ciiw-accept-high]');
  const acceptMedium = page.locator('[data-ciiw-accept-medium]');

  await expect(applyReview).toBeDisabled();
  await expect(applyReview).toHaveText('Review synchronized with Transfer Preview');
  await expect(page.locator('[data-ciiw-ms-review-state="SYNCHRONIZED"]')).toBeVisible();

  const highEligible = Number(await acceptHigh.getAttribute('data-ciiw-eligible-count'));
  const mediumEligible = Number(await acceptMedium.getAttribute('data-ciiw-eligible-count'));
  expect(Number.isFinite(highEligible)).toBe(true);
  expect(Number.isFinite(mediumEligible)).toBe(true);
  expect(highEligible + mediumEligible).toBeGreaterThan(0);

  await expect(acceptHigh).toHaveText(`Accept eligible HIGH (${highEligible})`);
  await expect(acceptMedium).toHaveText(`Accept eligible MEDIUM (${mediumEligible})`);
  if (highEligible === 0) await expect(acceptHigh).toBeDisabled(); else await expect(acceptHigh).toBeEnabled();
  if (mediumEligible === 0) await expect(acceptMedium).toBeDisabled(); else await expect(acceptMedium).toBeEnabled();

  if (highEligible > 0) {
    await acceptHigh.click();
    await expect(acceptHigh).toBeDisabled();
    await expect(acceptHigh).toHaveText('Accept eligible HIGH (0)');
  }
  if (mediumEligible > 0) {
    await acceptMedium.click();
    await expect(acceptMedium).toBeDisabled();
    await expect(acceptMedium).toHaveText('Accept eligible MEDIUM (0)');
  }

  await expect(page.locator('[data-ciiw-ms-review-state="PENDING"]')).toBeVisible();
  await expect(page.locator('[data-ciiw-status]')).toContainText('Apply approvals to Transfer Preview');
  await expect(applyReview).toBeEnabled();
  await expect(applyReview).toContainText('pending decision');

  const pendingCount = Number(await applyReview.getAttribute('data-ciiw-pending-decision-count'));
  expect(pendingCount).toBe(highEligible + mediumEligible);

  console.log('SLICE6_REVIEW_STATE_COUNTS ' + JSON.stringify({
    searchBudget: 11,
    highEligible,
    mediumEligible,
    pendingCount,
  }));

  await applyReview.click();
  await expect(page.locator('[data-ciiw-status]')).toContainText('Multi-source review bound', { timeout: 120_000 });
  await expect(applyReview).toBeDisabled();
  await expect(applyReview).toHaveText('Review synchronized with Transfer Preview');
  await expect(page.locator('[data-ciiw-ms-review-state="SYNCHRONIZED"]')).toBeVisible();
});
