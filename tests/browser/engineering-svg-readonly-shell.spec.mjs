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

test('ESVG-READONLY-B03 access-mode mismatches fail deterministically', async ({ page }) => {
  await openFixture(page);
  const errors = await page.evaluate(async () => {
    const runtime = await import('/core/engineering-svg/shell-runtime.js');
    const domain = globalThis.__engineeringSvgReadOnlyShellFixture.domainA;
    const dependencies = domain.bridge.getDependencies();
    const makeHost = () => document.createElement('div');
    const messages = [];
    try {
      runtime.createEngineeringSvgWorkspaceShellFromAdapterBridge({
        bridge: domain.bridge, accessMode: 'editable', shellId: 'mismatch', host: makeHost(),
      });
    } catch (error) { messages.push(String(error.message)); }
    try {
      runtime.createEngineeringSvgWorkspaceShell({
        accessMode: 'read-only', shellId: 'read-only-gateway', host: makeHost(),
        sceneSource: dependencies.sceneSource, propertyProvider: dependencies.propertyProvider,
        commandGateway: { execute: () => null },
      });
    } catch (error) { messages.push(String(error.message)); }
    try {
      runtime.createEngineeringSvgWorkspaceShell({
        accessMode: 'editable', shellId: 'editable-no-gateway', host: makeHost(),
        sceneSource: dependencies.sceneSource, propertyProvider: dependencies.propertyProvider,
      });
    } catch (error) { messages.push(String(error.message)); }
    return messages;
  });
  expect(errors).toEqual([
    'Engineering SVG shell access mode must match the adapter descriptor.',
    'Read-only engineering SVG shell cannot expose a commandGateway.',
    'Editable engineering SVG shell requires a commandGateway.',
  ]);
});

test('ESVG-READONLY-B04 two viewers remain isolated', async ({ page }) => {
  await openFixture(page);
  const rootA = viewer(page, 'viewer-a');
  const rootB = viewer(page, 'viewer-b');
  await rootA.locator('[data-engineering-svg-entity-id="a"]').click();
  await rootB.locator('[data-engineering-svg-entity-id="b"]').click();
  await expect(property(rootA, 'habel').locator('output')).toHaveText('viewer-a-A');
  await expect(property(rootB, 'label').locator('output')).toHaveText('viewer-b-B');
  await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainB.bumpSceneRevision());
  await expect(property(rootB, 'revision').locator('output')).toHaveText('2');
  await expect(property(rootA, 'revision').locator('output')).toHaveText('1');
});

test('ESVG-READONLY-B05 destroy and remount clean shell and adapter subscriptions', async ({ page }) => {
  await openFixture(page);
  const before = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.listenerCounts());
  expect(before).toEqual({ scene: 1, property: 1 });
  await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.destroy());
  await expect(page.locator('[data-engineering-svg-shell="viewer-a"]')).toHaveCount(0);
  const destroyed = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.listenerCounts());
  expect(destroyed).toEqual({ scene: 0, property: 0 });
  await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.mount());
  await expect(page.locator('[data-engineering-svg-shell="viewer-a"]')).toHaveCount(1);
  await expect(page.locator('#viewer-a [data-engineering-svg-root]')).toHaveCount(1);
  const remounted = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.domainA.listenerCounts());
  expect(remounted).toEqual({ scene: 1, property: 1 });
});
