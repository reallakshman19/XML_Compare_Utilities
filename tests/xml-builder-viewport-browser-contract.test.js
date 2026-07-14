import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const config = fs.readFileSync('playwright.xml-builder-viewport.config.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/xml-builder-viewport-browser.yml', 'utf8');
const spec = fs.readFileSync('tests/browser/xml-builder-viewport.spec.mjs', 'utf8');
assert.equal(packageJson.scripts['test:xml-builder-viewport-browser'], 'playwright test --config=playwright.xml-builder-viewport.config.mjs');
assert.match(config, /xml-builder-viewport\.spec\.mjs/);
assert.match(workflow, /XML Builder Viewport Browser Acceptance/);
assert.match(workflow, /timeout-minutes: 20/);
for (const id of ['XMLB-VP-B01','XMLB-VP-B02','XMLB-VP-B03','XMLB-VP-B04','XMLB-VP-B05','XMLB-VP-B06','XMLB-VP-B07','XMLB-VP-B08','XMLB-VP-B09']) assert.ok(spec.includes(id));
console.log('xml-builder viewport browser contract tests passed');
