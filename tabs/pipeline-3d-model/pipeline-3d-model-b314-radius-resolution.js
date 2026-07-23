import { PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA } from './pipeline-3d-model-analysis-section-contracts.js';
import { PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA, parsePipelinePositiveScalar } from './pipeline-3d-model-diameter-contracts.js';
import { PIPELINE_BEND_RESOLUTION_SCHEMA, PIPELINE_B314_RADIUS_POLICY_IDS, createPipelineB314RadiusMigration, createPipelineB314RadiusPlan, createPipelineB314RadiusResolution, getPipelineB314RadiusPolicy, } from './pipeline-3d-model-b314-radius-contracts.js';
const text = (value) => String(value ?? '').trim();
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const plain = (value) => { if (!value || typeof value !== 'object' || Array.isArray(value)) return false; const prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null; };
function clone(value) { if (value === undefined) return null; if (value === null || typeof value === 'string' || typeof value === 'boolean') return value; if (typeof value === 'number' && Number.isFinite(value)) return value; if (Array.isArray(value)) return value.map(clone); if (!plain(value)) throw new TypeError('B31.4 resolver input must be JSON-safe plain data.'); return Object.fromEntries(Object.keys(value).sort(compare).map((key) => [key, clone(value[key])])); }
const diag = (code, message, details = {}) => ({ severity: 'BLOCKING', code, message, details });
function safeInput(input) { try { const source = clone(input); if (plain(source)) return { source, errors: [] }; } catch { /* blocked */ } return { source: {}, errors: [diag('PIPELINE_B314_RADIUS_INPUT_INVALID', 'Resolver input must be JSON-safe plain data.')] }; }
function parseBoolean(value) { if (typeof value === 'boolean') return value; const normalized = text(value).toLowerCase(); if (['true', '1', 'yes', 'on'].includes(normalized)) return true; if (['false', '0', 'no', 'off'].includes(normalized)) return false; return null; }
function scalarField(source, field, errors, code) { const supplied = source[field] !== undefined && source[field] !== null && text(source[field]) !== ''; const value = supplied ? parsePipelinePositiveScalar(source[field]) : null; if (supplied && !value) errors.push(diag(code, `${field} must be a finite positive scalar.`, { value: source[field] })); return value; }
function boolField(source, field, fallback, errors, code) { if (source[field] === undefined || source[field] === null || text(source[field]) === '') return fallback; const value = parseBoolean(source[field]); if (value === null) errors.push(diag(code, `${field} must be boolean evidence.`, { value: source[field] })); return value === null ? fallback : value; }
function canonicalSignature(value) { const ignored = ['candidateId', 'incomingElementIndex', 'cornerNode', 'analysisSectionId', 'sourceAuthority', 'sourceReference']; const keys = Object.keys(value).filter((key) => !ignored.includes(key)).sort(compare); return JSON.stringify(Object.fromEntries(keys.map((key) => [key, value[key]]))); }
function normalizePolicy(record, expectedClass) { const errors = []; if (!plain(record)) return { value: {}, errors: [diag('PIPELINE_B314_RADIUS_TARGET_INVALID', 'Policy record must be a plain object.')] }; const radiusPolicyId = text(record.radiusPolicyId), policy = getPipelineB314RadiusPolicy(radiusPolicyId); const bendClass = text(record.bendClass) || expectedClass; if (!policy) errors.push(diag('PIPELINE_B314_RADIUS_POLICY_INVALID', 'radiusPolicyId must be exact and canonical.', { radiusPolicyId })); if (!['elastic', 'cold-field'].includes(bendClass) || (expectedClass && bendClass !== expectedClass) || (policy && policy.bendClass !== bendClass)) errors.push(diag( 'PIPELINE_B314_RADIUS_BEND_CLASS_INCOMPATIBLE', 'Policy must match the existing candidate bend class.', { bendClass, expectedClass })); const value = { radiusPolicyId, bendClass, sourceAuthority: text(record.sourceAuthority), sourceReference: text(record.sourceReference) }; if (radiusPolicyId === PIPELINE_B314_RADIUS_POLICY_IDS.ELASTIC_SCREENING) { value.formulaEnabled = boolField(record, 'formulaEnabled', false, errors, 'PIPELINE_B314_RADIUS_ELASTIC_INPUT_INVALID'); value.youngsModulusMpa = scalarField(record, 'youngsModulusMpa', errors, 'PIPELINE_B314_RADIUS_ELASTIC_INPUT_INVALID'); value.allowableBendingStressMpa = scalarField(record, 'allowableBendingStressMpa', errors, 'PIPELINE_B314_RADIUS_ELASTIC_INPUT_INVALID'); value.practicalEnabled = boolField(record, 'practicalEnabled', false, errors, 'PIPELINE_B314_RADIUS_ELASTIC_INPUT_INVALID'); value.practicalRadiusD = scalarField(record, 'practicalRadiusD', errors, 'PIPELINE_B314_RADIUS_ELASTIC_INPUT_INVALID'); if (!value.formulaEnabled && !value.practicalEnabled) errors.push(diag( 'PIPELINE_B314_RADIUS_CRITERIA_UNRESOLVED', 'At least one elastic criterion must be enabled.')); if (value.formulaEnabled && (!value.youngsModulusMpa || !value.allowableBendingStressMpa)) errors.push(diag( 'PIPELINE_B314_RADIUS_ELASTIC_INPUT_INVALID', 'Enabled formula criterion requires positive E and Sb.')); if (value.practicalEnabled && !value.practicalRadiusD) errors.push(diag( 'PIPELINE_B314_RADIUS_ELASTIC_INPUT_INVALID', 'Enabled practical criterion requires positive practicalRadiusD.')); } else if (radiusPolicyId === PIPELINE_B314_RADIUS_POLICY_IDS.COLD_FIELD_SIZE_BAND) { value.qualifiedAlternativeRequested = boolField(record, 'qualifiedAlternativeRequested', false, errors, 'PIPELINE_B314_RADIUS_COLD_FIELD_INPUT_INVALID'); value.qualificationEvidenceId = text(record.qualificationEvidenceId); value.projectMinimumEnabled = boolField(record, 'projectMinimumEnabled', false, errors, 'PIPELINE_B314_RADIUS_COLD_FIELD_INPUT_INVALID'); value.projectMinimumRadiusD = scalarField(record, 'projectMinimumRadiusD', errors, 'PIPELINE_B314_RADIUS_COLD_FIELD_INPUT_INVALID'); value.procedureMinimumRadiusD = scalarField(record, 'procedureMinimumRadiusD', errors, 'PIPELINE_B314_RADIUS_COLD_FIELD_INPUT_INVALID'); if (value.projectMinimumEnabled && !value.projectMinimumRadiusD) errors.push(diag( 'PIPELINE_B314_RADIUS_COLD_FIELD_INPUT_INVALID', 'Enabled project minimum requires positive projectMinimumRadiusD.')); } else if (radiusPolicyId === PIPELINE_B314_RADIUS_POLICY_IDS.COLD_FIELD_PROJECT_RADIUS_D) { value.projectRadiusD = scalarField(record, 'projectRadiusD', errors, 'PIPELINE_B314_RADIUS_COLD_FIELD_INPUT_INVALID'); if (!value.projectRadiusD) errors.push(diag( 'PIPELINE_B314_RADIUS_COLD_FIELD_INPUT_INVALID', 'Project-radius policy requires positive projectRadiusD.')); } return { value, errors }; }
function duplicatePolicy(records, expectedClass) { const normalized = records.map((record) => normalizePolicy(record, expectedClass)); const errors = normalized.flatMap((item) => item.errors); if (!records.length) return { value: null, errors }; const signatures = Object.create(null); normalized.forEach((item) => { signatures[canonicalSignature(item.value)] = true; }); if (Object.keys(signatures).length > 1) errors.push(diag( 'PIPELINE_B314_RADIUS_SOURCE_CONFLICT', 'Duplicate same-authority policy records disagree after normalization.')); return { value: normalized[0].value, errors }; }
function candidateOverrideRecords(records, candidate) { const targeted = records.filter((record) => plain(record) && ( text(record.candidateId) === candidate.id || record.incomingElementIndex === candidate.incomingElementIndex || record.cornerNode === candidate.cornerNode)); const errors = []; targeted.forEach((record) => { if ((record.candidateId !== undefined && text(record.candidateId) !== candidate.id) || (record.incomingElementIndex !== undefined && record.incomingElementIndex !== candidate.incomingElementIndex) || (record.cornerNode !== undefined && record.cornerNode !== candidate.cornerNode)) errors.push(diag( 'PIPELINE_B314_RADIUS_TARGET_INVALID', 'Candidate override identity fields must identify one exact candidate.', { candidateId: candidate.id })); }); return { records: targeted, errors }; }
function sourceSelection(source, candidate, analysisSectionId) { const overrides = Array.isArray(source.b314RadiusOverrides) ? source.b314RadiusOverrides : []; const sections = Array.isArray(source.b314RadiusSections) ? source.b314RadiusSections : []; const globals = Array.isArray(source.b314RadiusPolicies) ? source.b314RadiusPolicies : []; const candidateRecords = candidateOverrideRecords(overrides, candidate); if (candidateRecords.records.length) { const selected = duplicatePolicy(candidateRecords.records, candidate.bendClass); return { ...selected, errors: [...candidateRecords.errors, ...selected.errors], sourceKind: 'EXPLICIT_CANDIDATE_OVERRIDE' }; } const sectionRecords = sections.filter((item) => plain(item) && text(item.analysisSectionId) === analysisSectionId && text(item.bendClass) === candidate.bendClass); if (sectionRecords.length) return { ...duplicatePolicy(sectionRecords, candidate.bendClass), sourceKind: 'EXPLICIT_ANALYSIS_SECTION_POLICY' }; const globalRecords = globals.filter((item) => plain(item) && text(item.bendClass) === candidate.bendClass); if (globalRecords.length) return { ...duplicatePolicy(globalRecords, candidate.bendClass), sourceKind: 'EXPLICIT_GLOBAL_B31_4_POLICY' }; return legacyPolicy(source, candidate); }
function legacyPolicy(source, candidate) { const settings = plain(source.settings) ? source.settings : {}; const observed = text(settings.designBasis) === 'asme-b31.4' || Object.keys(settings).some((key) => [ 'youngsModulusMpa', 'allowableBendingStressMpa', 'useFormulaMinimum', 'usePracticalMinimum', 'practicalRadiusMultiplierD', 'coldFieldRadiusMode', 'coldFieldRadiusMultiplierD', 'useColdFieldProjectMinimum', 'coldFieldProjectRadiusMultiplierD', 'coldFieldProcedureMinimumRadiusD', 'useQualified18DAlternative', 'qualificationEvidenceId', 'nominalPipeSizeNps', ].includes(key)); if (source.legacyB314RadiusBasisConfirmed !== true) return { value: null, errors: [diag( observed ? 'PIPELINE_B314_RADIUS_LEGACY_AUTHORITY_UNCONFIRMED' : 'PIPELINE_B314_RADIUS_AUTHORITY_UNRESOLVED', observed ? 'Legacy B31.4 radius evidence requires explicit confirmation.' : 'No B31.4 radius authority was supplied.')], sourceKind: observed ? 'UNCONFIRMED_LEGACY_B31_4' : 'UNRESOLVED' }; if (text(settings.designBasis) !== 'asme-b31.4') return { value: null, errors: [diag( 'PIPELINE_B314_RADIUS_LEGACY_AUTHORITY_UNCONFIRMED', 'Confirmed legacy migration requires designBasis asme-b31.4.')], sourceKind: 'CONFIRMED_LEGACY_B31_4' }; if (text(settings.classificationMode) === 'legacy-global' && text(settings.bendClass) !== candidate.bendClass) return { value: null, errors: [diag('PIPELINE_B314_RADIUS_BEND_CLASS_INCOMPATIBLE', 'Legacy global bendClass conflicts with the existing candidate class.')], sourceKind: 'CONFIRMED_LEGACY_B31_4' }; let record; if (candidate.bendClass === 'elastic') record = { bendClass: 'elastic', radiusPolicyId: PIPELINE_B314_RADIUS_POLICY_IDS.ELASTIC_SCREENING, formulaEnabled: settings.useFormulaMinimum, youngsModulusMpa: settings.youngsModulusMpa, allowableBendingStressMpa: settings.allowableBendingStressMpa, practicalEnabled: settings.usePracticalMinimum, practicalRadiusD: settings.practicalRadiusMultiplierD, sourceAuthority: 'LEGACY_B31_4_SETTINGS' }; else if (text(settings.coldFieldRadiusMode) === 'b31.4-size-band') record = { bendClass: 'cold-field', radiusPolicyId: PIPELINE_B314_RADIUS_POLICY_IDS.COLD_FIELD_SIZE_BAND, qualifiedAlternativeRequested: settings.useQualified18DAlternative, qualificationEvidenceId: settings.qualificationEvidenceId, projectMinimumEnabled: settings.useColdFieldProjectMinimum, projectMinimumRadiusD: settings.coldFieldProjectRadiusMultiplierD, procedureMinimumRadiusD: settings.coldFieldProcedureMinimumRadiusD, sourceAuthority: 'LEGACY_B31_4_SETTINGS' }; else if (text(settings.coldFieldRadiusMode) === 'project-multiplier') record = { bendClass: 'cold-field', radiusPolicyId: PIPELINE_B314_RADIUS_POLICY_IDS.COLD_FIELD_PROJECT_RADIUS_D, projectRadiusD: settings.coldFieldRadiusMultiplierD, sourceAuthority: 'LEGACY_B31_4_SETTINGS' }; else return { value: null, errors: [diag('PIPELINE_B314_RADIUS_POLICY_INVALID', 'Legacy coldFieldRadiusMode is unsupported.')], sourceKind: 'CONFIRMED_LEGACY_B31_4' }; const normalized = normalizePolicy(record, candidate.bendClass); return { ...normalized, sourceKind: 'CONFIRMED_LEGACY_B31_4' }; }
function sizeBandRadiusD(nps) { if (!nps) return null; if (nps <= 12) return 18; if (nps === 14) return 21; if (nps === 16) return 24; if (nps === 18) return 27; if (nps >= 20) return 30; return null; }
function resolveCriteria(policy, diameter, source, selectedKind) { const errors = [], outsideDiameterMm = parsePipelinePositiveScalar(diameter.outsideDiameterMm); const base = { ...policy, outsideDiameterMm, nominalPipeSizeNps: parsePipelinePositiveScalar(diameter.nominalPipeSizeNps), sizeBandInputReady: diameter.sizeBandInputReady === true }; if (selectedKind === 'CONFIRMED_LEGACY_B31_4') { const rawLegacyNps = source.settings?.nominalPipeSizeNps; const supplied = rawLegacyNps !== undefined && rawLegacyNps !== null && text(rawLegacyNps) !== ''; const legacyNps = parsePipelinePositiveScalar(rawLegacyNps); if ((supplied && !legacyNps) || (legacyNps && (!base.nominalPipeSizeNps || legacyNps !== base.nominalPipeSizeNps))) errors.push(diag( 'PIPELINE_B314_RADIUS_NPS_CONFLICT', 'Selected legacy settings NPS must be valid and agree with canonical NPS.', { legacyNps, canonicalNps: base.nominalPipeSizeNps })); } if (policy.radiusPolicyId === PIPELINE_B314_RADIUS_POLICY_IDS.ELASTIC_SCREENING) { const formulaRadiusD = policy.formulaEnabled ? policy.youngsModulusMpa / (2 * policy.allowableBendingStressMpa) : null; const formulaRadiusMm = formulaRadiusD ? formulaRadiusD * outsideDiameterMm : null; const practicalRadiusMm = policy.practicalEnabled ? policy.practicalRadiusD * outsideDiameterMm : null; const criteria = [formulaRadiusMm, practicalRadiusMm].filter(Boolean); const governingRadiusMm = criteria.length ? Math.max(...criteria) : null; return { value: { ...base, radiusBasis: 'B31_4_ELASTIC_GOVERNING', formulaRadiusD, formulaRadiusMm, practicalRadiusMm, governingRadiusMm, governingRadiusD: governingRadiusMm ? governingRadiusMm / outsideDiameterMm : null }, errors }; } if (policy.radiusPolicyId === PIPELINE_B314_RADIUS_POLICY_IDS.COLD_FIELD_PROJECT_RADIUS_D) return { value: { ...base, radiusBasis: 'B31_4_COLD_FIELD_PROJECT_RADIUS_D', projectMinimumEnabled: false, governingRadiusD: policy.projectRadiusD, governingRadiusMm: policy.projectRadiusD * outsideDiameterMm }, errors }; if (!base.nominalPipeSizeNps || base.sizeBandInputReady !== true) errors.push(diag( 'PIPELINE_B314_RADIUS_NPS_REQUIRED', 'Size-band policy requires canonical ready NPS evidence.')); const normalCodeRadiusD = sizeBandRadiusD(base.nominalPipeSizeNps); if (base.nominalPipeSizeNps && !normalCodeRadiusD) errors.push(diag( 'PIPELINE_B314_RADIUS_NPS_UNSUPPORTED', 'Canonical NPS is unsupported by the B31.4 size-band mapping.', { nominalPipeSizeNps: base.nominalPipeSizeNps })); const qualificationEligible = Boolean(base.nominalPipeSizeNps && base.nominalPipeSizeNps >= 14); const qualifiedAlternativeApplied = Boolean(policy.qualifiedAlternativeRequested && qualificationEligible && policy.qualificationEvidenceId); if (policy.qualifiedAlternativeRequested && !qualifiedAlternativeApplied) errors.push(diag( 'PIPELINE_B314_RADIUS_QUALIFICATION_EVIDENCE_REQUIRED', 'Qualified 18D request requires eligible NPS and evidence.', { nominalPipeSizeNps: base.nominalPipeSizeNps, qualificationEvidenceId: policy.qualificationEvidenceId })); const selectedCodeRadiusD = qualifiedAlternativeApplied ? 18 : normalCodeRadiusD; const criteria = [selectedCodeRadiusD, policy.projectMinimumEnabled ? policy.projectMinimumRadiusD : null, policy.procedureMinimumRadiusD].filter(Boolean); const governingRadiusD = criteria.length ? Math.max(...criteria) : null; return { value: { ...base, radiusBasis: 'B31_4_COLD_FIELD_SIZE_BAND_GOVERNING', normalCodeRadiusD, qualificationEligible, qualifiedAlternativeApplied, selectedCodeRadiusD, governingRadiusD, governingRadiusMm: governingRadiusD ? governingRadiusD * outsideDiameterMm : null }, errors }; }
function candidateObserved(candidate, outsideDiameterMm, authorityRadiusMm) { const errors = [], hasD = candidate.radiusD !== undefined && candidate.radiusD !== null; const hasMm = candidate.radiusMm !== undefined && candidate.radiusMm !== null; const radiusD = hasD ? parsePipelinePositiveScalar(candidate.radiusD) : null; const radiusMm = hasMm ? parsePipelinePositiveScalar(candidate.radiusMm) : null; if ((hasD && !radiusD) || (hasMm && !radiusMm)) errors.push(diag( 'PIPELINE_B314_RADIUS_INPUT_INVALID', 'Observed candidate radii must be positive scalars when supplied.')); const inconsistent = Boolean(radiusD && radiusMm && Math.abs(radiusMm - radiusD * outsideDiameterMm) > 0.000001); if (inconsistent) errors.push(diag('PIPELINE_B314_RADIUS_OBSERVED_BASIS_CONFLICT', 'Observed radiusD and radiusMm are inconsistent with canonical OD.')); const observedMm = radiusMm || (radiusD ? radiusD * outsideDiameterMm : null); const observedD = radiusD || (radiusMm ? radiusMm / outsideDiameterMm : null); const disposition = !observedMm || !authorityRadiusMm ? 'NOT_AVAILABLE' : Math.abs(observedMm - authorityRadiusMm) <= 0.000001 ? 'MATCHES_AUTHORITY' : 'REQUIRES_RECOMPUTE'; return { errors, observedD, observedMm, disposition }; }
function indexPlans(source, errors) {
  const analysis = source.analysisSectionPlan, diameter = source.analysisDiameterPlan, bend = source.bendResolution;
  const blocking = (value) => (Array.isArray(value?.blockerCodes) && value.blockerCodes.length)
    || (Array.isArray(value?.diagnostics) && value.diagnostics.some((item) => text(item?.severity) === 'BLOCKING'));
  const analysisValid = plain(analysis) && analysis.schema === PIPELINE_ANALYSIS_SECTION_PLAN_SCHEMA
    && analysis.ready === true && Array.isArray(analysis.sections) && Array.isArray(analysis.elementResolutions)
    && !blocking(analysis) && analysis.sections.every((item) => plain(item) && text(item.status) !== 'BLOCKED')
    && analysis.elementResolutions.every((item) => plain(item) && item.ready === true);
  if (!analysisValid) errors.push(diag('PIPELINE_B314_RADIUS_INPUT_INVALID',
    'A ready canonical analysis-section plan with ready nested records is required.'));
  const diameterValid = plain(diameter) && diameter.schema === PIPELINE_ANALYSIS_DIAMETER_PLAN_SCHEMA
    && diameter.ready === true && Array.isArray(diameter.sectionResolutions) && Array.isArray(diameter.elementResolutions)
    && !blocking(diameter) && diameter.sectionResolutions.every((item) => plain(item) && item.ready === true)
    && diameter.elementResolutions.every((item) => plain(item) && item.ready === true);
  if (!diameterValid) errors.push(diag('PIPELINE_B314_RADIUS_DIAMETER_PLAN_INVALID',
    'A ready canonical diameter plan with ready nested records is required.'));
  if (!plain(bend) || bend.schema !== PIPELINE_BEND_RESOLUTION_SCHEMA || !Array.isArray(bend.candidates)) errors.push(diag(
    'PIPELINE_B314_RADIUS_INPUT_INVALID', 'A canonical bend-resolution candidate array is required.'));
  const keyed = (values, key, code, label) => {
    const result = Object.create(null);
    for (const item of Array.isArray(values) ? values : []) {
      if (!plain(item)) { errors.push(diag(code, `${label} records must be plain objects.`)); continue; }
      const value = item[key];
      if (Object.hasOwn(result, value)) errors.push(diag(code, `Duplicate ${label} identity.`, { [key]: value }));
      result[value] = item;
    }
    return result;
  };
  return { analysis, diameter, bend,
    analysisSections: keyed(analysis?.sections, 'analysisSectionId', 'PIPELINE_B314_RADIUS_OWNERSHIP_INVALID', 'analysis section'),
    analysisElements: keyed(analysis?.elementResolutions, 'elementIndex', 'PIPELINE_B314_RADIUS_OWNERSHIP_INVALID', 'analysis element'),
    diameterSections: keyed(diameter?.sectionResolutions, 'analysisSectionId', 'PIPELINE_B314_RADIUS_DIAMETER_PLAN_INVALID', 'diameter section'),
    diameterElements: keyed(diameter?.elementResolutions, 'elementIndex', 'PIPELINE_B314_RADIUS_DIAMETER_PLAN_INVALID', 'diameter element') };
}
function ownership(candidate, plans) {
  const errors = [], incoming = plans.analysisElements[candidate.incomingElementIndex];
  const outgoingIndex = candidate.incomingElementIndex + 1, outgoing = plans.analysisElements[outgoingIndex];
  const section = incoming && plans.analysisSections[incoming.analysisSectionId];
  if (!incoming || !outgoing || incoming.analysisSectionId !== outgoing.analysisSectionId || !section) errors.push(diag(
    'PIPELINE_B314_RADIUS_OWNERSHIP_INVALID', 'Incoming and outgoing elements must exist in one analysis section.'));
  if (candidate.outgoingElementIndex !== outgoingIndex) errors.push(diag(
    'PIPELINE_B314_RADIUS_OWNERSHIP_INVALID', 'Candidate outgoingElementIndex must remain incomingElementIndex + 1.'));
  const diameterSection = section && plans.diameterSections[section.analysisSectionId];
  const diameterIncoming = plans.diameterElements[candidate.incomingElementIndex];
  const diameterOutgoing = plans.diameterElements[outgoingIndex];
  const diameterMismatch = section?.profileId === 'asme-b31.4' && (!diameterSection?.ready
    || !diameterIncoming?.ready || !diameterOutgoing?.ready
    || diameterIncoming.analysisSectionId !== section.analysisSectionId
    || diameterOutgoing.analysisSectionId !== section.analysisSectionId
    || [diameterSection.profileId, diameterIncoming.profileId, diameterOutgoing.profileId]
      .some((profileId) => profileId !== 'asme-b31.4')
    || diameterIncoming.outsideDiameterMm !== diameterSection.outsideDiameterMm
    || diameterOutgoing.outsideDiameterMm !== diameterSection.outsideDiameterMm
    || diameterIncoming.nominalPipeSizeNps !== diameterSection.nominalPipeSizeNps
    || diameterOutgoing.nominalPipeSizeNps !== diameterSection.nominalPipeSizeNps);
  if (diameterMismatch) errors.push(diag('PIPELINE_B314_RADIUS_DIAMETER_PLAN_INVALID',
    'B31.4 candidate requires matching ready section and element diameter evidence.'));
  return { errors, section, incoming, outgoing, diameterSection };
}
function blockedResolution(candidate, ownershipValue, diameter, sourceKind, errors) { const observed = candidateObserved(candidate, parsePipelinePositiveScalar(diameter?.outsideDiameterMm), null); const diagnostics = [...errors, ...observed.errors]; return createPipelineB314RadiusResolution({ ...candidateEvidence(candidate, ownershipValue, diameter), radiusPolicyId: '', radiusBasis: '', sourceKind, sourceAuthority: '', sourceReference: '', candidateRadiusDisposition: observed.disposition, geometryRecheckRequired: false, observedCandidateRadiusD: observed.observedD, observedCandidateRadiusMm: observed.observedMm, status: 'BLOCKED', diagnostics, blockerCodes: diagnostics.map((item) => item.code) }); }
function candidateEvidence(candidate, ownershipValue, diameter) { const incomingIndex = candidate.incomingElementIndex, outgoingIndex = incomingIndex + 1; return { candidateId: text(candidate.id), incomingElementIndex: incomingIndex, incomingElementId: `E${incomingIndex + 1}`, outgoingElementIndex: outgoingIndex, outgoingElementId: `E${outgoingIndex + 1}`, analysisSectionId: text(ownershipValue.section?.analysisSectionId), profileId: text(ownershipValue.section?.profileId), cornerNode: candidate.cornerNode, previousNode: candidate.previousNode, nextNode: candidate.nextNode, geometricClass: text(candidate.classification), turnAngleDeg: candidate.turnAngleDeg, sourceBasis: text(candidate.sourceBasis), bendClass: text(candidate.bendClass), outsideDiameterMm: diameter?.outsideDiameterMm, nominalPipeSizeNps: diameter?.nominalPipeSizeNps, sizeBandInputReady: diameter?.sizeBandInputReady === true, candidateStatus: text(candidate.status) }; }
function resolveCandidate(candidate, plans, source) {
  const own = ownership(candidate, plans), diameter = own.diameterSection;
  if (!own.section) return { resolution: blockedResolution(candidate, own, diameter, 'UNRESOLVED', own.errors),
    notApplicable: null, sourceKind: 'UNRESOLVED' };
  if (own.section.profileId !== 'asme-b31.4') return {
    notApplicable: text(candidate.id), resolution: null, sourceKind: '' };
  const errors = [...own.errors];
  if (!['elastic', 'cold-field'].includes(text(candidate.bendClass))) errors.push(diag(
    'PIPELINE_B314_RADIUS_BEND_CLASS_INCOMPATIBLE', 'B31.4 candidate class must remain elastic or cold-field.'));
  const selected = sourceSelection(source, candidate, own.section.analysisSectionId);
  errors.push(...selected.errors);
  if (!selected.value || errors.length) return {
    resolution: blockedResolution(candidate, own, diameter, selected.sourceKind, errors),
    notApplicable: null, sourceKind: selected.sourceKind };
  const criteria = resolveCriteria(selected.value, diameter, source, selected.sourceKind);
  errors.push(...criteria.errors);
  if (errors.length) return {
    resolution: blockedResolution(candidate, own, diameter, selected.sourceKind, errors),
    notApplicable: null, sourceKind: selected.sourceKind };
  const observed = candidateObserved(candidate, criteria.value.outsideDiameterMm, criteria.value.governingRadiusMm);
  const evidence = candidateEvidence(candidate, own, diameter);
  return { resolution: createPipelineB314RadiusResolution({
    ...evidence, ...criteria.value, observedCandidateRadiusD: observed.observedD,
    observedCandidateRadiusMm: observed.observedMm, candidateRadiusDisposition: observed.disposition,
    geometryRecheckRequired: observed.disposition === 'REQUIRES_RECOMPUTE', sourceKind: selected.sourceKind,
    sourceAuthority: selected.value.sourceAuthority || text(source.sourceAuthority),
    sourceReference: selected.value.sourceReference || text(source.sourceReference),
    diagnostics: observed.errors, blockerCodes: observed.errors.map((item) => item.code) }),
    notApplicable: null, sourceKind: selected.sourceKind };
}
function sourceShapeErrors(source, candidates, plans) {
  const errors = [];
  for (const field of ['b314RadiusOverrides', 'b314RadiusSections', 'b314RadiusPolicies']) {
    if (source[field] !== undefined && !Array.isArray(source[field])) errors.push(diag(
      'PIPELINE_B314_RADIUS_INPUT_INVALID', `${field} must be an array when supplied.`));
  }
  (Array.isArray(source.b314RadiusOverrides) ? source.b314RadiusOverrides : []).forEach((item) => {
    if (!plain(item)) {
      errors.push(diag('PIPELINE_B314_RADIUS_TARGET_INVALID', 'Candidate override must be a plain object.'));
      return;
    }
    const fields = ['candidateId', 'incomingElementIndex', 'cornerNode'].filter((field) => item[field] !== undefined);
    const matches = fields.length ? candidates.filter((candidate) => fields.every((field) =>
      field === 'candidateId' ? text(candidate.id) === text(item[field]) : candidate[field] === item[field])) : [];
    if (matches.length !== 1) errors.push(diag('PIPELINE_B314_RADIUS_TARGET_INVALID',
      'Candidate override identity fields must resolve one exact candidate.', { candidateId: text(item.candidateId) }));
  });
  (Array.isArray(source.b314RadiusSections) ? source.b314RadiusSections : []).forEach((item) => {
    const section = plain(item) ? plans.analysisSections[text(item.analysisSectionId)] : null;
    if (!section || section.profileId !== 'asme-b31.4' || !['elastic', 'cold-field'].includes(text(item?.bendClass))) errors.push(diag(
      'PIPELINE_B314_RADIUS_TARGET_INVALID', 'Section policy must target one exact B31.4 section and bend class.'));
  });
  (Array.isArray(source.b314RadiusPolicies) ? source.b314RadiusPolicies : []).forEach((item) => {
    if (!plain(item) || !['elastic', 'cold-field'].includes(text(item.bendClass))) errors.push(diag(
      'PIPELINE_B314_RADIUS_TARGET_INVALID', 'Global policy must target elastic or cold-field.'));
  });
  return errors;
}
export function resolvePipelineB314RadiusPlan(input = {}) {
  const safeValue = safeInput(input), source = safeValue.source, errors = [...safeValue.errors];
  const plans = indexPlans(source, errors);
  const rawCandidates = Array.isArray(plans.bend?.candidates) ? plans.bend.candidates : [];
  if (rawCandidates.some((candidate) => !plain(candidate))) errors.push(diag(
    'PIPELINE_B314_RADIUS_INPUT_INVALID', 'Every bend candidate must be a JSON-safe plain object.'));
  const candidates = rawCandidates.filter(plain).sort((a, b) =>
    a.incomingElementIndex - b.incomingElementIndex || compare(text(a.id), text(b.id)));
  errors.push(...sourceShapeErrors(source, candidates, plans));
  const seenIds = Object.create(null), seenOwners = Object.create(null), seenCorners = Object.create(null);
  candidates.forEach((candidate) => {
    for (const [store, value, field] of [[seenIds, text(candidate.id), 'candidateId'],
      [seenOwners, candidate.incomingElementIndex, 'incomingElementIndex'], [seenCorners, candidate.cornerNode, 'cornerNode']]) {
      if (Object.hasOwn(store, value)) errors.push(diag('PIPELINE_B314_RADIUS_CANDIDATE_COVERAGE_INVALID',
        `Duplicate ${field}.`, { [field]: value }));
      store[value] = true;
    }
  });
  const results = candidates.map((candidate) => resolveCandidate(candidate, plans, source));
  const resolutions = results.map((item) => item.resolution).filter(Boolean);
  const notApplicable = results.map((item) => item.notApplicable).filter(Boolean);
  const union = [...resolutions.map((item) => item.candidateId), ...notApplicable];
  const uniqueUnion = Object.keys(Object.fromEntries(union.map((candidateId) => [candidateId, true])));
  if (union.length !== candidates.length || uniqueUnion.length !== candidates.length) errors.push(diag(
    'PIPELINE_B314_RADIUS_CANDIDATE_COVERAGE_INVALID',
    'Every bend candidate must appear exactly once as resolved or not applicable.'));
  const selectedKinds = results.map((item) => item.sourceKind).filter(Boolean);
  const legacySelected = selectedKinds.includes('CONFIRMED_LEGACY_B31_4');
  const legacyNps = legacySelected ? parsePipelinePositiveScalar(source.settings?.nominalPipeSizeNps) : null;
  const canonicalNpsValues = resolutions.map((item) => item.nominalPipeSizeNps).filter(Boolean);
  const migration = createPipelineB314RadiusMigration({
    sourceKinds: selectedKinds, legacyEvidenceObserved: legacySelected || text(source.settings?.designBasis) === 'asme-b31.4',
    legacyB314RadiusBasisConfirmed: source.legacyB314RadiusBasisConfirmed === true,
    legacySettingsNpsObserved: legacyNps,
    legacySettingsNpsMatchedCanonical: !legacyNps || canonicalNpsValues.every((value) => value === legacyNps),
    sourceAuthority: text(source.sourceAuthority), sourceReference: text(source.sourceReference) });
  return createPipelineB314RadiusPlan({
    analysisSectionPlanSchema: plans.analysis?.schema, analysisDiameterPlanSchema: plans.diameter?.schema,
    bendResolutionSchema: plans.bend?.schema, migration, radiusResolutions: resolutions,
    notApplicableCandidateIds: notApplicable, diagnostics: errors, blockerCodes: errors.map((item) => item.code) });
}
export function buildPipelineB314RadiusPlanJson(plan) { return `${JSON.stringify(plan, null, 2)}\n`; }
export function buildPipelineB314RadiusLedgerText(plan) { const header = ['CandidateId', 'IncomingElementId', 'OutgoingElementId', 'AnalysisSectionId', 'BendClass', 'RadiusPolicyId', 'RadiusBasis', 'OutsideDiameterMm', 'NominalPipeSizeNps', 'GoverningRadiusD', 'GoverningRadiusMm', 'ObservedRadiusD', 'ObservedRadiusMm', 'CandidateStatus', 'RadiusDisposition', 'GeometryRecheckRequired', 'SourceKind', 'Status', 'BlockerCodes']; const rows = (plan?.radiusResolutions || []).map((item) => [item.candidateId, item.incomingElementId, item.outgoingElementId, item.analysisSectionId, item.bendClass, item.radiusPolicyId, item.radiusBasis, item.outsideDiameterMm ?? '', item.nominalPipeSizeNps ?? '', item.governingRadiusD ?? '', item.governingRadiusMm ?? '', item.observedCandidateRadiusD ?? '', item.observedCandidateRadiusMm ?? '', item.candidateStatus, item.candidateRadiusDisposition, item.geometryRecheckRequired ? 'YES' : 'NO', item.sourceKind, item.status, item.blockerCodes.join(',')]); return [header, ...rows].map((row) => row.join('\t')).join('\n'); }
export const buildPipelineB314RadiusResolutionJson = buildPipelineB314RadiusPlanJson;
