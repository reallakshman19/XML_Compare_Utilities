import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proveInputXmlSameRunCoincidence as prove,
  INPUT_XML_B3_CODES as C} from '../uxml/UxmlInputXmlSameRunCoincidence.js';
import {bytes,sha,element,bendElement,model,mmUnits,coincident,separated,crossRun,
  inconsistentLoop,accumulatedResidual}
  from './uxml-edit-ops-b3-fixtures.mjs';

const check=(text,sourceNode,canonicalNode,extra={})=>prove({
  originalBytes:bytes(text),fileSha256:sha(text),sourceNode,canonicalNode,...extra,
});
test('B3 proof: original delta-only run proves 10 and 40 coincident',async()=>{
  const src=coincident(),input=bytes(src),before=Buffer.from(input);
  const r=await check(src,40,10);
  assert.equal(r.status,'PROVEN_COINCIDENT',JSON.stringify(r));
  assert.equal(r.distanceMm,0);
  assert.equal(r.pathResidualMm,0);
  assert.equal(r.sourceSha256,sha(src));
  assert.equal(r.runId,'RUN-0000');
  assert.equal(r.authority,'ORIGINAL_INPUTXML_DELTA_SAME_RUN_READ_ONLY');
  assert.equal(r.sourceWitnesses.length,2);
  assert.equal(r.canonicalWitnesses.length,2);
  assert(r.sourceWitnesses.every(w=>w.recordKey&&w.endpoint&&w.frame));
  assert.deepEqual(input,before);
  assert.equal('bytes' in r,false);
  assert.equal('ledger' in r,false);
});
test('B3 public GRE original 500 -> 510 is NOT_COINCIDENT',async()=>{
  const input=readFileSync(new URL('../docs/GREInputxml.xml',import.meta.url));
  const src=input.toString('utf8');
  const r=await prove({originalBytes:input,fileSha256:sha(src),
    sourceNode:500,canonicalNode:510});
  assert.equal(r.status,'NOT_COINCIDENT',JSON.stringify(r));
  assert(Math.abs(r.distanceMm-224.9999854134436)<1e-5,r.distanceMm);
  assert(r.pathResidualMm<1e-6,'float roundoff: '+r.pathResidualMm);
});
test('B3 forged side coordinate cannot authorize noncoincident source nodes',async()=>{
  const src=separated();
  const r=await check(src,40,10,{
    sideFile:{fileSha256:sha(src),coordinates:[
      {node:40,x:0,y:0,z:0},{node:10,x:0,y:0,z:0},
    ]},
  });
  assert.equal(r.status,'NOT_COINCIDENT',JSON.stringify(r));
  assert(r.distanceMm>0.001);
});
test('B3 cross-run zero-seeded coincidence is explicitly refused',async()=>{
  const r=await check(crossRun(),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.CROSS_RUN);
});
test('B3 absent node refuses',async()=>{
  const r=await check(coincident(),999,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.ABSENT);
});
test('B3 loop closure 0.002 mm conflicts with all-path consistency',async()=>{
  const r=await check(inconsistentLoop(),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.LOOP);
});
test('B3 two sub-tolerance loop residuals accumulate beyond 0.001',async()=>{
  const r=await check(accumulatedResidual(),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.LOOP);
  assert(r.pathResidualMm>0.001);
});
test('B3 missing DELTA refuses with named code',async()=>{
  const text=model([element(10,20,'100').replace(' DELTA_Z="-1.010100"','')]);
  const r=await check(text,10,20);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DELTA_MISSING);
});
test('B3 nonfinite DELTA refuses with named code',async()=>{
  const r=await check(model([element(10,20,'1e999')]),10,20);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DELTA_NONFINITE);
});
test('B3 invalid numeric DELTA refuses',async()=>{
  const r=await check(model([element(10,20,'NaN')]),10,20);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DELTA_INVALID);
});
test('B3 wrong SHA refuses before geometry',async()=>{
  const src=coincident();
  const r=await check(src,40,10,{fileSha256:'0'.repeat(64)});
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.SHA_MISMATCH);
});
test('B3 missing SHA refuses',async()=>{
  const src=coincident();
  const r=await check(src,40,10,{fileSha256:''});
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.SHA_REQUIRED);
});
test('B3 valid UTF-8 with BOM remains byte identical',async()=>{
  const src='\uFEFF'+coincident();
  const r=await check(src,'40.000000','1e1');
  assert.equal(r.status,'PROVEN_COINCIDENT',JSON.stringify(r));
});
test('B3 malformed UTF-8 refuses',async()=>{
  const r=await prove({originalBytes:Uint8Array.of(0x3c,0xff,0x3e),
    fileSha256:'0'.repeat(64),sourceNode:40,canonicalNode:10});
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.BYTES);
});
test('B3 distinct input node identities required',async()=>{
  const r=await check(coincident(),'10.0','1e1');
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DISTINCT);
});
test('B3 boundary 0.0005 is coincident; 0.002 is not',async()=>{
  const near=model([element(10,20,'100'),element(20,40,'-99.9995')]);
  const a=await check(near,40,10),b=await check(separated(),40,10);
  assert.equal(a.status,'PROVEN_COINCIDENT');
  assert(a.distanceMm<=0.001);
  assert.equal(Object.hasOwn(a,'maxWitnessDistanceMm'),false);
  assert.equal(b.status,'NOT_COINCIDENT');
  assert(b.distanceMm>0.001);
});

