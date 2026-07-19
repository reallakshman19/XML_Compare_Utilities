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
  await expect(settings).toContainText('Engineering screening and geometry gate only');
  await expect(settings).toContainText('Table 3 remains marker-only');
  await settings.locator('[data-p3d-elastic-field="enabled"]').check();
  await settings.locator('[data-p3d-elastic-field="emitToInputXml"]').check();
  await settings.locator('[data-p3d-elastic-field="screeningOnlyAcknowledged"]').check();
  await settings.locator('[data-p3d-elastic-field="diameterBasisConfirmed"]').check();
  await settings.locator('[data-p3d-elastic-field="bendClass"]').selectOption('elastic');
  await settings.locator('[data-p3d-elastic-field="useFormulaMinimum"]').uncheck();
  await settings.locator('[data-p3d-elastic-field="usePracticalMinimum"]').check();
  await settings.locator('[data-p3d-elastic-field="practicalRadiusMultiplierD"]').fill('1.5');
  await settings.locator('[data-p3d-elastic-field="maximumTurnAngleDeg"]').fill('179');
  await settings.locator('[data-p3d-elastic-field="retainedStraightAllowanceMm"]').fill('0');
  await settings.locator('[data-p3d-elastic-field="preferredStraightTangentMm"]').fill('0');
  await settings.locator('[data-p3d-elastic-action="preview"]').click();
  await expect(settings.locator('[data-p3d-elastic-status]')).toContainText('candidate(s)');
  await expect(settings.locator('[data-p3d-elastic-status]')).toContainText('0 blocking error(s)');
  await expect(settings.locator('[data-p3d-elastic-result] tbody tr').first()).not.toContainText('No direction-change candidates');
  return settings;
}

function bendEvidence(xml) {
  return [...String(xml).matchAll(/<BEND RADIUS="([\d.]+)" TYPE="([\d.-]+)"[\s\S]*?NUM_MITER="([\d.-]+)"/g)]
    .map((match) => ({ radius: Number(match[1]), type: Number(match[2]), numMiter: Number(match[3]) }));
}

test.describe('Pipeline authoritative bend settings', () => {
  test('P3D-BEND-B01 settings page emits resolved bends with explicit internal nodes', async ({ page }) => {
    const errors = await open(page);
    await page.locator('[data-p3d="new-multisheet"]').click();
    const settings = await configureForFixture(page);
    await settings.locator('[data-p3d-elastic-action="save"]').click();
    await settings.locator('[data-p3d-elastic-action="close"]').click();

    const xml = await page.locator('[data-p3d="xml-output"]').textContent();
    const bends = bendEvidence(xml);
    expect(bends.length).toBeGreaterThan(0);
    expect(bends.every((bend) => bend.radius > 0 && bend.type === 0 && bend.numMiter === 0)).toBe(true);
    expect((String(xml).match(/<PIPINGELEMENT\b/g) || []).length).toBeGreaterThan(bends.length);
    expect(String(xml)).toMatch(/ANGLE1="0" NODE1="\d+"/);
    expect(String(xml)).toMatch(/ANGLE2="[\d.]+" NODE2="\d+"/);

    const warningLog = page.locator('[data-p3d-warning-log]');
    await warningLog.evaluate((element) => { element.open = true; });
    await expect(warningLog).toContainText('bend_screening_only');
    expect(errors).toEqual([]);
  });

  test('P3D-BEND-B02 Table 3 marker edits cannot alter InputXML geometry or bends', async ({ page }) => {
    const errors = await open(page);
    await page.locator('[data-p3d="new-multisheet"]').click();
    const settings = await configureForFixture(page);
    await settings.locator('[data-p3d-elastic-action="save"]').click();
    await settings.locator('[data-p3d-elastic-action="close"]').click();
    const beforeXml = await page.locator('[data-p3d="xml-output"]').textContent();
    expect(bendEvidence(beforeXml).length).toBeGreaterThan(0);

    await page.locator('[data-p3d-raw-text-group="table3"]').evaluate((element) => { element.open = true; });
    const markerCell = page.locator('[data-p3d-split-preview="table3c-raw"] [data-p3d-split-cell="0:1"]');
    await markerCell.fill('PMS-BEND-RENAMED');
    await page.locator('[data-p3d="run"]').click();
    const afterXml = await page.locator('[data-p3d="xml-output"]').textContent();
    expect(afterXml).toEqual(beforeXml);
    await expect(page.locator('[data-p3d="coordinate-output"]')).toContainText('PMS-BEND-RENAMED');
    expect(errors).toEqual([]);
  });
});
