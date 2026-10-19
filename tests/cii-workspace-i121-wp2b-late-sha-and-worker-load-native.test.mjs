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
function startServer({denyWorkerModule=false}={}){
  const server=createServer(async (req,res)=>{
    const u=new URL(req.url,'http://127.0.0.1');
    let name=decodeURIComponent(u.pathname);
    if(name.startsWith('/XML_Compare_Utilities/'))name=name.slice('/XML_Compare_Utilities'.length);
    if(denyWorkerModule && name.endsWith('/cii-workspace-inspection.worker.js')) {
      res.writeHead(404,{'Content-Type':'text/plain'});res.end('test-only missing inspection worker');return;
    }
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

test('late original S1 SHA read cannot resurrect outdated TARGET inspection', {timeout:130_000},async()=>{
  const {server,url}=await startServer();let browser;
  try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[],workers=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('worker',w=>workers.push(w.url()));
    const shell=await openWriter2(page,url);
    await page.evaluate(()=>{
      const real=File.prototype.arrayBuffer;
      window.__i121ShaReadStarted=false;
      window.__i121ShaReadReleased=false;
      window.__i121ReleaseShaRead=null;
      File.prototype.arrayBuffer=function(...args){
        if(this.name==='S1.CII' && !window.__i121ShaReadStarted){
          window.__i121ShaReadStarted=true;
          return new Promise(resolve=>{
            window.__i121ReleaseShaRead=()=>{
              window.__i121ShaReadReleased=true;
              resolve(real.apply(this,args));
            };
          });
        }
        return real.apply(this,args);
      };
    });
    await shell.locator('[data-ciiw-inspect]').click();
    await page.waitForFunction(()=>window.__i121ShaReadStarted===true,{timeout:15000});
    await shell.locator('[data-ciiw-target]').setInputFiles([]);
    await shell.locator('[data-ciiw-status]').filter({hasText:/3 SOURCE CII files selected/})
      .waitFor({timeout:10000});
    await page.evaluate(()=>window.__i121ReleaseShaRead());
    await page.waitForFunction(()=>window.__i121ShaReadReleased===true,{timeout:5000});
    await page.waitForTimeout(1200);
    const state=await shell.evaluate(root=>({
      status:root.querySelector('[data-ciiw-status]')?.textContent||'',
      analyzeDisabled:root.querySelector('[data-ciiw-analyze]')?.disabled,
      evidence:root.querySelectorAll('[data-ciiw-method-evidence] [data-ciiw-ms-member]').length,
      reviewRows:root.querySelectorAll('[data-ciiw-ms-review-table] tbody tr').length,
      apply:root.querySelectorAll('[data-ciiw-ms-apply]').length,
      targetFiles:root.querySelector('[data-ciiw-target]')?.files?.length,
    }));
    console.log('I121_SHA_READ_LATE_CUSTODY '+JSON.stringify({state,workers,errors}));
    assert.equal(state.targetFiles,0);
    assert.equal(state.analyzeDisabled,true);
    assert.match(state.status,/3 SOURCE CII files selected|TARGET CII file is required/);
    assert.doesNotMatch(state.status,/READY|Inspecting|intake blocked/);
    assert.equal(state.evidence,0);
    assert.equal(state.reviewRows,0);
    assert.equal(state.apply,0);
    assert.equal(workers.filter(w=>w.includes('cii-workspace-inspection.worker.js')).length,0,
      'Late SHA from stale run cannot create inspection Worker');
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
test('blocked dedicated worker module fails closed with original CII, without synchronous fallback', {timeout:120_000},async()=>{
  const {server,url}=await startServer({denyWorkerModule:true});let browser;
  try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const shell=await openWriter2(page,url);
    await shell.locator('[data-ciiw-inspect]').click();
    await shell.locator('[data-ciiw-status]').filter({hasText:/CII_INSPECTION_WORKER_(RUNTIME_ERROR|INSPECTION_FAILED|POST_FAILED)/})
      .waitFor({timeout:45000});
    const state=await shell.evaluate(root=>({
      status:root.querySelector('[data-ciiw-status]')?.textContent||'',
      analyzeDisabled:root.querySelector('[data-ciiw-analyze]')?.disabled,
      reviewRows:root.querySelectorAll('[data-ciiw-ms-review-table] tbody tr').length,
      apply:root.querySelectorAll('[data-ciiw-ms-apply]').length,
    }));
    console.log('I121_WORKER_MODULE_MISSING '+JSON.stringify(state));
    assert.match(state.status,/CII_INSPECTION_WORKER_/);
    assert.doesNotMatch(state.status,/Source-set custody READY/);
    assert.equal(state.analyzeDisabled,true);
    assert.equal(state.reviewRows,0);
    assert.equal(state.apply,0);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
