import {
  buildPsFamilyNativeAuditPipeline as buildCorePipeline,
  createPsFamilyNativePipelineReadiness as createCoreReadiness,
} from './ps-family-native-audit-pipeline.js';
import { parseSupportSteelJson } from '../support-steel-relationship-builder/support-steel-source-utils.js';

export function buildPsFamilyNativeAuditPipeline(input = {}) {
  const combinedInput = parseCombinedInput(input);
  const pipeline = buildCorePipeline({
    ...input,
    supportInput: combinedInput,
    steelInput: combinedInput,
  });
  return {
    ...pipeline,
    inputMode: 'COMBINED_STAGED_MODEL',
    inputSchemas: { combinedModel: sourceSchema(combinedInput) },
  };
}

export function createPsFamilyNativePipelineReadiness(input = {}) {
  let combinedInput;
  try {
    combinedInput = parseCombinedInput(input);
  } catch (error) {
    return Object.freeze({
      schema: 'PsFamilyNativeAuditPipelineReadiness.v1',
      productionMode: 'STAGED_JSON_PIPELINE',
      inputMode: 'COMBINED_STAGED_MODEL',
      xmlRequired: false,
      blocking: true,
      summary: {
        sourceRecordCount: 0,
        supportRecordCount: 0,
        steelRecordCount: 0,
        errorCount: 1,
        warningCount: 0,
      },
      diagnostics: [{
        level: 'ERROR',
        code: 'INVALID_COMBINED_STAGED_MODEL',
        message: error.message || String(error),
      }],
    });
  }
  const readiness = createCoreReadiness({
    ...input,
    supportInput: combinedInput,
    steelInput: combinedInput,
  });
  return Object.freeze({
    ...readiness,
    inputMode: 'COMBINED_STAGED_MODEL',
    summary: {
      ...readiness.summary,
      sourceRecordCount: sourceRecordCount(combinedInput),
    },
  });
}

function parseCombinedInput(input) {
  const value = input.combinedInput
    ?? input.combinedInputText
    ?? input.stagedInput
    ?? input.stagedInputText;
  if (value === undefined || value === null || String(value).trim?.() === '') {
    throw new Error('Combined staged model source is empty.');
  }
  return parseSupportSteelJson(value, 'Combined staged model source');
}

function sourceSchema(value) {
  if (value?.schema) return value.schema;
  return Array.isArray(value) ? 'StagedJsonArray' : 'StagedJsonObject';
}

function sourceRecordCount(value) {
  if (Array.isArray(value)) return value.length;
  if (Array.isArray(value?.objects)) return value.objects.length;
  return value && typeof value === 'object' ? 1 : 0;
}
