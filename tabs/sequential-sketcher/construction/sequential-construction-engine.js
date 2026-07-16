import { stableToken } from '../sequential-sketcher-contract.js';
import {
  CONNECTION_STATUSES, CONSTRUCTION_STATES, DECISION_ACTIONS,
  createEmptyConstructionSession, freezeConstructionSession,
} from './sequential-construction-contract.js';
import { resolveNextConnection } from './sequential-connection-resolver.js';
import { classifyActiveTerminal } from './sequential-terminal-classifier.js';
import {
  compileComponentStrokes, compileRepairStroke, resolveComponentTraversal,
} from '../stroke/sequential-component-stroke-compiler.js';

function pointDistance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function nextDecisionId(session) { return `DECISION-${String(session.decisionLedger.length + 1).padStart(5, '0')}`; }
function nextConnectionId(session) { return `CONNECTION-${String(session.committedConnections.length + 1).padStart(5, '0')}`; }
function nextRepairId(session) { return `REPAIR-${String(session.repairLedger.length + 1).padStart(5, '0')}`; }

function createDecisionRequest(session, reason, candidates, extra = {}) {
  return Object.freeze({
    schema: 'SequentialConnectionDecision.v1',
    decisionId: nextDecisionId(session),
    state: 'OPEN',
    reason,
    activePortId: session.activeExitPortId,
    candidates: Object.freeze([...(candidates || [])]),
    resolution: null,
    ...extra,
  });
}

function chooseStart(branch) {
  const component = branch?.components?.[0];
  if (!component) return { status: 'FAILED', reason: 'BRANCH_HAS_NO_ROUTE_COMPONENTS' };
  const candidates = component.ports.filter((port) => port.sourcePosition);
  if (!candidates.length) return { status: 'FAILED', reason: 'FIRST_COMPONENT_HAS_NO_POSITIONED_PORT' };
  if (!branch.headPosition) return { status: 'RESOLVED', component, entry: candidates[0], basis: 'SOURCE_FIRST_PORT' };
  const ranked = candidates.map((port) => ({ port, gapMm: pointDistance(branch.headPosition, port.sourcePosition) })).sort((a, b) => a.gapMm - b.gapMm || a.port.portId.localeCompare(b.port.portId));
  if (ranked.length > 1 && Math.abs(ranked[0].gapMm - ranked[1].gapMm) <= 1e-6) {
    return { status: 'AMBIGUOUS', reason: 'AMBIGUOUS_BRANCH_START', candidates: ranked.map((row) => row.port) };
  }
  return { status: 'RESOLVED', component, entry: ranked[0].port, basis: 'NEAREST_TO_HPOS', gapMm: ranked[0].gapMm };
}

function pendingJunction(component, traversal, session) {
  const port = traversal.pendingBranchPort;
  if (!port) return null;
  return Object.freeze({
    junctionId: `JUNCTION-${stableToken(`${component.componentId}|${port.portId}`)}`,
    parentBranchId: component.branchId,
    parentComponentId: component.componentId,
    branchPortId: port.portId,
    branchPosition: port.sourcePosition ? { ...port.sourcePosition } : component.geometry?.centre || null,
    expectedTargetBranchId: port.referenceTarget || component.cref || '',
    encounterOrder: session.pendingBranchJunctions.length + 1,
    status: port.referenceTarget || component.cref ? 'CONFIRMED_REFERENCE' : 'PENDING_USER_RESOLUTION',
  });
}

function commitPlacedComponent(session, component, entryPortId, context = {}) {
  const traversal = resolveComponentTraversal(component, entryPortId);
  if (traversal.status === 'ENTRY_PORT_NOT_FOUND' || traversal.status === 'EXIT_PORT_NOT_FOUND' || traversal.status === 'TEE_ENTERED_FROM_BRANCH') {
    const decision = createDecisionRequest(session, traversal.status, [], { componentId: component.componentId, entryPortId });
    return freezeConstructionSession({ ...session, state: CONSTRUCTION_STATES.USER_DECISION_REQUIRED, currentDecisionRequest: decision });
  }
  const strokes = compileComponentStrokes(component, traversal);
  const junction = pendingJunction(component, traversal, session);
  const confirmed = session.confirmedComponentIds.includes(component.componentId)
    ? session.confirmedComponentIds
    : [...session.confirmedComponentIds, component.componentId];

  if (component.canonicalType === 'OLET') {
    return freezeConstructionSession({
      ...session,
      state: CONSTRUCTION_STATES.BUILDING,
      activeBranchId: component.branchId,
      activeSourceIndex: component.sourceIndex,
      confirmedComponentIds: confirmed,
      pendingBranchJunctions: junction ? [...session.pendingBranchJunctions, junction] : session.pendingBranchJunctions,
      strokeLedger: [...session.strokeLedger, ...strokes],
      currentDecisionRequest: null,
      transitionContext: null,
    });
  }

  return freezeConstructionSession({
    ...session,
    state: traversal.exit ? CONSTRUCTION_STATES.BUILDING : session.state,
    activeBranchId: component.branchId,
    activeComponentId: component.componentId,
    activeEntryPortId: traversal.entry?.portId || null,
    activeExitPortId: traversal.exit?.portId || traversal.entry?.portId || null,
    activeSourceIndex: component.sourceIndex,
    confirmedComponentIds: confirmed,
    pendingBranchJunctions: junction ? [...session.pendingBranchJunctions, junction] : session.pendingBranchJunctions,
    strokeLedger: [...session.strokeLedger, ...strokes],
    currentDecisionRequest: null,
    transitionContext: null,
    lastCommitBasis: context.basis || null,
  });
}

