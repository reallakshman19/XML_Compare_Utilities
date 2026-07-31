import { test, expect } from '@playwright/test';

async function durableReady(page) {
  await page.goto('/tests/browser/sequential-draft-edit-package-v3-fixture.html');
  await expect.poll(() => page.evaluate(() => Boolean(globalThis.__ssk3dPackage))).toBe(true);
  await page.evaluate(() => globalThis.__ssk3dPackage.open());
  await page.evaluate(() => globalThis.__ssk3dPackage.activate3d());
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state().controller?.active))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller?.viewerState?.runtimePending)).toBe(false);
}

async function activate3d(page) {
  await page.locator('[data-ssk-draft-edit-3d]').click();
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state().controller?.active))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller?.viewerState?.runtimePending)).toBe(false);
}

async function canvasTarget(page, mode, selector, readyText) {
  await page.locator(`[data-ssk-component-edit-mode-value="${mode}"]`).click();
  const canvas = page.locator('[data-ssk-draft-edit-3d-canvas] canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  for (const ratio of [0.5, 0.45, 0.55, 0.4, 0.6]) {
    await canvas.click({ position: { x: box.width * ratio, y: box.height / 2 } });
    const text = await page.locator(selector).textContent();
    if (text?.includes(readyText)) return;
  }
  await expect(page.locator(selector)).toContainText(readyText);
}

async function selectMove(page) {
  await canvasTarget(page, 'MOVE_COMPONENT', '[data-ssk-single-move-target]', 'Component:');
}

async function selectStretch(page) {
  await canvasTarget(page, 'STRETCH_NODE', '[data-ssk-node-stretch-position]', 'Current:');
}

async function selectRotation(page) {
  await canvasTarget(page, 'ROTATE_SUBGRAPH', '[data-ssk-rotation-target]', 'seed');
}

async function expectGeometryCount(page, count) {
  await expect.poll(() => page.evaluate((expected) => globalThis.__ssk3dPackage.state()
    .geometryBranches.some((row) => row.entryCount === expected), count)).toBe(true);
}

async function applyMove(page, delta, expectedCount) {
  await selectMove(page);
  await page.locator('[data-ssk-single-move-constraint]').selectOption('X');
  await page.locator('[data-ssk-single-move-axis="x"]').fill(String(delta));
  await page.locator('[data-ssk-single-move-preview]').click();
  await expect(page.locator('[data-ssk-geometry-move-prepare]')).toBeEnabled();
  await page.locator('[data-ssk-geometry-move-actor]').fill('P1_Q_MOVE_OPERATOR');
  await page.locator('[data-ssk-geometry-move-reason]')
    .fill('Combined P1 qualification component move.');
  await page.locator('[data-ssk-geometry-move-evidence]')
    .fill('Exact target, constraint and delta reviewed in the real Workbench.');
  await page.locator('[data-ssk-geometry-move-prepare]').click();
  await expect(page.locator('[data-ssk-geometry-move-accept]')).toBeEnabled();
  await page.locator('[data-ssk-geometry-move-accept]').click();
  await expectGeometryCount(page, expectedCount);
}

async function applyStretch(page, delta, expectedCount) {
  await selectStretch(page);
  const x = Number(await page.locator('[data-ssk-node-stretch-x]').inputValue());
  await page.locator('[data-ssk-node-stretch-x]').fill(String(x + delta));
  await page.locator('[data-ssk-node-stretch-preview]').click();
  await expect(page.locator('[data-ssk-node-stretch-prepare]')).toBeEnabled();
  await page.locator('[data-ssk-node-stretch-actor]').fill('P1_Q_STRETCH_OPERATOR');
  await page.locator('[data-ssk-node-stretch-reason]')
    .fill('Combined P1 qualification connected node stretch.');
  await page.locator('[data-ssk-node-stretch-evidence]')
    .fill('Selected node, affected components and minimum lengths reviewed.');
  await page.locator('[data-ssk-node-stretch-prepare]').click();
  await expect(page.locator('[data-ssk-node-stretch-accept]')).toBeEnabled();
  await page.locator('[data-ssk-node-stretch-accept]').click();
  await expectGeometryCount(page, expectedCount);
}

