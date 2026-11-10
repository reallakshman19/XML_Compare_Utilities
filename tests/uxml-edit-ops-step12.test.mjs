import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {applyUxmlEditOps,UXML_EDIT_OPS_REFUSALS as R,
  __editOpsInvariants as b4Guards}
  from '../uxml/UxmlEditOpsPatchBack.js';
import {mapCaesarInputXmlToUxmlStrict as readS3}
  from '../uxml/UxmlInputXmlSchemaMapper.js';
import {inventoryInputXml} from '../uxml/UxmlEditOpsTypedInventory.js';
import {exactNodeId,xmlDecode,readInputXmlSourceField,
  absoluteInputXmlSourceWitness,INPUT_XML_SOURCE_FIELD_SCHEMA}
  from '../uxml/UxmlInputXmlSourceFields.js';
import {verifyUxmlEditOpsIndependent,__independentVerifierProbes as verifierGuards}
  from '../uxml/UxmlEditOpsIndependentVerifier.js';
import {ownerGroups,assertOwnerGroupSpread,physicalNodeWitnesses,
  assertNoNewSelfConnected} from '../uxml/UxmlEditOpsInvariants.js';

const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const refs=s=>readS3(s,{fileSha256:sha(s)}).components.map(c=>c.sourceRefs[0]);
const edge=({from,to,fx,tx,fy=0,ty=0,fz=0,tz=0,body='',extra=''})=>{
  const d=(a,b)=>b-a===0?'-1.010100':String(b-a);
  return '<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+'"'+
    ' FROM_X="'+fx+'" FROM_Y="'+fy+'" FROM_Z="'+fz+'"'+
    ' TO_X="'+tx+'" TO_Y="'+ty+'" TO_Z="'+tz+'"'+
    ' DELTA_X="'+d(fx,tx)+'" DELTA_Y="'+d(fy,ty)+'" DELTA_Z="'+d(fz,tz)+'"'+
    ' DIAMETER="40" WALL_THICK="6.02" REF_NO="40" NAME="SAFE-40"'+extra+'>'+
    body+'</PIPINGELEMENT>';
};
const b4MmUnits='<UNITS><LENGTH LABEL="mm." FACTOR="25.400000"/></UNITS>';
const model=(rows,{eol='\n',bom='',units=b4MmUnits}={})=>bom+
  '<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">'+eol+
  '<PIPINGMODEL xmlns="" NUMELT="'+rows.length+'">'+eol+
  rows.join(eol)+eol+units+eol+'</PIPINGMODEL></CAESARII>';
