// E2c step 4 (Owner 20 Nov 2026, "Yes, build it"): UXML stage files. A file rebuilds to the revision it names; one
// edited by hand, cut short, or holding settings its stage leaves out is refused; inputs that differ are named.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {clone, sha256Hex} from '../uxml/v2/UxmlV2Kernel.js';
import {step10Document} from '../uxml/v2/topology/GasketDropStage.js';
import {EMPTY_SETTINGS_SHA256, inputsDiffer, makeStageFile, readStageFile, runRecordDiffers, settingsSha256, stageFileName,
  STAGE_FILE_MESSAGES} from '../uxml/v2/UxmlV2StageFile.js';

const RMS = fs.readFileSync(fileURLToPath(new URL('../fixtures/uxml-v2-supports/bench/RMS-BLOW-1.xml', import.meta.url)), 'utf8');
const out = step10Document(RMS);
const inputs = (extra = {}) => ({sourceXml: sha256Hex(RMS), stagedJson: null, config: settingsSha256({a: 1}),
  previewEdits: EMPTY_SETTINGS_SHA256, weightChoices: EMPTY_SETTINGS_SHA256, runConfig: 'r', ...extra});
const fileOf = (stage, extra = {}, deltas = [out.delta]) => JSON.parse(JSON.stringify(makeStageFile({stage, model: 'RMS-BLOW-1.xml',
  createdAt: 't', inputs: inputs(extra), base: out.source, deltas})));
const refused = (fn, code) => assert.throws(fn, e => e.code === code, code);

test('a stage file rebuilds to its revision: S0 is the read, S1 adds the gasket drop (40 nodes on RMS-BLOW-1)', () => {
  const s0 = readStageFile(fileOf('S0', {}, []));
  assert.equal(s0.revisions.length, 1);
  assert.equal(s0.revisions[0].doc.revision.stage, 'read-psi116');
  const s1 = readStageFile(fileOf('S1'));
  assert.equal(s1.revisions.length, 2);
  assert.equal(s1.revisions[1].doc.revision.id, out.result.revision.id);
  assert.equal(s1.revisions[1].delta.ops.filter(o => o.op === 'remove').length, 40);
  assert.equal(stageFileName('RMS-BLOW-1.xml', 'S1'), 'RMS-BLOW-1.S1.uxml.json');
});

test('wrong modes: edited by hand, cut short, another source, or an S2 holding a weight choice is refused', () => {
  const edited = fileOf('S1');
  edited.deltas[0].ops[0].before.values.NodeName = {v: 'X', text: 'X', src: 'psi116'};
  assert.throws(() => readStageFile(edited));
  const base = fileOf('S1');
  base.base.pipelines[0].components[0].values.NodeNumber.text = '99999';
  refused(() => readStageFile(base), 'UXML_HASH_MISMATCH');
  const short = fileOf('S1');
  short.deltas = [];
  refused(() => readStageFile(short), 'UXML_STAGE_FILE_RESULT_MISMATCH');
  refused(() => readStageFile(fileOf('S1', {sourceXml: sha256Hex('other')})), 'UXML_STAGE_FILE_NOT_A_READ');
  refused(() => readStageFile(fileOf('S2', {weightChoices: settingsSha256({'k': 10})})), 'UXML_STAGE_SETTINGS_NOT_LEFT_OUT');
  refused(() => readStageFile(fileOf('S3', {weightChoices: settingsSha256({'k': 10})})), 'UXML_STAGE_SETTINGS_NOT_LEFT_OUT');
  refused(() => readStageFile(fileOf('S2', {previewEdits: settingsSha256({rating: {L1: '300'}})})), 'UXML_STAGE_SETTINGS_NOT_LEFT_OUT');
  readStageFile(fileOf('S4', {previewEdits: settingsSha256({rating: {L1: '300'}}), weightChoices: settingsSha256({'k': 10})}));
  refused(() => readStageFile({...fileOf('S1'), format: 'x'}), 'UXML_STAGE_FILE_FORMAT');
  for (const code of Object.keys(STAGE_FILE_MESSAGES)) assert.ok(STAGE_FILE_MESSAGES[code]);
});

test('inputs two stage files, or a stage file and a Run record, do not share are named', () => {
  const s2 = fileOf('S2'), s3 = fileOf('S3', {previewEdits: settingsSha256({rating: {L1: '300'}})});
  assert.deepEqual(inputsDiffer(s2, s3), [], 'S2 and S3 differ only by the Preview edits S2 leaves out');
  assert.deepEqual(inputsDiffer(s3, fileOf('S3')), ['previewEdits']);
  assert.deepEqual(inputsDiffer(s2, fileOf('S3', {config: settingsSha256({a: 2})})), ['config']);
  assert.deepEqual(inputsDiffer(fileOf('S1'), fileOf('S4', {stagedJson: 'j', weightChoices: 'w'})), [], 'S1 holds no staged JSON or choices');
  assert.deepEqual(inputsDiffer(fileOf('S4', {weightChoices: 'w1'}), fileOf('S4', {weightChoices: 'w2'})), ['weightChoices']);
  const record = {hashes: {sourceXml: sha256Hex(RMS), stagedJson: null, supportConfig: 'r'}};
  assert.deepEqual(runRecordDiffers(fileOf('S4'), record), []);
  assert.deepEqual(runRecordDiffers(fileOf('S4', {runConfig: 'other'}), record), ['settings']);
  assert.deepEqual(runRecordDiffers(fileOf('S2', {runConfig: 'other'}), record), [], 'S2 runs with fewer settings by design');
  assert.deepEqual(runRecordDiffers(fileOf('S2'), {hashes: {...record.hashes, stagedJson: 'j'}}), ['stagedJson']);
  assert.deepEqual(runRecordDiffers(fileOf('S1'), {hashes: {...record.hashes, sourceXml: 'x'}}), ['sourceXml']);
});

test('a refused stage file says why and holds no chain', () => {
  const file = makeStageFile({stage: 'S2', model: 'm.xml', createdAt: 't', inputs: inputs(), refusal: 'PSI116_NAMESPACE_MISSING', base: clone(out.source)});
  assert.equal(file.base, null);
  const opened = readStageFile(JSON.parse(JSON.stringify(file)));
  assert.equal(opened.refusal, 'PSI116_NAMESPACE_MISSING');
  assert.deepEqual(opened.revisions, []);
});
