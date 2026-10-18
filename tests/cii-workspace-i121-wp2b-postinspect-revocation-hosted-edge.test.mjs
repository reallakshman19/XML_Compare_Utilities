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
test('GitHub-hosted Windows Edge original S1/S2/S3/T physical gate and TARGET revocation', {timeout:150_000},async()=>{
  const {server,url}=await startServer();let browser;
  try {
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[],workers=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('worker',w=>workers.push(w.url()));
    const shell=await openWriter2(page,url);
    await shell.locator('[data-ciiw-inspect]').click();
    await shell.locator('[data-ciiw-status]').filter({hasText:/Source-set custody READY/})
      .waitFor({timeout:115_000});
    const original=await shell.evaluate(root=>({
      status:root.querySelector('[data-ciiw-status]')?.textContent||'',
      analyzeDisabled:root.querySelector('[data-ciiw-analyze]')?.disabled,
      memberEvidence:root.querySelectorAll('[data-ciiw-method-evidence] [data-ciiw-ms-member]').length,
      reviewRows:root.querySelectorAll('[data-ciiw-ms-review-table] tbody tr').length,
      applyButtons:root.querySelectorAll('[data-ciiw-ms-apply]').length,
    }));
    console.log('I121_HOSTED_EDGE_POSTINSPECT_ORIGINAL '+JSON.stringify(original));
    assert(workers.some(w=>w.includes('cii-workspace-inspection.worker.js')));
    assert.match(original.status,/Auto Anchor seeded 2\/3/);
    assert.equal(original.analyzeDisabled,true,'Unqualified third SOURCE cannot be silently accepted');
    assert.equal(original.memberEvidence,3,'All three original members should be visible for review');
    assert.equal(original.reviewRows,0,'No implicit correspondence review before qualified base');
    assert.equal(original.applyButtons,0,'No Writer2 mutation control before approved review');
    await shell.locator('[data-ciiw-target]').setInputFiles([]);
    await shell.locator('[data-ciiw-status]').filter({hasText:/3 SOURCE CII files selected/})
      .waitFor({timeout:10000});
    const after=await shell.evaluate(root=>({
      status:root.querySelector('[data-ciiw-status]')?.textContent||'',
      analyzeDisabled:root.querySelector('[data-ciiw-analyze]')?.disabled,
      memberEvidence:root.querySelectorAll('[data-ciiw-method-evidence] [data-ciiw-ms-member]').length,
      reviewRows:root.querySelectorAll('[data-ciiw-ms-review-table] tbody tr').length,
      applyButtons:root.querySelectorAll('[data-ciiw-ms-apply]').length,
    }));
    console.log('I121_HOSTED_EDGE_POSTINSPECT_INVALIDATION '+JSON.stringify(after));
    assert.equal(after.analyzeDisabled,true);
    assert.doesNotMatch(after.status,/Source-set custody READY/);
    assert.equal(after.memberEvidence,0,'Stale SOURCE anchor evidence must not stay displayed after TARGET replacement');
    assert.equal(after.reviewRows,0,'Stale Compare rows must not be presented after TARGET replacement');
    assert.equal(after.applyButtons,0,'Stale Writer2 Apply control must not be presented after TARGET replacement');
    assert.deepEqual(errors,[]);
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
