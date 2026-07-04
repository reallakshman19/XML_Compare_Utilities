import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell = fs.readFileSync(new URL('../xml-compare/XmlCompareWorkspaceShell.js', import.meta.url), 'utf8');

assert.ok(shell.includes('loadManualValidationBuilderPromise'), 'workspace shell tracks manual validation builder runtime promise');
assert.ok(shell.includes('xml-compare-manual-validation-builder-runtime.js'), 'workspace shell imports manual validation builder runtime');
assert.ok(shell.includes('loadManualValidationBuilderRuntime();'), 'workspace shell loads manual validation builder runtime from lazy runtime chain');
assert.ok(shell.includes('20260703-manual-validation-builder-1'), 'workspace shell cache-busts manual validation builder runtime');

console.log('XML Compare manual validation builder runtime load test passed');
