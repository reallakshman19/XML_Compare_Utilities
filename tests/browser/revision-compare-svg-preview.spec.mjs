import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const fixture = (name) => new URL(`../fixtures/revision-compare/${name}`, import.meta.url);

async function upload(page, slot, name) {
  const buffer = await readFile(fixture(name));
  await page.locator(`[data-revc-file="${slot}"]`).setInputFiles({ name, mimeType: 'application/json', buffer });
}

async function installViewerHarness(page, failTargetPane = false) {
  await page.evaluate(async ({ failPane }) => {
    window.rcSvgCertificationLog = { disposed: 0, modes: [] };
    const viewerFactory = async (host) => {
      const canvas = document.createElement('canvas');
      canvas.dataset.revcSvgCertificationWebgl = '1';
      host.appendChild(canvas);
      let mode = 'overlay';
      return {
        reattach(nextHost) { if (canvas.parentElement !== nextHost) nextHost.appendChild(canvas); },
        setModels() {}, setStatuses() {}, setVerticalAxis() {},
        setMode(value) { mode = value; window.rcSvgCertificationLog.modes.push(value); },
        setSelection() {}, fitAll() {}, fitSelection() {},
        getStateSnapshot() { return { backend: 'WEBGL', mode }; },
        dispose() { window.rcSvgCertificationLog.disposed += 1; canvas.remove(); },
      };
    };
    const viewerAdapterOptions = { viewerFactory };
    if (failPane) {
      const viewerModule = await import('/tabs/revision-compare/revision-compare-engineering-svg-viewer.js');
      const svgModule = await import('/core/engineering-svg/index.js');
      viewerAdapterOptions.svgViewerFactory = (host, callbacks) => viewerModule.createRevisionCompareEngineeringSvgViewer(host, {
        ...callbacks,
        workspaceFactory(options) {
          if (options.host.parentElement?.getAttribute('data-revc-svg-pane-shell') === 'B') {
            throw new Error('forced Rev B pane mount failure');
          }
          return svgModule.createEngineeringSvgWorkspace(options);
        },
      });
    }
    window.rcMountOptions = { viewerAdapterOptions };
  }, { failPane: failTargetPane });
}

async function openAndCompare(page, options = {}) {
  await page.goto('/tests/browser/revision-compare-rc001.html');
  await installViewerHarness(page, options.failTargetPane);
  await page.getByRole('button', { name: 'Open Revision Compare' }).click();
  await upload(page, 'baseline', 'rc004-rev-a.json');
  await expect(page.locator('[data-slot="baseline"] strong')).toContainText('ready');
  await upload(page, 'candidate', 'rc004-rev-b.json');
  await expect(page.locator('[data-slot="candidate"] strong')).toContainText('ready');
  await page.getByRole('button', { name: 'Approve comparison basis' }).click();
  await page.getByRole('button', { name: 'Run visual comparison' }).click();
  await expect(page.getByRole('heading', { name: 'Guided visual revision review' }))
    .toBeVisible({ timeout: 25_000 });
}

async function viewerSnapshot(page) {
  return page.evaluate(() => structuredClone(window.rcHandle.evidence().viewer.viewer));
}

async function immutableAudit(page) {
  return page.evaluate(() => {
    const state = window.rcHandle.evidence().state;
    return structuredClone({ basis: state.basis, audit: state.compare.audit });
  });
}

function transform(snapshot, mode) {
  const value = snapshot.viewportHistory[mode];
  return { zoom: value.zoom, panX: value.panX, panY: value.panY };
}

async function pan(page, locator, dx = 60, dy = 25) {
  const box = await locator.boundingBox();
  const start = { x: box.x + (box.width / 2), y: box.y + (box.height / 2) };
  await locator.dispatchEvent('pointerdown', { pointerId: 7, button: 0, clientX: start.x, clientY: start.y });
  await locator.dispatchEvent('pointermove', { pointerId: 7, button: 0, clientX: start.x + dx, clientY: start.y + dy });
  await locator.dispatchEvent('pointerup', { pointerId: 7, button: 0, clientX: start.x + dx, clientY: start.y + dy });
}

async function zoom(page, locator, deltaY = -420) {
  const box = await locator.boundingBox();
  await locator.dispatchEvent('wheel', {
    deltaY,
    clientX: box.x + (box.width * 0.35),
    clientY: box.y + (box.height * 0.65),
  });
}

async function rowEvidence(page, category) {
  return page.evaluate((value) => {
    const row = window.rcHandle.evidence().state.compare.audit.differenceRows
      .find((item) => item.differenceCategory === value);
    return row ? { differenceId: row.differenceId, ids: [row.visualRefs.sourceObjectId, row.visualRefs.targetObjectId].filter(Boolean) } : null;
  }, category);
}

