import { buildSupportCarrierAttachmentBundle } from './support-carrier-attachment-engine.js';
import { buildSupportCarrierResolutionBundle } from './support-carrier-resolution.js';
import { buildSupportSteelRelationshipBundle as buildCoreRelationshipBundle } from './support-steel-relationship-engine.js';

export function buildSupportSteelRelationshipBundle(input = {}) {
  const coreBundle = buildCoreRelationshipBundle(input);
  const carrierResolution = buildSupportCarrierResolutionBundle({
    supportInput: input.supportInput,
    supportFamilies: coreBundle.supportFamilies,
  });
  const carrierAttachment = buildSupportCarrierAttachmentBundle({
    supportFamilies: carrierResolution.supportFamilies,
    carrierObjects: carrierResolution.carrierObjects,
    supportCarrierEdges: carrierResolution.supportCarrierEdges,
    config: input.config || {},
  });
  return {
    ...coreBundle,
    carrierResolutionSchema: carrierResolution.schema,
    carrierCatalogSchema: carrierResolution.catalogSchema,
    carrierAttachmentSchema: carrierAttachment.schema,
    carrierGeometrySchema: 'SupportCarrierAnalyticalGeometry.v1',
    bundlePurpose: 'RELATIONSHIP_MEMBER_CONNECTIVITY_CARRIER_CONTEXT_AND_ATTACHMENT_INFERENCE',
    authoritativeCarrierObjectResolutionAvailable: carrierResolution.summary.carrierObjectCount > 0,
    analyticalCarrierAttachmentEvidenceAvailable: carrierAttachment.summary.analyticalCarrierContactCandidateCount > 0,
    supportFamilies: carrierResolution.supportFamilies,
    supportCarrierResolution: {
      ...carrierResolution,
      supportFamilies: undefined,
    },
    supportCarrierAttachment: carrierAttachment,
    summary: {
      ...coreBundle.summary,
      carrierObjectCount: carrierResolution.summary.carrierObjectCount,
      analyticalCarrierGeometryCount: carrierAttachment.summary.analyticalCarrierGeometryCount,
      resolvedPhysicalCarrierCount: carrierResolution.summary.resolvedPhysicalCarrierCount,
      branchContextOnlyCount: carrierResolution.summary.branchContextOnlyCount,
      ambiguousCarrierCount: carrierResolution.summary.ambiguousCarrierCount,
      unresolvedCarrierCount: carrierResolution.summary.unresolvedCarrierCount,
      carrierAttachmentCandidateCount: carrierAttachment.summary.analyticalCarrierContactCandidateCount,
      nearbyCarrierAttachmentCandidateCount: carrierAttachment.summary.nearbyCarrierAttachmentCandidateCount,
      unresolvedCarrierAttachmentCount: carrierAttachment.summary.unresolvedCarrierAttachmentCount,
    },
    diagnostics: [
      ...(coreBundle.diagnostics || []),
      ...(carrierResolution.diagnostics || []),
      ...(carrierAttachment.diagnostics || []),
    ],
  };
}
