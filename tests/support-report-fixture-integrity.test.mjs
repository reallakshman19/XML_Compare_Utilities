import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fixtureUrl = new URL('./fixtures/support-report/support-report-ps007-sl097.sanitized.xml', import.meta.url);
const oracleUrl = new URL('./fixtures/support-report/support-report-ps007-sl097.golden.json', import.meta.url);
const FIXTURE_SHA256 = 'a583d0e20a373c11885870ad7a05f941ac6a7752711869e53ddcf7ad486e9ea6';
const ORACLE_SHA256 = 'ac1c4af5463e3b95e6ef87479172f319af60b40b6827ca27087b99f470cdb2dd';
const ORIGINAL_XML_SHA256 = '7738159bb96e2e38927a52fd6ebe625cf3f16eae0b7ad218652b799648736e62';
const WORKBOOK_SHA256 = '16eb75d84bf31e9fa92ef26c0e73bf2cd6c5e71e1fcd047ffa27bb9094c36d56';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

test('Support Report Owner fixture and golden oracle retain exact custody', async () => {
  const [fixtureBytes, oracleBytes] = await Promise.all([readFile(fixtureUrl), readFile(oracleUrl)]);
  assert.equal(sha256(fixtureBytes), FIXTURE_SHA256);
  assert.equal(sha256(oracleBytes), ORACLE_SHA256);

  const xml = fixtureBytes.toString('utf8');
  const oracle = JSON.parse(oracleBytes.toString('utf8'));
  assert.equal(oracle.schema, 'SupportReportGoldenOracle.v1');
  assert.equal(oracle.sourceWorkbook.sha256, WORKBOOK_SHA256);
  assert.equal(oracle.sourceSupportReportXml.originalSha256, ORIGINAL_XML_SHA256);
  assert.equal(oracle.sourceSupportReportXml.sanitizedSha256, FIXTURE_SHA256);
  assert.equal(oracle.authority.class, 'OWNER_SUPPLIED_GOLDEN_OUTPUT');
  assert.equal(oracle.authority.generatedFromProductionCode, false);
  assert.equal(oracle.sourceSupportReportXml.fixtureClass, 'SANITIZED_COMPACT_NAVISWORKS_EVIDENCE');
  assert.match(oracle.sourceSupportReportXml.sanitization.join(' '), /no Support Report production code used/u);

  assert.equal((xml.match(/<clashresult\b/gu) || []).length, 20);
  assert.doesNotMatch(xml, /\bfilepath=/u);
  assert.match(xml, /\/PS-007\.7/u);
  assert.match(xml, /\/SL-097\.12/u);
  assert.match(xml, /\/SL-097\.13/u);
  assert.match(xml, /ASIM-1885-PL-10"-S8810105-HOT-01/u);
});

test('Owner workbook oracle preserves the exact 21 x 10 acceptance shape', async () => {
  const oracle = JSON.parse(await readFile(oracleUrl, 'utf8'));
  assert.equal(oracle.headers.length, 21);
  assert.equal(oracle.rows.length, 10);
  assert.ok(oracle.rows.every((row) => row.length === 21));
  assert.equal(oracle.headers[0], 'SCOPE');
  assert.equal(oracle.headers[7], null);
  assert.equal(oracle.headers[4], 'PIPE SCHEDULE\n');
  assert.equal(oracle.headers[5], 'PIPE INSULATION THICKNESS\n');
  assert.equal(oracle.headers[6], 'PIPE INSULATION TYPE\n');

  const familyCounts = oracle.rows.reduce((counts, row) => {
    const family = String(row[1] || '').replace(/\(REF\)$/u, '');
    counts[family] = (counts[family] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(familyCounts, { 'PS-007': 5, 'SL-097': 5 });
  assert.ok(oracle.rows.every((row) => row[15] === 5));
  assert.deepEqual(oracle.expected.familyCounts, { 'PS-007': 5, 'SL-097': 5 });
});

test('golden membership proves clash XML is evidence, not a complete support register', async () => {
  const [xml, oracle] = await Promise.all([
    readFile(fixtureUrl, 'utf8'),
    readFile(oracleUrl, 'utf8').then(JSON.parse),
  ]);
  const ps10 = oracle.rows.find((row) => row[1] === 'PS-007(REF)' && row[2] === 'ASIM-1885-PL-10"-S8810105-HOT-01');
  const sl10 = oracle.rows.find((row) => row[1] === 'SL-097(REF)' && row[2] === 'ASIM-1885-PL-10"-S8810105-HOT-01');
  const sl2 = oracle.rows.find((row) => row[1] === 'SL-097(REF)' && row[2] === 'ASIM-1885-PL-2"-G8010016-01');

  assert.equal(ps10[7], '/PS-007.6, /PS-007.4, /PS-007.7');
  assert.equal(sl10[7], '/SL-097.11, /SL-097.8, /SL-097.12, /SL-097.13');
  assert.equal(sl2[7], '/SL-097.4, /SL-097.7');
  assert.doesNotMatch(xml, />\/PS-007\.6</u);
  assert.doesNotMatch(xml, />\/PS-007\.4</u);
  assert.doesNotMatch(xml, />\/SL-097\.11</u);
  assert.doesNotMatch(xml, />\/SL-097\.8</u);
  assert.doesNotMatch(xml, />\/SL-097\.4</u);
});
