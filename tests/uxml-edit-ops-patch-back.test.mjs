import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {applyUxmlEditOps as apply,UXML_EDIT_OPS_SCHEMA as SCHEMA,
  UXML_EDIT_OPS_REFUSALS as R,__editOpsInvariants as g} from '../uxml/UxmlEditOpsPatchBack.js';
import {exactNodeId,xmlDecode,inventoryInputXml} from '../uxml/UxmlEditOpsTypedInventory.js';
import {mapCaesarInputXmlToUxmlStrict as readS3} from '../uxml/UxmlInputXmlSchemaMapper.js';

const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const refs=s=>readS3(s,{fileSha256:sha(s)}).components.map(c=>c.sourceRefs[0]);
const edge=({from,to,fx,tx,body='',extra='',fromY=0,toY=0,fromZ=0,toZ=0})=>{
  const dx=tx-fx,dy=toY-fromY,dz=toZ-fromZ;
  const fmt=n=>Number(n)===0?'-1.010100':String(n);
  return '<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+'"'+
    ' FROM_X="'+fx+'" FROM_Y="'+fromY+'" FROM_Z="'+fromZ+'"'+
    ' TO_X="'+tx+'" TO_Y="'+toY+'" TO_Z="'+toZ+'"'+
    ' DELTA_X="'+fmt(dx)+'" DELTA_Y="'+fmt(dy)+'" DELTA_Z="'+fmt(dz)+'"'+
    ' DIAMETER="40" WALL_THICK="6.02" REF_NO="40" NAME="SAFE-40"'+extra+'>'+
    body+'</PIPINGELEMENT>';
};
const model=(rows,{eol='\n',bom='',header=''}={})=>
  bom+'<CAESARII xmlns="COADE" XML_TYPE="Input">'+eol+
  '<PIPINGMODEL xmlns="" NUMELT="'+rows.length+'"'+header+'>'+eol+
  rows.join(eol)+eol+'</PIPINGMODEL></CAESARII>';
const childTags=()=>[
  '<BEND NODE1="40" NODE2="40." NODE3="-1.010100" RADIUS="40"/>',
  '<SIF NODE="4.0E1" BRANCHNODE="040" TYPE="5"/>',
  '<RESTRAINT NODE="&#52;0" CNODE="+40" TYPE="8"/>',
  '<RESTRANT NODE="40" CNODE="40" TYPE="3"/>',
  '<HANGER NODE="40" CNODE="40" TYPE="8"/>',
  '<DISPLACEMENTS NODE_NUM="&#x34;0" TYPE="7"/>',
  '<VECTOR DX="40" DY="0" DZ="0"/>',
].join('');
const fixture=(eol='\n',{a='40',owner='020.00',children=false,
  bom='',unicode=false,secondOwner=false}={})=>{
  const initial=edge({from:'10',to:owner,fx:0,tx:100});
  const first=unicode?initial.replace('NAME="SAFE-40"',"NAME='管-😀'"):initial;
  const second=edge({from:a,to:'50',fx:100,tx:200,
    body:children?childTags():''});
  const rows=[first,second];
  if(secondOwner)rows.push(edge({from:'020',to:'99',fx:100,tx:300}));
  return model(rows,{eol,bom});
};
const policy=ids=>({selected_action_ids:ids,apply_all_safe:false,
  minimum_confidence:0.95,require_no_blocking_plan_actions:true,
  joint_repairs:[],short_element_requests:[]});
