export const SUPPORT_CARRIER_TO_STRUCTURE_PATH_SCHEMA = 'SupportCarrierToStructurePathBundle.v1';

export function buildSupportCarrierToStructurePathBundle(input = {}) {
  const resolution = input.carrierResolution || {};
  const attachment = input.carrierAttachment || {};
  const topology = input.carrierTopology || {};
  const chain = input.supportMemberChain || {};
  const completePaths = [];
  const pathExceptions = [];
  const topologyByComponent = indexTopologyPaths(topology.topologyPaths || []);
  const chainEdgesByFamily = groupBy(chain.supportChainEdges || [], 'supportFamilyId');
  const terminalsByFamily = groupBy(
    (chain.structuralTerminalEdges || []).filter(isAnalyticalStructuralTerminal),
    'supportFamilyId',
  );
  const attachmentsByIdentity = new Map(
    (attachment.supportCarrierAttachmentEdges || []).map((row) => [identityKey(row), row]),
  );
  const nearbyByIdentity = new Map(
    (attachment.nearbyCarrierAttachmentCandidates || []).map((row) => [identityKey(row), row]),
  );
  const unresolvedByIdentity = new Map(
    (attachment.unresolvedCarrierAttachments || []).map((row) => [identityKey(row), row]),
  );

  for (const identityEdge of resolution.supportCarrierEdges || []) {
    const key = identityKey(identityEdge);
    const attachmentEdge = attachmentsByIdentity.get(key);
    if (!attachmentEdge) {
      pathExceptions.push(missingAttachmentException(
        identityEdge,
        nearbyByIdentity.get(key),
        unresolvedByIdentity.get(key),
      ));
      continue;
    }
    evaluateAttachmentPath({
      identityEdge,
      attachmentEdge,
      topologyByComponent,
      chainEdges: chainEdgesByFamily.get(identityEdge.supportFamilyId) || [],
      terminals: terminalsByFamily.get(identityEdge.supportFamilyId) || [],
      completePaths,
      pathExceptions,
    });
  }

  const familyResults = buildFamilyResults(input.supportFamilies || [], completePaths, pathExceptions);
  return {
    schema: SUPPORT_CARRIER_TO_STRUCTURE_PATH_SCHEMA,
    relationshipSemantic: 'CARRIER_TO_SUPPORT_TO_STRUCTURE_ANALYTICAL_PATH',
    xmlRequired: false,
    completePaths,
    pathExceptions,
    familyResults,
    summary: {
      familyCount: familyResults.length,
      completePathCount: completePaths.length,
      completeFamilyCount: familyResults.filter((row) => row.pathStatus === 'COMPLETE').length,
      incompleteFamilyCount: familyResults.filter((row) => row.pathStatus !== 'COMPLETE').length,
      attachmentNotProvenCount: countCode(pathExceptions, [
        'CARRIER_ATTACHMENT_NOT_PROVEN',
        'CARRIER_ATTACHMENT_CLEARANCE_ONLY',
        'CARRIER_ATTACHMENT_GEOMETRY_UNRESOLVED',
      ]),
      topologyPathExceptionCount: countCode(pathExceptions, [
        'CARRIER_TOPOLOGY_PATH_MISSING',
        'CARRIER_TOPOLOGY_PATH_REVIEW_REQUIRED',
        'AMBIGUOUS_CARRIER_TOPOLOGY_PATH',
      ]),
      structuralTerminalMissingCount: countCode(pathExceptions, ['STRUCTURAL_TERMINAL_MISSING']),
      supportChainIncompleteCount: countCode(pathExceptions, ['SUPPORT_CHAIN_TO_STRUCTURE_INCOMPLETE']),
      multipleCompletePathFamilyCount: familyResults.filter((row) => row.completePathIds.length > 1).length,
      exceptionCount: pathExceptions.length,
    },
    diagnostics: pathExceptions.map(exceptionDiagnostic),
  };
}

