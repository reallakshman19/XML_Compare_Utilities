import {expect,test} from '@playwright/test';
import {fileURLToPath} from 'node:url';

const original=n=>fileURLToPath(new URL('../../Benchmark/'+n,import.meta.url));
test('Owner: 100/200 mm M1 tolerance applies through Advanced Method A weights to original Compare evidence',async({page})=>{
 await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
 await page.evaluate(async()=>{
  localStorage.clear();
  const {installCiiWorkspaceTile}=await import('/tabs/cii-workspace/cii-workspace-tab.js');
  const host=document.createElement('section');host.setAttribute('data-ciiw-m1-host','1');
  document.body.append(host);installCiiWorkspaceTile(host);
 });
 await page.locator('[data-ciiw-open-writer2]').click();
 const advanced=page.locator('[data-ciiw-method-a-weight-config]');
 await expect(advanced).toBeVisible();
 await advanced.locator('summary').click();
 const tolerance=advanced.locator('[data-ciiw-method-a-m1-tolerance]');
 await expect(tolerance).toHaveValue('100');
 await expect(advanced).toContainText('M1 Spatial matching tolerance (mm)');
 await advanced.locator('[data-ciiw-method-a-m1-preset="200"]').click();
 await expect(tolerance).toHaveValue('200');
 await expect(advanced.locator('[data-ciiw-method-a-weight-status]')).toContainText('Draft not applied');
 await advanced.locator('[data-ciiw-method-a-apply-weights]').click();
 await expect(advanced.locator('[data-ciiw-method-a-weight-status]')).toContainText('scope invalidated');
 await page.locator('[data-ciiw-source]').setInputFiles([original('S1.CII'),original('S2.CII'),original('S3.CII')]);
 await page.locator('[data-ciiw-target]').setInputFiles(original('T.CII'));
 await page.locator('[data-ciiw-inspect]').click();
 await expect(page.locator('[data-ciiw-ms-anchor-ledger="1"]')).toBeVisible({timeout:120000});
 // The geometry panel must be generic: no hardcoded S2, bend or preapproved case.
 const panel=page.locator('[data-ciiw-geometry-review="1"]');
 await expect(panel).toBeVisible();
 await expect(panel.locator('[data-ciiw-geometry-case]')).toHaveCount(0);
 await expect(panel).toContainText('Custom investigation');
 await expect(panel.locator('[data-ciiw-geometry-field="sourceId"]')).toHaveValue('S1');
 await expect(panel.locator('[data-ciiw-geometry-field="sourceNodeId"]')).toHaveValue('');
 await page.locator('[data-ciiw-ms-compare-now]').click();
 await expect(page.locator('[data-ciiw-ms-review-table="1"]')).toBeVisible({timeout:120000});
 const evidenceRows=page.locator('[data-ciiw-ms-review-table="1"] tbody tr');
 const evidence=await evidenceRows.allTextContents();
 expect(evidence.some(t=>t.includes('M1 PASS')&&t.includes('/ 200 mm'))).toBe(true);
 expect(evidence.some(t=>t.includes('/ 100 mm'))).toBe(false);
 await page.locator('[data-ciiw-tab="inputs"]').click();
 await advanced.locator('[data-ciiw-method-a-m1-preset="100"]').click();
 await advanced.locator('[data-ciiw-method-a-apply-weights]').click();
 await expect(page.locator('[data-ciiw-ms-review-table="1"]')).toHaveCount(0);
 await expect(page.locator('[data-ciiw-ms-apply]')).toHaveCount(0);
 await expect(page.locator('[data-ciiw-status]')).toContainText('Inspect');
 const stale=await page.evaluate(()=>Object.values(localStorage)
  .map(x=>{try{return JSON.parse(x)}catch{return null}})
  .find(x=>x?.schema==='CIIWorkspaceWriter2Session.v1'));
 expect(stale.confidencePolicy.spatialToleranceMm).toBe(200);
 expect(stale.review.correspondenceIdentity).toBe('');
 await page.locator('[data-ciiw-inspect]').click();
 await expect(page.locator('[data-ciiw-ms-anchor-ledger="1"]')).toBeVisible({timeout:120000});
 await page.locator('[data-ciiw-ms-compare-now]').click();
 await expect(page.locator('[data-ciiw-ms-review-table="1"]')).toBeVisible({timeout:120000});
 const back=await evidenceRows.allTextContents();
 expect(back.some(t=>t.includes('M1 PASS')&&t.includes('/ 100 mm'))).toBe(true);
 expect(back.some(t=>t.includes('/ 200 mm'))).toBe(false);
 await page.locator('[data-ciiw-tab="inputs"]').click();
 await advanced.locator('[data-ciiw-method-a-m1-preset="200"]').click();
 await advanced.locator('[data-ciiw-method-a-reset-weights]').click();
 await expect(tolerance).toHaveValue('100');
 expect(await page.locator('[data-ciiw-ms-apply]').count()).toBe(0);
});