const base=(opts={})=>model([
  edge({from:'10',to:opts.b||'020.00',fx:0,tx:100}),
  edge({from:opts.a||'40',to:'50',fx:100,tx:200,body:opts.body||''}),
],opts);
const policy=ops=>({
  selected_action_ids:ops.map(o=>o.sourceActionId),
  apply_all_safe:false,minimum_confidence:0.95,
  require_no_blocking_plan_actions:true,joint_repairs:[],short_element_requests:[],
});
const operation=(s,from,to)=>{
  const action='SYNTH-'+from+'-'+to,keys=refs(s).filter(r=>
    [r.fromNode,r.toNode].some(x=>{
      const n=exactNodeId(xmlDecode(x));return n===String(from)||n===String(to);
    })).map(r=>r.recordKey);
  return {opId:'UXML-OP-'+action,kind:'ALIAS_COINCIDENT_NODE',
    sourceActionId:action,fileSha256:sha(s),targets:[...new Set(keys)].sort(),
    params:[{operation:'ALIAS_NODE',sourceNode:from,canonicalNode:to}]};
};
const envelope=(s,pairs=[[40,20]])=>{
  const ops=pairs.map(([a,b])=>operation(s,a,b));
  return {schema:'uxml-edit-ops/v1',sourceFormat:'INPUT_XML',
    fileSha256:sha(s),policy:policy(ops),ops};
};
const apply=(s,p=envelope(s))=>applyUxmlEditOps(s,p,{fileSha256:sha(s)});
const refuse=async(s,p,code)=>{
  const r=await apply(s,p);
  assert.equal(r.ok,false,JSON.stringify(r));
  assert.equal(r.bytes,null);
  assert.deepEqual(r.ledger,[]);
  assert.equal(r.refusals[0]?.code,code,JSON.stringify(r));
  return r;
};
const exactLedger=(source,result)=>{
  let bytes=Buffer.from(source,'utf8');
  for(let i=result.ledger.length-1;i>=0;i--){
    const x=result.ledger[i],{start,end}=x.byteRange;
    assert.deepEqual(bytes.subarray(start,end),Buffer.from(x.before));
    bytes=Buffer.concat([bytes.subarray(0,start),Buffer.from(x.after),
      bytes.subarray(end)]);
  }
  assert.deepEqual(Buffer.from(result.bytes),bytes);
};
const succeed=async(s,p=envelope(s))=>{
  const r=await apply(s,p);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.parity,'EQUAL');
  assert.deepEqual(r.refusals,[]);
  assert.equal('authorised' in r,false);
  assert.equal('committed' in r,false);
  exactLedger(s,r);
  const updated=Buffer.from(r.bytes).toString('utf8');
  assert.equal(refs(updated).length,refs(s).length);
  return {r,updated};
};
const groupFixture=(a=-0.0009,c=0.0009,options={})=>model([
  edge({from:'10',to:'020.00',fx:-100,tx:0}),
  edge({from:'40',to:'50',fx:a,tx:100}),
  edge({from:'60',to:'70',fx:c,tx:200}),
],options);
test('I-1 LT-1 owner group spread refuses despite individually near-owner aliases',async()=>{
  const s=groupFixture(),p=envelope(s,[[40,20],[60,20]]);
  await refuse(s,p,R.GROUP_SPREAD);
});
test('I-1p LT-1p two independent aliases to same owner accept under every pair',async()=>{
  const s=groupFixture(-0.0003,0.0003),p=envelope(s,[[40,20],[60,20]]);
  const {r,updated}=await succeed(s,p);
  assert.equal(r.ledger.length,2);
  assert.equal(new Set(r.ledger.map(x=>x.opId)).size,2);
  assert.equal(refs(updated)[1].fromNode,'020.00');
  assert.equal(refs(updated)[2].fromNode,'020.00');
});
for(const pairs of [
 [[40,20],[20,60]],[[40,20],[20,40]],[[40,60],[60,20]],
]){
  test('I-1 LT-1c chain/cycle refuses before geometry '+JSON.stringify(pairs),async()=>{
    const s=groupFixture();
    await refuse(s,envelope(s,pairs),R.CHAIN);
  });
}
test('I-1 delta-only/missing original positions refuse COORDINATE_UNPROVEN',async()=>{
  const s=readFileSync(new URL('./fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml',
    import.meta.url),'utf8').replace('</PIPINGMODEL>',b4MmUnits+'</PIPINGMODEL>');
  await refuse(s,envelope(s,[[10,100]]),R.COORDINATE);
  const missing=base().replace(' FROM_X="100" FROM_Y="0" FROM_Z="0"','');
  await refuse(missing,envelope(missing),R.COORDINATE);
});
const variants=[
 ['FROM_x','FROM_X'],['from_X','FROM_X'],['FrOm_x','FROM_X'],
 ['from_y','FROM_Y'],['FROM_z','FROM_Z'],
 ['TO_x','TO_X'],['to_X','TO_X'],['To_x','TO_X'],
 ['to_y','TO_Y'],['tO_z','TO_Z'],
];
for(const [caseName,normal] of variants){
  test('I-2 LT-2 case-hidden original absolute witness refuses '+caseName,async()=>{
    const src=base().replaceAll(normal+'=',caseName+'=');
    await refuse(src,envelope(src),R.COORDINATE);
  });
}
test('I-2 S3 read-only case-hidden physical coordinate continues mapping',()=>{
  const src=base().replace('FROM_X="100"','FROM_x="100"');
  const doc=readS3(src,{fileSha256:sha(src)});
  assert.equal(doc.components[1].rawAttributes.inputXml.from.x,100);
});
test('I-2 source-field/v1 keeps raw/decoded/numeric/byteRange distinct',()=>{
  const attrs=[{name:'FrOm_NoDe',field:'FrOm_NoDe',raw:'&#52;0',
    quote:"'",byteRange:{start:14,end:20}}];
  const f=readInputXmlSourceField(attrs,'FROM_NODE',{node:true});
  assert.equal(f.schema,INPUT_XML_SOURCE_FIELD_SCHEMA);
  assert.equal(f.raw,'&#52;0');assert.equal(f.decoded,'40');
  assert.equal(f.numericId,'40');
  assert.deepEqual(f.byteRange,{start:14,end:20});
  assert.equal(exactNodeId('4.0E1'),'40');
  assert.throws(()=>readInputXmlSourceField([
    attrs[0],{...attrs[0],name:'FROM_NODE'}
  ],'FROM_NODE'),e=>e.code===R.CARRIER);
});
test('I-2 duplicate case-folded physical coordinates refuse with no bytes',async()=>{
  const s=base().replace('FROM_X="100"','FROM_X="100" from_x="100"');
  await refuse(s,envelope(s),R.CARRIER);
});
test('I-2 exact byte offset survives BOM Unicode CRLF and entity node spelling',async()=>{
  const src=base({a:'&#52;0',eol:'\r\n',bom:'\uFEFF'})
    .replace('NAME="SAFE-40"',"NAME='管-😀'");
  const {r}=await succeed(src);
  assert(r.ledger.some(x=>x.before==='&#52;0'&&x.after==='020.00'));
  assert.equal(Buffer.from(r.bytes).subarray(0,3).toString('hex'),'efbbbf');
});
function collision(family,body){
  return model([
    edge({from:'10',to:'20',fx:0,tx:100}),
    edge({from:'40',to:'50',fx:100,tx:200,body}),
  ]);
}
const families=[
 ['PIPINGELEMENT','PIPINGELEMENT',null],
 ['RESTRAINT','RESTRAINT','NODE="40" CNODE="20"'],
 ['RESTRANT','RESTRANT','NODE="40" CNODE="20"'],
 ['HANGER','HANGER','NODE="40" CNODE="20"'],
 ['SIF','SIF','NODE="40" BRANCHNODE="20"'],
 ['BEND','BEND','NODE1="40" NODE2="20" NODE3="-1.010100" RADIUS="40"'],
];
for(const [label,tag,attrs] of families){
  test('I-3 LT-3 newly introduced self-connected '+label+' refuses',async()=>{
    const s=tag==='PIPINGELEMENT'?model([
      edge({from:'10',to:'20',fx:0,tx:100}),
      edge({from:'40',to:'20',fx:100,tx:100}),
    ]):collision(label,'<'+tag+' '+attrs+'/>');
    await refuse(s,envelope(s),R.SELF);
  });
}
for(const [label,tag,attrs] of [
 ['RESTRAINT','RESTRAINT','NODE="40" CNODE="40"'],
 ['RESTRANT','RESTRANT','NODE="40" CNODE="40"'],
 ['HANGER','HANGER','NODE="40" CNODE="40"'],
 ['SIF','SIF','NODE="40" BRANCHNODE="40"'],
 ['BEND','BEND','NODE1="40" NODE2="40" NODE3="-1.010100" RADIUS="40"'],
]){
  test('I-3 LT-3e preserved pre-existing equality '+label+' allowed',async()=>{
    const src=collision(label,'<'+tag+' '+attrs+'/>');
    const {r}=await succeed(src);
    assert.equal(r.ledger.length,1+(label==='BEND'?2:2));
  });
}
test('I-3 LT-3f pre-existing parent FROM=TO equality unchanged',async()=>{
  const src=model([
    edge({from:'10',to:'20',fx:0,tx:100}),
    edge({from:'40',to:'40',fx:100,tx:100}),
  ]);
  await succeed(src);
});
test('I-3 BEND node vs original parent endpoint newly colliding refuses',async()=>{
  const src=collision('BEND',
    '<BEND NODE1="20" NODE2="-1.010100" NODE3="-1.010100" RADIUS="40"/>');
  await refuse(src,envelope(src),R.SELF);
});
test('R1 planner BEND-parent-only collision independently refuses SELF',()=>{
  const src=collision('BEND',
    '<BEND NODE1="20" NODE2="-1.010100" NODE3="-1.010100" RADIUS="40"/>');
  assert.throws(()=>assertNoNewSelfConnected(inventoryInputXml(src,{refs:refs(src)}),
    new Map([['40','20']])),error=>error.code===R.SELF);
});
test('R1 independent verifier BEND-parent-only collision refuses SELF',async()=>{
  const src=collision('BEND',
    '<BEND NODE1="20" NODE2="-1.010100" NODE3="-1.010100" RADIUS="40"/>');
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:src,authorisedMapping:new Map([['40','20']]),
    ledger:[],emittedBytes:new Uint8Array(Buffer.from(src,'utf8')),
  }),error=>error.code===R.SELF);
});
for(const path of ['../docs/GREInputxml.xml','../docs/PLB314Inputxml.xml']){
  test('I-4 LT-4a/b public v14 ordinary numeric fields pass typed admission '+path,()=>{
    const src=readFileSync(new URL(path,import.meta.url),'utf8');
    const inv=inventoryInputXml(src,{refs:refs(src)});
    assert(inv.records.length>20);
    assert(inv.items.some(x=>x.field==='HYDRO_PRESSURE'||x.field==='TEMP_EXP_C1'));
    assert(inv.items.some(x=>x.element==='BEND'&&x.field==='RADIUS'&&
      x.kind==='KNOWN_NON_NODE'));
    assert(inv.items.some(x=>x.element==='RESTRAINT'&&x.field==='CNODE'));
  });
}
test('I-4 LT-4c public-derived v14 values patch anchored source with byte parity and S3',async()=>{
  const publicSource=readFileSync(new URL('../docs/GREInputxml.xml',import.meta.url),'utf8');
  const sample=/\<PIPINGELEMENT\b[^>]*>/i.exec(publicSource)?.[0];
  assert(sample);
  const toRow=(from,to,fx,tx)=>{
    let row=sample.replace(/FROM_NODE="[^"]*"/i,'FROM_NODE="'+from+'"')
      .replace(/TO_NODE="[^"]*"/i,'TO_NODE="'+to+'"')
      .replace(/DELTA_X="[^"]*"/i,'DELTA_X="'+(tx-fx)+'"')
      .replace(/DELTA_Y="[^"]*"/i,'DELTA_Y="-1.010100"')
      .replace(/DELTA_Z="[^"]*"/i,'DELTA_Z="-1.010100"');
    row=row.replace(/\/>$/,'>');
    return row.replace(/>$/,' FROM_X="'+fx+'" FROM_Y="0" FROM_Z="0"'+
      ' TO_X="'+tx+'" TO_Y="0" TO_Z="0">')+'</PIPINGELEMENT>';
  };
  const src=model([toRow('10','020.00',0,100),toRow('40','50',100,200)]);
  const {r,updated}=await succeed(src);
  assert.equal(r.ledger[0].before,'40');
  assert.equal(r.ledger[0].after,'020.00');
  assert.equal(refs(updated)[1].fromNode,'020.00');
});
test('I-4 LT-4d documented but unpatched node carriers refuse',async()=>{
  for(const tag of ['FORCESMOMENTS','FORCEMOMENTS','USERDEFINED_NOZZLE']){
    const attr=tag==='USERDEFINED_NOZZLE'?'NOZZLE_NODE="40" VESSEL_NODE="20"':
      'NODE_NUM="40" FX="0"';
    const src=base({body:'<'+tag+' '+attr+'/>'});
    await refuse(src,envelope(src),R.UNSUPPORTED);
  }
});
test('I-4 unknown node-like vendor and unknown numeric carrier refuse',async()=>{
  for(const suffix of ['<VENDOR NODE="40"/>','<VENDOR CODE="40"/>']){
    const src=base({body:suffix});
    await refuse(src,envelope(src),R.CARRIER);
  }
});
test('I-4 numeric non-node fields remain unchanged, no false BEND RADIUS refusal',async()=>{
  const src=base({body:'<BEND NODE1="-1.010100" RADIUS="40" TYPE="1"/>'});
  const {updated}=await succeed(src);
  for(const token of ['RADIUS="40"','DIAMETER="40"','REF_NO="40"'])
    assert(updated.includes(token),token);
});
test('I-5 independent verifier imports no planner and rejects unledgered bytes',async()=>{
  const path=new URL('../uxml/UxmlEditOpsIndependentVerifier.js',import.meta.url);
  const srcCode=readFileSync(path,'utf8');
  assert(!srcCode.includes("from './UxmlEditOpsPatchBack.js'"));
  assert(!srcCode.includes("from './UxmlEditOpsInvariants.js'"));
  const s=base(),{r}=await succeed(s),changed=Buffer.from(r.bytes);
  changed[changed.indexOf(Buffer.from('SAFE-40'))]='X'.charCodeAt(0);
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:s,authorisedMapping:new Map([['40','20']]),ledger:r.ledger,
    emittedBytes:new Uint8Array(changed),
  }),e=>e.code===R.PARITY);
});
test('I-6 independent verifier catches original numeric reference restored',async()=>{
  const s=base({body:'<RESTRAINT NODE="40" CNODE="-1.010100" TYPE="7"/>'});
  const {r}=await succeed(s),bad=Buffer.from(r.bytes);
  const old=Buffer.from('NODE="020.00"'),index=bad.indexOf(old);
  assert(index>=0);
  const corrupted=Buffer.concat([bad.subarray(0,index),
    Buffer.from('NODE="40"'),bad.subarray(index+old.length)]);
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:s,authorisedMapping:new Map([['40','20']]),ledger:r.ledger,
    emittedBytes:new Uint8Array(corrupted),
  }),e=>[R.PARITY,R.REMAINED,R.TOPOLOGY].includes(e.code));
});
test('I-7 XCU output never claims native TopoFix plan authorization',async()=>{
  const s=base(),p=envelope(s);
  const {r}=await succeed(s,p);
  assert.deepEqual(Object.keys(r).sort(),
    ['ok','bytes','parity','ledger','refusals'].sort());
  assert(!('authorised' in r)&&!('committed' in r));
  await refuse(s,{...p,authorised:true},R.SCHEMA);
});

