import { expect, test } from '@playwright/test';

const FIXTURE = '/tests/browser/pipeline-table-paste-sample-fixture.html';

async function open(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(FIXTURE);
  await page.waitForFunction(() => document.body.dataset.pipelineTablePasteSampleReady === '1');
  return errors;
}

test.describe('Pipeline Table Paste multi-sheet sample', () => {
  test('P3D-PASTE-B01 sample button loads paste data and propagates all raw previews', async ({ page }) => {
    const errors = await open(page);

    await expect(page.locator('[data-p3d-raw-text-group="table2"]')).not.toHaveAttribute('open', '');
    await expect(page.locator('[data-p3d-raw-text-group="table3"]')).not.toHaveAttribute('open', '');

    await page.locator('[data-p3d="new-multisheet"]').click();
    await expect(page.locator('[data-p3d-table-paste-status="table2"]')).toContainText('Transferred 10 row(s)');
    await expect(page.locator('[data-p3d-table-paste-status="table3"]')).toContainText('4 H-length, 2 Z, and 4 marker');

    await expect(page.locator('[data-p3d-table-paste="table2"]')).toHaveValue(/13\+621\.6/);
    await expect(page.locator('[data-p3d-table-paste="table2"]')).toHaveValue(/Handle = 271f6/);
    await expect(page.locator('[data-p3d-table-paste="table3"]')).toHaveValue(/Handle = 2b298/);
    await expect(page.locator('[data-p3d-table-paste="table3"]')).toHaveValue(/Handle = 288c0/);

    await expect(page.locator('[data-p3d-split="table2a-raw"]')).toHaveValue(/1451\.141\t-715\.825 → -650\.258\t65\.567\t13\+621\.6\t240\.17/);
    await expect(page.locator('[data-p3d-split-preview="table2a-raw"] [data-p3d-split-cell="0:0"]')).toHaveValue('1451.141');
    await expect(page.locator('[data-p3d-split-preview="table2a-raw"] [data-p3d-split-cell="0:3"]')).toHaveValue('13+621.6');

    await expect(page.locator('[data-p3d-split="table3a-raw"]')).toHaveValue(/1430\.577\t1445\.249\t1437\.913\t14\.7/);
    await expect(page.locator('[data-p3d-split-preview="table3a-raw"] [data-p3d-split-cell="0:0"]')).toHaveValue('1430.577');
    await expect(page.locator('[data-p3d-split-preview="table3a-raw"] [data-p3d-split-cell="0:3"]')).toHaveValue('14.7');

    await expect(page.locator('[data-p3d-split-preview="table3b-raw"] [data-p3d-split-cell="0:3"]')).toHaveValue('1.5M');
    await expect(page.locator('[data-p3d-split-preview="table3c-raw"] [data-p3d-split-cell="0:0"]')).toHaveValue('1459.416');
    await expect(page.locator('[data-p3d-split-preview="table3c-raw"] [data-p3d-split-cell="0:1"]')).toHaveValue('PMS-001');
    await expect(page.locator('[data-p3d-split-preview="table3c-raw"] [data-p3d-split-cell="3:1"]')).toHaveValue('PMS-004');

    await expect(page.locator('[data-p3d="table2x-output"]')).toContainText('13+621.6');
    await expect(page.locator('[data-p3d="table3x-output"]')).toContainText('HLength Text');
    expect(errors).toEqual([]);
  });
});