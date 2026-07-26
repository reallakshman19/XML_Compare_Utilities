import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPipelineGreCaesarFixtureEvidence } from '../tabs/pipeline-3d-model/pipeline-3d-model-gre-caesar-fixture-evidence.js';

export const PIPELINE_GRE_CAESAR_PACKAGE_SCHEMA = 'PipelineGreCaesarEvidencePackage.v1';
export const PIPELINE_GRE_CAESAR_CASES = Object.freeze(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']);

const BASE_FILES = Object.freeze([
  'manifest.json', 'original-export.xml', 'import-result.json', 'warnings-errors.json',
  'operator-log.md', 'sha256-manifest.txt',
]);
const ACCEPTED_FILES = Object.freeze(['re-export.xml', 'semantic-comparison.json']);
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const slash = (value) => value.split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

async function exists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function readJson(target) {
  return JSON.parse(await fs.readFile(target, 'utf8'));
}

async function writeJson(target, value) {
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function sha256File(target) {
  return sha256(await fs.readFile(target));
}

async function listFiles(root, relative = '') {
  const target = path.join(root, relative), entries = await fs.readdir(target, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => compare(a.name, b.name))) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, next));
    else if (entry.isFile()) files.push(slash(next));
  }
  return files;
}

export async function sha256Tree(root) {
  const files = await listFiles(root);
  const lines = [];
  for (const relative of files) lines.push(`${await sha256File(path.join(root, relative))}  ${relative}`);
  return sha256(Buffer.from(lines.length ? `${lines.join('\n')}\n` : '', 'utf8'));
}

async function packageHashes(root) {
  const files = (await listFiles(root)).filter((item) => item !== 'sha256-manifest.txt');
  const entries = [];
  for (const relative of files) entries.push([relative, await sha256File(path.join(root, relative))]);
  return entries;
}

export async function writeSha256Manifest(root) {
  const lines = (await packageHashes(root)).map(([relative, hash]) => `${hash}  ${relative}`);
  await fs.writeFile(path.join(root, 'sha256-manifest.txt'), lines.length ? `${lines.join('\n')}\n` : '', 'utf8');
}

function parseSha256Manifest(value) {
  const entries = new Map();
  for (const line of value.split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match || entries.has(match[2])) return null;
    entries.set(match[2], match[1]);
  }
  return entries;
}

async function verifySha256Manifest(root, diagnostics) {
  const target = path.join(root, 'sha256-manifest.txt');
  if (!await exists(target)) { diagnostics.push('SHA256_MANIFEST_MISSING'); return; }
  const declared = parseSha256Manifest(await fs.readFile(target, 'utf8'));
  if (!declared) { diagnostics.push('SHA256_MANIFEST_INVALID'); return; }
  const actual = new Map(await packageHashes(root));
  for (const [relative, hash] of actual) {
    if (declared.get(relative) !== hash) diagnostics.push(`SHA256_MISMATCH:${relative}`);
  }
  for (const relative of declared.keys()) {
    if (!actual.has(relative)) diagnostics.push(`SHA256_UNKNOWN_PATH:${relative}`);
  }
}

function templateManifest(caseId, sourceCommitSha) {
  return {
    fixtureId: `fixture:${caseId}`, fixtureCaseId: caseId,
    fixturePath: `${caseId}/original-export.xml`, fixtureSha256: '', fixtureGitBlobSha1: '',
    sourceCommitSha, sourceClassification: 'CAESAR_OPERATOR_FIXTURE',
    caesarVersion: '', caesarBuild: '', xmlVersion: '', unitFileId: '', unitFileSha256: '',
    nativeJobSha256: '', importedJobSha256: '', reexportSha256: '', operatorLogSha256: '',
    pipingCodeId: '', pipingCodeName: '', pipingCodeEdition: '', laminateClassification: '',
    elementCount: 0, bendCount: 0, bendRecords: [], continuityRecords: [],
    importEvidence: { status: 'MISSING', warnings: [], errors: [] },
    roundTripEvidence: { status: 'MISSING' }, authorityLevel: 'UNVERIFIED_OPERATOR_INPUT',
    sourceReferences: [],
  };
}

async function createIfMissing(target, content) {
  if (!await exists(target)) await fs.writeFile(target, content, 'utf8');
}

async function scaffoldCase(root, caseId, sourceCommitSha) {
  const directory = path.join(root, caseId);
  await fs.mkdir(path.join(directory, 'native-job'), { recursive: true });
  await fs.mkdir(path.join(directory, 'imported-job'), { recursive: true });
  await fs.mkdir(path.join(directory, 'screenshots'), { recursive: true });
  if (!await exists(path.join(directory, 'manifest.json'))) {
    await writeJson(path.join(directory, 'manifest.json'), templateManifest(caseId, sourceCommitSha));
  }
  await createIfMissing(path.join(directory, 'original-export.xml'), '');
  await createIfMissing(path.join(directory, 'operator-log.md'), `# ${caseId} operator log\n`);
  await createIfMissing(path.join(directory, 'import-result.json'), '{\n  "status": "MISSING"\n}\n');
  await createIfMissing(path.join(directory, 'warnings-errors.json'), '{\n  "warnings": [],\n  "errors": []\n}\n');
  await createIfMissing(path.join(directory, 'semantic-comparison.json'), '{\n  "status": "MISSING"\n}\n');
  await writeSha256Manifest(directory);
}

export async function scaffoldEvidencePackage(root, sourceCommitSha = '') {
  await fs.mkdir(root, { recursive: true });
  for (const caseId of PIPELINE_GRE_CAESAR_CASES) await scaffoldCase(root, caseId, sourceCommitSha);
  return verifyEvidencePackage(root);
}

