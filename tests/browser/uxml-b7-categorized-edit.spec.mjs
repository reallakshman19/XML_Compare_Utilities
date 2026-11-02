import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inputXmlToCategorizedInputXml} from '../../xml-compare/CategorizedInputXmlConverter.js';
import {patchOriginalFromCategorized} from '../../uxml/UxmlCategorizedPatchBack.js';
import {preserveCategorizedEditorLineEndings} from '../../tabs/inputxml-workspace/inputxml-workspace-categorized-edit-controller.js';

const root=resolve(import.meta.dirname,'../..');
const sources=[
  ['GRE','docs/GREInputxml.xml'],
  ['PLB314','docs/PLB314Inputxml.xml'],
  ['mock','opt/mock-xml.xml'],
  ['BM_CII','converters/scripts/pdf_inputxml_profile_bm_cii.xml'],
];
const sha=text=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const screenshots=resolve(root,'artifacts/uxml-b7/screenshots');
async function open(page){
  page.on('pageerror',error=>console.log('B7_BROWSER_PAGE_ERROR '+String(error)));
  page.on('console',msg=>{if(msg.type()==='error')console.log('B7_BROWSER_CONSOLE_ERROR '+msg.text());});
  await page.goto('/tests/browser/fixtures/uxml-b7-workspace-host.html');
  await expect(page.locator('body')).toHaveAttribute('data-b7-mounted','true');
  await page.locator('[data-ixw-open="1"]').click();
  await page.locator('[data-ixw-tab="categorized"]').click();
  await expect(page.locator('[data-ixw-b7-panel]')).toBeVisible();
}
async function loaded(page,text,name){
  await page.locator('[data-ixw-b7-file]').setInputFiles({
    name,mimeType:'application/xml',buffer:Buffer.from(text,'utf8'),
  });
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','ready',{timeout:45000});
  await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
}
function editDiameter(cat,value='127.125'){
  const match=cat.match(/<DIAMETER>([^<]+)<\/DIAMETER>/);
  if(!match)throw Error('No existing DIAMETER projection');
  return cat.replace(match[0],'<DIAMETER>'+value+'</DIAMETER>');
}
async function setEditor(page,value){
  await page.locator('[data-ixw-b7-editor]').evaluate((element,next)=>{
    element.value=next;
    element.dispatchEvent(new Event('input',{bubbles:true}));
  },value);
}
async function checkAndDownload(page,source,name,{takeScreenshots=false}={}){
  const baseline=await page.locator('[data-ixw-b7-editor]').inputValue();
  const edited=editDiameter(baseline);
  await setEditor(page,edited);
  await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
  await page.locator('[data-ixw-b7-action="check"]').click();
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase',/^(checked|refused)$/,{timeout:15000});
  const phase=await page.locator('[data-ixw-b7-panel]').getAttribute('data-b7-phase');
  if(phase!=='checked')throw Error('B7_CHECK_REFUSED '+name+' '+await page.locator('[data-ixw-b7-result]').innerText());
  await expect(page.locator('[data-ixw-b7-action="download"]')).toBeEnabled();
  await expect(page.locator('[data-ixw-b7-result] table tbody tr')).toHaveCount(1);
  await expect(page.locator('[data-ixw-b7-result]')).toContainText('PIPINGELEMENT.DIAMETER');
  await expect(page.locator('[data-ixw-b7-result]')).toContainText('Written exactly as typed');
  if(takeScreenshots){mkdirSync(screenshots,{recursive:true});
    await page.locator('[data-ixw-b7-panel]').screenshot({path:resolve(screenshots,'checked-GRE.png')});}
  const exactBaseline=inputXmlToCategorizedInputXml(source);
  const exactEdited=preserveCategorizedEditorLineEndings(exactBaseline,edited);
  const direct=await patchOriginalFromCategorized(source,exactBaseline,exactEdited,{fileSha256:sha(source)});
  expect(direct.ok).toBe(true);expect(direct.parity).toBe('EQUAL');
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-ixw-b7-action="download"]').click(),
  ]);
  const blob=readFileSync(await download.path());
  await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','downloaded');
  await expect(page.locator('[data-ixw-b7-status]')).toContainText('Downloaded');
  expect(blob.equals(Buffer.from(direct.bytes))).toBe(true);
  expect(download.suggestedFilename()).toBe(name.replace(/\.xml$/i,'-patched.xml'));
  if(takeScreenshots)await page.locator('[data-ixw-b7-panel]').screenshot({
    path:resolve(screenshots,'downloaded-GRE.png')});
  console.log('B7_BROWSER_PUBLIC '+name+' originalBytes='+Buffer.byteLength(source)+
    ' writtenBytes='+blob.length+' exactEngineBytes=true parity=EQUAL');
  return {baseline,edited,bytes:blob};
}

