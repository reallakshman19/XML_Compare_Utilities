import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseSupportReportClashXml } from '../tabs/support-steel-relationship-builder/support-report-clash-safety.js';
import { buildSupportReportBundle } from '../tabs/support-steel-relationship-builder/support-report-engine.js';
import {
  buildSupportReportTypicalityComparison,
  SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
} from '../tabs/support-steel-relationship-builder/support-report-typicality-projection.js';

export const SUPPORT_REPORT_AXIS_C_CALIBRATION_SCHEMA = 'SupportReportAxisCCalibrationLedger.v1';

const TARGETS = Object.freeze([
  Object.freeze({ leftFamilyId: 'PS-10235', rightFamilyId: 'PS-12076' }),
  Object.freeze({ leftFamilyId: 'PS-10258', rightFamilyId: 'PS-12005' }),
  Object.freeze({ leftFamilyId: 'PS-10903', rightFamilyId: 'PS-12076' }),
]);

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

function loadSingleXml(root) {
  const files = xmlFiles(root);
  if (files.length !== 1) throw new Error(`Expected exactly one XML in ${root}; found ${files.length}`);
  const path = files[0];
  const evidence = parseSupportReportClashXml(readFileSync(path, 'utf8'));
  return Object.freeze({
    name: relative(root, path),
    evidence,
    report: buildSupportReportBundle({ clashEvidence: evidence }),
  });
}

function compactFamilyFeatures(features) {
  if (!features) return null;
  return Object.freeze({
    familyId: features.familyId,
    authorityStatus: features.authorityStatus,
    sourceLocationCount: features.sourceLocationCount,
    sourceTraversalCount: features.sourceTraversalCount,
    trustedTraversalCount: features.trustedTraversalCount,
    unavailableTraversalCount: features.unavailableTraversalCount,
    ambiguousGroupTraversalCount: features.ambiguousGroupTraversalCount,
    missingBorePairOpportunityCount: features.missingBorePairOpportunityCount,
    locationsPerTraversalSpectrum: features.locationsPerTraversalSpectrum,
    returnMultiplicitySpectrum: features.returnMultiplicitySpectrum,
    dnNormalizedPairSpectrum: features.dnNormalizedPairSpectrum,
    relativeAxisAngleSpectrumDeg: features.relativeAxisAngleSpectrumDeg,
    normalizedPairCount: features.normalizedPairCount,
    relativeAxisAngleCount: features.relativeAxisAngleCount,
    traversalAxisEvidence: features.traversalAxisEvidence,
  });
}

function compactDecision(decision) {
  if (!decision) return null;
  return Object.freeze({
    result: decision.result || '',
    reasonCode: decision.reasonCode || '',
    rightFamilyId: decision.rightFamilyId || '',
    candidateFamilyIds: Object.freeze([...(decision.candidateFamilyIds || [])]),
    bestCandidateFamilyId: decision.bestCandidateFamilyId || '',
    failedReasonCodes: Object.freeze([...(decision.failedReasonCodes || [])]),
  });
}

export function buildAxisCCalibrationLedger(left, right) {
  const audit = buildSupportReportTypicalityComparison(left.evidence, right.evidence, {
    leftReportBundle: left.report,
    rightReportBundle: right.report,
    profile: SUPPORT_REPORT_TYPICALITY_PROFILE_V1_PROVISIONAL,
  });

  const cases = TARGETS.map((target) => {
    const leftFeatures = audit.axisTypicalityAudit.leftFamilies.find((item) => item.familyId === target.leftFamilyId) || null;
    const rightFeatures = audit.axisTypicalityAudit.rightFamilies.find((item) => item.familyId === target.rightFamilyId) || null;
    const axisComparison = audit.axisTypicalityAudit.familyComparisons.find((item) =>
      item.leftFamilyId === target.leftFamilyId && item.rightFamilyId === target.rightFamilyId) || null;
    const structuralComparison = audit.familyComparisons.find((item) =>
      item.leftFamilyId === target.leftFamilyId && item.rightFamilyId === target.rightFamilyId) || null;
    const structuralDecision = audit.structuralMatches.find((item) => item.leftFamilyId === target.leftFamilyId) || null;
    const axisDecision = audit.axisTypicalityMatches.find((item) => item.leftFamilyId === target.leftFamilyId) || null;

    if (!leftFeatures || !rightFeatures || !axisComparison || !structuralComparison || !structuralDecision || !axisDecision) {
      throw new Error(`Missing governed calibration evidence for ${target.leftFamilyId} -> ${target.rightFamilyId}`);
    }

    return Object.freeze({
      ...target,
      leftAxisFeatures: compactFamilyFeatures(leftFeatures),
      rightAxisFeatures: compactFamilyFeatures(rightFeatures),
      axisPairComparison: axisComparison,
      structuralPairComparison: structuralComparison,
      structuralFamilyDecision: compactDecision(structuralDecision),
      currentAxisFamilyDecision: compactDecision(axisDecision),
    });
  });

  return Object.freeze({
    schema: SUPPORT_REPORT_AXIS_C_CALIBRATION_SCHEMA,
    profileId: audit.profileId,
    leftXml: left.name,
    rightXml: right.name,
    cases: Object.freeze(cases),
  });
}

function main() {
  const [leftRoot, rightRoot, outputPath = '/tmp/support-report-axis-c-calibration.json'] = process.argv.slice(2);
  if (!leftRoot || !rightRoot) {
    throw new Error('Usage: node support-report-axis-c-calibration-diagnostic.mjs <leftDir> <rightDir> [outputJson]');
  }
  const result = buildAxisCCalibrationLedger(loadSingleXml(leftRoot), loadSingleXml(rightRoot));
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`AXIS_C_CALIBRATION=${JSON.stringify({
    schema: result.schema,
    profileId: result.profileId,
    cases: result.cases.map((item) => ({
      leftFamilyId: item.leftFamilyId,
      rightFamilyId: item.rightFamilyId,
      structuralResult: item.structuralFamilyDecision?.result || '',
      axisPairResult: item.axisPairComparison?.result || '',
      axisPairReasonCode: item.axisPairComparison?.reasonCode || '',
      signals: item.axisPairComparison?.signals || [],
    })),
  })}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath && import.meta.url === invokedPath) main();
