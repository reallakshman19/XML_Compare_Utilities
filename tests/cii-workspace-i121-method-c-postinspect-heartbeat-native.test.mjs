/** I121 WP2B original-file browser negatives: stale replacement + unsupported Worker. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const docs=path.join(root,'docs'),bench=path.join(root,'Benchmark');
const expected=Object.freeze({
  'S1.CII':'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
  'S2.CII':'7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
  'S3.CII':'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
  'T.CII':'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
});
function startServer(){
  const server=createServer(async (req,res)=>{
    const u=new URL(req.url,'http://127.0.0.1');
    let name=decodeURIComponent(u.pathname);
    if(name.startsWith('/XML_Compare_Utilities/'))name=name.slice('/XML_Compare_Utilities'.length);
    const file=path.resolve(docs,name==='/'?'index.html':name.replace(/^\/+/,''));
    if(file!==path.join(docs,'index.html')&&!file.startsWith(docs+path.sep)){
      res.writeHead(403);res.end();return;
    }
    try {
      const bytes=await readFile(file);
      res.writeHead(200,{'Content-Type':/\.(?:m?js)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream','Cache-Control':'no-store'});
      res.end(bytes);
    }catch{res.writeHead(404);res.end('not found');}
  });
  return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({
    server,url:'http://127.0.0.1:'+server.address().port})));
}
async function original(name){
  const bytes=await readFile(path.join(bench,name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected[name]);
  return {name,mimeType:'text/plain',buffer:bytes};
}
async function openWriter2(page,url){
  await page.goto(url+'/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  await page.locator('.app-tab[data-tab="psnm-utility"]').click({timeout:90_000});
  await page.locator('[data-ciiw-open-writer2]').click({timeout:90_000});
  const shell=page.locator('.ciiw-backdrop .ciiw-workspace');
  await shell.locator('[data-ciiw-panel="inputs"]').waitFor({state:'visible'});
  await shell.locator('[data-ciiw-source]').setInputFiles(await Promise.all(['S1.CII','S2.CII','S3.CII'].map(original)));
  await shell.locator('[data-ciiw-target]').setInputFiles(await original('T.CII'));
  return shell;
}

/** Diagnostic only: this is real Method C A-only evidence, NOT physical B certification. */
test('real original Writer2 Inspect then Method C A-only: bounded UI heartbeat and immutable evidence', {timeout:190_000},async()=>{
  const {server,url}=await startServer();let browser;
  try {
    const channel=process.env.I121_BROWSER_CHANNEL === 'msedge' ? 'msedge' : undefined;
    browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[],workerUrls=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('worker',w=>workerUrls.push(w.url()));
    const shell=await openWriter2(page,url);
    await shell.locator('[data-ciiw-inspect]').click();
    await shell.locator('[data-ciiw-status]').filter({hasText:/Source-set custody READY/}).waitFor({timeout:115_000});
    assert(workerUrls.some(w=>w.includes('cii-workspace-inspection.worker.js')));
    assert.equal(await shell.locator('[data-ciiw-analyze]').isDisabled(),true,
      'Unqualified S1 must block Compare even while Method C read-only evidence runs');
    await shell.locator('[data-ciiw-panel="inputs"] [data-ciiw-method-c-run]').click();
    const controls=shell.locator('[data-ciiw-method-c-inputs]');
    await controls.waitFor({state:'visible',timeout:20000});
    assert.equal(await controls.locator('input[type="file"]').count(),0,
      'Method C must reuse original source/target, not request independent files');
    await controls.locator('[data-ciiw-method-c-member]').selectOption('S1');
    await controls.locator('[data-ciiw-method-c-anchor-source]').fill('3910');
    await controls.locator('[data-ciiw-method-c-anchor-target]').fill('875');
    await page.evaluate(()=>{
      const data={last:performance.now(),maxGapMs:0,gapsOver500:0,samples:0,start:performance.now()};
      window.__i121MethodCBeat=data;
      window.__i121MethodCInterval=setInterval(()=>{
        const now=performance.now(),gap=now-data.last;data.last=now;
        data.maxGapMs=Math.max(gap,data.maxGapMs);
        if(gap>500)data.gapsOver500++;
        data.samples++;
      },50);
    });
    await controls.locator('[data-ciiw-method-c-start]').click();
    const review=shell.locator('[data-ciiw-panel="compare"] [data-ciiw-method-c-review]');
    await review.locator('[data-ciiw-method-c-a-table] tbody tr').first().waitFor({timeout:90_000});
    const beat=await page.evaluate(()=>{
      clearInterval(window.__i121MethodCInterval);
      const b=window.__i121MethodCBeat;
      return {elapsedMs:performance.now()-b.start,maxGapMs:b.maxGapMs,
        gapsOver500:b.gapsOver500,samples:b.samples};
    });
    const reviewText=await review.innerText();
    const count=await review.locator('tbody tr').count();
    const segment=review.locator('tr[data-source-node="4060"]');
    const observation={
      browser:channel||'chromium',beat,evidenceRows:count,
      segmentStatus:await segment.getAttribute('data-status'),
      segmentText:(await segment.innerText()).slice(0,180),
      analyzedDisabled:await shell.locator('[data-ciiw-analyze]').isDisabled(),
      methodCApplyControls:await shell.locator('[data-ciiw-method-c-apply]').count(),
      writerApplyEnabled:await shell.locator('[data-ciiw-ms-apply]:not([disabled])').count(),
      workerUrls,errors,
    };
    console.log('I121_METHOD_C_REAL_POSTINSPECT '+JSON.stringify(observation));
    assert.equal(count,57,'Original Method C A-only evidence rows must not change');
    assert.match(reviewText,/READ_ONLY_GEOMETRY/);
    assert.match(reviewText,/BOUND.*Apply|no.*physical.*identity/i);
    assert.equal(observation.segmentStatus,'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
    assert.match(observation.segmentText,/900|905/);
    assert.equal(observation.methodCApplyControls,0);
    assert.equal(observation.writerApplyEnabled,0);
    assert.equal(observation.analyzedDisabled,true);
    assert.deepEqual(errors,[]);
    assert(beat.samples>=1,'Heartbeat must actually sample during post-Inspect operation');
    // Diagnostic-only: no Owner-approved long-task bound is inferred from this measurement.
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
