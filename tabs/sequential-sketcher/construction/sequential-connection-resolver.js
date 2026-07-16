import { stableToken } from '../sequential-sketcher-contract.js';

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function clonePoint(point) { return point ? { x: point.x, y: point.y, z: point.z } : null; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function directionAngleDeg(active, candidate) {
  if (!active?.tangent || !candidate?.tangent) return null;
  const opposed = { x: -candidate.tangent.x, y: -candidate.tangent.y, z: -candidate.tangent.z };
  const cosine = Math.max(-1, Math.min(1, dot(active.tangent, opposed)));
  return Math.acos(cosine) * 180 / Math.PI;
}
function boreCompatibility(active, candidate, activeComponent, candidateComponent) {
  if (!Number.isFinite(active?.boreMm) || !Number.isFinite(candidate?.boreMm)) return 'UNKNOWN';
  if (Math.abs(active.boreMm - candidate.boreMm) <= 3) return 'MATCH';
  if (activeComponent?.canonicalType === 'REDUCER' || candidateComponent?.canonicalType === 'REDUCER') return 'VALID_REDUCER_TRANSITION';
  return 'MISMATCH';
}
function uniqueByPort(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => !seen.has(candidate.toPortId) && seen.add(candidate.toPortId));
}

function targetComponents(session, indexes) {
  const branch = indexes.branches.get(session.activeBranchId);
  if (!branch) return [];
  const transition = session.transitionContext;
  if (transition?.targetComponentId) {
    const component = indexes.components.get(transition.targetComponentId);
    return component ? [{
      component,
      sourceAdjacent: false,
      referenceTarget: true,
      targetPortRoles: transition.targetPortRoles || [],
      targetKind: transition.targetKind || null,
    }] : [];
  }
  if (transition?.targetBranchId) {
    const target = indexes.branches.get(transition.targetBranchId);
    if (!target) return [];
    const first = target.components[0]; const last = target.components[target.components.length - 1];
    return [first, last].filter(Boolean).filter((component, index, rows) => rows.indexOf(component) === index)
      .map((component) => ({
        component,
        sourceAdjacent: false,
        referenceTarget: true,
        targetPortRoles: [],
        targetKind: transition.targetKind || 'BRANCH',
      }));
  }
  const remaining = branch.components.filter((component) => (
    component.sourceIndex > (session.activeSourceIndex ?? -1)
    && !session.confirmedComponentIds.includes(component.componentId)
  ));
  const expected = remaining[0] || null;
  return remaining.map((component) => ({
    component,
    sourceAdjacent: component.componentId === expected?.componentId,
    referenceTarget: false,
    targetPortRoles: [],
    targetKind: null,
  }));
}

function resolveCandidatePositions(activePort, targetPort, component, session, target) {
  let fromPosition = clonePoint(activePort.sourcePosition);
  let toPosition = clonePoint(targetPort.sourcePosition);
  let fromPositionBasis = activePort.sourcePosition ? 'SOURCE_EXPLICIT' : 'UNRESOLVED';
  let toPositionBasis = targetPort.sourcePosition ? 'SOURCE_EXPLICIT' : 'UNRESOLVED';
  const explicitReference = Boolean(target.referenceTarget || session.transitionContext?.referenceTarget);
  const boundaryPosition = clonePoint(session.transitionContext?.boundaryPosition);

  if (explicitReference && !fromPosition && toPosition) {
    fromPosition = boundaryPosition || clonePoint(toPosition);
    fromPositionBasis = boundaryPosition ? 'DERIVED_FROM_BRANCH_BOUNDARY' : 'DERIVED_FROM_REFERENCED_TARGET_PORT';
  }
  if (explicitReference && fromPosition && !toPosition) {
    toPosition = boundaryPosition || clonePoint(fromPosition);
    toPositionBasis = boundaryPosition ? 'DERIVED_FROM_BRANCH_BOUNDARY' : 'DERIVED_FROM_ACTIVE_BOUNDARY_PORT';
  }
  if (explicitReference && !fromPosition && !toPosition && boundaryPosition) {
    fromPosition = clonePoint(boundaryPosition);
    toPosition = clonePoint(boundaryPosition);
    fromPositionBasis = 'DERIVED_FROM_BRANCH_BOUNDARY';
    toPositionBasis = 'DERIVED_FROM_BRANCH_BOUNDARY';
  }
  if (!fromPosition || !toPosition) return null;

  const hostPort = component.ports.find((port) => port.role === 'HOST_ATTACHMENT' && port.sourcePosition);
  const derivedBranchLegLengthMm = targetPort.role === 'BRANCH_OUT' && !targetPort.sourcePosition && hostPort
    ? distance(toPosition, hostPort.sourcePosition)
    : null;
  return {
    fromPosition,
    toPosition,
    fromPositionBasis,
    toPositionBasis,
    fromSourcePosition: clonePoint(activePort.sourcePosition),
    toSourcePosition: clonePoint(targetPort.sourcePosition),
    derivedBranchLegLengthMm,
  };
}