test('I-1 direct chain/cycle invariant refuses before geometry',()=>{
  assert.throws(()=>ownerGroups(new Map([['40','20'],['20','60']])),
    e=>e.code===R.CHAIN);
});
test('I-1 direct full group all-pairs invariant refuses distant A1/A2',()=>{
  const s=groupFixture(),doc=readS3(s,{fileSha256:sha(s)});
  assert.throws(()=>assertOwnerGroupSpread(doc,new Map([['40','20'],['60','20']])),
    e=>e.code===R.GROUP_SPREAD);
});
test('I-1 direct missing physical source-literal endpoint refuses COORDINATE',()=>{
  const s=groupFixture(),doc=readS3(s,{fileSha256:sha(s)});
  assert.throws(()=>physicalNodeWitnesses(doc,'999'),
    e=>e.code===R.COORDINATE);
});
test('I-3 direct newly introduced child collision refuses, pre-existing equal is allowed',()=>{
  const s=collision('RESTRAINT','<RESTRAINT NODE="40" CNODE="20"/>');
  const inv=inventoryInputXml(s,{refs:refs(s)});
  assert.throws(()=>assertNoNewSelfConnected(inv,new Map([['40','20']])),
    e=>e.code===R.SELF);
  const already=collision('RESTRAINT','<RESTRAINT NODE="40" CNODE="40"/>');
  assert.doesNotThrow(()=>assertNoNewSelfConnected(
    inventoryInputXml(already,{refs:refs(already)}),new Map([['40','20']])));
});
test('I-4 direct unclassified potential numeric carrier remains unsupported',()=>{
  const s=base().replace('REF_NO="40"','REF_NO="40" MYSTERY="40"');
  assert.throws(()=>inventoryInputXml(s,{refs:refs(s)}),
    e=>e.code===R.UNSUPPORTED);
});
test('I-5 direct verifier independent byte-complement checks untouched comment',async()=>{
  const src=base()+'<!--SAFE-COMMENT-->';
  const {r}=await succeed(src);
  const changed=Buffer.from(r.bytes),from=Buffer.from('SAFE-COMMENT');
  const pos=changed.indexOf(from);
  assert(pos>=0);
  changed[pos]='X'.charCodeAt(0);
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:src,authorisedMapping:new Map([['40','20']]),
    ledger:r.ledger,emittedBytes:new Uint8Array(changed),
  }),e=>e.code===R.PARITY);
});
test('I-6 atomic refusal emits zero bytes, never an empty successful file',async()=>{
  const s=base(),p=envelope(s);
  await refuse(s,{...p,ops:[{...p.ops[0],kind:'VALUE_EDIT'}]},R.KIND);
});

