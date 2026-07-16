import { PS_FAMILY_CLASH_AUDIT_SCHEMA, PS_FAMILY_STATUS } from './ps-family-clash-audit-contract.js';
import { extractFamilyRoot, uniqueSorted } from './ps-family-token-utils.js';

export const PS_FAMILY_EVIDENCE_AUDIT_SCHEMA = 'ps-family-evidence-audit/v1';
export const PS_FAMILY_EVIDENCE_MODE = 'RELATIONSHIP_BUNDLE';
export const PS_FAMILY_EVIDENCE_SOURCE_SCHEMA = 'SupportSteelRelationshipBundle.v1';

const SYMBOLIC_ROLES = new Set(['DATUM', 'STRUCTURAL_REFERENCE']);

export function parsePsFamilyEvidenceBundle(value, label = 'Relationship bundle') {
  if (value && typeof value === 'object') return validateBundle(value, label);
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label} is empty.`);
  try {
    return validateBundle(JSON.parse(text), label);
  } catch (error) {
    if (error?.code === 'PSFA_INVALID_BUNDLE') throw error;
    throw new Error(`${label} is not valid JSON: ${error.message || error}`);
  }
}

export function createPsFamilyEvidenceReadiness(input = {}) {
  const diagnostics = [];
  let bundle = null;
  try {
    bundle = parsePsFamilyEvidenceBundle(input.relationshipBundle ?? input.relationshipBundleText);
  } catch (error) {
    diagnostics.push(diag('ERROR', 'INVALID_RELATIONSHIP_BUNDLE', error.message || String(error)));
  }
  if (bundle) diagnostics.push(...bundleDiagnostics(bundle));
  const expectedRows = input.expectedRows || [];
  const detailRows = input.elementDetailRows || [];
  const summary = bundle
    ? readinessSummary(bundle, expectedRows, detailRows, diagnostics, input.config)
    : emptyReadinessSummary(diagnostics);
  return Object.freeze({ summary, diagnostics, blocking: diagnostics.some((item) => item.level === 'ERROR') });
}

export function buildPsFamilyEvidenceAudit(input = {}) {
  const bundle = parsePsFamilyEvidenceBundle(input.relationshipBundle ?? input.relationshipBundleText);
  const config = resolveConfig(input.config);
  const diagnostics = [...bundleDiagnostics(bundle), ...normalizeDiagnostics(input.diagnostics), ...normalizeDiagnostics(bundle.diagnostics)];
  const expectedRows = input.expectedRows || [];
  const detailRows = input.elementDetailRows || [];
  const posFamilies = input.posFamilies || [];
  const selectedFamilies = filterFamilies(bundle.supportFamilies || [], config.sourceFamily);
  const chain = bundle.supportMemberChain || {};
  const reports = createGraphReports(bundle, selectedFamilies, chain, config, diagnostics);
  const coverage = createCoverageReports(selectedFamilies, expectedRows, detailRows, config);
  const sourceFamily = detectedSourceFamily(selectedFamilies, config);
  const summary = {
    sourceFamily,
    evidenceMode: PS_FAMILY_EVIDENCE_MODE,
    sourceSchema: bundle.schema,
    expectedCount: expectedRows.length,
    clashCount: 0,
    psClashCount: 0,
    graphEvidenceCount: reports.inputEvidenceRows.length,
    relationshipCount: reports.relationshipCount,
    supportChainEdgeCount: reports.supportChainRows.length,
    structuralTerminalCount: reports.structureContactRows.length,
    symbolicReferenceCount: reports.symbolicReferenceCount,
    supportGroupCount: reports.supportSummaryRows.length,
    supportExceptionCount: reports.supportExceptionRows.length,
    foundExactCount: coverage.coverageRows.filter((row) => row.found).length,
    missingCount: coverage.missingRows.length,
    outOfFamilyCount: 0,
    duplicateMemberCount: coverage.duplicateRows.length,
    unexpectedInFamilyCount: coverage.unexpectedInFamilyRows.length,
    posFamilyCount: posFamilies.length,
    psClashReportCount: reports.supportMemberRows.length,
    structureLineProximityCount: reports.structureLineProximityRows.length,
    coveragePct: expectedRows.length
      ? Number(((coverage.coverageRows.filter((row) => row.found).length / expectedRows.length) * 100).toFixed(2))
      : 0,
  };
  return {
    schema: PS_FAMILY_EVIDENCE_AUDIT_SCHEMA,
    legacyReportContractSchema: PS_FAMILY_CLASH_AUDIT_SCHEMA,
    evidenceMode: PS_FAMILY_EVIDENCE_MODE,
    sourceSchema: bundle.schema,
    summary,
    coverageRows: coverage.coverageRows,
    clashRows: [],
    graphEvidenceRows: reports.inputEvidenceRows,
    psClashRows: [],
    psClashReportRows: reports.supportMemberRows,
    missingRows: coverage.missingRows,
    outOfFamilyRows: [],
    duplicateRows: coverage.duplicateRows,
    unexpectedInFamilyRows: coverage.unexpectedInFamilyRows,
    lineFamilyRows: reports.lineFamilyRows,
    posFamilyRows: posFamilies,
    sourceVsPosFamilyRows: createSourceVsPosRows(selectedFamilies, coverage.coverageRows, posFamilies),
    diagnostics,
    ...reports,
  };
}

function validateBundle(bundle, label) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) throw invalidBundle(`${label} must be an object.`);
  if (bundle.schema !== PS_FAMILY_EVIDENCE_SOURCE_SCHEMA) {
    throw invalidBundle(`${label} schema must be ${PS_FAMILY_EVIDENCE_SOURCE_SCHEMA}; received ${bundle.schema || 'none'}.`);
  }
  if (!Array.isArray(bundle.supportFamilies)) throw invalidBundle(`${label} is missing supportFamilies.`);
  if (!Array.isArray(bundle.relationships)) throw invalidBundle(`${label} is missing relationships.`);
  return bundle;
}

function invalidBundle(message) {
  const error = new Error(message);
  error.code = 'PSFA_INVALID_BUNDLE';
  return error;
}

function readinessSummary(bundle, expectedRows, detailRows, diagnostics, config = {}) {
  const families = filterFamilies(bundle.supportFamilies || [], config.sourceFamily);
  const chain = bundle.supportMemberChain || {};
  const physicalTerminals = (chain.structuralTerminalEdges || []).filter((edge) => edge.edgeType === 'SUPPORT_MEMBER_TO_STRUCTURE');
  return {
    evidenceMode: PS_FAMILY_EVIDENCE_MODE,
    sourceFamily: detectedSourceFamily(families, resolveConfig(config)),
    structureContactCount: physicalTerminals.length,
    supportChainCount: (chain.supportChainEdges || []).length,
    xmlClashCount: 0,
    psClashCount: 0,
    expectedCount: expectedRows.length,
    detailCount: detailRows.length,
    positionParsedCount: detailRows.filter((row) => row.position).length,
    positionMissingCount: detailRows.filter((row) => !row.position).length,
    posFamilyCount: 0,
    relationshipCount: bundle.relationships.length,
    supportFamilyCount: families.length,
    errorCount: diagnostics.filter((item) => item.level === 'ERROR').length,
    warnCount: diagnostics.filter((item) => item.level === 'WARN').length,
    infoCount: diagnostics.filter((item) => item.level === 'INFO').length,
  };
}

function emptyReadinessSummary(diagnostics) {
  return {
    evidenceMode: PS_FAMILY_EVIDENCE_MODE,
    sourceFamily: '',
    structureContactCount: 0,
    supportChainCount: 0,
    xmlClashCount: 0,
    psClashCount: 0,
    expectedCount: 0,
    detailCount: 0,
    positionParsedCount: 0,
    positionMissingCount: 0,
    posFamilyCount: 0,
    relationshipCount: 0,
    supportFamilyCount: 0,
    errorCount: diagnostics.filter((item) => item.level === 'ERROR').length,
    warnCount: diagnostics.filter((item) => item.level === 'WARN').length,
    infoCount: diagnostics.filter((item) => item.level === 'INFO').length,
  };
}

function createGraphReports(bundle, families, chain, config, diagnostics) {
  const supportSummaryRows = [];
  const lineSupportTreeRows = [];
  const structureContactRows = [];
  const supportChainRows = [];
  const supportMemberRows = [];
  const supportExceptionRows = [];
  const inputEvidenceRows = [];
  const connectivityMatrixRows = [];
  const structureLineProximityRows = [];
  const lineFamilyRows = [];
  let relationshipCount = 0;
  let symbolicReferenceCount = 0;

  families.forEach((family, index) => {
    const context = deriveFamilyContext(family);
    const supportGroup = createSupportGroup(context.lineFamily, family.familyId);
    const relationships = (bundle.relationships || []).filter((row) => row.supportFamilyId === family.familyId);
    const resolvedRelationships = relationships.filter((row) => row.steelGroupId && String(row.relationshipStatus || '').startsWith('RESOLVED_'));
    const ambiguousRelationships = relationships.filter((row) => row.relationshipStatus === 'AMBIGUOUS');
    const memberEdges = (chain.supportChainEdges || []).filter((row) => row.supportFamilyId === family.familyId);
    const nearbyEdges = (chain.nearbyCandidateEdges || []).filter((row) => row.supportFamilyId === family.familyId);
    const referenceEdges = (chain.referenceEdges || []).filter((row) => row.supportFamilyId === family.familyId);
    const terminalEdges = (chain.structuralTerminalEdges || []).filter((row) => row.supportFamilyId === family.familyId);
    const physicalTerminals = terminalEdges.filter((row) => row.edgeType === 'SUPPORT_MEMBER_TO_STRUCTURE');
    const symbolicTerminals = terminalEdges.filter((row) => row.edgeType === 'STRUCTURAL_REFERENCE');
    const familyChain = (chain.familyChains || []).find((row) => row.supportFamilyId === family.familyId) || {};
    const familyExceptions = createFamilyExceptions({
      family, context, supportGroup, resolvedRelationships, ambiguousRelationships, memberEdges,
      nearbyEdges, physicalTerminals, symbolicTerminals, familyChain,
    });
    supportExceptionRows.push(...familyExceptions);
    relationshipCount += relationships.length;
    symbolicReferenceCount += referenceEdges.length + symbolicTerminals.length;

    const members = (family.members || []).map((member) => member.memberId).filter(Boolean);
    const structuralGroups = uniqueSorted(resolvedRelationships.map((row) => row.steelGroupId));
    const evidenceIds = uniqueSorted([
      ...relationships.map(evidenceId),
      ...memberEdges.map(evidenceId),
      ...referenceEdges.map(evidenceId),
      ...terminalEdges.map(evidenceId),
    ]);
    const status = familyExceptions.some((row) => row.severity === 'ERROR')
      ? 'ERROR'
      : familyExceptions.some((row) => row.severity === 'WARN') ? 'WARN' : 'OK';
    supportSummaryRows.push({
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
    });
    lineSupportTreeRows.push({ supportGroup, treeText: createLineTree(family, context, supportGroup, relationships, memberEdges, terminalEdges) });

    physicalTerminals.forEach((edge) => {
      structureContactRows.push({
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
      });
    });
    memberEdges.forEach((edge) => {
      supportChainRows.push({
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
      });
    });

    createMemberRows(family, supportGroup, relationships, memberEdges, referenceEdges, terminalEdges)
      .forEach((row) => supportMemberRows.push(row));
    createInputEvidenceRows(family, supportGroup, context, relationships, memberEdges, nearbyEdges, referenceEdges, terminalEdges)
      .forEach((row) => inputEvidenceRows.push(row));
    createMatrixRows(supportGroup, relationships, memberEdges, referenceEdges, terminalEdges)
      .forEach((row) => connectivityMatrixRows.push(row));
    createStructureBasisRows(bundle, family, supportGroup, context, relationships, physicalTerminals)
      .forEach((row) => structureLineProximityRows.push(row));
    lineFamilyRows.push({
      lineFamily: context.lineFamily || 'NO_LINE_FAMILY',
      evidenceCount: evidenceIds.length,
      supportGroup,
      supportFamilyId: family.familyId,
    });
  });

  if (!families.length) diagnostics.push(diag('ERROR', 'NO_SUPPORT_FAMILIES_SELECTED', 'No support families matched the selected source-family filter.'));
  return {
    supportSummaryRows,
    lineSupportTreeRows,
    structureContactRows,
    supportChainRows,
    supportMemberRows,
    supportExceptionRows,
    inputEvidenceRows,
    connectivityMatrixRows,
    structureLineProximityRows,
    lineFamilyRows,
    relationshipCount,
    symbolicReferenceCount,
  };
}

function createFamilyExceptions(input) {
  const rows = [];
  const base = {
    supportGroup: input.supportGroup,
    lineFamily: input.context.lineFamily,
    fullLineTag: input.context.fullLineTag,
    branchNode: input.context.branchNode,
    sourceInput: PS_FAMILY_EVIDENCE_SOURCE_SCHEMA,
  };
  const add = (code, severity, reason, extra = {}) => rows.push({ exceptionCode: code, severity, ...base, structuralGroup: '', support: '', supportA: '', supportB: '', evidenceId: '', reason, ...extra });
  if (!input.context.branchNode || !input.context.lineFamily) add('MISSING_LINE_CONTEXT', 'ERROR', 'The support family has no reliable branch and line context.');
  if (input.ambiguousRelationships.length) add('AMBIGUOUS_SUPPORT_STEEL_RELATIONSHIP', 'ERROR', 'More than one structural group satisfies the strongest relationship evidence.', { evidenceId: evidenceId(input.ambiguousRelationships[0]) });
  if (!input.resolvedRelationships.length) add('FAMILY_WITHOUT_RESOLVED_STRUCTURE', 'ERROR', 'No resolved support-family to structural-group relationship exists.');
  if (!input.physicalTerminals.length) {
    add(
      input.symbolicTerminals.length ? 'REFERENCE_ONLY_STRUCTURAL_CONNECTION' : 'NO_ANALYTICAL_STRUCTURAL_TERMINAL',
      input.symbolicTerminals.length ? 'WARN' : 'ERROR',
      input.symbolicTerminals.length
        ? 'The family has a symbolic structural reference but no analytical support-member terminal.'
        : 'No analytical support-member to structure terminal was established.',
    );
  }
  const physicalMembers = (input.family.members || []).filter((member) => !SYMBOLIC_ROLES.has(member.semanticRole) && member.analyticalGeometry?.geometryAvailable);
  if (physicalMembers.length > 1 && !input.memberEdges.length) add('NO_PHYSICAL_MEMBER_CHAIN', 'ERROR', 'Multiple analytical support members exist but no physical member-chain edge was established.');
  if ((input.familyChain.components || []).length > 1) add('DISCONNECTED_SUPPORT_MEMBER_COMPONENTS', 'ERROR', 'Physical support members form more than one disconnected component.');
  (input.familyChain.unresolvedPhysicalMemberIds || []).forEach((memberId) => add('UNRESOLVED_PHYSICAL_SUPPORT_MEMBER', 'ERROR', `${memberId} is not connected to another support member or structural terminal.`, { support: memberId }));
  if (input.nearbyEdges.length) add('NEARBY_SUPPORT_MEMBER_CLEARANCE', 'WARN', `${input.nearbyEdges.length} analytical member pair(s) are near but outside the contact tolerance.`);
  return rows;
}

function createMemberRows(family, supportGroup, relationships, chainEdges, referenceEdges, terminalEdges) {
  const representative = representativeSupport(family);
  const rows = [];
  for (const member of family.members || []) {
    const connectedTo = [];
    chainEdges.forEach((edge) => {
      if (edge.supportA === member.memberId) connectedTo.push(edge.supportB);
      if (edge.supportB === member.memberId) connectedTo.push(edge.supportA);
    });
    referenceEdges.forEach((edge) => {
      if (edge.fromMemberId === member.memberId) connectedTo.push(edge.toMemberId);
      if (edge.toMemberId === member.memberId) connectedTo.push(edge.fromMemberId);
    });
    terminalEdges.forEach((edge) => {
      if (edge.supportMemberId === member.memberId) connectedTo.push(edge.structuralMemberId || edge.steelGroupId);
    });
    rows.push({
      supportGroup,
      representativeSupport: representative,
      support: member.memberId,
      memberType: member.semanticRole || 'OTHER_FAMILY_MEMBER',
      connectedTo: uniqueSorted(connectedTo),
      evidenceIds: uniqueSorted([
        ...chainEdges.filter((edge) => edge.supportA === member.memberId || edge.supportB === member.memberId).map(evidenceId),
        ...referenceEdges.filter((edge) => edge.fromMemberId === member.memberId || edge.toMemberId === member.memberId).map(evidenceId),
        ...terminalEdges.filter((edge) => edge.supportMemberId === member.memberId).map(evidenceId),
      ]),
      coverageRole: SYMBOLIC_ROLES.has(member.semanticRole) ? 'Symbolic evidence node' : member.analyticalGeometry?.geometryAvailable ? 'Analytical physical member' : 'Physical member without analytical geometry',
      remarks: connectedTo.length ? 'Connected in evidence graph.' : 'No graph connection established.',
    });
  }
  uniqueSorted(relationships.map((row) => row.steelGroupId).filter(Boolean)).forEach((steelGroupId) => rows.push({
    supportGroup,
    representativeSupport: representative,
    support: steelGroupId,
    memberType: 'StructuralGroup',
    connectedTo: uniqueSorted(terminalEdges.filter((edge) => edge.steelGroupId === steelGroupId).map((edge) => edge.supportMemberId)),
    evidenceIds: relationships.filter((row) => row.steelGroupId === steelGroupId).map(evidenceId),
    coverageRole: 'Resolved structural group',
    remarks: 'Structural group from relationship evidence.',
  }));
  return rows;
}

function createInputEvidenceRows(family, supportGroup, context, relationships, memberEdges, nearbyEdges, referenceEdges, terminalEdges) {
  const row = (edge, fromType, toType, parsedEdge) => ({
    sourceInput: PS_FAMILY_EVIDENCE_SOURCE_SCHEMA,
    sourceSchema: edge.sourceSchema || PS_FAMILY_EVIDENCE_SOURCE_SCHEMA,
    evidenceId: evidenceId(edge),
    evidenceClass: edge.evidenceClass || 'INFERRED',
    fromType,
    toType,
    lineFamily: context.lineFamily,
    branchNode: context.branchNode,
    supportGroup,
    distance: edge.distanceMm ?? null,
    parsedEdge,
    supportFamilyId: family.familyId,
    contactEvidenceStatus: edge.contactEvidenceStatus || '',
  });
  return [
    ...relationships.map((edge) => row(edge, 'SUPPORT_FAMILY', 'STRUCTURAL_GROUP', edge.relationshipSemantic || edge.relationshipStatus)),
    ...memberEdges.map((edge) => row(edge, 'SUPPORT_MEMBER', 'SUPPORT_MEMBER', edge.edgeType)),
    ...nearbyEdges.map((edge) => row(edge, 'SUPPORT_MEMBER', 'SUPPORT_MEMBER', edge.edgeType)),
    ...referenceEdges.map((edge) => row(edge, 'SUPPORT_MEMBER', 'SUPPORT_MEMBER', edge.edgeType)),
    ...terminalEdges.map((edge) => row(edge, 'SUPPORT_MEMBER', edge.edgeType === 'STRUCTURAL_REFERENCE' ? 'STRUCTURAL_GROUP' : 'STRUCTURAL_MEMBER', edge.edgeType)),
  ];
}

function createMatrixRows(supportGroup, relationships, memberEdges, referenceEdges, terminalEdges) {
  const rows = [];
  relationships.filter((edge) => edge.steelGroupId).forEach((edge) => rows.push({ supportGroup, from: edge.supportFamilyId, to: edge.steelGroupId, edgeType: 'SUPPORT_FAMILY_TO_STRUCTURE', evidenceId: evidenceId(edge), sourceInput: PS_FAMILY_EVIDENCE_SOURCE_SCHEMA, status: edge.relationshipStatus }));
  memberEdges.forEach((edge) => rows.push({ supportGroup, from: edge.supportA, to: edge.supportB, edgeType: edge.edgeType, evidenceId: evidenceId(edge), sourceInput: PS_FAMILY_EVIDENCE_SOURCE_SCHEMA, status: edge.contactEvidenceStatus }));
  referenceEdges.forEach((edge) => rows.push({ supportGroup, from: edge.fromMemberId, to: edge.toMemberId, edgeType: edge.edgeType, evidenceId: evidenceId(edge), sourceInput: PS_FAMILY_EVIDENCE_SOURCE_SCHEMA, status: edge.relationshipStatus }));
  terminalEdges.forEach((edge) => rows.push({ supportGroup, from: edge.supportMemberId, to: edge.structuralMemberId || edge.steelGroupId, edgeType: edge.edgeType, evidenceId: evidenceId(edge), sourceInput: PS_FAMILY_EVIDENCE_SOURCE_SCHEMA, status: edge.contactEvidenceStatus || edge.relationshipStatus }));
  return rows;
}

function createStructureBasisRows(bundle, family, supportGroup, context, relationships, physicalTerminals) {
  const groups = new Map();
  relationships.filter((row) => row.steelGroupId).forEach((relationship) => {
    if (!groups.has(relationship.steelGroupId)) groups.set(relationship.steelGroupId, []);
    groups.get(relationship.steelGroupId).push(relationship);
  });
  return [...groups.entries()].map(([steelGroupId, rows]) => {
    const steel = (bundle.steelGroups || []).find((item) => item.steelGroupId === steelGroupId);
    const terminals = physicalTerminals.filter((edge) => edge.steelGroupId === steelGroupId);
    const supports = uniqueSorted(terminals.map((edge) => edge.supportMemberId));
    const representative = terminals[0];
    return {
      structuralGroupRoot: extractFamilyRoot(steelGroupId) || steelGroupId,
      structuralGroupNames: uniqueSorted((steel?.records || []).map((record) => record.recordId).filter(Boolean)).join('|') || steelGroupId,
      lineNo: context.fullLineTag,
      lineFamily: context.lineFamily,
      branchNode: context.branchNode,
      supportGroup,
      supportsWithin250mm: supports.join('|'),
      supportCount: supports.length,
      totalSupportCount: supports.length,
      representativeSupport: representative?.supportMemberId || representativeSupport(family),
      representativeCoordinate: formatPoint(representative?.contactPointGlobal || representative?.nearestPointOnSupportGlobal),
      evidenceIds: uniqueSorted([...rows.map(evidenceId), ...terminals.map(evidenceId)]).join('|'),
      remarks: terminals.length ? 'Analytical structural terminal basis.' : 'Relationship basis without analytical member terminal.',
    };
  });
}

function createCoverageReports(families, expectedRows, detailRows, config) {
  const actualMembers = families.flatMap((family) => (family.members || []).map((member) => ({ ...member, familyId: family.familyId })));
  const byKey = new Map();
  actualMembers.forEach((member) => {
    const key = normalizeMemberKey(member.memberId);
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(member);
  });
  const detailByKey = new Map(detailRows.map((row) => [normalizeMemberKey(row.exactMemberKey || row.displayName), row]));
  const coverageRows = expectedRows.map((expected, index) => {
    const key = normalizeMemberKey(expected.exactMemberKey || expected.displayName || expected.rawItemName);
    const matches = byKey.get(key) || [];
    const detail = detailByKey.get(key);
    const status = matches.length > 1 ? PS_FAMILY_STATUS.FOUND_DUPLICATE_CLASH : matches.length === 1 ? PS_FAMILY_STATUS.FOUND : PS_FAMILY_STATUS.MISSING;
    return {
      no: index + 1,
      sourceFamily: config.sourceFamily || expected.familyRoot || matches[0]?.familyId || '',
      expectedMember: expected.displayName || expected.rawItemName || expected.exactMemberKey,
      expectedRawName: expected.rawItemName || '',
      exactMemberKey: expected.exactMemberKey || key,
      status,
      found: matches.length > 0,
      clashCount: 0,
      evidenceCount: matches.length,
      evidenceIds: matches.map((member) => `SSRB-MEMBER:${member.memberId}`),
      againstMembers: matches.map((member) => member.memberId),
      lineFamilies: [],
      fullLineTags: [],
      branchNodes: [],
      sourceObjects: matches.map((member) => member.familyId),
      minDistance: null,
      detailAvailable: Boolean(detail),
      posFamilyId: detail?.posFamilyId || '',
      p1bore: detail?.p1bore ?? null,
      pipe: detail?.pipe || '',
      lineFamily: detail?.lineFamily || '',
      supportText: detail?.supportText || '',
      supportGap: detail?.supportGap || '',
      reference: detail?.reference || '',
      position: detail?.position || null,
      positionText: detail?.positionText || '',
      isometricNotes: detail?.isometricNotes || '',
      remarks: matches.length ? 'Expected member found in XML-free evidence graph.' : 'Expected member not found in XML-free evidence graph.',
    };
  });
  const expectedKeys = new Set(expectedRows.map((row) => normalizeMemberKey(row.exactMemberKey || row.displayName || row.rawItemName)).filter(Boolean));
  return {
    coverageRows,
    missingRows: coverageRows.filter((row) => row.status === PS_FAMILY_STATUS.MISSING),
    duplicateRows: [...byKey.entries()].filter(([, rows]) => rows.length > 1).map(([exactMemberKey, rows]) => ({ exactMemberKey, member: rows[0].memberId, evidenceCount: rows.length, familyIds: uniqueSorted(rows.map((row) => row.familyId)) })),
    unexpectedInFamilyRows: expectedKeys.size ? actualMembers.filter((member) => !expectedKeys.has(normalizeMemberKey(member.memberId))) : [],
  };
}

function createSourceVsPosRows(families, coverageRows, posFamilies) {
  return families.map((family) => ({
    source: family.familyId,
    posFamilyCount: uniqueSorted(coverageRows.filter((row) => row.sourceFamily === family.familyId).map((row) => row.posFamilyId).filter(Boolean)).length,
    elementCount: family.members?.length || 0,
    foundElementCount: coverageRows.filter((row) => row.sourceFamily === family.familyId && row.found).length,
    missingElementCount: coverageRows.filter((row) => row.sourceFamily === family.familyId && !row.found).length,
    clashCount: 0,
    evidenceCount: family.members?.length || 0,
    outOfFamilyCount: 0,
    posFamilyIds: uniqueSorted(coverageRows.filter((row) => row.sourceFamily === family.familyId).map((row) => row.posFamilyId).filter(Boolean)),
    lineFamilies: uniqueSorted(posFamilies.flatMap((row) => row.lineFamilies || [])),
    remarks: 'Counts derived from XML-free relationship and member-chain evidence.',
  }));
}

function deriveFamilyContext(family) {
  const branchNodes = uniqueSorted(family.branchIds || []);
  const attributes = (family.members || []).map((member) => member.attributes || {});
  const explicitLineFamily = firstAttribute(attributes, ['LINE_FAMILY', 'LINEFAMILY']);
  const explicitFullLineTag = firstAttribute(attributes, ['FULL_LINE_TAG', 'FULLLINETAG', 'LINE_TAG', 'LINETAG', 'LINE_NO', 'LINENO']);
  const branchNode = branchNodes[0] || '';
  const derivedTag = branchNode.replace(/^\//u, '').replace(/\/B[^/]*$/iu, '');
  const fullLineTag = explicitFullLineTag || derivedTag;
  const lineFamily = explicitLineFamily || fullLineTag;
  return { branchNode, branchNodes, fullLineTag, lineFamily, carrierIds: uniqueSorted(family.carrierIds || []) };
}

function createSupportGroup(lineFamily, familyId) {
  const line = String(lineFamily || 'NO_LINE').replace(/^\//u, '').replace(/[\s/]+/gu, '_');
  const family = String(familyId || 'UNKNOWN_FAMILY').replace(/^\//u, '');
  return `${line}_${family}`;
}

function createLineTree(family, context, supportGroup, relationships, memberEdges, terminalEdges) {
  const branches = context.branchNodes.length ? context.branchNodes : ['None'];
  const members = (family.members || []).map((member) => `${member.memberId || '(unresolved)'} [${member.semanticRole || 'OTHER'}]`);
  const steel = uniqueSorted(relationships.map((row) => row.structuralMemberId || row.steelGroupId).filter(Boolean));
  const chains = memberEdges.map((edge) => `${edge.supportA} ↔ ${edge.supportB}`);
  const terminals = terminalEdges.map((edge) => `${edge.supportMemberId} → ${edge.structuralMemberId || edge.steelGroupId}`);
  return [
    `Line: ${context.fullLineTag || 'Unknown'}`,
    `└─ Branches: ${branches.join(', ')}`,
    `   └─ SupportGroup: ${supportGroup}`,
    `      ├─ Support family: ${family.familyId}`,
    `      ├─ Members`,
    ...(members.length ? members.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    `      ├─ Member chain`,
    ...(chains.length ? chains.map((item) => `      │  ├─ ${item}`) : ['      │  └─ None']),
    `      ├─ Structural terminals`,
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

function representativeSupport(family) {
  return (family.members || []).find((member) => member.semanticRole === 'DATUM')?.memberId
    || (family.members || []).find((member) => !SYMBOLIC_ROLES.has(member.semanticRole))?.memberId
    || family.members?.[0]?.memberId
    || family.familyId;
}

function detectedSourceFamily(families, config) {
  if (config.sourceFamily) return config.sourceFamily;
  if (families.length === 1) return families[0].familyId;
  return families.length ? 'MULTIPLE_SUPPORT_FAMILIES' : '';
}

function filterFamilies(families, sourceFamily) {
  const token = normalizeMemberKey(sourceFamily);
  if (!token) return families;
  return families.filter((family) => normalizeMemberKey(family.familyId) === token);
}

function bundleDiagnostics(bundle) {
  const diagnostics = [];
  if (!bundle.supportFamilies.length) diagnostics.push(diag('ERROR', 'EMPTY_SUPPORT_FAMILY_GRAPH', 'The relationship bundle contains no support families.'));
  if (!bundle.relationships.length) diagnostics.push(diag('ERROR', 'EMPTY_SUPPORT_STEEL_RELATIONSHIPS', 'The relationship bundle contains no support-to-steel relationship rows.'));
  if (!bundle.supportMemberChain) diagnostics.push(diag('ERROR', 'MISSING_SUPPORT_MEMBER_CHAIN', 'SupportMemberChainBundle.v1 is required for graph-native audit completeness.'));
  if (bundle.contactEvidenceAvailable === true) diagnostics.push(diag('INFO', 'SOURCE_CONTACT_EVIDENCE_AVAILABLE', 'The source bundle declares contact evidence available.'));
  return diagnostics;
}

function normalizeDiagnostics(rows = []) {
  return rows.map((row) => ({
    level: String(row.level || row.severity || 'INFO').toUpperCase() === 'WARNING' ? 'WARN' : String(row.level || row.severity || 'INFO').toUpperCase(),
    code: row.code || 'SOURCE_DIAGNOSTIC',
    message: row.message || '',
    supportFamilyId: row.supportFamilyId || '',
  }));
}

function resolveConfig(config = {}) {
  return {
    sourceFamily: String(config.sourceFamily || '').trim().toUpperCase(),
  };
}

function diag(level, code, message) { return { level, code, message }; }
function evidenceId(row) { return row?.evidenceId || row?.edgeId || row?.relationshipId || ''; }
function formatPoint(value) { return value ? `X=${value.x ?? ''};Y=${value.y ?? ''};Z=${value.z ?? ''}` : ''; }
function normalizeMemberKey(value) { return String(value || '').trim().toUpperCase().replace(/\(REF\)$/u, ''); }
function firstAttribute(rows, keys) { for (const row of rows) for (const key of keys) if (String(row[key] || '').trim()) return String(row[key]).trim(); return ''; }
