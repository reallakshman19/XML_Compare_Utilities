import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workflowPath = path.resolve(__dirname, '../.github/workflows/deploy.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function assertContains(snippet, description) {
  if (!workflow.includes(snippet)) {
    throw new Error(`Expected deploy workflow to include ${description}`);
  }
}

assertContains('- name: Prepare Pages artifact', 'the Pages staging step');
assertContains("path: ${{ runner.temp }}/pages", 'the staged Pages artifact path');
for (const exclusion of [
  "--exclude='.git/'",
  "--exclude='.github/'",
  "--exclude='tests/'",
  "--exclude='README.md'",
  "--exclude='package.json'",
  "--exclude='**/__pycache__/'",
  "--exclude='**/*.pyc'",
]) {
  assertContains(exclusion, exclusion);
}

console.log('Deploy workflow Pages artifact staging test passed');
