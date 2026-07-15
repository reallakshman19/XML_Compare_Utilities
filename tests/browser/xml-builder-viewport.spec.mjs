import { expect, test } from '@playwright/test';

const FIXTURE = '/tests/browser/xml-builder-viewport-fixture.html';

async function openFixture(page, query = '') {
  await page.goto(`${FIXTURE}${query}`);
  await page.waitForFunction(() => document.body.dataset.xmlBuilderViewportReady === '1');
  await page.locator('[data-xml-compare-universal-categorizer-open]').click();
  await expect(page.locator('[data-xml-compare-universal-categorizer-popup]')).toHaveCount(1);
  return page.locator('[data-xml-compare-universal-categorizer-popup]');
}

async function cleanFixture(page, query = '') {
  await page.goto(`${FIXTURE}${query}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.xmlBuilderViewportReady === '1');
}

test.describe('XML Builder Workbench Viewport', () => {
  test('XMLB-VP-B01 — launcher opens one loaded lifecycle', async ({ page }) => {
    const popup = await openFixture(page);
    await expect(popup.getByText('Loaded preview', { exact: true }).first()).toBeVisible();
    await expect(popup.locator('[data-uxc-viewport-shell]')).toHaveCount(1);
    await expect(popup.locator('[data-uxc-surface="tree"]')).toHaveCount(1);
    await expect(popup.locator('[data-uxc-surface="pivot"]')).toHaveCount(1);
    const lifecycle = await page.evaluate(() => ({
      mountId: window.__xmlBuilderViewport.lifecycle().mountId,
      status: window.__xmlBuilderViewport.lifecycle().context.status,
      hosts: Object.keys(window.__xmlBuilderViewport.lifecycle().hosts).length,
    }));
    expect(lifecycle.status).toBe('loaded');
    expect(lifecycle.hosts).toBe(2);
  });

  test('XMLB-VP-B02 — no data is visibly labelled sample', async ({ page }) => {
    const popup = await openFixture(page, '?sample=1');
    await expect(popup.getByText('Sample preview', { exact: true }).first()).toBeVisible();
    const status = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().context.status);
    expect(status).toBe('sample');
  });

  test('XMLB-VP-B03 — Tree and Pivot controls keep independent axes', async ({ page }) => {
    await cleanFixture(page);
    const popup = await openFixture(page);
    await popup.getByRole('button', { name: 'X +' }).click();
    await popup.getByRole('button', { name: 'Y +' }).click();
    const treeBeforePivot = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().hosts.tree.readViewTransform());
    expect(treeBeforePivot.zoomX).toBeGreaterThan(1);
    expect(treeBeforePivot.zoomY).toBeGreaterThan(1);
    await popup.getByRole('tab', { name: 'Pivot' }).click();
    const pivotBefore = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().hosts.pivot.readViewTransform());
    await popup.getByRole('button', { name: 'X +' }).click();
    const views = await page.evaluate(() => ({
      tree: window.__xmlBuilderViewport.lifecycle().hosts.tree.readViewTransform(),
      pivot: window.__xmlBuilderViewport.lifecycle().hosts.pivot.readViewTransform(),
    }));
    expect(views.pivot.zoomX).toBeGreaterThan(pivotBefore.zoomX);
    expect(views.tree.zoomX).toBe(treeBeforePivot.zoomX);
    expect(views.tree.zoomY).toBe(treeBeforePivot.zoomY);
  });

  test('XMLB-VP-B04 — Custom Range validates and Auto Fit restores', async ({ page }) => {
    const popup = await openFixture(page);
    await popup.getByRole('button', { name: 'Custom Range' }).click();
    const palette = popup.locator('[data-uxc-range-palette]');
    await palette.locator('[name="minX"]').fill('0');
    await palette.locator('[name="maxX"]').fill('3');
    await palette.locator('[name="minY"]').fill('0');
    await palette.locator('[name="maxY"]').fill('2');
    await palette.getByRole('button', { name: 'Apply' }).click();
    const ranged = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().hosts.tree.readViewTransform());
    expect(ranged.scaleMode).toBe('custom-range');
    await popup.getByRole('button', { name: 'Auto Fit' }).click();
    const fitted = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().hosts.tree.readViewTransform());
    expect(fitted.scaleMode).toBe('auto-fit');
  });

  test('XMLB-VP-B05 — Tree selection reveals matching Pivot rows', async ({ page }) => {
    const popup = await openFixture(page);
    const treeRow = popup.locator('[data-uxc-tree-id^="tree:element:"]').first();
    await treeRow.click();
    await popup.getByRole('tab', { name: 'Side by Side' }).click();
    await expect(popup.locator('[data-uxc-pivot-id].is-selected')).toHaveCount(1);
    await expect(popup.locator('.uxc-viewport-inspector')).toContainText('Element');
  });

  test('XMLB-VP-B06 — Pivot selection reveals matching Tree node', async ({ page }) => {
    const popup = await openFixture(page);
    await popup.getByRole('tab', { name: 'Pivot' }).click();
    const pivotRow = popup.locator('[data-uxc-pivot-id]').first();
    await pivotRow.click();
    await popup.getByRole('tab', { name: 'Side by Side' }).click();
    await expect(popup.locator('[data-uxc-tree-id].is-selected')).toHaveCount(1);
  });

  test('XMLB-VP-B07 — mode and viewport persist per context', async ({ page }) => {
    await cleanFixture(page);
    let popup = await openFixture(page);
    await popup.getByRole('tab', { name: 'Pivot' }).click();
    await popup.getByRole('button', { name: 'X +' }).click();
    const zoomA = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().hosts.pivot.readViewTransform().zoomX);
    await popup.getByRole('button', { name: 'Close' }).click();
    await page.locator('[data-xml-compare-universal-categorizer-open]').click();
    popup = page.locator('[data-xml-compare-universal-categorizer-popup]');
    await expect(popup.getByRole('tab', { name: 'Pivot' })).toHaveAttribute('aria-selected', 'true');
    const reopened = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().hosts.pivot.readViewTransform().zoomX);
    expect(reopened).toBe(zoomA);
    await page.goto(`${FIXTURE}?dataset=b`);
    await page.waitForFunction(() => document.body.dataset.xmlBuilderViewportReady === '1');
    await page.locator('[data-xml-compare-universal-categorizer-open]').click();
    const datasetB = await page.evaluate(() => ({
      mode: window.__xmlBuilderViewport.lifecycle().state.mode,
      zoom: window.__xmlBuilderViewport.lifecycle().hosts.pivot.readViewTransform().zoomX,
    }));
    expect(datasetB.mode).toBe('tree');
    expect(datasetB.zoom).toBe(1);
  });

  test('XMLB-VP-B08 — Diagnostics and export remain read only', async ({ page }) => {
    const popup = await openFixture(page);
    await popup.getByRole('tab', { name: 'Diagnostics' }).click();
    await expect(popup.getByText('Read-only diagnostics')).toBeVisible();
    await expect(popup.getByText('XML export locked').first()).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Export XML' })).toBeDisabled();
  });

  test('XMLB-VP-B09 — repeated open and close are deterministic', async ({ page }) => {
    let popup = await openFixture(page);
    const firstMount = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().mountId);
    await page.evaluate(() => window.__xmlBuilderViewport.open());
    popup = page.locator('[data-xml-compare-universal-categorizer-popup]');
    await expect(popup).toHaveCount(1);
    const secondMount = await page.evaluate(() => window.__xmlBuilderViewport.lifecycle().mountId);
    expect(secondMount).toBeGreaterThan(firstMount);
    await expect(popup.locator('[data-uxc-viewport-shell]')).toHaveCount(1);
    await popup.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('[data-xml-compare-universal-categorizer-popup]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__xmlBuilderViewport.lifecycle())).toBeNull();
  });
});