const stackedRows=[
  element(10,20,'100'),element(20,40,'-99.9995'),
  element(10,20,'100.0009'),
];
test('B3-R1 stacked tolerance refuses in both element orders',async()=>{
  for(const rows of [stackedRows,[...stackedRows].reverse()]){
    const r=await check(model(rows),40,10);
    assert.equal(r.status,'NOT_COINCIDENT',JSON.stringify(r));
    assert(r.pathResidualMm>0 && r.pathResidualMm<0.001);
    assert(r.pathBoundMm>0.001,'all-path upper bound: '+r.pathBoundMm);
  }
});
test('B3-R1 every permutation of source element order has same verdict',async()=>{
  const permutations=[
    [0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0],
  ];
  const results=await Promise.all(permutations.map(async order=>
    check(model(order.map(i=>stackedRows[i])),40,10)));
  assert.deepEqual(results.map(r=>r.status),Array(6).fill('NOT_COINCIDENT'));
  assert.equal(new Set(results.map(r=>r.distanceMm)).size,1);
  assert.equal(new Set(results.map(r=>r.pathBoundMm)).size,1);
});
test('B3-R1 case-folded DELTA duplicate refuses; no lower-first forgery',async()=>{
  const second=element(20,40,'-99')
    .replace(' DELTA_X="-99"',' delta_x="-100" DELTA_X="-99"');
  const r=await check(model([element(10,20,'100'),second]),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.FIELD_CASE);
});
test('B3-R1 lowercase-only DELTA_X/Y/Z is missing, never proof',async()=>{
  const second=element(20,40,'-100')
    .replace(' DELTA_X="-100"',' delta_x="-100"')
    .replace(' DELTA_Y="-1.010100"',' delta_y="-1.010100"')
    .replace(' DELTA_Z="-1.010100"',' delta_z="-1.010100"');
  const r=await check(model([element(10,20,'100'),second]),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.DELTA_MISSING);
});
test('B3-R1 duplicate case-folded FROM_NODE / TO_NODE refuse',async()=>{
  for(const [name,value] of [['FROM_NODE','20'],['TO_NODE','40']]){
    const second=element(20,40,'-100')
      .replace(' '+name+'="'+value+'"',
        ' '+name.toLowerCase()+'="'+value+'" '+name+'="'+value+'"');
    const r=await check(model([element(10,20,'100'),second]),40,10);
    assert.equal(r.status,'REFUSED');assert.equal(r.code,C.FIELD_CASE);
  }
});
test('B3-R1 lowercase-only source node identity refuses',async()=>{
  const second=element(20,40,'-100').replace(' FROM_NODE="20"',' from_node="20"');
  const r=await check(model([element(10,20,'100'),second]),40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.NODE_ID);
});
test('B3-R1 near-sentinel values never become zero',async()=>{
  for(const delta of ['-1.010095','-1.010105','-1.010099999']){
    const r=await check(model([element(10,40,delta)]),40,10);
    assert.equal(r.status,'REFUSED',delta+':'+JSON.stringify(r));
    assert.equal(r.code,C.DELTA_INVALID,delta);
  }
});
test('B3-R1 only numeric-exact sentinel is zero',async()=>{
  for(const delta of ['-1.010100','-1.0101','-1.0101000']){
    const r=await check(model([element(10,40,delta)]),40,10);
    assert.equal(r.status,'PROVEN_COINCIDENT',delta+':'+JSON.stringify(r));
    assert.equal(r.distanceMm,0);
  }
});
test('B3-R1 null, undefined and non-object arguments refuse BYTES',async()=>{
  for(const arg of [null,undefined,0,3.14,true,'source',[]]){
    const r=await prove(arg);
    assert.equal(r.status,'REFUSED');
    assert.equal(r.code,C.BYTES);
  }
});
test('B3-R1 invalid input node identity refuses with named code',async()=>{
  for(const node of ['10.5','garbage',-1]){
    const r=await check(coincident(),node,10);
    assert.equal(r.status,'REFUSED');assert.equal(r.code,C.NODE_ID);
  }
  const text=model([element(10,40,'0.001').replace('FROM_NODE="10"',
    'FROM_NODE="invalid"')]);
  const r=await check(text,40,10);
  assert.equal(r.status,'REFUSED');assert.equal(r.code,C.NODE_ID);
});
test('B3-R1 exactly 0.001 mm is PROVEN, above is NOT_COINCIDENT',async()=>{
  const boundary=await check(model([element(10,40,'0.001')]),40,10);
  const outside=await check(model([element(10,40,'0.001001')]),40,10);
  assert.equal(boundary.status,'PROVEN_COINCIDENT',JSON.stringify(boundary));
  assert.equal(boundary.distanceMm,0.001);
  assert.equal(boundary.pathBoundMm,0.001);
  assert.equal(outside.status,'NOT_COINCIDENT');
});


