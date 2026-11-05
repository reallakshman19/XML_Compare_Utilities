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
  {id:'R1_KNOWN_TAG_TEXT',file:TYPED,
    old:"assertModelCharacterData(raw,'element-text');",
    new:"void raw;",
    name:'R2 Step12 ambiguous element text refuses'},
  {id:'R1_KNOWN_TAG_CDATA',file:TYPED,
    old:"assertModelCharacterData(text.slice(open+9,end),'cdata');",
    new:"void end;",
    name:'R2 Step12 ambiguous CDATA refuses'},
  {id:'R1_BEND_PARENT_PLANNER',file:INV,
    old:"if(family==='BEND')\n          for(const slot of slots)for(const parent of endpoint)visit(slot,parent);",
    new:"if(false)\n          for(const slot of slots)for(const parent of endpoint)visit(slot,parent);",
    name:'R1 planner BEND-parent-only collision independently refuses SELF'},
  {id:'R1_BEND_PARENT_VERIFIER',file:VERIFY,
    old:"if(family==='BEND')\n          for(const c of values)for(const e of endpoint)pair(c,e);",
    new:"if(false)\n          for(const c of values)for(const e of endpoint)pair(c,e);",
    name:'R1 independent verifier BEND-parent-only collision refuses SELF'},
  {id:'R1_VERIFIER_CHAIN',file:VERIFY,
    old:"assert(a!==b&&!aIds.has(b),C.CHAIN,",
    new:"assert(true,C.CHAIN,",
    name:'R1 verifier CHAIN rejects byte-consistent candidate'},
  {id:'R1_VERIFIER_COORD',file:VERIFY,
    old:"assert(hits>0,C.COORD,",
    new:"assert(true,C.COORD,",
    name:'R1 verifier COORD refuses unobserved owner'},
  {id:'R1_VERIFIER_GROUP',file:VERIFY,
    old:"assert(dist(points[i],points[j])<=INPUTXML_DELTA_TOLERANCE,",
    new:"assert(true,",
    name:'R1 verifier GROUP refuses original spread'},
  {id:'R1_VERIFIER_SELF',file:VERIFY,
    old:"assert(a.key===b.key||mappedA!==mappedB,C.SELF,",
    new:"assert(true,C.SELF,",
    name:'R1 independent verifier BEND-parent-only collision refuses SELF'},
  {id:'R1_VERIFIER_CHANGED_COUNT',file:VERIFY,
    old:"assert(changed===ledger.length,C.TOPO,",
    new:"assert(true,C.TOPO,",
    name:'R1 verifier changed-count exact check'},
  {id:'R1_VERIFIER_TEXT',file:VERIFY,
    old:"assert(before.textItems.length===after.textItems.length&&\n    before.textItems.every((a,i)=>a.path===after.textItems[i].path&&\n      a.raw===after.textItems[i].raw),C.TEXT);",
    new:"assert(true,C.TEXT);",
    name:'R1 verifier text-item equality detects'},
  {id:'R1_VERIFIER_OWNER',file:VERIFY,
    old:"assert(originals.length>0&&new Set(originals).size===1,C.OWNER);",
    new:"assert(true,C.OWNER);",
    name:'R1 verifier OWNER source spelling'},
  {id:'R1_VERIFIER_S3_POINT',file:VERIFY,
    old:"assert(originalPort&&finalPort&&\n    dist(originalPort.point,finalPort.point)<=INPUTXML_DELTA_TOLERANCE,",
    new:"assert(true,",
    name:'R1 verifier S3 point parity refuses'},
  {
    id:'R2_SHARED_MODEL_TEXT_GUARD',file:TYPED,
    old:"guard(XML_WHITESPACE.test(raw)||(!stack.some(e=>e.fold==='PIPINGMODEL')&&",
    new:"guard(true||(!stack.some(e=>e.fold==='PIPINGMODEL')&&",
    name:'R2 Step12 ambiguous element text refuses',
  },
  {
    id:'R2_PLANNER_ANCHORED_FRAME',file:INV,
    old:"need(Number.isInteger(idx)&&port.anchored===true&&ref.anchored===true&&",
    new:"need(Number.isInteger(idx)&&true&&ref.anchored===true&&",
    name:'R2 PIN planner source physical anchor/frame refusal',
  },
  {
    id:'R2_PLANNER_REF_ANCHORED',file:INV,
    old:"ref.anchored===true&&",
    new:"true&&",
    name:'R2 PIN planner sourceRef anchored flag refusal',
  },
  {
    id:'R2_PLANNER_SOURCE_FRAME',file:INV,
    old:"port.coordinateFrame===INPUTXML_HUB_FRAME&&point&&",
    new:"true&&point&&",
    name:'R2 PIN planner coordinate-frame refusal',
  },
  {
    id:'R2_PLANNER_LITERAL_WITNESS',file:INV,
    old:"catch{throw err(STEP12_CODES.COORDINATE,{node,recordKey:ref.recordKey});}",
    new:"catch{source={point,evidence:[]};}",
    name:'R2 PIN planner original literal witness refusal',
  },
  {
    id:'R2_SOURCE_SENTINEL_ABSOLUTE',file:FIELDS,
    old:"f.decoded.trim()!=='-1.010100'&&Number.isFinite(Number(f.decoded))",
    new:"true&&Number.isFinite(Number(f.decoded))",
    name:'R2 PIN source-field sentinel absolute coordinate refusal',
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
    id:'R1_VERIFIER_CALL_BEHAVIOUR',file:WRITE,
    old:'await verifyUxmlEditOpsIndependent({',
    new:'void ({',
    seed:'OWNER',name:'R1 behavioural verifier-only OWNER mismatch refuses',
  },
  {
    id:'R1_VERIFIER_BYTE_ONLY',file:VERIFY,
    old:"originalByteProof(originalBytes,emittedBytes,ledger);\n  let newText;",
    new:"originalByteProof(originalBytes,emittedBytes,ledger);\n  return {ok:true,parity:'EQUAL'};\n  let newText;",
    seed:'OWNER',name:'R1 behavioural verifier-only OWNER mismatch refuses',
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
      if(spec.seed==='OWNER'){
        // In this disposable clone only, bypass redundant planner B-spelling
        // gates. The real independently imported verifier MUST be the only
        // remaining source of this exact no-byte OWNER refusal.
        const file=join(dir,WRITE),initial=readFileSync(file,'utf8');
        const seams=[
          ["need(ownerSpelling.length===1,R.OWNER,{opId:op.opId});",
           "need(true,R.OWNER,{opId:op.opId});"],
          ["need(new Set(originals).size===1&&originals.length>0,R.OWNER);",
           "need(true,R.OWNER);"],
          ["need(candidate.carriers.filter(x=>x.element==='PIPINGELEMENT'&&\n      x.key===owner).every(x=>x.raw.trim()===literal),R.TOPOLOGY);",
           "need(true,R.TOPOLOGY);"],
        ];
        let mutated=initial;
        for(const [from,to] of seams){
          assert.equal(mutated.split(from).length-1,1,'OWNER seed seam');
          mutated=mutated.replace(from,()=>to);
        }
        writeFileSync(file,mutated);
        const injected=`
test('R1 behavioural verifier-only OWNER mismatch refuses',async()=>{
  const src=model([
    edge({from:'10',to:'020.00',fx:0,tx:100}),
    edge({from:'40',to:'50',fx:100,tx:200}),
    edge({from:'20',to:'90',fx:100,tx:300}),
  ]);
  await refuse(src,envelope(src),R.OWNER);
});
`;
        writeFileSync(join(dir,TEST),readFileSync(join(dir,TEST),'utf8')+injected);
      }
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
