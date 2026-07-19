import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const fixture = (name) => new URL(`../fixtures/revision-compare/${name}`, import.meta.url);

async function upload(page, slot, name) {
  const buffer = await readFile(fixture(name));
  await page.locator(`[data-revc-file="${slot}"]`).setInputFiles({
    name,
    mimeType: 'application/json',
    buffer,
  });
}

async function installWebglHarness(page, failSvg = false) {
  await page.evaluate(({ failSvgMount }) => {
    window.rcSvgCertificationLog = {
      selections: [],
      fitAll: 0,
      fitSelected: 0,
      disposed: 0,
      modes: [],
    };
    const viewerFactory = async (host) => {
      const canvas = document.createElement('canvas');
      canvas.dataset.revcSvgCertificationWebgl = '1';
      host.appendChild(canvas);
      return {
        reattach(nextHost) {
          if (canvas.parentElement !== nextHost) nextHost.appendChild(canvas);
        },
        setModels() {},
        setStatuses() {},
        setMode(mode) { window.rcSvgCertificationLog.modes.push(mode); },
        setVerticalAxis() {},
        setSelection(primary, related = []) {
          window.rcSvgCertificationLog.selections.push([primary, ...related].filter(Boolean));
        },
        fitAll() { window.rcSvgCertificationLog.fitAll += 1; },
        fitSelection() { window.rcSvgCertificationLog.fitSelected += 1; },
        getStateSnapshot() {
          return { backend: 'WEBGL', mode: window.rcSvgCertificationLog.modes.at(-1) ?? 'overlay' };
        },
        dispose() {
          window.rcSvgCertificationLog.disposed += 1;
          canvas.remove();
        },
      };
    };
    const viewerAdapterOptions = { viewerFactory };
    if (failSvgMount) {
      viewerAdapterOptions.svgViewerFactory = async () => {
        throw new Error('forced SVG certification failure');
      };
    }
    window.rcMountOptions = { viewerAdapterOptions };
  }, { failSvgMount: failSvg });
}

