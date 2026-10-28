import { expect, test } from '@playwright/test';

test('S1/S2 CSV buttons: strict preflight, safe autofix, and non-destructive failure', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/tests/browser/option-b-three-tab-fixture.html');
  await expect(page.locator('html[data-option-b-ready="1"]')).toHaveCount(1);
  await page.locator('[data-xml-compare-table-categorized-open]').click();
  const popup = page.locator('[data-xml-compare-table-categorized-popup]');
  await expect(popup).toBeVisible();
  await expect(popup.getByText('📥 Drag & Drop CSV / TXT File Here')).toBeVisible();
  await expect(popup.locator('[data-table-categorized-action="choose-iso-s1"]')).toBeVisible();
  await expect(popup.locator('[data-table-categorized-action="choose-iso-s2"]')).toBeVisible();

  const s1 = '\uFEFFSupport No\tpipe\tBore\tDTXR\tSupport Gap\tMandatory\n' +
    'PS-124.1\tPIPE-1/B4\t50\tGUIDE XRT\t\tNo\n' +
    'PS02364.1\tPIPE-9\t25\tREST\t\tNo\n';
  await popup.locator('[data-table-categorized-iso-file="S1"]').setInputFiles({
    name: 's1.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from(s1),
  });
  await expect(popup.locator('[data-table-categorized-preflight-role="S1"]')).toContainText('2 rows');
  await expect(popup.locator('[data-table-categorized-preflight-role="S1"]')).toContainText('Safe autofix');
  const afterS1 = await page.evaluate(() => {
    const state = window.__tableCategorizedState;
    return {
      s1: state.sources.find(s => s.sourceId === 'S1'),
      summary: state.importPreflight.S1.summary,
    };
  });
  expect(afterS1.s1.headers[0]).toBe('PS NO');
  expect(afterS1.s1.originalSourceText).toBe(s1);
  expect(afterS1.s1.rows).toHaveLength(2);

  // Deliberately wrong-role upload must leave previously loaded S1 untouched.
  await popup.locator('[data-table-categorized-iso-file="S2"]').setInputFiles({
    name: 'wrong-role.csv', mimeType: 'text/csv',
    buffer: Buffer.from('PS NO,pipe\nPS-124.1,PIPE-1/B4\n'),
  });
  await expect(popup.locator('[data-table-categorized-preflight-role="S2"]')).toContainText('import blocked');
  await expect(popup.locator('[data-table-categorized-preflight-role="S2"]')).toContainText('REQUIRED_COLUMN_MISSING');
  expect(await page.evaluate(() => window.__tableCategorizedState.sources
    .find(s => s.sourceId === 'S1').rows.length)).toBe(2);

  const s2 = 'NODE_NAME,LinenoinCII,SupportISONOTE\n' +
    '"/PS-124.1","/PIPE-1/B4","/PS-124.1 :ISONOTE REST(2kN), GUIDE GAP=10mm"\n' +
    '"/SL-263..4","/PIPE-9","/SL-263..4 :ISONOTE REST(1kN)"\n';
  await popup.locator('[data-table-categorized-iso-file="S2"]').setInputFiles({
    name: 's2.csv', mimeType: 'text/csv', buffer: Buffer.from(s2),
  });
  await expect(popup.locator('[data-table-categorized-preflight-role="S2"]')).toContainText('2 rows');
  const afterBoth = await page.evaluate(() => {
    const state = window.__tableCategorizedState;
    const src = state.sources.find(s => s.sourceId === 'S1');
    const dst = state.sources.find(s => s.sourceId === 'S2');
    return {
      s1Count: src.rows.length, s2Count: dst.rows.length,
      s2Note: dst.rows[0].rawByHeader.SupportISONOTE,
      s2Original: dst.originalSourceText,
      preflight: state.importPreflight.S2,
    };
  });
  expect(afterBoth.s1Count).toBe(2);
  expect(afterBoth.s2Count).toBe(2);
  expect(afterBoth.s2Note).toContain('GUIDE GAP=10mm');
  expect(afterBoth.s2Original).toBe(s2);
  expect(afterBoth.preflight.reviewCount).toBe(1);

  // Native drop handler: selected S1 receives the file, not an arbitrary role.
  await popup.locator('[data-table-categorized-active-source]').selectOption('S1');
  await popup.locator('[data-table-categorized-drop-zone]').evaluate((zone) => {
    const data = new DataTransfer();
    data.items.add(new File(['PS NO,pipe\nPS-999.1,PIPE-A\n'],
      'replacement.csv', { type: 'text/csv' }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  });
  await expect.poll(() => page.evaluate(() => window.__tableCategorizedState.sources
    .find(s => s.sourceId === 'S1').rows[0]?.rawByHeader['PS NO'])).toBe('PS-999.1');
  expect(errors).toEqual([]);
});
