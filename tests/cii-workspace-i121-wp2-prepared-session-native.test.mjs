/**
 * Issue #126: real served app / genuine original bytes / A-only evidence.
 * Deliberately RED until the separately authorized native Writer2 entrypoint
 * patch is applied. This is NOT a physical B certificate or Writer2 test grant.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const docs = path.resolve(fileURLToPath(new URL('../docs/', import.meta.url)));
const realTabs = path.resolve(fileURLToPath(new URL('../tabs/', import.meta.url)));
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
    const file=relative.startsWith('i121-source/converters/')
      ?path.resolve(docs,'converters',relative.slice('i121-source/converters/'.length))
      :relative.startsWith('i121-source/')
        ?path.resolve(realTabs,'..',relative.slice('i121-source/'.length))
        :path.resolve(docs,relative);
    if (file!==path.join(docs,'index.html') && !file.startsWith(docs+path.sep) && !(relative.startsWith('i121-source/') && file.startsWith(path.resolve(realTabs,'..')+path.sep))) {
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

test('I121 WP2 real source prepared-session Worker and original native Method C negative',
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

      // Exercise NEW independently authored worker modules before unchanged native UI inspection.
      // Inputs are original files, verified by Node SHA256 before upload above.
      const workerReceipt=await shell.evaluate(async root=>{
        const {createCiiWriter2InspectionWorkerClient}=await import(
          '/tabs/cii-workspace/cii-workspace-inspection-worker-client.js');
        const files=[...root.querySelector('[data-ciiw-source]').files];
        const targetFile=root.querySelector('[data-ciiw-target]').files[0];
        const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
          .map(b=>b.toString(16).padStart(2,'0')).join('');
        const sources=[],expectedSources=[];
        for(let i=0;i<files.length;i++){
          const sourceId='S'+(i+1),bytes=new Uint8Array(await files[i].arrayBuffer());
          sources.push({sourceId,fileName:files[i].name,bytes});
          expectedSources.push({sourceId,sha256:await hash(bytes)});
        }
        const targetBytes=new Uint8Array(await targetFile.arrayBuffer());
        const expected={sources:expectedSources,targetSha256:await hash(targetBytes)};
        const client=createCiiWriter2InspectionWorkerClient();
        const stages=[],beat={last:performance.now(),maxGapMs:0,gapsOver500:0,samples:0};
        const clock=setInterval(()=>{
          const now=performance.now(),gap=now-beat.last;beat.last=now;
          beat.maxGapMs=Math.max(beat.maxGapMs,gap);
          if(gap>500)beat.gapsOver500++;
          beat.samples++;
        },50);
        const started=performance.now();
        try{
          const handle=client.run({sources,targetBytes,targetFileName:targetFile.name},{
            expected,onProgress:event=>stages.push(event.stage),
          });
          const result=await handle.promise;
          return {status:result.status,sourceSetSha256:result.sourceSet.sourceSetSha256,
            members:result.sourceSet.members.map(m=>({sourceId:m.sourceId,originalSha256:m.originalSha256})),
            targetSha256:result.versionBridge.target.originalSha256,
            stageLabels:stages,elapsedMs:performance.now()-started,
            maxGapMs:beat.maxGapMs,gapsOver500:beat.gapsOver500,samples:beat.samples};
        }finally{clearInterval(clock);client.dispose();}
      });
      console.log('I121_WP1_REAL_WORKER '+JSON.stringify(workerReceipt));
      assert.equal(workerReceipt.status,'CORRESPONDENCE_INPUT_READY');
      assert.equal(workerReceipt.members.length,3);
      for(let index=0;index<3;index++){
        const id='S'+(index+1);
        assert.equal(workerReceipt.members[index].sourceId,id);
        assert.equal(workerReceipt.members[index].originalSha256,expected[id+'.CII']);
      }
      assert.equal(workerReceipt.targetSha256,expected['T.CII']);
      assert(workerReceipt.stageLabels.includes('INSPECTING'));
      assert(workerReceipt.samples>10,'worker must permit observable page heartbeat');
      assert(workerReceipt.gapsOver500===0,'WP1 experimental 500ms heartbeat guard (not Owner release limit)');
      await writeFile(path.join(receipts,'i121-wp1-native-worker.json'),
        JSON.stringify({schema:'I121.WP1.NativeWorkerReceipt.v1',...workerReceipt},null,2)+'\n');

      const preparedReceipt=await shell.evaluate(async root=>{
        const {createCiiWriter2PreparedInspectionClient}=await import(
          '/i121-source/tabs/cii-workspace/cii-workspace-prepared-inspection-client.js');
        const files=[...root.querySelector('[data-ciiw-source]').files];
        const targetFile=root.querySelector('[data-ciiw-target]').files[0];
        const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
          .map(b=>b.toString(16).padStart(2,'0')).join('');
        const sources=[];
        for(let i=0;i<files.length;i++){
          const bytes=new Uint8Array(await files[i].arrayBuffer());
          sources.push({sourceId:'S'+(i+1),fileName:files[i].name,bytes,originalSha256:await hash(bytes)});
        }
        const targetBytes=new Uint8Array(await targetFile.arrayBuffer());
        const targetOriginalSha256=await hash(targetBytes);
        const client=createCiiWriter2PreparedInspectionClient();
        const beat={last:performance.now(),maxGapMs:0,gapsOver500:0,samples:0};
        const interval=setInterval(()=>{
          const now=performance.now(),gap=now-beat.last;beat.last=now;
          beat.maxGapMs=Math.max(beat.maxGapMs,gap);
          if(gap>500)beat.gapsOver500++;
          beat.samples++;
        },50);
        const started=performance.now();
        try{
          const handle=client.inspect({sources,targetBytes,targetFileName:targetFile.name},
            {targetOriginalSha256});
          const {inspection,preparedSession}=await handle.promise;
          return {status:inspection.status,preparedStatus:preparedSession.status,
            sourceSetSha256:inspection.sourceSet.sourceSetSha256,
            preparedSha256:preparedSession.sourceSetSha256,
            members:preparedSession.members.map(m=>({sourceId:m.sourceId,originalSha256:m.originalSha256,
              graphNodes:m.sourceGraph?.nodes?.length||0})),
            targetSha256:preparedSession.target.originalSha256,
            targetNodes:preparedSession.target.targetGraph?.nodes?.length||0,
            elapsedMs:performance.now()-started,beat};
        }finally{clearInterval(interval);client.dispose();}
      });
      console.log('I121_WP2_REAL_PREPARED '+JSON.stringify(preparedReceipt));
      assert.equal(preparedReceipt.status,'CORRESPONDENCE_INPUT_READY');
      assert.equal(preparedReceipt.preparedStatus,'PREPARED');
      assert.equal(preparedReceipt.sourceSetSha256,preparedReceipt.preparedSha256);
      assert.equal(preparedReceipt.members.length,3);
      for(let i=0;i<3;i++){
        assert.equal(preparedReceipt.members[i].sourceId,'S'+(i+1));
        assert.equal(preparedReceipt.members[i].originalSha256,expected['S'+(i+1)+'.CII']);
        assert(preparedReceipt.members[i].graphNodes>0);
      }
      assert.equal(preparedReceipt.targetSha256,expected['T.CII']);
      assert(preparedReceipt.targetNodes>0);
      assert(preparedReceipt.beat.samples>10);
      assert.equal(preparedReceipt.beat.gapsOver500,0);
      await writeFile(path.join(receipts,'i121-wp2-prepared-source-session.json'),
        JSON.stringify({schema:'I121.WP2.PreparedSessionBrowser.v1',...preparedReceipt},null,2)+'\n');

      // Collect a bounded, original-file browser receipt on failed legacy custody.
      // Never relax readiness: the Method C A-only bridge is NOT a Writer2 authorizer.
      const inspectStarted = Date.now();
      const intakeDiagnostic = async stage => {
        const state = await shell.evaluate(root => ({
          status: [...root.querySelectorAll('[data-ciiw-status]')].map(e => e.textContent?.trim()),
          evidence: root.querySelector('[data-ciiw-landmarks]')?.textContent?.slice(0, 900),
          originalSourceFiles: [...(root.querySelector('[data-ciiw-source]')?.files || [])]
            .map(f => ({name: f.name, bytes: f.size})),
          originalTargetFiles: [...(root.querySelector('[data-ciiw-target]')?.files || [])]
            .map(f => ({name: f.name, bytes: f.size})),
          methodCStatus: root.querySelector('[data-ciiw-method-c-message]')?.textContent?.trim(),
          sourceCount: root.querySelectorAll('[data-ciiw-source]').length,
          targetCount: root.querySelectorAll('[data-ciiw-target]').length,
        }));
        const diagnostic = {stage, elapsedMs: Date.now()-inspectStarted, ...state,
          pageErrors: errors.slice(0, 15)};
        console.log('I126_ORIGINAL_WRITER2_INTAKE_DIAGNOSTIC '+JSON.stringify(diagnostic));
        await writeFile(path.join(receipts,'native-original-inspection-'+stage+'.json'),
          JSON.stringify(diagnostic,null,2)+'\n');
        return diagnostic;
      };
      await shell.locator('[data-ciiw-inspect]').click();
      await page.waitForTimeout(6000);
      const early = await intakeDiagnostic('after-6s');
      // A terminal Writer2 intake error is independently actionable; do not waste
      // the entire #121 performance window waiting for an impossible READY.
      if (early.status?.some(s => /SHA_MISMATCH|UNKNOWN_OR_DUPLICATE|SOURCE_SET_SHA|intake blocked|invalid original/i.test(s||'')))
        assert.fail('Writer2 original custody rejected input: '+JSON.stringify(early));
      try {
        await shell.locator('[data-ciiw-status]').filter({hasText:/Source-set custody READY|Auto Anchor seeded/i})
          .waitFor({timeout:145_000});
      } catch (error) {
        const diagnostic = await intakeDiagnostic('readiness-failure');
        await page.screenshot({path:path.join(receipts,'native-original-inspection-failure.png'),fullPage:true});
        throw new Error('Writer2 source-set readiness failed; original-file diagnostic='+JSON.stringify(diagnostic), {cause:error});
      }
      await intakeDiagnostic('ready');
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