test('I-5 mandatory separate verifier is called for every success',()=>{
  const srcCode=readFileSync(new URL('../uxml/UxmlEditOpsPatchBack.js',import.meta.url),
    'utf8');
  assert.match(srcCode,/await verifyUxmlEditOpsIndependent\s*\(/);
  assert.match(srcCode,/from '\.\/UxmlEditOpsIndependentVerifier\.js'/);
});

for(const tag of ['RESTRAINT','PIPINGELEMENT','SIF','BEND']){
  const attr={
    RESTRAINT:'NODE="40" CNODE="-1.010100" TYPE="1"',
    SIF:'NODE="40" BRANCHNODE="-1.010100" TYPE="1"',
    BEND:'NODE1="40" NODE2="-1.010100" NODE3="-1.010100" RADIUS="40"',
  }[tag];
  for(const [kind,content] of [['text','40'],['CDATA','<![CDATA[40]]>']]){
    test('R1 Step12 known '+tag+' '+kind+' carrier refuses',async()=>{
      const body=tag==='PIPINGELEMENT'?content:
        '<'+tag+' '+attr+'>'+content+'</'+tag+'>';
      const src=base({body});
      await refuse(src,envelope(src),R.CARRIER);
    });
  }
}

test('R1 verifier CHAIN rejects byte-consistent candidate with poisoned mapping',async()=>{
  const s=base(),{r}=await succeed(s);
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:s,authorisedMapping:new Map([['40','20'],['20','40']]),
    ledger:r.ledger,emittedBytes:r.bytes,
  }),e=>e.code===R.CHAIN);
});
test('R1 verifier COORD refuses unobserved owner despite byte consistency',async()=>{
  const s=base(),{r}=await succeed(s);
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:s,authorisedMapping:new Map([['40','999']]),
    ledger:r.ledger,emittedBytes:r.bytes,
  }),e=>e.code===R.COORDINATE);
});
test('R1 verifier GROUP refuses original spread with byte-consistent identity',async()=>{
  const s=groupFixture(-0.0009,0.0009);
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:s,authorisedMapping:new Map([['40','20'],['60','20']]),
    ledger:[],emittedBytes:new Uint8Array(Buffer.from(s,'utf8')),
  }),e=>e.code===R.GROUP_SPREAD);
});
test('R1 verifier changed-count exact check rejects zero-width extra ledger',async()=>{
  const s=base(),{r}=await succeed(s),offset=Buffer.byteLength(s,'utf8');
  const spare={...r.ledger[0],field:'NO_SUCH_NODE_SLOT',
    before:'',after:'',byteRange:{start:offset,end:offset}};
  await assert.rejects(()=>verifyUxmlEditOpsIndependent({
    originalText:s,authorisedMapping:new Map([['40','20']]),
    ledger:[...r.ledger,spare],emittedBytes:r.bytes,
  }),e=>e.code===R.TOPOLOGY);
});
test('R1 verifier text-item equality detects XML-equivalent raw text edits',()=>{
  const before={textItems:[{path:'/CAESARII[1]/UNITS[1]/LENGTH[1]',raw:'A&amp;B'}]};
  const after={textItems:[{path:'/CAESARII[1]/UNITS[1]/LENGTH[1]',raw:'A&#38;B'}]};
  assert.throws(()=>verifierGuards.assertVerifierTextParity(before,after),
    e=>e.code==='INPUT_XML_PATCHED_TEXT_ITEMS_MISMATCH');
});
test('R1 verifier OWNER source spelling requires one original B endpoint',()=>{
  const before={carriers:[]},after={carriers:[]};
  assert.throws(()=>verifierGuards.assertVerifierOwnerSpelling(before,after,
    new Map([['40','20']])),e=>e.code===R.OWNER);
});
test('R1 verifier S3 point parity refuses changed solved point',()=>{
  const oldDoc={ports:[{sourceRefs:[{elementIndex:0,endpoint:'FROM'}],
    point:{x:100,y:0,z:0}}]};
  const candidate={ports:[{sourceRefs:[{elementIndex:0,endpoint:'FROM'}],
    point:{x:100.002,y:0,z:0}}]};
  assert.throws(()=>verifierGuards.assertVerifierS3PointConsistency(
    oldDoc,candidate,0,'FROM'),e=>e.code===R.TOPOLOGY);
});

