// UXML step 3, buddy gate for the restraint core: recorded calls of today's core (5 public models),
// the replay stub (batches 2 and 3 run on it) and the replay gate (batch 1 must pass it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createReplayCore } from '../uxml/v2/supports/CoreReplay.js';
import { loadCalls, PLAIN_DOCUMENT } from '../uxml/v2/supports/CoreCallsLib.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = path.join(ROOT, 'fixtures/uxml-v2-supports/core-calls');
const FILES = ['G30', 'G30-NOJSON', 'G30-CUSTOM', 'RMS-BLOW-1', 'ACTIVE-AUDIT'].map((b) => path.join(DIR, b + '.core-calls.json'));
const GATE = path.join(ROOT, 'scripts/uxml-v2-core-calls-gate.mjs');
const gate = (impl) => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'core-gate-')), 'r.json');
  try { execFileSync(process.execPath, [GATE, impl, ...FILES, '--json', out], { stdio: 'pipe' }); } catch { /* exit 1 on FAIL */ }
  return JSON.parse(fs.readFileSync(out, 'utf8'));
};

test('recordings cover the 12 boundary functions on 5 public models', () => {
  const calls = loadCalls(FILES);
  assert.equal(calls.length, 1248);
  assert.equal(new Set(calls.map((c) => c.name)).size, 12);
});

test('the replay stub passes the gate; a refuse-everything core fails every call', () => {
  const ok = gate('replay');
  assert.equal(ok.verdict, 'PASS');
  assert.equal(ok.fail, 0);
  const bad = gate('refuse');
  assert.equal(bad.verdict, 'FAIL');
  assert.equal(bad.fail, bad.calls);
});

test('a core that is wrong in one function fails only that function', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'core-mutant-'));
  const mutant = path.join(dir, 'mutant.mjs');
  const stubUrl = new URL('../uxml/v2/supports/CoreReplay.js', import.meta.url).href;
  const names = [...new Set(loadCalls(FILES).map((c) => c.name))];
  fs.writeFileSync(mutant, [
    `import { createReplayCore } from ${JSON.stringify(stubUrl)};`,
    `const core = createReplayCore(${JSON.stringify(FILES)});`,
    `const out = { ...core, dedupeXmlCiiRestraintEntries: (...a) => core.dedupeXmlCiiRestraintEntries(...a).slice(1) };`,
    `export const { ${names.join(', ')} } = out;`,
  ].join('\n'));
  const r = gate(mutant);
  assert.equal(r.verdict, 'FAIL');
  const failing = Object.entries(r.perFunction).filter(([, s]) => s.fail > 0).map(([n]) => n);
  assert.deepEqual(failing, ['dedupeXmlCiiRestraintEntries']);
});

test('the stub changes the caller\'s own node in place, as applyXmlRestraints does today', () => {
  const core = createReplayCore(FILES);
  const call = loadCalls(FILES).find((c) => c.name === 'applyXmlRestraints' && c.argsAfter?.[1]);
  const node = structuredClone(call.args[1]);
  core.applyXmlRestraints(PLAIN_DOCUMENT, node, structuredClone(call.args[2]), structuredClone(call.args[3]));
  assert.deepEqual(node, call.argsAfter[1]);
});

test('a call today\'s code never made is refused with CORE_REPLAY_MISS', () => {
  const core = createReplayCore(FILES);
  assert.throws(() => core.restraintEntriesFromSupportKind('NO-SUCH-KIND', {}, null, {}), { code: 'CORE_REPLAY_MISS' });
});