export function buildConnectionCandidates(session, evidenceModel, indexes, options = {}) {
  const activePort = indexes.ports.get(session.activeExitPortId);
  const activeComponent = indexes.components.get(session.activeComponentId);
  if (!activePort || !activeComponent) return Object.freeze([]);
  const rejected = new Set(session.rejectedCandidateIds || []);
  const candidates = [];
  const targets = targetComponents(session, indexes);
  const candidateSearchRadiusMm = Number(options.candidateSearchRadiusMm ?? 250);
  for (const target of targets) {
    const component = target.component;
    for (const port of component.ports) {
      if (component.componentId === activeComponent.componentId) continue;
      if (target.targetPortRoles.length && !target.targetPortRoles.includes(port.role)) continue;
      const positions = resolveCandidatePositions(activePort, port, component, session, target);
      if (!positions) continue;
      const candidateId = `CAND-${stableToken(`${activePort.portId}|${port.portId}`)}`;
      if (rejected.has(candidateId)) continue;
      const gapMm = distance(positions.fromPosition, positions.toPosition);
      const sourceAdjacent = Boolean(target.sourceAdjacent && component.branchId === activeComponent.branchId && !session.transitionContext);
      const referenceMatch = Boolean(
        target.referenceTarget
        || session.transitionContext?.referenceTarget
        || activePort.referenceTarget
        || indexes.branches.get(activeComponent.branchId)?.tref === component.branchId
      );
      if (!sourceAdjacent && !referenceMatch && gapMm > candidateSearchRadiusMm) continue;
      const angle = directionAngleDeg(activePort, port);
      const bore = boreCompatibility(activePort, port, activeComponent, component);
      const explicitRoleTarget = target.targetPortRoles.length > 0;
      const roleCompatible = explicitRoleTarget
        ? target.targetPortRoles.includes(port.role)
        : port.role !== 'BRANCH_OUT' || Boolean(session.transitionContext?.junctionId);
      const directionCompatible = angle === null || angle <= Number(options.maxDirectionAngleDeg ?? 30);
      const boreCompatible = bore !== 'MISMATCH';
      const attachmentEvent = component.canonicalType === 'OLET' && port.role === 'HOST_ATTACHMENT';
      candidates.push(Object.freeze({
        candidateId,
        fromPortId: activePort.portId,
        toPortId: port.portId,
        fromPosition: positions.fromPosition,
        toPosition: positions.toPosition,
        fromSourcePosition: positions.fromSourcePosition,
        toSourcePosition: positions.toSourcePosition,
        fromPositionBasis: positions.fromPositionBasis,
        toPositionBasis: positions.toPositionBasis,
        derivedBranchLegLengthMm: positions.derivedBranchLegLengthMm,
        targetComponentId: component.componentId,
        targetSourceComponentId: component.sourceComponentId,
        targetBranchId: component.branchId,
        targetPortRole: port.role,
        targetKind: target.targetKind,
        targetComponentType: component.canonicalType,
        attachmentEvent,
        gapMm,
        directionAngleDeg: angle,
        boreCompatibility: bore,
        sourceAdjacent,
        referenceMatch,
        roleCompatible,
        directionCompatible,
        boreCompatible,
        eligible: roleCompatible && boreCompatible,
      }));
    }
  }
  return Object.freeze(uniqueByPort(candidates).sort((left, right) => (
    Number(right.referenceMatch) - Number(left.referenceMatch)
    || Number(right.sourceAdjacent) - Number(left.sourceAdjacent)
    || left.gapMm - right.gapMm
    || left.candidateId.localeCompare(right.candidateId)
  )));
}

