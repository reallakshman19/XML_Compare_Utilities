/** I121-WP2: prepared-session custody for the newer Writer2 tabs lifecycle. */
import {
  validateCiiInspectionRun, verifyCiiInspectionWorkerResult,
} from './cii-workspace-inspection-worker-protocol.js';

export const CII_PREPARED_WORKER_SCHEMA = 'CIIWriter2PreparedInspectionWorker.v1';
export const CII_PREPARED_SESSION_SCHEMA = 'CIIWorkspacePreparedSourceSetSession.v1';
const fail = code => { throw new Error('CII_PREPARED_WORKER_' + code); };

export function validateCiiPreparedWorkerRun(runId, input, expected) {
  return validateCiiInspectionRun(runId,input,expected);
}

export function verifyCiiPreparedWorkerResult(payload, expected) {
  const inspection = verifyCiiInspectionWorkerResult(payload?.inspection,expected);
  const session = payload?.preparedSession;
  if (session?.schema !== CII_PREPARED_SESSION_SCHEMA || session?.status !== 'PREPARED' ||
      session?.authority !== 'IMMUTABLE_NORMALIZED_MODEL_CUSTODY')
    fail('SESSION_SCHEMA_INVALID');
  if (session.sourceSetSha256 !== inspection.sourceSet.sourceSetSha256 ||
      session.sourceSet?.sourceSetSha256 !== inspection.sourceSet.sourceSetSha256 ||
      session.versionBridge?.sourceSetSha256 !== inspection.sourceSet.sourceSetSha256)
    fail('SESSION_SET_CUSTODY_MISMATCH');
  if (!Array.isArray(session.members) || session.members.length !== expected.sources.length)
    fail('SESSION_MEMBERS_INVALID');
  if (String(session.target?.originalSha256 || '').toLowerCase() !== expected.targetSha256 ||
      !session.target?.targetDocument || !session.target?.targetGraph)
    fail('SESSION_TARGET_CUSTODY_MISMATCH');
  for (let i=0;i<expected.sources.length;i++) {
    const member=session.members[i], receipt=expected.sources[i],
      sourceMember=inspection.sourceSet.members[i];
    if (member?.sourceId !== receipt.sourceId ||
        String(member?.originalSha256 || '').toLowerCase() !== receipt.sha256 ||
        member.normalizedSha256 !== sourceMember.normalizedSha256 ||
        !member?.sourceDocument || !member?.sourceGraph ||
        member.sourceDocument.contentSha256 !== member.normalizedSha256)
      fail('SESSION_MEMBER_CUSTODY_MISMATCH');
  }
  return payload;
}
