import { test, expect } from '@playwright/test';

test('PSNM shipped mock: Sources → Masters → Auto Anchor → Use Pair → Match → Candidates → Coverage', async ({ page }) => {
  await page.goto('/tests/fixtures/psnm-workflow-smoke.html');
  const launch = page.locator('[data-psnm-action="open"]').first();
  await expect(launch).toBeVisible({ timeout: 20000 });
  await launch.click();
  const modal = page.locator('[data-psnm="modal"]');
  await expect(modal).toBeVisible();
  const input1 = modal.locator('[data-source="table1Text"]');
  const input2 = modal.locator('[data-source="table2Text"]');
  await expect(input1).toHaveValue(/PS-12231\/DATUM/);
  await expect(input2).toHaveValue(/22140/);

  await modal.locator('[data-psnm-action="resolveMasters"]:visible').first().click();
  await expect(modal.locator('[data-psnm-panel="master"]')).toHaveClass(/active/);
  await expect(modal.locator('[data-psnm-panel="master"]')).toContainText('PS-12231/DATUM');

  await modal.locator('[data-psnm-tab="setup"]').first().click();
  await expect(modal.locator('[data-psnm-panel="setup"]')).toHaveClass(/active/);
  // Entering Setup must NOT substitute the independent 13-row benchmark.
  await expect(input1).toHaveValue(/PS-12231\/DATUM/);
  await expect(input2).toHaveValue(/22140/);
  await expect(modal.locator('[data-psnm-axis-auto-anchor]')).toHaveCount(0);
  await modal.locator('[data-psnm-action="runAutoAnchor"]:visible').click();
  await expect(modal.locator('.psnm-auto-table tbody tr')).toHaveCount(4);
  await modal.locator('[data-psnm-action="useAutoAnchor"][data-auto-anchor-index="0"]').click();
  await expect(modal.locator('.psnm-auto-table .psnm-selected')).toHaveCount(1);

  await modal.locator('[data-psnm-action="runMatch"]:visible').click();
  await expect(modal.locator('.psnm-status-title')).toContainText('Run Finished');
  await expect(modal.locator('.psnm-status-detail')).toContainText('1/2 PS rows');
  await expect(modal.locator('.psnm-status-detail')).toContainText('100% means processing finished');

  await modal.locator('[data-psnm-tab="candidate"]').first().click();
  await expect(modal.locator('[data-psnm-panel="candidate"]')).toHaveClass(/active/);
  await expect(modal.locator('[data-psnm-panel="candidate"] tbody tr').first()).toContainText('PS-12231/DATUM');
  await modal.locator('[data-psnm-tab="coverage"]').first().click();
  await expect(modal.locator('[data-psnm-panel="coverage"]')).toHaveClass(/active/);
  await expect(modal.locator('[data-psnm-panel="coverage"]')).toContainText('22220');

  // Observer enhancement should become quiescent after the workflow settles.
  const count = await page.evaluate(() => new Promise(resolve => {
    const root = document.querySelector('[data-psnm="modal"]');
    let changes = 0;
    const observer = new MutationObserver(records => { changes += records.length; });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    setTimeout(() => { observer.disconnect(); resolve(changes); }, 900);
  }));
  expect(count).toBeLessThan(35);
  expect(await page.evaluate(() => window.__smokeErrors || [])).toEqual([]);
});