async function selectAndProve(page, category) {
  const evidence = await rowEvidence(page, category);
  expect(evidence).not.toBeNull();
  await page.locator(`[data-revc-difference-id="${evidence.differenceId}"]`).click();
  await expect.poll(() => viewerSnapshot(page).then((value) => value.selectedIds)).toEqual(evidence.ids);
  const selected = page.locator('[data-engineering-svg-entity-id].is-selected:not([data-revc-hidden-fit-authority])');
  await expect(selected).toHaveCount(evidence.ids.length);
  await expect(page.locator('[data-revc-hidden-fit-authority].is-selected')).toHaveCount(0);
}

async function clickCandidate(page, index = 0) {
  await page.locator(`[data-revc-preview-candidate-index="${index}"]`).click();
}

async function acceptAndRevoke(page, differenceId) {
  await page.locator(`[data-revc-difference-id="${differenceId}"]`).click();
  await clickCandidate(page, 0);
  await page.getByRole('button', { name: 'Mark reviewed' }).click();
  const ledgerBeforeReview = await page.evaluate(() => structuredClone(window.rcHandle.evidence().state.decision.ledger.events));
  await expect.poll(() => page.evaluate((id) => window.rcHandle.evidence().state.review.session.items
    .find((item) => item.differenceId === id).reviewState, differenceId)).toBe('REVIEWED');
  expect(await page.evaluate(() => structuredClone(window.rcHandle.evidence().state.decision.ledger.events))).toEqual(ledgerBeforeReview);
  await page.locator('[data-revc-decision-rationale]').fill('Accept persisted candidate for linked-pane certification');
  await page.getByRole('button', { name: 'Accept candidate' }).click();
  await expect.poll(() => page.evaluate((id) => window.rcHandle.evidence().state.decision.ledger.decisions
    .find((item) => item.differenceId === id).decisionState, differenceId)).toBe('ACCEPTED_CANDIDATE');
  expect(await page.evaluate((id) => window.rcHandle.evidence().state.compare.audit.differenceRows
    .find((row) => row.differenceId === id).matchCertainty, differenceId)).toBe('AMBIGUOUS');
  expect(await page.evaluate((id) => window.rcHandle.evidence().state.review.session.items
    .find((item) => item.differenceId === id).reviewState, differenceId)).toBe('REVIEWED');
  await page.locator('[data-revc-decision-rationale]').fill('Revoke persisted candidate for certification');
  await page.getByRole('button', { name: 'Revoke decision' }).click();
  await expect.poll(() => page.evaluate((id) => window.rcHandle.evidence().state.decision.ledger.decisions
    .find((item) => item.differenceId === id).decisionState, differenceId)).toBe('REVOKED');
}

