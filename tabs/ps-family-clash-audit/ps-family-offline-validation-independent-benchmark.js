import { buildPsFamilyNativeAuditPipeline } from './ps-family-native-audit-pipeline.js';
import { buildPsFamilyOfflineValidationBenchmark } from './ps-family-offline-validation-benchmark.js';
import { parseSupportChangeXml } from './ps-family-psclash-xml-parser.js';

export const PS_FAMILY_INDEPENDENT_BENCHMARK_SCHEMA = 'PsFamilyIndependentModelBenchmark.v1';

export function buildPsFamilyIndependentModelBenchmark(input = {}) {
  const combinedInputText = sourceText(input.combinedInputText ?? input.combinedInput);
  if (!combinedInputText.trim()) throw new Error('Load one combined staged model JSON in Native Pipeline before benchmarking.');
  const pipeline = buildPsFamilyNativeAuditPipeline({
    combinedInputText,
    relationshipConfig: input.relationshipConfig || {},
    auditConfig: input.auditConfig || {},
  });
  const reference = buildPsFamilyOfflineValidationBenchmark({
    relationshipBundle: pipeline.relationshipBundle,
    structureXmlText: input.structureXmlText || '',
    supportXmlText: input.supportXmlText || '',
    config: input.validationConfig || {},
  });
  const memberTerminal = compareMemberTerminals(
    pipeline.relationshipBundle,
    input.structureXmlText || '',
    input.validationConfig || {},
  );
  const coverage = buildCoverage(pipeline, reference, memberTerminal);
  const gaps = buildGaps(reference, memberTerminal, coverage);
  return {
    schema: PS_FAMILY_INDEPENDENT_BENCHMARK_SCHEMA,
    validationOnly: true,
    productionDependency: false,
    inputMode: 'COMBINED_STAGED_MODEL_WITH_OPTIONAL_XML_REFERENCE',
    sourceSchema: pipeline.relationshipBundle?.sourceSchema || pipeline.relationshipBundle?.schema,
    referenceCaution: 'Clash XML is an optional historical reference. The combined staged model remains the only production evidence source.',
    pipeline,
    reference,
    memberTerminal,
    coverage,
    gaps,
    summary: {
      status: benchmarkStatus(reference, memberTerminal, gaps),
      referenceComparableLayerCount: coverage.filter((row) => row.coverageStatus === 'REFERENCE_COMPARABLE').length,
      modelOnlyLayerCount: coverage.filter((row) => row.coverageStatus === 'MODEL_ONLY').length,
      noModelEvidenceLayerCount: coverage.filter((row) => row.coverageStatus === 'NO_MODEL_EVIDENCE').length,
      gapCount: gaps.length,
      highSeverityGapCount: gaps.filter((row) => row.severity === 'HIGH').length,
      structuralPrecision: reference.structural.metrics.precision,
      structuralRecall: reference.structural.metrics.recall,
      chainPrecision: reference.chain.metrics.precision,
      chainRecall: reference.chain.metrics.recall,
      memberTerminalPrecision: memberTerminal.metrics.precision,
      memberTerminalRecall: memberTerminal.metrics.recall,
    },
  };
}

