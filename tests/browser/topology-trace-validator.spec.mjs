import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function openValidatedWorkspace(page) {
  await page.goto('/tests/browser/topology-trace-validator-fixture.html');
  await page.waitForFunction(() => document.body.dataset.topologyValidatorReady === '1');
  await expect(page.locator('[data-ttv-status]')).toContainText('Validation complete');
}

async function clickSvgObject(locator) {
  await locator.evaluate((node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

test('TTV-B01 — component-aware click traces and immutable projection remain linked', async ({ page }) => {
  await openValidatedWorkspace(page);
  const tracePanel = page.locator('[data-ttv-workspace-panel="trace"]');
  await tracePanel.locator('[data-ttv-branch="/B1"]').click();
  await tracePanel.locator('[data-ttv-mode="trace"]').click();
  const samples = [
    ['$[0].children[0]', 'canonical:edge:E-P1A'], ['$[0].children[1]', 'canonical:edge:E-VALVE'],
    ['$[0].children[2]', 'canonical:edge:E-FLANGE'], ['$[0].children[4]', 'canonical:edge:E-INST'],
    ['$[0].children[6]', 'canonical:edge:E-BEND-A'], ['$[0].children[7]', 'canonical:junction:J-TEE'],
    ['$[0].children[8]', 'canonical:junction:J-OLET'], ['$[0].children[5]', 'canonical:edge:E-REDU'],
  ];
  for (const [sourcePath, targetKey] of samples) {
    const source = tracePanel.locator(`[data-object-key="source:${sourcePath}"]`);
    await clickSvgObject(source);
    await expect(source).toHaveClass(/is-selected/);
    await expect(tracePanel.locator(`[data-object-key="${targetKey}"]`)).toHaveClass(/is-related/);
  }
  await tracePanel.locator('[data-ttv-branch="/B3"]').click();
  const boundarySource = tracePanel.locator('[data-object-key="source:$[2]"]');
  await clickSvgObject(boundarySource);
  await expect(tracePanel.locator('[data-object-key="canonical:boundary:BND-EXT"]')).toHaveClass(/is-related/);
  await tracePanel.locator('[data-ttv-branch="/B1"]').click();
  await tracePanel.locator('[data-ttv-mode="spatial"]').click();
  const horizontalSourceRoute = tracePanel.locator('[data-object-key="source:$[0].children[1]"]').first();
  await expect(horizontalSourceRoute).toHaveCount(1);
  await clickSvgObject(horizontalSourceRoute);
  await expect(tracePanel.locator('[data-canonical-edge-id="E-VALVE"]')).toHaveClass(/is-related/);
  await tracePanel.locator('[data-ttv-bottom-tab="projection"]').evaluate((button) => button.click());
  await expect(tracePanel.locator('[data-inputxml-element-id="PE-VALVE"]')).toHaveClass(/is-related/);
  await tracePanel.locator('[data-inputxml-element-id="PE-ASSEMBLY"]').evaluate((row) => row.click());
  await expect(tracePanel.locator('[data-canonical-edge-id="E-FLANGE"]')).toHaveClass(/is-related/);
  await expect(tracePanel.locator('[data-canonical-edge-id="E-GASK"]')).toHaveClass(/is-related/);
  const svg = tracePanel.locator('.ttv-svg');
  const fittedViewBox = await svg.getAttribute('viewBox');
  await tracePanel.locator('[data-ttv-zoom="in"]').click();
  expect(await svg.getAttribute('viewBox')).not.toBe(fittedViewBox);
  await tracePanel.locator('[data-ttv-fit]').click();
  expect(await svg.getAttribute('viewBox')).toBe(fittedViewBox);
  await svg.evaluate((node) => {
    for (const child of node.children) {
      child.dataset.ttvTestPointerEvents = child.style.pointerEvents;
      child.style.pointerEvents = 'none';
    }
  });
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 - 60, { steps: 8 });
  await page.mouse.up();
  await svg.evaluate((node) => {
    for (const child of node.children) {
      child.style.pointerEvents = child.dataset.ttvTestPointerEvents || '';
      delete child.dataset.ttvTestPointerEvents;
    }
  });
  expect(await svg.getAttribute('viewBox')).not.toBe(fittedViewBox);
  await tracePanel.locator('[data-ttv-fit]').click();
  await page.evaluate(() => { window.__ttvSvgBeforeSearch = document.querySelector('[data-ttv-workspace-panel="trace"] .ttv-svg'); });
  await tracePanel.locator('[data-ttv-search-name]').fill('PT');
  await expect(tracePanel.locator('[data-ttv-search-results]')).toContainText('PIPE');
  await expect(tracePanel.locator('[data-ttv-status]')).toContainText('1 matches listed');
  expect(await page.evaluate(() => window.__ttvSvgBeforeSearch === document.querySelector('[data-ttv-workspace-panel="trace"] .ttv-svg'))).toBe(true);
  await expect(tracePanel.locator('[data-canonical-edge-id="E-TEE-BR"]')).toHaveCount(0);
  await tracePanel.locator('[data-ttv-search-results] [data-object-key]').first().click();
  await expect(tracePanel.locator('[data-ttv-branch="/B2"]')).toHaveClass(/is-active/);
  await expect(tracePanel.locator('[data-canonical-edge-id="E-TEE-BR"]')).toHaveCount(1);
  await expect(tracePanel.locator('[data-ttv-component-symbols]')).toBeChecked();
  const immutable = await page.evaluate(() => {
    const controller = window.__topologyValidatorHarness.controller;
    controller.assertNoMutation();
    return controller.evidence().trace.validation.metrics.issueCount;
  });
  expect(immutable).toBe(0);
});

test('TTV-B02 — Trace 3D is native SVG ISO with overlays, support isolation, compass, and navigation', async ({ page }) => {
  await openValidatedWorkspace(page);
  const tracePanel = page.locator('[data-ttv-workspace-panel="trace"]');
  await tracePanel.locator('[data-ttv-projection="3D"]').click();
  await expect(tracePanel.locator('.ttv-svg')).toHaveCount(1);
  await expect(tracePanel.locator('.ttv-svg-host canvas')).toHaveCount(0);
  const compass = tracePanel.locator('[data-ttv-axis-compass]');
  await expect(compass).toHaveAttribute('data-projection', '3D');
  for (const axis of ['x', 'y', 'z']) await expect(compass.locator(`[data-ttv-axis="${axis}"]`)).toBeVisible();
  const evidence = await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().trace);
  expect(evidence.viewState.projection).toBe('3D');
  const sourcePoint = evidence.artifacts.canonical.nodes[0].position;
  const projected = evidence.viewModel.canonicalNodes[0].projectedPosition;
  expect(projected.x).toBeCloseTo((sourcePoint.x - sourcePoint.y) * Math.cos(Math.PI / 6), 8);
  expect(projected.y).toBeCloseTo(sourcePoint.z + (sourcePoint.x + sourcePoint.y) * Math.sin(Math.PI / 6), 8);

  const svg = tracePanel.locator('.ttv-svg');
  const fitted = await svg.getAttribute('viewBox');
  await tracePanel.locator('[data-ttv-zoom="in"]').click();
  expect(await svg.getAttribute('viewBox')).not.toBe(fitted);
  await tracePanel.locator('[data-ttv-canvas-fit]').click();
  expect(await svg.getAttribute('viewBox')).toBe(fitted);

  await tracePanel.locator('[data-ttv-isolate="supports"]').check();
  await expect(tracePanel.locator('[data-ttv-component-symbols]')).toBeChecked();
  await expect(tracePanel.locator('[data-source-component-type="SUPPORT"]')).toHaveCount(1);
  await expect(tracePanel.locator('[data-source-component-type="PIPE"]')).toHaveCount(0);

  await tracePanel.locator('[data-ttv-isolate="supports"]').uncheck();
  await tracePanel.locator('[data-ttv-component-symbols]').uncheck();
  await expect(tracePanel.locator('[data-source-component-type]')).toHaveCount(0);
  await tracePanel.locator('[data-ttv-canvas-projection="ISO"]').click();
  await expect(compass).toHaveAttribute('data-projection', 'ISO');
  await expect(tracePanel.locator('[data-ttv-projection="3D"]')).toHaveClass(/is-active/);
  expect(await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().trace.viewState.projection)).toBe('ISO');
});

