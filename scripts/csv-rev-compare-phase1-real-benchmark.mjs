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
console.log('PHASE2_SEMANTIC_TRACE_START');
for (const row of semanticTrace(phase2)) console.log(JSON.stringify(row));
console.log('PHASE2_SEMANTIC_TRACE_END');
console.log(JSON.stringify({phase1:result.phase1Guard.metrics, phase2:result.phase2Guard.metrics, phase3:result.phase3Guard.metrics, phase4:result.metrics}));

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
  return [...classes].sort(([a],[b]) => a.localeCompare(b)).map(([key, classification]) => {
    const target = compare.targetModel.locations.find((item) => item.supportLocationIdentity === key) || null;
    const edge = target ? compare.lineage.edges.find((item) => item.targetNodeIds?.includes(target.nodeId)) || null : null;
    const source = edge?.sourceNodeIds?.length === 1 ? compare.sourceModel.locationByNodeId.get(edge.sourceNodeIds[0]) : null;
    return {
      c: classification, k: key, method: edge?.matchingMethod || '',
      srow: source?.sourceRowId || '', trow: target?.sourceRowId || '',
      sfam: source?.family || '', tfam: target?.family || '',
      slegacy: source?.legacyIdentity || '', tlegacy: target?.legacyIdentity || '',
      sscope: source?.scope || '', tscope: target?.scope || '',
      ssize: source?.size || '', tsize: target?.size || '',
      stotal: source?.sourceFields?.totalSupportPoints || '', ttotal: target?.sourceFields?.totalSupportPoints || '',
      sdesc: source?.sourceFields?.primarySupportDescription || '', tdesc: target?.sourceFields?.primarySupportDescription || '',
      szone: source?.sourceFields?.primarySupportZone || '', tzone: target?.sourceFields?.primarySupportZone || '',
      ssite: source?.sourceFields?.primarySupportSite || '', tsite: target?.sourceFields?.primarySupportSite || '',
      snode: source?.sourceFields?.nodeNo || '', tnode: target?.sourceFields?.nodeNo || '',
      srefs: source?.persistentReferences || [], trefs: target?.persistentReferences || [],
      smembers: (source?.components || []).map(c => `${c.memberId}|${c.supportType}|${c.reference}`),
      tmembers: (target?.components || []).map(c => `${c.memberId}|${c.supportType}|${c.reference}`),
    };
  });
}
