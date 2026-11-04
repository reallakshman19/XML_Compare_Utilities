import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mapCaesarInputXmlToUxmlStrict as readS3} from '../uxml/UxmlInputXmlSchemaMapper.js';
import {applyUxmlEditOps as apply,UXML_EDIT_OPS_SCHEMA as SCHEMA,
  UXML_EDIT_OPS_REFUSALS as R,__editOpsInvariants as guards} from '../uxml/UxmlEditOpsPatchBack.js';

const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
const rowRefs=s=>readS3(s,{fileSha256:sha(s)}).components.map(c=>c.sourceRefs[0]);
const fixture=kind=>{
  const s=readFileSync(new URL('./fixtures/uxml-s3-synthetic.workspace.input.xml',import.meta.url),'utf8');
  const template=[...s.matchAll(/<PIPINGELEMENT\b[\s\S]*?<\/PIPINGELEMENT>/g)][5]?.[0];
  assert(template,'public synthetic InputXML template');
  const coords=[
    [10,20,[0,0,0],[100,0,0]],
    [20,30,[100,0,0],[150,100,0]],
    [30,35,[150,100,0],[200,50,0]],
    [35,40,[200,50,0],[100,0,0]],
    [40,50,[100,0,0],[300,0,0]],
  ];
  const elements=coords.map(([from,to,p,q],index)=>{
    const attrs={FROM_NODE:from.toFixed(6),TO_NODE:to.toFixed(6)};
    for(let axis=0;axis<3;axis++){
      const label='XYZ'[axis],delta=q[axis]-p[axis];
      attrs['FROM_'+label]=p[axis].toFixed(6);
      attrs['TO_'+label]=q[axis].toFixed(6);
      attrs['DELTA_'+label]=delta===0?'-1.010100':delta.toFixed(6);
    }
    let row=template;
    for(const [field,value] of Object.entries(attrs)){
      const re=new RegExp('\\b'+field+'="[^"]*"');
      assert(re.test(row),field);
      row=row.replace(re,field+'="'+value+'"');
    }
    return row.replace('FROM_NAME="RESTART"','FROM_NAME=""')
      .replace('TO_NAME="RESTART-END"','TO_NAME=""')
      .replace(' NAME="RESTART-END"',' NAME="PIPE-'+index+'"')
      .replace(' LINE_ID="S3-RESTART"',
        ' LINE_ID="S3B-ALIAS" REF_NO="SEG-'+index+'"');
  });
  const header=s.slice(0,s.indexOf('<PIPINGELEMENT'))
    .replace('NUMELT="6"','NUMELT="5"')
    .replace('NUMBEND="1"','NUMBEND="0"')
    .replace('NUMISECT="1"','NUMISECT="0"');
  const eol=kind==='CRLF'?'\r\n':'\n';
  const xml=header+elements.join(eol)+eol+s.slice(s.indexOf('</PIPINGMODEL>'));
  assert.equal(rowRefs(xml).length,5,'strict S3 must admit unmodified synthetic fixture');
  return xml;
};
const policy=id=>({
  selected_action_ids:[id],apply_all_safe:false,minimum_confidence:0.95,
  require_no_blocking_plan_actions:true,joint_repairs:[],short_element_requests:[],
});
const make=(source,{old=40,owner=20,kind='ALIAS_COINCIDENT_NODE'}={})=>{
  const refs=rowRefs(source),action='SYNTH-ALIAS-'+old+'-'+owner;
  const incident=refs.filter(x=>[x.fromNode,x.toNode].some(v=>
    Number(v)===old||Number(v)===owner)).map(x=>x.recordKey).sort();
  const digest=sha(source);
  return {schema:SCHEMA,sourceFormat:'INPUT_XML',fileSha256:digest,
    policy:policy(action),ops:[{opId:'UXML-OP-'+action,kind,
      sourceActionId:action,fileSha256:digest,targets:incident,
      params:[{operation:'ALIAS_NODE',sourceNode:old,canonicalNode:owner}]}]};
};
const attempt=(source,payload)=>apply(source,payload,{fileSha256:sha(source)});
const refused=async(source,payload,code,opts={})=>{
  const result=await apply(source,payload,{fileSha256:opts.fileSha256??sha(source)});
  assert.equal(result.ok,false,JSON.stringify(result));
  assert.equal(result.bytes,null);
  assert.equal(result.parity,'DIFFERENT');
  assert.deepEqual(result.ledger,[]);
  assert.equal(result.refusals[0]?.code,code,JSON.stringify(result));
  return result;
};
const requireExactLedger=(source,result)=>{
  const before=Buffer.from(source,'utf8'),after=Buffer.from(result.bytes);
  const expected=result.ledger.reduceRight((bytes,change)=>{
    const {start,end}=change.byteRange,old=Buffer.from(change.before);
    assert.deepEqual(bytes.subarray(start,end),old);
    return Buffer.concat([bytes.subarray(0,start),Buffer.from(change.after),bytes.subarray(end)]);
  },before);
  assert.deepEqual(after,expected,'only the original ledger ranges may differ');
};

