import { sha256CiiByteString } from './cii-workspace-byte-sha256.js';

/*
 * CII v14 Find & Replace independent validation helpers.
 *
 * The validator never writes. Claims are always TARGET0-relative. This first
 * qualification slice supports document-scope literal replacement only;
 * element/block scopes fail closed until a qualified scope resolver exists.
 */

function byteLength(value) {
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) > 0xff) return null;
  }
  return text.length;
}

function literalMatches(target0, needle) {
  const matches = [];
  if (!needle) return matches;
  let offset = 0;
  while (offset <= target0.length - needle.length) {
    const found = target0.indexOf(needle, offset);
    if (found < 0) break;
    matches.push(found);
    offset = found + needle.length;
  }
  return matches;
}

function overlapBlockers(claims) {
  const blockers = [];
  const ordered = [...claims].sort((a, b) => a.start - b.start || a.end - b.end || a.operationIndex - b.operationIndex);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (current.start < previous.end) {
      blockers.push(`OVERLAPPING_CLAIMS:${previous.operationIndex}:${current.operationIndex}:${current.start}`);
    }
  }
  return blockers;
}

export function validateFindReplacePreimage(target0Input, operations = [], options = {}) {
  const target0 = String(target0Input ?? '');
  const requireEqualByteLength = options.requireEqualByteLength !== false;
  const blockers = [];
  const claims = [];
  const summaries = [];

  const sourceByteLength = byteLength(target0);
  if (sourceByteLength == null) blockers.push('TARGET0_CONTAINS_NON_BYTE_CODE_UNIT');

  (operations || []).forEach((operation, operationIndex) => {
    const sequence = operation?.sequence ?? operationIndex + 1;
    const status = String(operation?.status || 'PROPOSED').toUpperCase();
    if (status === 'REJECTED') return;
    if (status === 'BLOCKED') {
      blockers.push(`OPERATION_BLOCKED:${sequence}`);
      return;
    }
    if (!['PROPOSED', 'APPROVED'].includes(status)) {
      blockers.push(`OPERATION_STATUS_UNSUPPORTED:${sequence}:${status}`);
      return;
    }
    if (operation?.scope !== 'DOCUMENT') {
      blockers.push(`SCOPE_RESOLVER_REQUIRED:${sequence}:${operation?.scope || 'UNKNOWN'}`);
      return;
    }

    const findText = String(operation?.findText ?? operation?.before ?? '');
    const replaceText = String(operation?.replaceText ?? operation?.after ?? '');
    const findBytes = byteLength(findText);
    const replaceBytes = byteLength(replaceText);
    const operationBlockers = [];
    if (!findText) operationBlockers.push('FIND_TEXT_REQUIRED');
    if (findBytes == null || replaceBytes == null) operationBlockers.push('NON_BYTE_TEXT_NOT_SUPPORTED');
    if (requireEqualByteLength && findBytes != null && replaceBytes != null && findBytes !== replaceBytes) {
      operationBlockers.push(`FIXED_WIDTH_LENGTH_MISMATCH:${findBytes}:${replaceBytes}`);
    }

    const matches = operationBlockers.length ? [] : literalMatches(target0, findText);
    if (!operationBlockers.length && matches.length === 0) operationBlockers.push('NO_MATCHES_IN_TARGET0');
    if (operation?.expectedMatches != null && matches.length !== Number(operation.expectedMatches)) {
      operationBlockers.push(`MATCH_COUNT_MISMATCH:${operation.expectedMatches}:${matches.length}`);
    }

    for (const blocker of operationBlockers) blockers.push(`OPERATION:${sequence}:${blocker}`);
    if (!operationBlockers.length) {
      for (const start of matches) {
        claims.push(Object.freeze({
          operationIndex: sequence,
          start,
          end: start + findText.length,
          before: findText,
          after: replaceText,
        }));
      }
    }
    summaries.push(Object.freeze({
      sequence,
      status: operationBlockers.length ? 'BLOCKED' : 'VALID',
      matchCount: matches.length,
      blockers: Object.freeze(operationBlockers),
    }));
  });

  blockers.push(...overlapBlockers(claims));
  return Object.freeze({
    status: blockers.length ? 'FAIL' : 'PASS',
    sourceHash: sourceByteLength == null ? null : sha256CiiByteString(target0),
    sourceLength: target0.length,
    claims: Object.freeze(claims),
    operationSummaries: Object.freeze(summaries),
    blockers: Object.freeze(blockers),
  });
}

function expectedByteAt(target0, claim, index) {
  if (!claim || index < claim.start || index >= claim.end) return target0[index];
  return claim.after[index - claim.start];
}

export function validateFindReplacePostimage(target0Input, target1Input, preimageValidation) {
  const target0 = String(target0Input ?? '');
  const target1 = String(target1Input ?? '');
  const blockers = [];
  if (preimageValidation?.status !== 'PASS') blockers.push('PREIMAGE_VALIDATION_NOT_PASS');
  if (target0.length !== target1.length) blockers.push(`POSTIMAGE_LENGTH_CHANGED:${target0.length}:${target1.length}`);
  if (preimageValidation?.sourceHash && sha256CiiByteString(target0) !== preimageValidation.sourceHash) blockers.push('TARGET0_HASH_CHANGED');

  const claims = [...(preimageValidation?.claims || [])].sort((a, b) => a.start - b.start);
  let claimIndex = 0;
  const unexpected = [];
  const limit = Math.min(target0.length, target1.length);
  for (let index = 0; index < limit; index += 1) {
    while (claimIndex < claims.length && index >= claims[claimIndex].end) claimIndex += 1;
    const claim = claims[claimIndex];
    const expected = expectedByteAt(target0, claim, index);
    if (target1[index] !== expected) {
      unexpected.push(Object.freeze({ index, expected, actual: target1[index] }));
      if (unexpected.length >= 20) break;
    }
  }
  if (unexpected.length) blockers.push(`UNEXPECTED_POSTIMAGE_BYTES:${unexpected.length}`);

  return Object.freeze({
    status: blockers.length ? 'FAIL' : 'PASS',
    blockers: Object.freeze(blockers),
    unexpected: Object.freeze(unexpected),
  });
}
