import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const STARTUP_ROOTS = ['core', 'tabs'];
const TOP_LEVEL_MODULES = ['main-rhbg-fitguard.js'];

function javascriptFiles(path) {
  if (statSync(path).isFile()) return path.endsWith('.js') ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? javascriptFiles(child) : entry.name.endsWith('.js') ? [child] : [];
  });
}

test('all shipped startup JavaScript parses as ECMAScript modules', () => {
  const files = [
    ...TOP_LEVEL_MODULES.map((path) => join(ROOT, path)),
    ...STARTUP_ROOTS.flatMap((path) => javascriptFiles(join(ROOT, path))),
  ].sort();

  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      const output = `${error.stdout || ''}${error.stderr || ''}`.trim();
      assert.fail(`Syntax check failed for ${relative(ROOT, file)}\n${output}`);
    }
  }
});
