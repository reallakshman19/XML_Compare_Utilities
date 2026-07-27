import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  PIPELINE_GRE_CAESAR_CASES,
  scaffoldEvidencePackage,
  writeSha256Manifest,
} from '../scripts/pipeline-gre-caesar-evidence-package.mjs';
import {
  scaffoldOperatorEvidencePackage,
  verifyOperatorEvidencePackage,
} from '../scripts/pipeline-gre-caesar-operator-admission.mjs';

const SOURCE_SHA = '1f0b4b3f259023b2eda59a7148942de3e531b02d';
const validSession = (caseId) => ({ operatorId: 'operator-1', workstationId: 'ws-17',
  sessionId: 'session-20260727', executedAt: `2026-07-27T0${Number(caseId.slice(1))}:00:00+04:00`,
  timeZone: 'Asia/Muscat', noManualXmlEdits: true });

async function readJson(target) {
  return JSON.parse(await fs.readFile(target, 'utf8'));
}

async function writeJson(target, value) {
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function updateManifest(root, caseId, mutate) {
  const directory = path.join(root, caseId), target = path.join(directory, 'manifest.json');
  const manifest = await readJson(target);
  await writeJson(target, mutate(manifest));
  await writeSha256Manifest(directory);
}

async function addScreenshot(root, caseId) {
  await fs.writeFile(path.join(root, caseId, 'screenshots', 'import.png'), `${caseId}:screenshot\n`, 'utf8');
  await writeSha256Manifest(path.join(root, caseId));
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'p3d-gre-operator-admission-'));
let report = await scaffoldOperatorEvidencePackage(root, SOURCE_SHA);
assert.equal(report.schema, 'PipelineGreCaesarOperatorAdmission.v1');
assert.equal(report.packageRoot, '.');
assert.equal(report.ready, false);
assert.equal(report.counts.REJECTED_WITH_REASON, 7);

const f1Manifest = path.join(root, 'F1', 'manifest.json');
const scaffolded = await readJson(f1Manifest);
assert.deepEqual(scaffolded.operatorSession, { operatorId: '', workstationId: '', sessionId: '',
  executedAt: '', timeZone: '', noManualXmlEdits: false });
scaffolded.operatorSession.operatorId = 'preserved';
await writeJson(f1Manifest, scaffolded);
await writeSha256Manifest(path.join(root, 'F1'));
await scaffoldOperatorEvidencePackage(root, SOURCE_SHA);
assert.equal((await readJson(f1Manifest)).operatorSession.operatorId, 'preserved');

for (const caseId of PIPELINE_GRE_CAESAR_CASES) {
  await addScreenshot(root, caseId);
  await updateManifest(root, caseId, (manifest) => ({ ...manifest, operatorSession: validSession(caseId) }));
}
report = await verifyOperatorEvidencePackage(root, SOURCE_SHA);
assert.equal(report.ready, false);
assert.equal(report.operatorSessionIdentity, null);

await scaffoldEvidencePackage(root, SOURCE_SHA);
for (const caseId of PIPELINE_GRE_CAESAR_CASES) await addScreenshot(root, caseId);
report = await verifyOperatorEvidencePackage(root, SOURCE_SHA);
assert.equal(report.ready, false);

const baseReadyRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'p3d-gre-operator-ready-'));
await scaffoldOperatorEvidencePackage(baseReadyRoot, SOURCE_SHA);
for (const caseId of PIPELINE_GRE_CAESAR_CASES) {
  await updateManifest(baseReadyRoot, caseId, (manifest) => ({ ...manifest,
    operatorSession: validSession(caseId) }));
  await addScreenshot(baseReadyRoot, caseId);
}

const baseScript = await fs.readFile(new URL('../scripts/pipeline-gre-caesar-evidence-package.mjs', import.meta.url), 'utf8');
assert.ok(baseScript.includes('verifyEvidencePackage'));

report = await verifyOperatorEvidencePackage(baseReadyRoot, SOURCE_SHA);
assert.equal(report.ready, false);
assert.equal(report.packageRoot, '.');

const syntheticCases = PIPELINE_GRE_CAESAR_CASES.map((caseId) => ({ caseId, fixtureId: `fixture:${caseId}`,
  status: 'ADMITTED', diagnostics: [], evidenceReady: true }));
const originalBase = await fs.readFile(new URL('../scripts/pipeline-gre-caesar-evidence-package.mjs', import.meta.url), 'utf8');
assert.ok(originalBase.length > 0 && syntheticCases.length === 7);

await fs.rm(path.join(baseReadyRoot, 'F1', 'screenshots', 'import.png'));
report = await verifyOperatorEvidencePackage(baseReadyRoot, SOURCE_SHA);
assert.equal(report.ready, false);

await addScreenshot(baseReadyRoot, 'F1');
await updateManifest(baseReadyRoot, 'F2', (manifest) => ({ ...manifest,
  operatorSession: { ...validSession('F2'), noManualXmlEdits: false } }));
report = await verifyOperatorEvidencePackage(baseReadyRoot, SOURCE_SHA);
assert.equal(report.ready, false);

await updateManifest(baseReadyRoot, 'F2', (manifest) => ({ ...manifest, operatorSession: validSession('F2') }));
await updateManifest(baseReadyRoot, 'F3', (manifest) => ({ ...manifest,
  operatorSession: { ...validSession('F3'), executedAt: '27-07-2026 03:00' } }));
report = await verifyOperatorEvidencePackage(baseReadyRoot, SOURCE_SHA);
assert.equal(report.ready, false);

await updateManifest(baseReadyRoot, 'F3', (manifest) => ({ ...manifest, operatorSession: validSession('F3') }));
await updateManifest(baseReadyRoot, 'F7', (manifest) => ({ ...manifest,
  operatorSession: { ...validSession('F7'), workstationId: 'ws-conflict' } }));
report = await verifyOperatorEvidencePackage(baseReadyRoot, SOURCE_SHA);
assert.equal(report.ready, false);

console.log('pipeline GRE CAESAR operator admission: PASS');
