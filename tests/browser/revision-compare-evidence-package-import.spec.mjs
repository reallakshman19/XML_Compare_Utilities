import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { revisionCompareEvidencePackageHashMaterial } from '../../tabs/revision-compare/revision-evidence-package.js';
import { sha256Text } from '../../tabs/revision-compare/revision-hash.js';

const fixture = (name) => new URL(`../fixtures/revision-compare/${name}`, import.meta.url);
async function upload(page, slot, name) {
  const buffer = await readFile(fixture(name));
  await page.locator(`[data-revc-file="${slot}"]`).setInputFiles({ name, mimeType: 'application/json', buffer });
}
async function installHarness(page) {
  await page.evaluate(() => {
    window.rcPackageImportHarness = { objectUrls: 0, webglCreated: 0, webglDisposed: 0 };
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (String(blob?.type).includes('json')) window.rcPackageImportHarness.objectUrls += 1;
      return createObjectURL(blob);
    };
    const viewerFactory = async (host) => {
      const canvas = document.createElement('canvas'); canvas.dataset.revcPackageImportWebgl = '1'; host.appendChild(canvas);
      window.rcPackageImportHarness.webglCreated += 1;
      return {
        reattach(next) { if (canvas.parentElement !== next) next.appendChild(canvas); },
        setModels() {}, setStatuses() {}, setVerticalAxis() {}, setMode() {}, setSelection() {}, fitAll() {}, fitSelection() {},
        getStateSnapshot() { return { backend: 'WEBGL', mode: 'overlay', selectedIds: [], fitCounts: { all: 0, selection: 0 } }; },
        dispose() { canvas.remove(); window.rcPackageImportHarness.webglDisposed += 1; },
      };
    };
    window.rcMountOptions = { viewerAdapterOptions: { viewerFactory } };
  });
}
async function openWorkspace(page) {
  await page.getByRole('button', { name: 'Open Revision Compare' }).click();
  await expect(page.locator('.revc-dialog')).toHaveCount(1);
}
async function closeWorkspace(page) {
  await page.getByRole('button', { name: 'Close Revision Compare' }).first().click();
  await expect(page.locator('.revc-dialog')).toHaveCount(0);
}
async function compare(page) {
  await upload(page, 'baseline', 'rc004-rev-a.json');
  await expect(page.locator('[data-slot="baseline"] strong')).toContainText('ready');
  await upload(page, 'candidate', 'rc004-rev-b.json');
  await expect(page.locator('[data-slot="candidate"] strong')).toContainText('ready');
  await page.getByRole('button', { name: 'Approve comparison basis' }).click();
  await page.getByRole('button', { name: 'Run visual comparison' }).click();
  await expect(page.getByRole('heading', { name: 'Guided visual revision review' })).toBeVisible({ timeout: 25_000 });
}
async function rowCatalog(page) {
  return page.evaluate(() => {
    const rows = window.rcHandle.evidence().state.compare.audit.differenceRows;
    return {
      review: rows.find((row) => row.changedProperties?.length && row.matchCertainty !== 'AMBIGUOUS')?.differenceId
        ?? rows.find((row) => row.differenceCategory !== 'UNCHANGED' && row.matchCertainty !== 'AMBIGUOUS')?.differenceId,
      property: rows.find((row) => row.changedProperties?.length && row.matchCertainty !== 'AMBIGUOUS')?.differenceId,
      ambiguous: rows.find((row) => row.matchCertainty === 'AMBIGUOUS')?.differenceId,
    };
  });
}
async function selectRow(page, id) {
  expect(id).toBeTruthy(); await page.locator(`[data-revc-difference-id="${id}"]`).click();
  await expect.poll(() => page.evaluate(() => window.rcHandle.evidence().state.compare.selectedDifferenceId)).toBe(id);
}
async function openLevel(page, level = 2) {
  const details = page.locator(`[data-level="${level}"]`);
  if (!(await details.evaluate((node) => node.open))) await details.locator('summary').click();
}
async function downloadPackage(page) {
  const button = page.locator('[data-revc-download-evidence-package]'); await expect(button).toBeEnabled();
  const before = await page.evaluate(() => window.rcPackageImportHarness.objectUrls);
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const path = await download.path(); const text = await readFile(path, 'utf8');
  expect(await page.evaluate(() => window.rcPackageImportHarness.objectUrls)).toBe(before + 1);
  return { text, value: JSON.parse(text), name: download.suggestedFilename() };
}
async function importPackage(page, name, text) {
  await page.locator('[data-revc-evidence-package-import]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}
async function verifySourceLoadGate(page) {
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function delayedSourceBytes() {
      if (this.name === 'slow-source.json') return new Promise((resolve, reject) => setTimeout(() => original.call(this).then(resolve, reject), 400));
      return original.call(this);
    };
  });
  const buffer = await readFile(fixture('rc004-rev-a.json'));
  await page.locator('[data-revc-file="baseline"]').setInputFiles({ name: 'slow-source.json', mimeType: 'application/json', buffer });
  await expect(page.locator('[data-slot="baseline"] strong')).toContainText('Loading');
  await expect(page.locator('[data-revc-evidence-package-import]')).toBeDisabled();
  await expect(page.locator('[data-revc-evidence-package-import-status]')).toContainText('Cancel the active revision load');
  await page.getByRole('button', { name: 'Cancel load' }).click();
  await expect(page.locator('[data-revc-evidence-package-import]')).toBeEnabled();
}
async function rehash(value) {
  value.contentSha256 = await sha256Text(JSON.stringify(revisionCompareEvidencePackageHashMaterial(value)), webcrypto);
  value.packageId = `revision-evidence-package:${value.contentSha256}`;
  return JSON.stringify(value);
}
async function assertImportedRestrictions(page) {
  for (const selector of [
    '[data-revc-file]', '[data-revc-cancel]', '[data-revc-edit-scope]', '[data-revc-approve-basis]',
    '[data-revc-run-compare]', '[data-revc-cancel-comparison]', '[data-revc-download-session]',
    '[data-revc-download-scope]', '[data-revc-review-import]', '[data-revc-decision-import]',
    '[data-revc-start-new-review]', '[data-revc-start-new-decision]',
  ]) await expect(page.locator(selector)).toHaveCount(0);
}

