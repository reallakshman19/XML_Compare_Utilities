import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// An actual browser click-through of the application tab, not a standalone
// engineering-rule renderer. Source text is synthetic; confidential real user
// uploads are intentionally never committed to this public test repository.
test('Option B: upload → audit identity → Tab 1 → Tab 3 exports → Tab 2 without transfer authority', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/browser/option-b-three-tab-fixture.html');
  await expect(page.locator('html[data-option-b-ready="1"]')).toHaveCount(1);

  const combinedXml = '<IsoNoteXml profileId="iso-note-ps-mapping-s1-iso-notes-s2/v1">' +
    '<IsoPartition key="PS_MAPPING_S1">' +
    '<IsoItem key="s1" sourceRefs="S1:1"><pipe>PIPE-1/B4</pipe><psNo>PS-006.5</psNo>' +
    '<dtxr>PIPE REST XRT01</dtxr><supportGap></supportGap></IsoItem></IsoPartition>' +
    '<IsoPartition key="ISO_NOTES_S2">' +
    '<IsoItem key="s2" sourceRefs="S2:1"><lineNoInCii>/PIPE-1/B4</lineNoInCii>' +
    '<nodeName>/PS-006.5</nodeName><rawNote>/PS-006.5/DATUM :ISONOTE REST(2kN) [25mm GAP]</rawNote></IsoItem>' +
    '<IsoItem key="s3" sourceRefs="S2:2"><lineNoInCii>/PIPE-8</lineNoInCii>' +
    '<nodeName>/PS-006.5</nodeName><rawNote>/PS-006.5 :ISONOTE REST(2kN)</rawNote></IsoItem>' +
    '</IsoPartition></IsoNoteXml>';
  const bytes = Buffer.from(combinedXml, 'utf8');

  await page.locator('[data-xml-compare-load="a"]').setInputFiles({
    name: 'mapping-source.xml', mimeType: 'application/xml', buffer: bytes,
  });
  await expect(page.locator('textarea[data-xml-compare-field="textA"]')).toHaveValue(combinedXml);
  await page.locator('[data-xml-compare-load="b"]').setInputFiles({
    name: 'notes-target.xml', mimeType: 'application/xml', buffer: bytes,
  });
  await expect(page.locator('textarea[data-xml-compare-field="textB"]')).toHaveValue(combinedXml);

  await page.locator('[data-xml-compare-action="compare-iso-note-mapping"]').click();
  await expect(page.locator('button[data-xml-compare-action="open-transfer-modal"]')).toContainText('0 approved');

  await page.locator('button[data-xml-compare-action="open-transfer-modal"]').click();
  const dialog = page.locator('dialog.xml-compare-transfer-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-xml-compare-modal-tab="candidate-review"]')).toBeVisible();
  await expect(dialog.locator('[data-tab-target="candidate-review"]')).toHaveClass(/is-active/);

  await dialog.locator('[data-tab-target="rev-compare"]').click();
  await expect(dialog.locator('[data-xml-compare-modal-tab="rev-compare"]')).toBeVisible();
  await expect(dialog.locator('[data-xmlc-rev-compare-mode="iso-note-engineering"]')).toHaveCount(1);
  await expect(dialog.getByText('Engineering delta grid', { exact: false }).first()).toBeVisible();

  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    dialog.locator('[data-xml-compare-action="export-rev-compare-json"]').click(),
  ]);
  expect(jsonDownload.suggestedFilename()).toBe('iso-note-engineering-audit.json');
  const audit = JSON.parse(await readFile(await jsonDownload.path(), 'utf8'));
  expect(audit.mode).toBe('iso-note-engineering');
  expect(audit.readOnly).toBe(true);
  expect(audit.summary.identityMatches).toBe(1);
  expect(audit.summary.s2Only).toBe(1);
  expect(audit.summary.gapReviews).toBe(1);
  expect(audit.snapshots.source.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(audit.comparisonId).toMatch(/^cmp:sha256:/);
  expect(audit.findings.some(f => f.s1Ref === 'S1:1' && f.s2Ref === 'S2:1')).toBe(true);

  const [csvDownload] = await Promise.all([
    page.waitForEvent('download'),
    dialog.locator('[data-xml-compare-action="export-rev-compare-csv"]').click(),
  ]);
  expect(csvDownload.suggestedFilename()).toBe('iso-note-engineering-findings.csv');
  const csv = await readFile(await csvDownload.path(), 'utf8');
  expect(csv).toContain('Logical Finding Key');
  expect(csv).toContain(audit.comparisonId);
  expect(csv).toContain('S1:1');
  expect(csv).toContain('S2:1');

  await dialog.locator('[data-tab-target="transfer-compare"]').click();
  await expect(dialog.locator('[data-xml-compare-modal-tab="transfer-compare"]')).toBeVisible();
  await expect(dialog.locator('[data-xml-compare-modal-tab="transfer-compare"]'))
    .toHaveAttribute('data-transfer-evidence', 'none');
  await expect(page.locator('button[data-xml-compare-action="open-transfer-modal"]')).toContainText('0 approved');
  expect(errors).toEqual([]);
});
