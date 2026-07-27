import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/tests/browser/sequential-scoped-edit-3d-workbench-fixture.html');
  await expect.poll(() => page.evaluate(() => Boolean(globalThis.__ssk3dWorkbench))).toBe(true);
}
async function openAndActivate(page, advance = true) {
  await page.evaluate(() => globalThis.__ssk3dWorkbench.open());
  await page.evaluate((value) => globalThis.__ssk3dWorkbench.activate3d(undefined, value), advance);
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dWorkbench.state().controller?.active)).toBe(true);
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dWorkbench.state().viewer?.runtimePending)).toBe(false);
}

// SSK-TS-1B-W01
test('SSK-TS-1B-W01 real Workbench realizes the certified Sequential model', async ({ page }) => {
  await ready(page); await openAndActivate(page);
  const state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  expect(state.canvasCount).toBe(1);
  expect(state.hostHidden).toBe(false);
  expect(state.constructionHidden).toBe(true);
  expect(state.viewer.mode).toBe('target-only');
  expect(state.viewer.runtimeError).toBe(null);
  expect(state.viewer.instanceCount).toBeGreaterThan(0);
  expect(state.viewer.drawBatchCount).toBeGreaterThan(0);
  expect(state.viewer.sceneChunkCount).toBeGreaterThan(0);
  expect(state.failures).toEqual([]);
});

// SSK-TS-1B-W02
test('SSK-TS-1B-W02 real Workbench projection and renderer fallback stay live', async ({ page }) => {
  await ready(page); await openAndActivate(page);
  const before = await page.evaluate(() => JSON.stringify(globalThis.__ssk3dWorkbench.state().viewer.navigationState));
  await page.evaluate(() => globalThis.__ssk3dWorkbench.projection('XY'));
  await expect.poll(() => page.evaluate(() => JSON.stringify(globalThis.__ssk3dWorkbench.state().viewer.navigationState))).not.toBe(before);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.renderer('CONSTRUCTION_SVG'));
  const state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  expect(state.controller.active).toBe(false);
  expect(state.hostHidden).toBe(true);
  expect(state.constructionHidden).toBe(false);
});

// SSK-TS-1B-W03
test('SSK-TS-1B-W03 real Workbench replaces scene revision on branch switch', async ({ page }) => {
  await ready(page); await openAndActivate(page, false);
  const before = await page.evaluate(() => globalThis.__ssk3dWorkbench.state().viewer.runtimeRevision);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.openBranch(globalThis.__ssk3dWorkbench.branches[1]));
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dWorkbench.state().viewer?.runtimePending)).toBe(false);
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dWorkbench.state().viewer?.runtimeRevision)).not.toBe(before);
  const state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  expect(state.controller.active).toBe(true);
  expect(state.viewer.runtimeError).toBe(null);
  expect(state.viewer.instanceCount).toBeGreaterThan(0);
});

// SSK-TS-1B-W04
test('SSK-TS-1B-W04 real Workbench closes without leaked canvas', async ({ page }) => {
  await ready(page); await openAndActivate(page);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.close());
  expect(await page.locator('.ssk-modal').count()).toBe(0);
  expect(await page.locator('canvas').count()).toBe(0);
});
