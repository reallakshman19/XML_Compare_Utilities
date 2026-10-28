import { test, expect } from '@playwright/test';

test('PS Mapping: mock CSV icons, independent uploads, malformed CSV preservation and mapping', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/tests/fixtures/psmap-csv-upload.html');
  await page.locator('[data-psmap-action="open"]').first().click();
  const source = page.locator('[data-psmap-panel="source"]');
  await expect(source).toBeVisible();
  const ref = source.locator('[data-psmap-source="table1CText"]');
  const model = source.locator('[data-psmap-source="table2Text"]');
  await expect(source.locator('[data-psmap-csv-pick="table1CText"]')).toBeVisible();
  await expect(source.locator('[data-psmap-csv-pick="table2Text"]')).toBeVisible();
  await expect(source.locator('[data-psmap-csv-mock="table1CText"]')).toBeVisible();
  await expect(source.locator('[data-psmap-csv-mock="table2Text"]')).toBeVisible();

  await source.locator('[data-psmap-csv-mock-both]').click();
  await expect(ref).toHaveValue(/PS-123\.1/);
  await expect(model).toHaveValue(/PS-126\.1/);
  await expect(ref).toHaveValue(/DO NOT REST \[25mm GAP\], GUIDE\(1kN\)/);
  await expect(source.locator('[data-psmap-csv-status="table1CText"]')).toContainText('3 rows');
  await expect(source.locator('[data-psmap-csv-status="table2Text"]')).toContainText('3 rows');

  // CSV quoting must not split ISONOTE commas into extra columns.
  await source.locator('[data-psmap-csv-input="table1CText"]').setInputFiles({
    name: 'reference.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Line No,Node,Support No,Pipe size,ISONOTE,Mandatory\r\n' +
      '"ASIM-1885-PL-8""-S8810109-01",5790,PS-123.1,8,"REST(2kN), GUIDE(1kN)",Yes\r\n'),
  });
  await expect(ref).toHaveValue(/REST\(2kN\), GUIDE\(1kN\)\tYes/);
  await expect(source.locator('[data-psmap-csv-status="table1CText"]')).toContainText('reference.csv');

  await source.locator('[data-psmap-csv-input="table2Text"]').setInputFiles({
    name: 'model.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Support No,Bore,pipe,DTXR,Support Gap,Mandatory\r\n' +
      'PS-123.1,200,"ASIM-1885-PL-8""-S8810109-PP-01",GUIDE PDO-TYPE,10,Yes\r\n'),
  });
  await expect(model).toHaveValue(/PS-123\.1\t200/);
  await expect(source.locator('[data-psmap-csv-status="table2Text"]')).toContainText('model.csv');

  const previousModel = await model.inputValue();
  await source.locator('[data-psmap-csv-input="table2Text"]').setInputFiles({
    name: 'broken.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Support No,Bore,pipe\nPS-1,200\n'),
  });
  await expect(source.locator('[data-psmap-csv-status="table2Text"]')).toContainText('CSV upload failed');
  expect(await model.inputValue()).toBe(previousModel);

  await source.locator('[data-psmap-action="run"]:visible').first().click();
  await page.locator('[data-psmap-tab="ct2"]').click();
  await expect(page.locator('[data-psmap-panel="ct2"]')).toContainText('PS-123.1');
  expect(await page.evaluate(() => window.__smokeErrors || [])).toEqual([]);
});

test('PS Mapping configuration preserves required/optional Linekey selection and invalidates stale results', async ({ page }) => {
  await page.goto('/tests/fixtures/psmap-csv-upload.html');
  await page.locator('[data-psmap-action="open"]').first().click();
  await page.locator('[data-psmap-tab="config"]').click();
  const option = page.locator('[data-psmap-setup="requireLineFamilyInIdentity"]');
  await expect(option).toBeVisible();
  await expect(option).toHaveValue('true');
  await option.selectOption('false');
  await expect(option).toHaveValue('false');
  await page.locator('[data-psmap-tab="setup"]').click();
  await expect(page.locator('[data-psmap-panel="setup"]')).toContainText('Linekey optional');
  await page.locator('[data-psmap-tab="config"]').click();
  await expect(page.locator('[data-psmap-setup="requireLineFamilyInIdentity"]')).toHaveValue('false');
  await page.locator('[data-psmap-action="run"]:visible').first().click();
  await expect(page.locator('[data-psmap-panel="ct2"]')).toBeVisible();
  await page.locator('[data-psmap-tab="config"]').click();
  await option.selectOption('true');
  await page.locator('[data-psmap-tab="setup"]').click();
  await expect(page.locator('[data-psmap-panel="setup"]')).toContainText('Line family + DN + reference node');
  expect(await page.evaluate(() => window.__smokeErrors || [])).toEqual([]);
});
