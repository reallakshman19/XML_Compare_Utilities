import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const tileHtml='<html><head><meta charset="UTF-8"><title>Method C Tile Adapter Test</title></head>'+
  '<body><main id="native-tab-host"></main><script type="module">'+
  'import { installMethodCReviewTile } from "/tabs/cii-workspace/cii-workspace-method-c-tile.js";'+
  'window.methodCTile=installMethodCReviewTile(document.querySelector("#native-tab-host"));'+
  'window.methodCTileReady=true;</script></body></html>';
async function launchServer(){
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(url.searchParams.get('mode')==='tile'?tileHtml:html);return;}
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
   const artifactDir=path.join(root,'test-results','cii-method-c-wp5');
   await mkdir(artifactDir,{recursive:true});
   const hashes={SOURCE:createHash('sha256').update(s).digest('hex'),
     TARGET:createHash('sha256').update(t).digest('hex')};
   await page.locator('#mc-source-file').setInputFiles(file('S1',s));
   await page.waitForFunction(()=>window.methodC?.state?.source?.nodes?.length===57);
   await page.locator('#mc-target-file').setInputFiles(file('T',t));
   await page.waitForFunction(()=>window.methodC?.state?.target?.nodes?.length===1619);
   await page.locator('#mc-source-id').fill('3910');
   await page.locator('#mc-target-id').fill('875');
   await page.locator('[data-action=add-anchor]').click();
   await page.waitForFunction(()=>window.methodC?.state?.candidates?.nearSourceCount===41);
   assert.equal(await page.locator('tbody[data-view=rows] tr').count(),57);
   // Real original graph route selector: expected 45 SOURCE / 45 TARGET physical NODEs.
   await page.locator('#mc-route-source-a').fill('3910');
   await page.locator('#mc-route-source-b').fill('5110');
   await page.locator('#mc-route-target-a').fill('875');
   await page.locator('#mc-route-target-b').fill('1095');
   await page.locator('#mc-scope').selectOption('route');
   assert.equal(await page.locator('svg [data-layer=source-nodes] g[data-node]').count(),45);
   assert.equal(await page.locator('svg [data-layer=target-nodes] g[data-node]').count(),45);
   await page.locator('#mc-scope').selectOption('component');
   // SVG NODE selection synchronizes back into the table, not just table -> SVG.
   await page.locator('svg [data-kind=SOURCE][data-node="4960"]').dispatchEvent('click');
   assert.equal(await page.locator('tr.mc-current').getAttribute('data-source'),'4960');
   assert.equal(await page.locator('svg[data-projection=XZ]').count(),1);
   assert.equal(await page.locator('svg [data-layer=source-elements] path').count(),56);
   assert.equal(await page.locator('svg [data-layer=target-elements] path').count(),766);
   const original=await page.locator('.mc-svg svg').getAttribute('viewBox');
   // Pointer drag adjusts true metric viewBox; reset fits the original bounding region.
   const plot=page.locator('.mc-svg svg');
   await plot.dispatchEvent('pointerdown',{clientX:120,clientY:180});
   await plot.dispatchEvent('pointermove',{clientX:155,clientY:190});
   await plot.dispatchEvent('pointerup');
   assert.notEqual(await plot.getAttribute('viewBox'),original);
   await page.locator('[data-action=reset-view]').click();
   assert.equal(await plot.getAttribute('viewBox'),original);
   await page.locator('[data-action=zoom-in]').click();
   assert.notEqual(await page.locator('.mc-svg svg').getAttribute('viewBox'),original);
   await page.locator('[data-action=reset-view]').click();
   assert.equal(await page.locator('.mc-svg svg').getAttribute('viewBox'),original);
   await page.locator('tr[data-source="4060"]').click();
   assert.equal(await page.locator('svg [data-layer=segment-projection]').count(),1);
   assert.match(await page.locator('[data-view=detail]').innerText(),/900|905/);
   await page.screenshot({path:path.join(artifactDir,'wp5-interactive-selected-4060.png'),fullPage:true});
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
   const json=await downloadJson,jsonBytes=await readFile(await json.path());
   await writeFile(path.join(artifactDir,'method-c-evidence.json'),jsonBytes);
   const parsed=JSON.parse(jsonBytes.toString());
   assert.equal(parsed.rows.length,57);
   assert.equal(parsed.nearSourceCount,41);
   assert.equal(parsed.rows.find(r=>r.sourceNode==='4060').segmentOnly.fraction,.76175);
   const downloadCsv=page.waitForEvent('download');
   await page.locator('[data-action=export-csv]').click();
   const csvBytes=await readFile(await (await downloadCsv).path());
   await writeFile(path.join(artifactDir,'method-c-evidence.csv'),csvBytes);
   assert.match(csvBytes.toString(),/MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT/);
   const downloadSvg=page.waitForEvent('download');
   await page.locator('[data-action=export-svg]').click();
   const svgBytes=await readFile(await (await downloadSvg).path());
   await writeFile(path.join(artifactDir,'method-c-evidence.svg'),svgBytes);
   assert.match(svgBytes.toString(),/data-node="4060"/);
   const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
   await writeFile(path.join(artifactDir,'browser-original-custody-and-exports.json'),
     JSON.stringify({scope:'WP5_SERVED_MODULE_NOT_NATIVE_WP6',originalSHA256:hashes,
       extractedCount:parsed.rows.length,nearSources:parsed.nearSourceCount,
       exportSHA256:{svg:digest(svgBytes),csv:digest(csvBytes),json:digest(jsonBytes)},
       browserPageErrors:errors},null,2));
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

test('G2-ready tab tile is isolated, opens native-style read-only overlay and disposes without Writer2',async()=>{
 const {server,url}=await launchServer();
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/?mode=tile',{waitUntil:'load'});
  await page.waitForFunction(()=>window.methodCTileReady);
  assert.equal(await page.locator('[data-ciiw-open-method-c]').count(),1);
  await page.locator('[data-ciiw-open-method-c]').click();
  assert.equal(await page.locator('[data-ciiw-method-c-backdrop]').count(),1);
  assert.equal(await page.locator('[data-ciiw-method-c-root] [data-method-c=read-only]').count(),1);
  assert.equal(await page.locator('[data-ciiw-apply-target],[data-ciiw-writer2-apply]').count(),0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-ciiw-method-c-backdrop]').count(),0);
  await page.locator('[data-ciiw-open-method-c]').click();
  await page.locator('[data-ciiw-method-c-close]').click();
  assert.equal(await page.locator('[data-ciiw-method-c-backdrop]').count(),0);
  await page.evaluate(()=>window.methodCTile.destroy());
  assert.equal(await page.locator('[data-ciiw-open-method-c]').count(),0);
  assert.deepEqual(errors,[]);
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
});
