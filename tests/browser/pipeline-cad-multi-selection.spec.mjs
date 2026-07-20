import { expect, test } from '@playwright/test';

const URL = '/tests/browser/pipeline-cad-multi-selection-fixture.html';

async function openFixture(page) {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(URL);
  await page.waitForFunction(() => document.body.dataset.pcad004rReady === '1');
  await page.evaluate(async () => {
    const layout = await import('/tabs/pipeline-3d-model/pipeline-3d-model-cad-layout-hardening.js');
    layout.stabilizePipelineCadHosts(document);
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    globalThis.__pcad004r.workspace.resize(); await frame(); await frame();
  });
  await expect(page.locator('[data-p3d-cad-stage]')).toHaveCount(2);
  return errors;
}

async function state(page) { return page.evaluate(() => globalThis.__pcad004r.state()); }
async function localNode(page, graph, query) { return page.evaluate(({ graph, query }) => globalThis.__pcad004r.findNode(graph, query), { graph, query }); }
async function clientPoint(page, graph, local) {
  const box = await page.locator(`[data-p3d-cad-canvas="${graph}"]`).boundingBox();
  const viewport = await page.evaluate((name) => globalThis.__pcad004r.workspace.graphs[name].getViewport(), graph);
  return { x: box.x + local.x * box.width / viewport.width, y: box.y + local.y * box.height / viewport.height };
}
async function clickNode(page, graph, query, modifier) {
  const local = await localNode(page, graph, query); const point = await clientPoint(page, graph, local);
  if (modifier) await page.keyboard.down(modifier);
  await page.mouse.click(point.x, point.y);
  if (modifier) await page.keyboard.up(modifier);
  return local;
}
async function dragLocal(page, graph, startLocal, endLocal, hold = false) {
  const start = await clientPoint(page, graph, startLocal); const end = await clientPoint(page, graph, endLocal);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 8 });
  if (!hold) await page.mouse.up();
  return { start, end };
}
async function table2Nodes(page) { return page.evaluate(() => globalThis.__pcad004r.nodes('table2x').map((node) => globalThis.__pcad004r.findNode('table2x', { id: node.id }))); }

function noErrors(errors) { expect(errors).toEqual([]); }

test('PCAD-004R-B01 click replacement', async ({ page }) => {
  const errors = await openFixture(page);
  await clickNode(page, 'table2x', { index: 0 });
  await clickNode(page, 'table2x', { index: 1 }, 'Shift');
  await clickNode(page, 'table2x', { index: 2 });
  expect((await state(page)).selection.table2x.selectedIds).toHaveLength(1);
  expect((await state(page)).selection.table2x.primaryId).toBe((await localNode(page, 'table2x', { index: 2 })).id);
  noErrors(errors);
});

test('PCAD-004R-B02 modifier toggling', async ({ page }) => {
  const errors = await openFixture(page);
  const first = await clickNode(page, 'table2x', { index: 0 });
  const second = await clickNode(page, 'table2x', { index: 1 }, 'Shift');
  expect((await state(page)).selection.table2x.selectedIds).toEqual([first.id, second.id]);
  await clickNode(page, 'table2x', { index: 0 }, 'Control');
  expect((await state(page)).selection.table2x.selectedIds).toEqual([second.id]);
  noErrors(errors);
});

test('PCAD-004R-B03 select all', async ({ page }) => {
  const errors = await openFixture(page);
  await clickNode(page, 'table2x', { index: 0 });
  await page.keyboard.press('Control+A');
  const value = await state(page);
  expect(value.selection.table2x.count).toBe(value.table2.length);
  expect(value.selection.activeGraph).toBe('table2x');
  noErrors(errors);
});

test('PCAD-004R-B04 window selection', async ({ page }) => {
  const errors = await openFixture(page); const nodes = await table2Nodes(page);
  const target = nodes.slice(0, 2);
  const start = { x: Math.min(...target.map((node) => node.x)) - 14, y: Math.min(...target.map((node) => node.y)) - 14 };
  const end = { x: Math.max(...target.map((node) => node.x)) + 14, y: Math.max(...target.map((node) => node.y)) + 14 };
  await dragLocal(page, 'table2x', start, end);
  expect((await state(page)).selection.table2x.selectedIds).toEqual(target.map((node) => node.id));
  noErrors(errors);
});

