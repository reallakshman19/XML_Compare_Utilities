import { expect, test } from '@playwright/test';

async function clickEdgeAwayFromNode(page, edge) {
  const box = await edge.boundingBox();
  if (!box) throw new Error('Editable edge has no browser bounding box.');
  await page.mouse.click(box.x + (box.width * 0.25), box.y + (box.height / 2));
}

test('TTV-E01 — reversible Edit Draft commands regenerate evidence and preserve shared selection', async ({ page }) => {
  await page.goto('/tests/browser/topology-edit-draft-fixture.html');
  await page.waitForFunction(() => document.body.dataset.topologyEditFixtureReady === '1');
  await page.locator('[data-ttv-workspace-tab="edit"]').click();
  await expect(page.locator('[data-ttv-edit-status]')).toContainText('Edit Draft ready');
  await expect(page.locator('[data-ttv-workspace-panel="trace"]')).toBeHidden();
  await expect(page.locator('[data-ttv-workspace-panel="edit"]')).toBeVisible();
  await expect(page.locator('[data-edit-kind="node"]')).toHaveCount(3);
  await expect(page.locator('[data-edit-kind="edge"]')).toHaveCount(2);
  await expect(page.locator('[data-ttv-edit-export]')).toBeEnabled();

  const selectionMs = await page.evaluate(() => {
    const node = document.querySelector('[data-edit-kind="node"]');
    const started = performance.now();
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return new Promise((resolve) => requestAnimationFrame(() => resolve(performance.now() - started)));
  });
  expect(selectionMs).toBeLessThan(100);
  await expect(page.locator('[data-edit-kind="node"].is-selected')).toHaveCount(1);

  await page.locator('[data-ttv-edit-coordinate="x"]').fill('100');
  await page.locator('[data-ttv-edit-inspector-action="MOVE_EXACT"]').click();
  await expect.poll(async () => page.evaluate(() => window.__topologyEditHarness.controller.evidence().edit.draft.commands.length)).toBe(1);
  const movedHash = await page.evaluate(() => window.__topologyEditHarness.controller.evidence().edit.editedArtifacts.canonicalTopology.canonicalTopologyHash);
  const baseHash = await page.evaluate(() => window.__topologyEditHarness.controller.evidence().edit.baseArtifacts.canonicalTopology.canonicalTopologyHash);
  expect(movedHash).not.toBe(baseHash);

  await page.locator('[data-ttv-edit-undo]').click();
  await expect.poll(async () => page.evaluate(() => window.__topologyEditHarness.controller.evidence().edit.editedArtifacts.canonicalTopology.canonicalTopologyHash)).toBe(baseHash);
  await page.locator('[data-ttv-edit-redo]').click();
  await expect.poll(async () => page.evaluate(() => window.__topologyEditHarness.controller.evidence().edit.editedArtifacts.canonicalTopology.canonicalTopologyHash)).toBe(movedHash);

  const edge = page.locator('[data-edit-kind="edge"]').first();
  const edgeId = await edge.getAttribute('data-edit-id');
  await clickEdgeAwayFromNode(page, edge);
  await page.locator('[data-ttv-edit-split-fraction]').fill('0.5');
  await page.locator('[data-ttv-edit-inspector-action="SPLIT"]').click();
  await expect.poll(async () => page.evaluate(() => window.__topologyEditHarness.controller.evidence().edit.editedArtifacts.canonicalTopology.edges.length)).toBe(3);
  await expect(page.locator('[data-ttv-edit-export]')).toBeEnabled();

  const nodes = page.locator('[data-edit-kind="node"]');
  await nodes.nth(0).click();
  await nodes.nth(1).click({ modifiers: ['Control'] });
  await expect(page.locator('[data-edit-kind="node"].is-selected')).toHaveCount(2);
  await page.locator('[data-ttv-edit-projection="XZ"]').click();
  await expect(page.locator('.ttv-edit-svg')).toBeVisible();

  await clickEdgeAwayFromNode(page, page.locator(`[data-edit-kind="edge"][data-edit-id="${edgeId}"]`));
  await page.locator('[data-ttv-workspace-tab="trace"]').click();
  await expect(page.locator('[data-ttv-workspace-panel="trace"]').locator(`[data-canonical-edge-id="${edgeId}"]`)).toHaveClass(/is-selected/);
  await page.locator('[data-ttv-workspace-tab="parity"]').click();
  await expect(page.locator(`[data-object-key="scene:edge:${edgeId}"]`).first()).toHaveClass(/is-selected/);
});
