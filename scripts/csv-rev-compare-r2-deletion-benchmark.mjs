import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { canonicalizeSupportRevisionSource } from '../tabs/csv-rev-compare/support-revision-pipeline.js';
import { runSupportRevisionCompare } from '../tabs/csv-rev-compare/support-revision-engine.js';
import { runTotalSupportPointChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase4-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);

execFileSync(process.execPath, ['tests/csv-rev-compare-support-type-projection.test.js'], { stdio: 'inherit' });

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

const detected = new Set(compare.targetModel.locations.flatMap((target) => {
  const tokens = compare.remarks.targetRemarks?.[target.sourceRowId]?.tokens || [];
  return tokens.some((token) => token.key === 'SUPPORT_TYPE_CHANGES') ? [target.supportLocationIdentity] : [];
}));
const structuralSetChangeKeys = eventTargetKeys(compare, 'SUPPORT_COMPONENT_SET_CHANGED');
const actualTypeChangeKeys = eventTargetKeys(compare, 'SUPPORT_COMPONENT_TYPE_CHANGED');
const truePositiveKeys = [...expected].filter((key) => detected.has(key)).sort();
const falsePositiveKeys = [...detected].filter((key) => !expected.has(key)).sort();
const falseNegativeKeys = [...expected].filter((key) => !detected.has(key)).sort();

console.log('R3_SUPPORT_TYPE_FINAL_DIAGNOSTICS_START');
console.log(JSON.stringify({
  expectedKeys: [...expected].sort(),
  renderedDetectedKeys: [...detected].sort(),
  structuralSetChangeKeys: [...structuralSetChangeKeys].sort(),
  actualTypeChangeKeys: [...actualTypeChangeKeys].sort(),
}));
for (const key of [...structuralSetChangeKeys].sort()) {
  const target = compare.targetModel.locations.find((item) => item.supportLocationIdentity === key) || null;
  const edge = target ? compare.lineage.edges.find((item) => item.targetNodeIds?.includes(target.nodeId)) || null : null;
  const source = edge?.sourceNodeIds?.length === 1 ? compare.sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]) || null : null;
  const pairEvents = source && target
    ? compare.ledger.events.filter((event) => event.sourceXmlNode === source.nodeId && event.targetXmlNode === target.nodeId)
    : [];
  console.log(JSON.stringify({
    key,
    renderedSupportType: detected.has(key),
    oracleExpectedSupportType: expected.has(key),
    matchingMethod: edge?.matchingMethod || '',
    sharedPersistentReferences: source && target
      ? source.persistentReferences.filter((reference) => target.persistentReferences.includes(reference)).sort()
      : [],
    sourceComponents: simpleComponents(source),
    targetComponents: simpleComponents(target),
    componentEventTypes: pairEvents
      .filter((event) => ['SUPPORT_COMPONENT_SET_CHANGED','SUPPORT_COMPONENT_TYPE_CHANGED','PRIMARY_MEMBER_RENUMBERED'].includes(event.type))
      .map((event) => event.type),
  }));
}
console.log('R3_SUPPORT_TYPE_FINAL_DIAGNOSTICS_END');

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
    structuralSetChangeCount: structuralSetChangeKeys.size,
    actualTypeChangeCount: actualTypeChangeKeys.size,
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
if (expected.size !== 0 || detected.size !== 0) process.exit(24);
if (structuralSetChangeKeys.size < 1) process.exit(25);
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

function eventTargetKeys(compareResult, eventType) {
  return new Set(compareResult.ledger.events.flatMap((event) => {
    if (event.type !== eventType || !event.targetXmlNode) return [];
    const target = compareResult.targetModel.locationByNodeId.get(event.targetXmlNode);
    return target ? [target.supportLocationIdentity] : [];
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
    reference: component.reference || '',
  }));
}
