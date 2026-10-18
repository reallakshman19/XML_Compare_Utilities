/**
 * Issue #121: non-product, native Chromium original CII Writer2 stage profiler.
 * Run from a complete repository checkout:
 *   node tests/cii-workspace-writer2-method-c-perf-profile.mjs
 * Instruments served copies only; docs/ source and test oracles are unchanged.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const docs = path.join(root, 'docs');
const benchmark = path.join(root, 'Benchmark');
const receiptDir = path.join(root, 'test-results', 'i121-original-profile');
const timeoutMs = Number(process.env.I121_PROFILE_TIMEOUT_MS || 90000);
const originals = Object.freeze({
  'S1.CII': '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII': '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII': 'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII': 'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const mark = "const __i121 = (stage, details = {}) => console.info('I121_PROFILE '+JSON.stringify({stage, atMs: performance.now(), ...details}));\n";

function replaceExactlyOnce(source, oldText, newText, name) {
  const first = source.indexOf(oldText);
  assert.ok(first >= 0, 'I121_INSTRUMENTATION_SOURCE_DRIFT: '+name);
  assert.equal(source.indexOf(oldText, first + oldText.length), -1, 'I121_INSTRUMENTATION_NOT_UNIQUE: '+name);
  return source.replace(oldText, newText);
}

function instrumentSourceSet(original) {
  let source = mark + original;
  source = replaceExactlyOnce(source, '  const inspections = [];\n',
    '  const inspections = [];\n  __i121("SOURCESET_BEGIN", {count:sources.length});\n', 'SOURCESET_BEGIN');
  source = replaceExactlyOnce(source,
    '    inspections.push(await inspectCiiWorkspaceModelsWithVersionBridge({',
    '    __i121("MEMBER_BEGIN", {index, id:sourceId(source,index)});\n    inspections.push(await inspectCiiWorkspaceModelsWithVersionBridge({',
    'MEMBER_BEGIN');
  source = replaceExactlyOnce(source,
    "    }, { ...options, writerVersion: '2' }));",
    "    }, { ...options, writerVersion: '2' }));\n    __i121(\"MEMBER_END\", {index, id:sourceId(source,index)});",
    'MEMBER_END');
  source = replaceExactlyOnce(source, '  assertSharedTargetCustody(inspections);',
    '  __i121("SOURCESET_INSPECTIONS_DONE");\n  assertSharedTargetCustody(inspections);',
    'SOURCESET_INSPECTIONS_DONE');
  return source;
}

function instrumentVersionBridge(original) {
  // Scope replacements to the one Inspect export; Preview contains similar calls.
  const begin = 'export async function inspectCiiWorkspaceModelsWithVersionBridge(input, options = {}) {';
  const end = 'export async function createCiiWorkspacePreviewWithVersionBridge(input, options = {}) {';
  assert.equal(original.split(begin).length, 2, 'I121_INSPECT_ENTRYPOINT_DRIFT');
  assert.equal(original.split(end).length, 2, 'I121_PREVIEW_ENTRYPOINT_DRIFT');
  const inspectStart = original.indexOf(begin);
  const inspectEnd = original.indexOf(end, inspectStart);
  assert.ok(inspectEnd > inspectStart, 'I121_INSPECT_ORDER_DRIFT');
  const prefix = original.slice(0, inspectStart);
  let inspected = original.slice(inspectStart, inspectEnd);
  const suffix = original.slice(inspectEnd);
  inspected = replaceExactlyOnce(inspected, begin,
    begin + '\n  __i121("PAIR_BEGIN");', 'PAIR_BEGIN');
  inspected = replaceExactlyOnce(inspected,
    '  const normalized = await normalizePairInput(input, options);',
    '  __i121("PAIR_NORMALIZE_BEGIN");\n  const normalized = await normalizePairInput(input, options);\n  __i121("PAIR_NORMALIZE_END");',
    'PAIR_NORMALIZE');
  inspected = replaceExactlyOnce(inspected,
    '  const inspection = await inspectCiiWorkspaceModels(normalized.normalizedInput, options);',
    '  __i121("PAIR_INSPECT_BEGIN");\n  const inspection = await inspectCiiWorkspaceModels(normalized.normalizedInput, options);\n  __i121("PAIR_INSPECT_END");',
    'PAIR_INSPECT');
  return mark + prefix + inspected + suffix;
}

const injections = new Map([
  ['tabs/cii-workspace/cii-workspace-source-set.js', instrumentSourceSet],
  ['tabs/cii-workspace/cii-workspace-writer-version-bridge.js', instrumentVersionBridge],
]);

async function serve() {
  const serveFile = async (req, res) => {
    let uri;
    try { uri = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (uri.startsWith('/XML_Compare_Utilities/')) uri = uri.slice('/XML_Compare_Utilities'.length);
    const relative = uri === '/' ? 'index.html' : uri.replace(/^\/+/, '');
    const file = path.resolve(docs, relative);
    if (file !== path.join(docs, 'index.html') && !file.startsWith(docs + path.sep)) {
      res.writeHead(403); res.end(); return;
    }
    try {
      const bytes = await readFile(file);
      const transformed = injections.get(relative)?.(bytes.toString('utf8'));
      const mime = /\.html$/i.test(file) ? 'text/html' : /\.(?:js|mjs)$/i.test(file) ? 'text/javascript' : /\.css$/i.test(file) ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, {'Content-Type': mime + '; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(transformed ?? bytes);
    } catch (error) {
      res.writeHead(error?.code === 'ENOENT' ? 404 : 500);
      res.end(error?.message || 'instrumentation failed');
    }
  };
  const server = createServer(serveFile);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {server, url: 'http://127.0.0.1:'+server.address().port};
}

async function original(name) {
  const buffer = await readFile(path.join(benchmark, name));
  assert.equal(createHash('sha256').update(buffer).digest('hex'), originals[name], name+' original byte SHA');
  return {name, mimeType: 'text/plain', buffer};
}

async function main() {
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs >= 5000 && timeoutMs <= 300000,
    'I121_PROFILE_TIMEOUT_MS must be 5000..300000');
  // Drift-check the exact deployed code BEFORE opening Chromium.
  for (const [name, inject] of injections) inject(await readFile(path.join(docs,name),'utf8'));
  const {chromium} = await import('@playwright/test');
  await mkdir(receiptDir,{recursive:true});
  const {server,url} = await serve();
  let browser, timedOut = false;
  const startedAt = Date.now();
  const events = [];
  const record = (stage, extra = {}) => {
    const event = {stage,elapsedMs:Date.now()-startedAt,...extra};
    events.push(event); console.log('I121_RECEIPT '+JSON.stringify(event));
  };
  try {
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    page.on('console', message => {
      const value = message.text();
      if (value.startsWith('I121_PROFILE ')) record('BROWSER_STAGE',{data:JSON.parse(value.slice(13))});
    });
    page.on('pageerror', error => record('PAGE_ERROR',{message:String(error)}));
    await page.goto(url+'/',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(2000);
    await page.locator('.app-tab[data-tab="psnm-utility"]').click({timeout:15000});
    await page.locator('[data-ciiw-open-writer2]').click({timeout:15000});
    const shell = page.locator('.ciiw-backdrop .ciiw-workspace');
    await shell.locator('[data-ciiw-panel="inputs"]').waitFor({timeout:15000});
    await shell.locator('[data-ciiw-source]').setInputFiles(await Promise.all(['S1.CII','S2.CII','S3.CII'].map(original)));
    await shell.locator('[data-ciiw-target]').setInputFiles(await original('T.CII'));
    record('ORIGINAL_FIXTURE_SHA_PASS',{originals});
    // Node watchdog remains responsive when the browser's main JS thread blocks.
    const completion = (async () => {
      await shell.locator('[data-ciiw-inspect]').click({timeout:timeoutMs});
      await shell.locator('[data-ciiw-status]').filter({hasText:/Source-set custody READY|Auto Anchor seeded/})
        .waitFor({timeout:timeoutMs});
      record('SOURCESET_READY');
      return 'PASS';
    })();
    const outcome = await Promise.race([
      completion,
      new Promise(resolve => setTimeout(() => resolve('WATCHDOG_TIMEOUT'),timeoutMs)),
    ]);
    if (outcome !== 'PASS') { timedOut = true; record('WATCHDOG_TIMEOUT',{timeoutMs}); }
    if (!timedOut) record('READY_VERIFIED');
  } catch (error) { timedOut = true; record('FAIL',{error:String(error)}); }
  finally {
    const receipt = {schema:'I121.OriginalWriter2StageProfile.v1',candidate:'RUNTIME_CHECK_REQUIRED',
      originalSha256:originals,outcome:timedOut?'FAIL_OR_TIMEOUT':'READY',events};
    await writeFile(path.join(receiptDir,'profile.json'),JSON.stringify(receipt,null,2)+'\n');
    await Promise.race([browser?.close().catch(()=>{}) ?? Promise.resolve(),
      new Promise(resolve=>setTimeout(resolve,4000))]);
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  }
  if (timedOut) process.exitCode = 2;
}

await main();
