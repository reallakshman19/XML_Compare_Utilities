import { buildSupportCarrierAttachmentBundle } from './support-carrier-attachment-engine.js';
import { buildSupportCarrierResolutionBundle } from './support-carrier-resolution.js';
import { collectSupportCarrierTopologyCatalog } from './support-carrier-topology-catalog.js';
import { buildSupportCarrierTopologyBundle } from './support-carrier-topology-engine.js';
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
  const carrierTopologyCatalog = collectSupportCarrierTopologyCatalog(input.supportInput);
  const carrierTopology = buildSupportCarrierTopologyBundle({
    catalog: carrierTopologyCatalog,
    config: input.config || {},
  });
  return {
    ...coreBundle,
    carrierResolutionSchema: carrierResolution.schema,
    carrierCatalogSchema: carrierResolution.catalogSchema,
    carrierAttachmentSchema: carrierAttachment.schema,
    carrierGeometrySchema: 'SupportCarrierAnalyticalGeometry.v1',
    carrierTopologyCatalogSchema: carrierTopologyCatalog.schema,
    carrierTopologySchema: carrierTopology.schema,
    bundlePurpose: 'RELATIONSHIP_MEMBER_CONNECTIVITY_CARRIER_CONTEXT_ATTACHMENT_AND_TOPOLOGY_INFERENCE',
    authoritativeCarrierObjectResolutionAvailable: carrierResolution.summary.carrierObjectCount > 0,
    analyticalCarrierAttachmentEvidenceAvailable: carrierAttachment.summary.analyticalCarrierContactCandidateCount > 0,
    carrierTopologyEvidenceAvailable: carrierTopology.summary.connectionCount > 0,
    supportFamilies: carrierResolution.supportFamilies,
    supportCarrierResolution: {
      ...carrierResolution,
      supportFamilies: undefined,
    },
    supportCarrierAttachment: carrierAttachment,
    supportCarrierTopology: carrierTopology,
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
      carrierTopologyComponentCount: carrierTopology.summary.componentCount,
      carrierTopologyConnectionCount: carrierTopology.summary.connectionCount,
      carrierTopologyPathCount: carrierTopology.summary.pathCount,
      carrierTopologyRepairCount: carrierTopology.summary.smallGapRepairCount,
      carrierTopologyExceptionCount: carrierTopology.summary.reviewExceptionCount,
    },
    diagnostics: [
      ...(coreBundle.diagnostics || []),
      ...(carrierResolution.diagnostics || []),
      ...(carrierAttachment.diagnostics || []),
      ...topologyDiagnostics(carrierTopology.topologyExceptions),
    ],
  };
}

function topologyDiagnostics(rows = []) {
  return rows.map((row) => ({
    severity: row.severity || 'WARN',
    code: row.exceptionCode,
    componentId: row.componentId,
    message: row.message || 'Carrier topology continuity requires engineering review.',
  }));
}