const aliasOp=(source,a,b)=>{
  const dig=sha(source),id='SYNTH-'+a+'-'+b;
  const targets=[...new Set(refs(source).filter(r=>
    [r.fromNode,r.toNode].some(x=>exactNodeId(x)===String(a)||
      exactNodeId(x)===String(b))).map(r=>r.recordKey))].sort();
  return {opId:'UXML-OP-'+id,kind:'ALIAS_COINCIDENT_NODE',
    sourceActionId:id,fileSha256:dig,targets,
    params:[{operation:'ALIAS_NODE',sourceNode:a,canonicalNode:b}]};
};
const payload=(source,pairs=[[40,20]])=>{
  const ops=pairs.map(([a,b])=>aliasOp(source,a,b));
  return {schema:SCHEMA,sourceFormat:'INPUT_XML',fileSha256:sha(source),
    policy:policy(ops.map(o=>o.sourceActionId)),ops};
};
const attempt=(source,p)=>apply(source,p,{fileSha256:sha(source)});
const denied=async(source,p,code,opts={})=>{
  const r=await apply(source,p,{fileSha256:opts.sha??sha(source)});
  assert.equal(r.ok,false,JSON.stringify(r));
  assert.equal(r.bytes,null);assert.deepEqual(r.ledger,[]);
  assert.equal(r.parity,'DIFFERENT');
  assert.equal(r.refusals[0]?.code,code,JSON.stringify(r));
  return r;
};
const byteParity=(source,r)=>{
  assert(r.bytes instanceof Uint8Array);
  const old=Buffer.from(source,'utf8'),newBytes=Buffer.from(r.bytes);
  const rebuilt=r.ledger.reduceRight((buf,x)=>{
    const {start,end}=x.byteRange;
    assert.deepEqual(buf.subarray(start,end),Buffer.from(x.before));
    return Buffer.concat([buf.subarray(0,start),Buffer.from(x.after),buf.subarray(end)]);
  },old);
  assert.deepEqual(newBytes,rebuilt);
  let last=0;
  for(const x of r.ledger){assert(x.byteRange.start>=last);last=x.byteRange.end;}
};
const success=async(source,p=payload(source))=>{
  const r=await attempt(source,p);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.parity,'EQUAL');
  assert.deepEqual(r.refusals,[]);
  byteParity(source,r);
  const after=Buffer.from(r.bytes).toString('utf8'),candidate=refs(after);
  assert.equal(candidate.length,refs(source).length);
  return {r,after,candidate};
};
test('contract v1 envelope, op fields, ledger original byte spans and strict S3 re-read',async()=>{
  const src=fixture(),p=payload(src),{r}=await success(src,p);
  assert.equal(SCHEMA,'uxml-edit-ops/v1');
  assert.deepEqual(Object.keys(p).sort(),
    ['schema','sourceFormat','fileSha256','policy','ops'].sort());
  assert.deepEqual(Object.keys(p.ops[0]).sort(),
    ['opId','kind','sourceActionId','fileSha256','targets','params'].sort());
  assert.equal(r.ledger.length,1);
  assert.deepEqual(Object.keys(r.ledger[0]).sort(),
    ['opId','kind','recordKey','field','before','after','byteRange'].sort());
});
for(const eol of ['\n','\r\n']){
  const label=eol==='\r\n'?'CRLF':'LF';
  test('IR B1/F1 valid character entity and all typed node child carriers '+label,async()=>{
    const src=fixture(eol,{children:true}),{r,after}=await success(src);
    assert.equal(r.ledger.length,12);
    assert(r.ledger.every(x=>x.after==='020.00'));
    assert(after.includes('<BEND NODE1="020.00" NODE2="020.00" NODE3="-1.010100" RADIUS="40"/>'));
    assert(after.includes('BRANCHNODE="020.00"'));
    assert(after.includes('CNODE="020.00"'));
    assert(after.includes('NODE_NUM="020.00"'));
    assert(after.includes('RADIUS="40"'));
    assert(after.includes('DIAMETER="40"'));
    assert(after.includes('REF_NO="40"'));
    assert(after.includes('VECTOR DX="40"'));
    assert(r.ledger.some(x=>x.before==='&#52;0'));
    assert(r.ledger.some(x=>x.before==='&#x34;0'));
    const fields=r.ledger.map(x=>x.field);
    for(const f of ['BEND[1]@NODE1','BEND[1]@NODE2','SIF[1]@BRANCHNODE',
      'RESTRAINT[1]@CNODE','RESTRANT[1]@NODE','HANGER[1]@CNODE',
      'DISPLACEMENTS[1]@NODE_NUM'])assert(fields.includes(f),f);
  });
  for(const spelling of ['40','40.','4.0E1','+40','040',' 40 ','40.0']){
    test('IR B2 positive old raw spelling '+JSON.stringify(spelling)+' '+label,async()=>{
      const src=fixture(eol,{a:spelling}),{r,after}=await success(src);
      assert.equal(r.ledger.length,1);
      const newId=refs(after)[1].fromNode;
      assert.equal(newId,'020.00','S3 raw spelling must unify exactly');
      assert.equal(exactNodeId(newId),'20');
      assert.equal(r.ledger[0].before,spelling);
      assert.equal(r.ledger[0].after,
        (spelling.startsWith(' ')?' ':'')+'020.00'+(spelling.endsWith(' ')?' ':''));
    });
  }
  test('IR B3 non-node RADIUS/REF_NO/DIAMETER/VECTOR 40 remain byte-identical '+label,async()=>{
    const src=fixture(eol,{children:true}),{after}=await success(src);
    for(const value of ['RADIUS="40"','REF_NO="40"','DIAMETER="40"',
      'VECTOR DX="40"','NAME="SAFE-40"'])assert(after.includes(value),value);
  });
  test('IR B4/F6 all pairs 0.0018 spread refuses anchored alias '+label,async()=>{
    const src=model([
      edge({from:'10',to:'20',fx:-100,tx:-0.0009}),
      edge({from:'40',to:'50',fx:0,tx:100}),
      edge({from:'040',to:'60',fx:0.0009,tx:100.0009}),
    ],{eol});
    assert.equal(refs(src).length,3);
    await denied(src,payload(src),R.GROUP_SPREAD);
  });
  test('IR B5 repeated-ID hidden raw anchor contradiction refuses '+label,async()=>{
    const src=model([
      edge({from:'10',to:'20',fx:-100,tx:-0.0009}),
      edge({from:'40',to:'50',fx:0,tx:100}),
      edge({from:'40',to:'60',fx:0.0009,tx:100.0009}),
    ],{eol});
    assert.equal(refs(src).length,3);
    await denied(src,payload(src),R.GROUP_SPREAD);
  });
  test('IR B6 mixed original owner spelling 20 vs 020 refuses '+label,async()=>{
    const src=fixture(eol,{owner:'20',secondOwner:true});
    assert.equal(refs(src).length,3);
    await denied(src,payload(src),R.OWNER);
  });
  test('IR B7/F2 unknown vendor node attribute refuses '+label,async()=>{
    const src=fixture(eol).replace('</PIPINGELEMENT>',
      '<VENDOR DATA_NODE="40"/></PIPINGELEMENT>');
    await denied(src,payload(src),R.CARRIER);
  });
  test('IR F3 unknown numeric element text and NODE text refuse '+label,async()=>{
    for(const tag of ['NODE','VENDOR_NODE']){
      const src=fixture(eol).replace('</PIPINGELEMENT>',
        '<'+tag+'>40</'+tag+'></PIPINGELEMENT>');
      await denied(src,payload(src),R.CARRIER);
    }
  });
  test('IR F4 known source carrier outside PIPINGELEMENT refuses '+label,async()=>{
    const src=fixture(eol).replace('</PIPINGMODEL>',
      '<RESTRAINT NODE="40"/></PIPINGMODEL>');
    await denied(src,payload(src),R.LOCATION);
  });
  test('IR F5 unknown or malformed entity refuses without bytes '+label,async()=>{
    for(const bad of ['&bad;','&#x110000;','&#foo;','&#52']) {
      const src=fixture(eol).replace('</PIPINGELEMENT>',
        '<RESTRAINT NODE="'+bad+'"/></PIPINGELEMENT>');
      await denied(src,payload(src),R.ENTITY);
    }
  });
  test('IR F7 malformed exact node identity and huge exponent refuse '+label,async()=>{
    const src=fixture(eol),p=payload(src);
    for(const bad of ['40.000000000000000001','1e999','9007199254740993',
      '0','-40','0x28','40mm']){
      const mod={...p,ops:[{...p.ops[0],params:[
        {operation:'ALIAS_NODE',sourceNode:bad,canonicalNode:20}]}]};
      await denied(src,mod,R.NODE_ID);
    }
    const mutated=src.replace('FROM_NODE="40"','FROM_NODE="40.000000000000000001"');
    const claimed=payload(src);
    const newSha=sha(mutated);
    await denied(mutated,{...claimed,fileSha256:newSha,
      ops:claimed.ops.map(op=>({...op,fileSha256:newSha}))},R.NODE_ID);
  });
  test('unsupported namespaced and unknown carrier locations refuse '+label,async()=>{
    const src=fixture(eol).replace('</PIPINGELEMENT>',
      '<VENDOR SLOT="40" NODE1="40"/></PIPINGELEMENT>');
    await denied(src,payload(src),R.CARRIER);
  });
  test('inactive node sentinel remains untouched '+label,async()=>{
    const src=fixture(eol,{children:true}),{after}=await success(src);
    assert(after.includes('NODE3="-1.010100"'));
  });
  test('two independent aliases and atomic bad second alias '+label,async()=>{
    const src=model([
      edge({from:'10',to:'20',fx:0,tx:100}),
      edge({from:'40',to:'50',fx:100,tx:200}),
      edge({from:'60',to:'70',fx:400,tx:500}),
      edge({from:'80',to:'90',fx:500,tx:600}),
    ],{eol});
    const {r}=await success(src,payload(src,[[40,20],[80,70]]));
    assert.equal(r.ledger.length,2);
    assert.equal(new Set(r.ledger.map(x=>x.opId)).size,2);
    await denied(src,payload(src,[[40,20],[80,999]]),R.COORDINATE);
  });
  test('self-loop refuses before publishing candidate '+label,async()=>{
    const src=model([
      edge({from:'10',to:'20',fx:0,tx:100}),
      edge({from:'40',to:'20',fx:100,tx:100}),
    ],{eol});
    await denied(src,payload(src),R.SELF);
  });
  test('unanchored runs, absent owner, distant anchored endpoints refuse '+label,async()=>{
    const src=fixture(eol);
    await denied(src,payload(src,[[40,999]]),R.COORDINATE);
    const distant=model([edge({from:'10',to:'20',fx:0,tx:100}),
      edge({from:'40',to:'50',fx:1000,tx:1100})],{eol});
    await denied(distant,payload(distant),R.GROUP_SPREAD);
    const deltaOnly=readFileSync(new URL('./fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml',
      import.meta.url),'utf8').replace(/\r?\n/g,eol);
    await denied(deltaOnly,payload(deltaOnly,[[10,100]]),R.COORDINATE);
  });
  test('BOM multibyte prefix, quote style and different replacement width '+label,async()=>{
    const src=fixture(eol,{a:'40',owner:'020.00',bom:'\uFEFF',
      unicode:true,children:true});
    const {r,after}=await success(src);
    assert.equal(Buffer.from(r.bytes).subarray(0,3).toString('hex'),'efbbbf');
    assert(after.includes("NAME='管-😀'"));
    assert(r.ledger.some(x=>x.before.length!==x.after.length));
    byteParity(src,r);
  });
  test('policy, kind, hash, target and selection refusals '+label,async()=>{
    const src=fixture(eol),p=payload(src),op=p.ops[0];
    await denied(src,{...p,schema:'v2'},R.SCHEMA);
    await denied(src,{...p,sourceFormat:'PSI116'},R.PSI116);
    await denied(src,{...p,sourceFormat:'PCF'},R.FORMAT);
    for(const kind of ['VALUE_EDIT','DELETE_ELEMENT','NODE_MERGE','ADD_ELEMENT',
      'DROP_SHORT_ELEMENT','REVIEW_CONNECTION'])
      await denied(src,{...p,ops:[{...op,kind}]},R.KIND);
    await denied(src,{...p,fileSha256:'0'.repeat(64)},R.HASH);
    await denied(src,p,R.HASH,{sha:'0'.repeat(64)});
    await denied(src,{...p,ops:[{...op,fileSha256:'0'.repeat(64)}]},R.OP_SHA);
    await denied(src,{...p,ops:[{...op,targets:['E999:F10:T20']}]},R.UNKNOWN);
    await denied(src,{...p,ops:[{...op,targets:op.targets.slice(1)}]},R.TARGETS);
    await denied(src,{...p,policy:{...p.policy,minimum_confidence:0}},R.POLICY_WIDEN);
    await denied(src,{...p,policy:{...p.policy,selected_action_ids:['other']}},R.SELECTION);
  });
}
test('exact decimal node identity and XML predefined/decimal/hex entity decoder',()=>{
  for(const value of ['40','40.','040','+40','4.0E1',' 40 ','&#invalid']) {
    if(value.startsWith('&'))assert.throws(()=>exactNodeId(value),e=>e.code===R.NODE_ID);
    else assert.equal(exactNodeId(value),'40');
  }
  for(const raw of ['&#52;0','&#x34;0','&#X34;0']){
    if(raw.includes('#X'))assert.throws(()=>xmlDecode(raw),e=>e.code===R.ENTITY);
    else assert.equal(exactNodeId(xmlDecode(raw)),'40');
  }
  assert.equal(xmlDecode('A&amp;B&lt;C&gt;D&quot;E&apos;F'),'A&B<C>D"E\x27F');
  for(const bad of ['40.000000000000000001','1e9999','9007199254740993',
    '-1.010100','NaN','+','40.5'])assert.throws(()=>exactNodeId(bad),
    e=>e.code===R.NODE_ID);
  assert.equal(exactNodeId('-1.010100',{sentinel:true}),null);
});
test('read-only invariant probes require duplicate/chain/overlap/byte refusal',()=>{
  assert.throws(()=>g.reserveField(new Set(['r']),'r','A'),e=>e.code===R.CONFLICT);
  assert.throws(()=>g.assertUnchainedIds(new Set(['40']),new Set(['40'])),
    e=>e.code===R.CONFLICT);
  assert.throws(()=>g.assertDisjointPatches([
    {byteRange:{start:2,end:5}},{byteRange:{start:4,end:6}},
  ]),e=>e.code===R.CONFLICT);
  assert.throws(()=>g.assertByteParity(Buffer.from('abc40xyz'),
    Buffer.from('abc20xYz'),[{
      recordKey:'E0',field:'FROM_NODE',before:'40',after:'20',
      byteRange:{start:3,end:5},
    }]),e=>e.code===R.PARITY);
});
test('numeric oracle detects active A, nonnode tamper, graph mismatch independently',()=>{
  const src=fixture(),baseRefs=refs(src);
  const a=inventoryInputXml(src,{refs:baseRefs});
  const fake={inventory:a,doc:readS3(src,{fileSha256:sha(src)})};
  const after=structuredClone(fake);
  after.inventory.items.find(c=>c.kind==='NODE_REF'&&c.key==='40').key='41';
  assert.throws(()=>g.fullNumericOracle(fake,after,new Map([['40','20']]),[]),
    e=>e.code===R.TOPOLOGY);
});
test('real public GRE and PLB314 originals pass dispatch and fail closed without patch',async()=>{
  for(const file of ['GREInputxml.xml','PLB314Inputxml.xml']){
    const s=readFileSync(new URL('../docs/'+file,import.meta.url),'utf8');
    const rows=refs(s);
    assert(rows.length>10);
    const a=exactNodeId(rows[0].fromNode),b=exactNodeId(rows.at(-1).toNode);
    const r=await attempt(s,payload(s,[[Number(a),Number(b)]]));
    assert.equal(r.ok,false);
    assert.equal(r.bytes,null);
    assert.notEqual(r.refusals[0].code,R.KIND);
    assert.notEqual(r.refusals[0].code,R.SCHEMA);
  }
});

