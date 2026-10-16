import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=path.resolve(fileURLToPath(new URL('../docs/',import.meta.url)));
const originals=fileURLToPath(new URL('../Benchmark/',import.meta.url));
const receipts=fileURLToPath(new URL('../test-results/cii-method-c-wp6/',import.meta.url));
function appServer(){
 const server=createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{res.writeHead(400);res.end();return;}
  if(pathname.startsWith('/XML_Compare_Utilities/'))pathname=pathname.slice('/XML_Compare_Utilities'.length);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,'');
  const p=path.resolve(root,relative);
  if(!p.startsWith(root+path.sep)&&p!==path.join(root,'index.html')){res.writeHead(403);res.end();return;}
  try{
   const bytes=await readFile(p);
   const type=p.endsWith('.html')?'text/html; charset=utf-8':
    p.endsWith('.js')||p.endsWith('.mjs')?'text/javascript; charset=utf-8':
    p.endsWith('.css')?'text/css; charset=utf-8':
    p.endsWith('.json')?'application/json':
    p.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});
   res.end(bytes);
  }catch{res.writeHead(404);res.end('not found');}
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve({
  server,url:'http://127.0.0.1:'+server.address().port})));
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('WP6 ACTUAL docs/index.html served app → Utilities → native CII Method C tile, original upload and evidence exports', {timeout:180000}, async()=>{
 const {server,url}=await appServer();let browser;
 try{
  await mkdir(receipts,{recursive:true});
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1400,height:850}});
  const page=await context.newPage(),fatal=[],missingMethodC=[],requestsFailed=[];
  page.on('pageerror',e=>fatal.push(e.message));
  page.on('requestfailed',req=>requestsFailed.push({url:req.url(),reason:req.failure()?.errorText}));
  page.on('response',response=>{
   if(response.status()>=400&&/cii-workspace-method-c-/.test(response.url()))
    missingMethodC.push([response.status(),response.url()]);
  });
  await page.goto(url+'/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  console.log('WP6_REAL_DOCS_STARTUP_DIAGNOSTIC '+JSON.stringify({
    url:page.url(),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,1400),
    tabCount:await page.locator('.app-tab').count(),fatal:fatal.slice(0,7),
    missingMethodC:missingMethodC.slice(0,8),requestsFailed:requestsFailed.slice(0,10)
  }));
  await page.screenshot({path:path.join(receipts,'wp6-native-app-startup.png'),fullPage:true});
  await page.locator('.app-tab[data-tab="psnm-utility"]').click({timeout:15000});
  const tile=page.locator('[data-ciiw-open-method-c]');
  await tile.waitFor({state:'visible',timeout:90000});
  assert.equal(await page.locator('[data-ciiw-open]').count(),1);
  assert.equal(await page.locator('[data-ciiw-open-writer2]').count(),1);
  assert.equal(await page.locator('[data-ciiw-open-find-replace]').count(),1);
  await tile.click();
  const overlay=page.locator('[data-ciiw-method-c-backdrop]');
  await overlay.waitFor({state:'visible'});
  assert.equal(await page.locator('[data-ciiw-method-c-root] [data-method-c=read-only]').count(),1);
  assert.equal(await overlay.locator('[data-ciiw-apply-target], [data-ciiw-writer2-apply]').count(),0);
  const source=await readFile(path.join(originals,'S1.CII'));
  const target=await readFile(path.join(originals,'T.CII'));
  const originalsHash={S1:sha(source),T:sha(target)};
  assert.equal(originalsHash.S1,'9a9cb14db4c13f5aac41cc74a60e7e528722eb5003d09f07192762ab6bfb1a2b');
  assert.equal(originalsHash.T,'abfa3ffc9281fe75d4170b2d885d554cb1f120dadedae7c7ab609548b63cc060');
  await overlay.locator('#mc-source-file').setInputFiles({name:'S1.CII',mimeType:'text/plain',buffer:source});
  await overlay.locator('[data-view=custody]').getByText(/S1\s+9a9cb14d/).waitFor();
  await overlay.locator('#mc-target-file').setInputFiles({name:'T.CII',mimeType:'text/plain',buffer:target});
  await overlay.locator('[data-view=custody]').getByText(/T\s+abfa3ffc/).waitFor();
  await overlay.locator('#mc-source-id').fill('3910');
  await overlay.locator('#mc-target-id').fill('875');
  await overlay.locator('[data-action=add-anchor]').click();
  await overlay.locator('tbody tr').first().waitFor({timeout:30000});
  assert.equal(await overlay.locator('tbody[data-view=rows] tr').count(),57);
  assert.equal(await overlay.locator('svg[data-projection=XZ]').count(),1);
  assert.equal(await overlay.locator('svg [data-layer=target-nodes] g[data-node]').count(),767);
  await overlay.locator('#mc-route-source-a').fill('3910');
  await overlay.locator('#mc-route-source-b').fill('5110');
  await overlay.locator('#mc-route-target-a').fill('875');
  await overlay.locator('#mc-route-target-b').fill('1095');
  await overlay.locator('#mc-scope').selectOption('route');
  assert.equal(await overlay.locator('svg [data-layer=source-nodes] g[data-node]').count(),45);
  assert.equal(await overlay.locator('svg [data-layer=target-nodes] g[data-node]').count(),45);
  await overlay.locator('#mc-scope').selectOption('component');
  await overlay.locator('tr[data-source="4060"]').click();
  assert.equal(await overlay.locator('svg [data-layer=segment-projection]').count(),1);
  const detail=await overlay.locator('[data-view=detail]').innerText();
  assert.match(detail,/900|905/);
  await page.screenshot({path:path.join(receipts,'wp6-real-native-application-4060.png'),fullPage:true});
  const view=overlay.locator('.mc-svg svg');
  const vb=await view.getAttribute('viewBox');
  await overlay.locator('[data-action=zoom-in]').click();
  assert.notEqual(await view.getAttribute('viewBox'),vb);
  await overlay.locator('[data-action=reset-view]').click();
  assert.equal(await view.getAttribute('viewBox'),vb);
  for(const projection of ['YZ','XY','ISO','XZ']){
   await overlay.locator('#mc-projection').selectOption(projection);
   assert.equal(await overlay.locator('svg[data-projection='+projection+']').count(),1);
  }
  const selected=await overlay.locator('tr.mc-current').getAttribute('data-source');
  await overlay.locator('svg [data-kind=SOURCE][data-node="4960"]').dispatchEvent('click');
  assert.equal(await overlay.locator('tr.mc-current').getAttribute('data-source'),'4960');
  const csvDl=page.waitForEvent('download');
  await overlay.locator('[data-action=export-csv]').click();
  const csv=await readFile(await (await csvDl).path());
  assert.match(csv.toString(),/MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT/);
  const jsonDl=page.waitForEvent('download');
  await overlay.locator('[data-action=export-json]').click();
  const json=await readFile(await (await jsonDl).path());
  const parsed=JSON.parse(json.toString());
  assert.equal(parsed.rows.length,57);
  assert.equal(parsed.nearSourceCount,41);
  assert.equal(parsed.rows.find(x=>x.sourceNode==='4060').segmentOnly.fraction,.76175);
  assert.equal(parsed.qualifiedPhysicalIdentityCount,0);
  assert.equal(parsed.writerEligible,false);
  const svgDl=page.waitForEvent('download');
  await overlay.locator('[data-action=export-svg]').click();
  const svg=await readFile(await (await svgDl).path());
  assert.match(svg.toString(),/data-node="4060"/);
  for(const [ext,buf] of Object.entries({csv,json,svg}))
   await writeFile(path.join(receipts,'method-c-native-export.'+ext),buf);
  await overlay.locator('#mc-tol-x').fill('99');
  await overlay.locator('#mc-tol-x').dispatchEvent('change');
  assert.equal(await overlay.locator('[data-view=errors]').innerText(),'');
  await overlay.locator('[data-action=clear-anchors]').click();
  assert.equal(await overlay.locator('.mc-svg svg').count(),0);
  await overlay.locator('[data-ciiw-method-c-close]').click();
  assert.equal(await page.locator('[data-ciiw-method-c-backdrop]').count(),0);
  assert.equal(await page.locator('[data-ciiw-open-writer2]').count(),1);
  assert.equal(await page.locator('[data-ciiw-open-find-replace]').count(),1);
  const methodErrors=fatal.filter(x=>/method.c|cii.workspace.method.c/i.test(x));
  assert.deepEqual(missingMethodC,[]);
  assert.deepEqual(methodErrors,[]);
  const receipt={scope:'WP6_NATIVE_EXISTING_DOCS_APPLICATION_CHROMIUM',entry:'docs/index.html', originalSHA256:originalsHash,
   sourceCount:57,routeNodeCount:45,nearSourceCount:41,segmentOnly:'S1:4060→T:900-905',
   qualifiedPhysicalIdentityCount:0,writerEligible:false,previousSelection:selected,
   exportSHA256:Object.fromEntries(Object.entries({csv,json,svg}).map(([k,v])=>[k,sha(v)])),
   missingMethodCRequests:missingMethodC,methodCPageErrors:methodErrors};
  await writeFile(path.join(receipts,'native-chromium-original-file-export-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log('WP6_NATIVE_APP_CHROMIUM_RECEIPT '+JSON.stringify(receipt));
 }finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
});