test('PCAD-004R-B05 crossing selection', async ({ page }) => {
  const errors = await openFixture(page); const node = await localNode(page, 'table2x', { index: 2 });
  await dragLocal(page, 'table2x', { x: node.x + 18, y: node.y + 18 }, { x: node.x + 9, y: node.y - 18 });
  expect((await state(page)).selection.table2x.selectedIds).toContain(node.id);
  noErrors(errors);
});

test('PCAD-004R-B06 Table 2 group preview', async ({ page }) => {
  const errors = await openFixture(page);
  const first = await clickNode(page, 'table2x', { index: 1 });
  const second = await clickNode(page, 'table2x', { index: 2 }, 'Shift');
  const before = await state(page);
  await dragLocal(page, 'table2x', second, { ...second, y: second.y + 36 }, true);
  const preview = await state(page);
  expect(preview.table2).toEqual(before.table2);
  expect(preview.raw.table2a).toBe(before.raw.table2a);
  expect(preview.overrides.table2.map(([id]) => id).sort()).toEqual([first.id, second.id].sort());
  await page.mouse.up(); noErrors(errors);
});

test('PCAD-004R-B07 Table 2 atomic commit', async ({ page }) => {
  const errors = await openFixture(page);
  await clickNode(page, 'table2x', { index: 1 });
  const second = await clickNode(page, 'table2x', { index: 2 }, 'Shift');
  const before = await state(page);
  await dragLocal(page, 'table2x', second, { ...second, y: second.y + 36 });
  const after = await state(page);
  expect(after.history.undo - before.history.undo).toBe(1);
  expect(after.revision).toBeGreaterThan(before.revision);
  expect(after.table2.filter((row, index) => row.elevationValue !== before.table2[index].elevationValue)).toHaveLength(2);
  expect(after.batchEvents.at(-1).detail.operation).toBe('TABLE2_GEOMETRY_ELEVATION');
  noErrors(errors);
});

test('PCAD-004R-B08 Table 3 marker-only group operation', async ({ page }) => {
  const errors = await openFixture(page);
  const first = await clickNode(page, 'table3x', { type: 'marker', text: 'PM-001' });
  await clickNode(page, 'table3x', { type: 'marker', text: 'PM-002' }, 'Shift');
  const before = await state(page);
  await dragLocal(page, 'table3x', first, { ...first, x: first.x + 30 });
  const after = await state(page);
  expect(after.markers.map((row) => row.absoluteH)).not.toEqual(before.markers.map((row) => row.absoluteH));
  expect(after.depth).toEqual(before.depth);
  expect(after.raw.table3b).toBe(before.raw.table3b);
  expect(after.batchEvents.at(-1).detail.operation).toBe('TABLE3_MARKER_EVIDENCE_POSITION');
  noErrors(errors);
});

test('PCAD-004R-B09 mixed-selection homogeneous subset', async ({ page }) => {
  const errors = await openFixture(page);
  const marker = await clickNode(page, 'table3x', { type: 'marker', text: 'PM-001' });
  await clickNode(page, 'table3x', { type: 'marker', text: 'PM-002' }, 'Shift');
  const depth = await clickNode(page, 'table3x', { type: 'depth-node' }, 'Shift');
  const before = await state(page);
  await dragLocal(page, 'table3x', marker, { ...marker, x: marker.x + 25 });
  const after = await state(page); const event = after.batchEvents.at(-1).detail;
  expect(event.skippedIds).toEqual([depth.id]);
  expect(after.depth).toEqual(before.depth);
  expect(event.entityIds).toHaveLength(2);
  noErrors(errors);
});

