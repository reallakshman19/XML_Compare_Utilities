import { sha256CiiByteString } from './cii-workspace-byte-sha256.js';
import { validateFindReplacePostimage } from './cii-workspace-find-replace-validator.js';

/*
 * CII v14 Find & Replace explicit output boundary.
 *
 * This module never writes or overwrites a file. It packages an already
 * qualified in-memory TARGET1 for an explicit user download and independently
 * re-validates TARGET0/TARGET1 immediately before release.
 */

function outputName(inputName) {
  const name = String(inputName || 'target.cii').replace(/[\\/]/g, '_');
  const stem = name.replace(/\.cii$/i, '') || 'target';
  return `${stem}.find-replace.cii`;
}

function blockersForSession(session) {
  const blockers = [];
  if (session?.status !== 'QUALIFIED_PREVIEW') blockers.push('SESSION_NOT_QUALIFIED');
  if (session?.target?.version !== 14) blockers.push('TARGET_V14_REQUIRED');
  if (!session?.target?.text) blockers.push('TARGET0_REQUIRED');
  if (!session?.qualification?.preimage) blockers.push('PREIMAGE_VALIDATION_REQUIRED');
  if (!session?.qualification?.postimage?.target1) blockers.push('QUALIFIED_TARGET1_REQUIRED');
  return blockers;
}

export function buildFindReplaceDownloadArtifact(session) {
  const blockers = blockersForSession(session);
  if (blockers.length) return Object.freeze({ status: 'BLOCKED', blockers: Object.freeze(blockers), artifact: null });

  const target0 = session.target.text;
  const preimage = session.qualification.preimage;
  const target1 = session.qualification.postimage.target1;
  const sourceHash = sha256CiiByteString(target0);
  const targetHash = sha256CiiByteString(target1);

  if (sourceHash !== session.target.hash || sourceHash !== preimage.sourceHash) blockers.push('TARGET0_HASH_MISMATCH');
  if (target0.length !== target1.length) blockers.push(`TARGET_LENGTH_CHANGED:${target0.length}:${target1.length}`);
  const auditedHash = session.qualification.postimage.audit?.targetHash;
  if (!auditedHash || targetHash !== auditedHash) blockers.push('TARGET1_AUDIT_HASH_MISMATCH');

  const independent = validateFindReplacePostimage(target0, target1, preimage);
  if (independent.status !== 'PASS') blockers.push('INDEPENDENT_POSTIMAGE_REVALIDATION_FAILED', ...(independent.blockers || []));
  if (blockers.length) return Object.freeze({ status: 'BLOCKED', blockers: Object.freeze([...new Set(blockers)]), artifact: null });

  const receipt = Object.freeze({
    schema: 'CIIWorkspaceFindReplaceDownloadReceipt.v1',
    authority: 'EXPLICIT_USER_DOWNLOAD_OF_INDEPENDENTLY_VALIDATED_POSTIMAGE',
    sourceName: session.target.name,
    sourceVersion: 14,
    sourceHash,
    targetHash,
    sourceLength: target0.length,
    targetLength: target1.length,
    claimCount: preimage.claims.length,
    byteLengthPreserved: true,
    originalFileOverwritten: false,
    writerInvoked: false,
    validationStatus: independent.status,
  });

  return Object.freeze({
    status: 'READY_FOR_DOWNLOAD',
    blockers: Object.freeze([]),
    artifact: Object.freeze({
      fileName: outputName(session.target.name),
      mimeType: 'text/plain;charset=utf-8',
      text: target1,
      receipt,
    }),
  });
}

export const _test = Object.freeze({ outputName, blockersForSession });
