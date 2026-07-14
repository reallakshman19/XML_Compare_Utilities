import { buildXmlCompareLinewiseWorkspaceModel } from './XmlCompareLinewiseWorkspaceModel.js';

export const XML_COMPARE_LINEWISE_WORKFLOW_STATE_SCHEMA = 'xml-compare-linewise-workflow-state/v2-producer-adoption';

const clean = (value) => String(value ?? '').trim();
const PRODUCER_STATUSES = new Set(['idle', 'running', 'success', 'failed']);

export function defaultRegexSandbox(input = {}) {
  return Object.freeze({
    previewSide: clean(input.previewSide) || 'imported',
    sample: clean(input.sample),
    regex: clean(input.regex) || '([0-9]{5})',
    group: clean(input.group) || '1',
    tokenPosition: clean(input.tokenPosition) || '4',
    delimiter: input.delimiter == null ? '-' : String(input.delimiter),
  });
}

export function defaultLinewiseSideload(input = {}) {
  return Object.freeze({
    lineIdText: String(input.lineIdText ?? ''),
    nodeNameText: String(input.nodeNameText ?? ''),
    restraintTagText: String(input.restraintTagText ?? ''),
    coordinateText: String(input.coordinateText ?? ''),
  });
}

export function linewiseLineIdOptions(model = null) {
  const seen = new Set(), out = [];
  for (const line of model?.lines || []) {
    const value = clean(line.lineId);
    if (!value || seen.has(value)) continue;
    seen.add(value); out.push({ value, label: value });
  }
  return out;
}

function producerStatus(value = '') {
  const status = clean(value);
  return PRODUCER_STATUSES.has(status) ? status : 'idle';
}

export function createLinewiseWorkflowState(input = {}) {
  const text = String(input.text ?? '');
  const fileName = clean(input.fileName);
  const model = input.model || (text ? buildXmlCompareLinewiseWorkspaceModel(text, fileName) : null);
  const regexSandbox = defaultRegexSandbox(input.regexSandbox);
  const sample = regexSandbox.sample || linewiseLineIdOptions(model)[0]?.value || '';
  return Object.freeze({
    schema: XML_COMPARE_LINEWISE_WORKFLOW_STATE_SCHEMA,
    open: Boolean(input.open),
    fileName,
    text,
    model,
    tab: clean(input.tab) || 'import',
    lineIndex: Math.max(0, Number(input.lineIndex) || 0),
    elementIndex: Math.max(0, Number(input.elementIndex) || 0),
    previewMode: clean(input.previewMode) || 'categorized',
    lastCategorized: String(input.lastCategorized ?? ''),
    lastEnriched: String(input.lastEnriched ?? ''),
    lastSideloadReport: input.lastSideloadReport || null,
    lastCanvasStatus: String(input.lastCanvasStatus ?? ''),
    producerCategorizationStatus: producerStatus(input.producerCategorizationStatus),
    producerCategorizationResult: input.producerCategorizationResult || null,
    producerCategorizationError: input.producerCategorizationError || null,
    canvasSide: input.canvasSide === 'b' ? 'b' : 'a',
    infoRuleOpen: Boolean(input.infoRuleOpen),
    sideload: defaultLinewiseSideload(input.sideload),
    regexSandbox: Object.freeze({ ...regexSandbox, sample }),
  });
}

export function resetLinewiseWorkflowState(input = {}) {
  return createLinewiseWorkflowState({ ...input, open: Boolean(input.open) });
}

export function updateLinewiseWorkflowState(state = {}, patch = {}) {
  return createLinewiseWorkflowState({ ...state, ...patch });
}

export const _test = Object.freeze({ clean, producerStatus });