const unicodeSpaces=[
  ['NBSP U+00A0','\u00A0'],
  ['EM SPACE U+2003','\u2003'],
  ['BOM U+FEFF','\uFEFF'],
];
for(const [label,space] of unicodeSpaces){
  test('B3-R2 W1 '+label+' DELTA axis/padding refuses',async()=>{
    for(const axis of ['X','Y','Z']){
      for(const side of ['leading','trailing']){
        const name='DELTA_'+axis;
        const raw=axis==='X'?'-100':'-1.010100';
        const poisoned=side==='leading'?space+raw:raw+space;
        const second=element(20,40,'-100').replace(
          ' '+name+'="'+raw+'"',' '+name+'="'+poisoned+'"');
        const r=await check(model([element(10,20,'100'),second]),40,10);
        assert.equal(r.status,'REFUSED',label+' '+axis+' '+side+':'+JSON.stringify(r));
        assert.equal(r.code,C.DELTA_INVALID);
      }
    }
  });
  test('B3-R2 W1 '+label+' raw node endpoints refuse',async()=>{
    for(const [field,node] of [['FROM_NODE','20'],['TO_NODE','40']]){
      for(const side of ['leading','trailing']){
        const poisoned=side==='leading'?space+node:node+space;
        const second=element(20,40,'-100').replace(
          ' '+field+'="'+node+'"',' '+field+'="'+poisoned+'"');
        const r=await check(model([element(10,20,'100'),second]),40,10);
        assert.equal(r.status,'REFUSED',label+' '+field+' '+side+':'+JSON.stringify(r));
        assert.equal(r.code,C.NODE_ID);
      }
    }
  });
}
test('B3-R2 W1 XML-only padded DELTAs and nodes remain valid',async()=>{
  for(const whitespace of [' ','\t','\n','\r',' \t\n\r ']){
    const second=element(20,40,whitespace+'-100'+whitespace)
      .replace(' FROM_NODE="20"',' FROM_NODE="'+whitespace+'20'+whitespace+'"')
      .replace(' TO_NODE="40"',' TO_NODE="'+whitespace+'40'+whitespace+'"');
    const r=await check(model([element(10,20,'100'),second]),40,10);
    assert.equal(r.status,'PROVEN_COINCIDENT',JSON.stringify(r));
    assert.equal(r.distanceMm,0);
  }
});
test('B3-R2 W1 XML-entity numeric source survives, escaped NBSP refuses',async()=>{
  const good=element(20,40,'-100').replace('TO_NODE="40"','TO_NODE="&#52;0"');
  const bad=element(20,40,'-100').replace('TO_NODE="40"','TO_NODE="40&#xA0;"');
  const yes=await check(model([element(10,20,'100'),good]),40,10);
  const no=await check(model([element(10,20,'100'),bad]),40,10);
  assert.equal(yes.status,'PROVEN_COINCIDENT',JSON.stringify(yes));
  assert.equal(no.status,'REFUSED');
  assert.equal(no.code,C.NODE_ID);
});
test('B3-R2 W2 output reports actual distance, no redundant maxWitnessDistanceMm',async()=>{
  for(const src of [coincident(),separated()]){
    const r=await check(src,40,10);
    assert.equal(Object.hasOwn(r,'maxWitnessDistanceMm'),false);
    assert(Number.isFinite(r.distanceMm));
    assert(Number.isFinite(r.pathBoundMm));
  }
});


