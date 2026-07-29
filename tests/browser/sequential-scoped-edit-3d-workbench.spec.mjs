import { readFile } from 'node:fs/promises';
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

async function downloadEvidence(page) {
  const pending = page.waitForEvent('download');
  await page.evaluate(() => globalThis.__ssk3dWorkbench.pilotExport());
  const download = await pending;
  const path = await download.path();
  return {
    filename: download.suggestedFilename(),
    content: await readFile(path, 'utf8'),
  };
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

// SSK-3D-P0-A-W01
test('SSK-3D-P0-A-W01 pilot evidence gate requires one authoritative branch', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.open());
  let state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  expect(state.pilotButtonDisabled).toBe(true);
  expect(state.pilotButtonTitle).toContain('Pilot evidence unavailable');
  await page.evaluate(() => globalThis.__ssk3dWorkbench.inspect());
  await page.evaluate(() => globalThis.__ssk3dWorkbench.openBranch());
  await expect.poll(() => page.evaluate(
    () => globalThis.__ssk3dWorkbench.state().pilotButtonDisabled,
  )).toBe(false);
  state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  expect(state.pilot.enabled).toBe(true);
});

// SSK-3D-P0-A-W02
test('SSK-3D-P0-A-W02 pilot evidence download is deterministic and current', async ({ page }) => {
  await ready(page); await openAndActivate(page);
  await expect.poll(() => page.evaluate(
    () => globalThis.__ssk3dWorkbench.state().pilotButtonDisabled,
  )).toBe(false);
  const first = await downloadEvidence(page);
  const second = await downloadEvidence(page);
  expect(first.filename).toBe('ssk-sequential-draft-edit-3d-pilot-baseline.json');
  expect(second.content).toBe(first.content);
  const manifest = JSON.parse(first.content);
  expect(manifest.schema).toBe('SequentialDraftEdit3dReleaseManifest.v1');
  expect(manifest.releaseLevel).toBe('ENGINEERING_DEMO');
  expect(manifest.baseline.repository).toBe('reallaksh19/XML_Compare_Utilities');
  expect(manifest.baseline.commit).toBe('bda5489ef8097bdc41a26dbc30a9be2498a3e89e');
  expect(manifest.runtime.controller.active).toBe(true);
  expect(manifest.runtime.viewer.runtimePending).toBe(false);
  expect(manifest.runtime.scene.entityCount).toBeGreaterThan(0);
  expect(manifest.capabilities.geometryOperations).toContain('MOVE_COMPONENT');
  expect(manifest.knownLimitations).toContain('No structural topology publication authority.');
  const state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  expect(state.pilot.exportCount).toBe(2);
  expect(state.pilot.lastFingerprint).toBe(manifest.fingerprint);
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

// SSK-3D-P0-A-W03
test('SSK-3D-P0-A-W03 injected viewer failure retains SVG and authority', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => globalThis.__ssk3dWorkbench.open());
  await page.evaluate(() => globalThis.__ssk3dWorkbench.inspect());
  await page.evaluate(() => globalThis.__ssk3dWorkbench.openBranch());
  await page.evaluate(() => globalThis.__ssk3dWorkbench.advance());
  const before = await page.evaluate(() => globalThis.__ssk3dWorkbench.authoritySignature());
  await page.evaluate(() => globalThis.__ssk3dWorkbench.setFailureStage('viewer-mount'));
  await page.evaluate(() => globalThis.__ssk3dWorkbench.draft3d());
  await expect.poll(() => page.evaluate(
    () => globalThis.__ssk3dWorkbench.state().controller?.failureCount,
  )).toBe(1);
  const state = await page.evaluate(() => globalThis.__ssk3dWorkbench.state());
  const after = await page.evaluate(() => globalThis.__ssk3dWorkbench.authoritySignature());
  expect(state.controller.active).toBe(false);
  expect(state.hostHidden).toBe(true);
  expect(state.constructionHidden).toBe(false);
  expect(state.status).toContain('Construction SVG retained');
  expect(state.failures).toHaveLength(1);
  expect(state.failures[0].stage).toBe('view mount');
  expect(after).toBe(before);
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
