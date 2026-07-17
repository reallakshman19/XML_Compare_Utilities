import { expect, test } from '@playwright/test';

test('TTV-C01 — modeless checker reconciles issues, filters, persists layout, and highlights canvas evidence', async ({ page }) => {
  await page.goto('/tests/browser/topology-trace-validator-fixture.html');
  await page.waitForFunction(() => document.body.dataset.topologyValidatorReady === '1');
  const launcher = page.locator('[data-ttv-checker-open]');
  await expect(launcher).toBeVisible();
  await expect(launcher.locator('img')).toHaveJSProperty('naturalWidth', 24);
  await launcher.click();

  const panel = page.locator('[data-ttv-checker-panel]');
  await expect(panel).toBeVisible();
  await expect(page.locator('[data-ttv-checker-kpis] button')).toHaveCount(7);
  const evidence = await page.evaluate(() => window.__topologyValidatorHarness.controller.checker.evidence());
  expect(evidence.report.schema).toBe('TopologyCheckReport.v1');
  expect(evidence.report.summary.findingCount).toBe(evidence.report.issues.length);
  expect(Object.values(evidence.report.summary.countsByCategory).reduce((sum, count) => sum + count, 0)).toBe(evidence.report.issues.length);

  const visibleRows = page.locator('[data-ttv-checker-issue]');
  await expect(visibleRows.first()).toBeVisible();
  expect(await visibleRows.count()).toBeLessThanOrEqual(32);
  await visibleRows.first().click();
  await expect(page.locator('[data-ttv-checker-detail] code').first()).toBeVisible();
  expect(await page.locator('.ttv-checker-highlight').count()).toBeGreaterThan(0);
  await expect(page.locator('.ttv-checker-canvas-badge').first()).toBeVisible();
  await expect(page.locator('[data-ttv-checker-live]')).not.toHaveText('');

  const code = await page.locator('[data-ttv-checker-filter="code"] option').nth(1).getAttribute('value');
  await page.locator('[data-ttv-checker-filter="code"]').selectOption(code);
  const filtered = await page.evaluate(() => window.__topologyValidatorHarness.controller.checker.evidence().filteredCount);
  expect(filtered).toBeGreaterThan(0);
  const filteredVisible = await page.locator('[data-ttv-checker-issue]').count();
  expect(filteredVisible).toBeGreaterThan(0);
  expect(filteredVisible).toBeLessThanOrEqual(Math.min(filtered, 32));

  await page.locator('[data-ttv-checker-layout="right"]').click();
  await expect(panel).toHaveAttribute('data-layout', 'right');
  await page.locator('[data-ttv-checker-collapse]').click();
  await expect(panel).toHaveClass(/is-collapsed/);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.topologyValidatorReady === '1');
  await page.locator('[data-ttv-checker-open]').click();
  await expect(page.locator('[data-ttv-checker-panel]')).toHaveAttribute('data-layout', 'right');
  await expect(page.locator('[data-ttv-checker-panel]')).toHaveClass(/is-collapsed/);
  await page.locator('[data-ttv-checker-layout="reset"]').click();
});
