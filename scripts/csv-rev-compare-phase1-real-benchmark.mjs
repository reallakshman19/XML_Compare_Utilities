import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runTotalSupportPointChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase4-benchmark.js';
import { runSupportLocationChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase2-benchmark.js';

const [earlierPath, laterPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) process.exit(2);
for (const test of [
  'tests/csv-rev-compare-events.test.js',
  'tests/csv-rev-compare-phase2-support-location-change.test.js',
  'tests/csv-rev-compare-phase3-load-change.test.js',
  'tests/csv-rev-compare-phase4-total-support-points.test.js',
]) execFileSync(process.execPath, [test], { stdio: 'inherit' });

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runTotalSupportPointChangeBenchmark(earlier, later);
const phase2 = runSupportLocationChangeBenchmark(earlier, later);
console.log(JSON.stringify({
  phase1Metrics: result.phase1Guard.metrics,
  phase2Metrics: result.phase2Guard.metrics,
  phase3Metrics: result.phase3Guard.metrics,
  phase4Metrics: result.metrics,
  phase2SemanticTrace: semanticTrace(phase2),
}, null, 2));

if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (!result.phase2Guard.metrics.expected) process.exit(8);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.phase3Guard.metrics.falsePositives || result.phase3Guard.metrics.falseNegatives) process.exit(6);
if (result.metrics.falsePositives || result.metrics.falseNegatives) process.exit(7);
process.exit(0);

function semanticTrace(phase2) {
  const m = phase2.metrics;
  const classes = new Map([
    ...(m.truePositiveKeys || []).map((key) => [key, 'TP']),
    ...(m.falsePositiveKeys || []).map((key) => [key, 'FP']),
    ...(m.falseNegativeKeys || []).map((key) => [key, 'FN']),
  ]);
  const compare = phase2.compareResult;
  return [...classes].sort(([a], [b]) => a.localeCompare(b)).map(([key, classification]) => {
    const target = (compare?.targetModel?.locations || []).find((item) => item.supportLocationIdentity === key) || null;
    const edge = target ? (compare?.lineage?.edges || []).find((item) => item.targetNodeIds?.includes(target.nodeId)) || null : null;
    const source = edge?.sourceNodeIds?.length === 1 ? compare?.sourceModel?.locationByNodeId?.get(edge.sourceNodeIds[0]) : null;
    return {
      class: classification,
      key,
      method: edge?.matchingMethod || null,
      source: summarize(source),
      target: summarize(target),
      changedSourceFields: changedFields(source?.sourceFields, target?.sourceFields),
      componentDelta: {
        source: (source?.components || []).map(c => ({ memberId:c.memberId, supportType:c.supportType, reference:c.reference })),
        target: (target?.components || []).map(c => ({ memberId:c.memberId, supportType:c.supportType, reference:c.reference })),
      },
    };
  });
}
function summarize(location) {
  if (!location) return null;
  const fields = location.sourceFields || {};
  return {
    family: location.family,
    familyClass: location.familyClass,
    legacyIdentity: location.legacyIdentity,
    scope: location.scope,
    size: location.size,
    pipe: location.pipe?.raw,
    pipeCore: location.pipe?.normalizedCore,
    prevName: fields.prevName ?? fields['PREV NAME'] ?? '',
    totalSupportPoints: fields.totalSupportPoints ?? fields['TOTAL SUPPORT POINTS ON SECONDARY'] ?? '',
    primarySupportDescription: fields.primarySupportDescription ?? '',
    primarySupportZone: fields.primarySupportZone ?? '',
    primarySupportSite: fields.primarySupportSite ?? '',
    pipeSchedule: fields.pipeSchedule ?? '',
    insulation: fields.insulation ?? '',
    stressSystemNumber: fields.stressSystemNumber ?? '',
    nodeNo: fields.nodeNo ?? '',
    sourceFields: Object.fromEntries(Object.entries(fields).filter(([k]) => !/remark/i.test(k))),
  };
}
function changedFields(before={}, after={}) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(k => !/remark/i.test(k) && String(before[k] ?? '').trim() !== String(after[k] ?? '').trim())
    .map(k => ({ field:k, before:before[k] ?? '', after:after[k] ?? '' }));
}
