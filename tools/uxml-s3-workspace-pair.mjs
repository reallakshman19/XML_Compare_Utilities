#!/usr/bin/env node
/**
 * Reproduce the committed S3 InputXML via actual Workspace Clean XML -> 5C
 * conversion in Chromium. --emit-base64 is for initial fixture custody;
 * --verify fails if the committed generated InputXML is not exact.
 */
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const inputPath=join(root,'tests/fixtures/uxml-s3-synthetic.psi116.xml');
const outputPath=join(root,'tests/fixtures/uxml-s3-synthetic.workspace.input.xml');
const source=readFileSync(inputPath,'utf8');
const serve=createServer((req,res)=>{
  const uri=decodeURIComponent((req.url||'/').split('?')[0]);
  const target=resolve(root,'.'+uri);
  if(!target.startsWith(resolve(root)+sep) || !existsSync(target)) {
    res.writeHead(404);res.end('Not found');return;
  }
  const ext=extname(target).toLowerCase();
  res.writeHead(200,{'Content-Type': ext==='.js'||ext==='.mjs'?'text/javascript':
    ext==='.html'?'text/html':'text/plain'});
  res.end(readFileSync(target));
});
await new Promise(ok=>serve.listen(0,'127.0.0.1',ok));
const port=serve.address().port;
let browser;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded'});
  const output=await page.evaluate(async original=>{
    const clean=await import('/tabs/inputxml-workspace/inputxml-workspace-cleanxml.js');
    const converter=await import('/tabs/model-converters/xml-cii-node-to-inputxml-core.js');
    const {cleanXmlText}=clean.buildCleanXml(original,
      {sourceName:'S3 Synthetic Workspace Clean XML'});
    const converted=converter.buildInputXmlFromNodeXml(cleanXmlText,{
      applyEnrichment:false, enableShortFillers:false,enableRayFillers:false,
      jobName:'S3_SYNTHETIC_PARITY',
    });
    if(!converted?.ok)throw Error('Workspace 5C conversion did not succeed');
    if(converted.summary.elementCount!==1)
      throw Error('Expected exactly 1 Workspace-generated PIPINGELEMENT, got '+
        converted.summary.elementCount);
    return {inputXml:converted.coreInputXmlText,summary:converted.summary,
      cleanXmlSha:cleanXmlText.length};
  },source);
  const digest=createHash('sha256').update(output.inputXml,'utf8').digest('hex');
  console.log('WORKSPACE_5C_ELEMENT_COUNT='+output.summary.elementCount);
  console.log('WORKSPACE_5C_INPUTXML_SHA256='+digest);
  if(process.argv.includes('--emit-base64')) {
    console.log('WORKSPACE_5C_INPUTXML_BASE64='+Buffer.from(output.inputXml,'utf8').toString('base64'));
  }
  if(process.argv.includes('--verify')){
    if(!existsSync(outputPath))throw Error('Committed fixture not present: '+outputPath);
    const committed=readFileSync(outputPath,'utf8');
    if(committed!==output.inputXml)throw Error('Committed pair differs from real Workspace conversion');
    console.log('WORKSPACE_GENERATED_PAIR_BYTES_EQUAL');
  }
}finally{
  await browser?.close();
  await new Promise(ok=>serve.close(ok));
}
