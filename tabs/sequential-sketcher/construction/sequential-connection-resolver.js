import { stableToken } from '../sequential-sketcher-contract.js';

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
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
      if (!port.sourcePosition || component.componentId === activeComponent.componentId) continue;
      if (target.targetPortRoles.length && !target.targetPortRoles.includes(port.role)) continue;
      const candidateId = `CAND-${stableToken(`${activePort.portId}|${port.portId}`)}`;
      if (rejected.has(candidateId)) continue;
      const gapMm = distance(activePort.sourcePosition, port.sourcePosition);
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
      candidates.push(Object.freeze({
        candidateId,
        fromPortId: activePort.portId,
        toPortId: port.portId,
        fromPosition: { ...activePort.sourcePosition },
        toPosition: { ...port.sourcePosition },
        targetComponentId: component.componentId,
        targetSourceComponentId: component.sourceComponentId,
        targetBranchId: component.branchId,
        targetPortRole: port.role,
        targetKind: target.targetKind,
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
