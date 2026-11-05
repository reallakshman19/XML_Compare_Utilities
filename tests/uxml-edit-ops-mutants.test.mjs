/**
 * R2 independently killed production mutations.
 * Each isolated clone runs a GREEN original then the one-seam mutated RED
 * assertion. Fault-injection seeds are separate, named, no-output controls.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const WRITER='uxml/UxmlEditOpsPatchBack.js';
const INVENTORY='uxml/UxmlEditOpsTypedInventory.js';
const FIELDS='uxml/UxmlInputXmlSourceFields.js';
const GROUPS='uxml/UxmlEditOpsInvariants.js';
const VERIFY='uxml/UxmlEditOpsIndependentVerifier.js';
const TEST='tests/uxml-edit-ops-patch-back.test.mjs';
const specs=[
  {name:'XML_ENTITY_DECODER',file:INVENTORY,
    from:'const raw=text.slice(valueStart,pos),decoded=xmlDecode(raw);pos++;',
    to:'const raw=text.slice(valueStart,pos),decoded=raw;pos++;',
    pattern:'IR B1/F1 valid character entity and all typed node child carriers LF'},
  {name:'EXACT_DECIMAL_NUMBER_ROUNDING',file:FIELDS,
    from:'const m=v.match(XML_VALUE_RE);',
    to:'if(Number.isSafeInteger(Number(v))&&Number(v)>0)return String(Number(v));\n  const m=v.match(XML_VALUE_RE);',
    pattern:'IR F7 malformed exact node identity and huge exponent refuse LF'},
  {name:'UNKNOWN_NODE_TEXT_ADMISSION',file:INVENTORY,
    from:"if(TEXT_NODE_LIKE.test(p.fold)||nodeCandidate(p.fold,'',decoded))",
    to:'if(false)',
    pattern:'R1 known-tag text RESTRAINT refuses LF'},
  {name:'UNKNOWN_VENDOR_ATTRIBUTE_ADMISSION',file:INVENTORY,
    edits:[
      ["if(NODE_LIKE.test(field)){","if(false){"],
      ["if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};\n    throw error('INPUT_XML_UNSUPPORTED_NODE_CARRIER',{path:element.path,field,tag});",
       "if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};\n    return {kind:'KNOWN_NON_NODE'};"],
    ],pattern:'R2 unknown node-like attr inside known source row refuses'},
  {name:'OUTSIDE_RECORD_LOCATION',file:INVENTORY,
    from:"guard(location,'INPUT_XML_NODE_CARRIER_LOCATION_UNSUPPORTED',",
    to:"guard(true,'INPUT_XML_NODE_CARRIER_LOCATION_UNSUPPORTED',",
    pattern:'IR F4 direct inventory known outside position refuses LF'},
  {name:'BEND_NODE1',file:INVENTORY,
    from:"BEND:new Set(['NODE1','NODE2','NODE3']),",
    to:"BEND:new Set(['NODE2','NODE3']),",
    pattern:'IR B1/F1 valid character entity and all typed node child carriers LF'},
  {name:'SIF_BRANCHNODE',file:INVENTORY,
    from:"SIF:new Set(['NODE','BRANCHNODE']),",
    to:"SIF:new Set(['NODE']),",
    pattern:'IR B1/F1 valid character entity and all typed node child carriers LF'},
  {name:'RESTRAINT_CNODE',file:INVENTORY,
    from:"RESTRAINT:new Set(['NODE','CNODE']),",
    to:"RESTRAINT:new Set(['NODE']),",
    pattern:'IR B1/F1 valid character entity and all typed node child carriers LF'},
  {name:'RESTRANT_CNODE',file:INVENTORY,
    from:"RESTRANT:new Set(['NODE','CNODE']),",
    to:"RESTRANT:new Set(['NODE']),",
    pattern:'IR B1/F1 valid character entity and all typed node child carriers LF'},
  {name:'HANGER_CNODE',file:INVENTORY,
    from:"HANGER:new Set(['NODE','CNODE']),",
    to:"HANGER:new Set(['NODE']),",
    pattern:'IR B1/F1 valid character entity and all typed node child carriers LF'},
  {name:'DISPLACEMENTS_NODE_NUM',file:INVENTORY,
    from:"DISPLACEMENTS:new Set(['NODE_NUM']),",
    to:"DISPLACEMENTS:new Set([]),",
    pattern:'IR B1/F1 valid character entity and all typed node child carriers LF'},
  {name:'OWNER_RAW_VS_FORMAT_LIKE',file:WRITER,
    from:"const replacement=ownerSpelling[0];",
    to:"const replacement=String(Number(ownerSpelling[0]));",
    pattern:'IR B2 positive old raw spelling "40" LF'},
  {name:'ALL_PAIR_DISTANCE_NOT_FIRST',file:WRITER,
    from:'for(let i=0;i<combined.length;i++)',
    to:'for(let i=0;i<0;i++)',
    extraEdits:[
      [GROUPS,'for(let i=0;i<witnesses.length;i++)','for(let i=0;i<0;i++)'],
      [VERIFY,'for(let i=0;i<points.length;i++)','for(let i=0;i<0;i++)'],
    ],pattern:'IR B4/F6 all pairs 0.0018 spread refuses anchored alias LF'},
  {name:'RAW_ABSOLUTE_WITNESS',file:WRITER,
    from:'points.push({x:Number(fields[0]),y:-Number(fields[2]),z:Number(fields[1])});',
    to:'void fields;',
    pattern:'IR B5 raw absolute witness independently falsifies a S3-solved first-point equivalence'},
  {name:'WHOLE_NUMERIC_REREAD',file:WRITER,
    from:'fullNumericOracle(original,candidate,mapping,ledger);',
    to:'void mapping;',
    fault:'DESCENDANT',pattern:'R2 seed descendant active A must refuse'},
  {name:'ABSORBED_A_EXHAUSTIVENESS',file:WRITER,
    from:'if(b.key!==null&&mapping.has(b.key))',
    to:'if(false)',
    fault:'DESCENDANT',pattern:'R2 seed descendant active A must refuse'},
  {name:'NON_NODE_FIELD_CLASSIFICATION',file:INVENTORY,
    from:"if(nonNode(tag,field))return {kind:'KNOWN_NON_NODE'};",
    to:"if(false)return {kind:'KNOWN_NON_NODE'};",
    pattern:'IR B3 non-node RADIUS/REF_NO/DIAMETER/VECTOR 40 remain byte-identical LF'},
  {name:'ORIGINAL_BYTE_LEDGER_PARITY',file:WRITER,
    from:'assertByteParity(oldBytes,candidateBytes,ledger);',
    to:'void ledger;',
    extraEdits:[[VERIFY,'originalByteProof(originalBytes,emittedBytes,ledger);','void ledger;']],
    fault:'NON_LEDGER',pattern:'R2 seed non-ledger comment corruption must refuse'},
  {name:'STRICT_POLICY_CONFIDENCE',file:WRITER,
    from:'policy.minimum_confidence===0.95&&policy.require_no_blocking_plan_actions===true',
    to:'true&&policy.require_no_blocking_plan_actions===true',
    pattern:'policy, kind, hash, target and selection refusals LF'},
  {name:'EXACT_ACTION_SELECTION',file:WRITER,
    from:'sameArray([...ids].sort(),ops.map(op=>op.sourceActionId).sort())',
    to:'true',pattern:'policy, kind, hash, target and selection refusals LF'},
  {name:'OWNER_B_RAW_SPLIT_ORACLE',file:WRITER,
    from:"x.raw.trim()===literal),R.TOPOLOGY);",
    to:"true),R.TOPOLOGY);",
    extraEdits:[[VERIFY,'.every(c=>c.raw.trim()===unique),C.TOPO);',
      '.every(c=>true),C.TOPO);']],
    fault:'SPLIT_B',pattern:'R2 seed owner spelling drift must refuse'},
];
const run=(dir,args)=>spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',
  timeout:90000,env:Object.fromEntries(Object.entries(process.env)
    .filter(([key])=>key!=='NODE_TEST_CONTEXT'))});
const modify=(file,from,to,label)=>{
  const s=readFileSync(file,'utf8'),n=s.split(from).length-1;
  assert.equal(n,1,label+' seam must be unique');
  writeFileSync(file,s.replace(from,()=>to));
};
function setup(){
  const dir=mkdtempSync(join(tmpdir(),'xcu-r2-mut-'));
  cpSync(join(root,'uxml'),join(dir,'uxml'),{recursive:true});
  cpSync(join(root,'utils'),join(dir,'utils'),{recursive:true});
  mkdirSync(join(dir,'tests/fixtures'),{recursive:true});
  cpSync(join(root,TEST),join(dir,TEST));
  for(const name of ['uxml-s3-synthetic.workspace.input.xml',
    'uxml-s3-synthetic.workspace.delta-only.input.xml'])
    cpSync(join(root,'tests/fixtures',name),join(dir,'tests/fixtures',name));
  writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
  return dir;
}
const addWitness=(dir,fault,pattern)=>{
  const path=join(dir,WRITER);
  if(fault==='DESCENDANT'){
    modify(path,'const {ledger,mapping}=planAliases(witness,payload,original);',
      "const {ledger,mapping}=planAliases(witness,payload,original);\n"+
      "    const child=ledger.find(x=>x.field==='BEND[1]@NODE1');\n"+
      "    if(child)child.after=child.before;",'seed descendant');
    writeFileSync(join(dir,TEST),readFileSync(join(dir,TEST),'utf8')+
      "\ntest('"+pattern+"',async()=>{const src=fixture('\\n',{children:true});"+
      "await denied(src,payload(src),R.REMAINED);});\n");
  }
  if(fault==='NON_LEDGER'){
    modify(path,'const candidateBytes=spliceOriginal(original,ledger);',
      "const candidateBytes=spliceOriginal(original,ledger);\n"+
      "    const needle=enc.encode('SAFE-COMMENT');\n"+
      "    const ix=candidateBytes.findIndex((v,i)=>v===needle[0]&&"+
      "needle.every((q,j)=>candidateBytes[i+j]===q));\n"+
      "    if(ix>=0)candidateBytes[ix]='X'.charCodeAt(0);",'seed parity');
    writeFileSync(join(dir,TEST),readFileSync(join(dir,TEST),'utf8')+
      "\ntest('"+pattern+"',async()=>{const src=fixture()+'<!--SAFE-COMMENT-->';"+
      "await denied(src,payload(src),R.PARITY);});\n");
  }
  if(fault==='SPLIT_B'){
    modify(path,'const {ledger,mapping}=planAliases(witness,payload,original);',
      "const {ledger,mapping}=planAliases(witness,payload,original);\n"+
      "    const endpoint=ledger.find(x=>x.field==='FROM_NODE');\n"+
      "    if(endpoint)endpoint.after='20';",'seed owner spelling');
    writeFileSync(join(dir,TEST),readFileSync(join(dir,TEST),'utf8')+
      "\ntest('"+pattern+"',async()=>{const src=fixture();"+
      "await denied(src,payload(src),R.TOPOLOGY);});\n");
  }
};
for(const spec of specs){
  test('R2 guard '+spec.name+' GREEN original -> RED single mutant',()=>{
    const dir=setup();
    try{
      if(spec.fault)addWitness(dir,spec.fault,spec.pattern);
      const args=['--test','--test-name-pattern='+spec.pattern,TEST];
      const green=run(dir,args);
      assert.equal(green.status,0,spec.name+' GREEN expected:\n'+green.stdout+
        '\n'+green.stderr);
      for(const [from,to] of spec.edits||[[spec.from,spec.to]])
        modify(join(dir,spec.file),from,to,spec.name);
      for(const [file,from,to] of spec.extraEdits||[])
        modify(join(dir,file),from,to,spec.name+' independent guard');
      for(const file of [WRITER,INVENTORY,FIELDS,GROUPS,VERIFY]){
        const syntax=run(dir,['--check',file]);
        assert.equal(syntax.status,0,spec.name+' syntax:\n'+syntax.stderr);
      }
      const red=run(dir,args);
      assert.notEqual(red.status,0,spec.name+' survived:\n'+red.stdout);
      assert.match(red.stdout,/not ok /,spec.name+' must fail assertion');
      assert.doesNotMatch(red.stderr,/ERR_MODULE_NOT_FOUND|SyntaxError/,
        spec.name+' red cannot be missing test or broken JS');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
}
// Faults deliberately corrupt a candidate or its ledger, not the original
// user file. The original production guard MUST give a named no-byte refusal.
for(const [name,fault,code] of [
  ['descendant NODE1 reverted to A','DESCENDANT','REMAINED'],
  ['encoded NODE_NUM reverted to A','ENTITY_NODE_NUM','REMAINED'],
  ['non-ledger comment changed','NON_LEDGER','PARITY'],
  ['split B raw spelling','SPLIT_B','TOPOLOGY'],
  ['outside-record carrier inserted','OUTSIDE','PARITY'],
  ['new physical record inserted','ROW','PARITY'],
]){
  test('R2 seeded post-patch adversary '+name+' gives named no-output refusal',()=>{
    const dir=setup();
    try{
      if(fault==='ENTITY_NODE_NUM'){
        modify(join(dir,WRITER),'const {ledger,mapping}=planAliases(witness,payload,original);',
          "const {ledger,mapping}=planAliases(witness,payload,original);\n"+
          "    const child=ledger.find(x=>x.field==='DISPLACEMENTS[1]@NODE_NUM');\n"+
          "    if(child)child.after='&#52;0';",'entity seed');
      }else if(fault==='OUTSIDE'||fault==='ROW'){
        const injection=fault==='OUTSIDE'?'<RESTRAINT NODE="40"/>':
          '<PIPINGELEMENT FROM_NODE="90" TO_NODE="91" DELTA_X="1" DELTA_Y="-1.010100" DELTA_Z="-1.010100"/>';
        modify(join(dir,WRITER),'const candidateBytes=spliceOriginal(original,ledger);',
          "const written=spliceOriginal(original,ledger);\n"+
          "    const nextText=dec.decode(written).replace('</PIPINGMODEL>',"+
          JSON.stringify(injection)+"+'</PIPINGMODEL>');\n"+
          "    const candidateBytes=enc.encode(nextText);",'row/outside seed');
      }else addWitness(dir,fault,'seed-control');
      const label='seed-'+fault;
      const t=fault==='NON_LEDGER'?"fixture()+'<!--SAFE-COMMENT-->'":
        "fixture('\\n',{children:true})";
      writeFileSync(join(dir,TEST),readFileSync(join(dir,TEST),'utf8')+
        "\ntest('"+label+"',async()=>{const src="+t+";"+
        "await denied(src,payload(src),R."+code+");});\n");
      const runResult=run(dir,['--test','--test-name-pattern='+label,TEST]);
      assert.equal(runResult.status,0,name+' must refuse with exact code:\n'+
        runResult.stdout+'\n'+runResult.stderr);
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
}
