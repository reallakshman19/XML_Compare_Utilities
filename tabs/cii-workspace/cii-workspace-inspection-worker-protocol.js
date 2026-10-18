/** I121-WP1: read-only Writer2 inspection Worker message/custody contract. */
export const CII_INSPECTION_WORKER_SCHEMA = 'CIIWriter2InspectionWorker.v1';
export const CII_INSPECTION_RESULT_SCHEMA = 'CIIWorkspaceSourceSetInspection.v1';
const shaPattern = /^[0-9a-f]{64}$/i;

function fail(code) { throw new Error('CII_INSPECTION_WORKER_' + code); }
export function validateCiiInspectionRun(runId, input, expected) {
  if (!Number.isSafeInteger(runId) || runId < 1) fail('RUN_ID_INVALID');
  const sources = input?.sources;
  if (!Array.isArray(sources) || sources.length < 2) fail('SOURCE_SET_INVALID');
  if (input?.targetBytes == null && input?.targetText == null) fail('TARGET_REQUIRED');
  if (!Array.isArray(expected?.sources) || expected.sources.length !== sources.length) fail('EXPECTED_SOURCES_REQUIRED');
  if (!shaPattern.test(String(expected?.targetSha256 || ''))) fail('EXPECTED_TARGET_SHA_REQUIRED');
  const ids = new Set();
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index], receipt = expected.sources[index];
    const id = String(source?.sourceId || '').trim();
    if (!id || ids.has(id)) fail('SOURCE_IDS_INVALID');
    if (source?.bytes == null && source?.text == null) fail('SOURCE_BYTES_REQUIRED');
    if (receipt?.sourceId !== id || !shaPattern.test(String(receipt?.sha256 || ''))) fail('EXPECTED_SOURCE_MISMATCH');
    ids.add(id);
  }
  return Object.freeze({
    sources: Object.freeze(expected.sources.map(row => Object.freeze({
      sourceId: row.sourceId, sha256: row.sha256.toLowerCase(),
    }))),
    targetSha256: expected.targetSha256.toLowerCase(),
  });
}

export function verifyCiiInspectionWorkerResult(result, expected) {
  if (result?.schema !== CII_INSPECTION_RESULT_SCHEMA ||
      result?.status !== 'CORRESPONDENCE_INPUT_READY') fail('RESULT_SCHEMA_INVALID');
  const members = result?.sourceSet?.members;
  if (result?.sourceSet?.status !== 'CUSTODY_READY' ||
      !Array.isArray(members) || members.length !== expected.sources.length ||
      result?.memberInspections?.length !== members.length) fail('RESULT_SOURCE_SET_INVALID');
  if (!shaPattern.test(String(result.sourceSet.sourceSetSha256 || '')) ||
      result?.versionBridge?.sourceSetSha256 !== result.sourceSet.sourceSetSha256)
    fail('RESULT_SOURCE_SET_SHA_MISMATCH');
  for (let i = 0; i < members.length; i++) {
    const member = members[i], receipt = expected.sources[i];
    if (member?.sourceId !== receipt.sourceId ||
        String(member?.originalSha256 || '').toLowerCase() !== receipt.sha256 ||
        result.memberInspections[i]?.sourceId !== receipt.sourceId ||
        result.versionBridge?.members?.[i]?.originalSha256 !== member.originalSha256)
      fail('RESULT_SOURCE_MEMBER_CUSTODY_MISMATCH');
  }
  if (String(result?.versionBridge?.target?.originalSha256 || '').toLowerCase() !== expected.targetSha256)
    fail('RESULT_TARGET_CUSTODY_MISMATCH');
  return result;
}

export function ciiInspectionWorkerError(code, message = '') {
  const error = new Error('CII_INSPECTION_WORKER_' + String(code));
  if (message) error.cause = String(message);
  return error;
}