test('IR F4 direct inventory known outside position refuses LF',()=>{
  const src=fixture().replace('</PIPINGMODEL>',
    '<RESTRAINT NODE="40"/></PIPINGMODEL>');
  const rs=refs(src);
  assert.throws(()=>inventoryInputXml(src,{refs:rs}),
    error=>error.code===R.LOCATION);
});

test('IR B5 raw absolute witness independently falsifies a S3-solved first-point equivalence',()=>{
  // S3 solved points were both within 0.001 of the owner, but an original
  // repeated-ID absolute anchor x+0.0009 and owner x-0.0009 differ by 0.0018.
  // Removing the raw anchor witness MUST make this assertion RED.
  const doc={
    ports:[
      {sourceRefs:[{endpoint:'FROM',fromNode:'40',anchored:true,elementIndex:1}],
        anchored:true,coordinateFrame:'PSI116_XYZ_MM',
        point:{x:0,y:0,z:0}},
      {sourceRefs:[{endpoint:'TO',toNode:'20',anchored:true,elementIndex:0}],
        anchored:true,coordinateFrame:'PSI116_XYZ_MM',
        point:{x:-0.0009,y:0,z:0}},
    ],
    components:[
      {rawAttributes:{inputXml:{sourceAttributes:
        {TO_X:'-0.0009',TO_Y:'0',TO_Z:'0'}}}},
      {rawAttributes:{inputXml:{sourceAttributes:
        {FROM_X:'0.0009',FROM_Y:'0',FROM_Z:'0'}}}},
    ],
  };
  assert.throws(()=>g.verifyCoincidence(doc,'40','20','SYNTH-RAW-ANCHOR'),
    e=>e.code===R.COINCIDENCE);
});
