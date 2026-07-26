/** Acceptance-time revalidation, recomputation, complete comparison, and publication. */
import {
  SEQUENTIAL_COMMAND_REJECTION,
  SEQUENTIAL_PREPARED_COMMAND_SCHEMA,
  createSequentialCommandAcceptance,
  createSequentialPreparedCommand,
  sameSequentialContractValue,
} from './sequential-command-contracts.js';
import { deriveSequentialEditAuthority } from './sequential-edit-authority.js';
import { prepareSequentialCommand } from './sequential-command-preparation.js';

function rejection(prepared, currentAuthority, reasonCode, message) {
  return createSequentialCommandAcceptance({
    accepted: false,
    reasonCode,
    message,
    expectedAuthorityId: prepared.expectedAuthority.authorityId,
    currentAuthorityId: currentAuthority?.authorityId || prepared.expectedAuthority.authorityId,
    preparedId: prepared.preparedId,
  });
}

function validPreparedIdentity(prepared) {
  const normalized = createSequentialPreparedCommand({
    envelope: prepared.envelope,
    nativeCommand: prepared.nativeCommand,
    expectedAuthority: prepared.expectedAuthority,
    scope: prepared.scope,
    targets: prepared.targets,
    candidate: prepared.candidate,
  });
  return sameSequentialContractValue(normalized, prepared);
}
function currentState(reader) {
  if (typeof reader !== 'function') throw new TypeError('Sequential acceptance requires readCurrentState().');
  const state = reader();
  if (!state || typeof state !== 'object') throw new TypeError('Sequential current state is unavailable.');
  return state;
}

export function acceptPreparedSequentialCommand(input = {}) {
  const prepared = input.prepared;
  if (prepared?.schema !== SEQUENTIAL_PREPARED_COMMAND_SCHEMA) {
    throw new TypeError(`Sequential prepared command must use ${SEQUENTIAL_PREPARED_COMMAND_SCHEMA}.`);
  }
  const firstState = currentState(input.readCurrentState);
  const firstAuthority = deriveSequentialEditAuthority(firstState);
  if (!validPreparedIdentity(prepared)) {
    return rejection(
      prepared,
      firstAuthority,
      SEQUENTIAL_COMMAND_REJECTION.PREPARED_COMMAND_INVALID,
      'Prepared Sequential command identity does not match its complete contents.',
    );
  }
  if (!sameSequentialContractValue(firstAuthority, prepared.expectedAuthority)) {
    return rejection(
      prepared,
      firstAuthority,
      SEQUENTIAL_COMMAND_REJECTION.PREPARED_COMMAND_STALE,
      'Prepared Sequential command is stale against current authority.',
    );
  }

  let recomputed;
  try {
    recomputed = prepareSequentialCommand({
      ...firstState,
      envelope: prepared.envelope,
      nativeCommand: prepared.nativeCommand,
      expectedAuthority: firstAuthority,
    });
  } catch (error) {
    return rejection(
      prepared,
      firstAuthority,
      error.code || SEQUENTIAL_COMMAND_REJECTION.PREPARED_COMMAND_INVALID,
      error.message || String(error),
    );
  }
  if (!sameSequentialContractValue(recomputed.candidate, prepared.candidate)
    || !sameSequentialContractValue(recomputed.targets, prepared.targets)
    || !sameSequentialContractValue(recomputed.scope, prepared.scope)) {
    return rejection(
      prepared,
      firstAuthority,
      SEQUENTIAL_COMMAND_REJECTION.COMPLETE_RESULT_MISMATCH,
      'Acceptance recomputation differs from the complete prepared result.',
    );
  }

  const publishState = currentState(input.readCurrentState);
  const publishAuthority = deriveSequentialEditAuthority(publishState);
  if (!sameSequentialContractValue(publishAuthority, firstAuthority)) {
    return rejection(
      prepared,
      publishAuthority,
      SEQUENTIAL_COMMAND_REJECTION.PREPARED_COMMAND_STALE,
      'Sequential authority changed after acceptance recomputation.',
    );
  }
  if (typeof input.publishCandidate !== 'function') {
    throw new TypeError('Sequential acceptance requires publishCandidate().');
  }
  try {
    const publication = input.publishCandidate({
      candidate: recomputed.candidate,
      expectedAuthority: publishAuthority,
      preparedId: prepared.preparedId,
      envelope: prepared.envelope,
    });
    return createSequentialCommandAcceptance({
      accepted: true,
      message: 'Sequential command accepted and published as one complete candidate.',
      expectedAuthorityId: prepared.expectedAuthority.authorityId,
      currentAuthorityId: publishAuthority.authorityId,
      preparedId: prepared.preparedId,
      publication,
    });
  } catch (error) {
    return rejection(
      prepared,
      publishAuthority,
      error.code || SEQUENTIAL_COMMAND_REJECTION.PUBLICATION_FAILED,
      error.message || String(error),
    );
  }
}
