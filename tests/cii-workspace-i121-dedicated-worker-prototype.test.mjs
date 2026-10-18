/**
 * Issue #126: real served app / genuine original bytes / A-only evidence.
 * Deliberately RED until the separately authorized native Writer2 entrypoint
 * patch is applied. This is NOT a physical B certificate or Writer2 test grant.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const docs = path.resolve(fileURLToPath(new URL('../docs/', import.meta.url)));
const benchmark = path.resolve(fileURLToPath(new URL('../Benchmark/', import.meta.url)));
const receipts = path.resolve(fileURLToPath(new URL('../test-results/i126-original-writer2/', import.meta.url)));
const expected = Object.freeze({
  'S1.CII':'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII':'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII':'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII':'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');


const I121_WORKER_SCRIPT = [
  "import {inspectCiiWorkspaceSourceSetWithVersionBridge as inspect} from './cii-workspace-source-set.js?__i121_worker_module=1';",
  "self.onmessage=async ({data})=>{",
  "  try {",
  "    const output=await inspect(data.input,{...data.options,cryptoRef:globalThis.crypto});",
  "    self.postMessage({ok:true,output});",
  "  } catch(error) {self.postMessage({ok:false,error:String(error?.stack||error)});}",
  "};",
].join('\n');
function i121WorkerOnlyModule(bytes) {
  let text=bytes.toString('utf8');
  const from='export async function inspectCiiWorkspaceSourceSetWithVersionBridge(input, options = {}) {';
  assert.equal(text.split(from).length-1,1,'I121_SOURCE_SET_WORKER_ENTRYPOINT_DRIFT');
  text=text.replace(from,'async function inspectCiiWorkspaceSourceSetInMain(input, options = {}) {');
  text+=[
    '',
    'export function inspectCiiWorkspaceSourceSetWithVersionBridge(input,options={}) {',
    "  const worker=new Worker(new URL('./i121-inspector-worker.js',import.meta.url),{type:'module'});",
    '  return new Promise((resolve,reject)=>{',
    "    const done=()=>worker.terminate();",
    "    worker.addEventListener('message',({data})=>{done(); if(data?.ok) resolve(data.output); else reject(new Error('I121_WORKER_DIAGNOSTIC:'+data?.error));});",
    "    worker.addEventListener('error',(error)=>{done();reject(new Error('I121_WORKER_DIAGNOSTIC:'+String(error?.message||error)));});",
    '    const {cryptoRef,...cloneableOptions}=options;',
    '    worker.postMessage({input,options:cloneableOptions});',
    '  });',
    '}',
  ].join('\n');
  return Buffer.from(text);
}

function serve() {
  const server = createServer(async (req,res) => {
    let pathname;
    try { pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); }
    catch { res.writeHead(400);res.end();return; }
    if (pathname.startsWith('/XML_Compare_Utilities/')) pathname=pathname.slice('/XML_Compare_Utilities'.length);
    const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
    const file=path.resolve(docs,relative);
    if (file!==path.join(docs,'index.html') && !file.startsWith(docs+path.sep)) {
      res.writeHead(403);res.end();return;
    }
    try {
      if (relative==='tabs/cii-workspace/i121-inspector-worker.js' &&
          process.env.I121_INSPECTOR_WORKER==='1') {
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        res.end(I121_WORKER_SCRIPT); return;
      }
      const originalBytes=await readFile(file);
      const bytes=relative==='tabs/cii-workspace/cii-workspace-source-set.js' &&
          !new URL(req.url,'http://127.0.0.1').searchParams.has('__i121_worker_module') &&
          process.env.I121_INSPECTOR_WORKER==='1'
        ?i121WorkerOnlyModule(originalBytes):originalBytes;
      const mime = file.endsWith('.html')?'text/html; charset=utf-8':
        file.endsWith('.js') || file.endsWith('.mjs')?'text/javascript; charset=utf-8':
        file.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(bytes);
    } catch {res.writeHead(404);res.end('not found');}
  });
  return new Promise(resolve => server.listen(0,'127.0.0.1',()=>resolve({server,url:'http://127.0.0.1:'+server.address().port})));
}
async function original(name) {
  const bytes=await readFile(path.join(benchmark,name));
  assert.equal(sha256(bytes),expected[name],'Independent original custody mismatch: '+name);
  return {name,mimeType:'text/plain',buffer:bytes};
}

test('I121 full original CII dedicated inspector worker prototype preserves B0/C0',
  {timeout:270_000}, async () => {
    const {server,url}=await serve();let browser;
    try {
      await mkdir(receipts,{recursive:true});
      browser=await chromium.launch({headless:true});
      const page=await browser.newPage({viewport:{width:1440,height:900}});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url+'/',{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(2000); // Existing WP6 native startup barrier.
      await page.locator('.app-tab[data-tab="psnm-utility"]').click({timeout:90_000});
      await page.locator('[data-ciiw-open-method-c]').waitFor({state:'visible',timeout:90_000});
      assert.equal(await page.locator('[data-ciiw-open-method-c]').count(),1,
        'Existing standalone Method C tile must remain installed.');
      await page.locator('[data-ciiw-open-writer2]').click();
      const shell=page.locator('.ciiw-backdrop .ciiw-workspace');
      await shell.locator('[data-ciiw-panel="inputs"]').waitFor({state:'visible'});
      const method=shell.locator('[data-ciiw-panel="inputs"] [data-ciiw-method-c-run]');
      assert.equal(await method.count(),1,'RED: native Writer2 Method C action is not installed');
      assert.equal(await shell.locator('[data-ciiw-method-c-apply]').count(),0);
      // Exactly ONE native source/target intake; Method C must not prompt for separate files.
      assert.equal(await shell.locator('[data-ciiw-source]').count(),1);
      assert.equal(await shell.locator('[data-ciiw-target]').count(),1);
      assert.equal(await shell.locator('[data-ciiw-panel="inputs"] [data-ciiw-method-c-controls] input[type="file"]').count(),0);
      await shell.locator('[data-ciiw-source]').setInputFiles(await Promise.all(['S1.CII','S2.CII','S3.CII'].map(original)));
      await shell.locator('[data-ciiw-target]').setInputFiles(await original('T.CII'));
      // Collect a bounded, original-file browser receipt on failed legacy custody.
      // Never relax readiness: the Method C A-only bridge is NOT a Writer2 authorizer.
      const inspectStarted = Date.now();
      const intakeDiagnostic = async stage => {
        const state = await shell.evaluate(root => ({
          status: [...root.querySelectorAll('[data-ciiw-status]')].map(e => e.textContent?.trim()),
          evidence: root.querySelector('[data-ciiw-landmarks]')?.textContent?.slice(0, 900),
          originalSourceFiles: [...(root.querySelector('[data-ciiw-source]')?.files || [])]
            .map(f => ({name: f.name, bytes: f.size})),
          originalTargetFiles: [...(root.querySelector('[data-ciiw-target]')?.files || [])]
            .map(f => ({name: f.name, bytes: f.size})),
          methodCStatus: root.querySelector('[data-ciiw-method-c-message]')?.textContent?.trim(),
          sourceCount: root.querySelectorAll('[data-ciiw-source]').length,
          targetCount: root.querySelectorAll('[data-ciiw-target]').length,
        }));
        const diagnostic = {stage, elapsedMs: Date.now()-inspectStarted, ...state,
          pageErrors: errors.slice(0, 15)};
        console.log('I126_ORIGINAL_WRITER2_INTAKE_DIAGNOSTIC '+JSON.stringify(diagnostic));
        await writeFile(path.join(receipts,'native-original-inspection-'+stage+'.json'),
          JSON.stringify(diagnostic,null,2)+'\n');
        return diagnostic;
      };
      await page.evaluate(() => {
        const mark=performance.now();
        window.__i121Heartbeat={last:mark,maxGapMs:0,maxWorkGapMs:0,samples:0,gapsOver500:0};
        window.__i121Interval=setInterval(()=>{
          const now=performance.now();
          const heartbeat=window.__i121Heartbeat;
          const gap=now-heartbeat.last;
          heartbeat.maxGapMs=Math.max(heartbeat.maxGapMs,gap);
          heartbeat.maxWorkGapMs=Math.max(heartbeat.maxWorkGapMs,Math.max(0,gap-50));
          heartbeat.samples++;
          if(gap>500)heartbeat.gapsOver500++;
          heartbeat.last=now;
        },50);
      });
      await shell.locator('[data-ciiw-inspect]').click();
      await page.waitForTimeout(6000);
      const early = await intakeDiagnostic('after-6s');
      // A terminal Writer2 intake error is independently actionable; do not waste
      // the entire #121 performance window waiting for an impossible READY.
      if (early.status?.some(s => /SHA_MISMATCH|UNKNOWN_OR_DUPLICATE|SOURCE_SET_SHA|intake blocked|invalid original/i.test(s||'')))
        assert.fail('Writer2 original custody rejected input: '+JSON.stringify(early));
      try {
        await shell.locator('[data-ciiw-status]').filter({hasText:/Source-set custody READY|Auto Anchor seeded/i})
          .waitFor({timeout:145_000});
      } catch (error) {
        const diagnostic = await intakeDiagnostic('readiness-failure');
        await page.screenshot({path:path.join(receipts,'native-original-inspection-failure.png'),fullPage:true});
        throw new Error('Writer2 source-set readiness failed; original-file diagnostic='+JSON.stringify(diagnostic), {cause:error});
      }
      await intakeDiagnostic('ready');
      // Browser-thread heartbeat is a diagnostic, not yet a frozen release threshold.
      const heartbeat=await page.evaluate(()=>{
        clearInterval(window.__i121Interval);
        return {...window.__i121Heartbeat};
      });
      console.log('I121_NATIVE_UI_HEARTBEAT '+JSON.stringify({variant:process.env.I121_INSPECTOR_WORKER==='1'?'DEDICATED_WORKER':'BASELINE',...heartbeat}));
      assert.ok(heartbeat.samples>=2,'Heartbeat must have observed actual browser ticks');
      await writeFile(path.join(receipts,'i121-native-ui-heartbeat.json'),
        JSON.stringify({schema:'I121.NativeUiHeartbeat.v1',
          note:'Diagnostic evidence only; no Owner-approved maximum gap threshold',variant:process.env.I121_INSPECTOR_WORKER==='1'?'DEDICATED_WORKER':'BASELINE',heartbeat},null,2)+'\n');
      await method.click();
      const options=shell.locator('[data-ciiw-method-c-inputs]');
      await options.waitFor({state:'visible',timeout:20_000});
      assert.equal(await options.locator('input[type="file"]').count(),0);
      await options.locator('[data-ciiw-method-c-member]').selectOption('S1');
      await options.locator('[data-ciiw-method-c-anchor-source]').fill('3910');
      await options.locator('[data-ciiw-method-c-anchor-target]').fill('875');
      await options.locator('[data-ciiw-method-c-start]').click();
      const review=shell.locator('[data-ciiw-panel="compare"] [data-ciiw-method-c-review]');
      await review.locator('[data-ciiw-method-c-a-table] tbody tr').first().waitFor({timeout:75_000});
      assert.equal(await review.locator('tbody tr').count(),57);
      assert.match(await review.innerText(),/READ_ONLY_GEOMETRY/);
      assert.match(await review.innerText(),/BOUND.*Apply|no.*physical.*identity/i);
      const segment=review.locator('tr[data-source-node="4060"]');
      assert.equal(await segment.getAttribute('data-status'),'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
      assert.match(await segment.innerText(),/900|905/);
      assert.equal(await shell.locator('[data-ciiw-method-c-apply]').count(),0);
      assert.equal(await shell.locator('[data-ciiw-panel="compare"] [data-ciiw-ms-review-table] tbody tr[data-ciiw-method-c-candidate]').count(),0,
        'Method C A ledger must not silently enter existing qualified A/B row or acceptance UI');
      await page.screenshot({path:path.join(receipts,'original-s1-4060-a-only.png'),fullPage:true});
      await shell.locator('[data-ciiw-tab="inputs"]').click();
      await options.locator('[data-ciiw-method-c-anchor-source]').fill('5110');
      assert.match(await review.innerText(),/HOLD|invalidated/i);
      assert.ok(!errors.some(x=>/method.c.*error|cannot.*method.c/i.test(x)),errors.join('\n'));
    } finally {
      await browser?.close();
      await new Promise(resolve=>server.close(resolve));
    }
  });
