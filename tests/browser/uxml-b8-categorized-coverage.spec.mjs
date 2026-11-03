import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml as s40} from '../../xml-compare/CategorizedInputXmlConverter.js';
import {patchOriginalFromCategorized as patch} from '../../uxml/UxmlCategorizedPatchBack.js';
import {preserveCategorizedEditorLineEndings}
  from '../../tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js';
const root=resolve(import.meta.dirname,'../..');
const screenshotRoot=resolve(root,'artifacts/uxml-b8/screenshots');
const source=readFileSync(resolve(root,'docs/GREInputxml.xml'),'utf8');
const sha=text=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
async function open(page){
  page.on('pageerror',err=>console.log('B8_PAGE_ERROR '+String(err)));
  await page.goto('/tests/browser/fixtures/uxml-b7-workspace-host.html');
  await expect(page.locator('body')).toHaveAttribute('data-b7-mounted','true');
  await page.locator('[data-ixw-open="1"]').click();
  await page.locator('[data-ixw-tab="categorized"]').click();
  await expect(page.locator('[data-ixw-b7-panel]')).toBeVisible();
}
async function load(page,raw=source,name='public-GRE.xml'){
  await page.locator('[data-ixw-b7-file]').setInputFiles({
    name,mimeType:'application/xml',buffer:Buffer.from(raw,'utf8'),
  });
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','ready',
    {timeout:45000});
}
async function setEditor(page,edited){
  await page.locator('[data-ixw-b7-editor]').evaluate((el,v)=>{
    el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));
  },edited);
}
test('B8 refused with multiple named row/tag edits, no download and public screenshot',async({page})=>{
  await open(page);await load(page);
  const editor=page.locator('[data-ixw-b7-editor]'),cat=await editor.inputValue();
  // Two independent added/unmapped leaves in different physical element rows.
  const first=cat.replace('</SectionDimensionBlock>',
    '<NOT_EDITABLE_A>11</NOT_EDITABLE_A></SectionDimensionBlock>');
  const second=first.replace('</RouteGeometryBlock>',
    '<NOT_EDITABLE_B>22</NOT_EDITABLE_B></RouteGeometryBlock>');
  await setEditor(page,second);
  await page.locator('[data-ixw-b7-action="check"]').click();
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','refused');
  const rows=page.locator('[data-ixw-b8-refusals] tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('[data-ixw-b8-refusals]')).toContainText('NOT_EDITABLE_A');
  await expect(page.locator('[data-ixw-b8-refusals]')).toContainText('NOT_EDITABLE_B');
  await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
  mkdirSync(screenshotRoot,{recursive:true});
  await page.locator('[data-ixw-b7-panel]').screenshot({
    path:resolve(screenshotRoot,'refused-GRE.png')});
});
test('B8 mapped line-value picker Check then exact original-byte download',async({page})=>{
  await open(page);await load(page);
  const picker=page.locator('[data-ixw-b8-field]');
  await expect(picker).toBeVisible();
  const option=picker.locator('option').filter({hasText:'PRESSURE1'}).first();
  const value=await option.getAttribute('value');expect(value).toBeTruthy();
  await picker.selectOption(value);
  await expect(page.locator('[data-ixw-b8-value]')).toBeEnabled();
  const before=await page.locator('[data-ixw-b7-editor]').inputValue();
  await page.locator('[data-ixw-b8-value]').fill('4.56875');
  await page.locator('[data-ixw-b8-value]').dispatchEvent('change');
  const edited=await page.locator('[data-ixw-b7-editor]').inputValue();
  expect(edited).not.toBe(before);
  await page.locator('[data-ixw-b7-action="check"]').click();
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','checked',
    {timeout:45000});
  await expect(page.locator('[data-ixw-b7-action="download"]')).toBeEnabled();
  const changed=await page.locator('[data-ixw-b7-result] table tbody tr').count();
  expect(changed).toBeGreaterThan(0);
  await expect(page.locator('[data-ixw-b7-result]')).toContainText('PIPINGELEMENT.PRESSURE1');
  const direct=await patch(source,s40(source),
    preserveCategorizedEditorLineEndings(s40(source),edited),{fileSha256:sha(source)});
  expect(direct.ok).toBe(true);expect(direct.parity).toBe('EQUAL');
  mkdirSync(screenshotRoot,{recursive:true});
  await page.locator('[data-ixw-b7-panel]').screenshot({
    path:resolve(screenshotRoot,'checked-GRE.png')});
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-ixw-b7-action="download"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe('public-GRE-patched.xml');
  const bytes=readFileSync(await download.path());
  expect(bytes.equals(Buffer.from(direct.bytes))).toBe(true);
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','downloaded');
  await page.locator('[data-ixw-b7-panel]').screenshot({
    path:resolve(screenshotRoot,'downloaded-GRE.png')});
  await page.locator('[data-ixw-b7-action="continue"]').click();
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','ready');
  await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
});
