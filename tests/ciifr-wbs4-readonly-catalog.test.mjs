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
    num([0,0,0,0,0,0],6),num([0],1),
    '#$ ELEMENTS',...element(10,20,{rigidPointer:firstRigid}),
    ...element(20,30,{rigidPointer:secondRigid}),
    '#$ NODENAME','  FROM'.padEnd(53),
    '#$ RIGID',num([weight,type],2)];
  modify?.(items);
  return new Uint8Array(Buffer.from(items.join(newline)+newline,'ascii'));
}

test('E1 literal physical field catalogue: 53 real values, 15 pointer slots and two rigid values',()=>{
  const original=fixture();
  const copy=new Uint8Array(original);
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
    [fixture({modify:x=>{x[9]=x[9].slice(0,-1);}}),/WBS4_REAL_SHAPE/],
    [fixture({modify:x=>{x[9]=num(['NaN',0,0,0,0,0],6);}}),/WBS4_REAL_FIELD_1_TOKEN/],
    [fixture({modify:x=>{x[3]=num([2,0,0,0,0,0],6);}}),/WBS4_NODENAME_CARDINALITY/],
    [fixture({modify:x=>{x.splice(6,1);}}),/WBS4_CONTROL_6_6_1_LAYOUT/],
    [fixture({modify:x=>{x[18]='       99999 /SYNTHETIC/B2';}}),/WBS4_LINE_NUMBER_LENGTH/]
  ];
  for(const [bytes,expect] of cases)assert.throws(()=>readOnlyCatalog(bytes),expect);
});

