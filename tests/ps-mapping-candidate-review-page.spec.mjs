import { test, expect } from '@playwright/test';

test('Candidate Matrix review page runs current resolver for PS-131 and SL-211 without synthetic additions', async ({ page }) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/docs/ps-mapping-candidate-matrix-validation.html');
  await expect(page.locator('#cases .panel')).toHaveCount(2);
  await expect(page.locator('#cases')).toContainText('PS-131.1');
  await expect(page.locator('#cases')).toContainText('SL-211.2');
  await expect(page.locator('#cases')).toContainText('LINE_STOP');
  await expect(page.locator('#cases')).toContainText('REST');
  await expect(page.locator('#row-count')).toContainText('review candidate rows');
  const dataRows=page.locator('#matrix-rows tr');
  expect(await dataRows.count()).toBeGreaterThanOrEqual(4);
  await expect(page.locator('#matrix-rows')).toContainText('PIPE STOP TYPE-602');
  await expect(page.locator('#matrix-rows')).toContainText('Directional Anchor On Shoe');
  await expect(page.locator('#matrix-rows')).toContainText('USER_REVIEW_REQUIRED');
  await expect(page.locator('#matrix-rows')).toContainText('Ambiguous');
  await expect(page.locator('#matrix-rows')).not.toContainText('PS-131.1.X1');
  await expect(page.locator('#matrix-rows')).not.toContainText('SL-211.2.X2');
  const autoMap=await page.locator('#matrix-rows tr').evaluateAll(rows =>
    rows.map(row=>row.cells[12]?.textContent?.trim()));
  expect(autoMap.every(value=>value==='NO')).toBeTruthy();
  expect(errors).toEqual([]);

  await page.locator('[data-filter="PS-131.1"]').click();
  await expect(page.locator('#matrix-rows')).toContainText('PS-131.1');
  await expect(page.locator('#matrix-rows')).not.toContainText('SL-211.1');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#export').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('ps-mapping-two-case-candidate-review.csv');

  await page.locator('[data-filter="SL-211.2"]').click();
  await expect(page.locator('#matrix-rows')).toContainText('SL-211.1');
  await expect(page.locator('#matrix-rows')).not.toContainText('PS-131.1');
});
