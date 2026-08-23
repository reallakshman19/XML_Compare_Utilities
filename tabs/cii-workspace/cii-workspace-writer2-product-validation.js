import { deepFreeze } from './cii-workspace-contracts.js';
import { validateCiiWriter2CompositeWithHangerRoundTrip } from './cii-workspace-writer2-composite-hanger-validation.js';
import { validateCiiWriter2CompositeWithPartialHangerRoundTrip } from './cii-workspace-writer2-composite-hanger-partial-validation.js';

function count(value, label) {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`CII_WRITER_2_PRODUCT_${label}_COUNT_INVALID`);
  return number;
}

export function validateCiiWriter2ProductRoundTrip(before, after, targetGraph, transferPlan, writerResult) {
  const counts = writerResult?.familyMutationCounts || {};
  const deleteAllCount = count(counts.hangerDeleteAllOperations, 'HANGER_DELETE_ALL');
  const partialCount = count(counts.hangerPartialDeleteOperations, 'HANGER_PARTIAL_DELETE');
  const deleteAllComponent = writerResult?.components?.hangerDeleteAll || null;
  const partialComponent = writerResult?.components?.hangerPartialDelete || null;

  if ((deleteAllCount > 0) !== Boolean(deleteAllComponent)) {
    throw new Error('CII_WRITER_2_PRODUCT_HANGER_DELETE_ALL_COMPONENT_TESTIMONY_MISMATCH');
  }
  if ((partialCount > 0) !== Boolean(partialComponent)) {
    throw new Error('CII_WRITER_2_PRODUCT_HANGER_PARTIAL_COMPONENT_TESTIMONY_MISMATCH');
  }
  if ((deleteAllCount > 0 && partialCount > 0) || (deleteAllComponent && partialComponent)) {
    throw new Error('CII_WRITER_2_PRODUCT_HANGER_COMPONENT_CLASS_AMBIGUOUS');
  }

  const validation = partialCount > 0
    ? validateCiiWriter2CompositeWithPartialHangerRoundTrip(before, after, targetGraph, transferPlan, writerResult)
    : validateCiiWriter2CompositeWithHangerRoundTrip(before, after, targetGraph, transferPlan, writerResult);
  const productValidatorClass = partialCount > 0 ? 'PARTIAL_H_GT_1' : deleteAllCount > 0 ? 'DELETE_ALL' : 'NO_HANGER';
  return deepFreeze({ ...validation, productValidatorClass, unexpectedSemanticDeltaCount: 0 });
}

export const _test = Object.freeze({ count });
