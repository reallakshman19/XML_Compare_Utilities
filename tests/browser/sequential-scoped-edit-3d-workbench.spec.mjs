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

// SSK-3D-P0-A-W01
test('SSK-3D-P0-A-W01 exports the exact engineering-demo baseline', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.open());
  expect(await page.evaluate(() => globalThis.__ssk3dWorkbench.state().pilotDisabled)).toBe(true);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.activate3d());
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dWorkbench.state().pilotDisabled)).toBe(false);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.pilot());
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dWorkbench.state().pilotExports.length)).toBe(1);
  const manifest = await page.evaluate(() => globalThis.__ssk3dWorkbench.state().pilotExports[0]);
  expect(manifest.schema).toBe('SequentialDraftEdit3dReleaseManifest.v1');
  expect(manifest.baseline.commit).toBe('19e04711fc54083bd8e622bbd82048839ca8ebfa');
  expect(manifest.authority.branchId).toBeTruthy();
  expect(manifest.controller.fallbackSurface).toBe('CONSTRUCTION_SVG');
  expect(manifest.disposition.internalPilotReady).toBe(false);
  expect(manifest.disposition.newEditingAuthority).toBe(false);
});

// SSK-3D-P0-A-W02
test('SSK-3D-P0-A-W02 injected scene failure returns to Construction SVG', async ({ page }) => {
  await ready(page); await openAndActivate(page);
  await page.evaluate(() => {
    globalThis.__ssk3dWorkbench.injectFailure('scene-apply');
    globalThis.__ssk3dWorkbench.refresh3d();
  });
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dWorkbench.state().controller.active)).toBe(false);
  const state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  expect(state.hostHidden).toBe(true);
  expect(state.constructionHidden).toBe(false);
  expect(state.failures.some((row) => row.stage === 'owner refresh')).toBe(true);
  expect(state.status).toContain('Construction SVG retained');
});
