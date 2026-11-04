import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const sourcePath='uxml/UxmlEditOpsPatchBack.js';
const testPath='tests/uxml-edit-ops-patch-back.test.mjs';
const changes=[
  ['SCHEMA_REQUIRED',"payload.schema===UXML_EDIT_OPS_SCHEMA","true",
    'schema and op-field exactness refuses without bytes LF'],
  ['MEASURED_SHA',"fileSha256===measured&&","true&&",
    'stale original SHA, op SHA and op ID refuse LF'],
  ['STRICT_POLICY',"policy.minimum_confidence===0.95","true",
    'unwidenable TopoFix selection policy refuses LF'],
  ['OP_SHA',"op.fileSha256===measured,R.OP_SHA","true,R.OP_SHA",
    'stale original SHA, op SHA and op ID refuse LF'],
  ['OP_PARAMS',"op.params[0].operation==='ALIAS_NODE'","true",
    'invalid, forged and unaccounted alias params refuse LF'],
  ['UNKNOWN_RECORD',"need(byKey.has(key),R.UNKNOWN","need(true,R.UNKNOWN",
    'unknown/stale recordKey and incorrect targets refuse LF'],
  ['TARGET_SET',"sameArray([...op.targets].sort(),expected)","true",
    'unknown/stale recordKey and incorrect targets refuse LF'],
  ['ALL_DESCENDANT_NODE_REFERENCES',"if(!oldIds.has(node))continue;","if(true)continue;",
    'SIF source owner references and descendants of unedited records refuse LF'],
  ['ALL_SOURCE_LOSS_REFERENCES',
    "if([...raw.matchAll(rawNumber)].some(m=>oldIds.has(finiteNode(m[0]))))",
    "if(false)",'SIF source owner references and descendants of unedited records refuse LF'],
  ['SELF_LOOP',"need(planned.every(x=>x.from!==null&&x.to!==null&&x.from!==x.to),R.LOOP);",
    "need(true,R.LOOP);",'planned FROM==TO self-loop refuses before reread LF'],
  ['POST_PATCH_S3_REREAD',
    "reread=mapCaesarInputXmlToUxmlStrict(candidate,{fileSha256:await hash(result)});",
    "reread=doc;",'alias happy sourceRef S3 reread, exact byte ranges and LF/CRLF LF'],
  ['EXACT_OFFSET',"const offset=match.index+match[0].indexOf(match[2])+1;",
    "const offset=match.index+match[0].indexOf(match[2])+2;",
    'alias happy sourceRef S3 reread, exact byte ranges and LF/CRLF LF'],
  ['B1_DECIMAL_WITNESS',
    "!/^\\s*\\+?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?\\s*$/.test(value)",
    "!/^\\+?[0-9]+(?:\\.[0-9]+)?$/.test(value)",
    'B1 actual source node witness decimal 40. refuses LF'],
  ['B1_EXPONENT_WITNESS',
    "!/^\\s*\\+?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?\\s*$/.test(value)",
    "!/^\\+?[0-9]+(?:\\.[0-9]+)?$/.test(value)",
    'B1 actual source node witness exponent 4.0E1 refuses LF'],
  ['B2_COINCIDENCE_GUARD',
    "verifyCoincidence(doc,old,owner,op.opId);","void doc;",
    'B2 absent canonical endpoint refuses LF'],
  ['B2_ANCHORED_FRAME',
    "port.anchored===true&&ref.anchored===true&&",
    "true&&",
    'B2 disconnected delta-only cross-run candidate refuses LF'],
  ['B2_GEOMETRY',
    "Math.hypot(p.x-anchor.x,p.y-anchor.y,p.z-anchor.z)<=INPUTXML_DELTA_TOLERANCE",
    "true",
    'B2 public absolute twin separated original endpoints refuse LF'],
  ['B2_OWNER_PRESENT',
    "absorbed.length>0&&retained.length>0",
    "true",
    'B2 absent canonical endpoint refuses LF'],
  ['FIELD_UNIQUE',"need(!used.has(unique),R.CONFLICT,{opId});",
    "need(true,R.CONFLICT,{opId});",
    'read-only byte, overlap, field and chain invariants independently refuse'],
  ['CHAIN_ID_FINAL',
    "need([...oldIds].every(id=>!newIds.has(id)),R.CONFLICT);",
    "need(true,R.CONFLICT);",
    'read-only byte, overlap, field and chain invariants independently refuse'],
  ['CHAIN_ID_EARLY',
    "!newIds.has(old)&&","true&&",
    'chained absorbed / owner IDs refuse as one atomic transaction LF'],
  ['RANGE_OVERLAP',
    "need(patches[i-1].byteRange.end<=patches[i].byteRange.start,R.CONFLICT);",
    "need(true,R.CONFLICT);",
    'read-only byte, overlap, field and chain invariants independently refuse'],
  ['LOCATE_DUPLICATE',
    "need(!attrs.has(name),R.OFFSET,{recordKey:ref.recordKey,field:name});",
    "need(true,R.OFFSET,{recordKey:ref.recordKey,field:name});",
    'read-only source byte locator refuses duplicate and mismatched raw witnesses'],
  ['LOCATE_RAW_EQUALS',
    "need(attrs.size===2&&attrs.get('FROM_NODE').raw===ref.fromNode&&\n    attrs.get('TO_NODE').raw===ref.toNode,R.OFFSET,{recordKey:ref.recordKey});",
    "need(true,R.OFFSET,{recordKey:ref.recordKey});",
    'read-only source byte locator refuses duplicate and mismatched raw witnesses'],
  ['BYTE_PARITY_CALL',
    "assertByteParity(bytes,result,patches);","void patches;",
    'injected non-ledger byte corruption must refuse','CORRUPT_BYTES'],
  ['REREAD_COUNT',
    "need(reread.components.length===doc.components.length,R.PARITY);",
    "need(true,R.PARITY);",
    'injected reread count drift refuses','REREAD_COUNT'],
  ['REREAD_ENDPOINT',
    "need(planned.every((x,i)=>{\n      const ref=reread.components[i]?.sourceRefs?.[0];\n      return finiteNode(ref?.fromNode)===x.from&&finiteNode(ref?.toNode)===x.to;\n    }),R.PARITY);",
    "need(true,R.PARITY);",
    'injected reread endpoint drift refuses','REREAD_ENDPOINT'],
];
const run=(dir,args)=>spawnSync(process.execPath,args,{
  cwd:dir,encoding:'utf8',timeout:60000,
  env:Object.fromEntries(Object.entries(process.env).filter(([k])=>k!=='NODE_TEST_CONTEXT')),
});
for(const [name,oldText,replacement,pattern,fault] of changes){
  test('edit-ops guard mutant '+name+' GREEN control and RED mutation',()=>{
    const dir=mkdtempSync(join(tmpdir(),'xcu-editops-mut-'));
    try{
      cpSync(join(root,'uxml'),join(dir,'uxml'),{recursive:true});
      cpSync(join(root,'utils'),join(dir,'utils'),{recursive:true});
      mkdirSync(join(dir,'tests','fixtures'),{recursive:true});
      cpSync(join(root,testPath),join(dir,testPath));
      cpSync(join(root,'tests/fixtures/uxml-s3-synthetic.workspace.input.xml'),
        join(dir,'tests/fixtures/uxml-s3-synthetic.workspace.input.xml'));
      cpSync(join(root,'tests/fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml'),
        join(dir,'tests/fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml'));
      writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
      if(fault==='CORRUPT_BYTES'){
        // Fault injection only inside isolated cloned production source:
        // non-ledger REF_NO bytes change, but strict S3 still rereads.
        const path=join(dir,sourcePath),orig=readFileSync(path,'utf8');
        assert.equal(orig.split('    let reread;').length,2);
        const injection=[
          "    const marker=enc.encode('SEG-0');",
          "    const idx=result.findIndex((v,i)=>v===marker[0]&&",
          "      marker.every((c,k)=>result[i+k]===c));",
          "    need(idx>=0,R.INTERNAL);",
          "    result[idx+2]='J'.charCodeAt(0);",
          "    let reread;",
        ].join('\n');
        writeFileSync(path,orig.replace('    let reread;',injection));
        writeFileSync(join(dir,testPath),readFileSync(join(dir,testPath),'utf8')+
          "\ntest('injected non-ledger byte corruption must refuse',async()=>{"+
          "const src=fixture('LF'),result=await attempt(src,make(src));"+
          "assert.equal(result.ok,false);assert.equal(result.bytes,null);"+
          "assert.equal(result.refusals[0]?.code,R.PARITY);});\n");
      }
      if(fault==='REREAD_COUNT'||fault==='REREAD_ENDPOINT'){
        // A shadow reader produces one adversarial post-patch S3 response;
        // the normal original S3 read and the real candidate S3 read still run.
        const proxy=[
          "import {mapCaesarInputXmlToUxmlStrict as real} from './UxmlInputXmlSchemaMapper.js';",
          "let calls=0;",
          "export function mapCaesarInputXmlToUxmlStrict(text,options){",
          "  const d=real(text,options);",
          "  if(++calls===2){",
          fault==='REREAD_COUNT'?
            "    d.components.push(structuredClone(d.components[0]));":
            "    d.components[0].sourceRefs[0].fromNode='999';",
          "  }",
          "  return d;",
          "}",
        ].join('\n');
        writeFileSync(join(dir,'uxml/UxmlEditOpsAdversarialReader.js'),proxy);
        const path=join(dir,sourcePath),orig=readFileSync(path,'utf8');
        writeFileSync(path,orig.replace(
          "from './UxmlInputXmlSchemaMapper.js';",
          "from './UxmlEditOpsAdversarialReader.js';"));
        writeFileSync(join(dir,testPath),readFileSync(join(dir,testPath),'utf8')+
          "\ntest('"+pattern+"',async()=>{"+
          "const src=fixture('LF'),result=await attempt(src,make(src));"+
          "assert.equal(result.ok,false);assert.equal(result.bytes,null);"+
          "assert.equal(result.refusals[0]?.code,R.PARITY);});\n");
      }
      const args=['--test','--test-name-pattern='+pattern,testPath];
      const green=run(dir,args);
      assert.equal(green.status,0,name+' control must be GREEN:\n'+green.stdout+'\n'+green.stderr);
      const path=join(dir,sourcePath),source=readFileSync(path,'utf8');
      assert.equal(source.split(oldText).length,2,
        name+' must replace exactly one known production seam');
      writeFileSync(path,source.replace(oldText,()=>replacement));
      const syntax=run(dir,['--check',sourcePath]);
      assert.equal(syntax.status,0,name+' mutant must remain valid JS:\n'+syntax.stderr);
      const red=run(dir,args);
      assert.notEqual(red.status,0,name+' should be RED but was GREEN:\n'+red.stdout);
      assert.match(red.stdout,/not ok /,name+' must fail a real test assertion');
      assert.doesNotMatch(red.stderr,/ERR_MODULE_NOT_FOUND|SyntaxError/,
        name+' cannot be killed by a broken test environment');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
}
