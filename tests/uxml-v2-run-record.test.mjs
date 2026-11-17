// Run records (Owner 17 Nov 2026): the file 3D_Converters step 10 downloads opens in review page section 4 and shows
// exactly the rows the supports stage gives on the same inputs. Fixture: a GOLDEN-30 Run on the UXML route
// (3D_Converters branch feat/uxml-run-record-20261117), recorded in Node.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {asStageResult, readRunRecordFile, runRecordXmlMatch, transferKeptRows} from '../uxml/v2/UxmlV2RunRecord.js';
import {runSupportsStage} from '../uxml/v2/supports/SupportsStage.js';
import {provenanceTableRows} from '../uxml/v2/supports/SupportProvenanceRows.js';
import {engineeringTableRows} from '../uxml/v2/engineering/EngineeringProvenanceRows.js';

const read = f => fs.readFileSync(new URL(`../fixtures/${f}`, import.meta.url), 'utf8');
const FILE = read('uxml-v2-run-record/G30_uxml-run-record.json');
const XML = read('uxml-v2-supports/oracle/G30/xml/engineering-pass-start.xml');

test('a Run record opens and shows the rows the stage gives on the same inputs', () => {
  const [record] = readRunRecordFile(FILE);
  assert.equal(record.model, 'G30.xml');
  const fresh = runSupportsStage({xmlText: XML, stagedJsonText: read('uxml-v2-supports/bench/golden-30_staged.json'),
    supportConfig: JSON.parse(read('uxml-v2-supports/bench/golden-30-job-config.json')),
    masters: {materialMapRows: JSON.parse(read('uxml-v2-supports/bench/default-material-map-rows.json'))}});
  assert.equal(fresh.xmlText, record.ciiInputXml);
  const shown = asStageResult(record);
  assert.deepEqual(provenanceTableRows(shown), provenanceTableRows(fresh));
  assert.deepEqual(engineeringTableRows(shown), engineeringTableRows(fresh));
  assert.equal(provenanceTableRows(shown).length, 150);
  assert.deepEqual(transferKeptRows(record), []);
});

test('the page tells which file an XML is, and refuses a changed or foreign record', () => {
  const [record] = readRunRecordFile(FILE);
  assert.equal(runRecordXmlMatch(record, read('uxml-v2/golden-30.xml')), 'source');
  assert.equal(runRecordXmlMatch(record, record.ciiInputXml), 'cii-input');
  assert.equal(runRecordXmlMatch(record, XML.replace('<Branch>', '<Branch> ')), null);
  const file = JSON.parse(FILE);
  file.records[0].ciiInputXml = file.records[0].ciiInputXml.replace('</Node>', ' </Node>');
  assert.throws(() => readRunRecordFile(JSON.stringify(file)), /changed after the Run/);
  assert.throws(() => readRunRecordFile('{"format":"other"}'), /not a Run record/);
  assert.throws(() => readRunRecordFile('nope'), /not valid JSON/);
});
