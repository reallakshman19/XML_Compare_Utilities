import { createEngineeringRevisionToken, freezeJsonValue } from '../../core/engineering-scene/index.js';
import { sequentialSessionFingerprint } from './construction/sequential-session-fingerprint.js';

export const SEQUENTIAL_ENGINEERING_SVG_AUTHORITY_SCHEMA = 'SequentialEngineeringSvgAuthority.v1';

function requireSchema(value, schema, label) {
  if (value?.schema !== schema) throw new TypeError(`${label} must use ${schema}.`);
  return value;
}

function requireIndexes(indexes) {
  if (!(indexes?.components instanceof Map) || !(indexes?.ports instanceof Map)) {
    throw new TypeError('Sequential engineering SVG requires indexed components and ports.');
  }
  return indexes;
}

function sameTextSequence(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateConfirmed(session, confirmed) {
  if (!confirmed) return null;
  requireSchema(confirmed, 'ConfirmedSequentialConstruction.v1', 'Confirmed construction');
  const componentIds = confirmed.components.map((component) => component.componentId);
  if (confirmed.rootBranchId !== session.rootBranchId
    || !sameTextSequence(componentIds, session.confirmedComponentIds || [])) {
    throw new Error('Confirmed construction does not match the current Sequential session.');
  }
  return confirmed;
}

function validateSupport(confirmed, supportProjection) {
  if (!supportProjection) return null;
  requireSchema(supportProjection, 'SequentialConfirmedSupportProjection.v1', 'Support projection');
  if (!confirmed || supportProjection.constructionFingerprint !== confirmed.constructionFingerprint) {
    throw new Error('Sequential support projection is not fingerprint-matched to confirmed construction.');
  }
  return supportProjection;
}

function resolvedPortPositions(session) {
  const positions = new Map();
  for (const connection of session.committedConnections || []) {
    if (connection.fromPortId && connection.fromPosition) positions.set(connection.fromPortId, connection.fromPosition);
    if (connection.toPortId && connection.toPosition) positions.set(connection.toPortId, connection.toPosition);
  }
  return positions;
}

function rejectedCandidateEvidence(session) {
  const rejectedIds = new Set(session.rejectedCandidateIds || []);
  const evidence = new Map();
  for (const decision of session.decisionLedger || []) {
    const selectedId = decision.resolution?.selectedCandidateId;
    if (!selectedId || !rejectedIds.has(selectedId)) continue;
    const candidate = (decision.candidates || []).find((row) => row.candidateId === selectedId);
    if (candidate) evidence.set(selectedId, Object.freeze({ candidate, decision }));
  }
  return Object.freeze({
    rows: Object.freeze([...evidence.entries()].map(([candidateId, value]) => Object.freeze({ candidateId, ...value }))),
    missingIds: Object.freeze([...rejectedIds].filter((candidateId) => !evidence.has(candidateId)).sort()),
  });
}

function supportFamilies(supportProjection) {
  const rows = supportProjection?.branchBundles?.flatMap((bundle) => (
    bundle.resolvedSupportFamilies || []
  )) || [];
  return new Map(rows.map((family) => [family.familyId, family]));
}

function confirmedComponents(session, indexes, confirmed) {
  const accepted = new Map((confirmed?.components || []).map((component) => [component.componentId, component]));
  return Object.freeze((session.confirmedComponentIds || []).map((componentId) => {
    const component = accepted.get(componentId) || indexes.components.get(componentId);
    if (!component) throw new Error(`Confirmed component evidence is missing: ${componentId}`);
    return component;
  }));
}

function revisionToken(session, confirmed, supportProjection) {
  return createEngineeringRevisionToken({
    sessionFingerprint: sequentialSessionFingerprint(session),
    confirmedConstructionFingerprint: confirmed?.constructionFingerprint || null,
    supportConstructionFingerprint: supportProjection?.constructionFingerprint || null,
  });
}

export function classifySequentialEngineeringSvgAuthority(input = {}) {
  const session = requireSchema(input.session, 'SequentialConstructionSession.v1', 'Sequential session');
  requireSchema(input.evidenceModel, 'SequentialSourceEvidence.v1', 'Sequential evidence model');
  const indexes = requireIndexes(input.indexes);
  const confirmed = validateConfirmed(session, input.confirmedConstruction || null);
  const supportProjection = validateSupport(confirmed, input.supportProjection || null);
  const resolvedPositions = resolvedPortPositions(session);
  const activePort = session.activeExitPortId ? indexes.ports.get(session.activeExitPortId) || null : null;
  const rejected = rejectedCandidateEvidence(session);
  const families = supportFamilies(supportProjection);
  const supports = Object.freeze((supportProjection?.supportGlyphs || []).map((glyph) => Object.freeze({
    glyph,
    family: families.get(glyph.familyId) || null,
  })));

  return freezeJsonValue({
    schema: SEQUENTIAL_ENGINEERING_SVG_AUTHORITY_SCHEMA,
    revision: revisionToken(session, confirmed, supportProjection),
    sessionFingerprint: sequentialSessionFingerprint(session),
    confirmedConstructionFingerprint: confirmed?.constructionFingerprint || null,
    supportConstructionFingerprint: supportProjection?.constructionFingerprint || null,
    state: session.state,
    session,
    evidenceModel: input.evidenceModel,
    confirmedConstruction: confirmed,
    confirmedComponents: confirmedComponents(session, indexes, confirmed),
    committedConnections: session.committedConnections || [],
    repairs: session.repairLedger || [],
    candidates: session.currentDecisionRequest?.candidates || [],
    candidateReason: session.currentDecisionRequest?.reason || null,
    activePort: activePort ? {
      ...activePort,
      resolvedPosition: resolvedPositions.get(activePort.portId) || activePort.sourcePosition || null,
    } : null,
    rejectedCandidates: rejected.rows,
    rejectedCandidateIdsMissingEvidence: rejected.missingIds,
    supports,
    unresolvedSupportFamilies: supportProjection?.unresolvedSupportFamilies || [],
    architecturalOmissions: [
      { category: 'network', reason: 'DERIVED_NETWORK_NOT_TRACEABLE_TO_CONFIRMED_CONSTRUCTION' },
      { category: 'restraint', reason: 'NO_STABLE_SEQUENTIAL_RESTRAINT_DIRECTION_OWNER' },
      { category: 'analyticalSupportAttachment', reason: 'NO_SEQUENTIAL_CONSTRUCTION_FINGERPRINT_BRIDGE' },
    ],
  });
}
