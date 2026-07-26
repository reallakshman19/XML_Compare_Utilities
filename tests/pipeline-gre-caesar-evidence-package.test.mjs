import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  scaffoldEvidencePackage, sha256File, sha256Tree, verifyEvidencePackage, writeSha256Manifest,
} from '../scripts/pipeline-gre-caesar-evidence-package.mjs';

const BASELINE = 'dcd77e74ec05bf339c210f45b11e027240c87ba0';
const comparison = () => ({ ownershipPreserved: true, connectivityPreserved: true,
  nodeRolesPreserved: true, radiusPreserved: true, fittingThicknessPreserved: true,
  typePreserved: true, numMiterPreserved: true, curvatureNodesPreserved: true,
  numEltPreserved: true, numBendPreserved: true, unitsPreserved: true,
  codeContextPreserved: true, laminatePreserved: true,
  identityMapSha256: crypto.createHash('sha256').update('identity-map').digest('hex') });

async function writeJson(target, value) {
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function materializeFixture(root, caseId, rejected = false) {
  const dir = path.join(root, caseId), build = '14.00.00.0000';
  await fs.writeFile(path.join(dir, 'native-job', 'job.txt'), `${caseId}:native\n`);
  await fs.writeFile(path.join(dir, 'imported-job', 'job.txt'), `${caseId}:imported\n`);
  await fs.writeFile(path.join(dir, 'original-export.xml'), `<PIPINGMODEL id="${caseId}"/>\n`);
  await fs.writeFile(path.join(dir, 'operator-log.md'), `# ${caseId}\noperator evidence\n`);
  if (!rejected) await fs.writeFile(path.join(dir, 're-export.xml'), `<PIPINGMODEL id="${caseId}"/>\n`);
  const operatorLogSha256 = await sha256File(path.join(dir, 'operator-log.md'));
  const importedJobSha256 = await sha256Tree(path.join(dir, 'imported-job'));
  const importEvidence = { status: 'PROVEN', evidenceId: `import:${caseId}`,
    sourceReference: `${caseId}/operator-log.md`, caesarVersion: '14.00', caesarBuild: build,
    operatorLogSha256, importedJobSha256, result: rejected ? 'REJECTED' : 'ACCEPTED',
    cleanImport: !rejected, warnings: [], errors: rejected ? ['CAESAR_REJECTED_TOPOLOGY'] : [] };
  const roundTripEvidence = rejected
    ? { status: 'NOT_APPLICABLE', sourceReference: `${caseId}/operator-log.md` }
    : { status: 'PROVEN', evidenceId: `roundtrip:${caseId}`,
      sourceReference: `${caseId}/operator-log.md`, caesarVersion: '14.00', caesarBuild: build,
      operatorLogSha256, semanticEquivalent: true,
      reexportSha256: await sha256File(path.join(dir, 're-export.xml')), comparison: comparison() };
  const manifest = {
    fixtureId: `fixture:${caseId}`, fixtureCaseId: caseId,
    fixturePath: `${caseId}/original-export.xml`,
    fixtureSha256: await sha256File(path.join(dir, 'original-export.xml')), fixtureGitBlobSha1: '',
    sourceCommitSha: BASELINE, sourceClassification: 'CAESAR_OPERATOR_FIXTURE',
    caesarVersion: '14.00', caesarBuild: build, xmlVersion: '14.00',
    unitFileId: 'units:english', unitFileSha256: 'a'.repeat(64),
    nativeJobSha256: await sha256Tree(path.join(dir, 'native-job')), importedJobSha256,
    reexportSha256: rejected ? '' : roundTripEvidence.reexportSha256, operatorLogSha256,
    pipingCodeId: '36', pipingCodeName: 'ISO 14692', pipingCodeEdition: '2005',
    laminateClassification: 'CSM_AND_MULTI_FILAMENT', elementCount: 2, bendCount: 1,
    bendRecords: [{ bendRecordId: `bend:${caseId}`, ownerElementId: 'E1', ownerFromNode: 100,
      ownerToNode: 110, radius: 300, typeAttributePresent: true, typeValue: 3,
      typeLexicalValue: '3', numMiterAttributePresent: false, curvatureNodes: [] }],
    continuityRecords: [{ continuityRecordId: `continuity:${caseId}`,
      enteringElementId: 'E1', leavingElementId: 'E2', bendOwnerElementId: 'E1',
      enteringFromNode: 100, enteringToNode: 110, leavingFromNode: 120, leavingToNode: 130,
      incomingTangencyNode: 110, outgoingTangencyNode: 120, inactiveCornerNode: 115,
      inactiveCornerSerialized: false, sharedLogicalNode: false,
      observedTopologyMode: 'TANGENCY_SEPARATED_BRIDGE' }],
    importEvidence, roundTripEvidence, authorityLevel: 'CAESAR_IMPORT_AND_ROUND_TRIP',
    sourceReferences: [`${caseId}/operator-log.md`],
  };
  await writeJson(path.join(dir, 'manifest.json'), manifest);
  await writeJson(path.join(dir, 'import-result.json'), importEvidence);
  await writeJson(path.join(dir, 'warnings-errors.json'), {
    warnings: importEvidence.warnings, errors: importEvidence.errors });
  if (!rejected) await writeJson(path.join(dir, 'semantic-comparison.json'), roundTripEvidence.comparison);
  await writeSha256Manifest(dir);
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'p3d-gre-evidence-'));
const scaffold = await scaffoldEvidencePackage(root, BASELINE);
assert.equal(scaffold.cases.length, 7);
assert.equal(scaffold.counts.ADMITTED, 0);
assert.equal(scaffold.counts.REJECTED_WITH_REASON, 7);

const log = path.join(root, 'F1', 'operator-log.md');
await fs.writeFile(log, 'preserve me\n');
await scaffoldEvidencePackage(root, BASELINE);
assert.equal(await fs.readFile(log, 'utf8'), 'preserve me\n');

await materializeFixture(root, 'F1');
let report = await verifyEvidencePackage(root);
assert.equal(report.cases.find((item) => item.caseId === 'F1').status, 'ADMITTED');
assert.deepEqual(report, await verifyEvidencePackage(root));

await fs.appendFile(path.join(root, 'F1', 'original-export.xml'), '<!-- tampered -->\n');
report = await verifyEvidencePackage(root);
const tampered = report.cases.find((item) => item.caseId === 'F1');
assert.equal(tampered.status, 'REJECTED_WITH_REASON');
assert.ok(tampered.diagnostics.some((item) => item.includes('fixtureSha256')));
assert.ok(tampered.diagnostics.some((item) => item.includes('SHA256_MISMATCH')));

await materializeFixture(root, 'F1');
await materializeFixture(root, 'F6', true);
report = await verifyEvidencePackage(root);
assert.equal(report.cases.find((item) => item.caseId === 'F1').status, 'ADMITTED');
assert.equal(report.cases.find((item) => item.caseId === 'F6').status, 'ADMITTED');

await materializeFixture(root, 'F2', true);
report = await verifyEvidencePackage(root);
const unsupported = report.cases.find((item) => item.caseId === 'F2');
assert.equal(unsupported.status, 'REJECTED_WITH_REASON');
assert.ok(unsupported.diagnostics.includes('V2:PIPELINE_GRE_CAESAR_IMPORT_NOT_PROVEN'));
assert.equal(report.ready, false);

console.log('pipeline GRE CAESAR evidence package tooling: PASS');
