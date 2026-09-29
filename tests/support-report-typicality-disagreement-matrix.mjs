import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseSupportReportClashXml } from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js';
import { buildSupportReportBundle } from '../tabs/support-steel-relationship-builder/support-report-engine.js';
import {
  buildSupportReportTypicalityComparison,
  SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
} from '../tabs/support-steel-relationship-builder/support-report-typicality-projection.js';

export const SUPPORT_REPORT_TYPICALITY_DISAGREEMENT_MATRIX_SCHEMA = 'SupportReportTypicalityDisagreementMatrix.v1';

export function classifyStructuralAxisDisagreement(structural, axis) {
  const structuralCandidate = structural?.result === 'TYPICAL' ? String(structural?.rightFamilyId || '') : '';
  const axisCandidate = axis?.result === 'MATCH' ? String(axis?.rightFamilyId || '') : '';
  const structuralMatch = Boolean(structuralCandidate);
  const axisMatch = Boolean(axisCandidate);
  const structuralReject = structural?.result === 'NO_MATCH';
  const axisReject = axis?.result === 'NO_MATCH';

  if (structuralMatch && axisMatch) {
    return structuralCandidate === axisCandidate
      ? 'A_BOTH_MATCH_SAME_CANDIDATE'
      : 'MATCH_CONFLICT_DIFFERENT_CANDIDATE';
  }
  if (structuralMatch && axisReject) return 'B_STRUCTURAL_MATCH_AXIS_REJECT';
  if (structuralReject && axisMatch) return 'C_STRUCTURAL_REJECT_AXIS_MATCH';
  if (structuralReject && axisReject) return 'D_BOTH_REJECT';
  return `STRUCTURAL_${token(structural?.result || 'UNAVAILABLE')}_AXIS_${token(axis?.result || 'UNAVAILABLE')}`;
}

export function buildStructuralAxisDisagreementMatrix(structuralMatches = [], axisMatches = []) {
  const structuralByFamily = new Map((structuralMatches || []).map((item) => [familyKey(item?.leftFamilyId), item]));
  const axisByFamily = new Map((axisMatches || []).map((item) => [familyKey(item?.leftFamilyId), item]));
  const familyIds = [...new Set([...structuralByFamily.keys(), ...axisByFamily.keys()])].filter(Boolean).sort();
  const entries = familyIds.map((leftFamilyId) => {
    const structural = structuralByFamily.get(leftFamilyId) || null;
    const axis = axisByFamily.get(leftFamilyId) || null;
    const classification = classifyStructuralAxisDisagreement(structural, axis);
    return Object.freeze({
      leftFamilyId,
      classification,
      priorityCalibration: classification === 'B_STRUCTURAL_MATCH_AXIS_REJECT'
        || classification === 'C_STRUCTURAL_REJECT_AXIS_MATCH',
      structural: compactChannel(structural),
      axis: compactChannel(axis),
    });
  });
  return Object.freeze({
    schema: SUPPORT_REPORT_TYPICALITY_DISAGREEMENT_MATRIX_SCHEMA,
    structuralChannel: 'SupportReportTypicalityAudit.v1::structuralMatches',
    axisChannel: 'SupportReportAxisTypicalityAudit.v1::axisTypicalityMatches',
    entries: Object.freeze(entries),
    classificationHistogram: Object.freeze(histogram(entries.map((item) => item.classification))),
    priorityCalibrationCases: Object.freeze(entries.filter((item) => item.priorityCalibration)),
  });
}

