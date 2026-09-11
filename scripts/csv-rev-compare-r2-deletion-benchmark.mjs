import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { canonicalizeSupportRevisionSource } from '../tabs/csv-rev-compare/support-revision-pipeline.js';
import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { runTotalSupportPointChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase4-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);

execFileSync(process.execPath, ['tests/csv-rev-compare-support-type-projection.test.js'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tests/csv-rev-compare-common-support-replication.test.js'], { stdio: 'inherit' });

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const earlierSource = parseBenchmarkSource(earlier, 'BENCHMARK_R2');
const laterSource = parseBenchmarkSource(later, 'BENCHMARK_R3');
const expectedCommon = expectedRemarkKeys(laterSource, /\bReplicated\s+due\s+to\s+Common\s+support\b/i);
const expectedSupportType = expectedRemarkKeys(laterSource, /\bSupport\s+Type\s+Changes?\b/i);
const compare = runSupportRevisionCompare(sourceToCsv(earlierSource, true), sourceToCsv(laterSource, true));
if (!compare.exportReady) {
  console.error(JSON.stringify({ stage: compare.stage, diagnostics: compare.diagnostics }, null, 2));
  process.exit(3);
}

const detectedCommon = renderedTokenKeys(compare, 'COMMON_REPLICATED');
const detectedSupportType = renderedTokenKeys(compare, 'SUPPORT_TYPE_CHANGES');
const commonEvents = compare.ledger.events.filter((event) => event.type === 'COMMON_SUPPORT_REMARK_REPLICATED');
const legacyStructuralReplicationEvents = compare.ledger.events.filter((event) => event.type === 'COMMON_SUPPORT_REPLICATED');
const commonMetrics = metrics(expectedCommon, detectedCommon);
const supportTypeMetrics = metrics(expectedSupportType, detectedSupportType);

console.log('R3_COMMON_SUPPORT_REPLICATION_DIAGNOSTICS_START');
console.log(JSON.stringify({
  expectedCommonKeys: [...expectedCommon].sort(),
  renderedCommonKeys: [...detectedCommon].sort(),
  commonEventCount: commonEvents.length,
  legacyStructuralReplicationEventCount: legacyStructuralReplicationEvents.length,
}));
for (const key of [...new Set([...expectedCommon, ...detectedCommon])].sort()) {
  const target = compare.targetModel.locations.find((item) => item.supportLocationIdentity === key) || null;
  const edge = target ? compare.lineage.edges.find((item) => item.targetNodeIds?.includes(target.nodeId)) || null : null;
  const source = edge?.sourceNodeIds?.length === 1 ? compare.sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]) || null : null;
  const commonEvent = target
    ? commonEvents.find((event) => event.targetXmlNode === target.nodeId) || null
    : null;
  const generatedRemark = target ? compare.remarks.targetRemarks?.[target.sourceRowId]?.remark || '' : '';
  const directEvents = target
    ? compare.ledger.events.filter((event) => event.targetXmlNode === target.nodeId && event.type !== 'COMMON_SUPPORT_REMARK_REPLICATED')
    : [];
  const siblings = target
    ? compare.targetModel.locations
      .filter((item) => normalizePart(item.family) === normalizePart(target.family) && item.nodeId !== target.nodeId)
      .map((item) => ({
        key: item.supportLocationIdentity,
        rowId: item.sourceRowId,
        generatedRemark: compare.remarks.targetRemarks?.[item.sourceRowId]?.remark || '',
        persistentReferences: item.persistentReferences,
        components: simpleComponents(item),
        directEvents: compare.ledger.events
          .filter((event) => event.targetXmlNode === item.nodeId && event.type !== 'COMMON_SUPPORT_REMARK_REPLICATED')
          .map(simpleEvent),
      }))
    : [];
  console.log(JSON.stringify({
    classification: expectedCommon.has(key) ? (detectedCommon.has(key) ? 'TP' : 'FN') : 'FP',
    key,
    family: target?.family || '',
    pipe: target?.pipe?.raw || '',
    rowId: target?.sourceRowId || '',
    oracleRemark: oracleRemarkForKey(laterSource, key),
    generatedRemark,
    edge: edge ? {
      cardinality: edge.cardinality,
      outcome: edge.outcome,
      matchingMethod: edge.matchingMethod || '',
      persistentReferences: edge.persistentReferences || [],
      reasonCodes: edge.reasonCodes || [],
    } : null,
    source: simpleLocation(source),
    target: simpleLocation(target),
    sharedPersistentReferences: source && target ? source.persistentReferences.filter((ref) => target.persistentReferences.includes(ref)) : [],
    directEvents: directEvents.map(simpleEvent),
    replicationEvent: commonEvent ? {
      reasonCodes: commonEvent.reasonCodes || [],
      matchingMethod: commonEvent.matchingMethod || '',
      persistentReferences: commonEvent.persistentReferences || [],
      triggerSiblingNodeIds: commonEvent.normalizedState?.triggerSiblingNodeIds || [],
      triggerSiblingRowIds: commonEvent.normalizedState?.triggerSiblingRowIds || [],
      triggerRemarkEventIds: commonEvent.normalizedState?.triggerRemarkEventIds || [],
      ignoredAuditEventIds: commonEvent.trace?.ignoredAuditEventIds || [],
    } : null,
    sourceRowWithoutRemark: rawRowWithoutRemark(earlierSource, source?.sourceRowId),
    targetRowWithoutRemark: rawRowWithoutRemark(laterSource, target?.sourceRowId),
    siblings,
  }));
}
console.log('R3_COMMON_SUPPORT_REPLICATION_DIAGNOSTICS_END');

