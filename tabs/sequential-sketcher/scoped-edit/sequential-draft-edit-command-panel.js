/** Supervised two-step command UX for the Sequential Draft Edit 3D surface. */
import { isIsoTimestamp } from '../../../contracts/contract-values.js';
import { SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES } from './sequential-command-contracts.js';
import {
  exactSequentialDraftEditCandidateTarget,
  exactSequentialDraftEditDecisionTarget,
  exactSequentialDraftEditManualPorts,
  exactSequentialDraftEditReversalTarget,
  isSequentialDraftEditCommandMeaningful,
  sequentialDraftEditCommandRequiresTarget,
  sequentialDraftEditTargetFor,
} from './sequential-draft-edit-panel-targets.js';
import {
  installSequentialDraftEditCommandPanelStyle,
  sequentialDraftEditCommandPanelElements,
  sequentialDraftEditPreparedPreview,
  sequentialDraftEditTargetText,
  setSequentialDraftEditPanelHidden,
} from './sequential-draft-edit-command-presentation.js';

export const SEQUENTIAL_DRAFT_EDIT_COMMAND_PANEL_SCHEMA = 'SequentialDraftEditCommandPanel.v1';

const EVIDENCE_POLICY = Object.freeze({
  CONNECT_CANDIDATE: Object.freeze({ reason: true, evidence: true }),
  MANUAL_CONNECT: Object.freeze({ reason: true, evidence: true }),
  REJECT_CANDIDATE: Object.freeze({ reason: true, evidence: true }),
  MARK_TERMINAL: Object.freeze({ reason: true, evidence: true }),
  MARK_EXTERNAL_BOUNDARY: Object.freeze({ reason: true, evidence: true }),
  REVERSE_COMPONENT: Object.freeze({ reason: true, evidence: true }),
  DEFER_DECISION: Object.freeze({ reason: true, evidence: true }),
  RESUME_DECISION: Object.freeze({ reason: true, evidence: false }),
  UNDO_LAST_TRANSACTION: Object.freeze({ reason: true, evidence: true }),
  REDO_LAST_TRANSACTION: Object.freeze({ reason: true, evidence: true }),
});

