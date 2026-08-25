const WORKER_URL = new URL('../../converters/cii-v11-v14-writer-worker.js?v=20260825-frozen-3d-converters-6', import.meta.url);
const AUDIT_SCHEMA = 'cii-v11-v14-conversion-audit/v1';
let worker = null;
let sequence = 0;
const pending = new Map();

function rejectAll(error) {
  for (const entry of pending.values()) entry.reject(error);
  pending.clear();
}

function resetWorker(error) {
  rejectAll(error);
  worker?.terminate();
  worker = null;
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(WORKER_URL, { type: 'module' });
  worker.addEventListener('message', (event) => {
    const message = event.data || {};
    if (message.type !== 'result') return;
    const entry = pending.get(message.jobId);
    if (!entry) return;
    pending.delete(message.jobId);
    if (message.ok) entry.resolve(message);
    else entry.reject(new Error(message.error || 'CAESAR v11/v14 conversion failed.'));
  });
  worker.addEventListener('error', (event) => {
    resetWorker(new Error(event?.message || 'CAESAR v11/v14 worker failed.'));
  });
  worker.addEventListener('messageerror', () => {
    resetWorker(new Error('CAESAR v11/v14 worker message serialization failed.'));
  });
  return worker;
}

function inputBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  throw new Error('CII_VERSION_BRIDGE_BYTES_REQUIRED');
}

function frozenAuditSnapshot(value) {
  if (!value || typeof value !== 'object') throw new Error('CII_VERSION_BRIDGE_AUDIT_REQUIRED');
  if (value.schema !== AUDIT_SCHEMA) throw new Error(`CII_VERSION_BRIDGE_AUDIT_SCHEMA_MISMATCH:${value.schema || 'EMPTY'}`);
  for (const key of ['changed_sections', 'warnings', 'loss_events']) {
    if (!Array.isArray(value[key])) throw new Error(`CII_VERSION_BRIDGE_AUDIT_ARRAY_REQUIRED:${key}`);
  }
  return Object.freeze({
    ...value,
    changed_sections: Object.freeze([...value.changed_sections]),
    warnings: Object.freeze([...value.warnings]),
    loss_events: Object.freeze([...value.loss_events]),
  });
}

export function ciiByteStringToBytes(value) {
  const raw = String(value ?? '');
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    if (code > 0xff) throw new Error(`CII_VERSION_BRIDGE_BYTE_STRING_INVALID:${index}`);
    bytes[index] = code;
  }
  return bytes;
}

function runWorker(payload) {
  const active = ensureWorker();
  const jobId = `cii-writer-v11-v14-${Date.now()}-${++sequence}`;
  return new Promise((resolve, reject) => {
    pending.set(jobId, { resolve, reject });
    try {
      active.postMessage({ type: 'run', jobId, ...payload });
    } catch (error) {
      pending.delete(jobId);
      reject(new Error(`Failed to post CAESAR v11/v14 conversion job: ${error?.message || error}`));
    }
  });
}