function compareMemberTerminals(bundle, structureXmlText, config) {
  const parsed = parseSupportChangeXml(structureXmlText, config, 'StructureGroup vs Supports');
  const predictedRows = uniqueRows((bundle.supportMemberChain?.structuralTerminalEdges || [])
    .filter((row) => row.edgeType === 'SUPPORT_MEMBER_TO_STRUCTURE'
      && row.contactEvidenceStatus === 'ANALYTICAL_CONTACT_CANDIDATE')
    .map((row) => terminalRow(row.supportMemberId, row.steelGroupId, row.edgeId, 'MODEL')));
  const referenceRows = uniqueRows((parsed.rows || [])
    .filter((row) => row.edgeType === 'StructuralContact')
    .map((row) => terminalRow(row.support, row.structuralRoot || row.structuralGroup, row.clashName, 'XML')));
  const predictedKeys = new Set(predictedRows.map((row) => row.key));
  const referenceKeys = new Set(referenceRows.map((row) => row.key));
  const matches = predictedRows.filter((row) => referenceKeys.has(row.key));
  const predictedOnly = predictedRows.filter((row) => !referenceKeys.has(row.key));
  const referenceOnly = referenceRows.filter((row) => !predictedKeys.has(row.key));
  return {
    metrics: metrics(matches.length, predictedRows.length, referenceRows.length),
    predictedRows,
    referenceRows,
    matches,
    disagreements: [
      ...predictedOnly.map((row) => ({ classification: 'MODEL_ONLY', ...row })),
      ...referenceOnly.map((row) => ({ classification: 'XML_ONLY', ...row })),
    ],
    diagnostics: parsed.diagnostics || [],
  };
}

function buildCoverage(pipeline, reference, memberTerminal) {
  const bundle = pipeline.relationshipBundle || {};
  const summary = pipeline.summary || {};
  return [
    coverageRow('FAMILY_TO_STEEL', reference.structural.metrics.graphAcceptedCount, reference.structural.metrics.xmlReferenceCount, 'Family-to-steel relationships are comparable to historical structure clashes.'),
    coverageRow('SUPPORT_MEMBER_CHAIN', reference.chain.metrics.graphAcceptedCount, reference.chain.metrics.xmlReferenceCount, 'Physical support-member contacts are comparable to historical support clashes.'),
    coverageRow('MEMBER_TO_STEEL_TERMINAL', memberTerminal.metrics.graphAcceptedCount, memberTerminal.metrics.xmlReferenceCount, 'Every physical member terminal is evaluated separately; family-level collapse is not used.'),
    modelOnlyRow('CARRIER_IDENTITY', summary.resolvedPhysicalCarrierCount || 0, 'Clash XML has no authoritative physical carrier object.'),
    modelOnlyRow('CARRIER_ATTACHMENT', summary.carrierAttachmentCandidateCount || 0, 'Clash XML does not independently describe carrier-to-support attachment geometry.'),
    modelOnlyRow('CARRIER_TOPOLOGY', summary.carrierTopologyConnectionCount || 0, 'Clash XML has no component ports or route-continuity evidence.'),
    modelOnlyRow('COMPLETE_CARRIER_TO_STRUCTURE_PATH', summary.completeCarrierToStructurePathCount || 0, 'Historical pair clashes cannot validate the complete carrier-to-structure proof path.'),
    modelOnlyRow('RESTRAINT_FUNCTION', bundle.supportRestraintFunction?.summary?.confirmedFamilyCount || 0, 'Historical clash XML has no authoritative restraint intent or directional capability.'),
  ];
}

function buildGaps(reference, memberTerminal, coverage) {
  const gaps = [];
  const addMetricGap = (code, label, result) => {
    if (result.metrics.status === 'BELOW_REFERENCE_THRESHOLDS') gaps.push(gap(code, 'HIGH', `${label} is below configured XML-reference thresholds.`));
    if (result.metrics.status === 'NO_REFERENCE_COVERAGE') gaps.push(gap(`${code}_NO_REFERENCE`, 'INFO', `${label} has no historical XML reference coverage.`));
  };
  addMetricGap('FAMILY_TO_STEEL_REFERENCE_GAP', 'Family-to-steel agreement', reference.structural);
  addMetricGap('SUPPORT_CHAIN_REFERENCE_GAP', 'Support-chain agreement', reference.chain);
  addMetricGap('MEMBER_TERMINAL_REFERENCE_GAP', 'Member-terminal agreement', memberTerminal);
  if (reference.structural.metrics.recall === 1 && memberTerminal.metrics.xmlReferenceCount > 0 && memberTerminal.metrics.recall < 1) {
    gaps.push(gap('FAMILY_MATCH_MASKS_MEMBER_TERMINAL_GAP', 'HIGH', 'Family-level structural recall is complete while one or more physical member terminals are missing.'));
  }
  coverage.filter((row) => row.coverageStatus === 'NO_MODEL_EVIDENCE').forEach((row) => {
    gaps.push(gap(`${row.layer}_NOT_PROVEN`, row.layer === 'CARRIER_IDENTITY' ? 'HIGH' : 'MEDIUM', row.claimBoundary));
  });
  coverage.filter((row) => row.coverageStatus === 'MODEL_ONLY').forEach((row) => {
    gaps.push(gap(`${row.layer}_XML_COVERAGE_UNAVAILABLE`, 'INFO', row.claimBoundary));
  });
  return gaps;
}