function evaluateAttachmentPath(context) {
  const {
    identityEdge, attachmentEdge, topologyByComponent,
    chainEdges, terminals, completePaths, pathExceptions,
  } = context;
  const topologyPaths = topologyByComponent.get(identityEdge.carrierObjectId) || [];
  if (!topologyPaths.length) {
    pathExceptions.push(pathException('CARRIER_TOPOLOGY_PATH_MISSING', identityEdge, {
      message: 'The resolved carrier object is not present in a topology path.',
    }));
    return;
  }
  if (topologyPaths.length > 1) {
    pathExceptions.push(pathException('AMBIGUOUS_CARRIER_TOPOLOGY_PATH', identityEdge, {
      topologyPathIds: topologyPaths.map((row) => row.pathId),
      message: 'The carrier object appears in more than one topology path.',
    }));
    return;
  }
  const topologyPath = topologyPaths[0];
  if (topologyPath.pathStatus !== 'CONNECTED' || !(topologyPath.edgeIds || []).length) {
    pathExceptions.push(pathException('CARRIER_TOPOLOGY_PATH_REVIEW_REQUIRED', identityEdge, {
      topologyPathId: topologyPath.pathId,
      topologyExceptionCodes: topologyPath.exceptionCodes || [],
      message: 'The carrier topology path is disconnected or has unresolved continuity exceptions.',
    }));
    return;
  }
  if (!terminals.length) {
    pathExceptions.push(pathException('STRUCTURAL_TERMINAL_MISSING', identityEdge, {
      message: 'No analytical support-member-to-structure terminal exists for the support family.',
    }));
    return;
  }
  const routes = terminals.map((terminal) => ({
    terminal,
    supportChainEdgeIds: findMemberPath(
      attachmentEdge.supportMemberId,
      terminal.supportMemberId,
      chainEdges,
    ),
  })).filter((row) => row.supportChainEdgeIds !== null);
  if (!routes.length) {
    pathExceptions.push(pathException('SUPPORT_CHAIN_TO_STRUCTURE_INCOMPLETE', identityEdge, {
      attachmentSupportMemberId: attachmentEdge.supportMemberId,
      structuralTerminalMemberIds: terminals.map((row) => row.supportMemberId),
      message: 'The attached support member is not connected analytically to a structural terminal member.',
    }));
    return;
  }
  for (const route of routes) {
    completePaths.push(completePathRecord(
      identityEdge,
      attachmentEdge,
      topologyPath,
      route.terminal,
      route.supportChainEdgeIds,
      chainEdges,
    ));
  }
}

function completePathRecord(identity, attachment, topologyPath, terminal, chainEdgeIds, chainEdges) {
  const usedChainEdges = chainEdges.filter((row) => chainEdgeIds.includes(row.edgeId));
  return {
    pathId: `SCSP:${identity.supportFamilyId}:${identity.carrierObjectId}:${terminal.supportMemberId}:${terminal.structuralMemberId || terminal.steelGroupId}`,
    pathStatus: 'COMPLETE_CARRIER_TO_STRUCTURE_PATH',
    supportFamilyId: identity.supportFamilyId,
    carrierObjectId: identity.carrierObjectId,
    carrierIdentityEdgeId: identity.edgeId,
    carrierTopologyPathId: topologyPath.pathId,
    carrierTopologyComponentIds: topologyPath.componentIds || [],
    carrierTopologyEdgeIds: topologyPath.edgeIds || [],
    carrierTopologyRepairEdgeIds: (topologyPath.edgeIds || []).filter((edgeId) => edgeId.includes('REPAIR')),
    carrierAttachmentEdgeId: attachment.edgeId,
    attachmentSupportMemberId: attachment.supportMemberId,
    supportChainEdgeIds: chainEdgeIds,
    supportChainMemberIds: unique([
      attachment.supportMemberId,
      terminal.supportMemberId,
      ...usedChainEdges.flatMap((row) => [row.supportA, row.supportB]),
    ]),
    structuralTerminalEdgeId: terminal.edgeId,
    structuralTerminalMemberId: terminal.supportMemberId,
    steelGroupId: terminal.steelGroupId,
    structuralMemberId: terminal.structuralMemberId || null,
    relationshipBasis: [
      'AUTHORITATIVE_CARRIER_IDENTITY',
      'CONNECTED_CARRIER_TOPOLOGY',
      'ANALYTICAL_SUPPORT_TO_CARRIER_ATTACHMENT',
      chainEdgeIds.length ? 'ANALYTICAL_SUPPORT_MEMBER_CHAIN' : 'ATTACHMENT_MEMBER_IS_STRUCTURAL_TERMINAL',
      'ANALYTICAL_SUPPORT_TO_STRUCTURE_TERMINAL',
    ],
    contactEvidenceStatus: 'ANALYTICAL_PATH_CANDIDATE',
    confidence: minimumConfidence([
      identity.confidence,
      attachment.confidence,
      terminal.confidence,
      ...usedChainEdges.map((row) => row.confidence),
    ]),
  };
}

