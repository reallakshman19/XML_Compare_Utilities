import {expect, test} from '@playwright/test';
import {readFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';

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
