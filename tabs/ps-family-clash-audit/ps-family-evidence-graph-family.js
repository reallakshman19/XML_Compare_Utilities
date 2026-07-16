import { uniqueSorted } from './ps-family-token-utils.js';
import {
  PS_FAMILY_EVIDENCE_MODE,
  createEvidenceSupportGroup,
  deriveEvidenceFamilyContext,
  evidenceId,
} from './ps-family-evidence-graph-shared.js';
import { createEvidenceFamilyExceptions } from './ps-family-evidence-graph-exceptions.js';
import {
  createEvidenceInputRows,
  createEvidenceMatrixRows,
  createEvidenceMemberRows,
  createEvidenceStructureBasisRows,
} from './ps-family-evidence-graph-edges.js';
import {
  createMemberLineMembershipIndex,
  deriveEvidenceFamilyLineMemberships,
  lineProjectionFields,
  resolveEdgeLineProjection,
  resolveMemberLineMembership,
} from './ps-family-evidence-line-memberships.js';

export function projectEvidenceFamily(bundle, family, index, chain) {
  const context = deriveEvidenceFamilyContext(family);
  const memberships = deriveEvidenceFamilyLineMemberships(family, context);
  const membershipIndex = createMemberLineMembershipIndex(memberships);
  const primaryMembership = memberships.find((row) => row.isPrimary) || memberships[0] || null;
  const supportGroup = primaryMembership?.supportGroup
    || createEvidenceSupportGroup(context.lineFamily, family.familyId);
  const relationships = (bundle.relationships || []).filter((row) => row.supportFamilyId === family.familyId);
  const resolvedRelationships = relationships.filter((row) => (
    row.steelGroupId && String(row.relationshipStatus || '').startsWith('RESOLVED_')
  ));
  const ambiguousRelationships = relationships.filter((row) => row.relationshipStatus === 'AMBIGUOUS');
  const memberEdges = familyEdges(chain.supportChainEdges, family.familyId);
  const nearbyEdges = familyEdges(chain.nearbyCandidateEdges, family.familyId);
  const referenceEdges = familyEdges(chain.referenceEdges, family.familyId);
  const terminalEdges = familyEdges(chain.structuralTerminalEdges, family.familyId);
  const physicalTerminals = terminalEdges.filter((row) => row.edgeType === 'SUPPORT_MEMBER_TO_STRUCTURE');
  const symbolicTerminals = terminalEdges.filter((row) => row.edgeType === 'STRUCTURAL_REFERENCE');
  const familyChain = (chain.familyChains || []).find((row) => row.supportFamilyId === family.familyId) || {};
  const crossLineEdges = memberEdges.filter((edge) => (
    resolveEdgeLineProjection(edge, membershipIndex, primaryMembership).crossLine
  ));
  const exceptions = createEvidenceFamilyExceptions({
    family,
    context,
    memberships,
    crossLineEdges,
    supportGroup,
    resolvedRelationships,
    ambiguousRelationships,
    memberEdges,
    nearbyEdges,
    physicalTerminals,
    symbolicTerminals,
    familyChain,
  });
  const evidenceIds = uniqueSorted([
    ...relationships.map(evidenceId),
    ...memberEdges.map(evidenceId),
    ...referenceEdges.map(evidenceId),
    ...terminalEdges.map(evidenceId),
  ]);

  return {
    supportSummaryRow: createSummaryRow(
      family,
      index,
      context,
      supportGroup,
      memberships,
      resolvedRelationships,
      physicalTerminals,
      symbolicTerminals,
      memberEdges,
      exceptions,
      evidenceIds,
    ),
    lineMembershipRows: memberships.map((membership) => membershipRow(membership)),
    lineSupportTreeRows: memberships.map((membership) => ({
      membershipId: membership.membershipId,
      supportGroup: membership.supportGroup,
      lineFamily: membership.lineFamily,
      fullLineTag: membership.fullLineTag,
      branchNode: membership.branchNode,
      treeText: createEvidenceLineTree(
        family,
        membership,
        relationships,
        memberEdges,
        terminalEdges,
      ),
    })),
    structureContactRows: physicalTerminals.map((edge) => structureContactRow(
      edge,
      membershipIndex,
      primaryMembership,
    )),
    supportChainRows: memberEdges.map((edge) => supportChainRow(
      edge,
      membershipIndex,
      primaryMembership,
    )),
    supportMemberRows: createEvidenceMemberRows(
      family,
      supportGroup,
      relationships,
      memberEdges,
      referenceEdges,
      terminalEdges,
      membershipIndex,
      primaryMembership,
    ),
    supportExceptionRows: exceptions,
    inputEvidenceRows: createEvidenceInputRows(
      family,
      supportGroup,
      context,
      relationships,
      memberEdges,
      nearbyEdges,
      referenceEdges,
      terminalEdges,
      membershipIndex,
      primaryMembership,
    ),
    connectivityMatrixRows: createEvidenceMatrixRows(
      supportGroup,
      relationships,
      memberEdges,
      referenceEdges,
      terminalEdges,
    ),
    structureLineProximityRows: createEvidenceStructureBasisRows(
      bundle,
      family,
      supportGroup,
      context,
      relationships,
      physicalTerminals,
      membershipIndex,
      primaryMembership,
    ),
    lineFamilyRows: memberships.map((membership) => ({
      lineFamily: membership.lineFamily || 'NO_LINE_FAMILY',
      fullLineTag: membership.fullLineTag,
      branchNode: membership.branchNode,
      lineMembershipId: membership.membershipId,
      evidenceCount: membershipEvidenceCount(
        membership,
        relationships,
        memberEdges,
        referenceEdges,
        terminalEdges,
      ),
      supportGroup: membership.supportGroup,
      supportFamilyId: family.familyId,
    })),
    relationshipCount: relationships.length,
    symbolicReferenceCount: referenceEdges.length + symbolicTerminals.length,
    crossLineSupportEdgeCount: crossLineEdges.length,
  };
}

