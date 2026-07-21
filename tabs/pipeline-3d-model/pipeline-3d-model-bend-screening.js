import { resolveColdFieldBendPolicy } from './pipeline-3d-model-bend-policy.js';
import { normalizeElasticBendSettings } from './pipeline-3d-model-elastic-bend-settings.js?v=20260721-bend-policy-v3-1';

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function bendDiagnostic(severity, code, message, details = {}) {
  return Object.freeze({ severity, code, message, details: Object.freeze({ ...details }) });
}

function resolveOutsideDiameterMm(settings, branchInfo) {
  return settings.diameterSource === 'explicit-od'
    ? positive(settings.explicitOutsideDiameterMm) : positive(branchInfo?.boreMm);
}

function elasticCriteria(settings, outsideDiameterMm) {
  const formulaRadiusMm = settings.useFormulaMinimum && outsideDiameterMm && settings.allowableBendingStressMpa
    ? (settings.youngsModulusMpa * outsideDiameterMm) / (2 * settings.allowableBendingStressMpa) : null;
  const practicalRadiusMm = settings.usePracticalMinimum && outsideDiameterMm
    ? settings.practicalRadiusMultiplierD * outsideDiameterMm : null;
  const criteria = [formulaRadiusMm, practicalRadiusMm].filter(positive);
  return {
    formulaRadiusMm,
    practicalRadiusMm,
    elasticGoverningRadiusMm: criteria.length ? Math.max(...criteria) : null,
  };
}

function resolveSizeBandPolicy(settings, outsideDiameterMm) {
  if (settings.designBasis !== 'asme-b31.4' || settings.coldFieldRadiusMode !== 'b31.4-size-band') return null;
  return resolveColdFieldBendPolicy({
    outsideDiameterMm,
    nominalPipeSizeNps: settings.nominalPipeSizeNps,
    useProjectMinimum: settings.useColdFieldProjectMinimum,
    projectMinimumRadiusD: settings.coldFieldProjectRadiusMultiplierD,
    procedureMinimumRadiusD: settings.coldFieldProcedureMinimumRadiusD,
    useQualified18DAlternative: settings.useQualified18DAlternative,
    qualificationEvidenceId: settings.qualificationEvidenceId,
  });
}

function globalRadius(settings, outsideDiameterMm, elasticRadiusMm, policy) {
  if (settings.designBasis === 'default-metallic') {
    return outsideDiameterMm ? settings.standardRadiusMultiplierD * outsideDiameterMm : null;
  }
  if (settings.designBasis !== 'asme-b31.4' || settings.classificationMode !== 'legacy-global') return null;
  if (settings.bendClass === 'elastic') return elasticRadiusMm;
  return settings.coldFieldRadiusMode === 'project-multiplier'
    ? outsideDiameterMm && settings.coldFieldRadiusMultiplierD * outsideDiameterMm
    : policy?.governingRadiusMm;
}

function policyActivation(settings) {
  const autoB314 = settings.designBasis === 'asme-b31.4'
    && settings.classificationMode === 'source-authority-auto';
  return {
    elasticActive: autoB314 || (settings.designBasis === 'asme-b31.4' && settings.bendClass === 'elastic'),
    coldActive: autoB314 || (settings.designBasis === 'asme-b31.4' && settings.bendClass === 'cold-field'),
  };
}

function screeningWarnings(settings, screening) {
  const warnings = [];
  const { elasticActive, coldActive } = policyActivation(settings);
  if (settings.enabled && !screening.outsideDiameterMm) {
    warnings.push(bendDiagnostic('WARNING', 'bend_diameter_missing', 'Bend resolution needs a positive outside diameter.'));
  }
  if (settings.enabled && settings.diameterSource === 'branch-diameter' && !settings.diameterBasisConfirmed) {
    warnings.push(bendDiagnostic('WARNING', 'bend_diameter_basis_unconfirmed', 'Confirm that the Line / Branch Diameter field is the pipe outside diameter before bend emission.'));
  }
  if (settings.enabled && elasticActive && settings.useFormulaMinimum && !settings.allowableBendingStressMpa) {
    warnings.push(bendDiagnostic('WARNING', 'elastic_bend_allowable_stress_missing', 'Elastic formula screening is unavailable until allowable bending stress Sb is entered.'));
  }
  if (settings.enabled && coldActive && settings.coldFieldRadiusMode === 'b31.4-size-band'
    && !screening.coldFieldPolicy?.normalCodeRadiusD) {
    warnings.push(bendDiagnostic('WARNING', 'cold_field_bend_code_size_unresolved', 'B31.4 size-band mode requires a supported nominal pipe size.'));
  }
  if (settings.enabled && screening.coldFieldPolicy?.qualificationEvidenceRequired) {
    warnings.push(bendDiagnostic('WARNING', 'cold_field_bend_qualification_evidence_missing', 'The qualified 18D alternative requires eligible qualification evidence.'));
  }
  if (settings.enabled && settings.designBasis === 'gre') {
    warnings.push(bendDiagnostic('WARNING', 'gre_bend_policy_placeholder', 'GRE bend policy is a placeholder and cannot emit InputXML bends.'));
  }
  if (settings.enabled && settings.emitToInputXml && !settings.screeningOnlyAcknowledged) {
    warnings.push(bendDiagnostic('WARNING', 'bend_review_acknowledgement_missing', 'InputXML bend emission requires acknowledgement that combined-load compliance remains external.'));
  }
  return warnings;
}

export function calculateElasticBendScreening(settingsInput = {}, branchInfo = {}) {
  const settings = normalizeElasticBendSettings(settingsInput);
  const outsideDiameterMm = resolveOutsideDiameterMm(settings, branchInfo);
  const elastic = elasticCriteria(settings, outsideDiameterMm);
  const coldFieldPolicy = resolveSizeBandPolicy(settings, outsideDiameterMm);
  const governingRadiusMm = globalRadius(
    settings,
    outsideDiameterMm,
    elastic.elasticGoverningRadiusMm,
    coldFieldPolicy,
  );
  const stressMpa = elastic.elasticGoverningRadiusMm && outsideDiameterMm
    ? settings.youngsModulusMpa * outsideDiameterMm / (2 * elastic.elasticGoverningRadiusMm) : null;
  const screening = {
    settings,
    outsideDiameterMm,
    ...elastic,
    coldFieldPolicy,
    governingRadiusMm,
    stressMpa,
    policyReady: settings.designBasis !== 'gre',
  };
  return Object.freeze({
    ...screening,
    warnings: Object.freeze(screeningWarnings(settings, screening)),
  });
}