function commitConnection(session, candidate, indexes, status, options = {}) {
  const targetComponent = indexes.components.get(candidate.targetComponentId);
  if (!targetComponent) return freezeConstructionSession({ ...session, state: CONSTRUCTION_STATES.FAILED, diagnostics: [...session.diagnostics, { severity: 'ERROR', code: 'TARGET_COMPONENT_MISSING', componentId: candidate.targetComponentId }] });
  const connection = Object.freeze({
    connectionId: nextConnectionId(session),
    connectionType: options.transitionContext ? 'BRANCH_TRANSITION' : 'COMPONENT_CONNECTION',
    fromPortId: candidate.fromPortId,
    toPortId: candidate.toPortId,
    fromBranchId: indexes.ports.get(candidate.fromPortId)?.branchId || session.activeBranchId,
    toBranchId: candidate.targetBranchId,
    fromPosition: candidate.fromPosition,
    toPosition: candidate.toPosition,
    gapMm: candidate.gapMm,
    status,
    basis: Object.freeze([
      candidate.sourceAdjacent ? 'SOURCE_ADJACENCY' : null,
      candidate.referenceMatch ? 'REFERENCE_MATCH' : null,
      candidate.directionCompatible ? 'DIRECTION_COMPATIBILITY' : null,
      candidate.boreCompatible ? 'BORE_COMPATIBILITY' : null,
    ].filter(Boolean)),
    approvedBy: status === CONNECTION_STATUSES.USER_CONFIRMED ? 'USER' : 'SYSTEM',
  });
  let next = freezeConstructionSession({
    ...session,
    committedConnections: [...session.committedConnections, connection],
    strokeLedger: options.transitionContext
      ? [...session.strokeLedger, Object.freeze({ op: 'ENTER_BRANCH', connectionId: connection.connectionId, fromBranchId: connection.fromBranchId, toBranchId: connection.toBranchId })]
      : session.strokeLedger,
  });

  if (status === CONNECTION_STATUSES.AUTO_REPAIRED_SMALL_GAP || options.forceVirtualRepair) {
    const repair = Object.freeze({
      repairId: nextRepairId(session),
      connectionId: connection.connectionId,
      type: 'VIRTUAL_GAP_CLOSURE',
      fromPortId: candidate.fromPortId,
      toPortId: candidate.toPortId,
      sourceFromPosition: candidate.fromPosition,
      sourceToPosition: candidate.toPosition,
      gapMm: candidate.gapMm,
      thresholdMm: Number(options.autoRepairToleranceMm ?? 25),
      repairPolicy: 'VIRTUAL_CONNECTOR',
      approvedBy: status === CONNECTION_STATUSES.USER_CONFIRMED ? 'USER' : 'SYSTEM',
    });
    next = freezeConstructionSession({
      ...next,
      repairLedger: [...next.repairLedger, repair],
      strokeLedger: [...next.strokeLedger, compileRepairStroke({
        ...connection,
        repairPolicy: repair.repairPolicy,
      })],
    });
  }
  return commitPlacedComponent(next, targetComponent, candidate.toPortId, { basis: status });
}

