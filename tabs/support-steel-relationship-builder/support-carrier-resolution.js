import { resolveSupportLineContext } from './support-steel-line-context.js';
import { transformPoint } from './support-steel-world-matrix.js';
import {
  cleanText,
  cloneJson,
  normalizeIdentity,
  parseSupportSteelJson,
  readPosition,
  sourceAttributes,
  sourceIdentity,
  sourceType,
  walkSupportSteelHierarchy,
} from './support-steel-source-utils.js';

export const SUPPORT_CARRIER_RESOLUTION_SCHEMA = 'SupportCarrierResolution.v1';
export const SUPPORT_CARRIER_CATALOG_SCHEMA = 'SupportCarrierCatalog.v1';

const PHYSICAL_CARRIER_TYPES = new Set([
  'PIPE', 'TUBE', 'PIPE_SEGMENT', 'STRAIGHT_PIPE', 'PIPING_PIPE', 'PIPE_COMPONENT',
]);
const BRANCH_CONTEXT_TYPES = new Set(['BRANCH', 'PIPE_BRANCH', 'PIPING_BRANCH', 'BRAN']);
const EXEMPT_ROLES = new Set(['STRUCTURAL_REFERENCE']);
const RESOLVED_STATUSES = new Set([
  'RESOLVED_EXPLICIT_CARRIER',
  'RESOLVED_HIERARCHY_CARRIER',
  'RESOLVED_UNIQUE_BRANCH_CARRIER',
]);
const CARRIER_REFERENCE_KEYS = Object.freeze([
  'CARRIER_ID', 'CARRIER_REF', 'PIPE_REF', 'PIPE_ID', 'PIPEID',
]);

export function buildSupportCarrierResolutionBundle(input = {}) {
  const source = parseSupportSteelJson(input.supportInput, 'Support source');
  const catalog = collectSupportCarrierCatalog(source);
  const resolution = resolveSupportFamilyCarriers(input.supportFamilies || [], catalog);
  return {
    schema: SUPPORT_CARRIER_RESOLUTION_SCHEMA,
    catalogSchema: SUPPORT_CARRIER_CATALOG_SCHEMA,
    relationshipSemantic: 'SUPPORT_MEMBER_TO_AUTHORITATIVE_CARRIER_OBJECT',
    contactEvidenceAvailable: false,
    carrierObjects: catalog.carrierObjects,
    branchContexts: catalog.branchContexts,
    resolutions: resolution.resolutions,
    supportCarrierEdges: resolution.supportCarrierEdges,
    branchContextEdges: resolution.branchContextEdges,
    supportFamilies: resolution.supportFamilies,
    summary: buildSummary(catalog, resolution),
    diagnostics: resolution.diagnostics,
  };
}

export function collectSupportCarrierCatalog(source) {
  if (source?.schema === 'PipeSupportProjectionBundle.v1') {
    return collectProjectionCarrierCatalog(source);
  }
  const carrierObjects = [];
  const branchContexts = [];
  for (const row of walkSupportSteelHierarchy(source)) {
    const attrs = sourceAttributes(row.node);
    const identity = sourceIdentity(row.node, attrs);
    const type = sourceType(row.node, attrs);
    if (PHYSICAL_CARRIER_TYPES.has(type)) {
      carrierObjects.push(carrierRecord(row, attrs, identity, type));
    } else if (BRANCH_CONTEXT_TYPES.has(type)) {
      branchContexts.push(branchContextRecord(row, attrs, identity, type));
    }
  }
  return {
    schema: SUPPORT_CARRIER_CATALOG_SCHEMA,
    carrierObjects: uniqueById(carrierObjects, 'carrierObjectId'),
    branchContexts: uniqueById(branchContexts, 'branchContextId'),
  };
}

