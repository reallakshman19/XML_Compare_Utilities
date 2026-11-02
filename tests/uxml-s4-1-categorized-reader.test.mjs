/** S4.1 synthetic/public test contract; no private model data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {inputXmlToCategorizedInputXml as categorize} from '../xml-compare/CategorizedInputXmlConverter.js';
import {mapCategorizedInputXmlToUxml as read, UXML_CATEGORIZED_INPUTXML_REFUSALS as R}
  from '../uxml/UxmlCategorizedInputXmlSchemaMapper.js';
import {validateUxmlDocument} from '../uxml/UxmlValidationGate.js';

const sha=x=>createHash('sha256').update(Buffer.from(x,'utf8')).digest('hex');
const elem=(from,to,line,delta=10,other='')=>
  '<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+'" LINE_ID="'+line+
  '" DELTA_X="'+delta+'" DELTA_Y="-1.010100" DELTA_Z="-1.010100" '+
  'MATERIAL_NAME="STEEL" DIAMETER="100" WALL_THICK="6">'+other+'</PIPINGELEMENT>';
const input=(...elements)=>'<CAESARII XML_TYPE="Input"><PIPINGMODEL JOBNAME="SYNTH">'+elements.join('')+'</PIPINGMODEL></CAESARII>';
const fixture=()=>input(elem('10','20','A'),elem('20','30','B',11));
const run=(original,categorized=categorize(original),opts={})=>read(categorized,{
  originalInputXml:original,fileSha256:sha(original),...opts});
const refused=(result,code)=>{
  assert.equal(result.ok,false);
  assert.equal(result.code,code);
  assert.equal(result.uxml,null,'NO UXML on refusal');
  assert.equal(result.exportAllowed,false);
};
test('S4.1 SOURCE_BOUND unique physical refs, shared gate and no Apply authority',async()=>{
  const original=fixture(),res=await run(original);
  assert.equal(res.ok,true);
  assert.equal(res.status,'SOURCE_BOUND_READ_ONLY');
  assert.equal(res.sourceEquivalent,true);
  assert.equal(res.exportAllowed,false);
  assert.equal(res.uxml.schemaVersion,'uxml-topology-v1');
  assert.equal(res.uxml.sources[0].hash,sha(original));
  assert.deepEqual(res.uxml.components.map(c=>c.sourceRefs[0].recordKey),
    ['E0:F10:T20','E1:F20:T30']);
  for(const c of res.uxml.components){
    assert.equal(c.sourceRefs[0].format,'INPUT_XML');
    assert.equal(c.sourceRefs[0].fileSha256,sha(original));
    assert.equal(c.normalized.geometryAuthority,'NOT_INFERRED');
  }
  assert.equal(res.uxml.validation.qualifiedForApply,false);
  assert.deepEqual(res.gate,validateUxmlDocument(res.uxml),
    'shared UxmlValidationGate ran and is reproducible');
});
test('S4.1 physical ordinal survives regrouping by LINE_ID A/B/A',async()=>{
  const original=input(elem('10','20','A'),elem('20','30','B'),elem('30','40','A'));
  const cat=categorize(original);
  const res=await run(original,cat);
  assert.equal(res.ok,true);
  assert.deepEqual(res.uxml.components.map(c=>c.sourceRefs[0].recordKey),
    ['E0:F10:T20','E2:F30:T40','E1:F20:T30']);
});
test('S4.1 REFUSE wrong SHA before UXML construction',async()=>{
  refused(await run(fixture(),undefined,{fileSha256:'0'.repeat(64)}),R.SOURCE_HASH_MISMATCH);
});
test('S4.1 REFUSE missing measured SHA when original is supplied',async()=>{
  const src=fixture();
  refused(await read(categorize(src),{originalInputXml:src}),R.SOURCE_HASH_REQUIRED);
});
test('S4.1 REFUSE no source match when OriginalElement snapshot is edited',async()=>{
  const src=fixture(),cat=categorize(src).replace('DELTA_X="10"','DELTA_X="999"');
  refused(await run(src,cat),R.RECORD_NO_MATCH);
});
test('S4.1 REFUSE ambiguous byte-identical source records (never guess ordinal)',async()=>{
  const duplicate=elem('10','20','A');
  const src=input(duplicate,duplicate);
  refused(await run(src),R.RECORD_AMBIGUOUS);
});
test('S4.1 REFUSE repeated claim of one source record',async()=>{
  const src=input(elem('10','20','A')),cat=categorize(src);
  const block=cat.match(/<Element\b[\s\S]*?<\/Element>/)[0];
  const repeated=cat.replace(block,block+'\n'+block);
  refused(await run(src,repeated),R.RECORD_CLAIMED_TWICE);
});
test('S4.1 REFUSE unclaimed original record (incomplete categorized input)',async()=>{
  const src=fixture(),cat=categorize(src);
  const removed=cat.replace(/<Element\b[\s\S]*?<\/Element>/,'');
  refused(await run(src,removed),R.RECORD_UNCLAIMED);
});
test('S4.1 REFUSE missing record identity in Categorized element',async()=>{
  const src=fixture(),cat=categorize(src).replace('elementKey="10-&gt;20"','elementKey=""');
  refused(await run(src,cat),R.RECORD_KEY_MISSING);
});
test('S4.1 REFUSE unreviewed derived material change',async()=>{
  const src=fixture(),cat=categorize(src).replace('<MaterialName source="existing-field">STEEL</MaterialName>',
    '<MaterialName source="existing-field">UNREVIEWED</MaterialName>');
  refused(await run(src,cat),R.DERIVED_DIFF);
});
test('S4.1 explicit derived review marker does not become a committed edit',async()=>{
  const src=fixture(),cat=categorize(src).replace('<MaterialName source="existing-field">STEEL</MaterialName>',
    '<MaterialName source="existing-field">REVIEW_ONLY</MaterialName>'+
    '<ReviewMarker kind="DERIVED_DIFFERENCE" disposition="REVIEW_ONLY"/>');
  const res=await run(src,cat);
  assert.equal(res.ok,true);
  assert.equal(res.status,'REVIEW_REQUIRED');
  assert.equal(res.sourceEquivalent,false);
  assert.equal(res.exportAllowed,false);
  assert(res.uxml.components.some(c=>c.rawAttributes.categorized.derivedReviewOnly));
  assert(res.uxml.components[0].rawAttributes.inputXml.rawXml.includes('MATERIAL_NAME="STEEL"'));
});
test('S4.1 REFUSE modified line-level derived projection',async()=>{
  const src=fixture(),cat=categorize(src).replace('<Branchname>A</Branchname>',
    '<Branchname>INVENTED</Branchname>');
  refused(await run(src,cat),R.DERIVED_DIFF);
});
test('S4.1 REFUSE duplicated cross-branch RESTRAINT external evidence',async()=>{
  const restraint='<RESTRAINT NODE="20" TYPE="8" TAG="R1"/>';
  const src=input(elem('10','20','A',10,restraint),elem('20','30','B',11,restraint));
  refused(await run(src),R.EXTERNAL_DUPLICATE);
});
test('S4.1 REFUSE duplicated DISPLACEMENTS and FORCESMOMENTS stanzas',async()=>{
  for(const block of [
    '<DISPLACEMENTS NODE_NUM="20" DX="10"/>',
    '<FORCESMOMENTS NODE_NUM="20" FX="5"/>']){
    const src=input(elem('10','20','A',10,block),elem('20','30','B',11,block));
    refused(await run(src),R.EXTERNAL_DUPLICATE);
  }
});
test('S4.1 REFUSE unknown original header/section lost outside element snapshots',async()=>{
  const src=fixture().replace('<PIPINGMODEL','<OTHER_SECTION UNKNOWN="Y"/><PIPINGMODEL');
  refused(await run(src),R.UNKNOWN_SECTION);
});
test('S4.1 REFUSE malformed or unsupported Categorized schema',async()=>{
  refused(await read('<NotCategorized/>'),R.INVALID_CATEGORY);
  refused(await read(categorize(fixture()).replace('categorized-inputxml/v3','categorized-inputxml/v2')),
    R.INVALID_CATEGORY);
});
test('S4.1 no original is evidence-only NOT_SOURCE_EQUIVALENT and gate is not bypassed',async()=>{
  const res=await read(categorize(fixture()));
  assert.equal(res.ok,true);
  assert.equal(res.status,'NOT_SOURCE_EQUIVALENT');
  assert.equal(res.sourceEquivalent,false);
  assert.equal(res.exportAllowed,false);
  assert.equal(res.uxml.components.length,0,'no counterfeit sourceRefs');
  assert.equal(res.evidence.length,2);
  assert.equal(res.uxml.categorized.status,'NOT_SOURCE_EQUIVALENT');
  assert.equal(res.uxml.validation.ready,false,'source-unbound evidence is never admission-ready');
  assert.equal(res.uxml.validation.gateReady,res.gate.ready,
    'preserve the shared gate result without inventing admission authority');
});
test('S4.1 enriched is marker metadata and never a new input profile',async()=>{
  const src=fixture(),res=await run(src);
  assert.equal(res.ok,true);
  assert(res.uxml.categorized.enrichedSignals.includes('LINE_ID'));
  assert.equal(res.uxml.sources[0].format,'INPUT_XML');
});
test('S4.1 originalBytes SHA covers exact BOM and CRLF bytes',async()=>{
  const src='\ufeff'+fixture().replace(/></g,'>\r\n<');
  const bytes=Buffer.from(src,'utf8'),cat=categorize(src);
  const res=await read(cat,{originalBytes:bytes,fileSha256:createHash('sha256').update(bytes).digest('hex')});
  assert.equal(res.ok,true);
  assert.equal(res.uxml.components.length,2);
});
test('S4.1 public GRE/PLB314 categorized evidence-only, no source equivalence invention',async()=>{
  for(const [file,count] of [['GREInputxml.xml',100],['PLB314Inputxml.xml',53]]){
    const original=await readFile(new URL('../docs/'+file,import.meta.url),'utf8');
    const cat=categorize(original,{sourceName:file});
    const res=await read(cat);
    assert.equal(res.ok,true,file);
    assert.equal(res.status,'NOT_SOURCE_EQUIVALENT',file);
    assert.equal(res.evidence.length,count,file);
  }
});
