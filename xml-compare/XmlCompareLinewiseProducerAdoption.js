import { applyLinewiseSideload } from './XmlCompareLinewiseWorkflowActions.js';
import { updateLinewiseWorkflowState } from './XmlCompareLinewiseWorkflowState.js';

export const XML_COMPARE_LINEWISE_PRODUCER_ADOPTION_SCHEMA = 'xml-compare-linewise-producer-adoption/v1';
export const XML_COMPARE_LINEWISE_PRODUCER_ID = 'xml-compare-linewise-sideload';

const clean = (value) => String(value ?? '').trim();

export function linewiseProducerDescriptor() {
  return Object.freeze({
    id: XML_COMPARE_LINEWISE_PRODUCER_ID,
    repository: 'reallaksh19/XML_Compare_Utilities',
    module: 'xml-compare/XmlCompareLinewiseWorkflowActions.js',
    operation: 'applyLinewiseSideload',
    version: XML_COMPARE_LINEWISE_PRODUCER_ADOPTION_SCHEMA,
    artifactRole: 'enriched-inputxml',
  });
}

export function createLinewiseProducerRequest(state = {}) {
  return Object.freeze({
    schema: 'InputXmlProducerCategorizeRequest.v1',
    requestId: `xml-compare-linewise-${Date.now()}`,
    producer: linewiseProducerDescriptor(),
    source: Object.freeze({
      filename: clean(state.fileName) || 'xml_compare_sideload_enriched.input.xml',
      content: String(state.lastEnriched || state.text || ''),
    }),
  });
}

export function startLinewiseProducerRun(state = {}) {
  const enriched = applyLinewiseSideload(state);
  const hasOutput = clean(enriched.lastEnriched);
  const next = updateLinewiseWorkflowState(enriched, {
    lastCategorized: '',
    producerCategorizationStatus: hasOutput ? 'running' : 'failed',
    producerCategorizationResult: null,
    producerCategorizationError: hasOutput ? null : Object.freeze({
      code: 'ENRICHED_INPUTXML_MISSING',
      message: enriched.lastCanvasStatus || 'Sideload did not produce enriched InputXML.',
    }),
  });
  return Object.freeze({ state: next, request: hasOutput ? createLinewiseProducerRequest(next) : null });
}

function failureMessage(result = null, error = null) {
  if (error?.message) return error.message;
  const diagnostic = result?.diagnostics?.find((item) => item.severity === 'error');
  return diagnostic?.message || 'Worker categorization failed.';
}

export function finishLinewiseProducerRun(state = {}, result = null) {
  const text = result?.success ? String(result.artifact?.text || '') : '';
  if (!text) return failLinewiseProducerRun(state, null, result);
  return updateLinewiseWorkflowState(state, {
    lastCategorized: text,
    producerCategorizationStatus: 'success',
    producerCategorizationResult: result,
    producerCategorizationError: null,
    lastCanvasStatus: `Worker categorized ${result.summary?.categorizedElements || 0} element(s).`,
  });
}

export function failLinewiseProducerRun(state = {}, error = null, result = null) {
  const normalized = Object.freeze({
    code: clean(error?.code || result?.diagnostics?.find((item) => item.severity === 'error')?.code) || 'PRODUCER_CATEGORIZATION_FAILED',
    message: failureMessage(result, error),
  });
  return updateLinewiseWorkflowState(state, {
    lastCategorized: '',
    producerCategorizationStatus: 'failed',
    producerCategorizationResult: result,
    producerCategorizationError: normalized,
    lastCanvasStatus: `Categorization failed: ${normalized.message}`,
  });
}

export async function runLinewiseSideloadProducerAdoption(state = {}, client = null) {
  const started = startLinewiseProducerRun(state);
  if (!started.request) return started.state;
  try {
    const result = await client?.producer?.categorizeInputXml?.(started.request);
    return finishLinewiseProducerRun(started.state, result);
  } catch (error) {
    return failLinewiseProducerRun(started.state, error);
  }
}

export function linewiseProducerReceipt(state = {}) {
  return Object.freeze({
    schema: 'XmlCompareLinewiseProducerReceipt.v1',
    producer: linewiseProducerDescriptor(),
    status: clean(state.producerCategorizationStatus) || 'idle',
    result: state.producerCategorizationResult || null,
    error: state.producerCategorizationError || null,
    sideloadReport: state.lastSideloadReport || null,
  });
}

export function linewiseProducerReceiptJson(state = {}) {
  return `${JSON.stringify(linewiseProducerReceipt(state), null, 2)}\n`;
}

export const _test = Object.freeze({ clean, failureMessage });
