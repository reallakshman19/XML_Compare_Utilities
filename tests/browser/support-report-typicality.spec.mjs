import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const primaryXml = readFileSync('benchmarks/11168.xml', 'utf8');
const referenceXml = readFileSync('benchmarks/14168.xml', 'utf8');

test('Support Report preserves legacy mode and enables audited typicality with second XML', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('navigation', { name: 'Application tabs' })).toBeVisible();

  await page.evaluate(async () => {
    await import(new URL('/tabs/support-steel-relationship-builder/support-report-addon.js?browser=typicality-qualification-1', location.href).href);
    const moduleUrl = new URL('/tabs/support-steel-relationship-builder/support-steel-relationship-tab.js?browser=typicality-qualification-1', location.href).href;
    const module = await import(moduleUrl);
    module.openSupportSteelRelationshipBuilder({ showToast() {} });
  });

  const modal = page.locator('[data-ssrb-popup="1"]');
  await expect(modal).toBeVisible();
  await expect(modal.locator('[data-ssrb-tab="support-report"]')).toBeVisible();
  await modal.locator('[data-ssrb-tab="support-report"]').click();

  const primary = modal.locator('[data-ssr-xml]');
  const reference = modal.locator('[data-ssr-typical-xml]');
  const build = modal.locator('[data-ssr-build]');
  const runState = modal.locator('[data-ssr-run-state]');
  const xlsx = modal.locator('[data-ssr-download-xlsx]');
  const csv = modal.locator('[data-ssr-download]');

  await primary.fill(primaryXml);
  await build.click();

  await expect(runState).toContainText('Support Report ready');
  await expect(runState).toContainText('legacy 21-column mode');
  await expect(modal.locator('.ssrb-report-table thead th')).toHaveCount(21);
  await expect(modal.locator('.ssrb-report-table tbody tr')).toHaveCount(10);
  await expect(modal.locator('[data-ssr-typicality-summary="1"]')).toHaveCount(0);
  await expect(xlsx).toBeEnabled();
  await expect(csv).toBeEnabled();

  await reference.fill(referenceXml);
  await expect(xlsx).toBeDisabled();
  await expect(csv).toBeDisabled();
  await build.click();

  await expect(runState).toContainText('comparison columns 22–24 enabled');
  await expect(runState).toContainText('1 typical');
  await expect(modal.locator('.ssrb-report-table thead th')).toHaveCount(24);
  await expect(modal.locator('.ssrb-report-table tbody tr')).toHaveCount(10);
  await expect(modal.locator('.ssrb-report-table thead th').nth(21)).toHaveText('TYPICAL STRUCTURE (PS NO.)');
  await expect(modal.locator('.ssrb-report-table thead th').nth(22)).toHaveText('PIPING SUPPORT ARRANGEMENT MATCH');
  await expect(modal.locator('.ssrb-report-table thead th').nth(23)).toHaveText('TYPICALITY AUDIT ID');
  await expect(modal.locator('[data-ssr-typicality-summary="1"]')).toContainText('1 typical');

  const typicalCells = modal.locator('.ssrb-report-table tbody tr td:nth-child(22)');
  await expect(typicalCells).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) await expect(typicalCells.nth(index)).toHaveText('PS-14168');

  await expect(xlsx).toBeEnabled();
  await expect(csv).toBeEnabled();
});
