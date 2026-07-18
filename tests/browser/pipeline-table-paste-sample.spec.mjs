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

async function loadSample(page) {
  await page.locator('[data-p3d="new-multisheet"]').click();
  await expect(page.locator('[data-p3d-table-paste-status="table2"]')).toContainText('Transferred 10 row(s)');
  await expect(page.locator('[data-p3d-table-paste-status="table3"]')).toContainText('4 H-length, 2 Z, and 4 marker');
}

function coordinateRows(text) {
  return text.split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const [, node, x, y, z, name] = line.split('\t');
    return { node: Number(node), x: Number(x), y: Number(y), z: Number(z), name };
  });
}

test.describe('Pipeline Table Paste multi-sheet sample', () => {
  test('P3D-PASTE-B01 sample button loads paste data and propagates all raw previews', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('[data-p3d-raw-text-group="table2"]')).not.toHaveAttribute('open', '');
    await expect(page.locator('[data-p3d-raw-text-group="table3"]')).not.toHaveAttribute('open', '');
    await loadSample(page);
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

  test('P3D-PROP-B01 raw profile reaches Table 3X, Coordinate Tab and InputXML', async ({ page }) => {
    const errors = await open(page);
    await loadSample(page);
    await page.locator('[data-p3d="run"]').click();

    const table3x = page.locator('[data-p3d="table3x-output"]');
    for (const value of ['14.7', '46.7', '21.2', '20.9', '1.5M', 'A/G', 'PMS-001', 'PMS-004']) {
      await expect(table3x).toContainText(value);
    }

    const coordinate = await page.locator('[data-p3d="coordinate-output"]').textContent();
    const rows = coordinateRows(coordinate || '');
    const pms1 = rows.find((row) => row.name.includes('PMS-001'));
    const pms4 = rows.find((row) => row.name.includes('PMS-004'));
    const buriedEnd = rows.find((row) => row.name.includes('1.5M END'));
    const aboveStart = rows.find((row) => row.name.includes('A/G START'));
    expect(pms1?.z).toBeGreaterThan(238000);
    expect(pms1?.z).toBeLessThan(240000);
    expect(pms4?.z).toBeGreaterThan(240000);
    expect(buriedEnd?.x).toBe(aboveStart?.x);
    expect(buriedEnd?.y).toBe(aboveStart?.y);
    expect((aboveStart?.z || 0) - (buriedEnd?.z || 0)).toBe(2250);
    expect(coordinate).not.toContain('8573374\t-10498846');

    const xml = await page.locator('[data-p3d="xml-output"]').textContent();
    expect(xml).toContain('PMS-001');
    expect(xml).toContain('PMS-004');
    expect(xml).toContain('1.5M END');
    expect(xml).toContain('A/G START');
    const deltas = [...String(xml).matchAll(/DELTA_X="(-?[\d.]+)"[^>]*DELTA_Y="(-?[\d.]+)"[^>]*DELTA_Z="(-?[\d.]+)"/g)]
      .map((match) => Math.hypot(Number(match[1]), Number(match[2]), Number(match[3])));
    expect(Math.max(...deltas)).toBeLessThan(600000);
    expect(errors).toEqual([]);
  });

  test('P3D-PROP-B02 editable raw cells propagate bidirectionally and refresh SVG', async ({ page }) => {
    const errors = await open(page);
    await loadSample(page);
    await page.locator('[data-p3d-raw-text-group="table3"] > summary').click();
    const markerCell = page.locator('[data-p3d-split-preview="table3c-raw"] [data-p3d-split-cell="0:1"]');
    await markerCell.fill('PMS-001A');
    await expect(page.locator('[data-p3d-split="table3c-raw"]')).toHaveValue(/PMS-001A/);

    const depthCell = page.locator('[data-p3d-split-preview="table3b-raw"] [data-p3d-split-cell="0:3"]');
    await depthCell.fill('2.0M');
    await expect(page.locator('[data-p3d-split="table3b-raw"]')).toHaveValue(/2\.0M/);
    await expect(page.locator('[data-p3d-split="table3x-preview"]')).toContainText('2.0M');

    await page.locator('[data-p3d="run"]').click();
    await expect(page.locator('[data-p3d="coordinate-output"]')).toContainText('PMS-001A');
    await expect(page.locator('[data-p3d="xml-output"]')).toContainText('PMS-001A');
    expect(errors).toEqual([]);
  });
});
