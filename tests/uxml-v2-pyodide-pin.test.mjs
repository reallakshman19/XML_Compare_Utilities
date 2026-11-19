// Group 1 (Owner 19 Nov 2026), review note N2.5: the in-page transfer checks the Pyodide core files against
// u2d-py-pin.json before it loads Pyodide. A matching copy passes; one changed byte is refused by name.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {checkPinnedPyodide} from '../uxml/v2/transfer/U2dInBrowser.js';

const PIN = JSON.parse(readFileSync(new URL('../uxml/v2/transfer/u2d-py-pin.json', import.meta.url), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function copy(files) {
  const dir = mkdtempSync(join(tmpdir(), 'pyodide-pin-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return pathToFileURL(dir + '/');
}

test('the pin lists the five Pyodide core files of the pinned version', () => {
  assert.equal(PIN.pyodide, '0.27.2');
  assert.deepEqual(Object.keys(PIN.pyodideFiles).sort(), ['pyodide-lock.json', 'pyodide.asm.js', 'pyodide.asm.wasm', 'pyodide.mjs', 'python_stdlib.zip']);
  for (const v of Object.values(PIN.pyodideFiles)) assert.match(v, /^[0-9a-f]{64}$/);
});

test('a copy equal to the pin passes; one changed byte is refused, naming the file', async () => {
  const files = {'pyodide.mjs': 'export const loadPyodide = 1;\n', 'pyodide.asm.wasm': 'wasm'};
  const pin = {pyodideFiles: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, sha(v)]))};
  assert.equal(await checkPinnedPyodide(copy(files), pin), 2);
  await assert.rejects(checkPinnedPyodide(copy({...files, 'pyodide.asm.wasm': 'wasn'}), pin), /U2D_PYODIDE_PIN_MISMATCH: Pyodide pyodide\.asm\.wasm/);
  await assert.rejects(checkPinnedPyodide(copy(files), {}), /lists no Pyodide files/);
});
