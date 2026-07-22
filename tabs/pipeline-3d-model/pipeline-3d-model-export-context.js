import { normalizeElasticBendSettings } from './pipeline-3d-model-elastic-bend-settings.js?v=20260721-p3d-meta-phase1-2';
import { resolveGreFittingPlaceholder } from './pipeline-3d-model-gre-placeholder.js?v=20260721-p3d-meta-phase1-2';
import { resolvePipelineIdentityContext } from './pipeline-3d-model-identity.js?v=20260722-p3d-identity-1';

export const PIPELINE_EXPORT_CONTEXT_SCHEMA = 'PipelineUtilityExportContext.v1';
export const PIPELINE_EXPORT_QUALIFICATION_SCHEMA = 'PipelineUtilityExportQualification.v1';

const MODE_BY_BASIS = Object.freeze({
  'default-metallic': 'NORMAL',
  'asme-b31.4': 'ASME_B31_4',
  gre: 'GRE',
});

function normalizedBranchInfo(branchInfo, identity) {
  return Object.freeze({
    ...(branchInfo || {}),
    branchName: identity.branchName,
    lineNo: identity.lineNo,
  });
}

function fittingInputXmlRequested(settings) {
  return settings.designBasis === 'gre'
    && settings.enabled
    && settings.emitToInputXml;
}

function readiness(settings) {
  const requested = fittingInputXmlRequested(settings);
  const gre = settings.designBasis === 'gre';
  const blockerCodes = requested ? ['GRE_BEND_POLICY_NOT_IMPLEMENTED'] : [];
  return Object.freeze({
    baseGeometryReady: true,
    baseInputXmlReady: true,
    fittingPolicyReady: !gre,
    fittingResolverReady: !gre,
    fittingInputXmlRequested: requested,
    preflightInputXmlAllowed: blockerCodes.length === 0,
    blockerCodes: Object.freeze(blockerCodes),
  });
}

function profile(settings) {
  return Object.freeze({
    requestedDesignBasis: settings.requestedDesignBasis,
    resolvedDesignBasis: settings.designBasis,
    resolvedMode: MODE_BY_BASIS[settings.designBasis] || 'NORMAL',
    fallbackApplied: settings.profileFallbackApplied,
    resolutionReason: settings.profileResolutionReason,
  });
}

export function resolvePipelineUtilityExportContext({ branchInfo = {}, settings = {} } = {}) {
  const normalizedSettings = normalizeElasticBendSettings(settings);
  const identity = resolvePipelineIdentityContext(branchInfo);
  return Object.freeze({
    schema: PIPELINE_EXPORT_CONTEXT_SCHEMA,
    profile: profile(normalizedSettings),
    identity,
    branchInfo: normalizedBranchInfo(branchInfo, identity),
    settings: normalizedSettings,
    grePlaceholder: resolveGreFittingPlaceholder(normalizedSettings),
    readiness: readiness(normalizedSettings),
  });
}

export function exportContextBranchInfo(input = {}) {
  if (input?.schema === PIPELINE_EXPORT_CONTEXT_SCHEMA) return input.branchInfo;
  const identity = resolvePipelineIdentityContext(input);
  return normalizedBranchInfo(input, identity);
}

function resolutionCodes(bendResolution) {
  return (bendResolution?.errors || [])
    .map((item) => String(item?.code || '').trim())
    .filter(Boolean);
}

function documentCodes(documentPlan) {
  return (documentPlan?.blockerCodes || [])
    .map((code) => String(code || '').trim())
    .filter(Boolean);
}

function uniqueCodes(values) {
  return Object.freeze([...new Set(values)]);
}

export function qualifyPipelineUtilityExport(
  contextInput,
  coordinateRows = [],
  bendResolution = null,
  documentPlan = null,
) {
  const context = contextInput?.schema === PIPELINE_EXPORT_CONTEXT_SCHEMA
    ? contextInput
    : resolvePipelineUtilityExportContext(contextInput);
  const segmentCount = Math.max(0, coordinateRows.length - 1);
  const planCodes = documentCodes(documentPlan);
  const blockerCodes = uniqueCodes([
    ...(documentPlan ? [] : (segmentCount ? [] : ['PIPELINE_GEOMETRY_SEGMENT_REQUIRED'])),
    ...context.readiness.blockerCodes,
    ...planCodes,
    ...resolutionCodes(bendResolution),
  ]);
  const documentReady = documentPlan ? documentPlan.ready === true : segmentCount > 0;
  return Object.freeze({
    schema: PIPELINE_EXPORT_QUALIFICATION_SCHEMA,
    resolvedMode: context.profile.resolvedMode,
    segmentCount,
    bendCandidateCount: bendResolution?.diagnostics?.candidateCount || 0,
    bendEmittedCount: bendResolution?.diagnostics?.emittedCount || 0,
    bendBlockingCount: bendResolution?.diagnostics?.blockedCount || 0,
    documentPlanSchema: documentPlan?.schema || '',
    documentReady,
    documentBlockerCount: planCodes.length,
    preflightInputXmlAllowed: context.readiness.preflightInputXmlAllowed && documentReady,
    inputXmlAllowed: blockerCodes.length === 0,
    blockerCodes,
  });
}

export function buildPipelineExportContextJson(contextInput, qualification = null) {
  const context = contextInput?.schema === PIPELINE_EXPORT_CONTEXT_SCHEMA
    ? contextInput
    : resolvePipelineUtilityExportContext(contextInput);
  return JSON.stringify({
    schema: PIPELINE_EXPORT_CONTEXT_SCHEMA,
    profile: context.profile,
    identity: context.identity,
    readiness: context.readiness,
    qualification,
    grePlaceholder: context.grePlaceholder.active ? context.grePlaceholder : null,
  }, null, 2);
}
