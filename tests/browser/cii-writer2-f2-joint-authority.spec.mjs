import {test,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const file=name=>fileURLToPath(new URL('../../Benchmark/'+name+'.CII',import.meta.url));
test('F2 real Compare shows both S2/S3 AUTO propagated and MANUAL competing TARGET claims without Writer release',async({page})=>{
 await page.goto('/tests/browser/cii-writer2-bridge-fixture.html');
 await page.evaluate(async()=>{
  localStorage.clear();
  const {installCiiWorkspaceTile}=await import('/tabs/cii-workspace/cii-workspace-tab.js');
  const host=document.createElement('section');document.body.append(host);
  installCiiWorkspaceTile(host);
 });
 await page.locator('[data-ciiw-open-writer2]').click();
 await page.locator('[data-ciiw-source]').setInputFiles([file('S1'),file('S2'),file('S3')]);
 await page.locator('[data-ciiw-target]').setInputFiles(file('T'));
 await page.locator('[data-ciiw-inspect]').click();
 await expect(page.locator('[data-ciiw-ms-anchor-ledger="1"]')).toBeVisible({timeout:120000});
 const setManual=async(source,src,tgt)=>{
  const section=page.locator('[data-ciiw-ms-member="'+source+'"]');
  await section.locator('[data-ciiw-ms-manual-source]').fill(src);
  await section.locator('[data-ciiw-ms-manual-target]').fill(tgt);
  await section.locator('[data-ciiw-ms-manual-add]').click();
  await expect(section).toContainText('ACTIVE: MANUAL');
 };
 await setManual('S2','420','415');
 await setManual('S3','1580','7880');
 await page.locator('[data-ciiw-ms-compare-now]').click();
 const panel=page.locator('[data-ciiw-f2-joint-review="1"]');
 await expect(panel).toBeVisible({timeout:120000});
 await expect(panel).toContainText('150 original SOURCE NODEs');
 await expect(panel).toContainText('S2:420');
 await expect(panel).toContainText('10330');
 await expect(panel).toContainText('S3:1580');
 await expect(panel).toContainText('8895');
 await expect(panel).toContainText('Never authorizes Transfer Preview or Writer');
 await expect(page.locator('[data-ciiw-ms-review-table="1"]')).toBeVisible();
 await expect(page.locator('[data-ciiw-ms-apply]')).toBeDisabled();
 await expect(page.locator('[data-ciiw-ms-bind-expected]')).toBeDisabled();
});