export function summarizeAxisTypicalityAudit(audit = {}) {
  const leftFamilies = audit.leftFamilies || [];
  const rightFamilies = audit.rightFamilies || [];
  const comparisons = audit.familyComparisons || [];
  const matches = audit.matches || [];
  return Object.freeze({
    leftAuthorityStatusHistogram: Object.freeze(histogram(leftFamilies.map((item) => item.authorityStatus || 'UNAVAILABLE'))),
    rightAuthorityStatusHistogram: Object.freeze(histogram(rightFamilies.map((item) => item.authorityStatus || 'UNAVAILABLE'))),
    leftEvidenceGapFlagHistogram: Object.freeze(featureGapHistogram(leftFamilies)),
    rightEvidenceGapFlagHistogram: Object.freeze(featureGapHistogram(rightFamilies)),
    pairResultHistogram: Object.freeze(histogram(comparisons.map((item) => item.result || 'UNAVAILABLE'))),
    pairReasonHistogram: Object.freeze(histogram(comparisons.map((item) => item.reasonCode || 'UNSPECIFIED'))),
    pairAvailabilityHistogram: Object.freeze(histogram(comparisons.map((item) => item.availability?.result || 'UNAVAILABLE'))),
    selectedResultHistogram: Object.freeze(histogram(matches.map((item) => item.result || 'UNAVAILABLE'))),
    selectedReasonHistogram: Object.freeze(histogram(matches.map((item) => item.reasonCode || 'UNSPECIFIED'))),
    selectedCandidateCountHistogram: Object.freeze(histogram(matches.map((item) => String((item.candidateFamilyIds || []).length)))),
  });
}

function compactChannel(match) {
  if (!match) return Object.freeze({
    result: 'UNAVAILABLE', reasonCode: '', candidateFamilyId: '', candidateFamilyIds: Object.freeze([]),
    bestCandidateFamilyId: '', failedReasonCodes: Object.freeze([]),
  });
  return Object.freeze({
    result: match.result || 'UNAVAILABLE',
    reasonCode: match.reasonCode || '',
    candidateFamilyId: match.rightFamilyId || '',
    candidateFamilyIds: Object.freeze([...(match.candidateFamilyIds || [])]),
    bestCandidateFamilyId: match.bestCandidateFamilyId || '',
    failedReasonCodes: Object.freeze([...(match.failedReasonCodes || [])]),
  });
}

function featureGapHistogram(families) {
  const flags = [];
  for (const family of families || []) {
    if (!Number(family?.trustedTraversalCount || 0)) flags.push('NO_TRUSTED_TRAVERSAL_AXIS');
    if (!Number(family?.normalizedPairCount || 0) && !Number(family?.relativeAxisAngleCount || 0)) {
      flags.push('NO_INTRINSIC_GEOMETRY');
    }
    if (Number(family?.unavailableTraversalCount || 0) > 0) flags.push('UNAVAILABLE_TRAVERSAL');
    if (Number(family?.ambiguousGroupTraversalCount || 0) > 0) flags.push('AMBIGUOUS_GROUP_TRAVERSAL');
    if (Number(family?.missingBorePairOpportunityCount || 0) > 0) flags.push('MISSING_BORE_PAIR_OPPORTUNITY');
    if (family?.authorityStatus === 'COMPLETE') flags.push('COMPLETE_AUTHORITY');
  }
  return histogram(flags);
}

