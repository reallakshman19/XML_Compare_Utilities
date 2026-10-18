/** Issue #126 RED native acceptance. Run after exact file backup and entrypoint integration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
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
