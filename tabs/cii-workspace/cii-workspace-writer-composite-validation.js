import { deepFreeze, stableStringify } from './cii-workspace-contracts.js';

function sectionOrder(document) {
  return (document?.physicalFile?.lines || [])
    .map((line) => String(line.text || '').match(/^\s*#\$\s*(.*?)\s*$/)?.[1]?.toUpperCase())
    .filter(Boolean);
}
function componentPass(component, validation, label, errors) {
  if (!component) return;
  if (!validation || validation.status !== 'PASS') errors.push(`COMPOSITE_${label}_COMPONENT_VALIDATION_REQUIRED`);
}
function mutationSpans(writerResult, errors) {
  const spans = [...(writerResult?.mutations || [])].map((item) => ({
    start: Number(item.absoluteByteStart), end: Number(item.absoluteByteEnd),
    beforeField: String(item.beforeField ?? ''), afterField: String(item.afterField ?? ''),
    spanKey: String(item.spanKey || `${item.absoluteByteStart}:${item.absoluteByteEnd}`),
  })).sort((a, b) => a.start - b.start || a.end - b.end);
  for (const span of spans) {
    if (!Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end) || span.start < 0 || span.end <= span.start) {
      errors.push(`COMPOSITE_AUTHORIZED_SPAN_INVALID:${span.spanKey}`);
    }
    if (span.end - span.start !== span.beforeField.length || span.end - span.start !== span.afterField.length) {
      errors.push(`COMPOSITE_AUTHORIZED_SPAN_WIDTH_MISMATCH:${span.spanKey}`);
    }
  }
  for (let index = 1; index < spans.length; index += 1) {
    if (spans[index - 1].start < spans[index].end && spans[index].start < spans[index - 1].end) {
      errors.push(`COMPOSITE_AUTHORIZED_SPAN_OVERLAP:${spans[index - 1].spanKey}:${spans[index].spanKey}`);
    }
  }
  return spans;
}
function actualByteDiff(before, after, spans, errors) {
  if (before.length !== after.length) { errors.push('COMPOSITE_BYTE_LENGTH_CHANGED'); return []; }
  const changed = []; let spanIndex = 0;
  for (let index = 0; index < before.length; index += 1) {
    if (before.charCodeAt(index) === after.charCodeAt(index)) continue;
    changed.push(index);
    while (spanIndex < spans.length && index >= spans[spanIndex].end) spanIndex += 1;
    const span = spans[spanIndex];
    if (!span || index < span.start || index >= span.end) errors.push(`COMPOSITE_UNAUTHORIZED_BYTE_CHANGE:${index}`);
  }
  for (const span of spans) {
    if (before.slice(span.start, span.end) !== span.beforeField) errors.push(`COMPOSITE_BEFORE_FIELD_MISMATCH:${span.spanKey}`);
    if (after.slice(span.start, span.end) !== span.afterField) errors.push(`COMPOSITE_AFTER_FIELD_MISMATCH:${span.spanKey}`);
  }
  return changed;
}

export function validateCiiWriterCompositeRoundTrip(beforeDocument, afterDocument, writerResult, componentValidations = {}) {
  const errors = [];
  if (beforeDocument?.writer1CByteEligible !== true || afterDocument?.writer1CByteEligible !== true) errors.push('COMPOSITE_ORIGINAL_BYTE_CUSTODY_REQUIRED');
  const before = String(beforeDocument?.physicalFile?.originalByteString ?? '');
  const after = String(afterDocument?.physicalFile?.originalByteString ?? '');
  const spans = mutationSpans(writerResult, errors); const changed = actualByteDiff(before, after, spans, errors);
  componentPass(writerResult?.components?.lower, componentValidations.lower, 'LOWER_1A_1B', errors);
  componentPass(writerResult?.components?.writer1C, componentValidations.writer1C, 'WRITER_1C', errors);
  if (beforeDocument?.physicalFile?.byteLength !== afterDocument?.physicalFile?.byteLength) errors.push('COMPOSITE_PHYSICAL_BYTE_LENGTH_CHANGED');
  if ((beforeDocument?.physicalFile?.lines || []).length !== (afterDocument?.physicalFile?.lines || []).length) errors.push('COMPOSITE_PHYSICAL_LINE_COUNT_CHANGED');
  if (stableStringify(beforeDocument?.physicalFile?.lineEndings?.sequence) !== stableStringify(afterDocument?.physicalFile?.lineEndings?.sequence)) {
    errors.push('COMPOSITE_LINE_ENDING_SEQUENCE_CHANGED');
  }
  if (stableStringify(sectionOrder(beforeDocument)) !== stableStringify(sectionOrder(afterDocument))) errors.push('COMPOSITE_SECTION_ORDER_CHANGED');
  const resultBytes = writerResult?.bytes instanceof Uint8Array ? writerResult.bytes : null;
  if (!resultBytes || resultBytes.length !== after.length) errors.push('COMPOSITE_RESULT_BYTE_VECTOR_REQUIRED');
  else {
    for (let index = 0; index < resultBytes.length; index += 1) {
      if (resultBytes[index] !== after.charCodeAt(index)) { errors.push(`COMPOSITE_RESULT_REPARSE_BYTE_MISMATCH:${index}`); break; }
    }
  }
  if (errors.length) throw new Error(`CII_WRITER_COMPOSITE_NEGATIVE_ASSURANCE_FAILED:${[...new Set(errors)].join('|')}`);
  return deepFreeze({
    schema: 'CIIWorkspaceWriterCompositeValidation.v1', status: 'PASS',
    authorizedSpanCount: spans.length, changedByteCount: changed.length,
    componentValidations: deepFreeze(componentValidations),
    checks: Object.freeze([
      'LOWER_1A_1B_COMPONENT_VALIDATED_FROM_ORIGINAL_PREIMAGE',
      'WRITER_1C_COMPONENT_VALIDATED_FROM_ORIGINAL_PREIMAGE',
      'CROSS_FAMILY_AUTHORIZED_SPANS_DISJOINT',
      'FINAL_BYTE_DIFF_SUBSET_OF_AUTHORIZED_UNION',
      'EXACT_AUTHORIZED_PREIMAGE_AND_POSTIMAGE',
      'ONE_ORIGINAL_BYTE_VECTOR_PATCH',
      'BYTE_LINE_ENDING_AND_SECTION_STRUCTURE_UNCHANGED',
      'FINAL_REPARSE_BYTES_MATCH_WRITER_RESULT',
    ]),
  });
}