export function detectCiiNeutralVersion(value) {
  const text = new TextDecoder('utf-8').decode(inputBytes(value));
  const rows = text.split(/\r?\n/);
  const marker = rows.findIndex((row) => /^\s*#\$\s*VERSION\s*$/i.test(row));
  if (marker < 0) throw new Error('CII_VERSION_BRIDGE_VERSION_SECTION_REQUIRED');
  for (let index = marker + 1; index < rows.length; index += 1) {
    if (/^\s*#\$/.test(rows[index])) break;
    const tokens = rows[index].trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    if (tokens.length < 2) throw new Error('CII_VERSION_BRIDGE_VERSION_RECORD_INVALID');
    const numeric = Number(tokens[1]);
    if (!Number.isFinite(numeric)) throw new Error('CII_VERSION_BRIDGE_VERSION_RECORD_INVALID');
    const major = Math.round(numeric);
    if ((major !== 11 && major !== 14) || Math.abs(numeric - major) > 1e-6) {
      throw new Error(`CII_VERSION_BRIDGE_UNSUPPORTED_VERSION:${tokens[1]}`);
    }
    return major;
  }
  throw new Error('CII_VERSION_BRIDGE_VERSION_RECORD_REQUIRED');
}

export async function ciiSha256(value, cryptoRef = globalThis.crypto) {
  const bytes = inputBytes(value);
  if (!cryptoRef?.subtle) throw new Error('CII_VERSION_BRIDGE_SHA256_UNAVAILABLE');
  const digest = await cryptoRef.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

export async function convertCiiNeutralVersion(value, targetVersion, options = {}) {
  const target = Number(targetVersion);
  if (target !== 11 && target !== 14) throw new Error(`CII_VERSION_BRIDGE_TARGET_UNSUPPORTED:${targetVersion}`);
  const bytes = inputBytes(value);
  const expectedSource = detectCiiNeutralVersion(bytes);
  const sourceSha256 = await ciiSha256(bytes, options.cryptoRef);
  const response = await runWorker({
    inputName: String(options.fileName || 'model.cii'),
    inputBytes: bytes,
    targetVersion: String(target),
    allowLossy: options.allowLossy === true,
  });
  const audit = frozenAuditSnapshot(response.audit || JSON.parse(response.auditText || '{}'));
  const outputBytes = new Uint8Array(response.outputBytes);
  if (Number(audit.source_version) !== expectedSource) throw new Error('CII_VERSION_BRIDGE_SOURCE_AUDIT_MISMATCH');
  if (Number(audit.target_version) !== target) throw new Error('CII_VERSION_BRIDGE_TARGET_AUDIT_MISMATCH');
  if (Number(audit.source_bytes) !== bytes.byteLength) throw new Error('CII_VERSION_BRIDGE_SOURCE_BYTE_COUNT_AUDIT_MISMATCH');
  if (Number(audit.target_bytes) !== outputBytes.byteLength) throw new Error('CII_VERSION_BRIDGE_TARGET_BYTE_COUNT_AUDIT_MISMATCH');
  const physicalTarget = detectCiiNeutralVersion(outputBytes);
  if (physicalTarget !== target) throw new Error('CII_VERSION_BRIDGE_TARGET_PHYSICAL_VERSION_MISMATCH');
  const targetSha256 = await ciiSha256(outputBytes, options.cryptoRef);
  if (String(audit.source_sha256 || '').toLowerCase() !== sourceSha256) throw new Error('CII_VERSION_BRIDGE_SOURCE_SHA256_AUDIT_MISMATCH');
  if (String(audit.target_sha256 || '').toLowerCase() !== targetSha256) throw new Error('CII_VERSION_BRIDGE_TARGET_SHA256_AUDIT_MISMATCH');
  return Object.freeze({
    schema: 'CIIWorkspaceVersionConversion.v1',
    sourceVersion: Number(audit.source_version),
    targetVersion: Number(audit.target_version),
    sourceSha256,
    targetSha256,
    outputBytes,
    audit,
    stdout: Object.freeze([...(response.stdout || [])]),
    stderr: Object.freeze([...(response.stderr || [])]),
  });
}

export async function convertCiiNeutralVersionLossless(value, targetVersion, options = {}) {
  const result = await convertCiiNeutralVersion(value, targetVersion, { ...options, allowLossy: false });
  if (result.audit.loss_events.length) throw new Error(`CII_VERSION_BRIDGE_LOSS_NOT_ALLOWED:${result.audit.loss_events.length}`);
  return result;
}

export function ciiBytesEqual(left, right) {
  const a = inputBytes(left); const b = inputBytes(right);
  if (a.byteLength !== b.byteLength) return false;
  for (let index = 0; index < a.byteLength; index += 1) if (a[index] !== b[index]) return false;
  return true;
}

export function ciiBytesToByteString(value) {
  const bytes = inputBytes(value);
  let result = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    result += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunk, bytes.length)));
  }
  return result;
}
