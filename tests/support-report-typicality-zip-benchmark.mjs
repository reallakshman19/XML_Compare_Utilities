import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import {
  parseSupportReportClashXml,
} from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js';
import { buildSupportReportBundle } from '../tabs/support-steel-relationship-builder/support-report-engine.js';
import {
  buildSupportReportTypicalityComparison,
  SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
} from '../tabs/support-steel-relationship-builder/support-report-typicality-projection.js';
import { extractStructuralFamilyFeatures } from '../tabs/support-steel-relationship-builder/support-report-typicality.js';

const [leftRoot, rightRoot, outputPath = '/tmp/typicality-zip-benchmark.json'] = process.argv.slice(2);
if (!leftRoot || !rightRoot) {
  throw new Error('Usage: node support-report-typicality-zip-benchmark.mjs <leftDir> <rightDir> [outputJson]');
}

function xmlFiles(root) {
  const out = [];
  function walk(path) {
    for (const name of readdirSync(path)) {
      const full = join(path, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.xml$/iu.test(name)) out.push(full);
    }
  }
  walk(root);
  return out.sort();
}

function signal(comparison, code) {
  return comparison?.signals?.find((item) => item.reasonCode === code) || null;
}

function loadXml(path, root) {
  const text = readFileSync(path, 'utf8');
  const evidence = parseSupportReportClashXml(text);
  const report = buildSupportReportBundle({ clashEvidence: evidence });
  const families = extractStructuralFamilyFeatures(evidence);
  return {
    path,
    name: relative(root, path),
    evidence,
    report,
    familyInventory: families.map((family) => ({
      familyId: family.familyId,
      locationCount: family.locationCount,
      numericPrimarySupportMemberCount: family.numericPrimarySupportMemberCount,
      memberMultiplicitySpectrum: family.memberMultiplicitySpectrum,
      normalizedPipeClassPopulation: family.normalizedPipeClassPopulation,
      rawClashPointCount: family.rawClashPointCount,
      envelopeSpanMm: family.geometryEnvelopeMm?.span || null,
      pairDistanceCount: family.pairDistanceSpectrumMm.length,
    })),
  };
}

function selectedPairSummary(pair) {
  const sequence = pair?.signals?.structuredSequence || {};
  return {
    leftLocationId: pair.leftLocationId,
    rightLocationId: pair.rightLocationId,
    arrangementResult: pair.arrangementResult,
    assignmentCost3d: pair.assignmentCost,
    assignmentCost2d: pair.assignmentCost2d ?? null,
    assignmentCost1d: pair.assignmentCost1d ?? null,
    firstPassingDimension: sequence.firstPassingDimension || null,
    supportTypeResult: pair.supportTypeComparison?.result || 'UNAVAILABLE',
    supportTypeReasonCodes: pair.supportTypeComparison?.reasonCodes || [],
    memberOrdinalResult: pair.signals?.memberOrdinalPattern?.result || 'UNAVAILABLE',
    memberOrdinalSimilarity: pair.signals?.memberOrdinalPattern?.similarity ?? null,
    prevNameClass: pair.signals?.previousNamePattern?.class || 'UNAVAILABLE',
    prevNameSimilarity: pair.signals?.previousNamePattern?.similarity ?? null,
    prevNameMask: pair.signals?.previousNamePattern?.wildcardMask || '',
    pipeClassReasonCode: pair.signals?.pipeClass?.reasonCode || '',
    geometryResidual: pair.signals?.geometry?.residual || null,
  };
}

