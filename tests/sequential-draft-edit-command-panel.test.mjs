import assert from 'node:assert/strict';
import { createSequentialDraftEditCommandPanel } from '../tabs/sequential-sketcher/scoped-edit/sequential-draft-edit-command-panel.js';

const ISSUED_AT = '2026-07-27T17:40:00.000Z';
const COMMANDS = Object.freeze([
  'ADVANCE_ONE', 'RUN_UNTIL_BLOCKED', 'DEFER_DECISION',
  'RESUME_DECISION', 'UNDO_LAST_TRANSACTION', 'REDO_LAST_TRANSACTION',
]);

class FakeElement {
  constructor(dataset = {}) {
    this.dataset = { ...dataset };
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.attributes = new Map();
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  closest(selector) {
    if (selector === '[data-ssk-draft-edit-command]' && this.dataset.sskDraftEditCommand) return this;
    if (selector === '[data-ssk-draft-edit-command-accept]' && this.dataset.sskDraftEditCommandAccept) return this;
    if (selector === '[data-ssk-draft-edit-command-cancel]' && this.dataset.sskDraftEditCommandCancel) return this;
    return null;
  }
}

function rootFixture() {
  const elements = {
    panel: new FakeElement(),
    status: new FakeElement(),
    actor: new FakeElement(),
    reason: new FakeElement(),
    evidence: new FakeElement(),
    preview: new FakeElement(),
    accept: new FakeElement({ sskDraftEditCommandAccept: '1' }),
    cancel: new FakeElement({ sskDraftEditCommandCancel: '1' }),
    commands: COMMANDS.map((commandType) => new FakeElement({ sskDraftEditCommand: commandType })),
  };
  const selectors = new Map([
    ['[data-ssk-draft-edit-command-panel]', elements.panel],
    ['[data-ssk-draft-edit-command-state]', elements.status],
    ['[data-ssk-draft-edit-actor]', elements.actor],
    ['[data-ssk-draft-edit-reason]', elements.reason],
    ['[data-ssk-draft-edit-evidence]', elements.evidence],
    ['[data-ssk-draft-edit-command-preview]', elements.preview],
    ['[data-ssk-draft-edit-command-accept]', elements.accept],
    ['[data-ssk-draft-edit-command-cancel]', elements.cancel],
  ]);
  const listeners = new Map();
  const root = {
    querySelector: (selector) => selectors.get(selector) || null,
    querySelectorAll: (selector) => selector === '[data-ssk-draft-edit-command]' ? elements.commands : [],
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  return Object.freeze({ root, elements, listeners });
}

function prepared(input, sequence) {
  return Object.freeze({
    schema: 'SequentialPreparedCommand.v1',
    preparedId: `SPREP-${sequence}`,
    nativeCommand: Object.freeze({
      commandType: input.command.commandType,
      branchId: input.command.branchId,
    }),
    envelope: Object.freeze({ origin: input.origin }),
    expectedAuthority: Object.freeze({ authorityId: `SAUTH-${sequence}` }),
    candidate: Object.freeze({
      outcome: 'ADVANCED',
      transactionIds: Object.freeze([`TXN-${sequence}`]),
    }),
  });
}

function fixture(options = {}) {
  const dom = rootFixture();
  const model = {
    session: options.session || {
      state: 'READY', currentDecisionRequest: null, undoStack: [], redoStack: [],
    },
  };
  let prepareCount = 0;
  let acceptCount = 0;
  let nowCount = 0;
  const preparedInputs = [];
  const gateway = {
    getState: () => Object.freeze({
      ready: options.ready !== false,
      branchId: options.branchId || '/BRANCH/A',
      reasonCode: options.ready === false ? 'JOURNAL_NOT_ADOPTED' : null,
    }),
    prepare: (input) => {
      prepareCount += 1;
      preparedInputs.push(input);
      return prepared(input, prepareCount);
    },
    accept: (value) => {
      acceptCount += 1;
      if (options.rejectAcceptance) {
        return Object.freeze({ accepted: false, reasonCode: 'PREPARED_COMMAND_STALE', message: 'Prepared command is stale.' });
      }
      return Object.freeze({ accepted: true, preparedId: value.preparedId, message: 'Accepted.' });
    },
  };
  const panel = createSequentialDraftEditCommandPanel({
    root: dom.root,
    gateway,
    readCurrentState: () => model,
    now: () => { nowCount += 1; return ISSUED_AT; },
  });
  return Object.freeze({
    ...dom, model, gateway, panel, preparedInputs,
    prepareCount: () => prepareCount,
    acceptCount: () => acceptCount,
    nowCount: () => nowCount,
  });
}

function commandButton(test, commandType) {
  return test.elements.commands.find((button) => button.dataset.sskDraftEditCommand === commandType);
}

{
  const test = fixture();
  assert.equal(test.panel.getState().active, false);
  assert.equal(test.elements.panel.hidden, true);
  assert.equal(test.elements.panel.attributes.get('inert'), '');
  assert(test.elements.commands.every((button) => button.disabled));
  test.panel.setActive(true);
  assert.equal(test.elements.panel.hidden, false);
  assert.equal(commandButton(test, 'ADVANCE_ONE').disabled, false);
  assert.equal(commandButton(test, 'RUN_UNTIL_BLOCKED').disabled, false);
  assert.equal(commandButton(test, 'DEFER_DECISION').disabled, true);
}

{
  const test = fixture();
  test.panel.setActive(true);
  assert.throws(() => test.panel.prepare('ADVANCE_ONE'), /Operator actor ID is required/);
  assert.equal(test.prepareCount(), 0);
  test.elements.actor.value = 'operator-17';
  const preparedCommand = test.panel.prepare('ADVANCE_ONE');
  assert.equal(test.prepareCount(), 1);
  assert.equal(test.acceptCount(), 0, 'prepare must not publish authority');
  assert.equal(test.nowCount(), 1, 'issuedAt must be created once at explicit preparation');
  assert.equal(preparedCommand.envelope.origin.issuedAt, ISSUED_AT);
  assert.match(test.elements.preview.textContent, /Command: ADVANCE_ONE/);
  assert.match(test.elements.preview.textContent, /Prepared ID: SPREP-1/);
  assert(test.elements.commands.every((button) => button.disabled));
  assert.equal(test.elements.accept.disabled, false);
}

{
  const session = {
    state: 'USER_DECISION_REQUIRED',
    currentDecisionRequest: { state: 'OPEN' },
    undoStack: [], redoStack: [],
  };
  const test = fixture({ session });
  test.panel.setActive(true);
  test.elements.actor.value = 'reviewer';
  assert.equal(commandButton(test, 'DEFER_DECISION').disabled, false);
  assert.throws(() => test.panel.prepare('DEFER_DECISION'), /requires an operator reason/);
  test.elements.reason.value = 'Need field verification';
  assert.throws(() => test.panel.prepare('DEFER_DECISION'), /requires an evidence note/);
  test.elements.evidence.value = 'Source branch evidence is incomplete.';
  test.panel.prepare('DEFER_DECISION');
  assert.deepEqual(test.preparedInputs[0].command.payload, {
    reason: 'Need field verification',
    evidenceNote: 'Source branch evidence is incomplete.',
  });
}

{
  const test = fixture();
  test.panel.setActive(true);
  test.elements.actor.value = 'operator';
  const before = JSON.stringify(test.model);
  test.panel.prepare('ADVANCE_ONE');
  const cancelled = test.panel.cancel();
  assert.equal(cancelled.preparedId, 'SPREP-1');
  assert.equal(test.acceptCount(), 0);
  assert.equal(JSON.stringify(test.model), before, 'cancellation must not mutate authority');
  assert.equal(test.panel.getState().pendingPreparedId, null);
}

{
  const test = fixture();
  test.panel.setActive(true);
  test.elements.actor.value = 'operator';
  test.panel.prepare('ADVANCE_ONE');
  const acceptance = test.panel.accept();
  assert.equal(acceptance.accepted, true);
  assert.equal(test.acceptCount(), 1);
  assert.equal(test.panel.getState().pendingPreparedId, null);
  assert.match(test.elements.status.textContent, /accepted and published/i);
}

{
  const test = fixture();
  test.panel.setActive(true);
  test.elements.actor.value = 'operator';
  test.panel.prepare('ADVANCE_ONE');
  test.panel.refresh({ invalidatePending: true });
  assert.equal(test.panel.getState().pendingPreparedId, null);
  assert.equal(test.acceptCount(), 0);
  assert.match(test.elements.status.textContent, /invalidated/i);
}

{
  const test = fixture();
  test.panel.setActive(true);
  test.elements.actor.value = 'operator';
  test.panel.prepare('ADVANCE_ONE');
  test.panel.setActive(false);
  assert.equal(test.elements.panel.hidden, true);
  assert.equal(test.panel.getState().pendingPreparedId, null);
  assert.equal(test.acceptCount(), 0);
}

{
  const test = fixture({ rejectAcceptance: true });
  test.panel.setActive(true);
  test.elements.actor.value = 'operator';
  test.panel.prepare('ADVANCE_ONE');
  const acceptance = test.panel.accept();
  assert.equal(acceptance.accepted, false);
  assert.match(test.elements.status.textContent, /PREPARED_COMMAND_STALE/);
  assert.doesNotMatch(test.elements.status.textContent, /accepted and published/i);
}

{
  const test = fixture({ ready: false });
  test.panel.setActive(true);
  assert(test.elements.commands.every((button) => button.disabled));
  assert.match(test.elements.status.textContent, /JOURNAL_NOT_ADOPTED/);
}

{
  const test = fixture({ session: {
    state: 'READY', currentDecisionRequest: null,
    undoStack: [{ transactionId: 'TXN-1' }], redoStack: [{ transactionId: 'TXN-2' }],
  } });
  test.panel.setActive(true);
  assert.equal(commandButton(test, 'UNDO_LAST_TRANSACTION').disabled, false);
  assert.equal(commandButton(test, 'REDO_LAST_TRANSACTION').disabled, false);
  test.panel.destroy();
  assert.equal(test.panel.getState().destroyed, true);
  assert.equal(test.elements.panel.hidden, true);
  assert.equal(test.listeners.has('click'), false);
}

console.log('Sequential SSK-TS-3B supervised Draft Edit command panel: ok');