test('edit-ops v1 schema, source/op identity, ledger shape and immutable output contract',async()=>{
  const source=fixture('LF'),p=make(source),r=await attempt(source,p);
  assert.equal(SCHEMA,'uxml-edit-ops/v1');
  assert.deepEqual(Object.keys(p).sort(),
    ['schema','sourceFormat','fileSha256','policy','ops'].sort());
  assert.deepEqual(Object.keys(p.ops[0]).sort(),
    ['opId','kind','sourceActionId','fileSha256','targets','params'].sort());
  assert.equal(r.ok,true,JSON.stringify(r));
  assert(r.bytes instanceof Uint8Array);
  assert.equal(r.parity,'EQUAL');assert.deepEqual(r.refusals,[]);
  assert.equal(r.ledger.length,2);
  for(const x of r.ledger)assert.deepEqual(Object.keys(x).sort(),
    ['opId','kind','recordKey','field','before','after','byteRange'].sort());
});
for(const kind of ['LF','CRLF']){
  test('alias happy sourceRef S3 reread, exact byte ranges and LF/CRLF '+kind,async()=>{
    const source=fixture(kind),p=make(source),r=await attempt(source,p);
    assert.equal(r.ok,true,JSON.stringify(r));
    assert.equal(r.parity,'EQUAL');
    assert.deepEqual(r.ledger.map(x=>x.field),['TO_NODE','FROM_NODE']);
    assert(r.ledger.every(x=>x.kind==='ALIAS_COINCIDENT_NODE'&&
      x.after==='20.000000'&&x.before==='40.000000'));
    requireExactLedger(source,r);
    const reread=readS3(Buffer.from(r.bytes).toString('utf8'),{
      fileSha256:createHash('sha256').update(r.bytes).digest('hex')});
    assert.equal(reread.components.length,5);
    assert.equal(reread.components[3].sourceRefs[0].toNode,'20.000000');
    assert.equal(reread.components[4].sourceRefs[0].fromNode,'20.000000');
    assert.equal(Buffer.from(r.bytes).includes(Buffer.from(kind==='CRLF'?'\r\n':'\n')),true);
  });
  test('schema and op-field exactness refuses without bytes '+kind,async()=>{
    const source=fixture(kind),p=make(source);
    await refused(source,{...p,schema:'uxml-edit-ops/v2'},R.SCHEMA);
    await refused(source,{...p,extra:true},R.SCHEMA);
    await refused(source,{...p,ops:[{...p.ops[0],unexpected:true}]},R.SCHEMA);
    await refused(source,{...p,ops:[]},R.SCHEMA);
  });
  test('stale original SHA, op SHA and op ID refuse '+kind,async()=>{
    const source=fixture(kind),p=make(source);
    await refused(source,{...p,fileSha256:'0'.repeat(64)},R.HASH);
    await refused(source,p,R.HASH,{fileSha256:'0'.repeat(64)});
    await refused(source,{...p,ops:[{...p.ops[0],fileSha256:'0'.repeat(64)}]},R.OP_SHA);
    await refused(source,{...p,ops:[{...p.ops[0],opId:'forged'}]},R.OP_SHA);
    const tampered=source.replace('REF_NO="SEG-0"','REF_NO="TAMPERED"');
    await refused(tampered,p,R.HASH);
  });
  test('unknown/stale recordKey and incorrect targets refuse '+kind,async()=>{
    const source=fixture(kind),p=make(source);
    await refused(source,{...p,ops:[{...p.ops[0],targets:['E999:F10:T20']}]},R.UNKNOWN);
    const validWrong=rowRefs(source)[2].recordKey;
    await refused(source,{...p,ops:[{...p.ops[0],targets:[validWrong]}]},R.TARGETS);
    await refused(source,{...p,ops:[{...p.ops[0],targets:p.ops[0].targets.slice(1)}]},
      R.TARGETS);
  });
  test('invalid or forged alias params and unknown source refuse '+kind,async()=>{
    const source=fixture(kind),p=make(source);
    await refused(source,{...p,ops:[{...p.ops[0],params:[{
      operation:'ALIAS_NODE',sourceNode:999,canonicalNode:20}]}]},R.COINCIDENCE);
    await refused(source,{...p,ops:[{...p.ops[0],params:[{
      operation:'MOVE_NODE',sourceNode:40,canonicalNode:20}]}]},R.PARAMS);
    await refused(source,{...p,ops:[{...p.ops[0],params:[{
      operation:'ALIAS_NODE',sourceNode:40,canonicalNode:40}]}]},R.PARAMS);
    await refused(source,{...p,ops:[{...p.ops[0],params:[{
      operation:'ALIAS_NODE',sourceNode:40,canonicalNode:20,extra:true}]}]},R.PARAMS);
  });
  test('unwidenable TopoFix selection policy refuses '+kind,async()=>{
    const source=fixture(kind),p=make(source);
    for(const override of [
      {minimum_confidence:0},{require_no_blocking_plan_actions:false},
      {apply_all_safe:true},{joint_repairs:[{}]},{short_element_requests:[{}]},
    ])await refused(source,{...p,policy:{...p.policy,...override}},R.POLICY_WIDEN);
    await refused(source,{...p,policy:{...p.policy,selected_action_ids:['other']}},
      R.SELECTION);
    await refused(source,{...p,policy:{...p.policy,unexpected:true}},R.POLICY);
  });
  test('SIF source owner references and descendants of unedited records refuse '+kind,async()=>{
    const source=fixture(kind),first='</PIPINGELEMENT>';
    const withSif=source.replace(first,
      '<SIF NODE="40.000000" TYPE="5.000000"/>'+first);
    const withVendor=source.replace(first,
      '<VENDOR NODE1="40.000000" OTHER="keep"/>'+first);
    const withUnmapped=source.replace(first,
      '<VENDOR UNKNOWN_VALUE="40.000000"/>'+first);
    for(const [s,code] of [[withSif,R.SIF],[withVendor,R.STRANDED],
      [withUnmapped,R.LOSS]]){
      assert.equal(rowRefs(s).length,5,'source fixture must remain S3-readable');
      await refused(s,make(s),code);
    }
  });
  test('planned FROM==TO self-loop refuses before reread '+kind,async()=>{
    // Make the retained endpoint 50 coincide with 40 while preserving S3.
    const source=fixture(kind)
      .replace('DELTA_X="200.000000"','DELTA_X="-1.010100"')
      .replace('TO_X="300.000000"','TO_X="100.000000"');
    assert.equal(rowRefs(source).length,5);
    const p=make(source,{owner:50});
    await refused(source,p,R.LOOP);
  });
  test('absolute non-coincident node alias refused before any rewrite '+kind,async()=>{
    const source=fixture(kind),p=make(source,{owner:30});
    await refused(source,p,R.COINCIDENCE);
  });
  test('S3 original structural refusal and no output '+kind,async()=>{
    const source=fixture(kind).replace('REF_NO="SEG-0"','REF_NO="SEG-0" REF_NO="DUP"');
    const p=make(fixture(kind));
    await refused(source,p,R.HASH);
    const bad=fixture(kind).replace('REF_NO="SEG-0"','REF_NO="SEG-0" REF_NO="DUP"');
    const invalid={...p,fileSha256:sha(bad),ops:[{...p.ops[0],fileSha256:sha(bad)}]};
    await refused(bad,invalid,R.SOURCE);
  });
  test('PSI116 and every non-implemented kind fail closed '+kind,async()=>{
    const source=fixture(kind),p=make(source);
    await refused(source,{...p,sourceFormat:'PSI116'},R.PSI116);
    await refused(source,{...p,sourceFormat:'PCF'},R.FORMAT);
    for(const opKind of ['VALUE_EDIT','DELETE_ELEMENT','NODE_MERGE',
      'ADD_ELEMENT','DROP_SHORT_ELEMENT','REVIEW_CONNECTION','EDIT_RESTRAINT']){
      await refused(source,{...p,ops:[{...p.ops[0],kind:opKind}]},R.KIND);
    }
  });
}
test('public GRE and PLB314 sources cannot bypass NOT_IMPLEMENTED',async()=>{
  for(const path of ['../docs/GREInputxml.xml','../docs/PLB314Inputxml.xml']){
    const src=readFileSync(new URL(path,import.meta.url),'utf8');
    const op=make(fixture('LF')).ops[0],p={schema:SCHEMA,sourceFormat:'INPUT_XML',
      fileSha256:sha(src),policy:policy(op.sourceActionId),
      ops:[{...op,fileSha256:sha(src),kind:'DELETE_ELEMENT'}]};
    await refused(src,p,R.KIND);
  }
});


