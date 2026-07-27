/** Supervised two-step command UX for the Sequential Draft Edit 3D surface. */
import { isIsoTimestamp } from '../../../contracts/contract-values.js';
import { SEQUENTIAL_PREPARATION_ENABLED_COMMAND_TYPES } from './sequential-command-contracts.js';

export const SEQUENTIAL_DRAFT_EDIT_COMMAND_PANEL_SCHEMA = 'SequentialDraftEditCommandPanel.v1';

const EVIDENCE_POLICY = Object.freeze({
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
function requiredElement(root, selector) {
  const value = root.querySelector(selector);
  if (!value) throw new Error(`Sequential Draft Edit command element missing: ${selector}`);
  return value;
}
function elements(root) {
  return {
    panel: requiredElement(root, '[data-ssk-draft-edit-command-panel]'),
    status: requiredElement(root, '[data-ssk-draft-edit-command-state]'),
    actor: requiredElement(root, '[data-ssk-draft-edit-actor]'),
    reason: requiredElement(root, '[data-ssk-draft-edit-reason]'),
    evidence: requiredElement(root, '[data-ssk-draft-edit-evidence]'),
    preview: requiredElement(root, '[data-ssk-draft-edit-command-preview]'),
    accept: requiredElement(root, '[data-ssk-draft-edit-command-accept]'),
    cancel: requiredElement(root, '[data-ssk-draft-edit-command-cancel]'),
    commands: [...root.querySelectorAll('[data-ssk-draft-edit-command]')],
  };
}
function setHidden(element, hidden) {
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (hidden) element.setAttribute('inert', ''); else element.removeAttribute('inert');
}
function notice(state, message, kind = 'ready') {
  state.notice = Object.freeze({ message, kind });
}
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
function meaningful(state, commandType) {
  const session = state.current?.session;
  if (!session) return false;
  const request = session.currentDecisionRequest;
  if (commandType === 'DEFER_DECISION') {
    return session.state === 'USER_DECISION_REQUIRED' && request && request.state !== 'DEFERRED';
  }
  if (commandType === 'RESUME_DECISION') {
    return session.state === 'USER_DECISION_REQUIRED' && request?.state === 'DEFERRED';
  }
  if (commandType === 'UNDO_LAST_TRANSACTION') return Boolean(session.undoStack?.length);
  if (commandType === 'REDO_LAST_TRANSACTION') return Boolean(session.redoStack?.length);
  return !['USER_DECISION_REQUIRED', 'ROUTE_COMPLETE', 'FAILED'].includes(session.state);
}
function requestFor(state, commandType) {
  const values = validateEvidence(commandType, evidenceValues(state));
  const branchId = text(state.gatewayState?.branchId);
  if (!branchId) throw new RangeError('Draft Edit command branch authority is unavailable.');
  return Object.freeze({
    command: Object.freeze({
      commandType,
      branchId,
      payload: Object.freeze({ reason: values.reason, evidenceNote: values.evidenceNote }),
    }),
    origin: Object.freeze({ kind: 'USER', actorId: values.actorId, issuedAt: exactIssuedAt(state.now) }),
  });
}
function previewText(prepared) {
  const transactions = prepared.candidate.transactionIds.length
    ? prepared.candidate.transactionIds.join(', ')
    : 'Journal-only accepted command';
  return [
    `Command: ${prepared.nativeCommand.commandType}`,
    `Branch: ${prepared.nativeCommand.branchId}`,
    `Issued: ${prepared.envelope.origin.issuedAt}`,
    `Predicted outcome: ${prepared.candidate.outcome}`,
    `Prepared ID: ${prepared.preparedId}`,
    `Authority ID: ${prepared.expectedAuthority.authorityId}`,
    `Transaction mapping: ${transactions}`,
  ].join('\n');
}
function render(state) {
  setHidden(state.elements.panel, !state.active);
  state.elements.preview.textContent = state.pending
    ? previewText(state.pending)
    : 'No command is prepared. Select a supervised command to create review evidence.';
  const ready = state.active && state.gatewayState?.ready === true && !state.destroyed;
  for (const button of state.elements.commands) {
    const type = text(button.dataset?.sskDraftEditCommand).toUpperCase();
    button.disabled = !ready || Boolean(state.pending) || !meaningful(state, type);
  }
  state.elements.accept.disabled = !ready || !state.pending;
  state.elements.cancel.disabled = !state.pending;
  const defaultMessage = ready
    ? `Gateway ready · branch ${state.gatewayState.branchId}. Prepare does not publish authority.`
    : `Gateway unavailable${state.gatewayState?.reasonCode ? ` · ${state.gatewayState.reasonCode}` : ''}.`;
  state.elements.status.textContent = state.notice?.message || defaultMessage;
  state.elements.status.dataset.state = state.notice?.kind || (ready ? 'ready' : 'blocked');
}
function readState(state) {
  state.gatewayState = state.gateway.getState();
  state.current = state.readCurrentState();
}
function refresh(state, options = {}) {
  if (state.destroyed) return stateSnapshot(state);
  if (options.invalidatePending && state.pending) {
    state.pending = null;
    notice(state, options.reason || 'Prepared command invalidated because owner authority changed.', 'warning');
  }
  try { readState(state); }
  catch (error) {
    state.gatewayState = Object.freeze({ ready: false, branchId: null, reasonCode: error.code || 'COMMAND_AUTHORITY_UNAVAILABLE' });
    state.current = null;
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
  if (!state.gatewayState?.ready || !meaningful(state, commandType)) {
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
  try { return action(); }
  catch (error) {
    notice(state, `${error.code || error.name || 'ERROR'}: ${error.message || String(error)}`, 'error');
    try { state.onFailure(error); } catch {}
    refresh(state);
    return null;
  }
}
function handleClick(state, event) {
  const command = event.target?.closest?.('[data-ssk-draft-edit-command]')?.dataset?.sskDraftEditCommand;
  if (command) { event.preventDefault(); safeAction(state, () => prepare(state, command)); return; }
  if (event.target?.closest?.('[data-ssk-draft-edit-command-accept]')) {
    event.preventDefault(); safeAction(state, () => accept(state)); return;
  }
  if (event.target?.closest?.('[data-ssk-draft-edit-command-cancel]')) {
    event.preventDefault(); cancel(state);
  }
}
function stateSnapshot(state) {
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_COMMAND_PANEL_SCHEMA,
    active: state.active,
    destroyed: state.destroyed,
    ready: state.gatewayState?.ready === true,
    branchId: state.gatewayState?.branchId || null,
    pendingPreparedId: state.pending?.preparedId || null,
    notice: state.notice,
  });
}

export function createSequentialDraftEditCommandPanel(options = {}) {
  const root = options.root;
  if (!root?.querySelector) throw new TypeError('Draft Edit command panel requires a root.');
  const gateway = options.gateway;
  for (const name of ['getState', 'prepare', 'accept']) requiredFunction(gateway?.[name], `gateway.${name}`);
  const state = {
    root, gateway, elements: elements(root),
    readCurrentState: requiredFunction(options.readCurrentState, 'readCurrentState'),
    now: options.now || (() => new Date().toISOString()),
    onAccepted: options.onAccepted || (() => {}), onFailure: options.onFailure || (() => {}),
    active: false, destroyed: false, pending: null, notice: null,
    gatewayState: null, current: null, onClick: null,
  };
  state.onClick = (event) => handleClick(state, event);
  root.addEventListener('click', state.onClick);
  refresh(state);
  return Object.freeze({
    schema: SEQUENTIAL_DRAFT_EDIT_COMMAND_PANEL_SCHEMA,
    setActive(value) {
      const next = value === true;
      if (!next && state.pending) cancel(state, 'Prepared command invalidated because Draft Edit 3D closed.');
      state.active = next && !state.destroyed;
      return refresh(state);
    },
    refresh: (optionsValue = {}) => refresh(state, optionsValue),
    prepare: (commandType) => prepare(state, commandType),
    accept: () => accept(state),
    cancel: () => cancel(state),
    invalidate(reason) {
      if (!state.pending) return refresh(state);
      state.pending = null;
      notice(state, reason || 'Prepared command invalidated.', 'warning');
      return refresh(state);
    },
    getState: () => stateSnapshot(state),
    destroy() {
      if (state.destroyed) return false;
      state.destroyed = true;
      state.pending = null;
      state.active = false;
      root.removeEventListener('click', state.onClick);
      render(state);
      return true;
    },
  });
}

export const _test = Object.freeze({ evidenceValues, validateEvidence, meaningful, previewText });