const guards = runTotalSupportPointChangeBenchmark(earlier, later);
const result = {
  commonSupportReplication: {
    ...commonMetrics,
    eventCount: commonEvents.length,
    legacyStructuralReplicationEventCount: legacyStructuralReplicationEvents.length,
  },
  supportTypeGuard: supportTypeMetrics,
  regressionGuards: {
    phase1: guards.phase1Guard.metrics,
    phase2KnownR1State: guards.phase2Guard.metrics,
    phase3: guards.phase3Guard.metrics,
    phase4: guards.metrics,
  },
};
console.log(JSON.stringify(result));

if (commonMetrics.falsePositives || commonMetrics.falseNegatives) process.exit(20);
if (supportTypeMetrics.falsePositives || supportTypeMetrics.falseNegatives) process.exit(24);
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

function expectedRemarkKeys(source, pattern) {
  return new Set((source?.rows || []).flatMap((row) => {
    const remark = String(row?.rawByHeader?.['REMARKS (IF ANY)'] ?? '');
    if (!pattern.test(remark)) return [];
    const civil = String(row?.rawByHeader?.CIVILSECONDARYSUPPORT ?? '').trim();
    const pipe = String(row?.rawByHeader?.PIPE ?? '').trim();
    return civil && pipe ? [supportLocationKey(civil, pipe)] : [];
  }));
}

function renderedTokenKeys(compareResult, tokenKey) {
  return new Set(compareResult.targetModel.locations.flatMap((target) => {
    const tokens = compareResult.remarks.targetRemarks?.[target.sourceRowId]?.tokens || [];
    return tokens.some((token) => token.key === tokenKey) ? [target.supportLocationIdentity] : [];
  }));
}

function metrics(expected, detected) {
  const truePositiveKeys = [...expected].filter((key) => detected.has(key)).sort();
  const falsePositiveKeys = [...detected].filter((key) => !expected.has(key)).sort();
  const falseNegativeKeys = [...expected].filter((key) => !detected.has(key)).sort();
  return {
    expected: expected.size,
    detected: detected.size,
    truePositives: truePositiveKeys.length,
    falsePositives: falsePositiveKeys.length,
    falseNegatives: falseNegativeKeys.length,
    precision: detected.size ? truePositiveKeys.length / detected.size : (expected.size ? 0 : 1),
    recall: expected.size ? truePositiveKeys.length / expected.size : 1,
    truePositiveKeys,
    falsePositiveKeys,
    falseNegativeKeys,
  };
}

function simpleComponents(location) {
  return (location?.components || []).map((component) => ({
    memberId: component.memberId || '',
    supportType: component.supportType || '',
    reference: component.reference || '',
    ordinal: component.ordinal || 0,
  }));
}

function simpleLocation(location) {
  if (!location) return null;
  return {
    nodeId: location.nodeId,
    rowId: location.sourceRowId,
    family: location.family,
    pipe: location.pipe?.raw || '',
    scope: location.scope || '',
    size: location.size || '',
    legacyIdentity: location.legacyIdentity || '',
    persistentReferences: location.persistentReferences || [],
    referenceMultiplicityKey: location.referenceMultiplicityKey || '',
    components: simpleComponents(location),
    position: location.position || null,
    sourceFields: location.sourceFields || {},
  };
}

function simpleEvent(event) {
  return {
    eventId: event.eventId,
    type: event.type,
    remarkEligible: event.remarkEligible,
    reasonCodes: event.reasonCodes || [],
    persistentReferences: event.persistentReferences || [],
    beforeRawState: event.beforeRawState || null,
    afterRawState: event.afterRawState || null,
    normalizedState: event.normalizedState || null,
  };
}

function rawRowWithoutRemark(source, rowId) {
  const row = (source?.rows || []).find((item) => item.rowId === rowId) || null;
  if (!row) return null;
  return Object.fromEntries(Object.entries(row.rawByHeader || {}).filter(([header]) => header !== 'REMARKS (IF ANY)'));
}

function oracleRemarkForKey(source, key) {
  const row = (source?.rows || []).find((item) => supportLocationKey(
    String(item?.rawByHeader?.CIVILSECONDARYSUPPORT ?? ''),
    String(item?.rawByHeader?.PIPE ?? ''),
  ) === key);
  return String(row?.rawByHeader?.['REMARKS (IF ANY)'] ?? '');
}

function supportLocationKey(civil, pipe) {
  return `${normalizePart(civil)}||${normalizePart(pipe)}`;
}

function normalizePart(value) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
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
