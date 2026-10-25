import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readOnlyCatalog, publicInventory, elementFieldNames, pointerNames }
  from '../tools/ciifr-wbs4/readonly-catalog.mjs';

// Invented inputs only. The Owner's original CII is never committed to tests.
const num = (values, n) => '  ' + Array.from({length:n},(_,i)=>String(values[i]??0).padStart(13)).join('');
const label = (s) => '       ' + String(s.length).padStart(5) + ' ' + s;
function element(from,to,{namePointer=1,rigidPointer=1,diameter=168.3,lexeme='0'}={}){
  const raw = Array.from({length:9},(_,i)=>num(i===0 ?
    [from,to,120,0,0,diameter] : i===1 ? [7.1,0,0,120,40,0] :
    i===2 ? [lexeme,0,0,0,0,0] : [],i===8?5:6));
  return [...raw,label('SyntheticOnly'),label('/SYNTHETIC/B2'),num([-1,-1],2),
    num([0,rigidPointer,0,0,0,0],6),
    num([0,0,0,0,0,namePointer],6),num([],3)];
}
function fixture({secondRigid=0,weight='0',type='2',newline='\r\n',modify,firstRigid=1}={}){
  const items=['#$ VERSION','    5.00000      14.0000        1256',
    '#$ CONTROL',num([2,0,0,1,0,0],6),num([0,1,0,0,0,0],6),
    '#$ ELEMENTS',...element(10,20,{rigidPointer:firstRigid}),
    ...element(20,30,{rigidPointer:secondRigid}),
    '#$ NODENAME','  FROM'.padEnd(53),
    '#$ RIGID',num([weight,type],2)];
  modify?.(items);
  return new Uint8Array(Buffer.from(items.join(newline)+newline,'ascii'));
}

test('E1 literal physical field catalogue: 53 real values, 15 pointer slots and two rigid values',()=>{
  const original=fixture();
  const copy=Buffer.from(original);
  const c=readOnlyCatalog(original);
  assert.equal(c.version,14);
  assert.equal(c.elementCount,2);
  assert.equal(c.elements[0].reals.length,53);
  assert.equal(c.elements[0].pointers.length,15);
  assert.deepEqual(c.elements[0].reals.slice(0,7).map(v=>v.name),
    ['FROM node','TO node','Delta X','Delta Y','Delta Z','Outside Diameter','Wall Thickness']);
  assert.equal(c.elements[0].reals[5].value,168.3);
  assert.equal(c.elements[0].reals[5].byteEnd-c.elements[0].reals[5].byteStart,13);
  assert.equal(c.elements[0].pointers[1].section,'RIGID');
  assert.equal(c.elements[0].pointers[11].section,'NODENAME');
  assert.deepEqual(c.rigids[0].owners,[0]);
  assert.equal(c.rigids[0].weight.value,0);
  assert.equal(c.rigids[0].type.value,2);
  assert.deepEqual(original,copy,'Read-only oracle must not alter even one input byte');
  assert.equal(elementFieldNames.length,53);
  assert.equal(pointerNames.length,15);
});

test('pointer absent is not equivalent to attached RIGID Weight=0',()=>{
  const c=readOnlyCatalog(fixture({weight:'0',secondRigid:0}));
  assert.equal(c.elements[0].rigidPointer,1);
  assert.equal(c.elements[1].rigidPointer,0);
  assert.equal(c.rigids[0].weight.value,0);
  assert.equal(publicInventory(c).rigidAbsentElements,1);
  assert.equal(publicInventory(c).rigidAttachedElements,1);
});

test('shared RIGID index is explicit, not silently assumed unique',()=>{
  const c=readOnlyCatalog(fixture({secondRigid:1}));
  assert.deepEqual(c.rigids[0].owners,[0,1]);
  assert.equal(publicInventory(c).rigidSharedRecords,1);
});

test('nonfinite, malformed numeric widths, invalid pointers and cardinality fail closed',()=>{
  const cases=[
    [fixture({secondRigid:2}),/WBS4_RIGID_POINTER_RANGE/],
    [fixture({modify:x=>{x[3]=num([3,0,0,1,0,0],6);}}),/WBS4_ELEMENT_CARDINALITY/],
    [fixture({modify:x=>{x[4]=num([0,2,0,0,0,0],6);}}),/WBS4_RIGID_CARDINALITY/],
    [fixture({modify:x=>{x[7]=x[7].slice(0,-1);}}),/WBS4_REAL_SHAPE/],
    [fixture({modify:x=>{x[7]=num(['NaN',0,0,0,0,0],6);}}),/WBS4_REAL_FIELD_1_TOKEN/],
    [fixture({modify:x=>{x[3]=num([2,0,0,0,0,0],6);}}),/WBS4_NODENAME_CARDINALITY/],
    [fixture({modify:x=>{x[16]='       99999 /SYNTHETIC/B2';}}),/WBS4_LINE_NUMBER_LENGTH/]
  ];
  for(const [bytes,expect] of cases)assert.throws(()=>readOnlyCatalog(bytes),expect);
});

test('near-zero and signed zero are preserved as physical lexemes, not interpreted as global sentinels',()=>{
  const c=readOnlyCatalog(fixture({weight:'-0.000000E+00',type:'2',
    modify:lines=>{lines[8]=num(['1E-10',0,0,0,0,0],6);}}));
  assert.equal(c.elements[0].reals[12].value,1e-10);
  assert.match(c.elements[0].reals[12].lexeme,/1E-10/);
  assert(Object.is(c.rigids[0].weight.value,-0));
  assert.match(c.rigids[0].weight.lexeme,/-0.000000E\+00/);
});

test('LF and CRLF preserve exact byte-start provenance but produce no customer data in public summary',()=>{
  for(const newline of ['\n','\r\n']){
    const bytes=fixture({newline});
    const c=readOnlyCatalog(bytes);
    const field=c.elements[1].reals[5];
    const raw=Buffer.from(bytes.subarray(field.byteStart,field.byteEnd)).toString('ascii');
    assert.equal(raw,field.lexeme);
    const pub=JSON.stringify(publicInventory(c));
    assert(!pub.includes('SyntheticOnly'));
    assert(!pub.includes('/SYNTHETIC'));
    assert(!pub.includes('168.3'));
  }
});
