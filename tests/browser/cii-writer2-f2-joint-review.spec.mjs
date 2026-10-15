import {expect,test} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const original=name=>fileURLToPath(new URL('../../Benchmark/'+name+'.CII',import.meta.url));
test('F2: actual Writer2 Compare shows retained AUTO+MANUAL joint graph without enabling any transfer',async({page})=>{
 await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
 await page.evaluate(async()=>{
  localStorage.clear();
  const {installCiiWorkspaceTile}=await import('/tabs/cii-workspace/cii-workspace-tab.js');
  const host=document.createElement('section');host.setAttribute('data-ciiw-f2-original-host','1');
  document.body.append(host);installCiiWorkspaceTile(host);
 });
 await page.locator('[data-ciiw-open-writer2]').click();
 await page.locator('[data-ciiw-source]').setInputFiles([original('S1'),original('S2'),original('S3')].map(x=>x+'.CII'));
 await page.locator('[data-ciiw-target]').setInputFiles(original('T')+'.CII');
 await page.locator('[data-ciiw-inspect]').click();
 await expect(page.locator('[data-ciiw-ms-anchor-ledger="1"]')).toBeVisible({timeout:120000});
 for(const [sourceId,src,dst] of [['S2','420','415'],['S3','1580','7880']]){
  const member=page.locator('[data-ciiw-ms-member="'+sourceId+'"]');
  await member.locator('[data-ciiw-ms-manual-source]').fill(src);
  await member.locator('[data-ciiw-ms-manual-target]').fill(dst);
  await member.locator('[data-ciiw-ms-manual-add]').click();
  await expect(page.locator('[data-ciiw-ms-member="'+sourceId+'"]')).toContainText('ACTIVE: MANUAL');
 }
 await page.locator('[data-ciiw-ms-compare-now]').click();
 await expect(page.locator('[data-ciiw-ms-review-table="1"]')).toBeVisible({timeout:120000});
 const control=page.locator('[data-ciiw-f2-joint="1"]');
 await expect(control).toContainText('F2 · Joint AUTO + MANUAL path reconciliation');
 await expect(control).toContainText('REVIEW ONLY');
 await control.locator('[data-ciiw-f2-reconcile]').click();
 await expect(control).toContainText('Original SOURCE NODEs:',{timeout:120000});
 await expect(control).toContainText('Active bound: 38');
 await expect(control).toContainText('Automatic bound: 105');
 await expect(control).toContainText('Certified/Writer: 0/0');
 await control.locator('details summary').click();
 const rows=control.locator('details tbody tr');
 await expect(rows).toHaveCount(150);
 await expect(rows.filter({hasText:'S2:420'})).toContainText('415');
 await expect(rows.filter({hasText:'S2:420'})).toContainText('10330');
 await expect(rows.filter({hasText:'S3:1580'})).toContainText('7880');
 await expect(rows.filter({hasText:'S3:1580'})).toContainText('8895');
 expect(await page.locator('[data-ciiw-ms-apply]').count()).toBe(0);
 const [download]=await Promise.all([
  page.waitForEvent('download'),
  control.locator('[data-ciiw-f2-export]').click(),
 ]);
 expect(download.suggestedFilename()).toBe('cii-f2-joint-constrained-review.json');
 const path=await download.path();
 const {readFileSync}=await import('node:fs');
 const report=JSON.parse(readFileSync(path,'utf8'));
 expect(report.schema).toBe('CiiF2JointConstrainedReview.v1');
 expect(report.summary.originalSourceNodeCount).toBe(150);
 expect(report.summary.automaticBoundCount).toBe(105);
 expect(report.summary.activeBoundCount).toBe(38);
 expect(report.summary.certifiedNodeCount).toBe(0);
 expect(report.transferPlan).toBeNull();
 expect(report.writeScope).toBeNull();
 await page.locator('[data-ciiw-tab="inputs"]').click();
 const member=page.locator('[data-ciiw-ms-member="S2"]');
 await member.locator('[data-ciiw-ms-authority-switch="AUTO"]').click();
 await expect(page.locator('[data-ciiw-f2-joint="1"]')).toHaveCount(0);
 await expect(page.locator('[data-ciiw-ms-apply]')).toHaveCount(0);
});