test('PCAD-004R-B10 batch delete', async ({ page }) => {
  const errors = await openFixture(page);
  await clickNode(page, 'table2x', { index: 1 });
  await clickNode(page, 'table2x', { index: 2 }, 'Shift');
  const before = await state(page);
  await page.keyboard.press('Delete');
  const after = await state(page);
  expect(before.table2.length - after.table2.length).toBe(2);
  expect(after.history.undo - before.history.undo).toBe(1);
  expect(after.batchEvents.at(-1).detail.operation).toBe('DELETE_PROFILE_ROWS');
  noErrors(errors);
});

test('PCAD-004R-B11 Undo/Redo', async ({ page }) => {
  const errors = await openFixture(page);
  await clickNode(page, 'table2x', { index: 1 }); await clickNode(page, 'table2x', { index: 2 }, 'Shift');
  const before = await state(page); await page.keyboard.press('Delete'); const deleted = await state(page);
  await page.keyboard.press('Control+z'); expect((await state(page)).table2).toEqual(before.table2);
  await page.keyboard.press('Control+y'); expect((await state(page)).table2).toEqual(deleted.table2);
  noErrors(errors);
});

test('PCAD-004R-B12 precision cancellation', async ({ page }) => {
  const errors = await openFixture(page);
  await clickNode(page, 'table2x', { index: 0 });
  await expect.poll(async () => (await state(page)).precisionIdentity?.entityId || null).not.toBeNull();
  await clickNode(page, 'table2x', { index: 1 }, 'Shift');
  expect((await state(page)).precisionIdentity).toBeNull();
  noErrors(errors);
});

test('PCAD-004R-B13 overlay lockout', async ({ page }) => {
  const errors = await openFixture(page);
  await clickNode(page, 'table2x', { index: 0 });
  await page.evaluate(() => globalThis.__pcad004r.setMode('overlay'));
  let value = await state(page);
  expect(value.selection.table2x.count).toBe(0); expect(value.precisionIdentity).toBeNull();
  await page.evaluate(() => globalThis.__pcad004r.setMode('table2x'));
  await clickNode(page, 'table2x', { index: 0 }); value = await state(page);
  expect(value.selection.table2x.count).toBe(1);
  noErrors(errors);
});

test('PCAD-004R-B14 bend/InputXML gate preservation', async ({ page }) => {
  const errors = await openFixture(page);
  const first = await clickNode(page, 'table3x', { type: 'depth-node', index: 2 });
  await clickNode(page, 'table3x', { type: 'depth-node', index: 3 }, 'Shift');
  const before = await state(page);
  await dragLocal(page, 'table3x', first, { ...first, y: first.y + 30 });
  const after = await state(page); const rejection = after.batchEvents.at(-1);
  expect(rejection.type).toBe('rejected'); expect(rejection.detail.reason).toContain('not permitted');
  expect(after.history).toEqual(before.history); expect(after.depth).toEqual(before.depth); expect(after.raw.table3b).toBe(before.raw.table3b);
  noErrors(errors);
});

test('PCAD-004R-B15 destroy/remount', async ({ page }) => {
  const errors = await openFixture(page); const before = await state(page);
  expect(await page.evaluate(() => globalThis.__pcad004r.destroy())).toBe(true);
  await expect(page.locator('[data-p3d-cad-stage]')).toHaveCount(0);
  await page.evaluate(() => globalThis.__pcad004r.remount());
  await expect(page.locator('[data-p3d-cad-stage]')).toHaveCount(2);
  expect((await state(page)).mountId).toBeGreaterThan(before.mountId);
  noErrors(errors);
});

test('PCAD-004R-B16 no shared-SVG authoring ownership', async ({ page }) => {
  const errors = await openFixture(page);
  const proof = await page.evaluate(async () => {
    const source = await (await fetch('/tabs/pipeline-3d-model/pipeline-3d-model-cad-authoring.js')).text();
    return {
      forbidden: /pipeline-engineering-svg|engineering-svg-shadow|core\/engineering-svg/.test(source),
      canvases: document.querySelectorAll('[data-p3d-cad-canvas]').length,
      commandGateway: 'commandGateway' in globalThis.__pcad004r.workspace.authoring,
    };
  });
  expect(proof).toEqual({ forbidden: false, canvases: 2, commandGateway: false });
  noErrors(errors);
});
