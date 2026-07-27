/** Backward-compatible workspace package v2 carrying accepted-command authority. */
import { immutableJson } from '../../../contracts/contract-values.js';
import {
  SEQUENTIAL_WORKSPACE_PACKAGE_SCHEMA,
  createSequentialWorkspacePackage,
  restoreSequentialWorkspacePackage,
  sequentialWorkspacePackageFingerprint,
} from './sequential-workspace-package.js';
import {
  SEQUENTIAL_WORKSPACE_COMMAND_AUTHORITY_READER_REVISION,
  createSequentialWorkspaceCommandAuthority,
  restoreSequentialWorkspaceCommandAuthority,
} from './sequential-workspace-command-authority.js';

export const SEQUENTIAL_WORKSPACE_PACKAGE_V2_SCHEMA = 'SequentialWorkspacePackage.v2';
export const SEQUENTIAL_WORKSPACE_RESTORATION_V2_SCHEMA = 'SequentialWorkspaceRestoration.v2';
export const SEQUENTIAL_WORKSPACE_PACKAGE_V2_REVISION = 2;
export const SEQUENTIAL_WORKSPACE_PACKAGE_V2_READER_REVISION = 2;

function fail(code, detail = '') {
  throw new Error(`${code}${detail ? `: ${detail}` : ''}`);
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function parsedPackage(input) {
  if (typeof input !== 'string') return cloneJson(input);
  try { return JSON.parse(input); }
  catch (error) { fail('WORKSPACE_PACKAGE_V2_JSON_INVALID', error.message); }
}

function v1Payload(value) {
  const {
    commandAuthority: ignoredAuthority,
    minimumReaderRevision: ignoredReader,
    packageFingerprint: ignoredFingerprint,
    ...payload
  } = value;
  void ignoredAuthority;
  void ignoredReader;
  void ignoredFingerprint;
  const legacy = { ...payload, schema: SEQUENTIAL_WORKSPACE_PACKAGE_SCHEMA, revision: 1 };
  return { ...legacy, packageFingerprint: sequentialWorkspacePackageFingerprint(legacy) };
}

export function createSequentialWorkspacePackageV2(options = {}) {
  const base = createSequentialWorkspacePackage(options);
  const commandAuthority = createSequentialWorkspaceCommandAuthority({
    journalState: options.journalState,
    sourceFingerprint: base.source.sourceFingerprint,
    branchRegistry: options.branchRegistry,
  });
  const { packageFingerprint: ignored, ...basePayload } = cloneJson(base);
  void ignored;
  const payload = {
    ...basePayload,
    schema: SEQUENTIAL_WORKSPACE_PACKAGE_V2_SCHEMA,
    revision: SEQUENTIAL_WORKSPACE_PACKAGE_V2_REVISION,
    minimumReaderRevision: SEQUENTIAL_WORKSPACE_PACKAGE_V2_READER_REVISION,
    commandAuthority,
  };
  return immutableJson({
    ...payload,
    packageFingerprint: sequentialWorkspacePackageFingerprint(payload),
  }, 'Sequential workspace package v2');
}

export function serializeSequentialWorkspacePackageV2(options = {}) {
  return JSON.stringify(createSequentialWorkspacePackageV2(options), null, 2);
}

export function restoreSequentialWorkspacePackageV2(input) {
  const value = parsedPackage(input);
  if (!value || typeof value !== 'object') fail('WORKSPACE_PACKAGE_V2_INVALID');
  if (value.schema !== SEQUENTIAL_WORKSPACE_PACKAGE_V2_SCHEMA
    || value.revision !== SEQUENTIAL_WORKSPACE_PACKAGE_V2_REVISION) {
    fail('WORKSPACE_PACKAGE_V2_SCHEMA_INVALID');
  }
  if (!Number.isSafeInteger(value.minimumReaderRevision) || value.minimumReaderRevision < 1) {
    fail('WORKSPACE_PACKAGE_V2_READER_INVALID');
  }
  if (value.minimumReaderRevision > SEQUENTIAL_WORKSPACE_PACKAGE_V2_READER_REVISION) {
    fail('WORKSPACE_PACKAGE_V2_READER_UNSUPPORTED');
  }
  const expected = sequentialWorkspacePackageFingerprint(value);
  if (value.packageFingerprint !== expected) fail('WORKSPACE_PACKAGE_V2_FINGERPRINT_MISMATCH');
  const restoration = restoreSequentialWorkspacePackage(v1Payload(value));
  const commandAuthority = restoreSequentialWorkspaceCommandAuthority(value.commandAuthority, restoration);
  if (commandAuthority.readerRevision !== SEQUENTIAL_WORKSPACE_COMMAND_AUTHORITY_READER_REVISION) {
    fail('WORKSPACE_PACKAGE_V2_COMMAND_AUTHORITY_REVISION_INVALID');
  }
  return Object.freeze({
    ...restoration,
    schema: SEQUENTIAL_WORKSPACE_RESTORATION_V2_SCHEMA,
    packageSchema: value.schema,
    packageRevision: value.revision,
    minimumReaderRevision: value.minimumReaderRevision,
    commandAuthority,
    journalState: commandAuthority.journalState,
  });
}
