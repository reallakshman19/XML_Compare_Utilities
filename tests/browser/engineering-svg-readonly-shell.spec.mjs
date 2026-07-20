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

async function setHistorySelection(page, ids) {
  await page.evaluate((selectedIds) => {
    globalThis.__engineeringSvgReadOnlyShellFixture.history.shell.setSelection(selectedIds, 'browser-certification');
  }, ids);
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

test('ESVG-PROP-B06 previous/current property evidence', async ({ page }) => {
  await openFixture(page);
  const root = viewer(page, 'viewer-history');
  await root.locator('[data-engineering-svg-entity-id="changed"]').click();
  const pressure = property(root, 'pressure');
  await expect(pressure).toHaveAttribute('data-engineering-svg-property-comparison', 'changed');
  await expect(pressure.getByText('Previous', { exact: true })).toBeVisible();
  await expect(pressure.getByText('Current', { exact: true })).toBeVisible();
  await expect(pressure.locator('[data-engineering-svg-property-previous] output')).toHaveText('10 bar');
  await expect(pressure.locator('[data-engineering-svg-property-current] output')).toHaveText('12 bar');
  await expect(pressure.locator('[data-engineering-svg-property-previous] input, [data-engineering-svg-property-previous] select')).toHaveCount(0);

  await root.locator('[data-engineering-svg-entity-id="unchanged"]').click();
  const status = property(root, 'status');
  await expect(status).toHaveAttribute('data-engineering-svg-property-comparison', 'unchanged');
  await expect(status.locator('[data-engineering-svg-property-previous] output')).toHaveText('Ready');
  await expect(status.locator('[data-engineering-svg-property-current] output')).toHaveText('Ready');

  await root.locator('[data-engineering-svg-entity-id="explicit-null"]').click();
  const comment = property(root, 'comment');
  await expect(comment).toHaveAttribute('data-engineering-svg-property-comparison', 'changed');
  await expect(comment.locator('[data-engineering-svg-property-previous] output')).toHaveText('—');
  await expect(comment.locator('[data-engineering-svg-property-current] output')).toHaveText('Current 1');

  await root.locator('[data-engineering-svg-entity-id="legacy"]').click();
  const legacy = property(root, 'legacyNote');
  await expect(legacy).toHaveAttribute('data-engineering-svg-property-comparison', 'not-applicable');
  await expect(legacy.locator('[data-engineering-svg-property-previous]')).toHaveCount(0);
  await expect(legacy.locator('[data-engineering-svg-property-current]')).toHaveCount(0);
  await expect(legacy.locator('output')).toHaveText('Legacy 1');

  await setHistorySelection(page, ['uniform-a', 'uniform-b']);
  let temperature = property(root, 'temperature');
  await expect(temperature.locator('[data-engineering-svg-property-previous] output')).toHaveText('100 °C');
  await expect(temperature.locator('[data-engineering-svg-property-current] output')).toHaveText('110 °C');
  await expect(temperature).toHaveAttribute('data-engineering-svg-property-comparison', 'changed');

  await setHistorySelection(page, ['mixed-a', 'mixed-b']);
  temperature = property(root, 'temperature');
  await expect(temperature.locator('[data-engineering-svg-property-previous] output')).toHaveText('Mixed');
  await expect(temperature).toHaveAttribute('data-engineering-svg-property-comparison', 'mixed');

  await setHistorySelection(page, ['unavailable-a', 'unavailable-b']);
  temperature = property(root, 'temperature');
  await expect(temperature.locator('[data-engineering-svg-property-previous] output')).toHaveText('Unavailable for full selection');
  await expect(temperature).toHaveAttribute('data-engineering-svg-property-comparison', 'unavailable');

  await setHistorySelection(page, ['changed']);
  await expect(property(root, 'pressure').locator('[data-engineering-svg-property-previous] output')).toHaveText('10 bar');
  await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.history.bumpProviderRevision());
  await expect(property(root, 'pressure').locator('[data-engineering-svg-property-previous] output')).toHaveText('20 bar');
  await expect(property(root, 'pressure').locator('[data-engineering-svg-property-current] output')).toHaveText('22 bar');

  const readOnlyEvidence = await page.evaluate(async () => {
    const history = globalThis.__engineeringSvgReadOnlyShellFixture.history;
    return {
      applyResult: await history.shell.apply(),
      commandGateway: history.bridge.getDependencies().commandGateway,
      draft: history.shell.draftStore.getSnapshot(),
    };
  });
  expect(readOnlyEvidence.applyResult).toBeNull();
  expect(readOnlyEvidence.commandGateway).toBeNull();
  expect(readOnlyEvidence.draft.operationId).toBeNull();

  const keyboardEntity = root.locator('[data-engineering-svg-entity-id="unchanged"]');
  await keyboardEntity.focus();
  await keyboardEntity.press(' ');
  await expect(keyboardEntity).toHaveAttribute('aria-selected', 'true');
  await expect(property(root, 'status')).toHaveAttribute('data-engineering-svg-property-comparison', 'unchanged');

  const before = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.history.listenerCounts());
  expect(before).toEqual({ scene: 1, property: 1 });
  await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.history.destroy());
  await expect(root).toHaveCount(0);
  await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.history.mount());
  const remounted = viewer(page, 'viewer-history');
  await expect(remounted).toHaveCount(1);
  await expect(remounted.locator('[data-engineering-svg-inspector-actions]')).toHaveCount(1);
  await expect(remounted.locator('[data-engineering-svg-root]')).toHaveCount(1);
  const after = await page.evaluate(() => globalThis.__engineeringSvgReadOnlyShellFixture.history.listenerCounts());
  expect(after).toEqual({ scene: 1, property: 1 });
});