async function createPackageInWorkspaceA(page) {
  await openWorkspace(page); await compare(page); const rows = await rowCatalog(page);
  expect(rows.review).toBeTruthy(); expect(rows.ambiguous).toBeTruthy();
  await selectRow(page, rows.review); await openLevel(page);
  await page.locator('[data-revc-review-note]').fill('Review evidence before package export');
  await page.getByRole('button', { name: 'Save note' }).click();
  await selectRow(page, rows.ambiguous);
  await page.locator('[data-revc-preview-candidate-index="0"]').click();
  await page.locator('[data-revc-decision-rationale]').fill('Accept persisted candidate before package export');
  await page.getByRole('button', { name: 'Accept candidate' }).click();
  const state = await page.evaluate(() => structuredClone(window.rcHandle.evidence().state));
  const downloaded = await downloadPackage(page); await closeWorkspace(page);
  return { downloaded, audit: state.compare.audit, rows };
}
async function verifyImportedWorkspaceB(page, source) {
  await openWorkspace(page); await expect(page.locator('[data-revc-evidence-package-import]')).toHaveCount(1);
  await importPackage(page, source.downloaded.name, source.downloaded.text);
  await expect(page.getByRole('heading', { name: 'Imported evidence package' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-revc-imported-package-id]')).toHaveText(source.downloaded.value.packageId);
  await expect(page.locator('[data-revc-imported-package-sha]')).toHaveText(source.downloaded.value.contentSha256);
  await expect(page.locator('[data-revc-imported-rev-a-file]')).toHaveText(source.downloaded.value.payload.sessionManifest.revisions.revA.fileName);
  await expect(page.locator('[data-revc-imported-rev-b-file]')).toHaveText(source.downloaded.value.payload.sessionManifest.revisions.revB.fileName);
  await expect(page.locator('[data-revc-package-authenticity-boundary]')).toHaveText('Integrity and authority-chain consistency verified. Package authenticity is not established.');
  const state = await page.evaluate(() => structuredClone(window.rcHandle.evidence().state));
  expect(state.schema).toBe('RevisionCompareWorkspaceState.v7');
  expect(state.evidencePackageImport.schema).toBe('RevisionEvidencePackageImportState.v1');
  expect(state.evidencePackageImport.status).toBe('VERIFIED'); expect(state.evidencePackageImport.authenticityStatus).toBe('NOT_ESTABLISHED');
  expect(state.compare.audit).toEqual(source.audit); expect(state.compare.status).toBe('COMPLETE'); expect(state.compare.reviewVisible).toBe(true);
  expect(state.review.session).toEqual(source.downloaded.value.payload.reviewSession);
  expect(state.decision.ledger).toEqual(source.downloaded.value.payload.decisionLedger);
  await expect(page.locator('[data-revc-svg-overlay-root="1"]')).toHaveCount(1);
  await expect(page.locator('[data-revc-difference-id]')).toHaveCount(source.audit.differenceRows.filter((row) => row.differenceCategory !== 'UNCHANGED').length);
  if (source.rows.property) {
    await selectRow(page, source.rows.property); await openLevel(page);
    await expect(page.locator('[data-engineering-svg-property-key]').first()).toBeVisible(); await openLevel(page, 3);
    const paths = await page.locator('[data-level="3"] code').allTextContents();
    for (const property of source.audit.differenceRows.find((row) => row.differenceId === source.rows.property).changedProperties) {
      if (property.revAEvidencePath) expect(paths).toContain(property.revAEvidencePath);
      if (property.revBEvidencePath) expect(paths).toContain(property.revBEvidencePath);
    }
  }
  await assertImportedRestrictions(page);
}
async function continueImportedReview(page, source) {
  const immediate = await downloadPackage(page); expect(immediate.text).toBe(source.downloaded.text);
  await selectRow(page, source.rows.review); await openLevel(page);
  await page.locator('[data-revc-review-note]').fill('Continued review after verified package import');
  await page.getByRole('button', { name: 'Save note' }).click();
  await selectRow(page, source.rows.ambiguous);
  await page.locator('[data-revc-decision-rationale]').fill('Revoke packaged decision after resumed review');
  await page.getByRole('button', { name: 'Revoke decision' }).click();
  const changed = await downloadPackage(page);
  expect(changed.value.contentSha256).not.toBe(immediate.value.contentSha256);
  expect(changed.value.packageId).not.toBe(immediate.value.packageId);
  expect(changed.value.payload.audit).toEqual(source.audit);
  await page.getByRole('button', { name: '3D (WebGL)', exact: true }).click();
  await expect(page.locator('[data-revc-package-import-webgl="1"]')).toHaveCount(1);
  return changed;
}
async function verifyFailureAndRecoveryWorkspaceC(page, source, changed) {
  await openWorkspace(page); await verifySourceLoadGate(page);
  const urls = await page.evaluate(() => window.rcPackageImportHarness.objectUrls);
  const hashTampered = structuredClone(source.downloaded.value); hashTampered.payload.audit.engineVersion = 'tampered-without-hash';
  await importPackage(page, 'hash-tampered.json', JSON.stringify(hashTampered));
  await expect(page.locator('[data-revc-evidence-package-import-panel]')).toHaveAttribute('data-status', 'failed');
  let state = await page.evaluate(() => structuredClone(window.rcHandle.evidence().state));
  expect(state.compare.audit).toBeNull(); expect(state.basis).toBeNull(); expect(state.review.session).toBeNull(); expect(state.decision.ledger).toBeNull();
  expect(state.evidencePackageImport.status).toBe('FAILED'); expect(state.evidencePackageImport.error).toContain('canonical SHA-256');
  expect((await page.evaluate(() => window.rcHandle.evidence().viewer)).mounted).toBe(false);
  expect(await page.evaluate(() => window.rcPackageImportHarness.objectUrls)).toBe(urls);
  const semantic = structuredClone(source.downloaded.value);
  semantic.payload.scopeBasisManifest.basis.revAContentHash = 'f'.repeat(64);
  await importPackage(page, 'semantic-tampered.json', await rehash(semantic));
  await expect(page.locator('[data-revc-evidence-package-import-status]')).toContainText('source hashes');
  state = await page.evaluate(() => structuredClone(window.rcHandle.evidence().state)); expect(state.compare.audit).toBeNull();
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function delayedText() {
      if (this.name.startsWith('slow-')) return new Promise((resolve, reject) => setTimeout(() => original.call(this).then(resolve, reject), 350));
      return original.call(this);
    };
  });
  await importPackage(page, 'slow-old.json', source.downloaded.text);
  await expect(page.locator('[data-revc-evidence-package-import-panel]')).toHaveAttribute('data-status', 'importing');
  await importPackage(page, 'fast-new.json', changed.text);
  await expect(page.getByRole('heading', { name: 'Imported evidence package' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-revc-imported-package-id]')).toHaveText(changed.value.packageId);
  await page.waitForTimeout(450);
  await expect(page.locator('[data-revc-imported-package-id]')).toHaveText(changed.value.packageId);
  expect((await page.evaluate(() => window.rcHandle.evidence().state.evidencePackageImport.requestGeneration))).toBeGreaterThan(1);
}

test('RC-PKG-002-B01 — verify, import and resume an evidence package', async ({ page }) => {
  await page.goto('/tests/browser/revision-compare-rc001.html'); await installHarness(page);
  const source = await createPackageInWorkspaceA(page);
  await verifyImportedWorkspaceB(page, source);
  const changed = await continueImportedReview(page, source);
  const beforeClose = await page.evaluate(() => ({ viewer: window.rcHandle.evidence().viewer, property: window.rcHandle.evidence().property }));
  expect(beforeClose.viewer.mounted).toBe(true); await closeWorkspace(page);
  const disposedB = await page.evaluate(() => ({ viewer: window.rcHandle.evidence().viewer, property: window.rcHandle.evidence().property }));
  expect(disposedB.viewer.mounted).toBe(false); expect(disposedB.property.disposed).toBe(true);
  expect(await page.evaluate(() => window.rcPackageImportHarness.webglDisposed)).toBe(await page.evaluate(() => window.rcPackageImportHarness.webglCreated));
  await verifyFailureAndRecoveryWorkspaceC(page, source, changed);
  await closeWorkspace(page);
  const disposedC = await page.evaluate(() => window.rcHandle.evidence().viewer); expect(disposedC.mounted).toBe(false);
  await openWorkspace(page); await expect(page.locator('[data-revc-evidence-package-import]')).toHaveCount(1);
  await expect(page.locator('[data-revc-imported-evidence-package], [data-revc-package-import-webgl]')).toHaveCount(0);
  expect(await page.evaluate(() => window.rcPackageImportHarness.webglDisposed)).toBe(await page.evaluate(() => window.rcPackageImportHarness.webglCreated));
  await closeWorkspace(page);
});
