import assert from 'node:assert/strict';
import { createCiiPhysicalFile, ciiPhysicalSectionRows } from '../tabs/cii-workspace/cii-workspace-physical-file.js';
import { extractCiiNodeNameEvidence } from '../tabs/cii-workspace/cii-workspace-nodename.js';

const widths = [15, 13, 13, 13, 13, 13];

function numericRow(values) {
  return values.map((value, index) => String(value ?? '').padStart(widths[index], ' ')).join('');
}

function elementBlock(from, to, pointer) {
  const rows = Array.from({ length: 15 }, () => numericRow([0, 0, 0, 0, 0, 0]));
  rows[0] = numericRow([from, to, 0, 0, 1000, 273]);
  rows[13] = numericRow([0, 0, 0, 0, 0, pointer]);
  return rows;
}

function nameRow(fromName, toName) {
  return `  ${String(fromName).padEnd(26)}${String(toName).padEnd(25)}`;
}

function fixture(lineEnding = '\r\n', finalNewline = false) {
  const lines = [
    '#$ ELEMENTS', ...elementBlock(100, 200, 1), ...elementBlock(300, 400, 1),
    '#$ NODENAME', nameRow('FROM-SHARED', 'TO-SHARED'), '#$ CONTROL', 'x',
  ];
  return lines.join(lineEnding) + (finalNewline ? lineEnding : '');
}

function duplicateEndpointFixture() {
  return [
    '#$ ELEMENTS', ...elementBlock(100, 200, 1), ...elementBlock(100, 200, 2),
    '#$ NODENAME', nameRow('DUP-FROM', 'DUP-TO'), nameRow('DUP-FROM', 'DUP-TO'), '#$ CONTROL', 'x',
  ].join('\r\n');
}

const raw = fixture('\r\n', false);
const encoded = new TextEncoder().encode(raw);
const physical = createCiiPhysicalFile(encoded);
assert.equal(physical.byteAuthority, 'ORIGINAL_BYTES');
assert.equal(physical.writer1CByteEligible, true);
assert.equal(physical.textEncodingAuthority, 'UTF8_STRICT');
assert.equal(physical.lineEndings.style, 'CRLF');
assert.equal(physical.lineEndings.finalLineTerminated, false);
assert.equal(physical.byteLength, encoded.length);
assert.equal(ciiPhysicalSectionRows(physical, 'NODENAME').length, 1);

const parsed = {
  nodes: { 100: {}, 200: {}, 300: {}, 400: {} },
  elements: [{ index: 0, from: 100, to: 200 }, { index: 1, from: 300, to: 400 }],
};
const evidence = extractCiiNodeNameEvidence(raw, parsed, { physicalFile: physical });
assert.equal(evidence.physicalCustody.status, 'QUALIFIED');
assert.equal(evidence.physicalCustody.rowCount, 1);
assert.equal(evidence.physicalCustody.byElementIndex[0].pointer, 1);
assert.equal(evidence.physicalCustody.byElementIndex[0].parsedElementIndex, 0);
assert.equal(evidence.physicalCustody.byElementIndex[0].exactPhysicalCustody, true);
assert.equal(evidence.physicalCustody.byElementIndex[0].pointerField.width, 13);
assert.equal(evidence.physicalCustody.byElementIndex[0].toField.width, 25);
const toSpan = Object.values(evidence.physicalCustody.bySpan).find((item) => item.fieldIdentity === 'NODENAME_TO');
assert.equal(toSpan.owners.length, 2);
assert.deepEqual(toSpan.owners.map((item) => item.nodeId), ['200', '400']);
assert.equal(toSpan.rawField, 'TO-SHARED'.padEnd(25));

// Read-only semantic recovery may use FROM/TO as a compatibility fallback, but
// exact Writer1C physical custody must not. Here the parser indices are unique
// and in range but intentionally point at the opposite physical blocks.
const swappedParsed = {
  nodes: { 100: {}, 200: {}, 300: {}, 400: {} },
  elements: [{ index: 0, from: 300, to: 400 }, { index: 1, from: 100, to: 200 }],
};
const swappedEvidence = extractCiiNodeNameEvidence(raw, swappedParsed, { physicalFile: physical });
assert.equal(swappedEvidence.conflicts.length, 0,
  'semantic compatibility fallback should remain readable without inventing a semantic conflict');
assert.equal(swappedEvidence.names['200'], 'TO-SHARED');
assert.equal(swappedEvidence.names['400'], 'TO-SHARED');
assert.equal(swappedEvidence.physicalCustody.status, 'BLOCKED');
assert(swappedEvidence.physicalCustody.blockers.includes('NODENAME_ELEMENT_BLOCK_EXACT_CUSTODY_REQUIRED:0'));
assert(swappedEvidence.physicalCustody.blockers.includes('NODENAME_ELEMENT_BLOCK_EXACT_CUSTODY_REQUIRED:1'));
assert.equal(Object.keys(swappedEvidence.physicalCustody.bySpan).length, 0,
  'semantic fallback must never create Writer1C physical spans');

