const WORKER_URL = new URL('../../converters/cii-v11-v14-writer-worker.js?v=20260825-frozen-3d-converters-2', import.meta.url);
let worker = null;
let sequence = 0;
const pending = new Map();

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
    const error = new Error(event?.message || 'CAESAR v11/v14 worker failed.');
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
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

function runWorker(payload) {
  const active = ensureWorker();
  const jobId = `cii-writer-v11-v14-${Date.now()}-${++sequence}`;
  return new Promise((resolve, reject) => {
    pending.set(jobId, { resolve, reject });
    active.postMessage({ type: 'run', jobId, ...payload });
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

export async function convertCiiNeutralVersion(value, targetVersion, options = {}) {
  const target = Number(targetVersion);
  if (target !== 11 && target !== 14) throw new Error(`CII_VERSION_BRIDGE_TARGET_UNSUPPORTED:${targetVersion}`);
  const bytes = inputBytes(value);
  const expectedSource = detectCiiNeutralVersion(bytes);
  const response = await runWorker({
    inputName: String(options.fileName || 'model.cii'),
    inputBytes: bytes,
    targetVersion: String(target),
    allowLossy: options.allowLossy === true,
  });
  const audit = response.audit || JSON.parse(response.auditText || '{}');
  const outputBytes = new Uint8Array(response.outputBytes);
  if (Number(audit.source_version) !== expectedSource) throw new Error('CII_VERSION_BRIDGE_SOURCE_AUDIT_MISMATCH');
  if (Number(audit.target_version) !== target) throw new Error('CII_VERSION_BRIDGE_TARGET_AUDIT_MISMATCH');
  const physicalTarget = detectCiiNeutralVersion(outputBytes);
  if (physicalTarget !== target) throw new Error('CII_VERSION_BRIDGE_TARGET_PHYSICAL_VERSION_MISMATCH');
  return Object.freeze({
    schema: 'CIIWorkspaceVersionConversion.v1',
    sourceVersion: Number(audit.source_version),
    targetVersion: Number(audit.target_version),
    outputBytes,
    audit: Object.freeze(audit),
    stdout: Object.freeze([...(response.stdout || [])]),
    stderr: Object.freeze([...(response.stderr || [])]),
  });
}

export async function convertCiiNeutralVersionLossless(value, targetVersion, options = {}) {
  const result = await convertCiiNeutralVersion(value, targetVersion, { ...options, allowLossy: false });
  const losses = Array.isArray(result.audit?.loss_events) ? result.audit.loss_events : [];
  if (losses.length) throw new Error(`CII_VERSION_BRIDGE_LOSS_NOT_ALLOWED:${losses.length}`);
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