function summarizeComparison(left, right) {
  const audit = buildSupportReportTypicalityComparison(left.evidence, right.evidence, {
    leftReportBundle: left.report,
    rightReportBundle: right.report,
    profile: SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
  });
  const assignmentByFamily = new Map((audit.locationAssignments || []).map((item) => [
    `${item.leftFamilyId}\u0000${item.rightFamilyId}`,
    item,
  ]));

  return {
    leftXml: left.name,
    rightXml: right.name,
    profileId: audit.profileId,
    familyMatches: (audit.matches || []).map((match) => {
      const assignment = assignmentByFamily.get(`${match.leftFamilyId}\u0000${match.rightFamilyId}`) || null;
      return {
        leftFamilyId: match.leftFamilyId,
        rightFamilyId: match.rightFamilyId || '',
        result: match.result,
        reasonCode: match.reasonCode,
        locationAssignmentResult: match.locationAssignmentResult || assignment?.result || null,
        correspondenceStatus: match.locationCorrespondenceStatus || assignment?.correspondenceStatus || null,
        matchingMode: match.locationMatchingMode || assignment?.matchingMode || null,
        selectedCount: assignment?.selectedAssignments?.length || 0,
        unmatchedLeftCount: assignment?.unmatchedLeftLocationIds?.length || 0,
        unmatchedRightCount: assignment?.unmatchedRightLocationIds?.length || 0,
        ambiguousCount: assignment?.ambiguousLocationIds?.length || 0,
        totalAssignmentCost: assignment?.totalAssignmentCost ?? null,
        dimensionalEvidence: assignment?.dimensionalEvidence || null,
        selectedPairs: (assignment?.selectedAssignments || []).map(selectedPairSummary),
      };
    }),
    familyComparisons: (audit.familyComparisons || []).map((comparison) => ({
      leftFamilyId: comparison.leftFamilyId,
      rightFamilyId: comparison.rightFamilyId,
      result: comparison.result,
      reasonCode: comparison.reasonCode,
      geometryCostMm: comparison.geometryCostMm,
      locationCount: signal(comparison, 'STRUCT_LOCATION_COUNT_EQUAL')?.result || null,
      memberMultiplicity: signal(comparison, 'STRUCT_MEMBER_MULTIPLICITY_EQUAL')?.result || null,
      pipeClassPopulation: signal(comparison, 'STRUCT_PIPE_CLASS_POPULATION_EQUAL')?.result || null,
      rawPointCount: signal(comparison, 'STRUCT_RAW_CLASH_POINT_COUNT_EQUAL')?.result || null,
      envelopeResidualMm: signal(comparison, 'STRUCT_GEOMETRY_ENVELOPE_WITHIN_TOLERANCE')?.residual ?? null,
      pairDistanceResidualMm: signal(comparison, 'STRUCT_PAIR_DISTANCE_WITHIN_TOLERANCE')?.residual || null,
    })),
  };
}

const leftFiles = xmlFiles(leftRoot).map((path) => loadXml(path, leftRoot));
const rightFiles = xmlFiles(rightRoot).map((path) => loadXml(path, rightRoot));
if (!leftFiles.length || !rightFiles.length) {
  throw new Error(`No XML payloads found: left=${leftFiles.length}, right=${rightFiles.length}`);
}

const comparisons = [];
for (const left of leftFiles) {
  for (const right of rightFiles) comparisons.push(summarizeComparison(left, right));
}

const result = {
  schema: 'SupportReportTypicalityZipBenchmark.v1',
  profileId: SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL.profileId,
  leftArchive: basename(leftRoot),
  rightArchive: basename(rightRoot),
  leftXmlCount: leftFiles.length,
  rightXmlCount: rightFiles.length,
  leftInventory: leftFiles.map(({ name, familyInventory }) => ({ name, familyInventory })),
  rightInventory: rightFiles.map(({ name, familyInventory }) => ({ name, familyInventory })),
  comparisons,
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`ZIP_BENCHMARK_SUMMARY=${JSON.stringify({
  profileId: result.profileId,
  leftXmlCount: result.leftXmlCount,
  rightXmlCount: result.rightXmlCount,
  leftFamilies: result.leftInventory.flatMap((x) => x.familyInventory.map((f) => f.familyId)),
  rightFamilies: result.rightInventory.flatMap((x) => x.familyInventory.map((f) => f.familyId)),
  accepted: comparisons.flatMap((c) => c.familyMatches.filter((m) => m.result === 'TYPICAL').map((m) => ({ leftXml: c.leftXml, rightXml: c.rightXml, ...m }))),
  reviewOrAmbiguous: comparisons.flatMap((c) => c.familyMatches.filter((m) => ['REVIEW', 'AMBIGUOUS'].includes(m.result)).map((m) => ({ leftXml: c.leftXml, rightXml: c.rightXml, ...m }))),
})}`);