async function requiredFiles(directory, importResult, diagnostics) {
  for (const relative of BASE_FILES) if (!await exists(path.join(directory, relative))) {
    diagnostics.push(`REQUIRED_FILE_MISSING:${relative}`);
  }
  for (const relative of ['native-job', 'imported-job']) if (!await exists(path.join(directory, relative))) {
    diagnostics.push(`REQUIRED_DIRECTORY_MISSING:${relative}`);
  }
  if (importResult === 'ACCEPTED') for (const relative of ACCEPTED_FILES) {
    if (!await exists(path.join(directory, relative))) diagnostics.push(`REQUIRED_FILE_MISSING:${relative}`);
  }
}

async function verifyArtifactBindings(directory, manifest, diagnostics) {
  const bindings = [
    ['original-export.xml', 'fixtureSha256'], ['operator-log.md', 'operatorLogSha256'],
  ];
  if (manifest.importEvidence?.result === 'ACCEPTED') bindings.push(['re-export.xml', 'reexportSha256']);
  for (const [relative, field] of bindings) {
    const target = path.join(directory, relative);
    if (await exists(target) && await sha256File(target) !== manifest[field]) diagnostics.push(`ARTIFACT_HASH_MISMATCH:${field}`);
  }
  for (const [relative, field] of [['native-job', 'nativeJobSha256'], ['imported-job', 'importedJobSha256']]) {
    const target = path.join(directory, relative);
    if (!await exists(target)) continue;
    const files = await listFiles(target);
    if (!files.length) diagnostics.push(`ARTIFACT_DIRECTORY_EMPTY:${relative}`);
    else if (await sha256Tree(target) !== manifest[field]) diagnostics.push(`ARTIFACT_HASH_MISMATCH:${field}`);
  }
}

async function verifyCompanionJson(directory, manifest, diagnostics) {
  try {
    const imported = await readJson(path.join(directory, 'import-result.json'));
    if (JSON.stringify(imported) !== JSON.stringify(manifest.importEvidence)) diagnostics.push('IMPORT_RESULT_MANIFEST_CONFLICT');
    const ledger = await readJson(path.join(directory, 'warnings-errors.json'));
    const expected = { warnings: manifest.importEvidence?.warnings || [], errors: manifest.importEvidence?.errors || [] };
    if (JSON.stringify(ledger) !== JSON.stringify(expected)) diagnostics.push('WARNING_LEDGER_MANIFEST_CONFLICT');
    if (manifest.importEvidence?.result === 'ACCEPTED') {
      const comparison = await readJson(path.join(directory, 'semantic-comparison.json'));
      if (JSON.stringify(comparison) !== JSON.stringify(manifest.roundTripEvidence?.comparison)) {
        diagnostics.push('SEMANTIC_COMPARISON_MANIFEST_CONFLICT');
      }
    }
  } catch { diagnostics.push('COMPANION_JSON_INVALID'); }
}

async function verifyCase(root, caseId) {
  const directory = path.join(root, caseId);
  if (!await exists(directory)) return { caseId, status: 'MISSING', diagnostics: ['CASE_DIRECTORY_MISSING'] };
  const diagnostics = [];
  let manifest = null, evidence = null;
  try {
    manifest = await readJson(path.join(directory, 'manifest.json'));
    if (manifest.fixtureCaseId !== caseId) diagnostics.push('FIXTURE_CASE_ID_MISMATCH');
    evidence = createPipelineGreCaesarFixtureEvidence(manifest);
    if (evidence.ready !== true) diagnostics.push(...evidence.blockerCodes.map((code) => `V2:${code}`));
  } catch { diagnostics.push('MANIFEST_INVALID'); }
  await requiredFiles(directory, manifest?.importEvidence?.result, diagnostics);
  await verifySha256Manifest(directory, diagnostics);
  if (manifest) {
    await verifyArtifactBindings(directory, manifest, diagnostics);
    await verifyCompanionJson(directory, manifest, diagnostics);
  }
  const unique = [...new Set(diagnostics)].sort(compare);
  return { caseId, fixtureId: manifest?.fixtureId || '', status: unique.length ? 'REJECTED_WITH_REASON' : 'ADMITTED',
    diagnostics: unique, evidenceReady: evidence?.ready === true };
}

export async function verifyEvidencePackage(root) {
  const cases = [];
  for (const caseId of PIPELINE_GRE_CAESAR_CASES) cases.push(await verifyCase(root, caseId));
  const counts = Object.fromEntries(['ADMITTED', 'REJECTED_WITH_REASON', 'MISSING']
    .map((status) => [status, cases.filter((item) => item.status === status).length]));
  return { schema: PIPELINE_GRE_CAESAR_PACKAGE_SCHEMA, packageRoot: path.resolve(root), cases, counts,
    ready: counts.ADMITTED === PIPELINE_GRE_CAESAR_CASES.length };
}

async function runCli() {
  const [command, root = 'pipeline-gre-caesar-evidence', argument = ''] = process.argv.slice(2);
  if (!['scaffold', 'verify'].includes(command)) throw new Error('Usage: scaffold|verify <root> [source-sha|report-path]');
  const report = command === 'scaffold'
    ? await scaffoldEvidencePackage(root, argument)
    : await verifyEvidencePackage(root);
  if (command === 'verify' && argument) await writeJson(argument, report);
  else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (command === 'verify' && !report.ready) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) runCli().catch((error) => {
  process.stderr.write(`${error.message}\n`); process.exitCode = 1;
});
