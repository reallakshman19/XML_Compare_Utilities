import assert from 'node:assert/strict';
import { validateCiiWriterCompositeRoundTrip } from '../tabs/cii-workspace/cii-workspace-writer-composite-validation.js';

function document(byteString) {
  return Object.freeze({
    writer1CByteEligible: true,
    physicalFile: Object.freeze({
      originalByteString: byteString, byteLength: byteString.length,
      lines: Object.freeze([Object.freeze({ text: '#$ TEST' }), Object.freeze({ text: byteString })]),
      lineEndings: Object.freeze({ sequence: Object.freeze(['\r\n', '']) }),
    }),
  });
}
const beforeString = 'ABCDEFGHIJKLM---NOPQRSTUVWXYZ';
const afterString = '1234567890123---NOPQRSTUVWXYZ';
const bytes = new Uint8Array([...afterString].map((char) => char.charCodeAt(0)));
const writerResult = Object.freeze({
  bytes,
  mutations: Object.freeze([Object.freeze({
    spanKey: '0:13', absoluteByteStart: 0, absoluteByteEnd: 13,
    beforeField: 'ABCDEFGHIJKLM', afterField: '1234567890123',
  })]),
  components: Object.freeze({ lower: Object.freeze({}), writer1C: Object.freeze({}) }),
});
const validations = Object.freeze({ lower: Object.freeze({ status: 'PASS' }), writer1C: Object.freeze({ status: 'PASS' }) });
const validation = validateCiiWriterCompositeRoundTrip(document(beforeString), document(afterString), writerResult, validations);
assert.equal(validation.status, 'PASS');
assert.equal(validation.authorizedSpanCount, 1);

const tampered = `${afterString.slice(0, 16)}X${afterString.slice(17)}`;
const tamperedBytes = new Uint8Array([...tampered].map((char) => char.charCodeAt(0)));
assert.throws(() => validateCiiWriterCompositeRoundTrip(document(beforeString), document(tampered), { ...writerResult, bytes: tamperedBytes }, validations), /COMPOSITE_UNAUTHORIZED_BYTE_CHANGE/);
assert.throws(() => validateCiiWriterCompositeRoundTrip(document(beforeString), document(afterString), writerResult, { lower: { status: 'PASS' } }), /WRITER_1C_COMPONENT_VALIDATION_REQUIRED/);

console.log('Composite union validator rejects unauthorized bytes and missing component validation.');
