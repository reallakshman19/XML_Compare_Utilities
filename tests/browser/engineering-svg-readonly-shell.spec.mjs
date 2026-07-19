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

test('ESVG-READONLY-B01 fixture mounts', async ({ page }) => {
  await openFixture(page);
  await expect(viewer(page)).toHaveCount(1);
});
