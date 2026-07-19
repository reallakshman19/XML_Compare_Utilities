import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/tests/browser/engineering-svg-readonly-shell-fixture.html');
  await page.waitForFunction(() => Boolean(globalThis.__engineeringSvgReadOnlyShellFixture));
}

function viewer(page, id = 'viewer-a') {
  return page.locator(`[data-engineering-svg-shell="${id}"]`);
}

function property(root, key) {
  return root.locator(`[data-engineering-svg-property-key="${key}"]`);
}

test('ESVG-READONLY-B01 mounts a viewer with output-only properties and no draft path', async ({ page }) => {
  await openFixture(page);
  const root = viewer(page);
  await expect(root).toHaveAttribute('data-engineering-svg-shell-access', 'read-only');
  await expect(root).toHaveAttribute('aria-label', 'Engineering SVG viewer');
  await root.locator('[data-engineering-svg-entity-id="a"]').click();
  await expect(root.locator('[data-engineering-svg-inspector-heading]')).toContainText('a');
  await expect(property(root, 'label').locator('output')).toHaveText('viewer-a-A');
  await expect(property(root, 'pressure').locator('output')).toHaveText('10 bar');
  await expect(property(root, 'material').locator('output')).toHaveText('A106');
  await expect(root.locator('input[data-engineering-svg-property-control]')).toHaveCount(0);
  await expect(root.locator('select[data-engineering-svg-property-control]')).toHaveCount(0);
  await expect(root.locator('[data-engineering-svg-apply]')).toBeDisabled();
  await expect(root.locator('[data-engineering-svg-cancel]')).toBeDisabled();
  const result = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.shell.apply());
  expect(result).toBeNull();
  await expect(root.locator('[data-engineering-svg-shell-status]')).toHaveAttribute('data-engineering-svg-shell-state', 'read-only');
  const draft = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.shell.draftStore.getSnapshot());
  expect(draft.operationId).toBeNull();
});

test('ESVG-READONLY-B02 keyboard selection and scene refresh preserve selection and revision', async ({ page }) => {
  await openFixture(page);
  const root = viewer(page);
  const entityB = root.locator('[data-engineering-svg-entity-id="b"]');
  await entityB.focus();
  await entityB.press(' ');
  await expect(entityB).toHaveAttribute('aria-selected', 'true');
  await expect(root.locator('[data-engineering-svg-inspector-heading]')).toContainText('b');
  await expect(property(root, 'revision').locator('output')).toHaveText('1');
  await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.bumpSceneRevision());
  await expect(entityB).toHaveAttribute('aria-selected', 'true');
  await expect(property(root, 'revision').locator('output')).toHaveText('2');
  const draft = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.shell.draftStore.getSnapshot());
  expect(draft.operationId).toBeNull();
});
