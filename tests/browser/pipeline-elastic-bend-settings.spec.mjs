import { expect, test } from '@playwright/test';

const FIXTURE = '/tests/browser/pipeline-table-paste-sample-fixture.html';

async function open(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(FIXTURE);
  await page.waitForFunction(() => document.body.dataset.pipelineTablePasteSampleReady === '1');
  await expect(page.locator('[data-p3d-elastic-open]')).toHaveText('Bend Settings');
  return errors;
}

async function configureForFixture(page) {
  await page.locator('[data-p3d-elastic-open]').click();
  const settings = page.locator('[data-p3d-elastic-page]');
  await expect(settings).toBeVisible();
  await expect(settings).toContainText('Screening only');
  await expect(settings).toContainText('Table 3 remains marker-only');
  await settings.locator('[data-p3d-elastic-field="enabled"]').check();
  await settings.locator('[data-p3d-elastic-field="emitToInputXml"]').check();
  await settings.locator('[data-p3d-elastic-field="screeningOnlyAcknowledged"]').check();
  await settings.locator('[data-p3d-elastic-field="diameterBasisConfirmed"]').check();
  await settings.locator('[data-p3d-elastic-field="useFormulaMinimum"]').uncheck();
  await settings.locator('[data-p3d-elastic-field="usePracticalMinimum"]').check();
  await settings.locator('[data-p3d-elastic-field="practicalRadiusMultiplierD"]').fill('1.5');
  await settings.locator('[data-p3d-elastic-field="maximumTurnAngleDeg"]').fill('179');
  await settings.locator('[data-p3d-elastic-field="maximumTangentUtilization"]').fill('0.49');
  await settings.locator('[data-p3d-elastic-action="preview"]').click();
  await expect(settings.locator('[data-p3d-elastic-status]')).toContainText('candidate(s)');
  await expect(settings.locator('[data-p3d-elastic-result] tbody tr').first()).not.toContainText('No direction-change candidates');
  return settings;
}

function bendEvidence(xml) {
  return [...String(xml).matchAll(/<BEND RADIUS="([\d.]+)" TYPE="([\d.-]+)"/g)]
    .map((match) => ({ radius: Number(match[1]), type: Number(match[2]) }));
}

test.describe('Pipeline elastic bend settings', () => {
  test('P3D-ELASTIC-B01 settings page screens candidates and emits resolved BEND records', async ({ page }) => {
    const errors = await open(page);
    await page.locator('[data-p3d="new-multisheet"]').click();
    const settings = await configureForFixture(page);
    await settings.locator('[data-p3d-elastic-action="save"]').click();
    await settings.locator('[data-p3d-elastic-action="close"]').click();

    const xml = await page.locator('[data-p3d="xml-output"]').textContent();
    const bends = bendEvidence(xml);
    expect(bends.length).toBeGreaterThan(0);
    expect(bends.every((bend) => bend.radius > 0 && bend.type === 0)).toBe(true);
    expect((String(xml).match(/<PIPINGELEMENT\b/g) || []).length).toBeGreaterThan(bends.length);

    const warningLog = page.locator('[data-p3d-warning-log]');
    await warningLog.evaluate((element) => { element.open = true; });
    await expect(warningLog).toContainText('elastic_bend_screening_only');
    expect(errors).toEqual([]);
  });

  test('P3D-ELASTIC-B02 Table 3 marker edits cannot alter elastic bend radius/count', async ({ page }) => {
    const errors = await open(page);
    await page.locator('[data-p3d="new-multisheet"]').click();
    const settings = await configureForFixture(page);
    await settings.locator('[data-p3d-elastic-action="save"]').click();
    await settings.locator('[data-p3d-elastic-action="close"]').click();
    const before = bendEvidence(await page.locator('[data-p3d="xml-output"]').textContent());
    expect(before.length).toBeGreaterThan(0);

    const markerCell = page.locator('[data-p3d-split-preview="table3c-raw"] [data-p3d-split-cell="0:1"]');
    await markerCell.fill('PMS-ELASTIC-RENAMED');
    await page.locator('[data-p3d="run"]').click();
    const after = bendEvidence(await page.locator('[data-p3d="xml-output"]').textContent());
    expect(after).toEqual(before);
    await expect(page.locator('[data-p3d="coordinate-output"]')).toContainText('PMS-ELASTIC-RENAMED');
    expect(errors).toEqual([]);
  });
});
