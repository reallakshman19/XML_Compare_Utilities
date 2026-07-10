import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workflowPath = path.resolve(__dirname, '../.github/workflows/deploy.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function assertContains(snippet, description) {
  if (!workflow.includes(snippet)) throw new Error(`Expected deploy workflow to include ${description}`);
}

assertContains('uses: actions/setup-node@v5', 'Node 24-compatible setup-node action');
assertContains('node-version: 24', 'Node 24 runtime selection');
assertContains('uses: actions/configure-pages@v6', 'Node 24-compatible configure-pages action');
assertContains('uses: actions/upload-pages-artifact@v4', 'current upload-pages-artifact action');
assertContains('uses: actions/deploy-pages@v5', 'Node 24-compatible deploy-pages action');
assertContains('- name: Prepare Pages artifact', 'the Pages staging step');
assertContains('path: ${{ runner.temp }}/pages', 'the staged Pages artifact path');
assertContains('include-hidden-files: true', 'hidden file upload for the .nojekyll marker');
assertContains('touch "${{ runner.temp }}/pages/.nojekyll"', 'the nojekyll marker');
for (const exclusion of ["--exclude='.*'", "--exclude='tests/'", "--exclude='README.md'", "--exclude='package.json'", "--exclude='**/__pycache__/'", "--exclude='**/*.pyc'"]) assertContains(exclusion, exclusion);

console.log('Deploy workflow Pages artifact staging test passed');