for(const raw of ['NODE 40','40,','x 40 y']){
  test('R2 Step12 ambiguous element text refuses '+JSON.stringify(raw),async()=>{
    const src=base({body:raw});
    await refuse(src,envelope(src),R.CARRIER);
  });
  test('R2 Step12 ambiguous CDATA refuses '+JSON.stringify(raw),async()=>{
    const src=base({body:'<![CDATA['+raw+']]>'});
    await refuse(src,envelope(src),R.CARRIER);
  });
}
test('R3 whitespace-only ordinary text remains allowed',async()=>{
  await succeed(base({body:' \t\n '}));
});
test('R3 even whitespace-only model CDATA section is refused',async()=>{
  const src=base({body:'<![CDATA[ \t\n ]]>'});
  const original=base(),p=envelope(original),digest=sha(src);
  await refuse(src,{...p,fileSha256:digest,
    ops:p.ops.map(op=>({...op,fileSha256:digest}))},R.CARRIER);
});

const r2SourceWitnessDoc=()=>({
  ports:[{sourceRefs:[{endpoint:'FROM',fromNode:'40',anchored:true,elementIndex:0,
    recordKey:'E0:F40:T50'}],anchored:true,coordinateFrame:'PSI116_XYZ_MM',
    point:{x:100,y:0,z:0}}],
  components:[{rawAttributes:{inputXml:{sourceAttributes:
    {FROM_X:'100',FROM_Y:'0',FROM_Z:'0'}}}}],
});
test('R2 PIN planner source physical anchor/frame refusal',()=>{
  const doc=r2SourceWitnessDoc();
  doc.ports[0].anchored=false;
  assert.throws(()=>physicalNodeWitnesses(doc,'40'),
    e=>e.code===R.COORDINATE);
});
test('R2 PIN planner original literal witness refusal',()=>{
  const doc=r2SourceWitnessDoc();
  doc.components[0].rawAttributes.inputXml.sourceAttributes.FROM_X='not-an-axis';
  assert.throws(()=>physicalNodeWitnesses(doc,'40'),
    e=>e.code===R.COORDINATE);
});
test('R2 PIN source-field sentinel absolute coordinate refusal',()=>{
  assert.throws(()=>absoluteInputXmlSourceWitness({
    FROM_X:'-1.010100',FROM_Y:'0',FROM_Z:'0',
  },'FROM'),e=>e.code===R.COORDINATE);
});

test('R2 PIN planner sourceRef anchored flag refusal',()=>{
  const doc=r2SourceWitnessDoc();
  doc.ports[0].sourceRefs[0].anchored=false;
  assert.throws(()=>physicalNodeWitnesses(doc,'40'),e=>e.code===R.COORDINATE);
});
test('R2 PIN planner coordinate-frame refusal',()=>{
  const doc=r2SourceWitnessDoc();
  doc.ports[0].coordinateFrame='UNVERIFIED_FRAME';
  assert.throws(()=>physicalNodeWitnesses(doc,'40'),e=>e.code===R.COORDINATE);
});

