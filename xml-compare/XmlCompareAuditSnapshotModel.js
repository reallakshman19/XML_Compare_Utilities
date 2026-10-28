import { sha256Utf8 } from './XmlCompareSha256.js';

// Reproducible, immutable in-memory audit snapshots. Digest contract is
// SHA-256 of UTF-8 *loaded XML text*, not a claim about original binary bytes.
export const XML_COMPARE_AUDIT_SNAPSHOT_SCHEMA = 'xml-compare-audit-snapshot/v1';
export const XML_COMPARE_DATASET_SNAPSHOT_SCHEMA = 'xml-compare-dataset-snapshot/v1';
export const XML_COMPARE_COMPARISON_SNAPSHOT_SCHEMA = 'xml-compare-comparison-snapshot/v1';

export function stableAuditJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableAuditJson).join(',') + ']';
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(k =>
      JSON.stringify(k) + ':' + stableAuditJson(value[k])).join(',') + '}';
  }
  throw new TypeError('Snapshot configuration must contain only finite JSON values.');
}

export function deepFreezeAudit(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreezeAudit(item, seen);
  return Object.freeze(value);
}

export function createDatasetSnapshot({
  text = '', sourceRole = '', sourceName = '', parserVersion = 'categorized-xml/v1',
} = {}) {
  const rawText = String(text), role = String(sourceRole);
  if (!role) throw new Error('Dataset snapshot requires a source role.');
  const contentSha256 = sha256Utf8(rawText);
  const snapshotId = 'ds:sha256:' + sha256Utf8(stableAuditJson({
    schema: XML_COMPARE_DATASET_SNAPSHOT_SCHEMA, sourceRole: role,
    parserVersion, contentSha256,
  }));
  return Object.freeze({
    schema: XML_COMPARE_DATASET_SNAPSHOT_SCHEMA, snapshotId,
    sourceRole: role, sourceName: String(sourceName),
    parserVersion, contentSha256, digestAlgorithm: 'SHA-256/UTF-8-loaded-text',
    byteLength: new TextEncoder().encode(rawText).length,
    // Kept solely in memory; public metadata deliberately excludes source data.
    rawText,
  });
}

export function datasetSnapshotDescriptor(snapshot) {
  const { rawText, ...descriptor } = snapshot;
  return Object.freeze(descriptor);
}

export function createComparisonSnapshot({
  source, target, report,
  adapterId = 'iso-note-ps-mapping-to-iso-notes/v1',
  identityPolicyVersion = 'iso-note-pipeline-plus-full-support/v2',
  engineeringRulesVersion = 'TYPED_GAP_EXACT_MM_V2',
  configuration = {},
} = {}) {
  if (!source?.snapshotId || !target?.snapshotId || !report) {
    throw new Error('Comparison snapshot requires two dataset snapshots and a report.');
  }
  const configJson = stableAuditJson(configuration);
  const configSha256 = sha256Utf8(configJson);
  const manifest = Object.freeze({
    schema: XML_COMPARE_COMPARISON_SNAPSHOT_SCHEMA,
    sourceSnapshotId: source.snapshotId, targetSnapshotId: target.snapshotId,
    adapterId, identityPolicyVersion, engineeringRulesVersion, configSha256,
  });
  const comparisonId = 'cmp:sha256:' + sha256Utf8(stableAuditJson(manifest));
  return Object.freeze({ ...manifest, comparisonId, configuration: deepFreezeAudit(
    JSON.parse(configJson)), report: deepFreezeAudit(report) });
}

export function comparisonSnapshotDescriptor(snapshot) {
  const { report, configuration, ...descriptor } = snapshot;
  return Object.freeze(descriptor);
}

// A logical key names the engineering subject and finding kind, not a row
// ordinal. Two duplicate source occurrences can share a logical key but must
// have different snapshot-specific finding instance IDs.
export function logicalFindingKey(finding) {
  const normal = value => String(value ?? '').trim().replace(/^\/+/, '').toUpperCase();
  const manifest = {
    schema: 'iso-note-logical-finding/v1',
    pipeline: normal(finding.pipeline),
    support: normal(finding.psNo || finding.nodeName),
    domain: String(finding.domain), kind: String(finding.kind),
  };
  return 'lf:sha256:' + sha256Utf8(stableAuditJson(manifest));
}

export function findingInstanceId(finding, comparisonId, ordinal) {
  if (!comparisonId) return '';
  return 'fi:sha256:' + sha256Utf8(stableAuditJson({
    schema: 'iso-note-finding-instance/v1', comparisonId,
    logicalFindingKey: logicalFindingKey(finding),
    sourceUid: String(finding.sourceUid || ''),
    targetUid: String(finding.targetUid || ''),
    findingId: String(finding.findingId), ordinal,
  }));
}