function familyEdges(rows = [], familyId) {
  return rows.filter((row) => row.supportFamilyId === familyId);
}

function membershipRow(membership) {
  return {
    ...membership,
    memberCount: membership.memberIds.length,
    carrierCount: membership.carrierIds.length,
  };
}

function createSummaryRow(
  family,
  index,
  context,
  supportGroup,
  memberships,
  resolvedRelationships,
  physicalTerminals,
  symbolicTerminals,
  memberEdges,
  exceptions,
  evidenceIds,
) {
  const members = (family.members || []).map((member) => member.memberId).filter(Boolean);
  const structuralGroups = uniqueSorted(resolvedRelationships.map((row) => row.steelGroupId));
  const status = exceptions.some((row) => row.severity === 'ERROR')
    ? 'ERROR'
    : exceptions.some((row) => row.severity === 'WARN') ? 'WARN' : 'OK';
  return {
    no: index + 1,
    line: context.fullLineTag,
    fullLineTags: context.fullLineTags,
    branchNode: context.branchNode,
    branchNodes: context.branchNodes,
    lineFamily: context.lineFamily,
    lineFamilies: context.lineFamilies,
    lineMembershipCount: memberships.length,
    lineMembershipIds: memberships.map((row) => row.membershipId),
    psRoot: family.familyId,
    supportGroup,
    structuralGroupCount: structuralGroups.length,
    supportCount: members.length,
    supportMembers: members,
    evidenceIds,
    status,
    remarks: summaryRemarks(physicalTerminals, memberEdges, symbolicTerminals, memberships),
    evidenceMode: PS_FAMILY_EVIDENCE_MODE,
  };
}

