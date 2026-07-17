export function createCarrierEvidenceProjection(bundle = {}) {
  const carrier = bundle.supportCarrierResolution || {};
  const attachment = bundle.supportCarrierAttachment || {};
  const topology = bundle.supportCarrierTopology || {};
  return {
    schemas: {
      carrierResolutionSchema: bundle.carrierResolutionSchema || carrier.schema || null,
      carrierCatalogSchema: bundle.carrierCatalogSchema || carrier.catalogSchema || null,
      carrierAttachmentSchema: bundle.carrierAttachmentSchema || attachment.schema || null,
      carrierGeometrySchema: bundle.carrierGeometrySchema || null,
      carrierTopologyCatalogSchema: bundle.carrierTopologyCatalogSchema || topology.catalogSchema || null,
      carrierTopologySchema: bundle.carrierTopologySchema || topology.schema || null,
    },
    rows: {
      carrierObjectRows: carrier.carrierObjects || [],
      branchContextRows: carrier.branchContexts || [],
      carrierResolutionRows: carrier.resolutions || [],
      supportCarrierEdgeRows: carrier.supportCarrierEdges || [],
      branchContextEdgeRows: carrier.branchContextEdges || [],
      carrierAttachmentEvaluationRows: attachment.evaluations || [],
      carrierAttachmentRows: attachment.supportCarrierAttachmentEdges || [],
      nearbyCarrierAttachmentRows: attachment.nearbyCarrierAttachmentCandidates || [],
      unresolvedCarrierAttachmentRows: attachment.unresolvedCarrierAttachments || [],
      carrierTopologyComponentRows: topology.components || [],
      carrierTopologyPortRows: topology.ports || [],
      carrierTopologyConnectionRows: topology.connectionEdges || [],
      carrierTopologyPathRows: topology.topologyPaths || [],
      carrierTopologyExceptionRows: topology.topologyExceptions || [],
    },
    summary: carrierEvidenceSummary(bundle),
  };
}

export function carrierEvidenceSummary(bundle = {}) {
  const carrier = bundle.supportCarrierResolution || {};
  const attachment = bundle.supportCarrierAttachment || {};
  const topology = bundle.supportCarrierTopology || {};
  return {
    carrierObjectCount: (carrier.carrierObjects || []).length,
    resolvedCarrierEdgeCount: (carrier.supportCarrierEdges || []).length,
    branchContextEdgeCount: (carrier.branchContextEdges || []).length,
    carrierAttachmentCandidateCount: (attachment.supportCarrierAttachmentEdges || []).length,
    nearbyCarrierAttachmentCount: (attachment.nearbyCarrierAttachmentCandidates || []).length,
    unresolvedCarrierAttachmentCount: (attachment.unresolvedCarrierAttachments || []).length,
    analyticalCarrierGeometryCount: attachment.summary?.analyticalCarrierGeometryCount || 0,
    ambiguousCarrierCount: carrier.summary?.ambiguousCarrierCount || 0,
    unresolvedCarrierCount: carrier.summary?.unresolvedCarrierCount || 0,
    carrierTopologyComponentCount: (topology.components || []).length,
    carrierTopologyConnectionCount: (topology.connectionEdges || []).length,
    carrierTopologyPathCount: (topology.topologyPaths || []).length,
    carrierTopologyExceptionCount: (topology.topologyExceptions || []).length,
    carrierTopologyRepairCount: topology.summary?.smallGapRepairCount || 0,
    carrierTopologyAmbiguousCount: topology.summary?.ambiguousConnectionCount || 0,
    carrierTopologyDisconnectedCount: topology.summary?.disconnectedComponentCount || 0,
  };
}
