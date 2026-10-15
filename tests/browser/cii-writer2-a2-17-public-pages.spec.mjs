/**
 * A2-17 production Pages smoke: real hosted UI, not a local fixture.
 * This only validates presence, original-file calculation and review-only output.
 */
import {expect,test} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {mkdir} from 'node:fs/promises';

const SITE='https://reallakshman19.github.io/XML_Compare_Utilities/';
const EXPECTED_SHA='040f2f88b54a746808486615230e5a8625d04527';
const fixture=name=>fileURLToPath(new URL('../../Benchmark/'+name,import.meta.url));

test('public GitHub Pages A2-17 genuine Writer2 geometry review and no Writer authority',async({page,request})=>{
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 const deployed=await request.get(SITE+'pages-deployment.json');
 expect(deployed.ok(),'public Pages immutable deployment manifest must be reachable').toBe(true);
 const receipt=await deployed.json();
 expect(receipt.sha).toBe(EXPECTED_SHA);
 expect(receipt.repository).toBe('reallakshman19/XML_Compare_Utilities');
 for(const modulePath of [
  'tabs/cii-workspace/cii-workspace-geometry-discrepancy-review.js',
  'tabs/cii-workspace/cii-workspace-geometry-discrepancy-ui.js',
  'tabs/cii-workspace/cii-workspace-multisource-writer2-ui.js',
 ]){
  const response=await request.get(SITE+modulePath);
  expect(response.ok(),modulePath+' must be hosted').toBe(true);
  const body=await response.text();
  expect(body).toContain(modulePath.includes('geometry-discrepancy-ui')?
   'Geometry Discrepancy Review':modulePath.includes('geometry-discrepancy-review')?
   'CiiGeometryDiscrepancyReview.v1':'renderCiiGeometryDiscrepancyReviewPanel');
 }
 await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:90000});
 const utilities=page.locator('.app-tab[data-tab="psnm-utility"]');
 await expect(utilities).toBeVisible({timeout:90000});
 await utilities.click();
 const writer2=page.locator('[data-ciiw-open-writer2]');
 await expect(writer2).toBeVisible({timeout:120000});
 await writer2.click();
 await expect(page.locator('[data-ciiw-tab="inputs"]')).toBeVisible();
 await page.locator('[data-ciiw-source]').setInputFiles([
  fixture('S1.CII'),fixture('S2.CII'),fixture('S3.CII'),
 ]);
 await page.locator('[data-ciiw-target]').setInputFiles(fixture('T.CII'));
 await page.locator('[data-ciiw-inspect]').click();
 const panel=page.locator('[data-ciiw-geometry-review="1"]');
 await expect(panel).toBeVisible({timeout:120000});
 await panel.locator('[data-ciiw-geometry-case]').selectOption('S2_BEND_200');
 await panel.locator('[data-ciiw-geometry-preview]').click();
 const result=panel.locator('[data-ciiw-geometry-result="1"]');
 await expect(result).toBeVisible();
 await expect(result).toContainText('774.55');
 await expect(result).toContainText('574.55');
 await expect(result).toContainText('REVIEW ONLY');
 await expect(result).toContainText('BLOCKED');
 await panel.locator('[data-ciiw-geometry-preset-mm="-100"]').click();
 await panel.locator('[data-ciiw-geometry-preview]').click();
 const [download]=await Promise.all([
  page.waitForEvent('download'),
  panel.locator('[data-ciiw-geometry-download]').click(),
 ]);
 expect(download.suggestedFilename()).toBe('cii-geometry-discrepancy-review-source-bound.json');
 const path=await download.path();
 expect(path).toBeTruthy();
 const json=JSON.parse(await readFile(path,'utf8'));
 expect(json.schema).toBe('CiiGeometryDiscrepancyReview.v1');
 expect(json.provenance.sourceId).toBe('S2');
 expect(json.provenance.sourceOriginalSha256).toMatch(/^[0-9a-f]{64}$/);
 expect(json.provenance.targetOriginalSha256).toMatch(/^[0-9a-f]{64}$/);
 expect(json.originalPhysicalPair.recordedTargetMinusSourceLengthMm).toBe(-200);
 expect(json.proposedAdjustment.sourceTranslationMm).toEqual([0,-100,0]);
 expect(json.engineeringReady).toBe(false);
 expect(json.physicalIdentityCertified).toBe(false);
 expect(json.writerReady).toBe(false);
 expect(json.certifiedNodeCount).toBe(0);
 expect(json.correspondenceCertificates).toEqual([]);
 expect(json.transferPlan).toBe(null);
 expect(json.writeScope).toBe(null);
 await mkdir('test-results/cii-a2-17-public-pages',{recursive:true});
 await page.screenshot({path:'test-results/cii-a2-17-public-pages/real-pages-geometry-review.png',fullPage:true});
 // Unrelated optional modules may log warnings, but production geometry must not throw.
 expect(errors.filter(m=>/cii-workspace-geometry|CiiGeometryDiscrepancyReview/i.test(m))).toEqual([]);
 console.log('PUBLIC_PAGES_A217_RELEASE_RECEIPT',JSON.stringify({
  deployment:receipt.sha,site:SITE,
  sourceId:json.provenance.sourceId,
  lengthDiscrepancyMm:json.originalPhysicalPair.recordedTargetMinusSourceLengthMm,
  proposedTranslationMm:json.proposedAdjustment.sourceTranslationMm,
  sourceOriginalSha256:json.provenance.sourceOriginalSha256,
  targetOriginalSha256:json.provenance.targetOriginalSha256,
  certifiedNodeCount:0,writerReady:false,
 }));
});
