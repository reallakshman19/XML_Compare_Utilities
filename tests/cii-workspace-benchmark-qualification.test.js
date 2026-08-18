import assert from 'assert';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { intakeCiiWorkspaceDocument } from '../tabs/cii-workspace/cii-workspace-intake.js';

async function text(relative) { return readFile(new URL(relative, import.meta.url), 'utf8'); }
function sorted(values) { return [...new Set((values || []).map(Number))].sort((a, b) => a - b); }
function restraint(document, node) { return document.auxiliaryEvidence?.restraints?.byNode?.[String(node)] || []; }
function sifAtNode(document, node) {
  return Object.values(document.auxiliaryEvidence?.sifTee?.byPointer || {}).find((record) => record.node === String(node)) || null;
}
function elementAux(document, from, to) {
  const element = (document.parsed?.elements || []).find((item) => String(item.from) === String(from) && String(item.to) === String(to));
  assert(element, `Expected element ${from}->${to}`);
  const auxiliary = document.auxiliaryEvidence?.elements?.[Number(element.index)];
  assert(auxiliary, `Expected auxiliary descriptor for ${from}->${to}`);
  return auxiliary;
}

const [sourceText, target1Text, target2Text, oracleText] = await Promise.all([
  text('../Benchmark/CIICompare/BM_CII_SOURCE.CII'),
  text('../Benchmark/CIICompare/BM_CII_TARGET1.CII'),
  text('../Benchmark/CIICompare/BM_CII_TARGET2.CII'),
  text('../Benchmark/CIICompare/CII_COMPARE_EXPECTED.json'),
]);
const oracle = JSON.parse(oracleText);
const source = await intakeCiiWorkspaceDocument(sourceText, 'BM_CII_SOURCE.CII', { side: 'SOURCE', cryptoRef: webcrypto });
const target1 = await intakeCiiWorkspaceDocument(target1Text, 'BM_CII_TARGET1.CII', { side: 'TARGET', cryptoRef: webcrypto });
const target2 = await intakeCiiWorkspaceDocument(target2Text, 'BM_CII_TARGET2.CII', { side: 'TARGET', cryptoRef: webcrypto });

for (const document of [source, target1, target2]) {
  assert.strictEqual(document.auxiliaryEvidence.conflicts.length, 0, `${document.fileName}: auxiliary custody must be conflict-free`);
  assert.strictEqual(document.auxiliaryEvidence.mappedElementCount, document.summary.elementCount);
  assert.strictEqual(document.capabilities.families.restraints.details.gapFrictionQualified, true);
  assert.strictEqual(document.capabilities.families.rigidMass.qualification, 'QUALIFIED');
  assert.strictEqual(document.capabilities.families.sifTee.qualification, 'PARTIAL');
  assert.strictEqual(document.capabilities.families.hangers.state, 'NOT_PARSED', 'hanger semantics remain unresolved in this qualification phase');
}

const source130 = restraint(source, 130); const target1_130 = restraint(target1, 20130); const target2_130 = restraint(target2, 10130);
assert.deepStrictEqual(sorted(source130.map((record) => record.typeCode)), [15]);
assert.deepStrictEqual(sorted(target1_130.map((record) => record.typeCode)), [9]);
assert.deepStrictEqual(sorted(target2_130.map((record) => record.typeCode)), [9]);
assert.deepStrictEqual(sorted(source130.map((record) => record.friction)), [0]);
assert.deepStrictEqual(sorted(target1_130.map((record) => record.friction)), [0.3]);
assert.deepStrictEqual(sorted(target2_130.map((record) => record.friction)), [0]);

assert.strictEqual(sifAtNode(source, 70)?.rawCode, 3);
assert.strictEqual(sifAtNode(target1, 20070)?.rawCode, 5);
assert.strictEqual(sifAtNode(target2, 10070)?.rawCode, 5);

const sourceRigid = elementAux(source, 113, 116); const target1Rigid = elementAux(target1, 20113, 20116); const target2Rigid = elementAux(target2, 10113, 10116);
assert.strictEqual(sourceRigid.pointers.rigid, 9);
assert.strictEqual(target1Rigid.pointers.rigid, 11);
assert.strictEqual(target2Rigid.pointers.rigid, 11);
assert.strictEqual(sourceRigid.rigidRecord?.weight, 111.2);
assert.strictEqual(target1Rigid.rigidRecord?.weight, 111.2);
assert.strictEqual(target2Rigid.rigidRecord?.weight, 111.2);

const weightNote = oracle.quarantinedExpectations.find((item) => item.id === 'NOTE-113-116-WEIGHT');
assert(weightNote && weightNote.status === 'QUARANTINED');
assert(oracle.propertyExpectations.some((item) => item.id === 'RESTRAINT-130-TARGET1'));
assert(oracle.propertyExpectations.some((item) => item.id === 'SIF-TEE-70-TARGET2'));
assert.strictEqual(oracle.oracleRules.deriveTargetsFromOffset, false);

console.log('CII real-file auxiliary benchmark qualification checks passed.');