test('near-zero and signed zero are preserved as physical lexemes, not interpreted as global sentinels',()=>{
  const c=readOnlyCatalog(fixture({weight:'-0.000000E+00',type:'2',
    modify:lines=>{lines[10]=num(['1E-10',0,0,0,0,0],6);}}));
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

// All pointer counts are logical CONTROL indices, not physical line counts.
// Main six: NUMELT, NUMNOZ, NOHGRS, NONAM, NORED, NUMFLG.
// Auxiliary 13: BEND, RIGID, EXPJT, RESTRANT, DISPLMNT, FORCMNT,
// UNIFORM, WIND, OFFSETS, ALLOWBLS, SIF&TEES, IZUP FLAG, EQUIPMNT.
function setAuxCount(lines, ordinal, count){
  const c=lines.indexOf('#$ CONTROL'),row=c+2+Math.floor((ordinal-1)/6);
  const length=ordinal<=12?6:1,index=(ordinal-1)%6;
  const values=Array.from({length},(_,j)=>Number(lines[row].slice(2+j*13,15+j*13).trim()));
  values[index]=count;
  lines[row]=num(values,length);
}
function setMainCount(lines, ordinal, count){
  const row=lines.indexOf('#$ CONTROL')+1;
  const values=Array.from({length:6},(_,j)=>Number(lines[row].slice(2+j*13,15+j*13).trim()));
  values[ordinal-1]=count;lines[row]=num(values,6);
}
function setPointer(lines,ordinal,pointer){
  const row=lines.indexOf('#$ ELEMENTS')+1+12+Math.floor((ordinal-1)/6);
  const length=ordinal<=12?6:3,index=(ordinal-1)%6;
  const values=Array.from({length},(_,j)=>Number(lines[row].slice(2+j*13,15+j*13).trim()));
  values[index]=pointer;lines[row]=num(values,length);
}
function addSection(lines,name,count){
  lines.push('#$ '+name,...Array.from({length:count},()=>num([],6)));
}
const invented = (modify) => fixture({modify});

test('v14 CONTROL 6 main + 6+6+1 auxiliary: all 15 element pointer ordinals map to logical counts',()=>{
  assert.deepEqual(pointerNames,[
    'BEND','RIGID','EXPJT','RESTRANT','DISPLMNT','FORCMNT','UNIFORM','WIND',
    'OFFSETS','ALLOWBLS','SIF&TEES','NODENAME','REDUCERS','FLANGES','EQUIPMNT']);
  for(let ordinal=1;ordinal<=15;ordinal++){
    // 1 is out of range against a declared zero count for each target.
    const bad=invented(lines=>{
      if(ordinal===2)setAuxCount(lines,2,0);
      if(ordinal===12)setMainCount(lines,4,0);
      setPointer(lines,ordinal,1);
      if(ordinal===2){lines.splice(lines.indexOf('#$ RIGID'),2);}
      if(ordinal===12){lines.splice(lines.indexOf('#$ NODENAME'),2);}
    });
    assert.throws(()=>readOnlyCatalog(bad),e=>{
      // Preserve inherited RIGID/NODENAME range error codes.
      if(ordinal===2)return /WBS4_RIGID_POINTER_RANGE/.test(e.message);
      if(ordinal===12)return /WBS4_NODENAME_POINTER_RANGE/.test(e.message);
      return e.message.includes('WBS4_AUX_POINTER_RANGE') &&
        e.message.includes('element=1') &&
        e.message.includes(`pointerOrdinal=${ordinal}`) &&
        e.message.includes(`section=${pointerNames[ordinal-1]}`) &&
        e.message.includes('pointer=1 count=0');
    },'must reject auxiliary index of declared zero for ordinal '+ordinal);
  }
});

test('NC-A BEND=0 pointer9 and BEND=1 pointer2 reject; one logical BEND uses three physical lines',()=>{
  const noBend=invented(lines=>setPointer(lines,1,9));
  assert.throws(()=>readOnlyCatalog(noBend),/WBS4_AUX_POINTER_RANGE element=1 pointerOrdinal=1 section=BEND pointer=9 count=0/);
  const valid=invented(lines=>{setAuxCount(lines,1,1);setPointer(lines,1,1);addSection(lines,'BEND',3);});
  const parsed=readOnlyCatalog(valid);
  assert.equal(parsed.elements[0].pointers[0].recordShape,'PHYSICAL_CARDINALITY_ONLY');
  assert.equal(parsed.sectionCounts.BEND,3,'three *lines* do not grant three logical BEND indexes');
  const outOfRange=invented(lines=>{setAuxCount(lines,1,1);setPointer(lines,1,2);addSection(lines,'BEND',3);});
  assert.throws(()=>readOnlyCatalog(outOfRange),/WBS4_AUX_POINTER_RANGE element=1 pointerOrdinal=1 section=BEND pointer=2 count=1/);
  const missing=invented(lines=>{setAuxCount(lines,1,1);setPointer(lines,1,1);});
  assert.throws(()=>readOnlyCatalog(missing),/WBS4_AUX_SECTION_MISSING section=BEND count=1/);
  const partial=invented(lines=>{setAuxCount(lines,1,1);setPointer(lines,1,1);addSection(lines,'BEND',2);});
  assert.throws(()=>readOnlyCatalog(partial),/WBS4_AUX_CARDINALITY section=BEND count=1 physicalLines=2 expected=3/);
});

test('EXPJT=0 pointer1 rejects, valid EXPJT count1 points to one physical line',()=>{
  assert.throws(()=>readOnlyCatalog(invented(lines=>setPointer(lines,3,1))),
    /WBS4_AUX_POINTER_RANGE element=1 pointerOrdinal=3 section=EXPJT pointer=1 count=0/);
  const c=readOnlyCatalog(invented(lines=>{
    setAuxCount(lines,3,1);setPointer(lines,3,1);addSection(lines,'EXPJT',1);
  }));
  assert.equal(c.elements[0].pointers[2].pointer,1);
  assert.equal(c.elements[0].pointers[2].recordShape,'PHYSICAL_CARDINALITY_ONLY');
});

test('IZUP flag is not EQUIPMNT count: IZUP1/EQUIP0 rejects, IZUP0/EQUIP1 six-line range positive',()=>{
  const bad=invented(lines=>{setAuxCount(lines,12,1);setPointer(lines,15,1);});
  assert.throws(()=>readOnlyCatalog(bad),
    /WBS4_AUX_POINTER_RANGE element=1 pointerOrdinal=15 section=EQUIPMNT pointer=1 count=0/);
  const good=invented(lines=>{
    setAuxCount(lines,12,0);setAuxCount(lines,13,1);setPointer(lines,15,1);
    addSection(lines,'EQUIPMNT',6);
  });
  const c=readOnlyCatalog(good);
  assert.equal(c.elements[0].pointers[14].recordShape,'PHYSICAL_CARDINALITY_ONLY');
  assert.equal(c.sectionCounts.EQUIPMNT,6);
  assert.throws(()=>readOnlyCatalog(invented(lines=>setAuxCount(lines,12,2))),/WBS4_IZUP_FLAG/);
});

test('RIGID/NODENAME preserved: range errors and sharing; unknown section body explicitly unqualified',()=>{
  const rigidBad=invented(lines=>setPointer(lines,2,2));
  assert.throws(()=>readOnlyCatalog(rigidBad),/WBS4_RIGID_POINTER_RANGE element=1 pointerOrdinal=2 section=RIGID pointer=2 count=1/);
  const nodeBad=invented(lines=>setPointer(lines,12,2));
  assert.throws(()=>readOnlyCatalog(nodeBad),/WBS4_NODENAME_POINTER_RANGE element=1 pointerOrdinal=12 section=NODENAME pointer=2 count=1/);
  assert.deepEqual(readOnlyCatalog(fixture({secondRigid:1})).rigids[0].owners,[0,1]);
  assert.equal(readOnlyCatalog(fixture({firstRigid:0})).elements[0].pointers[1].recordShape,'ABSENT');
  const unknown=invented(lines=>{
    setAuxCount(lines,4,1);setPointer(lines,4,1);addSection(lines,'RESTRANT',2);
  });
  assert.equal(readOnlyCatalog(unknown).elements[0].pointers[3].recordShape,'UNVALIDATED_RECORD_SHAPE');
});
