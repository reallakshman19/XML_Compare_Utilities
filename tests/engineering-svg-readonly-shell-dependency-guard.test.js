import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'core/engineering-svg/engineering-svg-workspace-shell.js',
  'core/engineering-svg/shell-runtime.js',
];

for (const name of files) {
  const source = readFileSync(join(root, name), 'utf8');
  const lines = source.split(/\r?\n/).length;
  assert.ok(lines <= 300, `${name} exceeds 300 lines (${lines})`);
  assert.doesNotMatch(source, /from\s+['"][^'"]*tabs\//, `${name} imports from tabs/`);
  assert.doesNotMatch(source, /export\s+default\b/, `${name} uses a default export`);
  assert.doesNotMatch(source, /\b(Canvas|WebGL|ReactDOM|React|THREE|localStorage|sessionStorage)\b/, `${name} leaks a forbidden runtime or storage owner`);
  assert.doesNotMatch(source, /globalThis|window\.|document\.|innerHTML|new\s+CommandHistory|undoStack|redoStack/, `${name} owns global state, DOM or history`);
}

const shell = readFileSync(join(root, 'core/engineering-svg/engineering-svg-workspace-shell.js'), 'utf8');
assert.match(shell, /READ_ONLY:\s*'read-only'/);
assert.match(shell, /EDITABLE:\s*'editable'/);
assert.match(shell, /Editable engineering SVG shell requires a commandGateway/);
assert.match(shell, /Read-only engineering SVG shell cannot expose a commandGateway/);
assert.match(shell, /const editCoordinator = editable \?/);
assert.match(shell, /if \(!editable\) return;/, 'read-only field events must not stage drafts');
assert.match(shell, /if \(!editable\) \{[\s\S]*return null;/, 'read-only apply must not execute a command');

const runtime = readFileSync(join(root, 'core/engineering-svg/shell-runtime.js'), 'utf8');
assert.match(runtime, /EngineeringSvgAdapterBridge\.v1/);
assert.match(runtime, /access mode must match the adapter descriptor/);
assert.match(runtime, /accessMode: descriptorMode/);

console.log('engineering SVG read-only shell dependency guards: ok');
