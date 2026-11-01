import {expect, test} from '@playwright/test';
import {readFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {syntheticPsi116, VERIFIED_PSI116_NAMESPACE} from '../fixtures/topo-b-psi116-synthetic.mjs';

// Native Chromium trial of the real InputXML Workspace module, not a banner
// mock. Only the repository's public F05 fixture and a synthetic unknown root.
test('TOPO-B B2 normal upload: F05 admitted, unknown refused, CRLF F05 retained after tab switch', async ({page}) => {
  await page.goto('/tests/browser/xml-builder-viewport-fixture.html');
  await page.evaluate(async () => {
    const {installInputXmlWorkspaceTile} = await import('/tabs/inputxml-workspace/inputxml-workspace-tab.js');
    const container = document.createElement('section');
    container.id = 'topo-b2-browser-fixture';
    document.body.appendChild(container);
    installInputXmlWorkspaceTile(container);
  });
  await page.locator('#topo-b2-browser-fixture [data-ixw-open="1"]').click();
  const workspace = page.locator('.ixw-dialog');
  await expect(workspace).toBeVisible();
  const input = () => workspace.locator('[data-ixw-file="sourceXml"]');
  const topo = async () => {
    await workspace.locator('[data-ixw-tab="misc"]').click();
    await workspace.locator('[data-ixw-misc-subtab="topo"]').click();
  };
  const clean = async () => workspace.locator('[data-ixw-tab="clean"]').click();
  const screenshotDir = join('artifacts', 'topo-b2');
  mkdirSync(screenshotDir, {recursive: true});

  const publicF05 = readFileSync(new URL('../../prototypes/ciifr-map/tests/fixtures/S1-F05.xml', import.meta.url));
  await input().setInputFiles({name: 'S1-F05.xml', mimeType: 'application/xml', buffer: publicF05});
  await topo();
  await expect(workspace.locator('.ixw-status')).toContainText('Admitted · F05 v1.1 · 56 elements / 57 nodes · absolute');
  await expect(workspace.locator('[data-ixw-5b-host]')).toHaveCount(1);
  await expect(workspace.locator('[data-xml-cii-5b-admitted-view]')).toHaveCount(1);
  await expect(workspace.locator('[data-xml-cii-5b-file], [data-xml-cii-5b-paste]')).toHaveCount(0);
  await workspace.screenshot({path: join(screenshotDir, '01-F05-admitted.png')});

  await clean();
  await input().setInputFiles({name: 'unknown.xml', mimeType: 'application/xml',
    buffer: Buffer.from('<Plant><Pipe id="1"/></Plant>', 'utf8')});
  await topo();
  await expect(workspace.locator('.ixw-error[role="alert"]')).toContainText('Not supported');
  await expect(workspace.locator('.ixw-error[role="alert"]')).toContainText('UNKNOWN_ROOT_NOT_ADMITTED:Plant');
  await expect(workspace.locator('[data-ixw-5b-host]')).toHaveCount(0);
  await expect(workspace.locator('[data-xml-cii-5b-admitted-view]')).toHaveCount(0);
  await workspace.screenshot({path: join(screenshotDir, '02-unknown-refused.png')});

  await clean();
  const crlf = Buffer.from(publicF05.toString('utf8').replace(/\r\n?|\n/g, '\r\n'), 'utf8');
  expect(crlf.includes(Buffer.from('\r\n'))).toBe(true);
  await input().setInputFiles({name: 'S1-F05-CRLF.xml', mimeType: 'application/xml', buffer: crlf});
  await topo(); // Crossing tabs reads textarea as LF; only real edits revoke.
  await expect(workspace.locator('.ixw-status')).toContainText('Admitted · F05 v1.1 · 56 elements / 57 nodes · absolute');
  await expect(workspace.locator('[data-ixw-5b-host]')).toHaveCount(1);
  await clean();
  await topo(); // A second switch must not lose original byte-digest authority.
  await expect(workspace.locator('.ixw-status')).toContainText('Admitted · F05 v1.1 · 56 elements / 57 nodes · absolute');
  await expect(workspace.locator('[data-xml-cii-5b-admitted-view]')).toHaveCount(1);
  await workspace.screenshot({path: join(screenshotDir, '03-F05-CRLF-admitted.png')});
});

test('TOPO-B PSI116: refused admission but exact synthetic uploaded legacy Branch/Node 5B view, no candidate bypass', async ({page}) => {
  await page.goto('/tests/browser/xml-builder-viewport-fixture.html');
  await page.evaluate(async () => {
    const {installInputXmlWorkspaceTile} = await import('/tabs/inputxml-workspace/inputxml-workspace-tab.js');
    const container = document.createElement('section');
    container.id = 'topo-b2-psi116-browser-fixture';
    document.body.appendChild(container);
    installInputXmlWorkspaceTile(container);
  });
  const upload = syntheticPsi116({branches: 2, nodesPerBranch: 3});
  const larger = syntheticPsi116({branches: 5, nodesPerBranch: 8, branchPrefix: 'UNRELATED'});
  expect(larger.length).toBeGreaterThan(upload.length);
  expect(upload).toContain(VERIFIED_PSI116_NAMESPACE);
  // Poison the exact fallback paths that the unguarded legacy 5B used.
  await page.evaluate(wrongXml => {
    localStorage.setItem('topo-b-unrelated-workflow-source', wrongXml);
    localStorage.setItem('xmlCii2019.matchedPreview.lastDiagnostics.v1', JSON.stringify({xmlText: wrongXml}));
    const unrelated = document.createElement('textarea');
    unrelated.id = 'topo-b2-unrelated-xml';
    unrelated.value = wrongXml;
    document.body.appendChild(unrelated);
  }, larger);

  await page.locator('#topo-b2-psi116-browser-fixture [data-ixw-open="1"]').click();
  const workspace = page.locator('.ixw-dialog');
  const sourceInput = () => workspace.locator('[data-ixw-file="sourceXml"]');
  const topo = async () => {
    await workspace.locator('[data-ixw-tab="misc"]').click();
    await workspace.locator('[data-ixw-misc-subtab="topo"]').click();
  };
  await sourceInput().setInputFiles({name: 'SYNTHETIC-PSI116.xml', mimeType: 'application/xml',
    buffer: Buffer.from(upload, 'utf8')});
  await topo();
  await expect(workspace.locator('.ixw-error[role="alert"]')).toContainText('Not supported');
  await expect(workspace.locator('.ixw-error[role="alert"]')).toContainText('PSI116_RECOGNIZED_NOT_ADMITTED');
  await expect(workspace.locator('[data-xml-cii-5b-psi116-legacy]')).toBeVisible();
  await expect(workspace.locator('[data-xml-cii-5b-psi116-legacy]'))
    .toContainText('PSI116 5B view (legacy parser) - not admitted topology evidence');
  await expect(workspace.locator('[data-xml-cii-5b-psi116-counts]')).toContainText('Branches: 2 · Nodes: 6');
  await expect(workspace.locator('[data-xml-cii-5b-psi116-legacy]')).not.toContainText('UNRELATED');
  await expect(workspace.locator('[data-xml-cii-5b-file], [data-xml-cii-5b-paste], [data-xml-cii-5b-reset-source]')).toHaveCount(0);
  mkdirSync(join('artifacts', 'topo-b2'), {recursive: true});
  await workspace.screenshot({path: join('artifacts', 'topo-b2', '04-synthetic-PSI116-legacy-5B.png')});

  // A genuine textarea edit invalidates both the refused verdict and its legacy view.
  await workspace.locator('[data-ixw-tab="clean"]').click();
  await workspace.locator('[data-ixw-field="sourceXmlText"]').fill(upload.replace('UPLOADED-1', 'EDITED-1'));
  await topo();
  await expect(workspace.locator('[data-xml-cii-5b-psi116-legacy]')).toHaveCount(0);
  await expect(workspace.locator('[data-ixw-5b-host]')).toHaveCount(0);

  // The same Workspace must still render the accepted F05 graph after replacement.
  await workspace.locator('[data-ixw-tab="clean"]').click();
  const publicF05 = readFileSync(new URL('../../prototypes/ciifr-map/tests/fixtures/S1-F05.xml', import.meta.url));
  await sourceInput().setInputFiles({name: 'S1-F05.xml', mimeType: 'application/xml', buffer: publicF05});
  await topo();
  await expect(workspace.locator('.ixw-status')).toContainText('Admitted · F05 v1.1 · 56 elements / 57 nodes · absolute');
  await expect(workspace.locator('[data-xml-cii-5b-admitted-view]')).toHaveCount(1);
  await expect(workspace.locator('[data-xml-cii-5b-psi116-legacy]')).toHaveCount(0);
});
