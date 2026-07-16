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

export function projectEvidenceFamily(bundle, family, index, chain) {
  const context = deriveEvidenceFamilyContext(family);
  const supportGroup = createEvidenceSupportGroup(context.lineFamily, family.familyId);
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
  const exceptions = createEvidenceFamilyExceptions({
    family,
    context,
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
      resolvedRelationships,
      physicalTerminals,
      symbolicTerminals,
      memberEdges,
      exceptions,
      evidenceIds,
    ),
    lineSupportTreeRow: {
      supportGroup,
      treeText: createEvidenceLineTree(
        family,
        context,
        supportGroup,
        relationships,
        memberEdges,
        terminalEdges,
      ),
    },
    structureContactRows: physicalTerminals.map((edge) => structureContactRow(edge, context, supportGroup)),
    supportChainRows: memberEdges.map((edge) => supportChainRow(edge, context, supportGroup)),
    supportMemberRows: createEvidenceMemberRows(
      family,
      supportGroup,
      relationships,
      memberEdges,
      referenceEdges,
      terminalEdges,
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
    ),
    lineFamilyRow: {
      lineFamily: context.lineFamily || 'NO_LINE_FAMILY',
      evidenceCount: evidenceIds.length,
      supportGroup,
      supportFamilyId: family.familyId,
    },
    relationshipCount: relationships.length,
    symbolicReferenceCount: referenceEdges.length + symbolicTerminals.length,
  };
}

function familyEdges(rows = [], familyId) {
  return rows.filter((row) => row.supportFamilyId === familyId);
}

function createSummaryRow(
  family,
  index,
  context,
  supportGroup,
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
    branchNode: context.branchNode,
    branchNodes: context.branchNodes,
    lineFamily: context.lineFamily,
    psRoot: family.familyId,
    supportGroup,
    structuralGroupCount: structuralGroups.length,
    supportCount: members.length,
    supportMembers: members,
    evidenceIds,
    status,
    remarks: summaryRemarks(physicalTerminals, memberEdges, symbolicTerminals),
    evidenceMode: PS_FAMILY_EVIDENCE_MODE,
  };
}

function structureContactRow(edge, context, supportGroup) {
  return {
    supportGroup,
    structuralGroup: edge.steelGroupId || '',
    structuralMember: edge.structuralMemberId || '',
    support: edge.supportMemberId || '',
    line: context.fullLineTag,
    lineFamily: context.lineFamily,
    branchNode: context.branchNode,
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

function supportChainRow(edge, context, supportGroup) {
  return {
    supportGroup,
    supportA: edge.supportA,
    supportB: edge.supportB,
    line: context.fullLineTag,
    lineFamily: context.lineFamily,
    branchNode: context.branchNode,
    chainEvidence: evidenceId(edge),
    distance: edge.distanceMm ?? null,
    point: edge.contactPointGlobal || null,
    evidenceClass: edge.evidenceClass || 'ANALYTICAL',
    contactEvidenceStatus: edge.contactEvidenceStatus || '',
    remarks: 'Analytical support-member chain edge.',
  };
}

function createEvidenceLineTree(
  family,
  context,
  supportGroup,
  relationships,
  memberEdges,
  terminalEdges,
) {
  const branches = context.branchNodes.length ? context.branchNodes : ['None'];
  const members = (family.members || []).map((member) => (
    `${member.memberId || '(unresolved)'} [${member.semanticRole || 'OTHER'}]`
  ));
  const steel = uniqueSorted(relationships
    .map((row) => row.structuralMemberId || row.steelGroupId)
    .filter(Boolean));
  const chains = memberEdges.map((edge) => `${edge.supportA} ↔ ${edge.supportB}`);
  const terminals = terminalEdges.map((edge) => (
    `${edge.supportMemberId} → ${edge.structuralMemberId || edge.steelGroupId}`
  ));
  return [
    `Line: ${context.fullLineTag || 'Unknown'}`,
    `└─ Branches: ${branches.join(', ')}`,
    `   └─ SupportGroup: ${supportGroup}`,
    `      ├─ Support family: ${family.familyId}`,
    '      ├─ Members',
    ...(members.length ? members.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    '      ├─ Member chain',
    ...(chains.length ? chains.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    '      ├─ Structural terminals',
    ...(terminals.length ? terminals.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    `      └─ Structural evidence: ${steel.join(', ') || 'None'}`,
  ].join('\n');
}

function summaryRemarks(physicalTerminals, memberEdges, symbolicTerminals) {
  if (physicalTerminals.length && memberEdges.length) return 'Analytical support chain with structural terminal.';
  if (physicalTerminals.length) return 'Direct analytical structural terminal.';
  if (symbolicTerminals.length) return 'Symbolic structural reference only.';
  return 'Incomplete XML-free relationship graph.';
}
