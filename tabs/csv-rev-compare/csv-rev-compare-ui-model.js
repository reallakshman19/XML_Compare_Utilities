import { SUPPORT_REVISION_WORKFLOW_STAGES } from './support-revision-engine.js';

export const CSV_REV_COMPARE_UI_SCHEMA = 'csv-rev-compare-ui/v1';

export function buildWorkflowState({ rev1Loaded = false, rev2Loaded = false, result = null } = {}) {
  const states = SUPPORT_REVISION_WORKFLOW_STAGES.map((label, index) => ({
    number: index + 1,
    label,
    status: 'PENDING',
    detail: '',
  }));
  states[0] = state(states[0], rev1Loaded ? 'COMPLETE' : 'WAITING', rev1Loaded ? 'Earlier revision loaded.' : 'Load or paste Revision 1.');
  states[1] = state(states[1], rev2Loaded ? 'COMPLETE' : 'WAITING', rev2Loaded ? 'Later revision loaded.' : 'Load or paste Revision 2.');
  if (!result) return Object.freeze(states.map(Object.freeze));
  if (result.stage === 'CONVERSION_BLOCKED') return conversionBlockedStates(states, result);

  for (let index = 2; index <= 6; index += 1) states[index] = state(states[index], 'COMPLETE');
  const reviewCount = Number(result.unresolvedReviews?.count || 0);
  states[7] = state(states[7], reviewCount ? 'ACTION_REQUIRED' : 'COMPLETE', reviewCount ? `${reviewCount} lineage review item(s) unresolved.` : 'No unresolved lineage review.');
  if (reviewCount) {
    for (let index = 8; index < states.length; index += 1) states[index] = state(states[index], 'BLOCKED', 'Resolve ambiguous lineage first.');
    return Object.freeze(states.map(Object.freeze));
  }
  for (let index = 8; index < states.length - 1; index += 1) states[index] = state(states[index], 'COMPLETE');
  states.at(-1).status = result.exportReady ? 'READY' : 'BLOCKED';
  states.at(-1).detail = result.exportReady ? 'CSV/XLSX and audit artifacts are ready.' : 'Export remains blocked.';
  return Object.freeze(states.map(Object.freeze));
}

function conversionBlockedStates(states, result) {
  const rev1Ok = Boolean(result.pair?.rev1?.ok);
  const rev2Ok = Boolean(result.pair?.rev2?.ok);
  states[2] = state(states[2], 'BLOCKED', 'Schema validation failed.');
  states[3] = state(states[3], rev1Ok ? 'COMPLETE' : 'BLOCKED');
  states[4] = state(states[4], rev2Ok ? 'COMPLETE' : 'BLOCKED');
  states[5] = state(states[5], 'ACTION_REQUIRED', 'Inspect conversion diagnostics.');
  for (let index = 6; index < states.length; index += 1) states[index] = state(states[index], 'BLOCKED', 'Conversion must succeed first.');
  return Object.freeze(states.map(Object.freeze));
}

function state(item, status, detail = '') {
  return { ...item, status, detail };
}

export function unresolvedReviewRows(result) {
  if (!result?.lineage) return Object.freeze([]);
  const candidates = (result.lineage.candidates || []).filter((item) => item.outcome === 'AMBIGUOUS').map((item) => Object.freeze({
    kind: 'candidate',
    id: item.candidateId,
    sourceNodeId: item.sourceNodeId,
    targetNodeId: item.targetNodeId,
    score: item.score,
    matchingMethod: item.matchingMethod,
    reasonCodes: Object.freeze([...(item.reasonCodes || [])]),
  }));
  const structural = (result.lineage.edges || []).filter((edge) => edge.outcome === 'AMBIGUOUS').map((edge) => Object.freeze({
    kind: 'structural',
    id: edge.edgeId,
    cardinality: edge.cardinality,
    sourceNodeIds: Object.freeze([...(edge.sourceNodeIds || [])]),
    targetNodeIds: Object.freeze([...(edge.targetNodeIds || [])]),
    matchingMethod: edge.matchingMethod,
    reasonCodes: Object.freeze([...(edge.reasonCodes || [])]),
  }));
  return Object.freeze([...candidates, ...structural]);
}

export function artifactDescriptor(result, kind) {
  const artifacts = result?.artifacts || {};
  const definitions = {
    csv: ['support-revision-compare.csv', artifacts.outputCsv, 'text/csv'],
    audit: ['support-revision-comparison-audit.json', artifacts.comparisonAuditJson, 'application/json'],
    rev1xml: ['support-revision-rev1.xml', artifacts.rev1Xml, 'application/xml'],
    rev2xml: ['support-revision-rev2.xml', artifacts.rev2Xml, 'application/xml'],
    rev1graph: ['support-revision-rev1-graph.json', artifacts.rev1GraphJson, 'application/json'],
    rev2graph: ['support-revision-rev2-graph.json', artifacts.rev2GraphJson, 'application/json'],
    profile: ['support-revision-csv-xml-v1.json', artifacts.profileJson, 'application/json'],
  };
  const row = definitions[kind];
  return row && row[1] != null ? Object.freeze({ name: row[0], content: row[1], type: row[2] }) : null;
}

export function comparisonSummary(result) {
  if (!result) return Object.freeze({ stage: 'WAITING', message: 'Load both revisions to begin.' });
  if (result.stage === 'CONVERSION_BLOCKED') return Object.freeze({ stage: result.stage, message: 'Conversion blocked. Inspect table schema and conversion diagnostics.' });
  if (!result.exportReady) return Object.freeze({ stage: result.stage, message: `${result.unresolvedReviews?.count || 0} lineage review item(s) require an explicit decision.` });
  return Object.freeze({
    stage: result.stage,
    message: `${result.ledger?.events?.length || 0} structured event(s); revision output is ready.`,
  });
}

export const _test = Object.freeze({ conversionBlockedStates, state });