const r3Signed=body=>{
  const pristine=base(),source=base({body}),authorised=envelope(pristine);
  const digest=sha(source);
  return {source,signing:{...authorised,fileSha256:digest,
    ops:authorised.ops.map(op=>({...op,fileSha256:digest}))}};
};
const r3HiddenMarkup=[
  ['comment-restraint','<!--<RESTRAINT NODE="40" CNODE="-1.010100" TYPE="1"/>-->'],
  ['comment-bend','<!--<BEND NODE1="40" NODE2="-1.010100" NODE3="-1.010100" RADIUS="40"/>-->'],
  ['processing-instruction','<?pi <RESTRAINT NODE="40" CNODE="-1.010100" TYPE="1"/> ?>'],
  ['doctype','<!DOCTYPE BOOM [<!ENTITY node "40">]>'],
  ['model-cdata','<![CDATA[<RESTRAINT NODE="40" CNODE="-1.010100"/>]]>'],
  ['empty-model-cdata','<![CDATA[ ]]>'],
];
for(const [name,markup] of r3HiddenMarkup){
  test('R3 C1 fail closed '+name+' emits no original bytes',async()=>{
    const {source,signing}=r3Signed(markup);
    await refuse(source,signing,R.CARRIER);
  });
}
test('R3 C4 outside-model nonnode text NODE 40 remains inert',()=>{
  const original=base();
  const source=original.replace('</CAESARII>',
    '<ALLOWABLESTRESS>NODE 40</ALLOWABLESTRESS></CAESARII>');
  const inventory=inventoryInputXml(source,{refs:refs(source)});
  assert(inventory.textItems.some(item=>item.raw==='NODE 40'));
});
for(const filename of ['GREInputxml.xml','PLB314Inputxml.xml']){
  test('R3 public v14 export carries no model comment/PI/CDATA '+filename,()=>{
    const source=readFileSync(new URL('../docs/'+filename,import.meta.url),'utf8');
    assert.doesNotMatch(source,/<(?:!--|\?|!\[CDATA\[)/);
    assert(inventoryInputXml(source,{refs:refs(source)}).records.length>20);
  });
}

test('R3 inventory refuses commented active RESTRAINT without writer preflight',()=>{
  const source=base({body:'<!--<RESTRAINT NODE="40" CNODE="-1.010100" TYPE="1"/>-->'});
  assert.throws(()=>inventoryInputXml(source,{refs:refs(base())}),
    error=>error.code===R.CARRIER);
});
test('R3 inventory refuses PI-hidden RESTRAINT without writer preflight',()=>{
  const source=base({body:'<?pi <RESTRAINT NODE="40" CNODE="-1.010100" TYPE="1"/> ?>'});
  assert.throws(()=>inventoryInputXml(source,{refs:refs(base())}),
    error=>error.code===R.CARRIER);
});
test('R3 inventory refuses even whitespace-only CDATA without writer preflight',()=>{
  const source=base({body:'<![CDATA[ ]]> '});
  assert.throws(()=>inventoryInputXml(source,{refs:refs(base())}),
    error=>error.code===R.CARRIER);
});

test('R3 C4 redundant namespaced-attribute gate removed but scanner still refuses',()=>{
  const source=base().replace('REF_NO="40"', 'REF_NO="40" ext:NODE="40"');
  assert.throws(()=>inventoryInputXml(source,{refs:refs(base())}),
    e=>[R.CARRIER,R.SOURCE].includes(e.code));
});


// 1.2-R4: original CAESAR DELTA is independently read, not inferred from
// the case-folding / near-sentinel S3 graph. All probes call the real writer.
const x1Honest=()=>model([
  edge({from:'10',to:'20',fx:0,tx:100}),
  edge({from:'30',to:'40',fx:100,tx:200}),
]);
const x1Zero=()=>model([
  edge({from:'10',to:'20',fx:0,tx:100}),
  edge({from:'30',to:'40',fx:100,tx:100}),
]);
const x1Envelope=s=>{
  // Source-grounded physical record keys, not a shared-solver prescan:
  // malformed DELTAs must reach the public writer's named refusal.
  const action='SYNTH-30-20',digest=sha(s);
  const op={opId:'UXML-OP-'+action,kind:'ALIAS_COINCIDENT_NODE',
    sourceActionId:action,fileSha256:digest,
    targets:['E0:F10:T20','E1:F30:T40'],
    params:[{operation:'ALIAS_NODE',sourceNode:30,canonicalNode:20}]};
  return {schema:'uxml-edit-ops/v1',sourceFormat:'INPUT_XML',
    fileSha256:digest,policy:policy([op]),ops:[op]};
};
test('X1 writer honest anchored coincidence 30~20 accepts',async()=>{
  const src=x1Honest();
  const {updated}=await succeed(src,x1Envelope(src));
  assert.equal(refs(updated)[1].fromNode,'20');
});
test('X1 writer exact DELTA_X 99 against literal 100 refuses named discrepancy',async()=>{
  const src=x1Honest().replace(' DELTA_X="100"',' DELTA_X="99"');
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('X1 writer case-fold DELTA_X 99 duplicate delta_x 100 refuses carrier',async()=>{
  const src=x1Honest().replace(' DELTA_X="100"',
    ' delta_x="100" DELTA_X="99"');
  await refuse(src,x1Envelope(src),R.CARRIER);
});
test('X1 writer near-sentinel -1.010095 with literal zero refuses',async()=>{
  const src=x1Zero().replace(' DELTA_X="-1.010100"',
    ' DELTA_X="-1.010095"');
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('X1 writer near-sentinel -1.0101001 is a real DELTA and refuses',async()=>{
  const src=x1Zero().replace(' DELTA_X="-1.010100"',
    ' DELTA_X="-1.0101001"');
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('X1 writer lowercase-only delta_x refuses DELTA_MISSING',async()=>{
  const src=x1Honest().replace(' DELTA_X="100"',' delta_x="100"');
  await refuse(src,x1Envelope(src),R.DELTA_MISSING);
});
test('X1 writer mixed-case-only DeLtA_X refuses DELTA_MISSING',async()=>{
  const src=x1Honest().replace(' DELTA_X="100"',' DeLtA_X="100"');
  await refuse(src,x1Envelope(src),R.DELTA_MISSING);
});
test('X1 writer NBSP before DELTA refuses DELTA_INVALID',async()=>{
  const src=x1Honest().replace(' DELTA_X="100"',
    ' DELTA_X="\u00A0100"');
  await refuse(src,x1Envelope(src),R.DELTA_INVALID);
});
test('X1 writer exact numeric sentinel and XML-only padding stay accepted',async()=>{
  for(const raw of ['-1.010100','-1.0101',' -1.010100 ',
    '\t-1.010100\n','\r-1.010100\t']){
    const src=x1Zero().replace(' DELTA_X="-1.010100"',
      ' DELTA_X="'+raw+'"');
    const {updated}=await succeed(src,x1Envelope(src));
    assert.equal(refs(updated)[1].fromNode,'20');
  }
});
test('X1 writer DELTA_X XML whitespace padding stays accepted',async()=>{
  const src=x1Honest().replace(' DELTA_X="100"',' DELTA_X=" 100 "');
  await succeed(src,x1Envelope(src));
});


// Step 1.2-R5 Z1/Z2: independent physical records, not S3-derived claims.
// E1 20->25 deliberately lacks literal endpoints; S3's approximate sentinel
// must never authorize an alias of 50 (or 30) to 26.
const z1Graph=({alias=50,dx='-1.010100',dy='-1.010100',
  dz='-1.010100',yEnd=0,zEnd=0}={})=>{
  const middle=edge({from:'20',to:'25',fx:100,tx:100,fy:0,ty:yEnd,
    fz:0,tz:zEnd})
    .replace(/ DELTA_X="[^"]*"/,' DELTA_X="'+dx+'"')
    .replace(/ DELTA_Y="[^"]*"/,' DELTA_Y="'+dy+'"')
    .replace(/ DELTA_Z="[^"]*"/,' DELTA_Z="'+dz+'"')
    .replace(/ (?:FROM|TO)_[XYZ]="[^"]*"/g,'');
  return model([
    edge({from:'10',to:'20',fx:0,tx:100}),
    middle,
    edge({from:'25',to:'26',fx:100,tx:100,fy:yEnd,ty:yEnd,
      fz:zEnd,tz:zEnd}),
    edge({from:String(alias),to:'60',fx:100,tx:200,fy:yEnd,ty:yEnd,
      fz:zEnd,tz:zEnd}),
  ]);
};
const z1Envelope=(s,alias=50)=>{
  const digest=sha(s),action='SYNTH-'+alias+'-26';
  const op={opId:'UXML-OP-'+action,kind:'ALIAS_COINCIDENT_NODE',
    sourceActionId:action,fileSha256:digest,
    targets:['E2:F25:T26','E3:F'+alias+':T60'],
    params:[{operation:'ALIAS_NODE',sourceNode:alias,canonicalNode:26}]};
  return {schema:'uxml-edit-ops/v1',sourceFormat:'INPUT_XML',
    fileSha256:digest,policy:policy([op]),ops:[op]};
};
test('Z1 case C unanchored near-sentinel DELTA_X refuses full file',async()=>{
  for(const dx of ['-1.010095','-1.0100951','-1.0101049']){
    const src=z1Graph({dx});
    await refuse(src,z1Envelope(src),R.DELTA_COORDINATE);
  }
});
test('Z1 no-literal near-sentinel alias 30 to 26 refuses',async()=>{
  const src=z1Graph({alias:30,dx:'-1.010095'});
  await refuse(src,z1Envelope(src,30),R.DELTA_COORDINATE);
});
test('Z1 exact-sentinel unanchored graph still accepts both aliases',async()=>{
  for(const alias of [50,30]){
    const src=z1Graph({alias,dx:'-1.010100'});
    const {updated}=await succeed(src,z1Envelope(src,alias));
    assert.equal(refs(updated)[3].fromNode,'26');
  }
});
test('Z2 no-literal near-sentinel DELTA_Y refuses named disagreement',async()=>{
  const src=z1Graph({dy:'-1.010095'});
  await refuse(src,z1Envelope(src),R.DELTA_COORDINATE);
});
test('Z2 no-literal near-sentinel DELTA_Z refuses named disagreement',async()=>{
  const src=z1Graph({dz:'-1.010095'});
  await refuse(src,z1Envelope(src),R.DELTA_COORDINATE);
});
test('Z2 honest nonzero Y and Z unanchored segment accepts',async()=>{
  const src=z1Graph({dy:'7',dz:'3',yEnd:7,zEnd:3});
  const {updated}=await succeed(src,z1Envelope(src));
  assert.equal(refs(updated)[3].fromNode,'26');
});
test('Z2 DELTA_Y near-sentinel with literal zero refuses',async()=>{
  const src=x1Zero().replace(' DELTA_Y="-1.010100"',
    ' DELTA_Y="-1.010095"');
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('Z2 DELTA_Z near-sentinel with literal zero refuses',async()=>{
  const src=x1Zero().replace(' DELTA_Z="-1.010100"',
    ' DELTA_Z="-1.010095"');
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('Z2 lowercase-only delta_y refuses DELTA_MISSING',async()=>{
  const src=x1Honest().replace(' DELTA_Y="-1.010100"',
    ' delta_y="-1.010100"');
  await refuse(src,x1Envelope(src),R.DELTA_MISSING);
});
test('Z2 lowercase-only delta_z refuses DELTA_MISSING',async()=>{
  const src=x1Honest().replace(' DELTA_Z="-1.010100"',
    ' delta_z="-1.010100"');
  await refuse(src,x1Envelope(src),R.DELTA_MISSING);
});



// B4: contract-level follow-ups; source-grounded target keys intentionally
// bypass S3 prescanning for malformed/unanchored originals.
const b4WithUnit=(source,label='in.',factor='1.000000')=>
  source.replace(b4MmUnits,
    '<UNITS><LENGTH LABEL="'+label+'" FACTOR="'+factor+'"/></UNITS>');
test('B4 F1 literal DELTA discrepancy exactly 0.001 mm accepts',async()=>{
  const src=model([
    edge({from:'10',to:'20',fx:0,tx:0}).replace(' TO_X="0"',' TO_X="0.001"'),
    edge({from:'30',to:'40',fx:0,tx:1}),
  ]);
  await succeed(src,x1Envelope(src));
});
test('B4 F1 literal DELTA discrepancy 0.0011 mm refuses',async()=>{
  const src=model([
    edge({from:'10',to:'20',fx:0,tx:0}).replace(' TO_X="0"',' TO_X="0.0011"'),
    edge({from:'30',to:'40',fx:0,tx:1}),
  ]);
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('B4 F1 shared frame-mapped hypot enforces both exact boundaries',()=>{
  const a={x:0,y:0,z:0},d={x:0,y:0,z:0};
  assert.equal(b4Guards.exactDeltaWithinMmTolerance(a,{x:0.001,y:0,z:0},d,1),true);
  assert.equal(b4Guards.exactDeltaWithinMmTolerance(a,{x:0.0011,y:0,z:0},d,1),false);
  assert.equal(b4Guards.exactDeltaWithinMmTolerance(a,{x:0,y:0.001,z:0},d,1),true);
  assert.equal(b4Guards.exactDeltaWithinMmTolerance(a,{x:0,y:0,z:0.0011},d,1),false);
});
test('B4 F2 first physical row literal discrepancy has named refusal',async()=>{
  const src=model([
    edge({from:'10',to:'20',fx:0,tx:0}).replace(' TO_X="0"',' TO_X="0.0011"'),
    edge({from:'30',to:'40',fx:0,tx:1}),
  ]);
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('B4 F2 first physical row unanchored near-sentinel cannot be skipped',async()=>{
  const noLiterals=edge({from:'10',to:'20',fx:0,tx:0})
    .replace(/ (?:FROM|TO)_[XYZ]="[^"]*"/g,'')
    .replace(' DELTA_X="-1.010100"',' DELTA_X="-1.010095"');
  const src=model([
    noLiterals,
    edge({from:'20',to:'25',fx:0,tx:10}),
    edge({from:'30',to:'40',fx:0,tx:100}),
  ]);
  const digest=sha(src),action='B4-30-20';
  const op={opId:'UXML-OP-'+action,kind:'ALIAS_COINCIDENT_NODE',
    sourceActionId:action,fileSha256:digest,targets:['E0:F10:T20','E1:F20:T25','E2:F30:T40'],
    params:[{operation:'ALIAS_NODE',sourceNode:30,canonicalNode:20}]};
  await refuse(src,{schema:'uxml-edit-ops/v1',sourceFormat:'INPUT_XML',
    fileSha256:digest,policy:policy([op]),ops:[op]},R.DELTA_COORDINATE);
});
test('B4 F3 lowercase FROM_X is not a CAESAR literal witness',async()=>{
  const src=x1Honest().replace(' FROM_X="100"',' from_x="100"');
  await refuse(src,x1Envelope(src),R.COORDINATE);
});
test('B4 F3 mixed-case To_X is not a CAESAR literal witness',async()=>{
  const src=x1Honest().replace(' TO_X="200"',' To_X="200"');
  await refuse(src,x1Envelope(src),R.COORDINATE);
});
test('B4 F4 explicit millimetres preserves honest original bytes',async()=>{
  const src=x1Honest();
  const {r,updated}=await succeed(src,x1Envelope(src));
  assert.equal(updated.includes(b4MmUnits),true);
  assert.equal(Buffer.from(r.bytes).equals(Buffer.from(updated,'utf8')),true);
});
test('B4 F4 declared inches convert native discrepancy into mm',async()=>{
  const honest=b4WithUnit(x1Honest());
  await succeed(honest,x1Envelope(honest));
  const src=b4WithUnit(x1Zero().replace(' TO_X="100"',' TO_X="100.0001"'));
  await refuse(src,x1Envelope(src),R.DELTA_COORDINATE);
});
test('B4 F4 missing LENGTH unit refuses a named code',async()=>{
  const src=x1Honest().replace(b4MmUnits,'');
  await refuse(src,x1Envelope(src),R.LENGTH_UNIT);
});
test('B4 F4 unknown and mismatched LENGTH units refuse',async()=>{
  for(const src of [b4WithUnit(x1Honest(),'yard.','1.000000'),
    b4WithUnit(x1Honest(),'in.','25.400000')]){
    await refuse(src,x1Envelope(src),R.LENGTH_UNIT);
  }
});

// B3 read-only proof runs in the existing edit-ops CI without workflow edits.
// Guarded only for isolated step-1.2 mutation clones, which copy this test
// without the unrelated B3 files and must retain their existing scope.
if (existsSync(new URL('./uxml-edit-ops-b3-samerun.test.mjs',import.meta.url))) {
  await import('./uxml-edit-ops-b3-samerun.test.mjs');
  await import('./uxml-edit-ops-b3-mutants.test.mjs');
}
