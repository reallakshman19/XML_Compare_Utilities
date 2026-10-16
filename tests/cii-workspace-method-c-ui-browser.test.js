import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root=fileURLToPath(new URL('../',import.meta.url));
const html='<html><head><meta charset="UTF-8"><title>Method C Module Browser Test</title>'+
  '<link rel="stylesheet" href="/tabs/cii-workspace/cii-workspace-method-c-ui.css"></head>'+
  '<body><main id="method-c-root"></main><script type="module">'+
  'import { mountMethodC } from "/tabs/cii-workspace/cii-workspace-method-c-ui.js";'+
  'window.methodC=mountMethodC(document.querySelector("#method-c-root"));'+
  'window.methodCReady=true;</script></body></html>';
async function launchServer(){
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
    if(!/^\/tabs\/cii-workspace\/cii-workspace-method-c-[a-z-]+\.(?:js|css)$/.test(url.pathname)){
      res.writeHead(404);res.end('unavailable');return;
    }
    try{
      const bytes=await readFile(path.join(root,url.pathname.slice(1)));
      res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?
        'text/javascript; charset=utf-8':'text/css; charset=utf-8'});
      res.end(bytes);
    }catch{res.writeHead(404);res.end('missing');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,url:'http://127.0.0.1:'+server.address().port};
}
const file=(member,buffer)=>({name:member+'.CII',mimeType:'text/plain',buffer});
test('real Chromium served Method C modules: original upload, anchors, SVG, table, tolerance, zoom and exports',async()=>{
 const {server,url}=await launchServer();
 let browser;
 try{
   browser=await chromium.launch({headless:true});
   const context=await browser.newContext({acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(url,{waitUntil:'load'});
   await page.waitForFunction(()=>window.methodCReady===true);
   const [s,t]=await Promise.all(['S1','T'].map(member=>readFile(path.join(root,'Benchmark',member+'.CII'))));
   await page.locator('#mc-source-file').setInputFiles(file('S1',s));
   await page.waitForFunction(()=>window.methodC?.state?.source?.nodes?.length===57);
   await page.locator('#mc-target-file').setInputFiles(file('T',t));
   await page.waitForFunction(()=>window.methodC?.state?.target?.nodes?.length===1619);
   await page.locator('#mc-source-id').fill('3910');
   await page.locator('#mc-target-id').fill('875');
   await page.locator('[data-action=add-anchor]').click();
   await page.waitForFunction(()=>window.methodC?.state?.candidates?.nearSourceCount===41);
   assert.equal(await page.locator('tbody[data-view=rows] tr').count(),57);
   assert.equal(await page.locator('svg[data-projection=XZ]').count(),1);
   assert.equal(await page.locator('svg [data-layer=source-elements] path').count(),56);
   assert.equal(await page.locator('svg [data-layer=target-elements] path').count(),766);
   const original=await page.locator('.mc-svg svg').getAttribute('viewBox');
   await page.locator('[data-action=zoom-in]').click();
   assert.notEqual(await page.locator('.mc-svg svg').getAttribute('viewBox'),original);
   await page.locator('[data-action=reset-view]').click();
   assert.equal(await page.locator('.mc-svg svg').getAttribute('viewBox'),original);
   await page.locator('tr[data-source="4060"]').click();
   assert.equal(await page.locator('svg [data-layer=segment-projection]').count(),1);
   assert.match(await page.locator('[data-view=detail]').innerText(),/900|905/);
   await page.locator('#mc-projection').selectOption('YZ');
   assert.equal(await page.locator('svg[data-projection=YZ]').count(),1);
   await page.locator('#mc-projection').selectOption('XY');
   assert.equal(await page.locator('svg[data-projection=XY]').count(),1);
   await page.locator('#mc-projection').selectOption('ISO');
   assert.equal(await page.locator('svg[data-metric=false]').count(),1);
   await page.locator('#mc-projection').selectOption('XZ');
   const before=await page.evaluate(()=>window.methodC.state.candidates.snapshot);
   await page.locator('#mc-tol-x').fill('99');
   await page.locator('#mc-tol-x').dispatchEvent('change');
   await page.waitForFunction(before=>window.methodC.state.candidates?.snapshot!==before,before);
   // Return to prescribed 100/100/100 benchmark tolerance.
   await page.locator('#mc-tol-x').fill('100');
   await page.locator('#mc-tol-x').dispatchEvent('change');
   const downloadJson=page.waitForEvent('download');
   await page.locator('[data-action=export-json]').click();
   const json=await downloadJson,parsed=JSON.parse((await readFile(await json.path())).toString());
   assert.equal(parsed.rows.length,57);
   assert.equal(parsed.nearSourceCount,41);
   assert.equal(parsed.rows.find(r=>r.sourceNode==='4060').segmentOnly.fraction,.76175);
   const downloadCsv=page.waitForEvent('download');
   await page.locator('[data-action=export-csv]').click();
   assert.match((await readFile(await (await downloadCsv).path())).toString(),/MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT/);
   const downloadSvg=page.waitForEvent('download');
   await page.locator('[data-action=export-svg]').click();
   assert.match((await readFile(await (await downloadSvg).path())).toString(),/data-node="4060"/);
   await page.locator('[data-action=clear-anchors]').click();
   assert.equal(await page.evaluate(()=>window.methodC.state.candidates),null);
   assert.equal(await page.locator('.mc-svg svg').count(),0);
   // Corrupted replacement input must immediately invalidate exports.
   await page.locator('#mc-source-file').setInputFiles(file('S1',Buffer.from('invalid CII text')));
   await page.waitForFunction(()=>/rejected|missing/i.test(document.querySelector('[data-view=errors]').textContent));
   assert.equal(await page.evaluate(()=>window.methodC.state.source),null);
   assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});