export function resolveNextConnection(session, evidenceModel, indexes, options = {}) {
  const exactToleranceMm = Number(options.exactToleranceMm ?? 1);
  const autoRepairToleranceMm = Number(options.autoRepairToleranceMm ?? 25);
  const candidates = buildConnectionCandidates(session, evidenceModel, indexes, options);
  const eligible = candidates.filter((candidate) => candidate.eligible);

  const sourceAdjacentAttachmentEvents = eligible.filter((candidate) => candidate.sourceAdjacent && candidate.attachmentEvent);
  if (sourceAdjacentAttachmentEvents.length > 1) {
    return Object.freeze({
      status: 'USER_DECISION_REQUIRED',
      reason: 'MULTIPLE_SOURCE_ADJACENT_ATTACHMENT_EVENTS',
      candidates,
    });
  }
  if (sourceAdjacentAttachmentEvents.length === 1) {
    const event = sourceAdjacentAttachmentEvents[0];
    if (event.gapMm <= exactToleranceMm) {
      return Object.freeze({
        status: 'CONFIRMED_EXACT',
        selected: event,
        candidates,
        resolutionBasis: 'SOURCE_ADJACENT_ATTACHMENT_EVENT',
      });
    }
    if (event.gapMm <= autoRepairToleranceMm && event.directionCompatible) {
      return Object.freeze({
        status: 'AUTO_REPAIRED_SMALL_GAP',
        selected: event,
        candidates,
        resolutionBasis: 'SOURCE_ADJACENT_ATTACHMENT_EVENT',
      });
    }
    return Object.freeze({
      status: 'USER_DECISION_REQUIRED',
      reason: 'ATTACHMENT_EVENT_GAP_EXCEEDS_LIMIT',
      candidates,
    });
  }

  const exact = eligible.filter((candidate) => candidate.gapMm <= exactToleranceMm);
  if (exact.length === 1) return Object.freeze({ status: exact[0].referenceMatch ? 'CONFIRMED_REFERENCE' : 'CONFIRMED_EXACT', selected: exact[0], candidates });
  if (exact.length > 1) return Object.freeze({ status: 'USER_DECISION_REQUIRED', reason: 'MULTIPLE_EXACT_CANDIDATES', candidates });

  const repairable = eligible.filter((candidate) => (
    candidate.gapMm > exactToleranceMm
    && candidate.gapMm <= autoRepairToleranceMm
    && candidate.directionCompatible
    && (candidate.sourceAdjacent || candidate.referenceMatch)
  ));
  if (repairable.length === 1 && eligible.filter((candidate) => candidate.gapMm <= autoRepairToleranceMm).length === 1) {
    return Object.freeze({ status: 'AUTO_REPAIRED_SMALL_GAP', selected: repairable[0], candidates });
  }
  if (eligible.length) return Object.freeze({
    status: 'USER_DECISION_REQUIRED',
    reason: repairable.length > 1 ? 'MULTIPLE_REPAIR_CANDIDATES' : 'CONTINUITY_NOT_PROVEN',
    candidates,
  });
  return Object.freeze({ status: 'NO_CANDIDATE', reason: 'NO_ELIGIBLE_NEXT_PORT', candidates });
}
