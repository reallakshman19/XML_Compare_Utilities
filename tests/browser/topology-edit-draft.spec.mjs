import { expect, test } from '@playwright/test';

// The Edit Draft surface is a WebGL canvas (instanced workbench viewer), so
// assertions run against the command model / shared selection through the
// harness plus inspector actions — not SVG DOM. Requires network for the
// three.js importmap/CDN fallback.

const evidence = (page) => page.evaluate(() => window.__topologyEditHarness.controller.evidence().edit);

async function selectRows(page, rows) {
  await page.evaluate((selection) => {
    window.__topologyEditHarness.controller.edit.setExternalSelection(selection);
  }, rows);
}

test('TTV-E01 — reversible Edit Draft commands regenerate evidence and preserve shared selection', async ({ page }) => {
  await page.goto('/tests/browser/topology-edit-draft-fixture.html');
  await page.waitForFunction(() => document.body.dataset.topologyEditFixtureReady === '1');
  await page.locator('[data-ttv-workspace-tab="edit"]').click();
  await expect(page.locator('[data-ttv-edit-status]')).toContainText('Edit Draft ready');
  await expect(page.locator('[data-ttv-workspace-panel="trace"]')).toBeHidden();
  await expect(page.locator('[data-ttv-workspace-panel="edit"]')).toBeVisible();

  const base = await evidence(page);
  expect(base.baseArtifacts.canonicalTopology.nodes.length).toBe(3);
  expect(base.baseArtifacts.canonicalTopology.edges.length).toBe(2);
  await expect(page.locator('[data-ttv-edit-export]')).toBeEnabled();

  // The 3D canvas mounts inside the former SVG host region.
  await expect(page.locator('[data-ttv-edit-svg-host] .ttv-edit-3d-canvas canvas')).toBeVisible();
  await page.locator('[data-ttv-support-scale]').fill('2');
  await expect(page.locator('[data-ttv-support-scale-output]')).toContainText('2.00');
  await expect.poll(async () => (await evidence(page)).supportScale).toBe(2);

  await page.locator('[data-ttv-edit-tool="MEASURE"]').click();
  await expect(page.locator('[data-ttv-edit-tool="MEASURE"]')).toHaveClass(/is-active/);
  await page.evaluate(async () => {
    const measure = await import('/tabs/topology-trace-validator/topology-edit-measurement.js?v=20260717-ttv-components-v1');
    measure.addTopologyMeasurementPoint([0, 0, 0]);
    measure.addTopologyMeasurementPoint([3000, 4000, 0]);
  });
  await expect(page.locator('[data-ttv-measure-total]')).toHaveText('5.000 m');
  await expect(page.locator('[data-ttv-measure-segments]')).toContainText('S1');
  await page.locator('[data-ttv-measure-clear]').click();
  await page.locator('[data-ttv-edit-tool="SELECT"]').click();

  const nodeIds = base.baseArtifacts.canonicalTopology.nodes.map((node) => node.id);
  await selectRows(page, [{ kind: 'node', id: nodeIds[0] }]);
  await expect(page.locator('[data-ttv-edit-inspector]')).toContainText(nodeIds[0]);
  await expect(page.locator('.ttv-lineage-table')).toBeVisible();
  await expect(page.locator('.ttv-lineage-table')).toContainText('position.x');

  await page.locator('[data-ttv-edit-coordinate="x"]').fill('100');
  await page.locator('[data-ttv-edit-inspector-action="MOVE_EXACT"]').click();
  await expect.poll(async () => (await evidence(page)).draft.commands.length).toBe(1);
  const movedHash = (await evidence(page)).editedArtifacts.canonicalTopology.canonicalTopologyHash;
  const baseHash = (await evidence(page)).baseArtifacts.canonicalTopology.canonicalTopologyHash;
  expect(movedHash).not.toBe(baseHash);

  await page.locator('[data-ttv-edit-undo]').click();
  await expect.poll(async () => (await evidence(page)).editedArtifacts.canonicalTopology.canonicalTopologyHash).toBe(baseHash);
  await page.locator('[data-ttv-edit-redo]').click();
  await expect.poll(async () => (await evidence(page)).editedArtifacts.canonicalTopology.canonicalTopologyHash).toBe(movedHash);

  const edgeId = (await evidence(page)).editedArtifacts.canonicalTopology.edges[0].id;
  await selectRows(page, [{ kind: 'edge', id: edgeId }]);
  await page.locator('[data-ttv-edit-split-fraction]').fill('0.5');
  await page.locator('[data-ttv-edit-inspector-action="SPLIT"]').click();
  await expect.poll(async () => (await evidence(page)).editedArtifacts.canonicalTopology.edges.length).toBe(3);
  await expect(page.locator('[data-ttv-edit-export]')).toBeEnabled();

  // Multi-selection is preserved in the evidence and drives the inspector.
  await selectRows(page, [{ kind: 'node', id: nodeIds[0] }, { kind: 'node', id: nodeIds[1] }]);
  await expect.poll(async () => (await evidence(page)).selection.length).toBe(2);
  await page.locator('[data-ttv-edit-projection="XZ"]').click();
  await expect.poll(async () => (await evidence(page)).projection).toBe('XZ');

  // Shared selection propagates to Trace and Parity surfaces.
  await selectRows(page, [{ kind: 'edge', id: edgeId }]);
  await page.evaluate((id) => {
    window.__topologyEditHarness.controller.synchronizeCanonicalSelection([{ kind: 'edge', id }], 'edit');
  }, edgeId);
  await page.locator('[data-ttv-workspace-tab="trace"]').click();
  await expect(page.locator('[data-ttv-workspace-panel="trace"]').locator(`[data-canonical-edge-id="${edgeId}"]`)).toHaveClass(/is-selected/);
  await page.locator('[data-ttv-workspace-tab="parity"]').click();
  await expect(page.locator(`[data-object-key="scene:edge:${edgeId}"]`).first()).toHaveClass(/is-selected/);
});
