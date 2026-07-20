import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const fixture = (name) => new URL(`../fixtures/revision-compare/${name}`, import.meta.url);
async function upload(page, slot, name) {
  const buffer = await readFile(fixture(name));
  await page.locator(`[data-revc-file="${slot}"]`).setInputFiles({ name, mimeType: 'application/json', buffer });
}
async function installHarness(page, failTarget = false) {
  await page.evaluate(async ({ failPane }) => {
    const webgl = async (host) => {
      const canvas = document.createElement('canvas'); canvas.dataset.revcSvgCertificationWebgl = '1'; host.appendChild(canvas);
      let mode = 'overlay'; let selectedIds = []; const fitCounts = { all: 0, selection: 0 };
      return { reattach(next) { if (canvas.parentElement !== next) next.appendChild(canvas); },
        setModels() {}, setStatuses() {}, setVerticalAxis() {}, setMode(value) { mode = value; },
        setSelection(primary, related = []) { selectedIds = [primary, ...related].filter(Boolean); },
        fitAll() { fitCounts.all += 1; }, fitSelection() { fitCounts.selection += 1; },
        getStateSnapshot() { return { backend: 'WEBGL', mode, selectedIds, fitCounts: { ...fitCounts } }; },
        dispose() { canvas.remove(); } };
    };
    const options = { viewerFactory: webgl };
    if (failPane) {
      const viewer = await import('/tabs/revision-compare/revision-compare-engineering-svg-viewer.js');
      const svg = await import('/core/engineering-svg/index.js');
      options.svgViewerFactory = (host, callbacks) => viewer.createRevisionCompareEngineeringSvgViewer(host, {
        ...callbacks,
        workspaceFactory(input) {
          if (input.host.parentElement?.getAttribute('data-revc-svg-pane-shell') === 'B') throw new Error('forced Rev B pane mount failure');
          return svg.createEngineeringSvgWorkspace(input);
        },
      });
    }
    window.rcMountOptions = { viewerAdapterOptions: options };
  }, { failPane: failTarget });
}
async function openAndCompare(page, failTarget = false) {
  await page.goto('/tests/browser/revision-compare-rc001.html'); await installHarness(page, failTarget);
  await page.getByRole('button', { name: 'Open Revision Compare' }).click();
  await upload(page, 'baseline', 'rc004-rev-a.json');
  await expect(page.locator('[data-slot="baseline"] strong')).toContainText('ready');
  await upload(page, 'candidate', 'rc004-rev-b.json');
  await expect(page.locator('[data-slot="candidate"] strong')).toContainText('ready');
  await page.getByRole('button', { name: 'Approve comparison basis' }).click();
  await page.getByRole('button', { name: 'Run visual comparison' }).click();
  await expect(page.getByRole('heading', { name: 'Guided visual revision review' })).toBeVisible({ timeout: 25_000 });
}
async function snapshot(page) { return page.evaluate(() => structuredClone(window.rcHandle.evidence().viewer.viewer)); }
async function audit(page) { return page.evaluate(() => structuredClone(window.rcHandle.evidence().state.compare.audit)); }
function view(value, mode) { const state = value.viewportHistory[mode]; return { zoom: state.zoom, panX: state.panX, panY: state.panY }; }
async function drag(page, root, dx = 50, dy = 20) {
  const box = await root.boundingBox(); const x = box.x + box.width / 2; const y = box.y + box.height / 2;
  await root.dispatchEvent('pointerdown', { pointerId: 7, button: 0, clientX: x, clientY: y });
  await root.dispatchEvent('pointermove', { pointerId: 7, button: 0, clientX: x + dx, clientY: y + dy });
  await root.dispatchEvent('pointerup', { pointerId: 7, button: 0, clientX: x + dx, clientY: y + dy });
}
async function wheel(page, root) {
  const box = await root.boundingBox();
  await root.dispatchEvent('wheel', { deltaY: -360, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 });
}
async function selectCategory(page, category) {
  const evidence = await page.evaluate((value) => {
    const rows = window.rcHandle.evidence().state.compare.audit.differenceRows.filter((row) => row.differenceCategory === value);
    const row = rows.find((item) => item.matchCertainty !== 'AMBIGUOUS') ?? rows[0];
    return { id: row.differenceId, objects: [row.visualRefs.sourceObjectId, row.visualRefs.targetObjectId].filter(Boolean) };
  }, category);
  await page.locator(`[data-revc-difference-id="${evidence.id}"]`).click();
  await expect.poll(() => snapshot(page).then((value) => value.selectedIds)).toEqual(evidence.objects);
}

