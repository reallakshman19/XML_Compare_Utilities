import { expect, test } from '@playwright/test';

const FIXTURE = '/tests/browser/pipeline-cad-multi-selection-fixture.html';

async function openFixture(page) {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => document.body.dataset.pcadMultiReady === '1');
  return page.locator('[data-browser-fixture="pipeline-multi-selection"]');
}

const state = (page) => page.evaluate(() => window.__pcadMulti.state());

async function select(page, name, queries, primaryId = null) {
  await page.evaluate(({ name, queries, primaryId }) => window.__pcadMulti.select(name, queries, primaryId), { name, queries, primaryId });
  await page.evaluate(() => window.__pcadMulti.settle());
}

test.describe('Pipeline CAD multi-selection and batch transactions', () => {
  test('PCAD-MS-B01 Single selection retains precision editing', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', { id: 'table2a-0002' });
    expect((await state(page)).selection.table2x.count).toBe(1);
    await expect(page.locator('[data-p3d-cad-precision="table2x"]')).toBeVisible();
  });

  test('PCAD-MS-B02 Modifier toggle creates multi-selection and closes precision', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', { id: 'table2a-0002' });
    await page.evaluate(() => window.__pcadMulti.toggle('table2x', { id: 'table2a-0003' }, 'ctrl'));
    await page.evaluate(() => window.__pcadMulti.settle());
    const after = await state(page);
    expect(after.selection.table2x.entityIds).toEqual(['table2a-0002', 'table2a-0003']);
    await expect(page.locator('[data-p3d-cad-precision="table2x"]')).toBeHidden();
  });

  test('PCAD-MS-B03 Ctrl+A selects all visible Table 2 entities', async ({ page }) => {
    await openFixture(page);
    await page.evaluate(() => window.__pcadMulti.press('table2x', 'a', { ctrlKey: true }));
    expect((await state(page)).selection.table2x.count).toBe(4);
  });

  test('PCAD-MS-B04 Left-to-right window selects fully contained nodes', async ({ page }) => {
    await openFixture(page);
    const proof = await page.evaluate(() => {
      const api = window.__pcadMulti;
      const a = api.findNode('table2x', { id: 'table2a-0002' }).screen;
      const b = api.findNode('table2x', { id: 'table2a-0003' }).screen;
      return api.box('table2x', { x: Math.min(a.x, b.x) - 10, y: Math.min(a.y, b.y) - 10 }, { x: Math.max(a.x, b.x) + 10, y: Math.max(a.y, b.y) + 10 });
    });
    expect(proof.count).toBe(2);
    expect(proof.entityIds).toEqual(['table2a-0002', 'table2a-0003']);
  });

  test('PCAD-MS-B05 Right-to-left crossing selects an intersected node', async ({ page }) => {
    await openFixture(page);
    const proof = await page.evaluate(() => {
      const api = window.__pcadMulti; const point = api.findNode('table2x', { id: 'table2a-0003' }).screen;
      return api.box('table2x', { x: point.x + 3, y: point.y + 3 }, { x: point.x - 3, y: point.y - 3 });
    });
    expect(proof.count).toBe(1);
    expect(proof.entityIds).toEqual(['table2a-0003']);
  });

  test('PCAD-MS-B06 Table 2 group preview does not mutate model', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', [{ id: 'table2a-0002' }, { id: 'table2a-0003' }], 'table2a-0002');
    const before = await state(page);
    await page.evaluate(() => window.__pcadMulti.preview('table2x', { id: 'table2a-0002' }, { y: 1 }));
    const preview = await state(page);
    expect(preview.revision).toBe(before.revision);
    expect(preview.raw.table2a).toBe(before.raw.table2a);
    expect(preview.overrides.table2).toHaveLength(2);
  });

  test('PCAD-MS-B07 Table 2 group move commits once and synchronizes raw text', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', [{ id: 'table2a-0002' }, { id: 'table2a-0003' }], 'table2a-0002');
    const before = await state(page);
    await page.evaluate(() => window.__pcadMulti.drag('table2x', { id: 'table2a-0002' }, { y: 1 }));
    const after = await state(page);
    expect(after.history.undo).toBe(1);
    expect(after.revision).toBeGreaterThan(before.revision);
    expect(after.raw.table2a).not.toBe(before.raw.table2a);
    expect(after.table2Rows.find((row) => row.id === 'table2a-0002').elevationValue).toBeCloseTo(231.95, 6);
    expect(after.table2Rows.find((row) => row.id === 'table2a-0003').elevationValue).toBeCloseTo(231.82, 6);
  });

  test('PCAD-MS-B08 Undo and Redo restore the complete Table 2 group', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', [{ id: 'table2a-0002' }, { id: 'table2a-0003' }], 'table2a-0002');
    const before = await state(page);
    await page.evaluate(() => window.__pcadMulti.drag('table2x', { id: 'table2a-0002' }, { y: 1 }));
    const committed = await state(page);
    await page.evaluate(() => window.__pcadMulti.workspace.controller.undo());
    expect((await state(page)).raw.table2a).toBe(before.raw.table2a);
    await page.evaluate(() => window.__pcadMulti.workspace.controller.redo());
    expect((await state(page)).raw.table2a).toBe(committed.raw.table2a);
  });

  test('PCAD-MS-B09 Mixed Table 3 selection moves only depth subset', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table3x', [{ id: 'table3b-0001' }, { id: 'table3b-0002' }, { id: 'table3c-0001' }], 'table3b-0002');
    const before = await state(page);
    await page.evaluate(() => window.__pcadMulti.drag('table3x', { id: 'table3b-0002' }, { y: -0.5 }));
    const after = await state(page);
    expect(after.history.undo).toBe(1);
    expect(after.selection.table3x.count).toBe(3);
    expect(after.markerRows).toEqual(before.markerRows);
    expect(after.depthRows.find((row) => row.id === 'table3b-0001').zText).toBe('A/G');
    expect(after.depthRows.find((row) => row.id === 'table3b-0002').zText).toBe('2.0M');
  });

  test('PCAD-MS-B10 Marker group movement creates one transaction', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table3x', [{ id: 'table3c-0001' }, { id: 'table3c-0002' }], 'table3c-0001');
    const before = await state(page);
    await page.evaluate(() => window.__pcadMulti.drag('table3x', { id: 'table3c-0001' }, { x: 2 }));
    const after = await state(page);
    expect(after.history.undo).toBe(1);
    expect(after.markerRows[0].absoluteH).toBeGreaterThan(before.markerRows[0].absoluteH);
    expect(after.markerRows[1].absoluteH).toBeGreaterThan(before.markerRows[1].absoluteH);
  });

  test('PCAD-MS-B11 Mixed Table 3 batch delete uses one history entry', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table3x', [{ id: 'table3b-0002' }, { id: 'table3c-0001' }], 'table3b-0002');
    await page.evaluate(() => window.__pcadMulti.press('table3x', 'Delete'));
    const after = await state(page);
    expect(after.history.undo).toBe(1);
    expect(after.depthRows.some((row) => row.id === 'table3b-0002')).toBe(false);
    expect(after.markerRows.some((row) => row.id === 'table3c-0001')).toBe(false);
  });

  test('PCAD-MS-B12 Selection remains isolated to one graph', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', [{ id: 'table2a-0002' }, { id: 'table2a-0003' }]);
    await select(page, 'table3x', { id: 'table3c-0001' });
    const after = await state(page);
    expect(after.selection.table2x.count).toBe(0);
    expect(after.selection.table3x.entityIds).toEqual(['table3c-0001']);
  });

  test('PCAD-MS-B13 Escape cancels preview and clears selection', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', [{ id: 'table2a-0002' }, { id: 'table2a-0003' }], 'table2a-0002');
    await page.evaluate(() => window.__pcadMulti.preview('table2x', { id: 'table2a-0002' }, { y: 1 }));
    await page.evaluate(() => window.__pcadMulti.cancel('table2x'));
    const after = await state(page);
    expect(after.selection.table2x.count).toBe(0);
    expect(after.overrides.table2).toHaveLength(0);
    expect(after.history.undo).toBe(0);
  });

  test('PCAD-MS-B14 Overlay mode disables and clears selection', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', { id: 'table2a-0002' });
    await page.evaluate(() => window.__pcadMulti.setMode('overlay'));
    await page.evaluate(() => window.__pcadMulti.select('table2x', { id: 'table2a-0003' }));
    const after = await state(page);
    expect(after.enabled.table2x).toBe(false);
    expect(after.enabled.table3x).toBe(false);
    expect(after.selection.table2x.count).toBe(0);
    expect(after.selection.table3x.count).toBe(0);
  });

  test('PCAD-MS-B15 Destroy and remount leave one clean selection lifecycle', async ({ page }) => {
    await openFixture(page);
    await select(page, 'table2x', [{ id: 'table2a-0002' }, { id: 'table2a-0003' }]);
    const firstMount = (await state(page)).mountId;
    await page.evaluate(() => window.__pcadMulti.destroy());
    await page.evaluate(() => window.__pcadMulti.remount());
    const after = await state(page);
    expect(after.mountId).toBeGreaterThan(firstMount);
    expect(after.selection.table2x.count).toBe(0);
    expect(after.selection.table3x.count).toBe(0);
    expect(after.panels).toHaveLength(2);
  });

  test('PCAD-MS-B16 Existing Pipeline CAD and Object Snap foundations remain mounted', async ({ page }) => {
    const fixture = await openFixture(page);
    await expect(fixture.locator('[data-p3d-cad-canvas="table2x"]')).toBeVisible();
    await expect(fixture.locator('[data-p3d-cad-canvas="table3x"]')).toBeVisible();
    expect(await page.evaluate(() => Boolean(window.__pcadMulti.workspace.objectSnap))).toBe(true);
    expect(await page.evaluate(() => document.querySelectorAll('[data-p3d-cad-object-snap-glyph]').length)).toBe(2);
  });
});
