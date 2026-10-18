/** Issue #126 RED native acceptance. Run after exact file backup and entrypoint integration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=path.resolve(fileURLToPath(new URL('../docs/',import.meta.url)));
function serve(){const server=createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end();return;}
  if(pathname.startsWith('/XML_Compare_Utilities/'))pathname=pathname.slice('/XML_Compare_Utilities'.length);
  const target=path.resolve(root,pathname==='/'?'index.html':pathname.replace(/^\/+/,''));
  if(!target.startsWith(root+path.sep)&&target!==path.join(root,'index.html')){res.writeHead(403);res.end();return;}
  try{const bytes=await readFile(target),type=target.endsWith('.html')?'text/html; charset=utf-8':
    target.endsWith('.js')||target.endsWith('.mjs')?'text/javascript; charset=utf-8':
    target.endsWith('.css')?'text/css; charset=utf-8':
    target.endsWith('.json')?'application/json':target.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end('not found');}
});return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({server,url:'http://127.0.0.1:'+server.address().port})));}
test('I126 REAL served Writer2 Inputs contains ONE original-file Method C action, no sibling replacement', {timeout:120000},async()=>{
  const {server,url}=await serve();let browser;
  try{
    browser=await chromium.launch({headless:true});const page=await browser.newPage();
    await page.goto(url+'/',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(2000); // Match the established WP6 app initialization barrier.
    await page.locator('.app-tab[data-tab="psnm-utility"]').click({timeout:45000});
    await page.locator('[data-ciiw-open-method-c]').waitFor({state:'visible',timeout:90000});
    assert.equal(await page.locator('[data-ciiw-open-method-c]').count(),1);
    await page.locator('[data-ciiw-open-writer2]').click();
    const shell=page.locator('.ciiw-backdrop .ciiw-workspace');
    await shell.locator('[data-ciiw-panel="inputs"]').waitFor({state:'visible'});
    assert.equal(await shell.locator('[data-ciiw-panel="inputs"] [data-ciiw-method-c-run]').count(),1,
      'RED: add Method C to existing Writer2 Inputs before claiming a GREEN integrated user journey');
    assert.equal(await shell.locator('[data-ciiw-panel="compare"] [data-ciiw-method-c-review]').count(),1);
    assert.equal(await shell.locator('[data-ciiw-method-c-apply]').count(),0);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

// This is the A-only direct selection path. It intentionally does not invoke the
// pre-existing full Writer2 Inspect, which remains the independent Issue #121 HOLD.
test('I126 original S1/S2/S3/T selected once → Method C 57 original A rows without legacy full Inspect',
  {timeout:150000},async()=>{
  const {server,url}=await serve();let browser;
  try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
    await page.goto(url+'/',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(2000);
    await page.locator('.app-tab[data-tab="psnm-utility"]').click({timeout:45000});
    await page.locator('[data-ciiw-open-writer2]').waitFor({state:'visible',timeout:60000});
    await page.locator('[data-ciiw-open-writer2]').click();
    const shell=page.locator('.ciiw-backdrop .ciiw-workspace');
    await shell.locator('[data-ciiw-panel="inputs"]').waitFor({state:'visible'});
    const files=['S1','S2','S3','T'];
    const expected=[
      '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
      '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
      'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
      'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
    ];
    const originals=await Promise.all(files.map(async(id,i)=>{
      const buffer=await readFile(path.resolve(root,'..','Benchmark',id+'.CII'));
      assert.equal(createHash('sha256').update(buffer).digest('hex'),expected[i]);
      return {name:id+'.CII',mimeType:'text/plain',buffer};
    }));
    assert.equal(await shell.locator('[data-ciiw-source]').count(),1);
    assert.equal(await shell.locator('[data-ciiw-target]').count(),1);
    await shell.locator('[data-ciiw-source]').setInputFiles(originals.slice(0,3));
    await shell.locator('[data-ciiw-target]').setInputFiles(originals[3]);
    // The SHA-bound Method C custody becomes available directly from selected File
    // inputs; do not invoke the legacy Writer2 full-model Inspect (#121).
    await shell.locator('[data-ciiw-method-c-message]')
      .filter({hasText:/S1\/S2\/S3\/T SHA custody READY/}).waitFor({timeout:60000});
    const method=shell.locator('[data-ciiw-method-c-run]');
    await method.click();
    const inputs=shell.locator('[data-ciiw-method-c-inputs]');
    await inputs.waitFor({state:'visible'});
    assert.equal(await inputs.locator('input[type="file"]').count(),0);
    await inputs.locator('[data-ciiw-method-c-member]').selectOption('S1');
    await inputs.locator('[data-ciiw-method-c-anchor-source]').fill('3910');
    await inputs.locator('[data-ciiw-method-c-anchor-target]').fill('875');
    await inputs.locator('[data-ciiw-method-c-start]').click();
    const review=shell.locator('[data-ciiw-panel="compare"] [data-ciiw-method-c-review]');
    await review.locator('[data-ciiw-method-c-a-table] tbody tr').first().waitFor({timeout:60000});
    assert.equal(await review.locator('tbody tr').count(),57);
    const detail=review.locator('tr[data-source-node="4060"]');
    assert.equal(await detail.getAttribute('data-status'),'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT');
    assert.match(await detail.innerText(),/900|905/);
    assert.equal(await shell.locator('[data-ciiw-method-c-apply]').count(),0);
    assert.match(await review.innerText(),/READ_ONLY_GEOMETRY/);
    await mkdir(path.resolve(root,'..','test-results','i126-original-writer2'),{recursive:true});
    await page.screenshot({path:path.resolve(root,'..','test-results','i126-original-writer2','direct-a-original-s1-4060.png')});
    await shell.locator('[data-ciiw-tab="inputs"]').click();
    await inputs.locator('[data-ciiw-method-c-anchor-source]').fill('5110');
    assert.match(await review.innerText(),/HOLD|invalidated/i);
    assert.equal(pageErrors.length,0,pageErrors.join('\n'));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