function completeActiveBranch(session, terminalStatus) {
  const completed = session.completedBranchIds.includes(session.activeBranchId)
    ? session.completedBranchIds
    : [...session.completedBranchIds, session.activeBranchId];
  const pending = session.pendingBranchJunctions.find((junction) => (
    junction.status === 'CONFIRMED_REFERENCE'
    && junction.expectedTargetBranchId
    && !completed.includes(junction.expectedTargetBranchId)
  ));
  if (!pending) return freezeConstructionSession({
    ...session,
    state: CONSTRUCTION_STATES.ROUTE_COMPLETE,
    completedBranchIds: completed,
    currentDecisionRequest: null,
    strokeLedger: [...session.strokeLedger, Object.freeze({ op: 'COMPLETE_ROUTE', branchId: session.activeBranchId, terminalStatus })],
  });
  return freezeConstructionSession({
    ...session,
    state: CONSTRUCTION_STATES.RETURNING_TO_JUNCTION,
    completedBranchIds: completed,
    activeBranchId: pending.parentBranchId,
    activeComponentId: pending.parentComponentId,
    activeExitPortId: pending.branchPortId,
    activeEntryPortId: null,
    activeSourceIndex: session.activeComponentId === pending.parentComponentId ? session.activeSourceIndex : -1,
    transitionContext: Object.freeze({
      junctionId: pending.junctionId,
      targetBranchId: pending.expectedTargetBranchId,
      referenceTarget: pending.expectedTargetBranchId,
    }),
    strokeLedger: [...session.strokeLedger, Object.freeze({ op: 'RETURN_TO_JUNCTION', junctionId: pending.junctionId, componentId: pending.parentComponentId, branchPortId: pending.branchPortId })],
  });
}

function blockForDecision(session, reason, candidates, extra = {}) {
  const request = createDecisionRequest(session, reason, candidates, extra);
  return freezeConstructionSession({ ...session, state: CONSTRUCTION_STATES.USER_DECISION_REQUIRED, currentDecisionRequest: request });
}

export function createSequentialConstructionSession(rootBranchId) {
  return createEmptyConstructionSession(rootBranchId);
}

export function advanceConstruction(session, evidenceModel, indexes, options = {}) {
  if (session.state === CONSTRUCTION_STATES.USER_DECISION_REQUIRED) return Object.freeze({ session, outcome: 'DECISION_REQUIRED' });
  if (session.state === CONSTRUCTION_STATES.ROUTE_COMPLETE || session.state === CONSTRUCTION_STATES.FAILED) return Object.freeze({ session, outcome: session.state });

  if (session.state === CONSTRUCTION_STATES.NOT_STARTED) {
    const branch = indexes.branches.get(session.rootBranchId);
    if (!branch) return Object.freeze({ session: freezeConstructionSession({ ...session, state: CONSTRUCTION_STATES.FAILED, diagnostics: [...session.diagnostics, { severity: 'ERROR', code: 'ROOT_BRANCH_NOT_FOUND', branchId: session.rootBranchId }] }), outcome: 'FAILED' });
    const start = chooseStart(branch);
    if (start.status === 'FAILED') return Object.freeze({ session: freezeConstructionSession({ ...session, state: CONSTRUCTION_STATES.FAILED, diagnostics: [...session.diagnostics, { severity: 'ERROR', code: start.reason, branchId: branch.branchId }] }), outcome: 'FAILED' });
    if (start.status === 'AMBIGUOUS') return Object.freeze({ session: blockForDecision(session, start.reason, [], { branchId: branch.branchId }), outcome: 'DECISION_REQUIRED' });
    const placed = commitPlacedComponent(session, start.component, start.entry.portId, { basis: start.basis });
    return Object.freeze({ session: placed, outcome: placed.state === CONSTRUCTION_STATES.USER_DECISION_REQUIRED ? 'DECISION_REQUIRED' : 'COMPONENT_COMMITTED' });
  }

  let working = session;
  if (working.state === CONSTRUCTION_STATES.RETURNING_TO_JUNCTION) {
    working = freezeConstructionSession({ ...working, state: CONSTRUCTION_STATES.BRANCH_TRANSITION_PENDING });
  }

  let resolved = resolveNextConnection(working, evidenceModel, indexes, options);
  if (resolved.status === 'NO_CANDIDATE' && !working.transitionContext) {
    const terminal = classifyActiveTerminal(working, indexes);
    if (terminal.status === 'EXPECTED_CONTINUATION') {
      if (!indexes.branches.has(terminal.referenceTarget)) {
        const blocked = blockForDecision(working, 'REFERENCE_TARGET_MISSING', [], { referenceTarget: terminal.referenceTarget });
        return Object.freeze({ session: blocked, outcome: 'DECISION_REQUIRED' });
      }
      working = freezeConstructionSession({
        ...working,
        state: CONSTRUCTION_STATES.BRANCH_TRANSITION_PENDING,
        transitionContext: Object.freeze({ targetBranchId: terminal.referenceTarget, referenceTarget: terminal.referenceTarget, junctionId: null }),
      });
      resolved = resolveNextConnection(working, evidenceModel, indexes, options);
    } else if (terminal.status === 'CONFIRMED_TERMINAL') {
      return Object.freeze({ session: completeActiveBranch(working, terminal.status), outcome: 'BRANCH_COMPLETE' });
    } else {
      const blocked = blockForDecision(working, 'UNEXPLAINED_TERMINAL', [], { terminalBasis: terminal.basis });
      return Object.freeze({ session: blocked, outcome: 'DECISION_REQUIRED' });
    }
  }

  if (resolved.status === 'CONFIRMED_EXACT' || resolved.status === 'CONFIRMED_REFERENCE') {
    const status = resolved.status === 'CONFIRMED_REFERENCE' ? CONNECTION_STATUSES.CONFIRMED_REFERENCE : CONNECTION_STATUSES.CONFIRMED_EXACT;
    return Object.freeze({ session: commitConnection(working, resolved.selected, indexes, status, { transitionContext: working.transitionContext }), outcome: 'CONNECTION_COMMITTED' });
  }
  if (resolved.status === 'AUTO_REPAIRED_SMALL_GAP') {
    return Object.freeze({ session: commitConnection(working, resolved.selected, indexes, CONNECTION_STATUSES.AUTO_REPAIRED_SMALL_GAP, { ...options, transitionContext: working.transitionContext }), outcome: 'AUTO_REPAIR_COMMITTED' });
  }
  const blocked = blockForDecision(working, resolved.reason || 'CONTINUITY_NOT_PROVEN', resolved.candidates || []);
  return Object.freeze({ session: blocked, outcome: 'DECISION_REQUIRED' });
}

