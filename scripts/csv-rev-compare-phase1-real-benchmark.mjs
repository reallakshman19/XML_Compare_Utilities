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
  coordinateFrame: {
    status: frame.status,
    anchorCount: frame.anchorCount,
    anchorBasis: frame.anchorBasis,
    scoreFrameUsable: frame.scoreFrameUsable,
    axes: frame.axes,
  },
  phase2CompactTrace: compactTrace(phase2),
}, null, 2));

if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (!result.phase2Guard.metrics.expected) process.exit(8);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.phase3Guard.metrics.falsePositives || result.phase3Guard.metrics.falseNegatives) process.exit(6);
if (result.metrics.falsePositives || result.metrics.falseNegatives) process.exit(7);
process.exit(0);

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
    const sources = (edge?.sourceNodeIds || []).map((id) => compare?.sourceModel?.locationByNodeId?.get(id)).filter(Boolean);
    const targetEvents = target ? (compare?.ledger?.events || []).filter((event) => event.targetXmlNode === target.nodeId) : [];
    const relocation = targetEvents.find((event) => event.type === 'SUPPORT_LOCATION_RELOCATED' || event.type === 'COMMON_SUPPORT_ANCHOR_RELOCATED') || null;
    const refs = new Set(target?.persistentReferences || []);
    const sourceSummaries = sources.map((source) => {
      const overlap = (source.persistentReferences || []).filter((ref) => refs.has(ref));
      const coord = (edge?.coordinateEvidence || []).find((item) => item.sourceNodeId === source.nodeId && item.targetNodeId === target?.nodeId) || null;
      return {
        id: source.nodeId,
        key: source.supportLocationIdentity,
        identityExact: source.supportLocationIdentity === target?.supportLocationIdentity,
        familyEqual: source.family === target?.family,
        pipeCoreEqual: source.pipe?.normalizedCore === target?.pipe?.normalizedCore,
        refCount: source.persistentReferences?.length || 0,
        overlapCount: overlap.length,
        refSetExact: source.referenceMultiplicityKey === target?.referenceMultiplicityKey,
        delta: coord?.deltas || null,
        residualMm: coord?.residualMm ?? null,
        coordClass: coord?.classification || null,
      };
    });
    return {
      class: classification,
      key,
      targetNode: target?.nodeId || null,
      edge: edge ? {
        id: edge.edgeId,
        cardinality: edge.cardinality,
        outcome: edge.outcome,
        method: edge.matchingMethod,
        reviewDecision: edge.reviewDecision || null,
        sourceCount: edge.sourceNodeIds?.length || 0,
        targetCount: edge.targetNodeIds?.length || 0,
        reasonCodes: edge.reasonCodes || [],
      } : null,
      targetRefCount: target?.persistentReferences?.length || 0,
      sources: sourceSummaries,
      events: targetEvents.map((event) => event.type),
      relocation: relocation ? {
        type: relocation.type,
        validatedAxes: relocation.normalizedState?.validatedAxes || [],
        validatedDeltas: relocation.coordinateResidual?.validatedDeltas || null,
        residualMm: relocation.coordinateResidual?.validatedResidualMm ?? relocation.coordinateResidual?.residualMm ?? null,
      } : null,
    };
  });
}
