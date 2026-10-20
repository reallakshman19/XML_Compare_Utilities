/** Native opt-in Method C B-shadow lab: ORIGINAL files, real download, zero B. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from '@playwright/test';

const root=path.resolve(fileURLToPath(new URL('../docs/',import.meta.url)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function serve(){
  const server=createServer(async(req,res)=>{
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
    catch{res.writeHead(400);res.end();return;}
    const dest=path.resolve(root,pathname.replace(/^\/+/,''));
    if(!dest.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    try{
      const data=await readFile(dest);
      const mime=/\.html$/.test(dest)?'text/html':/\.(js|mjs)$/.test(dest)?'text/javascript':'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(data);
    }catch{res.writeHead(404);res.end('not found');}
  });
  return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({
    server,url:'http://127.0.0.1:'+server.address().port,
  })));
}
test('real original SHA input → physical proof-gap lab → download; still no BOUND', {timeout:150000},async()=>{
  const {server,url}=await serve();let browser;
  try{
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/method-c-b-shadow-lab.html',{waitUntil:'domcontentloaded'});
    const names=['S1','S2','S3','T'];
    const digests=[
      '9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b',
      '7ec48b76b65eedfd5ecc9c8e8feca1a45dd8c83721a68b53aa0db3363e6d27fd',
      'c2143b31c482158ac5514d2709406c14a9179e656277c654e932bb845d090caa',
      'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060',
    ];
    const selected=await Promise.all(names.map(async(name,i)=>{
      const bytes=await readFile(new URL('../Benchmark/'+name+'.CII',import.meta.url));
      assert.equal(hash(bytes),digests[i],'original custody');
      return {name:name+'.CII',buffer:bytes,mimeType:'application/octet-stream'};
    }));
    await page.locator('#sources').setInputFiles(selected.slice(0,3));
    await page.locator('#target').setInputFiles(selected[3]);
    await page.locator('#member').selectOption('S1');
    await page.locator('#sourceAnchor').fill('3910');
    await page.locator('#targetAnchor').fill('875');
    await page.locator('#run').click();
    await page.locator('#status').filter({hasText:/ORIGINAL_BYTES_A_READY/})
      .waitFor({timeout:90000});
    assert.match(await page.locator('#overview').innerText(),/Zero certified BOUND and zero Writer2 operations/);
    assert.equal(await page.locator('#ledger button').count(),57);
    await page.locator('#ledger button').filter({hasText:/SOURCE 4060/}).click();
    assert.match(await page.locator('#detail').innerText(),/ORIGINAL_TARGET_ELEMENT_ONLY_NO_PHYSICAL_NODE/);
    await page.locator('#ledger button').filter({hasText:/SOURCE 4970/}).click();
    assert.match(await page.locator('#detail').innerText(),/NO_PHYSICAL_TARGET_IN_WINDOW/);
    const [download]=await Promise.all([
      page.waitForEvent('download',{timeout:30000}),page.locator('#save').click(),
    ]);
    const report=JSON.parse(await readFile(await download.path(),'utf8'));
    assert.equal(report.schema,'MethodC.ShadowAlternativeTransfer.v1');
    assert.equal(report.aGeometry.rows.length,57);
    assert.equal(report.bShadow.rows.length,57);
    assert.equal(report.bShadow.rows.filter(r=>r.candidateCount).length,41);
    assert.equal(report.bShadow.qualifiedPhysicalIdentityCount,0);
    assert.deepEqual(report.bShadow.physicalCertificates,[]);
    assert.deepEqual(report.bShadow.certifiedBoundRows,[]);
    assert.deepEqual(report.bShadow.mutationOperations,[]);
    assert.equal(report.bShadow.applyAuthorized,false);
    assert.equal(report.bShadow.sourceOriginalSha256,digests[0]);
    assert.equal(report.bShadow.targetOriginalSha256,digests[3]);
    await page.locator('#sourceAnchor').fill('5110');
    assert.equal(await page.locator('#save').isDisabled(),true);
    assert.match(await page.locator('#status').innerText(),/INVALIDATED/);
    assert.deepEqual(errors,[]);
    console.log('METHOD_C_B_SHADOW_ORIGINAL_BROWSER '+JSON.stringify({
      sha:hash(await readFile(await download.path())),rows:report.bShadow.rows.length,
      proposals:report.bShadow.hypothesisCount,certificates:0,writerOperations:0,
    }));
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