const simpleEdge=(from,to,fx,tx)=>
  '<PIPINGELEMENT FROM_NODE="'+from+'.000000" TO_NODE="'+to+'.000000"'+
  ' FROM_X="'+fx+'.000000" FROM_Y="0.000000" FROM_Z="0.000000"'+
  ' TO_X="'+tx+'.000000" TO_Y="0.000000" TO_Z="0.000000"'+
  ' DELTA_X="'+(tx-fx)+'.000000" DELTA_Y="-1.010100" DELTA_Z="-1.010100"'+
  ' DIAMETER="100" WALL_THICK="6.02" LINE_ID="B" REF_NO="SYNTH" />';
const addEdges=(src,edges)=>src.replace('NUMELT="5"','NUMELT="'+(5+edges.length)+'"')
  .replace('</PIPINGMODEL>',edges.join('')+'</PIPINGMODEL>');
for(const kind of ['LF','CRLF']){
  test('B1 actual source node witness decimal 40. refuses '+kind,async()=>{
    const src=fixture(kind).replace('</PIPINGELEMENT>',
      '<RESTRAINT NODE="40." TYPE="9"/>'+'</PIPINGELEMENT>');
    assert.equal(rowRefs(src).length,5);
    await refused(src,make(src),R.STRANDED);
  });
  test('B1 actual source node witness exponent 4.0E1 refuses '+kind,async()=>{
    const src=fixture(kind).replace('</PIPINGELEMENT>',
      '<RESTRAINT NODE="4.0E1" TYPE="9"/>'+'</PIPINGELEMENT>');
    assert.equal(rowRefs(src).length,5);
    await refused(src,make(src),R.STRANDED);
  });
  test('B1 raw-only node witness exponent refuses '+kind,async()=>{
    const src=fixture(kind).replace('</PIPINGELEMENT>',
      '<VENDOR RAW_NODE="4.0E1"/>'+'</PIPINGELEMENT>');
    assert.equal(rowRefs(src).length,5);
    await refused(src,make(src),R.LOSS);
  });
  test('B2 absent canonical endpoint refuses '+kind,async()=>{
    const src=fixture(kind);
    await refused(src,make(src,{old:40,owner:999}),R.COINCIDENCE);
  });
  test('B2 disconnected delta-only cross-run candidate refuses '+kind,async()=>{
    const raw=readFileSync(new URL('./fixtures/uxml-s3-synthetic.workspace.delta-only.input.xml',
      import.meta.url),'utf8');
    const src=kind==='CRLF'?raw.replace(/\r?\n/g,'\r\n'):raw;
    assert(rowRefs(src).some(r=>Number(r.fromNode)===10));
    assert(rowRefs(src).some(r=>Number(r.fromNode)===100));
    await refused(src,make(src,{old:10,owner:100}),R.COINCIDENCE);
  });
  test('B2 public absolute twin separated original endpoints refuse '+kind,async()=>{
    const raw=readFileSync(new URL('./fixtures/uxml-s3-synthetic.workspace.input.xml',
      import.meta.url),'utf8');
    const src=kind==='CRLF'?raw.replace(/\r?\n/g,'\r\n'):raw;
    assert.equal(rowRefs(src).length,6);
    await refused(src,make(src,{old:10,owner:100}),R.COINCIDENCE);
  });
  test('independent two-operation envelope patches atomically '+kind,async()=>{
    const src=addEdges(fixture(kind),[
      simpleEdge(60,61,500,600),simpleEdge(70,71,500,650),
    ]);
    assert.equal(rowRefs(src).length,7);
    const p=make(src),q=make(src,{old:70,owner:60});
    const payload={...p,policy:{...p.policy,
      selected_action_ids:[p.ops[0].sourceActionId,q.ops[0].sourceActionId]},
      ops:[p.ops[0],q.ops[0]]};
    const result=await attempt(src,payload);
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(result.ledger.length,3);
    assert.deepEqual(new Set(result.ledger.map(x=>x.opId)).size,2);
    requireExactLedger(src,result);
    assert.equal(rowRefs(Buffer.from(result.bytes).toString('utf8')).length,7);
    // A second op with a non-existent owner makes the whole request refuse.
    const bad=make(src,{old:70,owner:999});
    const denied={...payload,ops:[p.ops[0],bad.ops[0]],
      policy:{...payload.policy,selected_action_ids:[
        p.ops[0].sourceActionId,bad.ops[0].sourceActionId]}};
    await refused(src,denied,R.COINCIDENCE);
  });
  test('chained absorbed / owner IDs refuse as one atomic transaction '+kind,async()=>{
    const src=addEdges(fixture(kind),[simpleEdge(20,60,100,100)]);
    assert.equal(rowRefs(src).length,6);
    const a=make(src),b=make(src,{old:20,owner:60});
    const payload={...a,ops:[a.ops[0],b.ops[0]],
      policy:{...a.policy,selected_action_ids:[
        a.ops[0].sourceActionId,b.ops[0].sourceActionId]}};
    await refused(src,payload,R.PARAMS);
  });
  test('ledger original byte range permits different-width renumber '+kind,async()=>{
    const src=fixture(kind).replaceAll('20.000000','200.000000');
    assert.equal(rowRefs(src).length,5);
    const result=await attempt(src,make(src,{old:40,owner:200}));
    assert.equal(result.ok,true,JSON.stringify(result));
    assert(result.ledger.every(x=>x.before.length+1===x.after.length));
    requireExactLedger(src,result);
    assert.equal(Buffer.from(result.bytes).length,Buffer.byteLength(src)+2);
  });
  test('BOM, multibyte attribute and single-quote source preserve exact bytes '+kind,async()=>{
    const src='\uFEFF'+fixture(kind).replace(' NAME="PIPE-0"'," NAME='管-😀'");
    assert.equal(rowRefs(src).length,5);
    const result=await attempt(src,make(src));
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(Buffer.from(result.bytes).subarray(0,3).toString('hex'),'efbbbf');
    assert(Buffer.from(result.bytes).includes(Buffer.from("NAME='管-😀'")));
    requireExactLedger(src,result);
  });
}
test('read-only byte, overlap, field and chain invariants independently refuse',()=>{
  assert.throws(()=>guards.reserveField(new Set(['E3:TO_NODE']),'E3:TO_NODE','OP'),
    e=>e.code===R.CONFLICT);
  assert.throws(()=>guards.assertUnchainedIds(new Set([40]),new Set([40])),
    e=>e.code===R.CONFLICT);
  assert.throws(()=>guards.assertDisjointPatches([
    {byteRange:{start:2,end:5}},{byteRange:{start:4,end:7}},
  ]),e=>e.code===R.CONFLICT);
  assert.throws(()=>guards.assertByteParity(
    Buffer.from('abc40xyz'),Buffer.from('abc20xYz'),
    [{byteRange:{start:3,end:5},after:'20'}]),
    e=>e.code===R.PARITY);
});
test('read-only source byte locator refuses duplicate and mismatched raw witnesses',()=>{
  const ref={recordKey:'E0:F40:T50',fromNode:'40',toNode:'50'};
  assert.throws(()=>guards.locate({
    open:'<PIPINGELEMENT FROM_NODE="40" FROM_NODE="40" TO_NODE="50">',
    start:0,
  },ref),e=>e.code===R.OFFSET);
  assert.throws(()=>guards.locate({
    open:'<PIPINGELEMENT FROM_NODE="41" TO_NODE="50">',
    start:0,
  },ref),e=>e.code===R.OFFSET);
});
test('public GRE InputXML passes alias kind and reaches source coincidence gate',async()=>{
  const src=readFileSync(new URL('../docs/GREInputxml.xml',import.meta.url),'utf8');
  const refs=rowRefs(src);
  const old=Number(refs[0].fromNode),owner=Number(refs.at(-1).toNode);
  assert(Number.isFinite(old)&&Number.isFinite(owner)&&old!==owner);
  await refused(src,make(src,{old,owner}),R.COINCIDENCE);
});
