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


test('PS Mapping candidate columns and Table-2 REST clearance are displayed and exported correctly', async ({ page }) => {
  await page.goto('/tests/fixtures/psmap-csv-upload.html');
  await page.locator('[data-psmap-action="open"]').first().click();
  const source=page.locator('[data-psmap-panel="source"]');
  const t1=[
    'Line No\tNode\tSupport No\tPipe size\tISONOTE\tMandatory',
    '/ASIM-1885-PL-3"-S8810109-91261M7-01\t5790\t/PS-123.1\t2\t://PS-123.1 :ISONOTE \x27DO NOT REST [25mm GAP](1kN), GUIDE(1kN), [GUIDE GAP=10mm]\x27\tYes',
  ].join('\n').replace(/\\t/g,'\t').replace(/\\x27/g,"'");
  const t2=[
    'Support No\tBore\tpipe\tDTXR\tSupport Gap\tMandatory',
    'PS-123.3\t80\tASIM-1885-PL-3"-S8810109-91261M7-01\tWEAR PLATE TYPE-421\t\tNo',
    'PS-123.1\t50\tASIM-1885-PL-3"-S8810109-91261M7-01\tGUIDE -TYPE-604A/B\t\tNo',
    'PS-123.2\t50\tASIM-1885-PL-3"-S8810109-91261M7-01\tPipe Rest XRT01\t25mm GAP BETWEEN BOP AND TOS\tNo',
  ].join('\n').replace(/\\t/g,'\t');
  await source.locator('[data-psmap-source="table1CText"]').fill(t1);
  await source.locator('[data-psmap-source="table2Text"]').fill(t2);
  await source.locator('[data-psmap-action="run"]:visible').first().click();
  await page.locator('[data-psmap-tab="candidates"]').click();
  const panel=page.locator('[data-psmap-panel="candidates"]');
  const table=panel.locator('[data-psmap-candidate-table] table');
  await expect(table).toBeVisible();
  const labels=await table.locator('thead th').allTextContents();
  expect(labels.slice(0,19)).toEqual([
    'Model Support No','Reference Node','Reference Support No','Model Restraints',
    'Required at Node','Covered by Model','Reference ISONOTE',
    'Node-wide Action (all mapped rows)','Missing Restraints','Extra Model Restraints',
    'Restraint Verdict','Support Gap','Gap / Clearance Verdict','Mapping Status',
    'Required Model Action','Assessment / Evidence','Model Bore',
    'Model Line Family','Reference Line Family',
  ]);
  const rest=table.locator('tbody tr').filter({hasText:'PS-123.2'}).first();
  const guide=table.locator('tbody tr').filter({hasText:'PS-123.1'}).first();
  await expect(rest.locator('td').nth(11)).toContainText('25mm GAP BETWEEN BOP AND TOS');
  await expect(rest.locator('td').nth(12)).toContainText('REST clearance');
  await expect(rest.locator('td').nth(12)).toContainText('matches');
  await expect(rest.locator('td').nth(10)).toContainText('REST non-contact clearance Match');
  await expect(guide.locator('td').nth(11)).toHaveText('—');
  await expect(guide.locator('td').nth(12)).toContainText('GUIDE gap');
  const downloadPromise=page.waitForEvent('download');
  await panel.locator('[data-psmap-action="exportCandidatesCsv"]').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ps-mapping-candidates-/);
  const { readFile }=await import('node:fs/promises');
  const csv=await readFile(await download.path(),'utf8');
  expect(csv.split(/\r?\n/)[0]).toContain('"Support Gap"');
  expect(csv).toContain('"25mm GAP BETWEEN BOP AND TOS"');
  expect(csv).toContain('"REST_CLEARANCE_EXACT"');
  expect(await page.evaluate(() => window.__smokeErrors || [])).toEqual([]);
});