const tinyDeltaRows=[element(10,20,'1.0'),element(20,40,'-0.9995')];
const lengthUnit=(label,factor)=>'<UNITS><LENGTH LABEL="'+label+
  '" FACTOR="'+factor+'"/></UNITS>';
test('B3-R3 U1 valid explicit mm factor 25.4 preserves mm tolerance',async()=>{
  for(const units of [mmUnits,lengthUnit('mm.','25.4')]){
    const r=await check(model(tinyDeltaRows,units),40,10);
    assert.equal(r.status,'PROVEN_COINCIDENT',JSON.stringify(r));
    assert(Math.abs(r.distanceMm-0.0005)<1e-10,r.distanceMm);
    assert(r.pathBoundMm<=0.001);
  }
});
test('B3-R3 U1 metre label factor refuses millimetre coincidence',async()=>{
  const r=await check(model(tinyDeltaRows,lengthUnit('m','0.025400')),40,10);
  assert.equal(r.status,'REFUSED',JSON.stringify(r));
  assert.equal(r.code,C.UNIT);
});
test('B3-R3 U1 inch label factor refuses millimetre coincidence',async()=>{
  const r=await check(model(tinyDeltaRows,lengthUnit('in.','1.000000')),40,10);
  assert.equal(r.status,'REFUSED',JSON.stringify(r));
  assert.equal(r.code,C.UNIT);
});
test('B3-R3 U1 missing original UNITS refuses; no inferred default',async()=>{
  const r=await check(model(tinyDeltaRows,null),40,10);
  assert.equal(r.status,'REFUSED',JSON.stringify(r));
  assert.equal(r.code,C.UNIT);
});
test('B3-R3 U1 duplicate UNITS or LENGTH refuses',async()=>{
  for(const units of [
    mmUnits+mmUnits,
    '<UNITS><LENGTH LABEL="mm." FACTOR="25.400000"/>'+
      '<LENGTH LABEL="mm." FACTOR="25.400000"/></UNITS>',
    lengthUnit('mm.','25.400001'),
    '<UNITS/>',
  ]){
    const r=await check(model(tinyDeltaRows,units),40,10);
    assert.equal(r.status,'REFUSED',JSON.stringify(r));
    assert.equal(r.code,C.UNIT);
  }
});
test('B3-R3 U1 ignores comment/CDATA faux UNITS and refuses misplaced LENGTH',async()=>{
  const cases=[
    '<!-- '+mmUnits+' -->',
    '<UNITS><![CDATA[<LENGTH LABEL="mm." FACTOR="25.400000"/>]]></UNITS>',
    '<UNITS><OTHER><LENGTH LABEL="mm." FACTOR="25.400000"/></OTHER></UNITS>',
  ];
  for(const units of cases){
    const r=await check(model(tinyDeltaRows,units),40,10);
    assert.equal(r.status,'REFUSED',JSON.stringify(r));
    assert.equal(r.code,C.UNIT);
  }
});


