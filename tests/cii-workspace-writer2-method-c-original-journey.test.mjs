/**
 * Issue #126: real served app / genuine original bytes / A-only evidence.
 * Deliberately RED until the separately authorized native Writer2 entrypoint
 * patch is applied. This is NOT a physical B certificate or Writer2 test grant.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
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
      const bytes=await readFile(file);
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

test('I126 original SOURCE/TARGET reuse → Method C A-only Compare Review; segment 4060 stays unbound',
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
      await shell.locator('[data-ciiw-inspect]').click();
      await shell.locator('[data-ciiw-status]').filter({hasText:/Source-set custody READY|Auto Anchor seeded/i})
        .waitFor({timeout:185_000});
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
