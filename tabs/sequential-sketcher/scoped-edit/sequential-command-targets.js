/** Exact Sequential domain-target resolution; no visual or positional inference. */
import {
  SEQUENTIAL_COMMAND_REJECTION,
  createSequentialCommandTargetEvidence,
  sequentialCommandCodedError,
} from './sequential-command-contracts.js';

const DECISION_COMMANDS = new Set([
  'CONNECT_CANDIDATE', 'MANUAL_CONNECT', 'REJECT_CANDIDATE',
  'MARK_TERMINAL', 'MARK_EXTERNAL_BOUNDARY', 'REVERSE_COMPONENT',
  'DEFER_DECISION', 'RESUME_DECISION',
]);
const CANDIDATE_COMMANDS = new Set([
  'CONNECT_CANDIDATE', 'MANUAL_CONNECT', 'REJECT_CANDIDATE', 'REVERSE_COMPONENT',
]);

function fail(code, message) { throw sequentialCommandCodedError(code, message, RangeError); }
function currentDecision(session, command) {
  const request = session?.currentDecisionRequest;
  if (!request || request.decisionId !== command.decisionId) {
    fail(
      SEQUENTIAL_COMMAND_REJECTION.CURRENT_DECISION_MISMATCH,
      `Sequential decision ${command.decisionId || '(missing)'} is not the exact current decision.`,
    );
  }
  return request;
}
function currentCandidate(request, command) {
  const candidate = (request?.candidates || []).find((row) => row.candidateId === command.candidateId);
  if (!candidate) {
    fail(
      SEQUENTIAL_COMMAND_REJECTION.CURRENT_CANDIDATE_MISMATCH,
      `Sequential candidate ${command.candidateId || '(missing)'} is not part of the exact current decision.`,
    );
  }
  return candidate;
}
function exactMapValue(map, id, code, label) {
  if (!id) fail(SEQUENTIAL_COMMAND_REJECTION.COMMAND_TARGET_MISSING, `${label} identity is required.`);
  const value = map instanceof Map ? map.get(id) : null;
  if (!value) fail(code, `${label} ${id} is not current indexed evidence.`);
  return value;
}
function candidatePort(candidate, key, fallbackKey) {
  return candidate?.[key] || candidate?.[fallbackKey] || null;
}
function verifyManualPorts(candidate, command, indexes) {
  const expectedFrom = candidatePort(candidate, 'fromPortId', 'targetPortId');
  const expectedTo = candidatePort(candidate, 'toPortId', 'connectedPortId');
  if (!command.fromPortId || !command.toPortId
    || command.fromPortId !== expectedFrom || command.toPortId !== expectedTo) {
    fail(
      SEQUENTIAL_COMMAND_REJECTION.CURRENT_PORT_MISMATCH,
      'Manual connection port identities do not exactly match the current candidate.',
    );
  }
  exactMapValue(indexes?.ports, command.fromPortId, SEQUENTIAL_COMMAND_REJECTION.CURRENT_PORT_MISMATCH, 'From port');
  exactMapValue(indexes?.ports, command.toPortId, SEQUENTIAL_COMMAND_REJECTION.CURRENT_PORT_MISMATCH, 'To port');
}

export function resolveSequentialCommandTargets(input = {}) {
  const command = input.command;
  const session = input.session;
  const indexes = input.indexes;
  if (!command || !session) {
    fail(SEQUENTIAL_COMMAND_REJECTION.COMMAND_TARGET_MISSING, 'Sequential command and session are required.');
  }
  if (session.rootBranchId !== command.branchId) {
    fail(
      SEQUENTIAL_COMMAND_REJECTION.COMMAND_BRANCH_MISMATCH,
      `Command branch ${command.branchId} does not match session branch ${session.rootBranchId || '(missing)'}.`,
    );
  }

  let request = null;
  let candidate = null;
  let component = null;
  let connection = null;
  if (DECISION_COMMANDS.has(command.commandType)) request = currentDecision(session, command);
  if (CANDIDATE_COMMANDS.has(command.commandType)) candidate = currentCandidate(request, command);

  if (command.commandType === 'MANUAL_CONNECT') verifyManualPorts(candidate, command, indexes);
  if (command.commandType === 'REVERSE_COMPONENT') {
    component = exactMapValue(
      indexes?.components,
      command.componentId,
      SEQUENTIAL_COMMAND_REJECTION.CURRENT_COMPONENT_MISMATCH,
      'Component',
    );
    exactMapValue(
      indexes?.ports,
      command.entryPortId,
      SEQUENTIAL_COMMAND_REJECTION.CURRENT_PORT_MISMATCH,
      'Entry port',
    );
  }
  if (command.connectionId) {
    connection = (session.committedConnections || []).find((row) => row.connectionId === command.connectionId);
    if (!connection) fail(
      SEQUENTIAL_COMMAND_REJECTION.CURRENT_CONNECTION_MISMATCH,
      `Connection ${command.connectionId} is not current committed construction.`,
    );
  }

  const evidence = createSequentialCommandTargetEvidence({
    commandType: command.commandType,
    branchId: command.branchId,
    decisionId: request?.decisionId || command.decisionId,
    candidateId: candidate?.candidateId || command.candidateId,
    componentId: component?.componentId || command.componentId,
    connectionId: connection?.connectionId || command.connectionId,
    fromPortId: command.fromPortId,
    toPortId: command.toPortId,
    entryPortId: command.entryPortId,
  });
  return Object.freeze({ evidence, request, candidate, component, connection });
}