function findMemberPath(start, target, edges) {
  if (!start || !target) return null;
  if (start === target) return [];
  const adjacency = new Map();
  for (const edge of edges) {
    addNeighbor(adjacency, edge.supportA, edge.supportB, edge.edgeId);
    addNeighbor(adjacency, edge.supportB, edge.supportA, edge.edgeId);
  }
  const queue = [{ memberId: start, edgeIds: [] }];
  const visited = new Set([start]);
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency.get(current.memberId) || []) {
      if (visited.has(next.memberId)) continue;
      const edgeIds = [...current.edgeIds, next.edgeId];
      if (next.memberId === target) return edgeIds;
      visited.add(next.memberId);
      queue.push({ memberId: next.memberId, edgeIds });
    }
  }
  return null;
}

function buildFamilyResults(families, completePaths, exceptions) {
  return (families || []).map((family) => {
    const familyPaths = completePaths.filter((row) => row.supportFamilyId === family.familyId);
    const familyExceptions = exceptions.filter((row) => row.supportFamilyId === family.familyId);
    return {
      supportFamilyId: family.familyId,
      pathStatus: familyPaths.length ? 'COMPLETE' : 'INCOMPLETE',
      completePathIds: familyPaths.map((row) => row.pathId),
      exceptionIds: familyExceptions.map((row) => row.exceptionId),
      exceptionCodes: unique(familyExceptions.map((row) => row.exceptionCode)),
      carrierObjectIds: unique(familyPaths.map((row) => row.carrierObjectId)),
      steelGroupIds: unique(familyPaths.map((row) => row.steelGroupId)),
    };
  });
}

function missingAttachmentException(identity, nearby, unresolved) {
  if (nearby) {
    return pathException('CARRIER_ATTACHMENT_CLEARANCE_ONLY', identity, {
      distanceMm: nearby.distanceMm,
      message: 'Carrier identity is resolved, but analytical geometry shows clearance rather than attachment.',
    });
  }
  if (unresolved) {
    return pathException('CARRIER_ATTACHMENT_GEOMETRY_UNRESOLVED', identity, {
      attachmentStatus: unresolved.attachmentStatus,
      message: 'Carrier identity is resolved, but analytical attachment geometry is incomplete.',
    });
  }
  return pathException('CARRIER_ATTACHMENT_NOT_PROVEN', identity, {
    message: 'Carrier identity is resolved, but no analytical carrier-attachment edge exists.',
  });
}

function pathException(code, identity, extra = {}) {
  return {
    exceptionId: `SCSP-EX:${code}:${identity.supportMemberId}:${identity.carrierObjectId}`,
    exceptionCode: code,
    severity: code === 'CARRIER_ATTACHMENT_CLEARANCE_ONLY' ? 'INFO' : 'WARN',
    supportFamilyId: identity.supportFamilyId,
    supportMemberId: identity.supportMemberId,
    carrierObjectId: identity.carrierObjectId,
    carrierIdentityEdgeId: identity.edgeId,
    ...extra,
  };
}

function isAnalyticalStructuralTerminal(row) {
  return row.edgeType === 'SUPPORT_MEMBER_TO_STRUCTURE'
    && row.contactEvidenceStatus === 'ANALYTICAL_CONTACT_CANDIDATE';
}
function indexTopologyPaths(paths) {
  const index = new Map();
  for (const path of paths) {
    for (const componentId of path.componentIds || []) {
      if (!index.has(componentId)) index.set(componentId, []);
      index.get(componentId).push(path);
    }
  }
  return index;
}
function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}
function identityKey(row) { return `${row.supportMemberId}::${row.carrierObjectId}`; }
function addNeighbor(map, from, to, edgeId) {
  if (!from || !to) return;
  if (!map.has(from)) map.set(from, []);
  map.get(from).push({ memberId: to, edgeId });
}
function minimumConfidence(values) {
  const rank = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };
  const filtered = values.filter((row) => rank[row] !== undefined);
  if (!filtered.length) return 'NONE';
  return filtered.reduce((minimum, value) => rank[value] < rank[minimum] ? value : minimum, 'HIGH');
}
function countCode(rows, codes) { return rows.filter((row) => codes.includes(row.exceptionCode)).length; }
function unique(values) { return [...new Set(values.filter(Boolean))].sort(); }
function exceptionDiagnostic(row) {
  return {
    severity: row.severity,
    code: row.exceptionCode,
    supportFamilyId: row.supportFamilyId,
    supportMemberId: row.supportMemberId,
    carrierObjectId: row.carrierObjectId,
    message: row.message,
  };
}