async function applyRotation(page, angleDegrees, expectedCount) {
  await selectRotation(page);
  await page.locator('[data-ssk-rotation-scope]').selectOption('COMPONENT_ONLY');
  await page.locator('[data-ssk-rotation-axis-x]').fill('0');
  await page.locator('[data-ssk-rotation-axis-y]').fill('0');
  await page.locator('[data-ssk-rotation-axis-z]').fill('1');
  await page.locator('[data-ssk-rotation-angle]').fill(String(angleDegrees));
  await page.locator('[data-ssk-rotation-preview]').click();
  await expect(page.locator('[data-ssk-rotation-prepare]')).toBeEnabled();
  await page.locator('[data-ssk-rotation-actor]').fill('P1_Q_ROTATION_OPERATOR');
  await page.locator('[data-ssk-rotation-reason]')
    .fill('Combined P1 qualification rigid component rotation.');
  await page.locator('[data-ssk-rotation-evidence]')
    .fill('Pivot, axis, angle and preserved boundary diagnosis reviewed.');
  await page.locator('[data-ssk-rotation-prepare]').click();
  await expect(page.locator('[data-ssk-rotation-accept]')).toBeEnabled();
  await page.locator('[data-ssk-rotation-accept]').click();
  await expectGeometryCount(page, expectedCount);
}

async function historyEvidence(page, reason) {
  await page.locator('[data-ssk-geometry-history-actor]').fill('P1_Q_HISTORY_OPERATOR');
  await page.locator('[data-ssk-geometry-history-reason]').fill(reason);
  await page.locator('[data-ssk-geometry-history-evidence]')
    .fill('History cursor, affected operation and active scene reviewed.');
}

async function exportPackage(page, summary) {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-ssk-workspace-export]').click();
  const download = await downloadPromise;
  const packagePath = await download.path();
  expect(packagePath).toBeTruthy();
  await expect(page.locator('[data-ssk-workspace-package-summary]')).toContainText(summary);
  return packagePath;
}

async function reopenAndApply(page, packagePath, summary) {
  await page.evaluate(() => globalThis.__ssk3dPackage.close());
  await page.evaluate(() => globalThis.__ssk3dPackage.open());
  await page.locator('[data-ssk-workspace-import]').setInputFiles(packagePath);
  await expect(page.locator('[data-ssk-workspace-package-summary]')).toContainText(summary);
  await page.locator('[data-ssk-workspace-apply-reason]')
    .fill('Restore the combined P1 accepted authority.');
  await page.locator('[data-ssk-workspace-apply-evidence]')
    .fill('Package schema, history cursor, redo tail and edit counts reviewed.');
  await page.locator('[data-ssk-workspace-apply]').click();
  await expect(page.locator('[data-ssk-workspace-package-summary]'))
    .toContainText('Applied SequentialWorkspacePackage.v3 revision 3');
}

// SSK-3D-P1-Q-W01
test('SSK-3D-P1-Q-W01 MOVE STRETCH ROTATE history survives one package reopen', async ({ page }) => {
  await durableReady(page);
  await applyMove(page, 25, 1);
  await applyStretch(page, 5, 2);
  await applyRotation(page, 15, 3);
  await expect(page.locator('[data-ssk-geometry-history-position]')).toHaveText('3 / 3');

  await historyEvidence(page, 'Undo accepted rotation before package export.');
  await page.locator('[data-ssk-geometry-history-undo]').click();
  await expect(page.locator('[data-ssk-geometry-history-position]')).toHaveText('2 / 3');
  await expect(page.locator('[data-ssk-geometry-history-redo]')).toBeEnabled();

  const packagePath = await exportPackage(page, '3 geometry edits (2 active, 1 redo)');
  await reopenAndApply(page, packagePath, '3 geometry edits (2 active, 1 redo)');
  await activate3d(page);

  await expect(page.locator('[data-ssk-geometry-history-position]')).toHaveText('2 / 3');
  await expect(page.locator('[data-ssk-geometry-history-redo]')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .geometryBranches.some((row) => row.entryCount === 3
      && row.activeEntryCount === 2 && row.redoEntryCount === 1))).toBe(true);
  expect((await page.evaluate(() => globalThis.__ssk3dPackage.state())).failures).toEqual([]);
});