test.describe('B7 actual Categorized tab source-bound byte download',()=>{
  for(const [label,path] of sources){
    test('browser '+label+' load, edit, Check, exact engine bytes and no extra edits',async({page})=>{
      await open(page);
      const text=readFileSync(resolve(root,path),'utf8');
      const filename=label+'.xml';
      await loaded(page,text,filename);
      const {bytes}=await checkAndDownload(page,text,filename,{takeScreenshots:label==='GRE'});
      const expected=text.replace(/(DIAMETER=")[^"]+(")/,(_,a,z)=>a+'127.125'+z);
      expect(bytes.equals(Buffer.from(expected))).toBe(true);
      const editor=page.locator('[data-ixw-b7-editor]');
      await setEditor(page,(await editor.inputValue())+' ');
      await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
    });
  }
  test('browser refused edit cannot download; Reset revokes stale bytes',async({page})=>{
    await open(page);
    const source=readFileSync(resolve(root,'docs/GREInputxml.xml'),'utf8');
    await loaded(page,source,'refused.xml');
    const editor=page.locator('[data-ixw-b7-editor]');
    const original=await editor.inputValue();
    await setEditor(page,original.replace('</SectionDimensionBlock>',
      '<UNRECOGNIZED>2</UNRECOGNIZED></SectionDimensionBlock>'));
    await page.locator('[data-ixw-b7-action="check"]').click();
    await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','refused',{timeout:45000});
    await expect(page.locator('[data-ixw-b7-result]')).toContainText('S42_UNMAPPED_OR_DERIVED_PROJECTION_EDIT');
    await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
    mkdirSync(screenshots,{recursive:true});
    await page.locator('[data-ixw-b7-panel]').screenshot({path:resolve(screenshots,'refused-GRE.png')});
    await page.locator('[data-ixw-b7-action="reset"]').click();
    await expect(page.locator('[data-ixw-b7-editor]')).toHaveValue(original);
    await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
  });
  test('browser LF and CRLF exact source bytes retained across patch',async({page})=>{
    const raw=readFileSync(resolve(root,'docs/GREInputxml.xml'),'utf8');
    for(const [label,source] of [
      ['LF',raw.replace(/\r\n/g,'\n')],
      ['CRLF',raw.replace(/\r?\n/g,'\r\n')],
    ]){
      await open(page);
      await loaded(page,source,label+'.xml');
      await checkAndDownload(page,source,label+'.xml');
      await page.locator('[data-ixw-close="1"]').click();
    }
  });
  test('browser Continue editing from here refreshes S4.0 derived view and revokes download',async({page})=>{
    await open(page);
    const source=readFileSync(resolve(root,'docs/GREInputxml.xml'),'utf8');
    await loaded(page,source,'continue.xml');
    const baseline=await page.locator('[data-ixw-b7-editor]').inputValue();
    const edited=baseline.replace(/<DELTA_X>[^<]+<\/DELTA_X>/,
      '<DELTA_X>77.875</DELTA_X>');
    await setEditor(page,edited);
    await page.locator('[data-ixw-b7-action="check"]').click();
    await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','checked');
    const canonical=await page.locator('[aria-label="Regenerated Categorized preview"]').inputValue();
    expect(canonical).toContain('<DELTA_X>77.875</DELTA_X>');
    await page.locator('[data-ixw-b7-action="continue"]').click();
    await expect(page.locator('[data-ixw-b7-panel]')).toHaveAttribute('data-b7-phase','ready');
    await expect(page.locator('[data-ixw-b7-action="download"]')).toBeDisabled();
    await expect(page.locator('[data-ixw-b7-editor]')).toHaveValue(canonical);
  });
});
