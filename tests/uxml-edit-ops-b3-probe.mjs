// Isolated negative oracle: each probe runs unchanged GREEN then mutant RED.
import assert from 'node:assert/strict';
import {proveInputXmlSameRunCoincidence as prove,
  INPUT_XML_B3_CODES as C} from '../uxml/UxmlInputXmlSameRunCoincidence.js';
import {bytes,sha,element,model,coincident,separated,crossRun,accumulatedResidual}
  from './uxml-edit-ops-b3-fixtures.mjs';

const which=process.argv[2];
const specs={
  ALL_PATH:{source:accumulatedResidual(),a:40,b:10,status:'REFUSED',code:C.LOOP},
  SAME_RUN:{source:crossRun(),a:40,b:10,status:'REFUSED',code:C.CROSS_RUN},
  TOLERANCE:{source:separated(),a:40,b:10,status:'NOT_COINCIDENT'},
  SHA:{source:coincident(),a:40,b:10,status:'REFUSED',code:C.SHA_MISMATCH,
    hash:'0'.repeat(64)},
  STACKED:{source:model([
    element(10,20,'100'),element(20,40,'-99.9995'),
    element(10,20,'100.0009')]),
    a:40,b:10,status:'NOT_COINCIDENT'},
  CASE_DUPLICATE:{source:model([element(10,20,'100'),
    element(20,40,'-99').replace(' DELTA_X="-99"',
      ' delta_x="-100" DELTA_X="-99"')]),
    a:40,b:10,status:'REFUSED',code:C.FIELD_CASE},
  CASE_REQUIRED:{source:model([element(10,20,'100'),
    element(20,40,'-100').replace(' DELTA_X="-100"',' delta_x="-100"')]),
    a:40,b:10,status:'REFUSED',code:C.DELTA_MISSING},
  SENTINEL:{source:model([element(10,40,'-1.010095')]),
    a:40,b:10,status:'REFUSED',code:C.DELTA_INVALID},
  NULL_INPUT:{status:'REFUSED',code:C.BYTES},
  BOUNDARY:{source:model([element(10,40,'0.001')]),
    a:40,b:10,status:'PROVEN_COINCIDENT'},
  NODE_ID:{source:coincident(),a:'10.5',b:10,
    status:'REFUSED',code:C.NODE_ID},
};
const spec=specs[which];
assert(spec,'Unknown B3 guard '+which);
const request=which==='NULL_INPUT'?null:{
  originalBytes:bytes(spec.source),fileSha256:spec.hash||sha(spec.source),
  sourceNode:spec.a,canonicalNode:spec.b,
};
const result=await prove(request).catch(()=>undefined);
assert.equal(result?.status,spec.status,JSON.stringify(result));
if(spec.code)assert.equal(result?.code,spec.code,JSON.stringify(result));
