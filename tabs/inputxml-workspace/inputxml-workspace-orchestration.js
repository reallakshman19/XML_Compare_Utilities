import { detectXmlWorkspaceSchema, XML_WORKSPACE_KINDS } from './inputxml-workspace-xml-detect.js';
import { createInputXmlWorkspaceDiagnostic } from './inputxml-workspace-diagnostics.js';

const clean = (value) => String(value ?? '').trim();

function diagnostic(input) {
  return createInputXmlWorkspaceDiagnostic(input);
}

export function enrichmentInputPreflight(text = '', name = 'workspace-input.xml') {
  const detection = detectXmlWorkspaceSchema({ name, text });
  if (!clean(text)) {
    return Object.freeze({ ok: false, detection, diagnostic: diagnostic({
      severity: 'ERROR', code: 'WORKSPACE_INPUT_MISSING', action: 'apply-sideload',
      stage: 'enrichment', sourceField: 'enrichment.inputXmlText',
      message: 'Load or generate InputXML before applying enrichment.',
    }) });
  }
  const ok = detection.kind === XML_WORKSPACE_KINDS.INPUT_XML;
  return Object.freeze({ ok, detection, diagnostic: diagnostic({
    severity: ok ? 'OK' : 'ERROR', code: ok ? 'WORKSPACE_INPUTXML_ACCEPTED' : 'WORKSPACE_SCHEMA_REJECTED',
    action: 'apply-sideload', stage: 'enrichment', sourceField: 'enrichment.inputXmlText',
    sourceKind: detection.kind, message: ok
      ? 'InputXML schema accepted for sideload enrichment.'
      : `Tab 2 requires InputXML with PIPINGELEMENT rows; detected ${detection.label}.`,
  }) });
}

export function manualCleanXmlPreflight(tables = {}) {
  const branches = Array.isArray(tables.branches) ? tables.branches.length : 0;
  const nodes = Array.isArray(tables.nodes) ? tables.nodes.length : 0;
  const ok = branches > 0 && nodes > 0;
  return Object.freeze({ ok, diagnostic: diagnostic({
    severity: ok ? 'OK' : 'ERROR', code: ok ? 'WORKSPACE_MANUAL_TABLES_READY' : 'WORKSPACE_ZERO_RECORD_OUTPUT_BLOCKED',
    action: 'build-cleanxml-from-tables', stage: 'cleanxml', count: nodes,
    message: ok ? `Manual tables resolved ${branches} branch(es) and ${nodes} node(s).`
      : 'CleanXML build was blocked because manual tables produced no branch/node route.',
    context: { branches, nodes },
  }) });
}

export function countDiagnostic(input = {}) {
  const count = Number(input.count || 0);
  const hasSource = Boolean(clean(input.sourceText));
  const severity = count > 0 ? 'OK' : (hasSource ? 'WARNING' : 'INFO');
  const code = count > 0 ? 'WORKSPACE_ROWS_PARSED' : (hasSource ? 'WORKSPACE_ZERO_ROWS_PARSED' : 'WORKSPACE_EMPTY_SOURCE');
  return diagnostic({ ...input, severity, code, count,
    message: count > 0 ? `${input.label || 'Input'} parsed ${count} row(s).`
      : `${input.label || 'Input'} produced no usable rows.`,
  });
}

export function cleanArtifactsForSourceChange(state = {}) {
  const hadOutput = Boolean(clean(state.cleanXmlText) || state.cleanTables);
  return Object.freeze({ patch: { cleanXmlText: '', cleanTables: null }, diagnostic: diagnostic({
    severity: hadOutput ? 'WARNING' : 'INFO', code: hadOutput ? 'WORKSPACE_STALE_OUTPUT_INVALIDATED' : 'WORKSPACE_SOURCE_CHANGED',
    action: 'load-source-xml', stage: 'cleanxml', sourceField: 'sourceXmlText', outputField: 'cleanXmlText',
    message: hadOutput ? 'Previous CleanXML artifacts were cleared after the source XML changed.' : 'Source XML changed.',
  }) });
}

export function cleanEnrichmentForInputChange(enrichment = {}) {
  const keys = ['lineIdText', 'nodeNameText', 'restraintTagText', 'coordinateText', 'enrichedXmlText', 'sideloadStatus'];
  const hadOutput = keys.some((key) => clean(enrichment[key]));
  const patch = Object.fromEntries(keys.map((key) => [key, '']));
  return Object.freeze({ patch, diagnostic: diagnostic({
    severity: hadOutput ? 'WARNING' : 'INFO', code: hadOutput ? 'WORKSPACE_STALE_OUTPUT_INVALIDATED' : 'WORKSPACE_ENRICHMENT_INPUT_CHANGED',
    action: 'load-enrichment-input', stage: 'enrichment', sourceField: 'enrichment.inputXmlText', outputField: 'enrichment.enrichedXmlText',
    message: hadOutput ? 'Previous sideload and enriched InputXML artifacts were cleared after the input changed.' : 'Enrichment input changed.',
  }) });
}

export function inputXmlFrom5CResult(result = {}) {
  const text = clean(result.finalInputXmlText) || clean(result.coreInputXmlText);
  const count = Number(result?.diagnostics?.summary?.elementCount || 0);
  const detection = detectXmlWorkspaceSchema({ name: '5c-generated.input.xml', text });
  const ok = Boolean(text) && detection.kind === XML_WORKSPACE_KINDS.INPUT_XML && count > 0;
  return Object.freeze({ ok, text, detection, diagnostic: diagnostic({
    severity: ok ? 'OK' : 'ERROR', code: ok ? 'WORKSPACE_5C_INPUTXML_HANDOFF' : 'WORKSPACE_5C_HANDOFF_REJECTED',
    action: '5c-result', stage: 'xml-to-inputxml', outputField: 'enrichment.inputXmlText',
    outputKind: detection.kind, count, message: ok
      ? `Tab 3 generated ${count} InputXML element(s) and handed the artifact to Tab 2.`
      : 'Tab 3 result was not handed to Tab 2 because it was empty, zero-element, or not InputXML.',
  }) });
}

export function routeCleanXmlTo5C() {
  return Object.freeze({ activeTab: 'xml-to-inputxml', diagnostic: diagnostic({
    severity: 'INFO', code: 'WORKSPACE_ROUTE_TO_5C', action: 'use-cleanxml-enrichment', stage: 'routing',
    sourceKind: XML_WORKSPACE_KINDS.XML, outputKind: XML_WORKSPACE_KINDS.INPUT_XML,
    message: 'CleanXML is node-based XML. Convert it in Tab 3 before applying Tab 2 InputXML enrichment.',
  }) });
}

export const _test = Object.freeze({ clean, diagnostic });
