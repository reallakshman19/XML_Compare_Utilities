import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const TEST='tests/uxml-edit-ops-step12.test.mjs';
const INV='uxml/UxmlEditOpsInvariants.js';
const FIELDS='uxml/UxmlInputXmlSourceFields.js';
const TYPED='uxml/UxmlEditOpsTypedInventory.js';
const VERIFY='uxml/UxmlEditOpsIndependentVerifier.js';
const WRITE='uxml/UxmlEditOpsPatchBack.js';
const S3='uxml/UxmlInputXmlSchemaMapper.js';
const specs=[
  {
    id:'I1_CHAIN_OWNER_INTERSECTION',file:INV,
    old:'a!==b&&!absorbed.has(b)',new:'true',
    name:'I-1 direct chain/cycle invariant refuses before geometry',
  },
  {
    id:'I1_GROUP_PAIRWISE',file:INV,
    old:'need(withinTolerance(witnesses[i].point,witnesses[j].point),',
    new:'need(true,',
    name:'I-1 direct full group all-pairs invariant refuses distant A1/A2',
  },
  {
    id:'I1_MISSING_COORDINATE',file:INV,
    old:'need(hits.length>0,STEP12_CODES.COORDINATE,',
    new:'need(true,STEP12_CODES.COORDINATE,',
    name:'I-1 direct missing physical source-literal endpoint refuses COORDINATE',
  },
  {
    id:'I2_CASE_NORMALISED_SOURCE_FIELD',file:FIELDS,
    old:"(a.field||a.name||'').toUpperCase()===key",
    new:"(a.field||a.name||'')===key",
    name:'I-2 source-field/v1 keeps raw/decoded/numeric/byteRange distinct',
  },
  {
    id:'I2_DUPLICATE_NORMALISED_FIELD',file:FIELDS,
    old:"guard(found.length<=1,'INPUT_XML_UNKNOWN_NODE_CARRIER'",
    new:"guard(true,'INPUT_XML_UNKNOWN_NODE_CARRIER'",
    name:'I-2 source-field/v1 keeps raw/decoded/numeric/byteRange distinct',
  },
  {
    id:'I2_SHARED_S3_READ',file:S3,
    old:'return sourceFieldValue(attrs,...names);',
    new:"return '';",
    name:'I-2 LT-2 case-hidden original absolute witness FROM_x',
  },
  {
    id:'I3_NEW_SELF_CONNECTION',file:INV,
    old:'need(!beforeDifferent||afterA!==afterB,STEP12_CODES.SELF,',
    new:'need(true,STEP12_CODES.SELF,',
    name:'I-3 direct newly introduced child collision refuses',
  },
  {
    id:'I4_UNKNOWN_CARRIER',file:TYPED,
    old:"if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};\n    throw error('INPUT_XML_UNSUPPORTED_NODE_CARRIER',{path:element.path,field,tag});",
    new:"if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};\n    return {kind:'KNOWN_NON_NODE'};",
    name:'I-4 direct unclassified potential numeric carrier remains unsupported',
  },
  {
    id:'I4_DOCUMENTED_UNPATCHED',file:TYPED,
    old:"'FORCESMOMENTS','FORCEMOMENTS'",
    new:"'UNRECOGNISEDMOMENTS','FORCEMOMENTS'",
    name:'I-4 LT-4d documented but unpatched node carriers refuse',
  },
  {
    id:'I4_TYPED_NON_NODE',file:TYPED,
    old:"if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};",
    new:"if(false)return {kind:'KNOWN_NON_NODE'};",
    name:'I-4 LT-4a/b public v14 ordinary numeric fields pass typed admission',
  },
  {
    id:'I5_INDEPENDENT_BYTE_COMPLEMENT',file:VERIFY,
    old:'originalByteProof(originalBytes,emittedBytes,ledger);',
    new:'void ledger;',
    name:'I-5 direct verifier independent byte-complement checks untouched comment',
  },
  {
    id:'I5_MANDATORY_VERIFIER_CALL',file:WRITE,
    old:'await verifyUxmlEditOpsIndependent({',
    new:'void ({',
    name:'I-5 mandatory separate verifier is called for every success',
  },
  {
    id:'I6_ATOMIC_NO_BYTES',file:WRITE,
    old:'if(e instanceof Refusal)return fail(e.code,e.detail);',
    new:"if(e instanceof Refusal)return {ok:true,bytes:new Uint8Array(),ledger:[],refusals:[]};",
    name:'I-6 atomic refusal emits zero bytes, never an empty successful file',
  },
  {
    id:'I7_NO_FALSE_AUTHORISATION',file:WRITE,
    old:"return {ok:true,bytes:candidateBytes,parity:'EQUAL',ledger,refusals:[]};",
    new:"return {ok:true,bytes:candidateBytes,parity:'EQUAL',ledger,refusals:[],authorised:true};",
    name:'I-7 XCU output never claims native TopoFix plan authorization',
  },
];
const run=(dir,args)=>spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',
  timeout:90000,env:Object.fromEntries(Object.entries(process.env)
    .filter(([key])=>key!=='NODE_TEST_CONTEXT'))});
for(const spec of specs){
  test('STEP12 kill '+spec.id+' GREEN control -> RED deleted guard',()=>{
    const dir=mkdtempSync(join(tmpdir(),'xcu-step12-mutant-'));
    try{
      cpSync(join(root,'uxml'),join(dir,'uxml'),{recursive:true});
      cpSync(join(root,'utils'),join(dir,'utils'),{recursive:true});
      mkdirSync(join(dir,'tests/fixtures'),{recursive:true});
      mkdirSync(join(dir,'docs'),{recursive:true});
      for(const name of ['GREInputxml.xml','PLB314Inputxml.xml'])
        cpSync(join(root,'docs',name),join(dir,'docs',name));
      cpSync(join(root,TEST),join(dir,TEST));
      cpSync(join(root,'tests/fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml'),
        join(dir,'tests/fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml'));
      writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
      const argv=['--test','--test-name-pattern='+spec.name,TEST];
      const green=run(dir,argv);
      assert.equal(green.status,0,spec.id+' GREEN control:\n'+green.stdout+'\n'+green.stderr);
      const path=join(dir,spec.file);
      const text=readFileSync(path,'utf8');
      assert.equal(text.split(spec.old).length-1,1,spec.id+' unique production seam');
      writeFileSync(path,text.replace(spec.old,()=>spec.new));
      const syntax=run(dir,['--check',spec.file]);
      assert.equal(syntax.status,0,spec.id+' must be valid syntax:\n'+syntax.stderr);
      const red=run(dir,argv);
      assert.notEqual(red.status,0,spec.id+' survived:\n'+red.stdout);
      assert.match(red.stdout,/not ok /,spec.id+' only a genuine failed assertion kills');
      assert.doesNotMatch(red.stderr,/ERR_MODULE_NOT_FOUND|SyntaxError/,
        spec.id+' cannot die from a missing file or JS parse error');
    }finally{
      rmSync(dir,{recursive:true,force:true});
    }
  });
}
