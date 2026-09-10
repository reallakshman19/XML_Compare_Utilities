import fs from 'node:fs';
import { runPsNoChangeBenchmark } from '../tabs/csv-rev-compare/support-revision-phase1-benchmark.js';

const [earlierPath, laterPath, outputPath] = process.argv.slice(2);
if (!earlierPath || !laterPath) {
  console.error('usage: node scripts/csv-rev-compare-phase1-real-benchmark.mjs R2.csv R3.csv [output.json]');
  process.exit(2);
}

const earlier = fs.readFileSync(earlierPath, 'utf8');
const later = fs.readFileSync(laterPath, 'utf8');
const result = runPsNoChangeBenchmark(earlier, later);
const summary = {
  schema: result.schema,
  bucket: result.bucket,
  compareStage: result.compareStage,
  compareOk: result.compareOk,
  metrics: result.metrics,
  expectedItems: result.expected,
  detectedItems: result.detected,
  mismatchDiagnostics: mismatchDiagnostics(result),
};

const json = JSON.stringify(summary, null, 2);
console.log(json);
if (outputPath) fs.writeFileSync(outputPath, `${json}\n`, 'utf8');
if (result.compareStage === 'CONVERSION_BLOCKED') process.exit(3);

function mismatchDiagnostics(result) {
  const compare = result.compareResult;
  if (!compare?.sourceModel || !compare?.targetModel) return null;
  const falseNegativeKeys = new Set(result.metrics.falseNegativeKeys || []);
  const falsePositiveKeys = new Set(result.metrics.falsePositiveKeys || []);
  return {
    falseNegatives: result.expected.filter((item) => falseNegativeKeys.has(item.key)).map((item) => diagnoseTarget(item, compare)),
    falsePositives: result.detected.filter((item) => falsePositiveKeys.has(item.key)).map((item) => diagnoseTarget(item, compare)),
    unresolvedAmbiguities: (compare.lineage?.ambiguous || []).length,
  };
}

function diagnoseTarget(item, compare) {
  const target = compare.targetModel.locations.find((location) => location.supportLocationIdentity === item.key) || null;
  if (!target) return { item, target: null, candidates: [], sourceAlternatives: [], edges: [] };
  const rawCandidates = (compare.lineage?.candidates || [])
    .filter((candidate) => candidate.targetNodeId === target.nodeId)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const candidates = rawCandidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    outcome: candidate.outcome,
    score: candidate.score,
    matchingMethod: candidate.matchingMethod,
    reasonCodes: candidate.reasonCodes,
    persistentReferences: candidate.persistentReferences,
    source: locationSummary(compare.sourceModel.locationByNodeId.get(candidate.sourceNodeId)),
  }));
  const sourceAlternatives = rawCandidates.map((candidate) => ({
    source: locationSummary(compare.sourceModel.locationByNodeId.get(candidate.sourceNodeId)),
    targets: (compare.lineage?.candidates || [])
      .filter((row) => row.sourceNodeId === candidate.sourceNodeId)
      .sort((a, b) => b.score - a.score || a.targetNodeId.localeCompare(b.targetNodeId))
      .slice(0, 8)
      .map((row) => ({
        candidateId: row.candidateId,
        outcome: row.outcome,
        score: row.score,
        matchingMethod: row.matchingMethod,
        reasonCodes: row.reasonCodes,
        persistentReferences: row.persistentReferences,
        target: locationSummary(compare.targetModel.locationByNodeId.get(row.targetNodeId)),
      })),
  }));
  const edges = (compare.lineage?.edges || [])
    .filter((edge) => edge.targetNodeIds.includes(target.nodeId))
    .map((edge) => ({
      edgeId: edge.edgeId,
      cardinality: edge.cardinality,
      outcome: edge.outcome,
      matchingMethod: edge.matchingMethod,
      reasonCodes: edge.reasonCodes,
      persistentReferences: edge.persistentReferences,
      sources: edge.sourceNodeIds.map((nodeId) => locationSummary(compare.sourceModel.locationByNodeId.get(nodeId))),
    }));
  return { item, target: locationSummary(target), candidates, sourceAlternatives, edges };
}

function locationSummary(location) {
  if (!location) return null;
  return {
    nodeId: location.nodeId,
    rowId: location.sourceRowId,
    identity: location.supportLocationIdentity,
    family: location.family,
    prevName: location.legacyIdentity,
    pipe: location.pipe.raw,
    pipeCore: location.pipe.normalizedCore,
    references: location.persistentReferences,
    position: Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, location.position?.[axis]?.raw || ''])),
  };
}