function structureContactRow(edge, membershipIndex, primaryMembership) {
  const projection = resolveEdgeLineProjection(edge, membershipIndex, primaryMembership);
  const fields = lineProjectionFields(projection);
  return {
    supportGroup: projection.membership?.supportGroup || primaryMembership?.supportGroup || '',
    structuralGroup: edge.steelGroupId || '',
    structuralMember: edge.structuralMemberId || '',
    support: edge.supportMemberId || '',
    ...fields,
    contactEvidence: evidenceId(edge),
    distance: edge.distanceMm ?? null,
    point: edge.contactPointGlobal || edge.nearestPointOnSupportGlobal || null,
    evidenceClass: edge.evidenceClass || 'ANALYTICAL',
    contactEvidenceStatus: edge.contactEvidenceStatus || '',
    remarks: edge.relationshipStatus === 'RESOLVED_ANALYTICAL_CONTACT'
      ? 'Analytical support-member to structure contact candidate.'
      : 'Analytical support-member to structure proximity candidate.',
  };
}

function supportChainRow(edge, membershipIndex, primaryMembership) {
  const projection = resolveEdgeLineProjection(edge, membershipIndex, primaryMembership);
  const fields = lineProjectionFields(projection);
  return {
    supportGroup: projection.membership?.supportGroup || primaryMembership?.supportGroup || '',
    supportA: edge.supportA,
    supportB: edge.supportB,
    ...fields,
    chainEvidence: evidenceId(edge),
    distance: edge.distanceMm ?? null,
    point: edge.contactPointGlobal || null,
    evidenceClass: edge.evidenceClass || 'ANALYTICAL',
    contactEvidenceStatus: edge.contactEvidenceStatus || '',
    remarks: projection.crossLine
      ? 'Analytical support-member edge spans multiple line memberships.'
      : 'Analytical support-member chain edge.',
  };
}

function createEvidenceLineTree(family, membership, relationships, memberEdges, terminalEdges) {
  const memberIds = new Set(membership.memberIds || []);
  const members = (family.members || [])
    .filter((member) => memberIds.has(member.memberId))
    .map((member) => `${member.memberId || '(unresolved)'} [${member.semanticRole || 'OTHER'}]`);
  const steel = uniqueSorted(relationships
    .map((row) => row.structuralMemberId || row.steelGroupId)
    .filter(Boolean));
  const chains = memberEdges
    .filter((edge) => memberIds.has(edge.supportA) || memberIds.has(edge.supportB))
    .map((edge) => `${edge.supportA} ↔ ${edge.supportB}`);
  const terminals = terminalEdges
    .filter((edge) => memberIds.has(edge.supportMemberId))
    .map((edge) => `${edge.supportMemberId} → ${edge.structuralMemberId || edge.steelGroupId}`);
  return [
    `Line: ${membership.fullLineTag || 'Unknown'}`,
    `└─ Branch: ${membership.branchNode || 'None'}`,
    `   └─ SupportGroup: ${membership.supportGroup}`,
    `      ├─ Support family: ${family.familyId}`,
    `      ├─ Line membership: ${membership.membershipId}`,
    '      ├─ Members',
    ...(members.length ? members.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    '      ├─ Member chain',
    ...(chains.length ? chains.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    '      ├─ Structural terminals',
    ...(terminals.length ? terminals.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    `      └─ Structural evidence: ${steel.join(', ') || 'None'}`,
  ].join('\n');
}

function membershipEvidenceCount(membership, relationships, memberEdges, referenceEdges, terminalEdges) {
  const memberIds = new Set(membership.memberIds || []);
  const rows = [
    ...relationships,
    ...memberEdges.filter((edge) => memberIds.has(edge.supportA) || memberIds.has(edge.supportB)),
    ...referenceEdges.filter((edge) => memberIds.has(edge.fromMemberId) || memberIds.has(edge.toMemberId)),
    ...terminalEdges.filter((edge) => memberIds.has(edge.supportMemberId)),
  ];
  return uniqueSorted(rows.map(evidenceId)).length;
}

function summaryRemarks(physicalTerminals, memberEdges, symbolicTerminals, memberships) {
  const suffix = memberships.length > 1 ? ` Shared across ${memberships.length} line memberships.` : '';
  if (physicalTerminals.length && memberEdges.length) return `Analytical support chain with structural terminal.${suffix}`;
  if (physicalTerminals.length) return `Direct analytical structural terminal.${suffix}`;
  if (symbolicTerminals.length) return `Symbolic structural reference only.${suffix}`;
  return `Incomplete XML-free relationship graph.${suffix}`;
}