// SSK-3D-P1-Q-W02
// This is the closing cross-layer gate. A pending draft based on accepted history must remain
// durable while the accepted package authority is temporarily absent during reopen/import.
test('SSK-3D-P1-Q-W02 pending recovery waits for package authority then restores or discards', async ({ page }) => {
  await durableReady(page);
  await applyMove(page, 20, 1);

  await selectMove(page);
  await page.locator('[data-ssk-single-move-constraint]').selectOption('X');
  await page.locator('[data-ssk-single-move-axis="x"]').fill('5');
  await page.locator('[data-ssk-single-move-preview]').click();
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller.recovery.storage.recordCount)).toBe(1);

  const firstPackage = await exportPackage(page, '1 geometry edits');
  await page.evaluate(() => globalThis.__ssk3dPackage.close());
  await page.evaluate(() => globalThis.__ssk3dPackage.open());
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller.recovery.storage.recordCount)).toBe(1);

  await page.locator('[data-ssk-workspace-import]').setInputFiles(firstPackage);
  await page.locator('[data-ssk-workspace-apply-reason]')
    .fill('Restore accepted history before pending draft review.');
  await page.locator('[data-ssk-workspace-apply-evidence]')
    .fill('Accepted package and external pending recovery were reviewed separately.');
  await page.locator('[data-ssk-workspace-apply]').click();
  await activate3d(page);
  await expect(page.locator('[data-ssk-draft-recovery-kind]')).toHaveText('MOVE_COMPONENT');
  await page.locator('[data-ssk-draft-recovery-restore]').click();
  await expect(page.locator('[data-ssk-geometry-move-prepare]')).toBeEnabled();
  await expect(page.locator('[data-ssk-geometry-history-position]')).toHaveText('1 / 1');

  await page.locator('[data-ssk-geometry-move-actor]').fill('P1_Q_RECOVERY_OPERATOR');
  await page.locator('[data-ssk-geometry-move-reason]')
    .fill('Fresh review after package and recovery restoration.');
  await page.locator('[data-ssk-geometry-move-evidence]')
    .fill('Recovered delta and current target evidence reviewed; no prepared ID reused.');
  await page.locator('[data-ssk-geometry-move-prepare]').click();
  await expect(page.locator('[data-ssk-geometry-move-accept]')).toBeEnabled();
  await page.locator('[data-ssk-geometry-move-accept]').click();
  await expectGeometryCount(page, 2);
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller.recovery.storage.recordCount)).toBe(0);

  await selectStretch(page);
  const x = Number(await page.locator('[data-ssk-node-stretch-x]').inputValue());
  await page.locator('[data-ssk-node-stretch-x]').fill(String(x + 4));
  await page.locator('[data-ssk-node-stretch-preview]').click();
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller.recovery.storage.recordCount)).toBe(1);

  const secondPackage = await exportPackage(page, '2 geometry edits');
  await page.evaluate(() => globalThis.__ssk3dPackage.close());
  await page.evaluate(() => globalThis.__ssk3dPackage.open());
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller.recovery.storage.recordCount)).toBe(1);
  await page.locator('[data-ssk-workspace-import]').setInputFiles(secondPackage);
  await page.locator('[data-ssk-workspace-apply-reason]')
    .fill('Restore accepted history before discarding alternative pending draft.');
  await page.locator('[data-ssk-workspace-apply-evidence]')
    .fill('Accepted history remains independent of the pending stretch record.');
  await page.locator('[data-ssk-workspace-apply]').click();
  await activate3d(page);
  await expect(page.locator('[data-ssk-draft-recovery-kind]')).toHaveText('STRETCH_NODE');
  await page.locator('[data-ssk-draft-recovery-discard]').click();
  await expect(page.locator('[data-ssk-draft-recovery]')).toBeHidden();
  await expectGeometryCount(page, 2);
  await expect.poll(() => page.evaluate(() => globalThis.__ssk3dPackage.state()
    .controller.recovery.storage.recordCount)).toBe(0);
  expect((await page.evaluate(() => globalThis.__ssk3dPackage.state())).failures).toEqual([]);
});