function histogram(values) {
  const counts = new Map();
  for (const value of values || []) counts.set(value, (counts.get(value) || 0) + 1);
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function mergeHistograms(items, key) {
  const counts = new Map();
  for (const item of items || []) {
    for (const [label, count] of Object.entries(item?.[key] || {})) {
      counts.set(label, (counts.get(label) || 0) + Number(count || 0));
    }
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function familyKey(value) {
  return String(value || '').trim().toUpperCase();
}

function token(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/gu, '_').replace(/^_+|_+$/gu, '') || 'UNAVAILABLE';
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

function loadXml(path, root) {
  const evidence = parseSupportReportClashXml(readFileSync(path, 'utf8'));
  return Object.freeze({
    name: relative(root, path),
    evidence,
    report: buildSupportReportBundle({ clashEvidence: evidence }),
  });
}

function summarizePair(left, right) {
  const audit = buildSupportReportTypicalityComparison(left.evidence, right.evidence, {
    leftReportBundle: left.report,
    rightReportBundle: right.report,
    profile: SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
  });
  return Object.freeze({
    leftXml: left.name,
    rightXml: right.name,
    profileId: audit.profileId,
    matrix: buildStructuralAxisDisagreementMatrix(audit.structuralMatches, audit.axisTypicalityMatches),
    axisDiagnostics: summarizeAxisTypicalityAudit(audit.axisTypicalityAudit),
  });
}

export function runStructuralAxisDisagreementMatrix(leftRoot, rightRoot) {
  const leftFiles = xmlFiles(leftRoot).map((path) => loadXml(path, leftRoot));
  const rightFiles = xmlFiles(rightRoot).map((path) => loadXml(path, rightRoot));
  if (!leftFiles.length || !rightFiles.length) {
    throw new Error(`No XML payloads found: left=${leftFiles.length}, right=${rightFiles.length}`);
  }
  const comparisons = [];
  for (const left of leftFiles) {
    for (const right of rightFiles) comparisons.push(summarizePair(left, right));
  }
  const entries = comparisons.flatMap((comparison) => comparison.matrix.entries.map((entry) => ({
    leftXml: comparison.leftXml,
    rightXml: comparison.rightXml,
    ...entry,
  })));
  const priorityCalibrationCases = entries.filter((item) => item.priorityCalibration);
  const axisDiagnostics = comparisons.map((item) => item.axisDiagnostics);
  return Object.freeze({
    schema: SUPPORT_REPORT_TYPICALITY_DISAGREEMENT_MATRIX_SCHEMA,
    profileId: SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL.profileId,
    leftArchive: basename(leftRoot),
    rightArchive: basename(rightRoot),
    leftXmlCount: leftFiles.length,
    rightXmlCount: rightFiles.length,
    comparisons: Object.freeze(comparisons),
    diagnostics: Object.freeze({
      familyDecisionCount: entries.length,
      classificationHistogram: Object.freeze(histogram(entries.map((item) => item.classification))),
      priorityCalibrationCaseCount: priorityCalibrationCases.length,
      priorityCalibrationCases: Object.freeze(priorityCalibrationCases),
      axis: Object.freeze({
        leftAuthorityStatusHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'leftAuthorityStatusHistogram')),
        rightAuthorityStatusHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'rightAuthorityStatusHistogram')),
        leftEvidenceGapFlagHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'leftEvidenceGapFlagHistogram')),
        rightEvidenceGapFlagHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'rightEvidenceGapFlagHistogram')),
        pairResultHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'pairResultHistogram')),
        pairReasonHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'pairReasonHistogram')),
        pairAvailabilityHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'pairAvailabilityHistogram')),
        selectedResultHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'selectedResultHistogram')),
        selectedReasonHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'selectedReasonHistogram')),
        selectedCandidateCountHistogram: Object.freeze(mergeHistograms(axisDiagnostics, 'selectedCandidateCountHistogram')),
      }),
    }),
  });
}

function main() {
  const [leftRoot, rightRoot, outputPath = '/tmp/typicality-disagreement-matrix.json'] = process.argv.slice(2);
  if (!leftRoot || !rightRoot) {
    throw new Error('Usage: node support-report-typicality-disagreement-matrix.mjs <leftDir> <rightDir> [outputJson]');
  }
  const result = runStructuralAxisDisagreementMatrix(leftRoot, rightRoot);
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`TYPICALITY_DISAGREEMENT_MATRIX=${JSON.stringify({
    schema: result.schema,
    profileId: result.profileId,
    familyDecisionCount: result.diagnostics.familyDecisionCount,
    classificationHistogram: result.diagnostics.classificationHistogram,
    priorityCalibrationCaseCount: result.diagnostics.priorityCalibrationCaseCount,
    priorityCalibrationCases: result.diagnostics.priorityCalibrationCases.slice(0, 50),
    axis: result.diagnostics.axis,
  })}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath && import.meta.url === invokedPath) main();