export function resolveSupportFamilyCarriers(supportFamilies, catalog) {
  const carrierIndex = indexRows(catalog.carrierObjects, 'carrierObjectId');
  const branchIndex = indexRows(catalog.branchContexts, 'branchContextId');
  const carriersByBranch = groupByBranch(catalog.carrierObjects);
  const resolutions = [];
  const supportCarrierEdges = [];
  const branchContextEdges = [];
  const diagnostics = [];
  const supportFamiliesOut = (supportFamilies || []).map((family) => {
    const members = (family.members || []).map((member) => {
      const result = resolveMemberCarrier(member, carrierIndex, branchIndex, carriersByBranch);
      resolutions.push(result);
      if (RESOLVED_STATUSES.has(result.resolutionStatus)) {
        supportCarrierEdges.push(physicalCarrierEdge(result));
      } else if (result.resolutionStatus === 'BRANCH_CONTEXT_ONLY') {
        branchContextEdges.push(branchContextEdge(result));
      }
      diagnostics.push(...resolutionDiagnostics(result));
      return { ...cloneJson(member), carrierResolution: result };
    });
    const familyRows = members.map((member) => member.carrierResolution);
    return {
      ...cloneJson(family),
      members,
      carrierObjectIds: unique(familyRows.map((row) => row.carrierObjectId)),
      carrierResolutionStatuses: unique(familyRows.map((row) => row.resolutionStatus)),
      resolvedPhysicalCarrierCount: familyRows.filter((row) => row.physicalCarrierObjectAvailable).length,
      branchContextOnlyMemberCount: familyRows.filter((row) => row.resolutionStatus === 'BRANCH_CONTEXT_ONLY').length,
      unresolvedCarrierMemberCount: familyRows.filter((row) => row.resolutionStatus.startsWith('UNRESOLVED_')).length,
    };
  });
  return {
    supportFamilies: supportFamiliesOut,
    resolutions,
    supportCarrierEdges,
    branchContextEdges,
    diagnostics,
  };
}

function collectProjectionCarrierCatalog(bundle) {
  const lineContext = projectionLineContext(bundle);
  const carrierObjects = (bundle.carriers || []).map((carrier, index) => ({
    schema: SUPPORT_CARRIER_CATALOG_SCHEMA,
    carrierObjectId: normalizeCarrierId(carrier.carrierId || carrier.id || `CARRIER-${index + 1}`),
    carrierObjectClass: 'PROJECTION_CARRIER',
    sourceRecordType: cleanText(carrier.type || 'PROJECTION_CARRIER').toUpperCase(),
    sourcePath: ['carriers', index],
    positionGlobal: carrier.positionGlobal || carrier.position || null,
    worldMatrix: carrier.worldMatrix || null,
    lineContext: {
      ...lineContext,
      carrierId: normalizeCarrierId(carrier.carrierId || carrier.id || `CARRIER-${index + 1}`),
      contextEvidence: unique([...(lineContext.contextEvidence || []), 'PROJECTION_CARRIER_OBJECT']),
    },
    attributes: cloneJson(carrier.attributes || {}),
    physicalCarrierObjectAvailable: true,
    contactEvidenceStatus: 'NOT_PROVEN',
  }));
  return {
    schema: SUPPORT_CARRIER_CATALOG_SCHEMA,
    carrierObjects: uniqueById(carrierObjects, 'carrierObjectId'),
    branchContexts: lineContext.branchNode ? [{
      schema: SUPPORT_CARRIER_CATALOG_SCHEMA,
      branchContextId: normalizeCarrierId(lineContext.branchNode),
      sourceRecordType: 'PROJECTION_BRANCH',
      sourcePath: ['branchId'],
      lineContext,
      physicalCarrierObjectAvailable: false,
    }] : [],
  };
}

function carrierRecord(row, attrs, identity, type) {
  const carrierObjectId = normalizeCarrierId(firstValue(attrs, CARRIER_REFERENCE_KEYS) || identity);
  return {
    schema: SUPPORT_CARRIER_CATALOG_SCHEMA,
    carrierObjectId,
    carrierObjectClass: 'PHYSICAL_PIPE_CARRIER',
    sourceRecordType: type,
    sourcePath: row.path,
    positionGlobal: sourcePositionGlobal(row, attrs),
    worldMatrix: [...(row.worldMatrix || [])],
    lineContext: { ...resolveSupportLineContext(row, attrs), carrierId: carrierObjectId },
    attributes: cloneJson(attrs),
    physicalCarrierObjectAvailable: true,
    contactEvidenceStatus: 'NOT_PROVEN',
  };
}

