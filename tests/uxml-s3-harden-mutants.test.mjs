/** Read-only S3 structural-guard mutation kills; LF and simulated autocrlf. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const structure='uxml/UxmlInputXmlSourceStructure.js',strict='uxml/UxmlInputXmlSchemaMapper.js';
const files=[
  structure,strict,'uxml/UxmlInputXmlSourceFields.js','uxml/UxmlConstants.js','uxml/UxmlTypes.js',
  'uxml/UxmlValidationGate.js','uxml/UxmlInputXmlDeltaGraph.js',
  'utils/line-no-metadata.js','docs/GREInputxml.xml','docs/PLB314Inputxml.xml',
  'tests/uxml-s3-harden-source-structure.test.mjs',
];
function kill({name,target=structure,old,replacement,edits,pattern}){
  const dir=mkdtempSync(join(tmpdir(),'uxml-s3-source-mutant-'));
  try{
    for(const folder of ['uxml','utils','docs','tests'])mkdirSync(join(dir,folder));
    for(const path of files){
      const dst=join(dir,path);
      copyFileSync(join(root,path),dst);
      if(process.env.S3_MUTANT_COPY_CRLF==='1'&&/\.(?:m?js)$/.test(path))
        writeFileSync(dst,readFileSync(dst,'utf8').replace(/\r?\n/g,'\r\n'));
    }
    writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
    const exec=()=>spawnSync(process.execPath,
      ['--test','--test-name-pattern='+pattern,'tests/uxml-s3-harden-source-structure.test.mjs'],
      {cwd:dir,encoding:'utf8',timeout:45000,
       env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT'))});
    const baseline=exec();
    assert.equal(baseline.status,0,name+' baseline not PASS\n'+baseline.stdout+baseline.stderr);
    assert.match(baseline.stdout,/# pass 1\b/,'exactly one green target required');
    const file=join(dir,target);
    let code=readFileSync(file,'utf8').replace(/\r\n/g,'\n');
    for(const edit of edits??[{old,replacement}]){
      assert.equal(code.split(edit.old).length-1,1,
        name+': expected one exact seam, got '+(code.split(edit.old).length-1));
      code=code.replace(edit.old,edit.replacement);
    }
    writeFileSync(file,code);
    const failed=exec(),output=failed.stdout+'\n'+failed.stderr;
    assert.notEqual(failed.status,0,'SURVIVED '+name+'\n'+output);
    assert.match(output,/^not ok \d+ -/m,'target test must fail');
    assert.match(output,/# fail 1\b/,'target test must fail exactly once');
    process.stdout.write('RED_VERIFIED S3 '+name+' original targeted test failed # fail 1\n');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
const mutations=[
  {name:'STRICT_SOURCE_ADMISSION',
   target:strict,old:"if(!admittedSource)throw new Error('INPUT_XML_SOURCE_STRUCTURE_REFUSED');",
   replacement:"if(false&&!admittedSource)throw new Error('INPUT_XML_SOURCE_STRUCTURE_REFUSED');",
   pattern:'S3 STRUCTURE REFUSE comment-only physical record'},
  {name:'COMMENT_GHOST',
   old:"// MUTATION_GUARD_COMMENT_RANGE\n      if(hiddenPipingElement(open,close+3))return null;",
   replacement:"// MUTATION_GUARD_COMMENT_RANGE\n      if(false&&hiddenPipingElement(open,close+3))return null;",
   pattern:'S3 STRUCTURE REFUSE complete PIPINGELEMENT inside comment alongside real record'},
  {name:'PI_GHOST',
   old:"if(hiddenPipingElement(open,close+2))return null;",
   replacement:"if(false&&hiddenPipingElement(open,close+2))return null;",
   pattern:'S3 STRUCTURE REFUSE complete PIPINGELEMENT inside processing instruction'},
  {name:'CDATA_GHOST',
   old:"// MUTATION_GUARD_CDATA_RANGE\n      if(hiddenPipingElement(open,close+3))return null;",
   replacement:"// MUTATION_GUARD_CDATA_RANGE\n      if(false&&hiddenPipingElement(open,close+3))return null;",
   pattern:'S3 STRUCTURE REFUSE complete PIPINGELEMENT inside CDATA'},
  {name:'DOCTYPE_GHOST',
   old:"if(hiddenPipingElement(open,close))return null;",
   replacement:"if(false&&hiddenPipingElement(open,close))return null;",
   pattern:'S3 STRUCTURE REFUSE complete PIPINGELEMENT inside DOCTYPE'},
  {name:'AFTER_ROOT_GHOST',
   edits:[
    {old:"if(name!=='CAESARII'||rootCount||rootClosed||selfClosing)return null;",
     replacement:"if(false&&(name!=='CAESARII'||rootCount||rootClosed||selfClosing))return null;"},
    {old:"if(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL')return null;",
     replacement:"if(false&&(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL'))return null;"},
    {old:"rootCount!==1||modelCount!==1||!rootClosed",replacement:"false||modelCount!==1||!rootClosed"}
   ],
   pattern:'S3 STRUCTURE REFUSE element after closing CAESARII'},
  {name:'BETWEEN_MODEL_AND_ROOT',
   old:"if(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL')return null;",
   replacement:"if(false&&(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL'))return null;",
   pattern:'S3 STRUCTURE REFUSE element between closing PIPINGMODEL and CAESARII'},
  {name:'NESTED_MODEL_WRAPPER',
   old:"if(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL')return null;",
   replacement:"if(false&&(frames.length!==2||frames[0].name!=='CAESARII'||\n         frames[1].name!=='PIPINGMODEL'))return null;",
   pattern:'S3 STRUCTURE REFUSE nested row in model wrapper'},
  {name:'SECOND_ROOT',
   edits:[
    {old:"if(name!=='CAESARII'||rootCount||rootClosed||selfClosing)return null;",
     replacement:"if(false&&(name!=='CAESARII'||rootCount||rootClosed||selfClosing))return null;"},
    {old:"if(modelCount||frames.length!==1||frames[0].name!=='CAESARII'||selfClosing)return null;",
     replacement:"if(false&&(modelCount||frames.length!==1||frames[0].name!=='CAESARII'||selfClosing))return null;"},
    {old:"rootCount!==1||modelCount!==1||!rootClosed",replacement:"false||false||!rootClosed"}
   ],
   pattern:'S3 STRUCTURE REFUSE duplicate root'},
  {name:'SECOND_MODEL',
   edits:[
    {old:"if(modelCount||frames.length!==1||frames[0].name!=='CAESARII'||selfClosing)return null;",
     replacement:"if(false&&(modelCount||frames.length!==1||frames[0].name!=='CAESARII'||selfClosing))return null;"},
    {old:"rootCount!==1||modelCount!==1||!rootClosed",replacement:"rootCount!==1||false||!rootClosed"}
   ],
   pattern:'S3 STRUCTURE REFUSE duplicate PIPINGMODEL'},
  {name:'CLOSE_BALANCE',
   old:"if(current.name!==closing[1])return null;",
   replacement:"if(false&&current.name!==closing[1])return null;",
   pattern:'S3 STRUCTURE REFUSE unmatched closing tags'},
  {name:'TRAILER_TEXT',
   old:"if(!frames.length&&between.trim())return null;",
   replacement:"if(false&&!frames.length&&between.trim())return null;",
   pattern:'S3 STRUCTURE REFUSE trailing nonwhitespace text'},
  {name:'RESERVED_XML_PREFIX',
   old:"if(target.toLowerCase().startsWith('xml')){",
   replacement:"if(target.toLowerCase()==='xml'){",
   pattern:'S3 STRUCTURE REFUSE XML reserved prefix PI xml-foo'},
  {name:'DUPLICATE_ATTR',
   old:"if(!attr||seenAttrs.has(attr[1]))return null;",
   replacement:"if(!attr)return null;",
   pattern:'S3 STRUCTURE REFUSE duplicated element attribute'},
  {name:'RAW_LESS_THAN_ATTR',
   old:"else if(char==='<')return null; // raw '<' is forbidden in an attribute",
   replacement:"else if(char==='<'){} // mutation ignores raw < inside XML attribute",
   pattern:'S3 STRUCTURE REFUSE raw less-than inside attribute value'},
  {name:'S3_RECORDS_ONLY_OPTION_GUARD',
   target:strict,
   old:"const admittedSource=scanOriginalInputXmlStructure(text);",
   replacement:"const admittedSource=scanOriginalInputXmlStructure(text,{recordsOnlyModel:true});",
   pattern:'S3 ACCEPT public GRE and PLB314 UNITS siblings'},
];
for(const mutant of mutations)test('S3_HARDEN_MUTANT_KILL_'+mutant.name,()=>kill(mutant));
