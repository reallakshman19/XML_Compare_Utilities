import assert from 'node:assert/strict';

import {
  INPUT_READINESS_SOURCE_SCHEMA,
  XML_INPUT_READINESS_AUDIT_SCHEMA,
} from '../xml-compare/contracts/xml-input-readiness-contracts.js';
import { buildInputReadinessAudit } from '../xml-compare/input/build-input-readiness-audit.js';
import { hashText } from '../xml-compare/input/hash-text.js';

function readySide(side, fileName = `${side}.xml`) {
  return {
    sourceId: side,
    side,
    fileName,
    rawText: '<Root><Line id="L1"></Line></Root>',
    profile: 'CategorizedInputXML',
    records: [{ uid: `${side}:1` }],
  };
}

const good = buildInputReadinessAudit({
  generatedAt: '2026-07-03T04:00:00.000Z',
  sourceA: readySide('A', 'source.xml'),
  targetB: readySide('B', 'target.xml'),
});
assert.equal(good.schema, XML_INPUT_READINESS_AUDIT_SCHEMA);
assert.equal(good.sourceA.schema, INPUT_READINESS_SOURCE_SCHEMA);
assert.equal(good.targetB.schema, INPUT_READINESS_SOURCE_SCHEMA);
assert.equal(good.summary.readyForConnector, true);
assert.equal(good.sourceA.readyForConnector, true);
assert.equal(good.targetB.fileName, 'target.xml');
assert.equal(good.sourceA.rawTextHash.startsWith('h32:'), true);

const blank = buildInputReadinessAudit({
  sourceA: { rawText: '', fileName: 'blank.xml', profile: 'empty' },
  targetB: readySide('B'),
});
assert.equal(blank.sourceA.readyForConnector, false);
assert.equal(blank.sourceA.diagnostics.some((item) => item.code === 'blank_input'), true);
assert.equal(blank.sourceA.blockerCount, 1);

const parseError = buildInputReadinessAudit({
  sourceA: { ...readySide('A'), errors: ['XML parse error'] },
  targetB: readySide('B'),
});
assert.equal(parseError.sourceA.parseOk, false);
assert.equal(parseError.sourceA.readyForConnector, false);
assert.equal(parseError.sourceA.diagnostics.find((item) => item.code === 'parse_error').severity, 'BLOCKER');

const warningOnly = buildInputReadinessAudit({
  sourceA: {
    ...readySide('A'),
    profile: 'unknown',
    diagnostics: [{ severity: 'WARNING', code: 'profile_review', message: 'Review profile.' }],
  },
  targetB: readySide('B'),
});
assert.equal(warningOnly.sourceA.readyForConnector, true);
assert.equal(warningOnly.sourceA.warningCount >= 1, true);
assert.equal(warningOnly.sourceA.blockerCount, 0);

assert.equal(hashText('same text'), hashText('same text'));
assert.notEqual(hashText('same text'), hashText('other text'));

const aggregate = buildInputReadinessAudit({
  sourceA: { rawText: '', fileName: 'blank.xml' },
  targetB: { ...readySide('B'), profile: 'unknown' },
});
assert.equal(aggregate.summary.readyForConnector, false);
assert.equal(aggregate.summary.blockerCount, 1);
assert.equal(aggregate.summary.warningCount >= 1, true);

console.log('XML input readiness audit tests passed');
