import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/deploy.yml');
const BUILD = 'standalone-20260731-pages-utilities-robust-1';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, snippet, description) {
  if (!source.includes(snippet)) throw new Error(`Expected ${description}`);
}

if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assertContains(workflow, 'uses: actions/setup-node@v5', 'Node 24-compatible setup-node action');
  assertContains(workflow, 'node-version: 24', 'Node 24 runtime selection');
  assertContains(workflow, 'uses: actions/configure-pages@v6', 'Node 24-compatible configure-pages action');
  assertContains(workflow, 'uses: actions/upload-pages-artifact@v4', 'current upload-pages-artifact action');
  assertContains(workflow, 'uses: actions/deploy-pages@v5', 'Node 24-compatible deploy-pages action');
  assertContains(workflow, '- name: Prepare Pages artifact', 'the Pages staging step');
  assertContains(workflow, 'path: ${{ runner.temp }}/pages', 'the staged Pages artifact path');
  assertContains(workflow, 'include-hidden-files: true', 'hidden file upload for the .nojekyll marker');
  assertContains(workflow, 'touch "${{ runner.temp }}/pages/.nojekyll"', 'the nojekyll marker');
  for (const exclusion of ["--exclude='.*'", "--exclude='tests/'", "--exclude='README.md'", "--exclude='package.json'", "--exclude='**/__pycache__/'", "--exclude='**/*.pyc'"]) assertContains(workflow, exclusion, exclusion);
} else {
  console.log('Deploy workflow is intentionally absent; validating the branch-published Pages graph.');
}

const index = read('index.html');
const main = read('main-rhbg-fitguard.js');
const app = read('core/app.js');
const runtime = read('core/app-standalone-runtime.js');
const entry = read('tabs/psnm-utility-pages-entry.js');
const utilities = read('tabs/psnm-utility-tab.js');

for (const source of [index, main, app, runtime, entry, utilities]) assertContains(source, BUILD, `the shared build token ${BUILD}`);
assertContains(index, 'psnm-utility-pages-entry.js', 'the stale Utilities URL to map to the new physical entry');
assertContains(index, 'http-equiv="Cache-Control"', 'the document cache-control guard');
assertContains(runtime, "new URL('../tabs/psnm-utility-pages-entry.js'", 'the runtime to load the new physical Utilities entry');
if (runtime.includes("import('../tabs/psnm-utility-tab.js?v=standalone-20260722")) throw new Error('Runtime still imports the stale July 22 Utilities URL directly.');
assertContains(runtime, 'cache-bypass retry', 'the runtime cache-bypass retry');
assertContains(entry, 'data-psnm-pages-entry-retry', 'the entry-level retry action');
assertContains(utilities, 'Promise.allSettled', 'optional module isolation');
assertContains(utilities, 'data-psnm-module-warning', 'visible optional-module diagnostics');
if (/^import\s/m.test(utilities)) throw new Error('Utilities orchestrator must not have blocking static imports.');

console.log('Pages Utilities resilient module graph test passed');
