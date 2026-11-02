/** S4.1 source-guard mutations in disposable directories, never on product branch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const source=fileURLToPath(new URL('../',import.meta.url));
const mapper='uxml/UxmlCategorizedInputXmlSchemaMapper.js';
const files=[
 mapper,'uxml/UxmlInputXmlSourceStructure.js','uxml/UxmlConstants.js','uxml/UxmlTypes.js','uxml/UxmlValidationGate.js',
 'uxml/UxmlInputXmlSchemaMapper.js','uxml/UxmlInputXmlDeltaGraph.js',
 'utils/line-no-metadata.js',
 'docs/PLB314Inputxml.xml','docs/GREInputxml.xml',
 'xml-compare/CategorizedInputXmlConverter.js',
 'xml-compare/XmlCompareCoordinateSideload.js',
 'xml-compare/XmlCompareCoordinateDiagnostics.js',
 'tests/uxml-s4-1-categorized-reader.test.mjs',
];
function kill({name,old,replacement,edits,pattern,target=mapper}){
  const dir=mkdtempSync(join(tmpdir(),'uxml-s4-1-mutant-'));
  try{
    for(const folder of ['uxml','xml-compare','tests','utils','docs'])mkdirSync(join(dir,folder));
    for(const file of files){
      const dest=join(dir,file);
      copyFileSync(join(source,file),dest);
      if(process.env.S4_MUTANT_COPY_CRLF==='1'&&/\.(?:m?js)$/.test(file))
        writeFileSync(dest,readFileSync(dest,'utf8').replace(/\r?\n/g,'\r\n'));
    }
    writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
    const exec=()=>spawnSync(process.execPath,['--test','--test-name-pattern='+pattern,
      'tests/uxml-s4-1-categorized-reader.test.mjs'],
      {cwd:dir,encoding:'utf8',timeout:45000,
        env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT'))});
    const green=exec();
    assert.equal(green.status,0,'baseline regression not green: '+name+'\n'+green.stdout+green.stderr);
    assert.match(green.stdout,/# pass 1\b/,'targeted baseline must run');
    const file=join(dir,target);
    // Normalize LF/Windows-autocrlf copies BEFORE exact mutation seams.
    let code=readFileSync(file,'utf8').replace(/\r\n/g,'\n');
    for(const edit of edits??[{old,replacement}]){
      assert.equal(code.split(edit.old).length-1,1,
        'must mutate one exact guard: '+name);
      code=code.replace(edit.old,edit.replacement);
    }
    writeFileSync(file,code);
    const red=exec(),output=red.stdout+'\n'+red.stderr;
    assert.notEqual(red.status,0,'SURVIVED '+name+'\n'+output);
    assert.match(output,/^not ok \d+ -/m,'targeted regression must fail, not just setup');
    assert.match(output,/# fail 1\b/,'one targeted regression must fail');
    process.stdout.write('RED_VERIFIED S4.1 '+name+' status='+red.status+' original regression # fail 1\n');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
const mutants=[
  {name:'SHA256_GUARD',
    old:"if(measured!==clean(options.fileSha256).toLowerCase())",
    replacement:"if(false&&measured!==clean(options.fileSha256).toLowerCase())",
    pattern:'S4.1 REFUSE wrong SHA'},
  {name:'RECORD_KEY_GUARD',
    old:"if(!clean(fromNode)||!clean(toNode)||!clean(elementKey))",
    replacement:"if(false&&(!clean(fromNode)||!clean(toNode)||!clean(elementKey)))",
    pattern:'S4.1 REFUSE missing record identity'},
  {name:'NO_MATCH_GUARD',
    old:"if(candidateRows.length===0)",
    replacement:"if(false&&candidateRows.length===0)",
    pattern:'S4.1 REFUSE no source match'},
  {name:'AMBIGUOUS_DUPLICATE_GUARD',
    old:"if(candidateRows.length>1)",
    replacement:"if(false&&candidateRows.length>1)",
    pattern:'S4.1 REFUSE ambiguous byte-identical'},
  {name:'ONE_TO_ONE_GUARD',
    old:"if(claimed.has(candidate.index))",
    replacement:"if(false&&claimed.has(candidate.index))",
    pattern:'S4.1 REFUSE repeated claim'},
  {name:'COVERAGE_GUARD',
    old:"if(claimed.size!==originalRows.length)",
    replacement:"if(false&&claimed.size!==originalRows.length)",
    pattern:'S4.1 REFUSE unclaimed original record'},
  {name:'DERIVED_GUARD',
    old:"if(element.evidence!==expected.evidence&&!element.explicitReview)",
    replacement:"if(false&&element.evidence!==expected.evidence&&!element.explicitReview)",
    pattern:'S4.1 REFUSE unreviewed derived'},
  {name:'EXTERNAL_DUPLICATE_GUARD',
    old:"if(repeatedExternalBlock(originalRows))",
    replacement:"if(false&&repeatedExternalBlock(originalRows))",
    pattern:'S4.1 REFUSE duplicated cross-branch RESTRAINT'},
  {name:'UNKNOWN_SECTION_GUARD',
    old:"if(hasUnknownSourceSection(supplied.text,originalRows))",
    replacement:"if(false&&hasUnknownSourceSection(supplied.text,originalRows))",
    pattern:'S4.1 REFUSE unknown original header'},
  {name:'SOURCE_HASH_REQUIRED_GUARD',
    old:"if(!/^[a-f0-9]{64}$/i.test(clean(options.fileSha256)))",
    replacement:"if(false&&!/^[a-f0-9]{64}$/i.test(clean(options.fileSha256)))",
    pattern:'S4.1 REFUSE missing measured SHA'},
  {name:'ORIGINAL_STRUCTURE_GUARD',
    old:"if(!originalRows)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_STRUCTURE);",
    replacement:"if(false&&!originalRows)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_STRUCTURE);",
    pattern:'S4.1 STRUCTURE REFUSE mismatched model closing tag'},
  {name:'PHYSICAL_ROW_NULL_GUARD',
    old:"return physical.some(row=>row===null)?null:physical;",
    replacement:"return physical;",
    pattern:'S4.1 STRUCTURE REFUSE missing FROM_NODE after valid lexical parse'},
  {name:'DERIVED_LINE_GUARD',
    old:"if(expectedLines.get(line.id)!==line.decoration)",
    replacement:"if(false&&expectedLines.get(line.id)!==line.decoration)",
    pattern:'S4.1 REFUSE modified line-level'},
  {name:'LINE_OWNERSHIP_GUARD',
    old:"row.lineId===element.lineId",
    replacement:"true",
    pattern:'S4.1 REFUSE moved Categorized Element'},
  {name:'UXML_GATE_REJECTION_GUARD',
    old:"if(!gate.ready)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.GATE_REJECTED);",
    replacement:"if(false&&!gate.ready)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.GATE_REJECTED);",
    pattern:'S4.1 REFUSE source-bound output on failed shared'},
  {name:'REVIEW_MARKER_CDATA_GUARD',
    old:"const markers=[...projectionText.matchAll(/<ReviewMarker\\b([^>]*?)\\/>/gi)];",
    replacement:"const markers=[...body.matchAll(/<ReviewMarker\\b([^>]*?)\\/>/gi)];",
    pattern:'S4.1 REFUSE fake ReviewMarker in original snapshot'},
  {name:'BALANCED_END_TAG_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"if(current.name!==closing[1])return null;",
    replacement:"if(false&&current.name!==closing[1])return null;",
    pattern:'S4.1 STRUCTURE REFUSE mismatched model closing tag'},
  {name:'S3_AGREEMENT_REFUSAL_GUARD',
    old:"if(!s3Agreement.ok)",
    replacement:"if(false&&!s3Agreement.ok)",
    pattern:'S4.1 REFUSE when strict S3 reader throws even though lexical source is valid'},
  {name:'S3_KEY_SET_GUARD',
    old:"if(!matchesStrictS3KeySet)",
    replacement:"if(false&&!matchesStrictS3KeySet)",
    pattern:'S4.1 REFUSE key mismatch against independent strict S3 set'},
  {name:'ORIGINAL_ENCODING_GUARD',
    old:"if(!supplied)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_ENCODING);",
    replacement:"if(false&&!supplied)return refuse(UXML_CATEGORIZED_INPUTXML_REFUSALS.ORIGINAL_ENCODING);",
    pattern:'S4.1 REFUSE invalid original byte encoding'},
  {name:'ORIGINAL_INPUT_CONFLICT_GUARD',
    old:"if(encoded.length!==options.originalBytes.length||\n       encoded.some((byte,index)=>byte!==options.originalBytes[index]))",
    replacement:"if(false&&(encoded.length!==options.originalBytes.length||\n       encoded.some((byte,index)=>byte!==options.originalBytes[index])))",
    pattern:'S4.1 REFUSE contradictory originalBytes and originalInputXml'},

  {name:'COMMENT_RANGE_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"// MUTATION_GUARD_COMMENT_RANGE\n      if(hiddenPipingElement(open,close+3))return null;",
    replacement:"// MUTATION_GUARD_COMMENT_RANGE\n      if(false&&hiddenPipingElement(open,close+3))return null;",
    pattern:'S4.1 STRUCTURE REFUSE complete commented row with real sibling'},
  {name:'PI_RANGE_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"if(hiddenPipingElement(open,close+2))return null;",
    replacement:"if(false&&hiddenPipingElement(open,close+2))return null;",
    pattern:'S4.1 STRUCTURE REFUSE complete PIPINGELEMENT inside XML processing instruction'},
  {name:'CDATA_RANGE_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"// MUTATION_GUARD_CDATA_RANGE\n      if(hiddenPipingElement(open,close+3))return null;",
    replacement:"// MUTATION_GUARD_CDATA_RANGE\n      if(false&&hiddenPipingElement(open,close+3))return null;",
    pattern:'S4.1 STRUCTURE REFUSE PIPINGELEMENT text inside CDATA'},
  {name:'DOCTYPE_RANGE_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"if(hiddenPipingElement(open,close))return null;",
    replacement:"if(false&&hiddenPipingElement(open,close))return null;",
    pattern:'S4.1 STRUCTURE REFUSE PIPINGELEMENT text inside DOCTYPE'},
  {name:'S4_REAL_UNITS_SCANNER_OPTION_GUARD',
    old:"const tokens=scanOriginalInputXmlStructure(text);",
    replacement:"const tokens=scanOriginalInputXmlStructure(text,{recordsOnlyModel:true});",
    pattern:'S4.1 ACCEPT real CAESAR with UNITS: docs/GREInputxml.xml'},
  {name:'S4_REAL_UNITS_SECTION_GUARD',
    old:".replace(/<UNITS\\b[^>]*\\/>|<UNITS\\b[^>]*>[\\s\\S]*?<\\/UNITS\\s*>/gi,'')",
    replacement:".replace(/<UNITS\\b[^>]*\\/>|<UNITS\\b[^>]*>[\\s\\S]*?<\\/UNITS\\s*>/gi,'__MUTATED_UNKNOWN_UNITS__')",
    pattern:'S4.1 ACCEPT real CAESAR with UNITS: docs/GREInputxml.xml'},
  {name:'S4_REAL_UNITS_SNAPSHOT_GUARD',
    old:"return /^<UNITS\\b[^>]*>[\\s\\S]*<\\/UNITS\\s*>$/i.test(extra);",
    replacement:"return false;",
    pattern:'S4.1 ACCEPT real CAESAR with UNITS: docs/PLB314Inputxml.xml'},
  {name:'S4_SOURCE_SNAPSHOT_CONTIGUITY_GUARD',
    old:"!source.includes(snapshot))return false;",
    replacement:"false)return false;",
    pattern:'S4.1 REFUSE forged UNITS suffix in last converter-carried OriginalElement'},
  {name:'S4_ACTIVE_EXTERNAL_PLACEHOLDER_GUARD',
    old:"if(!converter.activeNodeBlock(literal))continue;",
    replacement:"if(false&&!converter.activeNodeBlock(literal))continue;",
    pattern:'S4.1 ACCEPT real CAESAR with UNITS: docs/GREInputxml.xml'},
  {name:'DIRECT_MODEL_CHILD_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"if(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL')return null;",
    replacement:"if(false&&(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL'))return null;",
    pattern:'S4.1 STRUCTURE REFUSE row between PIPINGMODEL end'},
  {name:'TRAILING_ROOT_TEXT_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"if(!frames.length&&between.trim())return null;",
    replacement:"if(false&&!frames.length&&between.trim())return null;",
    pattern:'S4.1 STRUCTURE REFUSE non-whitespace after root'},
  {name:'COMMENT_ONLY_NO_RECORD_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    edits:[
      {old:"// MUTATION_GUARD_COMMENT_RANGE\n      if(hiddenPipingElement(open,close+3))return null;",
       replacement:"// MUTATION_GUARD_COMMENT_RANGE\n      if(false&&hiddenPipingElement(open,close+3))return null;"},
      {old:"!rootClosed||!physical.length)return null;",
       replacement:"!rootClosed||false)return null;"}
    ],
    pattern:'S4.1 STRUCTURE REFUSE only PIPINGELEMENT contained in comment'},
  {name:'AFTER_ROOT_RECORD_SCOPE_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    edits:[
      {old:"if(name!=='CAESARII'||rootCount||rootClosed||selfClosing)return null;",
       replacement:"if(false&&(name!=='CAESARII'||rootCount||rootClosed||selfClosing))return null;"},
      {old:"if(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL')return null;",
       replacement:"if(false&&(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL'))return null;"},
      {old:"rootCount!==1||modelCount!==1||!rootClosed",
       replacement:"false||modelCount!==1||!rootClosed"}
    ],
    pattern:'S4.1 STRUCTURE REFUSE row after closed CAESARII root'},
  {name:'NULL_OPTIONS_GUARD',
    old:"options=options??{};",
    replacement:"options=options;",
    pattern:'S4.1 null and undefined options become evidence-only defaults'},
  {name:'DUPLICATE_ATTRIBUTE_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"if(!attr||seenAttrs.has(attr[1]))return null;",
    replacement:"if(!attr)return null;",
    pattern:'S4.1 SHARED REFUSE duplicate XML attributes'},
  {name:'RAW_LT_ATTRIBUTE_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"else if(char==='<')return null; // raw '<' is forbidden in an attribute",
    replacement:"else if(char==='<'){} // MUTATED raw '<' accepted in an attribute",
    pattern:'S4.1 SHARED REFUSE raw less-than in attribute'},
  {name:'RESERVED_XML_PI_GUARD',
    target:'uxml/UxmlInputXmlSourceStructure.js',
    old:"if(target.toLowerCase().startsWith('xml')){",
    replacement:"if(target.toLowerCase()==='xml'){",
    pattern:'S4.1 SHARED REFUSE reserved xml-foo PI target'},
];
for(const mutant of mutants)
  test('S4.1_MUTANT_KILL_'+mutant.name,()=>kill(mutant));
