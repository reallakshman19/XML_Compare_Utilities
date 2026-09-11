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
const frame = phase2.compareResult?.lineage?.coordinateFrame || {};
console.log(JSON.stringify({
  phase1Metrics: result.phase1Guard.metrics,
  phase2Metrics: result.phase2Guard.metrics,
  phase3Metrics: result.phase3Guard.metrics,
  phase4Metrics: result.metrics,
  coordinateFrame: { status: frame.status, anchorCount: frame.anchorCount, anchorBasis: frame.anchorBasis, scoreFrameUsable: frame.scoreFrameUsable, axes: frame.axes },
  phase2CompactTrace: compactTrace(phase2),
}, null, 2));

if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (!result.phase2Guard.metrics.expected) process.exit(8);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.phase3Guard.metrics.falsePositives || result.phase3Guard.metrics.falseNegatives) process.exit(6);
if (result.metrics.falsePositives || result.metrics.falseNegatives) process.exit(7);
process.exit(0);

function position(location) {
  return Object.fromEntries(['x','y','z'].map((axis) => [axis, {
    raw: location?.position?.[axis]?.raw || '',
    directedMm: location?.position?.[axis]?.directedMm ?? null,
    direction: location?.position?.[axis]?.direction || '',
    explicitSign: location?.position?.[axis]?.explicitSign ?? 0,
  }]));
}
function compactTrace(phase2) {
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
    const targetEvents = target ? (compare?.ledger?.events || []).filter((event) => event.targetXmlNode === target.nodeId) : [];
    const coord = source ? (edge?.coordinateEvidence || []).find((item) => item.sourceNodeId === source.nodeId && item.targetNodeId === target?.nodeId) || null : null;
    return {
      class: classification,
      key,
      method: edge?.matchingMethod || null,
      identityExact: source?.supportLocationIdentity === target?.supportLocationIdentity,
      sourcePosition: position(source),
      targetPosition: position(target),
      rawDeltas: Object.fromEntries(['x','y','z'].map((axis) => [axis,
        Number.isFinite(source?.position?.[axis]?.directedMm) && Number.isFinite(target?.position?.[axis]?.directedMm)
          ? target.position[axis].directedMm - source.position[axis].directedMm : null])),
      framedDeltas: coord?.deltas || null,
      sourceRefs: source?.persistentReferences || [],
      targetRefs: target?.persistentReferences || [],
      events: targetEvents.map((event) => event.type),
    };
  });
}
