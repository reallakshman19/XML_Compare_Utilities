import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOTS = ['core', 'tabs'];
const failures = [];

function visit(path) {
  for (const name of readdirSync(path)) {
    const target = join(path, name);
    const stat = statSync(target);
    if (stat.isDirectory()) {
      if (name === 'node_modules') continue;
      visit(target);
      continue;
    }
    if (!name.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    if (result.status !== 0) failures.push({ target, stderr: result.stderr.trim() });
  }
}

for (const root of ROOTS) visit(root);

if (failures.length) {
  for (const failure of failures) {
    console.error(`\nSYNTAX FAILURE: ${failure.target}\n${failure.stderr}`);
  }
  throw new Error(`${failures.length} startup module syntax failure(s).`);
}

console.log('all core and tab JavaScript modules parse successfully');