test('B3-R4 V1 bend TO node 20 cannot be proven at TIP',async()=>{
  const src=model([
    bendElement(10,20,'1000'),
    element(20,30,'-1.010100','-1.010100','1000'),
    element(30,40,'-1.010100','-1.010100','-1000'),
  ]);
  const result=await check(src,40,20);
  assert.equal(result.status,'REFUSED',JSON.stringify(result));
  assert.equal(result.code,C.BEND);
});
test('B3-R4 V1 bend curvature NODE1/2/3 excluded even if not graph endpoints',async()=>{
  const src=model([
    bendElement(10,20,'1000',{node1:'19.000000',node2:'18.000000',
      node3:'17.000000'}),
    element(20,30,'-1.010100','-1.010100','1000'),
    element(30,40,'-1.010100','-1.010100','-1000'),
  ]);
  for(const n of [19,18,17]){
    const result=await check(src,n,40);
    assert.equal(result.status,'REFUSED',n+': '+JSON.stringify(result));
    assert.equal(result.code,C.BEND);
  }
});
test('B3-R4 V1 real GRE bend TO and curvature NODE1/2 refuse',async()=>{
  const input=readFileSync(new URL('../docs/GREInputxml.xml',import.meta.url));
  const src=input.toString('utf8');
  const params={originalBytes:input,fileSha256:sha(src),canonicalNode:500};
  for(const n of [1500,1499,1498]){
    const result=await prove({...params,sourceNode:n});
    assert.equal(result.status,'REFUSED',n+':'+JSON.stringify(result));
    assert.equal(result.code,C.BEND);
  }
});
test('B3-R4 V1 unrelated straight pair remains PROVEN with bend elsewhere',async()=>{
  const src=model([
    element(10,20,'100'),element(20,40,'-100'),
    bendElement(80,90,'10',{node1:'89',node2:'88',node3:'-1.010100'}),
  ]);
  const result=await check(src,40,10);
  assert.equal(result.status,'PROVEN_COINCIDENT',JSON.stringify(result));
  assert.equal(result.distanceMm,0);
});
test('B3-R4 V1 text-only BEND in comment is never bend authority',async()=>{
  const fake='<!-- <BEND RADIUS="100" NODE1="10" NODE2="40"/> -->';
  const src=model([element(10,20,'100'),element(20,40,'-100')],mmUnits+fake);
  const result=await check(src,40,10);
  assert.equal(result.status,'PROVEN_COINCIDENT',JSON.stringify(result));
});
test('B3-R4 V2 model-level mm UNITS required, nested inside PIPINGELEMENT refuses',async()=>{
  const nested=element(10,20,'1.0').replace(/\/>$/,
    '>'+mmUnits+'</PIPINGELEMENT>');
  const src=model([nested,element(20,40,'-0.9995')],null);
  const result=await check(src,40,10);
  assert.equal(result.status,'REFUSED',JSON.stringify(result));
  assert.equal(result.code,C.UNIT);
});
test('B3-R4 V2 inch label with mm factor still refuses',async()=>{
  const units='<UNITS><LENGTH LABEL="in." FACTOR="25.400000"/></UNITS>';
  const result=await check(model(tinyDeltaRows,units),40,10);
  assert.equal(result.status,'REFUSED',JSON.stringify(result));
  assert.equal(result.code,C.UNIT);
});