async function openAndCompare(page, options = {}) {
  await page.goto('/tests/browser/revision-compare-rc001.html');
  await installWebglHarness(page, options.failSvg);
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

async function immutableDomainEvidence(page) {
  return page.evaluate(() => {
    const state = window.rcHandle.evidence().state;
    return {
      auditId: state.compare.audit.auditId,
      auditBasisId: state.compare.auditBasisId,
      review: structuredClone(state.review.session),
      decision: structuredClone(state.decision.ledger),
    };
  });
}

async function svgFitCounts(page) {
  return page.evaluate(() => structuredClone(window.rcHandle.evidence().viewer.viewer.fitCounts));
}

test('RC-SVG-001A real SVG overlay preserves evidence, selection, fit and backend lifecycle', async ({ page }) => {
  await openAndCompare(page);
  const webgl = page.getByRole('button', { name: '3D (WebGL)' });
  const svg = page.getByRole('button', { name: 'SVG preview' });
  const sideBySide = page.getByRole('button', { name: 'Side-by-side' });
  const webglCanvas = page.locator('[data-revc-svg-certification-webgl]');
  const svgRoot = page.locator('[data-revc-svg-overlay-root="1"]');

  await expect(webgl).toHaveAttribute('aria-pressed', 'true');
  await expect(webglCanvas).toHaveCount(1);
  await expect(svgRoot).toHaveCount(0);
  const beforeSwitch = await immutableDomainEvidence(page);

  await svg.click();
  await expect(svgRoot).toHaveCount(1);
  await expect(svgRoot).toHaveAttribute('aria-label', 'Revision comparison SVG overlay preview');
  await expect(webglCanvas).toHaveCount(0);
  await expect(sideBySide).toBeDisabled();
  await expect(page.locator('.revc-backend-note')).toContainText('linked SVG panes are planned for RC-SVG-001B');

  const statusEvidence = await page.evaluate(() => {
    const state = window.rcHandle.evidence().state;
    const expected = [...new Set(Object.values(state.compare.audit.visualModels.statusByObjectId))].sort();
    const nodes = [...document.querySelectorAll('[data-revc-diff-status]')];
    return {
      expected,
      rendered: [...new Set(nodes.map((node) => node.getAttribute('data-revc-diff-status')))].sort(),
      labelled: nodes.every((node) => /; status:/.test(node.getAttribute('aria-label') ?? '')),
      rootCount: document.querySelectorAll('[data-revc-svg-overlay-root="1"]').length,
    };
  });
  expect(statusEvidence.rendered).toEqual(statusEvidence.expected);
  expect(statusEvidence.labelled).toBe(true);
  expect(statusEvidence.rootCount).toBe(1);

  const ambiguous = await page.evaluate(() => {
    const state = window.rcHandle.evidence().state;
    const row = state.compare.audit.differenceRows.find((item) => item.matchCertainty === 'AMBIGUOUS');
    return {
      differenceId: row.differenceId,
      sourceObjectId: row.visualRefs.sourceObjectId,
    };
  });
  await page.locator(`[data-revc-difference-id="${ambiguous.differenceId}"]`).click();
  await expect.poll(() => page.evaluate(() => (
    window.rcHandle.evidence().viewer.viewer.selectedIds[0]
  ))).toBe(ambiguous.sourceObjectId);

  const fitsBeforeNavigation = await svgFitCounts(page);
  await page.getByRole('button', { name: 'Next candidate' }).click();
  await expect.poll(() => page.evaluate(() => (
    window.rcHandle.evidence().viewer.viewer.selectedIds.length
  ))).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Previous candidate' }).click();
  const nextPriority = page.getByRole('button', { name: 'Next priority' });
  if (await nextPriority.count()) await nextPriority.click();
  expect(await svgFitCounts(page)).toEqual(fitsBeforeNavigation);

  await page.getByRole('button', { name: 'Fit selected' }).click();
  await expect.poll(() => svgFitCounts(page)).toEqual({
    ...fitsBeforeNavigation,
    selection: fitsBeforeNavigation.selection + 1,
  });
  const afterSelected = await svgFitCounts(page);
  await page.getByRole('button', { name: 'Fit all' }).click();
  await expect.poll(() => svgFitCounts(page)).toEqual({
    ...afterSelected,
    all: afterSelected.all + 1,
  });

  expect(await immutableDomainEvidence(page)).toEqual(beforeSwitch);
  await webgl.click();
  await expect(webglCanvas).toHaveCount(1);
  await expect(svgRoot).toHaveCount(0);
  await expect(sideBySide).toBeEnabled();
  await sideBySide.click();
  await expect.poll(() => page.evaluate(() => (
    window.rcHandle.evidence().state.compare.presentationMode
  ))).toBe('side-by-side');
  expect(await immutableDomainEvidence(page)).toEqual(beforeSwitch);

  await svg.click();
  await expect(svgRoot).toHaveCount(1);
  await expect(webglCanvas).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    window.rcHandle.evidence().viewer.presentationMode
  ))).toBe('overlay');
  expect(await immutableDomainEvidence(page)).toEqual(beforeSwitch);

  await page.getByRole('button', { name: 'Close Revision Compare' }).first().click();
  await expect(svgRoot).toHaveCount(0);
  await expect(webglCanvas).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Revision Compare' }).click();
  await expect(page.locator('.revc-dialog')).toHaveCount(1);
  await expect(svgRoot).toHaveCount(0);
});

test('RC-SVG-001A failed SVG mount leaves review usable and recovers to WebGL', async ({ page }) => {
  await openAndCompare(page, { failSvg: true });
  const queueCount = await page.locator('[data-revc-difference-id]').count();
  expect(queueCount).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'SVG preview' }).click();
  await expect(page.getByText('SVG preview unavailable').first()).toBeVisible();
  await expect(page.locator('[data-revc-difference-id]')).toHaveCount(queueCount);
  await expect(page.locator('[data-revc-svg-overlay-root="1"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to 3D (WebGL)' }).first().click();
  await expect(page.locator('[data-revc-svg-certification-webgl]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (
    window.rcHandle.evidence().state.compare.viewerBackend
  ))).toBe('WEBGL');
});
