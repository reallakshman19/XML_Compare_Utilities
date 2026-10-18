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
test('replacing SOURCE after real Worker starts never resurrects old inspection', {timeout:130_000},async()=>{
  const {server,url}=await startServer();let browser;
  try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const pageErrors=[],workers=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('worker',w=>{if(w.url().includes('cii-workspace-inspection.worker.js'))workers.push(w);});
    const shell=await openWriter2(page,url);
    await shell.locator('[data-ciiw-inspect]').click();
    for(let attempt=0;attempt<50&&!workers.length;attempt++)await page.waitForTimeout(100);
    assert(workers.length>0,'Committed native Writer2 must actually start dedicated worker');
    await shell.locator('[data-ciiw-source]').setInputFiles([]);
    await shell.locator('[data-ciiw-status]').filter({hasText:/0 SOURCE CII files selected/}).waitFor({timeout:10000});
    await page.waitForTimeout(18000);
    const state=await shell.evaluate(root=>({
      status:[...root.querySelectorAll('[data-ciiw-status]')].map(x=>x.textContent||'').join(' '),
      compareDisabled:root.querySelector('[data-ciiw-analyze]')?.disabled,
      sourceCount:root.querySelector('[data-ciiw-source]')?.files?.length,
    }));
    assert.equal(state.sourceCount,0);
    assert.doesNotMatch(state.status,/Source-set custody READY|Auto Anchor seeded/i);
    assert.match(state.status,/0 SOURCE CII files selected/);
    assert.equal(await shell.locator('[data-ciiw-analyze]').isDisabled(),true);
    assert.equal(pageErrors.length,0,pageErrors.join('; '));
    console.log('I121_WP2B_CANCEL_ORIGINAL '+JSON.stringify({state,workers:workers.length,guard:'PASS'}));
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
test('missing Web Worker fails visibly closed with no synchronous fallback', {timeout:110_000},async()=>{
  const {server,url}=await startServer();let browser;
  try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.addInitScript(()=>{window.Worker=undefined;});
    const shell=await openWriter2(page,url);
    await shell.locator('[data-ciiw-inspect]').click();
    await shell.locator('[data-ciiw-status]').filter({hasText:/CII_INSPECTION_WORKER_UNSUPPORTED/i})
      .waitFor({timeout:20000});
    assert.equal(await shell.locator('[data-ciiw-analyze]').isDisabled(),true);
    assert.doesNotMatch(await shell.locator('[data-ciiw-status]').innerText(),/Source-set custody READY/);
    console.log('I121_WP2B_UNSUPPORTED_WORKER PASS');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
