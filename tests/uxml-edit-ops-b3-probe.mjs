// Isolated negative oracle: each probe runs unchanged GREEN then mutant RED.
import assert from 'node:assert/strict';
import {proveInputXmlSameRunCoincidence as prove,
  INPUT_XML_B3_CODES as C} from '../uxml/UxmlInputXmlSameRunCoincidence.js';
import {bytes,sha,coincident,separated,crossRun,accumulatedResidual}
  from './uxml-edit-ops-b3-fixtures.mjs';

const which=process.argv[2];
const specs={
  ALL_PATH:{source:accumulatedResidual(),a:40,b:10,status:'REFUSED',code:C.LOOP},
  SAME_RUN:{source:crossRun(),a:40,b:10,status:'REFUSED',code:C.CROSS_RUN},
  TOLERANCE:{source:separated(),a:40,b:10,status:'NOT_COINCIDENT'},
  SHA:{source:coincident(),a:40,b:10,status:'REFUSED',code:C.SHA_MISMATCH,
    hash:'0'.repeat(64)},
};
const spec=specs[which];
assert(spec,'Unknown B3 guard '+which);
const result=await prove({originalBytes:bytes(spec.source),
  fileSha256:spec.hash||sha(spec.source),
  sourceNode:spec.a,canonicalNode:spec.b});
assert.equal(result.status,spec.status,JSON.stringify(result));
if(spec.code)assert.equal(result.code,spec.code,JSON.stringify(result));