function text(value) { return String(value ?? '').trim(); }
function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`);
  return value;
}
function notice(state, message, kind = 'ready') { state.notice = Object.freeze({ message, kind }); }
function exactIssuedAt(now) {
  const value = now();
  if (!isIsoTimestamp(value)) throw new TypeError('Draft Edit command issuedAt provider must return an exact ISO timestamp.');
  return value;
}
function evidenceValues(state) {
  return Object.freeze({
    actorId: text(state.elements.actor.value),
    reason: text(state.elements.reason.value),
    evidenceNote: text(state.elements.evidence.value),
  });
}
function validateEvidence(commandType, values) {
  if (!values.actorId) throw new TypeError('Operator actor ID is required.');
  const policy = EVIDENCE_POLICY[commandType] || {};
  if (policy.reason && !values.reason) throw new TypeError(`${commandType} requires an operator reason.`);
  if (policy.evidence && !values.evidenceNote) throw new TypeError(`${commandType} requires an evidence note.`);
  return values;
}
function requestFor(state, commandType) {
  const values = validateEvidence(commandType, evidenceValues(state));
  const branchId = text(state.gatewayState?.branchId);
  if (!branchId) throw new RangeError('Draft Edit command branch authority is unavailable.');
  const target = sequentialDraftEditTargetFor(state, commandType);
  if (sequentialDraftEditCommandRequiresTarget(commandType) && !target) {
    throw new RangeError(`${commandType} requires one exact current target.`);
  }
  const manualPorts = commandType === 'MANUAL_CONNECT'
    ? exactSequentialDraftEditManualPorts(state) : null;
  if (commandType === 'MANUAL_CONNECT' && !manualPorts) {
    throw new RangeError('MANUAL_CONNECT requires one exact current indexed candidate port pair.');
  }
  return Object.freeze({
    command: Object.freeze({
      commandType,
      branchId,
      decisionId: target?.decisionId || null,
      candidateId: target?.candidateId || null,
      componentId: target?.componentId || null,
      entryPortId: target?.entryPortId || null,
      fromPortId: manualPorts?.fromPortId || null,
      toPortId: manualPorts?.toPortId || null,
      payload: Object.freeze({
        reason: values.reason,
        evidenceNote: values.evidenceNote,
        targetEntityId: target?.entityId || null,
        targetSelectionId: target?.targetSelectionId || null,
        decisionTargetId: target?.decisionTargetId || null,
        reversalTargetId: target?.reversalTargetId || null,
        targetDecisionReason: target?.reason || null,
        targetDecisionScope: target?.decisionScope || null,
        targetActivePortId: target?.activePortId || null,
        targetJunctionId: target?.junctionId || null,
        targetReference: target?.referenceTarget || null,
      }),
    }),
    origin: Object.freeze({
      kind: 'USER', actorId: values.actorId, issuedAt: exactIssuedAt(state.now),
    }),
  });
}
function render(state) {
  const candidate = exactSequentialDraftEditCandidateTarget(state);
  const decision = exactSequentialDraftEditDecisionTarget(state);
  const reversal = exactSequentialDraftEditReversalTarget(state);
  setSequentialDraftEditPanelHidden(state.elements.panel, !state.active);
  state.elements.target.textContent = sequentialDraftEditTargetText({
    candidate, decision, reversal,
    manualPorts: exactSequentialDraftEditManualPorts(state),
  });
  state.elements.preview.textContent = state.pending
    ? sequentialDraftEditPreparedPreview(state.pending)
    : 'No command is prepared. Select a supervised command to create review evidence.';
  const ready = state.active && state.gatewayState?.ready === true && !state.destroyed;
  for (const button of state.elements.commands) {
    const type = text(button.dataset?.sskDraftEditCommand).toUpperCase();
    button.disabled = !ready || Boolean(state.pending)
      || !isSequentialDraftEditCommandMeaningful(state, type);
  }
  state.elements.accept.disabled = !ready || !state.pending;
  state.elements.cancel.disabled = !state.pending;
  const defaultMessage = ready
    ? `Gateway ready · branch ${state.gatewayState.branchId}. Prepare does not publish authority.`
    : `Gateway unavailable${state.gatewayState?.reasonCode ? ` · ${state.gatewayState.reasonCode}` : ''}.`;
  const activeNotice = state.notice && (ready || ['error', 'warning'].includes(state.notice.kind))
    ? state.notice : null;
  state.elements.status.textContent = activeNotice?.message || defaultMessage;
  state.elements.status.dataset.state = activeNotice?.kind || (ready ? 'ready' : 'blocked');
}
function readState(state) {
  state.gatewayState = state.gateway.getState();
  state.current = state.readCurrentState();
  state.currentAuthorityId = state.readCurrentAuthorityId();
}
function invalidate(state, options = {}) {
  const hadEvidence = Boolean(
    state.pending || state.candidateTarget || state.decisionTarget || state.reversalTarget,
  );
  state.pending = null;
  state.candidateTarget = null;
  state.decisionTarget = null;
  state.reversalTarget = null;
  if (hadEvidence) notice(
    state,
    options.reason || 'Prepared command and command target invalidated.',
    'warning',
  );
}
function refresh(state, options = {}) {
  if (state.destroyed) return stateSnapshot(state);
  if (options.invalidatePending || options.invalidateTarget) invalidate(state, options);
  try {
    readState(state);
    if ((state.candidateTarget && !exactSequentialDraftEditCandidateTarget(state))
      || (state.decisionTarget && !exactSequentialDraftEditDecisionTarget(state))
      || (state.reversalTarget && !exactSequentialDraftEditReversalTarget(state))) {
      invalidate(state, { reason: 'Command target invalidated because exact command authority changed.' });
    }
  } catch (error) {
    state.gatewayState = Object.freeze({
      ready: false, branchId: null,
      reasonCode: error.code || 'COMMAND_AUTHORITY_UNAVAILABLE',
    });
    state.current = null;
    state.currentAuthorityId = null;
    invalidate(state);
    notice(state, error.message || String(error), 'error');
  }
  render(state);
  return stateSnapshot(state);
}
function prepare(state, commandTypeValue) {
  if (state.destroyed || !state.active) throw new RangeError('Draft Edit command panel is not active.');
  refresh(state);
  const commandType = text(commandTypeValue).toUpperCase();
  if (!SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES.includes(commandType)) {
    throw new RangeError(`Draft Edit command ${commandType} is not enabled.`);
  }
  if (!state.gatewayState?.ready || !isSequentialDraftEditCommandMeaningful(state, commandType)) {
    throw new RangeError(`Draft Edit command ${commandType} is not available for the current authority.`);
  }
  const prepared = state.gateway.prepare(requestFor(state, commandType));
  state.pending = prepared;
  notice(state, `${commandType} prepared. Review the immutable evidence before acceptance.`, 'review');
  render(state);
  return prepared;
}
function cancel(state, reason = 'Prepared command cancelled without authority mutation.') {
  const cancelled = state.pending;
  state.pending = null;
  if (cancelled) notice(state, reason, 'ready');
  refresh(state);
  return cancelled;
}
function accept(state) {
  if (!state.pending) throw new RangeError('No prepared Draft Edit command is pending.');
  const prepared = state.pending;
  const acceptance = state.gateway.accept(prepared);
  state.pending = null;
  state.candidateTarget = null;
  state.decisionTarget = null;
  state.reversalTarget = null;
  if (acceptance.accepted) {
    notice(state, `${prepared.nativeCommand.commandType} accepted and published.`, 'accepted');
    try { state.onAccepted(acceptance); } catch {}
  } else {
    notice(state, `${acceptance.reasonCode}: ${acceptance.message}`, 'error');
    try { state.onFailure(acceptance); } catch {}
  }
  refresh(state);
  return acceptance;
}
function safeAction(state, action) {
  try { return action(); } catch (error) {
    notice(state, `${error.code || error.name || 'ERROR'}: ${error.message || String(error)}`, 'error');
    try { state.onFailure(error); } catch {}
    refresh(state);
    return null;
  }
}
function handleClick(state, event) {
  const command = event.target?.closest?.('[data-ssk-draft-edit-command]')
    ?.dataset?.sskDraftEditCommand;
  if (command) {
    event.preventDefault();
    safeAction(state, () => prepare(state, command));
    return;
  }
  if (event.target?.closest?.('[data-ssk-draft-edit-command-accept]')) {
    event.preventDefault();
    safeAction(state, () => accept(state));
    return;
  }
  if (event.target?.closest?.('[data-ssk-draft-edit-command-cancel]')) {
    event.preventDefault();
    cancel(state);
  }
}
function stateSnapshot(state) {
  const manual = exactSequentialDraftEditManualPorts(state);
  const reversal = exactSequentialDraftEditReversalTarget(state);
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_COMMAND_PANEL_SCHEMA,
    active: state.active,
    destroyed: state.destroyed,
    ready: state.gatewayState?.ready === true,
    branchId: state.gatewayState?.branchId || null,
    currentAuthorityId: state.currentAuthorityId || null,
    candidateId: exactSequentialDraftEditCandidateTarget(state)?.candidateId || null,
    targetSelectionId: exactSequentialDraftEditCandidateTarget(state)?.targetSelectionId || null,
    fromPortId: manual?.fromPortId || null,
    toPortId: manual?.toPortId || null,
    decisionId: exactSequentialDraftEditDecisionTarget(state)?.decisionId || reversal?.decisionId || null,
    decisionTargetId: exactSequentialDraftEditDecisionTarget(state)?.decisionTargetId || null,
    reversalTargetId: reversal?.reversalTargetId || null,
    reversalCandidateId: reversal?.candidateId || null,
    reversalComponentId: reversal?.componentId || null,
    reversalEntryPortId: reversal?.entryPortId || null,
    pendingPreparedId: state.pending?.preparedId || null,
    notice: state.notice,
  });
}

export function createSequentialDraftEditCommandPanel(options = {}) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Draft Edit command panel requires a root.');
  const gateway = options.gateway;
  for (const name of ['getState', 'prepare', 'accept']) {
    requiredFunction(gateway?.[name], `gateway.${name}`);
  }
  const panelElements = sequentialDraftEditCommandPanelElements(root);
  installSequentialDraftEditCommandPanelStyle(panelElements);
  const state = {
    root, gateway, elements: panelElements,
    readCurrentState: requiredFunction(options.readCurrentState, 'readCurrentState'),
    readCurrentAuthorityId: requiredFunction(options.readCurrentAuthorityId, 'readCurrentAuthorityId'),
    now: requiredFunction(options.now || (() => new Date().toISOString()), 'issuedAt provider'),
    onAccepted: options.onAccepted || (() => {}),
    onFailure: options.onFailure || (() => {}),
    active: false, destroyed: false, pending: null,
    candidateTarget: null, decisionTarget: null, reversalTarget: null,
    notice: null, gatewayState: null, current: null,
    currentAuthorityId: null, onClick: null,
  };
  state.onClick = (event) => handleClick(state, event);
  root.addEventListener('click', state.onClick);
  refresh(state);
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_COMMAND_PANEL_SCHEMA,
    setActive(value) {
      const next = value === true;
      if (!next) invalidate(state, {
        reason: 'Prepared command and command target invalidated because Draft Edit 3D closed.',
      });
      state.active = next && !state.destroyed;
      return refresh(state);
    },
    setCandidateTarget(target) {
      state.pending = null;
      state.candidateTarget = target;
      state.decisionTarget = null;
      state.reversalTarget = null;
      notice(state, `Candidate ${target.candidateId} selected. Selection does not prepare a command.`);
      return refresh(state);
    },
    clearCandidateTarget(reason) {
      state.candidateTarget = null;
      state.pending = null;
      if (reason) notice(state, reason, 'warning');
      return refresh(state);
    },
    setDecisionTarget(target) {
      state.pending = null;
      state.decisionTarget = target;
      state.candidateTarget = null;
      state.reversalTarget = null;
      notice(state, `Boundary decision ${target.decisionId} certified. Certification does not prepare a command.`);
      return refresh(state);
    },
    clearDecisionTarget(reason) {
      state.decisionTarget = null;
      state.pending = null;
      if (reason) notice(state, reason, 'warning');
      return refresh(state);
    },
    setReversalTarget(target) {
      state.pending = null;
      state.reversalTarget = target;
      state.candidateTarget = null;
      state.decisionTarget = null;
      notice(state, `Reversal entry ${target.entryPortId} selected. Selection does not prepare a command.`);
      return refresh(state);
    },
    clearReversalTarget(reason) {
      state.reversalTarget = null;
      state.pending = null;
      if (reason) notice(state, reason, 'warning');
      return refresh(state);
    },
    refresh: (optionsValue = {}) => refresh(state, optionsValue),
    prepare: (commandType) => prepare(state, commandType),
    accept: () => accept(state),
    cancel: () => cancel(state),
    invalidate(reason) { invalidate(state, { reason }); return refresh(state); },
    getState: () => stateSnapshot(state),
    destroy() {
      if (state.destroyed) return false;
      state.destroyed = true;
      invalidate(state);
      state.active = false;
      root.removeEventListener('click', state.onClick);
      render(state);
      return true;
    },
  });
}
