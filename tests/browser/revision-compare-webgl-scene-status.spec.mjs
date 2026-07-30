import { expect, test } from '@playwright/test';

async function uploadValue(page, slot, name, value) {
  const buffer = Buffer.from(JSON.stringify(value));
  await page.locator(`[data-revc-file="${slot}"]`).setInputFiles({
    name,
    mimeType: 'application/json',
    buffer,
  });
}

function pipe(name, start, end, attributes = {}) {
  return {
    name,
    type: 'PIPE',
    attributes: {
      APOS: { x: start[0], y: start[1], z: start[2] },
      LPOS: { x: end[0], y: end[1], z: end[2] },
      ROUTE_TIER: 'BUILD_QUEUE_CONTINUITY',
      AUTO_GENERATED_PIPE: 'true',
      ...attributes,
    },
  };
}

function branch(name, start, end, children) {
  return {
    name,
    type: 'BRANCH',
    attributes: {
      NAME: name,
      HPOS: { x: start[0], y: start[1], z: start[2] },
      TPOS: { x: end[0], y: end[1], z: end[2] },
      HREF: `${name}/HEAD`,
      TREF: `${name}/TAIL`,
    },
    children,
  };
}

function representativeSequential(candidate = false) {
  return [
    branch('/PLANT/AREA-01/B1', [0, 0, 0], [2200, 0, 0], [
      pipe('PIPE AUTO CONTINUITY B1-01', [0, 0, 0], candidate ? [1150, 120, 0] : [1100, 0, 0], { LBORE: 250 }),
      ...(candidate ? [] : [pipe('PIPE AUTO CONTINUITY B1-02', [1100, 0, 0], [2200, 0, 0], { LBORE: 250 })]),
      ...(candidate ? [pipe('PIPE AUTO CONTINUITY B1-03', [1150, 120, 0], [2200, 200, 0], { LBORE: 250 })] : []),
    ]),
    branch('/PLANT/AREA-01/B2', [0, 1200, 0], [1800, 1200, 500], [
      pipe('PIPE AUTO CONTINUITY B2-01', [0, 1200, 0], [900, 1200, 250], { LBORE: 150 }),
      pipe('PIPE AUTO CONTINUITY B2-02', [900, 1200, 250], candidate ? [1900, 1300, 650] : [1800, 1200, 500], { LBORE: 150 }),
    ]),
    branch('/PLANT/AREA-02/B3', [0, -900, 300], [1600, -900, 300], [
      pipe('PIPE AUTO CONTINUITY B3-01', [0, -900, 300], [800, -900, 300], { LBORE: 100 }),
      pipe('PIPE AUTO CONTINUITY B3-02', [800, -900, 300], [1600, -900, 300], { LBORE: 100 }),
    ]),
  ];
}

async function numericText(locator) {
  return Number((await locator.textContent())?.trim());
}

test('representative Sequential source exposes real Workbench scene, fit and pick evidence', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/tests/browser/revision-compare-rc001.html');
  await page.getByRole('button', { name: 'Open Revision Compare' }).click();
  await uploadValue(page, 'baseline', 'sequential-multibranch-a.json', representativeSequential(false));
  await uploadValue(page, 'candidate', 'sequential-multibranch-b.json', representativeSequential(true));

  const preflight = page.locator('.revc-preflight').filter({ hasText: 'COMPATIBILITY PREFLIGHT' });
  await expect(preflight).toContainText('MM ↔ MM');
  await expect(preflight).toContainText('PLANT ↔ PLANT');
  await expect(preflight).toContainText('Z ↔ Z');
  await page.getByRole('button', { name: 'Approve comparison basis' }).click();
  await page.getByRole('button', { name: 'Run visual comparison' }).click();
  await expect(page.getByRole('heading', { name: 'Guided visual revision review' })).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: '3D (WebGL)' }).click();
  const canvas = page.locator('.revc-viewer-host canvas');
  await expect(canvas).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator('[data-revc-scene-state]')).toHaveText('READY', { timeout: 45_000 });

  expect(await numericText(page.locator('[data-revc-scene-source]'))).toBeGreaterThanOrEqual(5);
  expect(await numericText(page.locator('[data-revc-scene-target]'))).toBeGreaterThanOrEqual(5);
  expect(await numericText(page.locator('[data-revc-scene-instances]'))).toBeGreaterThan(0);
  expect(await numericText(page.locator('[data-revc-scene-batches]'))).toBeGreaterThan(0);
  await expect(page.locator('[data-revc-scene-runtime]')).not.toHaveText('—');

  const runtime = await page.evaluate(() => structuredClone(window.rcHandle.evidence().viewer.viewer));
  expect(runtime.runtimePending).toBe(false);
  expect(runtime.runtimeRevision).not.toBeNull();
  expect(runtime.instanceCount).toBeGreaterThan(0);
  expect(runtime.drawBatchCount).toBeGreaterThan(0);

  const row = page.locator('[data-revc-difference-id]').first();
  await row.click();
  await expect(page.locator('[data-revc-scene-selection]')).not.toHaveText('None');
  const historyBefore = await page.evaluate(() => window.rcHandle.evidence().viewer.viewer.navigationHistoryCount);
  await page.getByRole('button', { name: 'Fit selected' }).click();
  await expect.poll(() => page.evaluate(() => window.rcHandle.evidence().viewer.viewer.navigationHistoryCount))
    .toBeGreaterThan(historyBefore);

  const picksBefore = await numericText(page.locator('[data-revc-scene-picks]'));
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box.x + (box.width / 2), box.y + (box.height / 2));
  await expect.poll(() => numericText(page.locator('[data-revc-scene-picks]'))).toBeGreaterThan(picksBefore);
  await expect(page.locator('[data-revc-scene-last-pick]')).not.toHaveText('None');

  const finalEvidence = await page.evaluate(() => structuredClone(window.rcHandle.evidence()));
  expect(finalEvidence.viewer.activeBackend).toBe('WEBGL');
  expect(finalEvidence.viewer.lastPickedObjectId).toBeTruthy();
  expect(finalEvidence.scene.active).toBe(true);
  expect(finalEvidence.scene.status).toBe('READY');
});