test('RC-SVG-001B links panes, viewport history, exact evidence and backend lifecycle', async ({ page }) => {
  await openAndCompare(page);
  const svg = page.getByRole('button', { name: 'Engineering SVG' });
  const webgl = page.getByRole('button', { name: '3D (WebGL)' });
  const overlay = page.locator('[data-revc-svg-overlay-root="1"]');
  const panes = page.locator('[data-revc-svg-pane-root="1"]');
  const canvas = page.locator('[data-revc-svg-certification-webgl]');
  await expect(svg).toHaveAttribute('aria-pressed', 'true'); await expect(overlay).toHaveCount(1);
  const auditBefore = await audit(page); const fits = (await snapshot(page)).fitCounts;
  await drag(page, overlay); await wheel(page, overlay); const overlayHistory = view(await snapshot(page), 'overlay');
  await page.getByRole('button', { name: 'Side-by-side' }).click(); await expect(panes).toHaveCount(2);
  expect((await snapshot(page)).resources).toEqual({ roots: 2, observers: 1, selectionSubscriptions: 2, viewportListeners: 14 });
  await drag(page, panes.nth(0)); await wheel(page, panes.nth(1));
  expect(await panes.nth(0).getAttribute('viewBox')).toBe(await panes.nth(1).getAttribute('viewBox'));
  for (const category of ['CHANGED', 'ADDED', 'REMOVED']) await selectCategory(page, category);
  const ambiguous = await page.evaluate(() => window.rcHandle.evidence().state.compare.audit.differenceRows.find((row) => row.matchCertainty === 'AMBIGUOUS').differenceId);
  await page.locator(`[data-revc-difference-id="${ambiguous}"]`).click(); const beforeCandidate = view(await snapshot(page), 'side-by-side');
  await page.getByRole('button', { name: 'Next candidate' }).click(); await page.getByRole('button', { name: 'Previous candidate' }).click();
  expect((await snapshot(page)).fitCounts).toEqual(fits); expect(view(await snapshot(page), 'side-by-side')).toEqual(beforeCandidate);
  await page.getByRole('button', { name: 'Fit selected' }).click(); await page.getByRole('button', { name: 'Fit all' }).click();
  await page.getByRole('button', { name: 'Overlay' }).click(); expect(view(await snapshot(page), 'overlay')).toEqual(overlayHistory);
  await page.getByRole('button', { name: 'Side-by-side' }).click(); await drag(page, panes.nth(0));
  const linked = view(await snapshot(page), 'side-by-side'); await webgl.click(); await expect(canvas).toHaveCount(1);
  await svg.click(); await expect(panes).toHaveCount(2); expect(view(await snapshot(page), 'side-by-side')).toEqual(linked);
  expect(await audit(page)).toEqual(auditBefore);
  await page.getByRole('button', { name: 'Close Revision Compare' }).first().click();
  await expect(page.locator('[data-engineering-svg-root], [data-revc-svg-certification-webgl]')).toHaveCount(0);
});

test('RC-SVG-001B target-pane failure cleans both panes and recovers explicitly', async ({ page }) => {
  await openAndCompare(page, true); const queueCount = await page.locator('[data-revc-difference-id]').count();
  await page.getByRole('button', { name: 'Side-by-side' }).click();
  await expect(page.getByText('Engineering SVG unavailable.').first()).toBeVisible();
  await expect(page.locator('[data-revc-svg-pane-root], [data-revc-svg-overlay-root], [data-revc-svg-certification-webgl]')).toHaveCount(0);
  await expect(page.locator('[data-revc-difference-id]')).toHaveCount(queueCount);
  await page.getByRole('button', { name: 'Return to 3D (WebGL)' }).first().click();
  await expect(page.locator('[data-revc-svg-certification-webgl]')).toHaveCount(1);
  expect(await page.evaluate(() => window.rcHandle.evidence().state.compare.viewerBackend)).toBe('WEBGL');
});
