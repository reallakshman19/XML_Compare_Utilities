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
]) {
  execFileSync(process.execPath, [test], { stdio: 'inherit' });
}

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runTotalSupportPointChangeBenchmark(earlier, later);
const phase2 = runSupportLocationChangeBenchmark(earlier, later);

console.log(JSON.stringify({
  phase1Metrics: result.phase1Guard.metrics,
  phase2Metrics: result.phase2Guard.metrics,
  phase3Metrics: result.phase3Guard.metrics,
  phase4Metrics: result.metrics,
  phase4Unsupported: result.unsupported,
  phase2MismatchTrace: tracePhase2Mismatches(phase2),
}, null, 2));

if (!result.compareOk || result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);
if (result.phase1Guard.metrics.falsePositives || result.phase1Guard.metrics.falseNegatives) process.exit(4);
if (!result.phase2Guard.metrics.expected) process.exit(8);
if (result.phase2Guard.metrics.falsePositives || result.phase2Guard.metrics.falseNegatives) process.exit(5);
if (result.phase3Guard.metrics.falsePositives || result.phase3Guard.metrics.falseNegatives) process.exit(6);
if (result.metrics.falsePositives || result.metrics.falseNegatives) process.exit(7);
process.exit(0);

function tracePhase2Mismatches(phase2) {
  const metric = phase2.metrics;
  const expected = new Set(metric.falseNegativeKeys || []);
  const detected = new Set(metric.falsePositiveKeys || []);
  const keys = [...new Set([...expected, ...detected])].sort();
  const compare = phase2.compareResult;
  return keys.map((key) => {
    const target = (compare?.targetModel?.locations || []).find((item) => item.supportLocationIdentity === key) || null;
    const edge = target ? (compare?.lineage?.edges || []).find((item) => item.targetNodeIds?.includes(target.nodeId)) || null : null;
    const sources = (edge?.sourceNodeIds || []).map((id) => compare?.sourceModel?.locationByNodeId?.get(id)).filter(Boolean);
    const targetEvents = target ? (compare?.ledger?.events || []).filter((event) => event.targetXmlNode === target.nodeId) : [];
    const candidates = target ? (compare?.lineage?.candidates || []).filter((candidate) => candidate.targetNodeId === target.nodeId) : [];
    return {
      key,
      class: expected.has(key) ? 'FALSE_NEGATIVE' : 'FALSE_POSITIVE',
      target: summarizeLocation(target),
      sources: sources.map(summarizeLocation),
      edge: edge ? {
        edgeId: edge.edgeId,
        cardinality: edge.cardinality,
        outcome: edge.outcome,
        matchingMethod: edge.matchingMethod,
        reviewDecision: edge.reviewDecision,
        reasonCodes: edge.reasonCodes,
        persistentReferences: edge.persistentReferences,
        sourceNodeIds: edge.sourceNodeIds,
        targetNodeIds: edge.targetNodeIds,
        coordinateEvidence: (edge.coordinateEvidence || []).filter((item) => item.targetNodeId === target?.nodeId),
        candidateIds: edge.candidateIds,
      } : null,
      candidateEvidence: candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        sourceNodeId: candidate.sourceNodeId,
        targetNodeId: candidate.targetNodeId,
        score: candidate.score,
        outcome: candidate.outcome,
        reasonCodes: candidate.reasonCodes,
        persistentReferences: candidate.persistentReferences,
        coordinateEvidence: candidate.coordinateEvidence,
      })),
      targetEvents: targetEvents.map((event) => ({
        type: event.type,
        sourceXmlNode: event.sourceXmlNode,
        targetXmlNode: event.targetXmlNode,
        reasonCodes: event.reasonCodes,
        persistentReferences: event.persistentReferences,
        coordinateResidual: event.coordinateResidual,
        normalizedState: event.normalizedState,
      })),
    };
  });
}

function summarizeLocation(location) {
  if (!location) return null;
  return {
    nodeId: location.nodeId,
    sourceRowId: location.sourceRowId,
    supportLocationIdentity: location.supportLocationIdentity,
    family: location.family,
    familyClass: location.familyClass,
    pipe: location.pipe?.raw,
    position: location.position,
    persistentReferences: location.persistentReferences,
    referenceMultiplicityKey: location.referenceMultiplicityKey,
    scope: location.scope,
    size: location.size,
  };
}