test('TTV-B03 — support draft edits are live, undoable, exportable, and evidence-safe', async ({ page }) => {
  await openValidatedWorkspace(page);
  const tracePanel = page.locator('[data-ttv-workspace-panel="trace"]');
  const originalHashes = await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().trace.hashes);
  await tracePanel.locator('[data-ttv-editor-mode="edit"]').click();
  await expect(tracePanel.locator('[data-ttv-editor-panel]')).toBeVisible();
  await expect(tracePanel.locator('[data-ttv-component-symbols]')).toBeChecked();

  const support = tracePanel.locator('[data-source-component-type="SUPPORT"]');
  await expect(support).toHaveCount(1);
  await support.click();
  await expect(tracePanel.locator('[data-ttv-editor-selection]')).toContainText('SRC-SUPPORT');
  await expect(tracePanel.locator('[data-ttv-editor-axis="x"]')).toBeVisible();
  await expect(tracePanel.locator('[data-ttv-editor-axis="y"]')).toBeVisible();
  await expect(tracePanel.locator('[data-ttv-editor-axis="z"]')).toHaveCount(0);

  await tracePanel.locator('[data-ttv-editor-coordinate="x"]').fill('17.25');
  await tracePanel.locator('[data-ttv-editor-coordinate="y"]').fill('0');
  await tracePanel.locator('[data-ttv-editor-coordinate="z"]').fill('0');
  await tracePanel.locator('[data-ttv-editor-set]').click();
  let editor = await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().editor);
  expect(editor.draft.dirtyCount).toBe(1);
  expect(editor.draft.entities[0].position.x).toBe(17.25);
  await expect(tracePanel.locator('[data-ttv-editor-dirty]').first()).toContainText('1 pending');

  await tracePanel.locator('[data-ttv-editor-undo]').click();
  editor = await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().editor);
  expect(editor.draft.entities[0].position.x).toBe(15);
  await tracePanel.locator('[data-ttv-editor-redo]').click();
  editor = await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().editor);
  expect(editor.draft.entities[0].position.x).toBe(17.25);

  const xHandle = tracePanel.locator('[data-ttv-editor-axis="x"] circle');
  await xHandle.scrollIntoViewIfNeeded();
  const handleBox = await xHandle.boundingBox();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 60, handleBox.y + handleBox.height / 2, { steps: 6 });
  await page.mouse.up();
  editor = await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().editor);
  expect(editor.draft.entities[0].position.x).toBeGreaterThan(17.25);
  expect(editor.draft.entities[0].position.y).toBe(0);
  expect(editor.draft.entities[0].position.z).toBe(0);
  const committedX = editor.draft.entities[0].position.x;

  const cancelHandle = tracePanel.locator('[data-ttv-editor-axis="x"] circle');
  await cancelHandle.scrollIntoViewIfNeeded();
  const cancelBox = await cancelHandle.boundingBox();
  await page.mouse.move(cancelBox.x + cancelBox.width / 2, cancelBox.y + cancelBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cancelBox.x + cancelBox.width / 2 + 80, cancelBox.y + cancelBox.height / 2, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  editor = await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().editor);
  expect(editor.draft.entities[0].position.x).toBe(committedX);
  expect(editor.dragging).toBe(false);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    tracePanel.locator('[data-ttv-editor-export]').click(),
  ]);
  const patch = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(patch.schema).toBe('TopologyEditPatch.v1');
  expect(patch.operations).toHaveLength(1);
  expect(patch.operations[0].type).toBe('MOVE_SUPPORT');
  expect(patch.baseHashes).toEqual(originalHashes);

  const final = await page.evaluate(() => {
    const controller = window.__topologyValidatorHarness.controller;
    controller.assertNoMutation();
    return { hashes: controller.evidence().trace.hashes, editor: controller.evidence().editor };
  });
  expect(final.hashes).toEqual(originalHashes);
  expect(final.editor.mode).toBe('edit');
  await expect(tracePanel.locator('.ttv-svg-host canvas')).toHaveCount(0);

  await tracePanel.locator('[data-ttv-editor-mode="review"]').click();
  await expect(tracePanel.locator('[data-ttv-editor-panel]')).toBeHidden();
  expect((await page.evaluate(() => window.__topologyValidatorHarness.controller.evidence().editor)).draft.dirtyCount).toBe(1);
});
