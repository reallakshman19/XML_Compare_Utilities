/** S4.0 Workspace stages and marker evidence. Synthetic input only.
 * Stage 2 is the actual inputxml-workspace-tab apply-sideload path, not
 * the separate standalone DOM serializer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildCleanXmlFromTables} from '../docs/tabs/inputxml-workspace/inputxml-workspace-cleanxml.js';
import {applyXmlCompareSideload} from '../docs/xml-compare/XmlCompareSideloadEnricher.js';
import {detectXmlWorkspaceSchema} from '../docs/tabs/inputxml-workspace/inputxml-workspace-xml-detect.js';
import {inputXmlFrom5CResult,enrichmentInputPreflight}
 from '../docs/tabs/inputxml-workspace/inputxml-workspace-orchestration.js';
import {inputXmlToCategorizedInputXml as categorize}
 from '../docs/xml-compare/CategorizedInputXmlConverter.js';

const raw='<CAESARII XML_TYPE="Input"><PIPINGMODEL JOBNAME="S4">'+
 '<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" LINE_ID='+"'OLD'"+
 ' DELTA_X="10" MATERIAL_NUM="7"><!-- KEEP-S4 -->'+
 '<RESTRAINT NODE="20" TYPE="8" STIFFNESS="100" GAP="0" CNODE="0"/>'+
 '</PIPINGELEMENT></PIPINGMODEL></CAESARII>';
const markers=['PipingClass','Rating','DTXR_POS','DTXR_PS','MaterialNumber',
 'MaterialName','LINE_ID','FROM_NAME','TO_NAME'];
const table={
 lineIdText:'FROM_NODE\tTO_NODE\tLINE_ID\n10\t20\tL91261',
 nodeNameText:'FROM_NODE\tTO_NODE\tFROM_NAME\tTO_NAME\n10\t20\tSTART_S4\tEND_S4',
};
const enriched=applyXmlCompareSideload(raw,table).xmlText;
const sourceWithMarkers=raw.replace('<!-- KEEP-S4 -->',
 '<PipingClass>91261</PipingClass><Rating>900</Rating>'+
 '<DTXR_POS>DTXR-A</DTXR_POS><DTXR_PS>DTXR-B</DTXR_PS>'+
 '<MaterialNumber>7</MaterialNumber><MaterialName>S4-STEEL</MaterialName><!-- KEEP-S4 -->');
const preserved=applyXmlCompareSideload(sourceWithMarkers,table).xmlText;
const tables={branches:[{branchName:'BRANCH-S4',materialNumber:'7',
 materialName:'S4-STEEL',pipingClass:'91261',rating:'900',
 nodes:[{nodeNumber:10,nodeNumberRaw:'10',nodeName:'START_S4',componentType:'PIPE',
 position:{x:0,y:0,z:0},pipingClass:'91261',rating:'900',
 materialName:'S4-STEEL',materialCode:'7',dtxrPos:'DTXR-A',dtxrPs:'DTXR-B'}]}]};
const clean=buildCleanXmlFromTables(tables);
const category=categorize(enriched,{sourceName:'S4'});

test('S4-STAGES stage 1 is new CleanXML, stage 2 remains InputXML, stage 4 is CategorizedInputXML',()=>{
 assert.match(clean,/<CleanXML schema=/);
 assert.match(enriched,/<CAESARII XML_TYPE="Input">/);
 assert.match(category,/<CategorizedInputXML schema=/);
});
for(const marker of markers){
 test('S4-MARKER-STAGE1-'+marker+' CleanXML node/branch projection vs InputXML attributes',()=>{
  if(['LINE_ID','FROM_NAME','TO_NAME'].includes(marker)){
   assert.ok(!clean.includes(marker+'='),'CleanXML is node/branch tag schema');
   if(marker!=='LINE_ID')assert.ok(clean.includes('<NodeName>START_S4</NodeName>'));
  }else{
   assert.ok(clean.includes('<'+marker+'>'),'tag emitted by CleanXML table source');
  }
 });
 test('S4-MARKER-STAGE2-'+marker+' sideload adds only its three supported markers and keeps existing others',()=>{
  if(['LINE_ID','FROM_NAME','TO_NAME'].includes(marker)){
   assert.match(enriched,new RegExp('\\b'+marker+'="[^"]+"'));
  }else{
   assert.ok(!enriched.includes('<'+marker+'>'),'Tab 2 does not manufacture this marker');
   assert.ok(preserved.includes('<'+marker+'>'),'existing enrichment tag stays present');
  }
 });
}
// Stage 3 is the 5C handoff; it MUST NOT synthesize or discard any one
// of the nine recognized marker fields in an already generated InputXML.
const allMarkerSource=enriched.replace('<!-- KEEP-S4 -->',
 '<PipingClass>91261</PipingClass><Rating>900</Rating>'+
 '<DTXR_POS>DTXR-A</DTXR_POS><DTXR_PS>DTXR-B</DTXR_PS>'+
 '<MaterialNumber>7</MaterialNumber><MaterialName>S4-STEEL</MaterialName><!-- KEEP-S4 -->');
const handed=inputXmlFrom5CResult({
 finalInputXmlText:allMarkerSource,diagnostics:{summary:{elementCount:1}},
});
const categorizedAll=categorize(allMarkerSource,{sourceName:'S4-All-Markers'});
for(const marker of markers){
 test('S4-MARKER-STAGE3-'+marker+' 5C handoff carries source marker unchanged',()=>{
  assert.equal(handed.ok,true);
  assert.equal(handed.text,allMarkerSource);
  if(['LINE_ID','FROM_NAME','TO_NAME'].includes(marker))
   assert.match(handed.text,new RegExp('\\b'+marker+'="[^"]+"'));
  else assert.ok(handed.text.includes('<'+marker+'>'));
 });
 test('S4-MARKER-STAGE4-'+marker+' Categorized OriginalElement carries marker, not edits to InputXML',()=>{
  assert.ok(categorizedAll.includes('<OriginalElement><![CDATA['));
  if(['LINE_ID','FROM_NAME','TO_NAME'].includes(marker))
   assert.ok(categorizedAll.includes(marker+'="'));
  else assert.ok(categorizedAll.includes('<'+marker+'>'));
 });
}
test('S4-STAGE2-ATTRVALUES sideload replaces existing LINE_ID and adds FROM_NAME/TO_NAME',()=>{
 assert.ok(enriched.includes('LINE_ID="L91261"'));
 assert.ok(enriched.includes('FROM_NAME="START_S4"'));
 assert.ok(enriched.includes('TO_NAME="END_S4"'));
 assert.ok(!enriched.includes("LINE_ID='OLD'"));
});
test('S4-STAGE2-UNCHANGED source is byte-identical when no matching sideload values are supplied',()=>{
 const unchanged=applyXmlCompareSideload(raw,{}).xmlText;
 assert.equal(unchanged,raw);
});
test('S4-STAGE2-FORMAT single-quote becomes double and attributes append; unrelated body is unchanged',()=>{
 const oldTag=raw.match(/<PIPINGELEMENT\b[^>]*>/)[0];
 const newTag=enriched.match(/<PIPINGELEMENT\b[^>]*>/)[0];
 assert.notEqual(oldTag,newTag);
 assert.ok(oldTag.includes("LINE_ID='OLD'"));
 assert.ok(newTag.includes('LINE_ID="L91261"'));
 assert.ok(newTag.indexOf('FROM_NODE')<newTag.indexOf('TO_NODE'));
 assert.ok(newTag.indexOf('TO_NODE')<newTag.indexOf('LINE_ID'));
 assert.ok(newTag.indexOf('LINE_ID')<newTag.indexOf('FROM_NAME'));
 assert.equal(enriched.replace(newTag,''),raw.replace(oldTag,''),
  'Tab 2 mutates matched opening tags, not a document-wide XML serialization');
});
test('S4-STAGE2-OTHER-SOURCE-ATTR source MATERIAL_NUM remains unchanged by sideload',()=>{
 assert.ok(enriched.includes('MATERIAL_NUM="7"'));
 assert.ok(enriched.includes('<!-- KEEP-S4 -->'));
});
test('S4-STAGE3-5C-HANDOFF accepts a separately generated InputXML string and does not add marker fields',()=>{
 const handoff=inputXmlFrom5CResult({finalInputXmlText:raw,diagnostics:{summary:{elementCount:1}}});
 assert.equal(handoff.ok,true);
 assert.equal(handoff.text,raw);
 for(const tag of ['PipingClass','Rating','DTXR_POS','DTXR_PS','MaterialNumber','MaterialName'])
  assert.ok(!handoff.text.includes('<'+tag+'>'));
 assert.ok(handoff.text.includes('MATERIAL_NUM="7"'),'the source field is not renamed MaterialNumber');
});
test('S4-STAGE3-5C-HANDOFF refuses zero or wrongly classified output; not a source preservation promise',()=>{
 assert.equal(inputXmlFrom5CResult({finalInputXmlText:raw,diagnostics:{summary:{elementCount:0}}}).ok,false);
 assert.equal(inputXmlFrom5CResult({finalInputXmlText:'<INVALID/>',diagnostics:{summary:{elementCount:1}}}).ok,false);
});
test('S4-STAGE4-CATEGORIZED derives blocks but original InputXML evidence is still CDATA snapshot',()=>{
 assert.ok(category.includes('<Line id="L91261">'));
 assert.ok(category.includes('<OriginalElement><![CDATA['));
 assert.ok(category.includes('FROM_NAME="START_S4"'));
 assert.ok(category.includes('<NameBlock>'));
 assert.ok(category.includes('<RouteGeometryBlock>'));
});
test('S4-ENRICH-DETECT enriched is a marker boolean within a kind, not a fourth format',()=>{
 const plain=detectXmlWorkspaceSchema({name:'x.input.xml',text:raw.replace(" LINE_ID='OLD'",'')});
 const marked=detectXmlWorkspaceSchema({name:'x.input.xml',text:enriched});
 const cat=detectXmlWorkspaceSchema({name:'s4.xml',text:category});
 assert.equal(plain.kind,'inputxml');
 assert.equal(plain.enriched,false);
 assert.equal(marked.kind,'inputxml');
 assert.equal(marked.enriched,true);
 assert.ok(marked.enrichedSignals.includes('LINE_ID'));
 assert.ok(marked.enrichedSignals.includes('FROM_NAME'));
 assert.equal(cat.kind,'categorizedxml');
 assert.equal(cat.enriched,true);
 assert.equal(enrichmentInputPreflight(category).ok,false,
  'Tab 2 preflight is schema gated, not enriched marker gated');
});
test('S4-STAGE2-PUBLIC examples GRE/PLB stay InputXML when enrichment signals already exist',async()=>{
 for(const file of ['GREInputxml.xml','PLB314Inputxml.xml']){
  const rawPublic=await readFile(new URL('../docs/'+file,import.meta.url),'utf8');
  const result=applyXmlCompareSideload(rawPublic,{});
  assert.equal(result.xmlText,rawPublic,'zero sideload preserves source text');
  const detection=detectXmlWorkspaceSchema({name:file,text:result.xmlText});
  assert.equal(detection.kind,'inputxml');
 }
});
