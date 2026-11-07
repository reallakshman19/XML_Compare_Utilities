/**
 * Executed only inside disposable R2 verifier seed clone. The real verifier
 * is imported; no planner import or output writing is introduced.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mapCaesarInputXmlToUxmlStrict as strictS3}
  from '../uxml/UxmlInputXmlSchemaMapper.js';
import {verifyUxmlEditOpsIndependent} from '../uxml/UxmlEditOpsIndependentVerifier.js';

const sha=s=>createHash('sha256').update(Buffer.from(s,'utf8')).digest('hex');
function edge(from,to,fx,tx,body=''){
  const dx=tx===fx?'-1.010100':String(tx-fx);
  return '<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+
    '" FROM_X="'+fx+'" FROM_Y="0" FROM_Z="0"'+
    ' TO_X="'+tx+'" TO_Y="0" TO_Z="0"'+
    ' DELTA_X="'+dx+'" DELTA_Y="-1.010100" DELTA_Z="-1.010100"'+
    ' DIAMETER="40" WALL_THICK="6.02" REF_NO="40" NAME="SOURCE">'+
    body+'</PIPINGELEMENT>';
}
function sourceCase(seed){
  const to=seed==='SELF'?'020.00':'50',tx=seed==='SELF'?100:200;
  const child=seed==='CHILD'||seed==='LEDGER'?
    '<RESTRAINT NODE="40" CNODE="-1.010100" TYPE="1"/>':
    seed==='RESTRAINT_SELF'?
    '<RESTRAINT NODE="40" CNODE="20" TYPE="1"/>':
    seed==='SIF_SELF'?
    '<SIF NODE="40" BRANCHNODE="20" TYPE="1"/>':
    seed==='UNCHANGED'?
    '<RESTRAINT NODE="20" CNODE="-1.010100" TYPE="1"/>':'';
  const withBend=seed==='BEND_SELF';
  const extra=withBend?edge('60','70',200,300,
    '<BEND NODE1="40" NODE2="20" NODE3="-1.010100" RADIUS="40"/>'):'';
  return '<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">'+
    '<PIPINGMODEL xmlns="" NUMELT="'+(withBend?3:2)+'">'+
    edge('10','020.00',0,100)+edge('40',to,100,tx,child)+extra+
    '</PIPINGMODEL></CAESARII>';
}
function originalAndLedger(seed){
  const originalText=sourceCase(seed);
  const refs=strictS3(originalText,{fileSha256:sha(originalText)})
    .components.map(c=>c.sourceRefs[0]);
  const edits=[];
  const mark=(prefix,old,after,field,recordIndex=1)=>{
    const tagAt=originalText.indexOf(prefix);
    assert(tagAt>=0,'source must carry '+prefix);
    assert(prefix.endsWith(old),'marker must end in original value');
    const at=tagAt+prefix.length-old.length,tail=originalText.slice(at,at+old.length);
    assert.equal(tail,old);
    const start=Buffer.byteLength(originalText.slice(0,at),'utf8');
    edits.push({opId:'UXML-OP-R2-SEED',kind:'ALIAS_COINCIDENT_NODE',
      recordKey:refs[recordIndex].recordKey,field,before:old,after,
      byteRange:{start,end:start+Buffer.byteLength(old,'utf8')}});
  };
  mark('FROM_NODE="40','40','020.00','FROM_NODE');
  if(seed==='CHILD')mark('<RESTRAINT NODE="40','40','40','RESTRAINT[1]@NODE');
  if(seed==='LEDGER')mark('<RESTRAINT NODE="40','40','020.00','RESTRAINT[1]@NODE');
  if(seed==='RESTRAINT_SELF')mark('<RESTRAINT NODE="40','40','020.00','RESTRAINT[1]@NODE');
  if(seed==='SIF_SELF')mark('<SIF NODE="40','40','020.00','SIF[1]@NODE');
  if(seed==='BEND_SELF')mark('<BEND NODE1="40','40','020.00','BEND[1]@NODE1',2);
  edits.sort((a,b)=>a.byteRange.start-b.byteRange.start);
  let bytes=new Uint8Array(Buffer.from(originalText,'utf8'));
  for(let i=edits.length-1;i>=0;i--){
    const e=edits[i],replaced=Buffer.from(e.after,'utf8');
    bytes=Buffer.concat([bytes.subarray(0,e.byteRange.start),replaced,
      bytes.subarray(e.byteRange.end)]);
  }
  return {originalText,emittedBytes:new Uint8Array(bytes),
    authorisedMapping:new Map([['40','20']]),ledger:edits};
}
const ERRORS=Object.freeze({
  TEXT:'INPUT_XML_PATCHED_TEXT_ITEMS_MISMATCH',
  OWNER:'INPUT_XML_OWNER_NODE_SPELLING_AMBIGUOUS',
  POINT:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  ANCHOR:'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
  REF_ANCHOR:'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
  FRAME:'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
  LITERAL:'INPUT_XML_ALIAS_COORDINATE_UNPROVEN',
  SELF:'INPUT_XML_ALIAS_SELF_CONNECTED',
  CHILD:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  SHAPE:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  LEDGER:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  UNCHANGED:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  NONNODE:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  EDGES:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  ROWNUM:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  RESTRAINT_SELF:'INPUT_XML_ALIAS_SELF_CONNECTED',
  SIF_SELF:'INPUT_XML_ALIAS_SELF_CONNECTED',
  BEND_SELF:'INPUT_XML_ALIAS_SELF_CONNECTED',
  LITERAL_DRIFT:'INPUT_XML_ALIAS_GROUP_SPREAD',
  S3_RESTRAINT:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  S3_SIF:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  S3_BEND:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  ITEM_PATH:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  ITEM_COUNT:'INPUT_XML_PATCHED_NUMERIC_TOPOLOGY_MISMATCH',
  COMPONENT_COUNT:'INPUT_XML_SOURCE_REF_ORIGINAL_MISMATCH',
  REF_SHAPE:'INPUT_XML_SOURCE_REF_ORIGINAL_MISMATCH',
});
const seed=process.env.VERIFIER_SEED||'CONTROL';
test('R2 live verifier original/candidate '+seed,async()=>{
  const inputs=originalAndLedger(seed);
  if(seed==='CONTROL'){
    assert.deepEqual(await verifyUxmlEditOpsIndependent(inputs),
      {ok:true,parity:'EQUAL'});
  }else{
    assert.equal(typeof ERRORS[seed],'string','unknown seeded guard');
    await assert.rejects(()=>verifyUxmlEditOpsIndependent(inputs),
      error=>error.code===ERRORS[seed],
      'must refuse the expected unsafe byte-consistent seeded candidate');
  }
});