function coverageRow(layer, modelEvidenceCount, referenceEvidenceCount, claimBoundary) {
  const coverageStatus = referenceEvidenceCount > 0
    ? modelEvidenceCount > 0 ? 'REFERENCE_COMPARABLE' : 'NO_MODEL_EVIDENCE'
    : modelEvidenceCount > 0 ? 'MODEL_ONLY' : 'NO_REFERENCE_OR_MODEL_EVIDENCE';
  return { layer, coverageStatus, modelEvidenceCount, referenceEvidenceCount, claimBoundary };
}
function modelOnlyRow(layer, modelEvidenceCount, claimBoundary) {
  return { layer, coverageStatus: modelEvidenceCount > 0 ? 'MODEL_ONLY' : 'NO_MODEL_EVIDENCE', modelEvidenceCount, referenceEvidenceCount: 0, claimBoundary };
}
function metrics(matchCount, modelCount, referenceCount) {
  const precision = modelCount ? round(matchCount / modelCount) : 0;
  const recall = referenceCount ? round(matchCount / referenceCount) : 0;
  return {
    status: !referenceCount ? 'NO_REFERENCE_COVERAGE' : precision === 1 && recall === 1 ? 'MEETS_REFERENCE_THRESHOLDS' : 'BELOW_REFERENCE_THRESHOLDS',
    matchCount,
    graphAcceptedCount: modelCount,
    xmlReferenceCount: referenceCount,
    falsePositiveReferenceCount: Math.max(0, modelCount - matchCount),
    falseNegativeReferenceCount: Math.max(0, referenceCount - matchCount),
    precision,
    recall,
  };
}
function terminalRow(memberId, steelGroupId, evidenceId, source) {
  const member = normalize(memberId);
  const steel = normalizeSteel(steelGroupId);
  return { key: `${member}::${steel}`, supportMemberId: member, steelGroupId: steel, evidenceId, source };
}
function uniqueRows(rows) { const seen = new Set(); return rows.filter((row) => !seen.has(row.key) && seen.add(row.key)); }
function sourceText(value) { return typeof value === 'string' ? value : value ? JSON.stringify(value) : ''; }
function normalize(value) { const text = String(value || '').trim().replace(/^\/+/, ''); return text ? `/${text.toUpperCase()}` : ''; }
function normalizeSteel(value) { const text = normalize(value); const match = text.match(/\/(?:.*\/)?((?:PS|SL)-\d+)/u); return match ? `/${match[1]}` : text; }
function round(value) { return Number(value.toFixed(6)); }
function gap(code, severity, message) { return { code, severity, message }; }
function benchmarkStatus(reference, memberTerminal, gaps) {
  if (gaps.some((row) => row.severity === 'HIGH')) return 'MATERIAL_GAPS_FOUND';
  const statuses = [reference.structural.metrics.status, reference.chain.metrics.status, memberTerminal.metrics.status];
  return statuses.every((status) => status === 'MEETS_REFERENCE_THRESHOLDS') ? 'MEETS_AVAILABLE_REFERENCE' : 'INCOMPLETE_REFERENCE_COVERAGE';
}