function branchContextRecord(row, attrs, identity, type) {
  const branchContextId = normalizeCarrierId(identity || firstValue(attrs, ['BRANCH_ID', 'BRANCH_NODE']));
  const fullLineTag = cleanText(attrs.FULL_LINE_TAG || attrs.LINE_TAG)
    || cleanText(branchContextId).replace(/^\//u, '').replace(/\/B(?:RANCH)?[-_A-Z0-9.]*$/iu, '');
  return {
    schema: SUPPORT_CARRIER_CATALOG_SCHEMA,
    branchContextId,
    sourceRecordType: type,
    sourcePath: row.path,
    lineContext: {
      branchNode: branchContextId,
      fullLineTag: fullLineTag || null,
      lineFamily: cleanText(attrs.LINE_FAMILY) || fullLineTag || null,
      contextQuality: 'MEDIUM',
      contextEvidence: ['TYPED_BRANCH_CONTEXT_OBJECT'],
      ownerFallbackUsed: false,
    },
    physicalCarrierObjectAvailable: false,
  };
}

function resolveMemberCarrier(member, carrierIndex, branchIndex, carriersByBranch) {
  const explicitReference = normalizeCarrierId(firstValue(member.attributes || {}, CARRIER_REFERENCE_KEYS));
  const hierarchyReference = normalizeCarrierId(member.lineContext?.carrierId);
  const branchNode = normalizeCarrierId(member.lineContext?.branchNode || member.sourceParentBranch);
  const base = {
    schema: SUPPORT_CARRIER_RESOLUTION_SCHEMA,
    evidenceId: `SSCR:${member.memberId || 'UNKNOWN_MEMBER'}`,
    supportFamilyId: supportFamilyRoot(member.memberId),
    supportMemberId: member.memberId || null,
    supportMemberRole: member.semanticRole || 'OTHER_FAMILY_MEMBER',
    branchNode: branchNode || null,
    explicitCarrierReference: explicitReference || null,
    hierarchyCarrierReference: hierarchyReference || null,
    carrierObjectId: null,
    branchContextId: null,
    physicalCarrierObjectAvailable: false,
    contactEvidenceStatus: 'NOT_PROVEN',
    relationshipCardinality: 'UNRESOLVED',
  };
  if (EXEMPT_ROLES.has(base.supportMemberRole) && !explicitReference && !hierarchyReference) {
    return resolvedRecord(base, 'NOT_APPLICABLE_SYMBOLIC_MEMBER', 'NONE', []);
  }
  if (explicitReference) {
    const matches = carrierIndex.get(token(explicitReference)) || [];
    if (matches.length === 1) return resolvedCarrier(base, matches[0], 'RESOLVED_EXPLICIT_CARRIER', 'HIGH', ['EXPLICIT_CARRIER_REFERENCE']);
    if (matches.length > 1) return ambiguousCarrier(base, matches, 'EXPLICIT_CARRIER_REFERENCE');
    return resolvedRecord(base, 'UNRESOLVED_CARRIER_REFERENCE', 'NONE', ['EXPLICIT_CARRIER_REFERENCE_NOT_FOUND']);
  }
  if (hierarchyReference) {
    const matches = carrierIndex.get(token(hierarchyReference)) || [];
    if (matches.length === 1) return resolvedCarrier(base, matches[0], 'RESOLVED_HIERARCHY_CARRIER', 'HIGH', ['TYPED_CARRIER_ANCESTOR']);
    if (matches.length > 1) return ambiguousCarrier(base, matches, 'TYPED_CARRIER_ANCESTOR');
  }
  const branchMatches = carriersByBranch.get(token(branchNode)) || [];
  if (branchMatches.length === 1) {
    return resolvedCarrier(base, branchMatches[0], 'RESOLVED_UNIQUE_BRANCH_CARRIER', 'MEDIUM', ['UNIQUE_PHYSICAL_CARRIER_IN_BRANCH']);
  }
  if (branchMatches.length > 1) return ambiguousCarrier(base, branchMatches, 'MULTIPLE_PHYSICAL_CARRIERS_IN_BRANCH');
  const branchContext = (branchIndex.get(token(branchNode)) || [])[0];
  if (branchContext) {
    return {
      ...resolvedRecord(base, 'BRANCH_CONTEXT_ONLY', 'LOW', ['TYPED_BRANCH_CONTEXT_OBJECT']),
      branchContextId: branchContext.branchContextId,
      relationshipCardinality: 'ONE_BRANCH_CONTEXT',
    };
  }
  return resolvedRecord(base, 'UNRESOLVED_NO_CARRIER', 'NONE', ['NO_AUTHORITATIVE_CARRIER_OBJECT']);
}

function resolvedCarrier(base, carrier, status, confidence, basis) {
  return {
    ...resolvedRecord(base, status, confidence, basis),
    carrierObjectId: carrier.carrierObjectId,
    carrierObjectClass: carrier.carrierObjectClass,
    carrierSourceRecordType: carrier.sourceRecordType,
    physicalCarrierObjectAvailable: true,
    relationshipCardinality: 'ONE_TO_ONE',
  };
}

function ambiguousCarrier(base, carriers, basis) {
  return {
    ...resolvedRecord(base, 'AMBIGUOUS_CARRIER_OBJECT', 'NONE', [basis]),
    candidateCarrierObjectIds: unique(carriers.map((row) => row.carrierObjectId)),
    relationshipCardinality: 'ONE_TO_MANY_AMBIGUOUS',
  };
}

function resolvedRecord(base, resolutionStatus, confidence, relationshipBasis) {
  return { ...base, resolutionStatus, confidence, relationshipBasis, candidateCarrierObjectIds: [] };
}

function physicalCarrierEdge(row) {
  return {
    edgeId: `SSCR-EDGE:${row.supportMemberId}::${row.carrierObjectId}`,
    edgeType: 'SUPPORT_MEMBER_TO_CARRIER',
    supportFamilyId: row.supportFamilyId,
    supportMemberId: row.supportMemberId,
    carrierObjectId: row.carrierObjectId,
    relationshipStatus: row.resolutionStatus,
    relationshipBasis: row.relationshipBasis,
    confidence: row.confidence,
    evidenceId: row.evidenceId,
    evidenceClass: 'AUTHORITATIVE_CONTEXT',
    contactEvidenceStatus: 'NOT_PROVEN',
  };
}

function branchContextEdge(row) {
  return {
    edgeId: `SSCR-BRANCH:${row.supportMemberId}::${row.branchContextId}`,
    edgeType: 'SUPPORT_MEMBER_TO_BRANCH_CONTEXT',
    supportFamilyId: row.supportFamilyId,
    supportMemberId: row.supportMemberId,
    branchContextId: row.branchContextId,
    relationshipStatus: row.resolutionStatus,
    relationshipBasis: row.relationshipBasis,
    confidence: row.confidence,
    evidenceId: row.evidenceId,
    evidenceClass: 'CONTEXT_ONLY',
    contactEvidenceStatus: 'NOT_PROVEN',
  };
}

function resolutionDiagnostics(row) {
  if (row.resolutionStatus === 'UNRESOLVED_CARRIER_REFERENCE') return [diagnostic(row, 'WARN', 'CARRIER_REFERENCE_NOT_FOUND', 'The explicit carrier reference does not match an authoritative carrier object.')];
  if (row.resolutionStatus === 'AMBIGUOUS_CARRIER_OBJECT') return [diagnostic(row, 'WARN', 'AMBIGUOUS_CARRIER_OBJECT', 'More than one authoritative carrier object satisfies the available context.')];
  if (row.resolutionStatus === 'BRANCH_CONTEXT_ONLY') return [diagnostic(row, 'INFO', 'BRANCH_CONTEXT_WITHOUT_PHYSICAL_CARRIER', 'A branch context is known, but no physical carrier object is available.')];
  if (row.resolutionStatus === 'UNRESOLVED_NO_CARRIER') return [diagnostic(row, 'INFO', 'NO_AUTHORITATIVE_CARRIER_OBJECT', 'No physical carrier object or branch context could be resolved.')];
  return [];
}

function diagnostic(row, severity, code, message) {
  return { severity, code, supportFamilyId: row.supportFamilyId, supportMemberId: row.supportMemberId, message };
}

function buildSummary(catalog, resolution) {
  return {
    carrierObjectCount: catalog.carrierObjects.length,
    branchContextCount: catalog.branchContexts.length,
    supportMemberResolutionCount: resolution.resolutions.length,
    resolvedPhysicalCarrierCount: resolution.resolutions.filter((row) => row.physicalCarrierObjectAvailable).length,
    explicitCarrierResolutionCount: resolution.resolutions.filter((row) => row.resolutionStatus === 'RESOLVED_EXPLICIT_CARRIER').length,
    hierarchyCarrierResolutionCount: resolution.resolutions.filter((row) => row.resolutionStatus === 'RESOLVED_HIERARCHY_CARRIER').length,
    branchUniqueCarrierResolutionCount: resolution.resolutions.filter((row) => row.resolutionStatus === 'RESOLVED_UNIQUE_BRANCH_CARRIER').length,
    branchContextOnlyCount: resolution.resolutions.filter((row) => row.resolutionStatus === 'BRANCH_CONTEXT_ONLY').length,
    ambiguousCarrierCount: resolution.resolutions.filter((row) => row.resolutionStatus === 'AMBIGUOUS_CARRIER_OBJECT').length,
    unresolvedCarrierCount: resolution.resolutions.filter((row) => row.resolutionStatus.startsWith('UNRESOLVED_')).length,
  };
}

function projectionLineContext(bundle) {
  const branchNode = normalizeCarrierId(bundle.branchId);
  const fullLineTag = cleanText(bundle.fullLineTag || bundle.lineTag)
    || cleanText(branchNode).replace(/^\//u, '').replace(/\/B(?:RANCH)?[-_A-Z0-9.]*$/iu, '');
  return {
    branchNode: branchNode || null,
    fullLineTag: fullLineTag || null,
    lineFamily: cleanText(bundle.lineFamily) || fullLineTag || null,
    contextQuality: branchNode ? 'HIGH' : 'NONE',
    contextEvidence: branchNode ? ['PROJECTION_BUNDLE_BRANCH'] : [],
    ownerFallbackUsed: false,
  };
}

function sourcePositionGlobal(row, attrs) {
  const point = readPosition(attrs, ['WORLD_POS', 'WORLD_POSITION', 'POS', 'POSITION', 'CENTRE', 'CENTER', 'ORIGIN']);
  if (!point) return null;
  const coordinateSpace = cleanText(attrs.POSITION_COORDINATE_SPACE || attrs.COORDINATE_SPACE).toUpperCase();
  if (coordinateSpace === 'WORLD' || coordinateSpace === 'GLOBAL') return point;
  if (row.transformBasis && row.transformBasis !== 'IDENTITY' && row.worldMatrix?.length === 16) return transformPoint(row.worldMatrix, point);
  return point;
}

function groupByBranch(carriers) {
  const map = new Map();
  for (const carrier of carriers || []) {
    const key = token(carrier.lineContext?.branchNode);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(carrier);
  }
  return map;
}

function indexRows(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    const id = token(row[key]);
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}

function uniqueById(rows, key) {
  const seen = new Set();
  return rows.filter((row) => {
    const id = token(row[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function firstValue(attrs, keys) {
  for (const key of keys || []) {
    const value = cleanText(attrs?.[key]);
    if (value) return value;
  }
  return '';
}

function normalizeCarrierId(value) {
  const text = cleanText(value).replace(/\(REF\)$/iu, '');
  return text ? normalizeIdentity(text) : '';
}

function supportFamilyRoot(memberId) {
  return normalizeCarrierId(memberId).replace(/(?:\/DATUM|\/SREF|\.\d+)$/iu, '');
}

function token(value) {
  return cleanText(value).replace(/\(REF\)$/iu, '').toUpperCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}
