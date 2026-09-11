import fs from 'node:fs';

import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { canonicalizeSupportRevisionSource } from '../tabs/csv-rev-compare/support-revision-pipeline.js';
import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { runTotalSupportPointChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase4-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const earlierSource = parseBenchmarkSource(earlier, 'BENCHMARK_R2');
const laterSource = parseBenchmarkSource(later, 'BENCHMARK_R3');
const expected = expectedSupportTypeKeys(laterSource);
const compare = runSupportRevisionCompare(sourceToCsv(earlierSource, true), sourceToCsv(laterSource, true));
if (!compare.exportReady) {
  console.error(JSON.stringify({ stage: compare.stage, diagnostics: compare.diagnostics }, null, 2));
  process.exit(3);
}

const supportTypeEvents = compare.ledger.events.filter((event) =>
  event.remarkEligible === true
  && ['SUPPORT_COMPONENT_SET_CHANGED', 'SUPPORT_COMPONENT_TYPE_CHANGED'].includes(event.type)
  && event.targetXmlNode
);
const detected = new Set(supportTypeEvents.flatMap((event) => {
  const target = compare.targetModel.locationByNodeId.get(event.targetXmlNode);
  return target ? [target.supportLocationIdentity] : [];
}));
const truePositiveKeys = [...expected].filter((key) => detected.has(key)).sort();
const falsePositiveKeys = [...detected].filter((key) => !expected.has(key)).sort();
const falseNegativeKeys = [...expected].filter((key) => !detected.has(key)).sort();

console.log('R3_SUPPORT_TYPE_DIAGNOSTICS_START');
for (const key of [...new Set([...expected, ...detected])].sort()) {
  const target = compare.targetModel.locations.find((item) => item.supportLocationIdentity === key) || null;
  const edge = target ? compare.lineage.edges.find((item) => item.targetNodeIds?.includes(target.nodeId)) || null : null;
  const source = edge?.sourceNodeIds?.length === 1 ? compare.sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]) || null : null;
  const pairEvents = source && target
    ? compare.ledger.events.filter((event) => event.sourceXmlNode === source.nodeId && event.targetXmlNode === target.nodeId)
    : [];
  const componentEvents = pairEvents.filter((event) => ['SUPPORT_COMPONENT_SET_CHANGED', 'SUPPORT_COMPONENT_TYPE_CHANGED', 'PRIMARY_MEMBER_RENUMBERED'].includes(event.type));
  console.log(JSON.stringify({
    classification: expected.has(key) ? (detected.has(key) ? 'TP' : 'FN') : 'FP',
    key,
    sourceRowId: source?.sourceRowId || '',
    targetRowId: target?.sourceRowId || '',
    edge: edge ? {
      cardinality: edge.cardinality,
      outcome: edge.outcome,
      matchingMethod: edge.matchingMethod,
      persistentReferences: edge.persistentReferences || [],
      reasonCodes: edge.reasonCodes || [],
    } : null,
    sourceComponents: simpleComponents(source),
    targetComponents: simpleComponents(target),
    componentEvents: componentEvents.map((event) => ({
      type: event.type,
      remarkEligible: event.remarkEligible,
      persistentReferences: event.persistentReferences || [],
      reasonCodes: event.reasonCodes || [],
      normalizedState: event.normalizedState || null,
      beforeRawState: event.beforeRawState || null,
      afterRawState: event.afterRawState || null,
    })),
    allPairEventTypes: pairEvents.map((event) => event.type).sort(),
  }));
}
console.log('R3_SUPPORT_TYPE_DIAGNOSTICS_END');

const guards = runTotalSupportPointChangeBenchmark(earlier, later);
const result = {
  supportType: {
    expected: expected.size,
    detected: detected.size,
    truePositives: truePositiveKeys.length,
    falsePositives: falsePositiveKeys.length,
    falseNegatives: falseNegativeKeys.length,
    truePositiveKeys,
    falsePositiveKeys,
    falseNegativeKeys,
  },
  regressionGuards: {
    phase1: guards.phase1Guard.metrics,
    phase2KnownR1State: guards.phase2Guard.metrics,
    phase3: guards.phase3Guard.metrics,
    phase4: guards.metrics,
  },
};
console.log(JSON.stringify(result));

if (falsePositiveKeys.length || falseNegativeKeys.length) process.exit(20);
if (guards.phase1Guard.metrics.falsePositives || guards.phase1Guard.metrics.falseNegatives) process.exit(21);
if (guards.phase3Guard.metrics.falsePositives || guards.phase3Guard.metrics.falseNegatives) process.exit(22);
if (guards.metrics.falsePositives || guards.metrics.falseNegatives) process.exit(23);
process.exit(0);

function parseBenchmarkSource(text, sourceId) {
  return canonicalizeSupportRevisionSource(parseTableSource(text, {
    sourceId,
    sourceName: sourceId,
    sourceType: 'benchmarkText',
    delimiterMode: 'auto',
    firstRowIsHeader: true,
  }));
}

function expectedSupportTypeKeys(source) {
  return new Set((source?.rows || []).flatMap((row) => {
    const remark = String(row?.rawByHeader?.['REMARKS (IF ANY)'] ?? '');
    if (!/\bSupport\s+Type\s+Changes?\b/i.test(remark)) return [];
    const civil = String(row?.rawByHeader?.CIVILSECONDARYSUPPORT ?? '').trim();
    const pipe = String(row?.rawByHeader?.PIPE ?? '').trim();
    return civil && pipe ? [`${civil}||${pipe}`] : [];
  }));
}

function sourceToCsv(source, blankRemarks) {
  const headers = [...(source?.headers || [])];
  const remarkIndexes = headers.flatMap((header, index) => header === 'REMARKS (IF ANY)' ? [index] : []);
  const rows = (source?.rows || []).map((row) => (row.rawCells || []).map((value, index) => blankRemarks && remarkIndexes.includes(index) ? '' : value));
  return [headers, ...rows].map((cells) => cells.map(csvCell).join(',')).join('\n');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function simpleComponents(location) {
  return (location?.components || []).map((component) => ({
    memberId: component.memberId || '',
    supportType: component.supportType || '',
    supportTypeKey: component.supportTypeKey || '',
    reference: component.reference || '',
    ordinal: component.ordinal || 0,
  }));
}
