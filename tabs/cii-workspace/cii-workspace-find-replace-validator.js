import { sha256CiiByteString } from './cii-workspace-byte-sha256.js';
import { resolveFindReplaceScope } from './cii-workspace-find-replace-scope-resolver.js';

/*
 * CII v14 Find & Replace independent validation helpers.
 *
 * The validator never writes. Claims are always TARGET0-relative. Scope
 * resolvers independently derive the only physical line-body spans in which
 * an operation may search. Line endings are never authorized search spans.
 */

function byteLength(value) {
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) > 0xff) return null;
  }
  return text.length;
}

function literalMatchesWithinSpans(target0, needle, spans) {
  const matches = [];
  if (!needle) return matches;
  for (const span of spans || []) {
    const start = Number(span?.start); const end = Number(span?.end);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > target0.length) continue;
    const body = target0.slice(start, end);
    let offset = 0;
    while (offset <= body.length - needle.length) {
      const found = body.indexOf(needle, offset);
      if (found < 0) break;
      matches.push(start + found);
      offset = found + needle.length;
    }
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

    const findText = String(operation?.findText ?? operation?.before ?? '');
    const replaceText = String(operation?.replaceText ?? operation?.after ?? '');
    const findBytes = byteLength(findText);
    const replaceBytes = byteLength(replaceText);
    const operationBlockers = [];
    if (!findText) operationBlockers.push('FIND_TEXT_REQUIRED');
    if (findText.includes('\r') || findText.includes('\n') || replaceText.includes('\r') || replaceText.includes('\n')) {
      operationBlockers.push('LINE_ENDING_TEXT_NOT_SUPPORTED');
    }
    if (findBytes == null || replaceBytes == null) operationBlockers.push('NON_BYTE_TEXT_NOT_SUPPORTED');
    if (requireEqualByteLength && findBytes != null && replaceBytes != null && findBytes !== replaceBytes) {
      operationBlockers.push(`FIXED_WIDTH_LENGTH_MISMATCH:${findBytes}:${replaceBytes}`);
    }

    const scopeResolution = resolveFindReplaceScope(target0, operation);
    if (scopeResolution?.status !== 'PASS') {
      for (const blocker of scopeResolution?.blockers || ['SCOPE_RESOLUTION_FAILED']) operationBlockers.push(blocker);
    }

    const matches = operationBlockers.length
      ? []
      : literalMatchesWithinSpans(target0, findText, scopeResolution.spans);
    if (!operationBlockers.length && matches.length === 0) operationBlockers.push('NO_MATCHES_IN_SCOPE');
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
          scope: scopeResolution.scope,
          block: scopeResolution.block || null,
          authority: scopeResolution.authority || null,
        }));
      }
    }
    summaries.push(Object.freeze({
      sequence,
      status: operationBlockers.length ? 'BLOCKED' : 'VALID',
      scope: String(operation?.scope || 'DOCUMENT').toUpperCase(),
      block: operation?.block || null,
      matchCount: matches.length,
      scopeAuthority: scopeResolution?.authority || null,
      scopeEvidence: scopeResolution?.evidence || null,
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

export const _test = Object.freeze({ byteLength, literalMatchesWithinSpans, overlapBlockers });