// Duplicate/parallel endpoint records are the high-risk case: FROM/TO is not a
// unique physical key. An out-of-range parsed index used to fall back to the
// first unused matching record. Semantic names may still be observed, but only
// the independently exact second element may contribute physical spans and the
// whole custody contract remains blocked.
const duplicateRaw = duplicateEndpointFixture();
const duplicatePhysical = createCiiPhysicalFile(new TextEncoder().encode(duplicateRaw));
const duplicateParsed = {
  nodes: { 100: {}, 200: {} },
  elements: [{ index: 9, from: 100, to: 200 }, { index: 1, from: 100, to: 200 }],
};
const duplicateEvidence = extractCiiNodeNameEvidence(duplicateRaw, duplicateParsed, { physicalFile: duplicatePhysical });
assert.equal(duplicateEvidence.conflicts.length, 0,
  'duplicate endpoints with consistent names remain semantic evidence, never physical Writer authority');
assert.equal(duplicateEvidence.names['100'], 'DUP-FROM');
assert.equal(duplicateEvidence.names['200'], 'DUP-TO');
assert.equal(duplicateEvidence.physicalCustody.status, 'BLOCKED');
assert(duplicateEvidence.physicalCustody.blockers.includes('NODENAME_ELEMENT_PARSED_INDEX_OUT_OF_RANGE:9'));
assert(duplicateEvidence.physicalCustody.blockers.includes('NODENAME_ELEMENT_BLOCK_EXACT_CUSTODY_REQUIRED:0'));
assert.equal(duplicateEvidence.physicalCustody.byElementIndex[0], undefined,
  'FROM/TO-only fallback must not populate physical byElementIndex custody');
assert.equal(duplicateEvidence.physicalCustody.byElementIndex[1].blockIndex, 1);

// Full physical block coverage is itself part of Writer custody. A parser view
// that omits one physical block may still recover a name, but cannot be writable.
const partialParsed = { nodes: { 100: {}, 200: {} }, elements: [{ index: 0, from: 100, to: 200 }] };
const partialEvidence = extractCiiNodeNameEvidence(duplicateRaw, partialParsed, { physicalFile: duplicatePhysical });
assert.equal(partialEvidence.names['200'], 'DUP-TO');
assert.equal(partialEvidence.physicalCustody.status, 'BLOCKED');
assert(partialEvidence.physicalCustody.blockers.includes('NODENAME_ELEMENT_BLOCK_COUNT_MISMATCH:1:2'));

const compatibility = extractCiiNodeNameEvidence(raw, parsed);
assert.equal(compatibility.physicalCustody.status, 'BLOCKED');
assert(compatibility.physicalCustody.blockers.includes('NODENAME_ORIGINAL_BYTE_CUSTODY_REQUIRED'));

const malformedBytes = new Uint8Array(encoded); const elementRows = ciiPhysicalSectionRows(physical, 'ELEMENTS');
malformedBytes[elementRows[13].byteStart + 79] = 'X'.charCodeAt(0);
const malformedPhysical = createCiiPhysicalFile(malformedBytes);
const malformedEvidence = extractCiiNodeNameEvidence(malformedPhysical.text, parsed, { physicalFile: malformedPhysical });
assert(malformedEvidence.conflicts.some((item) => item.code === 'NODENAME_POINTER_UNREADABLE'));
assert.equal(malformedEvidence.physicalCustody.status, 'BLOCKED');
assert(malformedEvidence.physicalCustody.blockers.includes('NODENAME_CUSTODY_CONFLICT:NODENAME_POINTER_UNREADABLE'));

const legacyBytes = new Uint8Array([0x23, 0x24, 0x20, 0x56, 0x45, 0x52, 0x53, 0x49, 0x4f, 0x4e, 0x0d, 0x0a, 0x80]);
const legacyPhysical = createCiiPhysicalFile(legacyBytes);
assert.equal(legacyPhysical.byteAuthority, 'ORIGINAL_BYTES');
assert.equal(legacyPhysical.writer1CByteEligible, true);
assert.equal(legacyPhysical.textEncodingAuthority, 'UTF8_REPLACEMENT_COMPATIBILITY');
assert.equal(legacyPhysical.originalByteString.charCodeAt(legacyPhysical.originalByteString.length - 1), 0x80);

console.log('Writer 1C byte custody, exact ELEMENT identity, semantic fallback isolation and shared NODENAME ownership checks passed.');