export function applyConstructionDecision(session, evidenceModel, indexes, action, payload = {}, options = {}) {
  const request = session.currentDecisionRequest;
  if (session.state !== CONSTRUCTION_STATES.USER_DECISION_REQUIRED || !request) return Object.freeze({ session, outcome: 'NO_OPEN_DECISION' });
  const resolution = Object.freeze({
    action,
    selectedCandidateId: payload.candidateId || null,
    confirmedBy: 'USER',
    reason: String(payload.reason || '').trim(),
    confirmedAt: new Date().toISOString(),
  });
  const ledgerEntry = Object.freeze({ ...request, state: 'RESOLVED', resolution });
  let base = freezeConstructionSession({ ...session, decisionLedger: [...session.decisionLedger, ledgerEntry], currentDecisionRequest: null });

  if (action === DECISION_ACTIONS.REJECT_CANDIDATE) {
    return Object.freeze({ session: freezeConstructionSession({ ...base, state: CONSTRUCTION_STATES.BUILDING, rejectedCandidateIds: [...base.rejectedCandidateIds, payload.candidateId].filter(Boolean) }), outcome: 'CANDIDATE_REJECTED' });
  }
  if (action === DECISION_ACTIONS.MARK_TERMINAL || action === DECISION_ACTIONS.MARK_EXTERNAL_BOUNDARY) {
    const status = action === DECISION_ACTIONS.MARK_TERMINAL ? CONNECTION_STATUSES.INTENTIONAL_TERMINAL : CONNECTION_STATUSES.EXTERNAL_BOUNDARY;
    return Object.freeze({ session: completeActiveBranch(base, status), outcome: 'BRANCH_COMPLETE' });
  }
  if (action === DECISION_ACTIONS.CONNECT) {
    const candidate = request.candidates.find((row) => row.candidateId === payload.candidateId);
    if (!candidate) return Object.freeze({ session: freezeConstructionSession({ ...base, state: CONSTRUCTION_STATES.USER_DECISION_REQUIRED, currentDecisionRequest: request }), outcome: 'CANDIDATE_NOT_FOUND' });
    return Object.freeze({
      session: commitConnection(base, candidate, indexes, CONNECTION_STATUSES.USER_CONFIRMED, {
        ...options,
        transitionContext: base.transitionContext,
        forceVirtualRepair: candidate.gapMm > Number(options.exactToleranceMm ?? 1),
      }),
      outcome: 'USER_CONNECTION_COMMITTED',
    });
  }
  return Object.freeze({ session: freezeConstructionSession({ ...base, state: CONSTRUCTION_STATES.USER_DECISION_REQUIRED, currentDecisionRequest: request }), outcome: 'UNSUPPORTED_DECISION' });
}

export function runConstructionUntilBlocked(session, evidenceModel, indexes, options = {}, maxSteps = 10000) {
  let current = session;
  const outcomes = [];
  for (let step = 0; step < maxSteps; step += 1) {
    const result = advanceConstruction(current, evidenceModel, indexes, options);
    current = result.session;
    outcomes.push(result.outcome);
    if (['DECISION_REQUIRED', 'ROUTE_COMPLETE', 'FAILED'].includes(result.outcome) || current.state === CONSTRUCTION_STATES.USER_DECISION_REQUIRED || current.state === CONSTRUCTION_STATES.ROUTE_COMPLETE || current.state === CONSTRUCTION_STATES.FAILED) break;
  }
  return Object.freeze({ session: current, outcomes: Object.freeze(outcomes) });
}