test('RC-SVG-001B links panes, viewport history, exact evidence and backend lifecycle', async ({ page }) => {
  await openAndCompare(page);
  const webgl = page.getByRole('button', { name: '3D (WebGL)' });
  const svg = page.getByRole('button', { name: 'SVG preview' });
  const overlayButton = page.getByRole('button', { name: 'Overlay' });
  const sideButton = page.getByRole('button', { name: 'Side-by-side' });
  const webglCanvas = page.locator('[data-revc-svg-certification-webgl]');
  const overlayRoot = page.locator('[data-revc-svg-overlay-root="1"]');
  const paneRoots = page.locator('[data-revc-svg-pane-root="1"]');
  await expect(webgl).toHaveAttribute('aria-pressed', 'true');
  await expect(webglCanvas).toHaveCount(1);
  await expect(sideButton).toBeEnabled();
  const authoritativeBefore = await immutableAudit(page);

  await svg.click();
  await expect(overlayRoot).toHaveCount(1);
  await expect(paneRoots).toHaveCount(0);
  await expect(webglCanvas).toHaveCount(0);
  const fitsBeforeNavigation = (await viewerSnapshot(page)).fitCounts;
  await pan(page, overlayRoot);
  await zoom(page, overlayRoot);
  const overlayView = transform(await viewerSnapshot(page), 'overlay');
  expect(overlayView.zoom).toBeGreaterThan(1);

  await sideButton.click();
  await expect(overlayRoot).toHaveCount(0);
  await expect(paneRoots).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Rev A · Source' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rev B · Target' })).toBeVisible();
  let snapshot = await viewerSnapshot(page);
  expect(snapshot.mode).toBe('side-by-side');
  expect(snapshot.resources).toEqual({ roots: 2, observers: 1, selectionSubscriptions: 2, viewportListeners: 12 });
  expect(snapshot.visibleEntityCounts.source).toBeGreaterThan(0);
  expect(snapshot.visibleEntityCounts.target).toBeGreaterThan(0);
  expect(snapshot.hiddenFitAuthorityCounts.source).toBe(snapshot.visibleEntityCounts.target);
  expect(snapshot.hiddenFitAuthorityCounts.target).toBe(snapshot.visibleEntityCounts.source);
  await expect(page.locator('[data-revc-hidden-fit-authority]')).toHaveCount(
    snapshot.hiddenFitAuthorityCounts.source + snapshot.hiddenFitAuthorityCounts.target,
  );
  expect(await paneRoots.nth(0).getAttribute('viewBox')).toBe(await paneRoots.nth(1).getAttribute('viewBox'));

  await pan(page, paneRoots.nth(0), 50, -20);
  await zoom(page, paneRoots.nth(1), -360);
  const sideView = transform(await viewerSnapshot(page), 'side-by-side');
  expect(sideView.zoom).toBeGreaterThan(1);
  expect(await paneRoots.nth(0).getAttribute('viewBox')).toBe(await paneRoots.nth(1).getAttribute('viewBox'));

  await selectAndProve(page, 'CHANGED');
  await selectAndProve(page, 'ADDED');
  await selectAndProve(page, 'REMOVED');
  const ambiguous = await page.evaluate(() => {
    const row = window.rcHandle.evidence().state.compare.audit.differenceRows.find((item) => item.matchCertainty === 'AMBIGUOUS');
    return { differenceId: row.differenceId, sourceId: row.visualRefs.sourceObjectId };
  });
  await page.locator(`[data-revc-difference-id="${ambiguous.differenceId}"]`).click();
  const viewBeforeCandidate = transform(await viewerSnapshot(page), 'side-by-side');
  await page.getByRole('button', { name: 'Next candidate' }).click();
  await page.getByRole('button', { name: 'Previous candidate' }).click();
  snapshot = await viewerSnapshot(page);
  expect(snapshot.fitCounts).toEqual(fitsBeforeNavigation);
  expect(transform(snapshot, 'side-by-side')).toEqual(viewBeforeCandidate);
  expect(snapshot.selectedIds.length).toBeGreaterThan(1);

  await page.getByRole('button', { name: 'Fit selected' }).click();
  snapshot = await viewerSnapshot(page);
  expect(snapshot.fitCounts.selection).toBe(fitsBeforeNavigation.selection + 1);
  expect(snapshot.fitCounts.all).toBe(fitsBeforeNavigation.all);
  await page.getByRole('button', { name: 'Fit all' }).click();
  snapshot = await viewerSnapshot(page);
  expect(snapshot.fitCounts.all).toBe(fitsBeforeNavigation.all + 1);
  expect(snapshot.fitCounts.selection).toBe(fitsBeforeNavigation.selection + 1);

  await overlayButton.click();
  await expect(overlayRoot).toHaveCount(1);
  expect(transform(await viewerSnapshot(page), 'overlay')).toEqual(overlayView);
  await sideButton.click();
  await expect(paneRoots).toHaveCount(2);
  expect(transform(await viewerSnapshot(page), 'side-by-side')).toEqual({ zoom: 1, panX: 0, panY: 0 });
  await pan(page, paneRoots.nth(0), 35, 10);
  const restoredSide = transform(await viewerSnapshot(page), 'side-by-side');
  await webgl.click();
  await expect(webglCanvas).toHaveCount(1);
  await expect(paneRoots).toHaveCount(0);
  await svg.click();
  await expect(paneRoots).toHaveCount(2);
  expect(transform(await viewerSnapshot(page), 'side-by-side')).toEqual(restoredSide);

  await acceptAndRevoke(page, ambiguous.differenceId);
  expect(await immutableAudit(page)).toEqual(authoritativeBefore);
  await page.getByRole('button', { name: 'Close Revision Compare' }).first().click();
  await expect(paneRoots).toHaveCount(0);
  await expect(overlayRoot).toHaveCount(0);
  await expect(webglCanvas).toHaveCount(0);
  for (let index = 0; index < 2; index += 1) {
    await page.getByRole('button', { name: 'Open Revision Compare' }).click();
    await expect(page.locator('.revc-dialog')).toHaveCount(1);
    await page.getByRole('button', { name: 'Close Revision Compare' }).first().click();
    await expect(page.locator('[data-engineering-svg-root]')).toHaveCount(0);
  }
});

test('RC-SVG-001B target-pane failure cleans both panes and recovers explicitly', async ({ page }) => {
  await openAndCompare(page, { failTargetPane: true });
  const queueCount = await page.locator('[data-revc-difference-id]').count();
  await page.getByRole('button', { name: 'SVG preview' }).click();
  await expect(page.locator('[data-revc-svg-overlay-root="1"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Side-by-side' }).click();
  await expect(page.getByText('SVG preview unavailable.').first()).toBeVisible();
  await expect(page.locator('[data-revc-svg-pane-root]')).toHaveCount(0);
  await expect(page.locator('[data-revc-svg-overlay-root]')).toHaveCount(0);
  await expect(page.locator('[data-revc-difference-id]')).toHaveCount(queueCount);
  expect(await page.evaluate(() => window.rcHandle.evidence().state.compare.viewerBackend)).toBe('SVG');
  await page.getByRole('button', { name: 'Return to 3D (WebGL)' }).first().click();
  await expect(page.locator('[data-revc-svg-certification-webgl]')).toHaveCount(1);
  await expect(page.locator('[data-engineering-svg-root]')).toHaveCount(0);
  expect(await page.evaluate(() => window.rcHandle.evidence().state.compare.viewerBackend)).toBe('WEBGL');
});
