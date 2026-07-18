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

test('TTV-C02 — settings policy and dedicated Auto fix produce audited outcomes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tests/browser/topology-checker-autofix-fixture.html');
  await page.waitForFunction(() => document.body.dataset.topologyValidatorReady === '1');
  await page.locator('[data-ttv-checker-open]').click();

  const autoButton = page.locator('[data-ttv-checker-auto-fix]');
  await expect(autoButton).toBeVisible();
  const before = await page.evaluate(() => window.__topologyValidatorHarness.controller.checker.evidence());
  expect(before.policy.schema).toBe('TopologyCheckerPolicy.v1');
  expect(before.policyHash).toMatch(/^fnv1a32:/);
  expect(before.autoEligibleCount).toBeGreaterThan(0);
  await expect(page.locator('[data-ttv-checker-auto-count]')).toHaveText(String(before.autoEligibleCount));

  await page.locator('[data-ttv-checker-settings]').click();
  const settings = page.locator('[data-ttv-checker-settings-panel]');
  await expect(settings).toBeVisible();
  await expect(settings.locator('[data-ttv-policy-rule]')).not.toHaveCount(0);
  await expect(settings.locator('[data-ttv-policy-threshold="shortElementMm"]')).toHaveValue('6');
  await settings.locator('[data-ttv-policy-save]').click();
  await expect(settings).toBeHidden();

  await expect(autoButton).toBeEnabled();
  const traceToolbar = page.locator('[data-ttv-workspace-panel="trace"] .ttv-toolbar');
  await expect(traceToolbar.locator('[data-ttv-edit-export]')).toHaveCount(1);
  await expect(traceToolbar.locator('[data-ttv-edit-export-staged]')).toHaveCount(1);
  await expect(page.locator('[data-ttv-workspace-panel="edit"] [data-ttv-edit-export]')).toHaveCount(0);
  const legacyLoaders = traceToolbar.locator('details.ttv-manual-overrides');
  await expect(legacyLoaders).not.toHaveAttribute('open', '');
  await expect(legacyLoaders.locator('summary')).toHaveText('>');
  await expect(legacyLoaders.locator('[data-ttv-file="canonical"]')).toHaveCount(1);
  await expect(legacyLoaders.locator('[data-ttv-file="ledger"]')).toHaveCount(1);
  await expect(legacyLoaders.locator('[data-ttv-file="inputXml"]')).toHaveCount(1);
  await autoButton.click();
  await page.waitForFunction(() => window.__topologyValidatorHarness.controller.checker.evidence().autoFixRuns.length > 0, null, { timeout: 30_000 });
  const after = await page.evaluate(() => window.__topologyValidatorHarness.controller.checker.evidence());
  const run = after.autoFixRuns.at(-1);
  expect(run.schema).toBe('TopologyAutoFixRun.v1');
  expect(run.applied.length + run.related.length + run.rejected.length).toBeGreaterThan(0);
  expect(after.resolvedIssues.length).toBe(run.applied.length + run.related.length);
  const toast = page.locator('[data-ttv-autofix-toast]');
  await expect(toast).toBeVisible();
  await expect(toast.locator('[data-ttv-autofix-toast-title]')).toHaveText(`Auto fixed ${run.applied.length + run.related.length}`);
  await expect(toast.locator('[data-ttv-autofix-toast-detail]')).toContainText('ID-wise change(s) recorded in Edit Draft');
  await expect(toast.locator('[data-ttv-autofix-toast-export="bundle"]')).toBeEnabled();
  await expect(toast.locator('[data-ttv-autofix-toast-export="staged"]')).toBeEnabled();

  await page.locator('[data-ttv-workspace-tab="edit"]').click();
  const ledgerRows = page.locator('[data-ttv-edit-updates] [data-ledger-row]');
  await expect(ledgerRows).toHaveCount(run.operationCount);
  const ledgerId = await ledgerRows.first().locator('[data-key="id"]').textContent();
  expect(ledgerId).toMatch(/^EC-\d+\.\d+$/);
  await expect(ledgerRows.first().locator('[data-key="kind"]')).toHaveText('MOVE_NODE');
  await expect(ledgerRows.first().locator('[data-key="target"]')).toHaveText(/^CN-/);
  expect(errors).toEqual([]);
});
