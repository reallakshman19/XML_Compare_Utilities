import {
  buildPsFamilyNativeAuditPipeline as buildCombinedPipeline,
  createPsFamilyNativePipelineReadiness,
} from './ps-family-native-combined-input.js';

export { createPsFamilyNativePipelineReadiness };

export function buildPsFamilyNativeAuditPipeline(input = {}) {
  const pipeline = buildCombinedPipeline(input);
  return {
    ...pipeline,
    relationshipBundle: {
      ...pipeline.relationshipBundle,
      inputMode: 'COMBINED_STAGED_MODEL',
    },
  };
}
