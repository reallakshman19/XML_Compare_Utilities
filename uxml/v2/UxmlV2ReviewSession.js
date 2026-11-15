/**
 * UXML v2 review session (UXML revamp step 2): the list of revisions the review page shows.
 * Pure: every action returns a new session; nothing touches the DOM.
 *
 * session = {name, revisions: [{doc, delta, diagnostics, refusals}]}; revisions[0] is the read.
 * Actions: runRepair, setValue, splitNode, undoLast, openDelta.
 */
import {sha256Hex, runStage, applyDelta, undoDelta, UxmlRefusal} from './UxmlV2Kernel.js';
import {readPsi116V2} from './UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from './UxmlV2Psi116Writer.js';
import {repairPlaceholderStage, setValueTestStage, splitNodeTestStage} from './UxmlV2Stages.js';

/** Plain-words text for diagnostic and refusal codes the page shows. */
export const MESSAGES = Object.freeze({
  TOPOFIX_NOT_INTEGRATED: 'Repair is not connected yet (TopoFix is not integrated), so it changed nothing.',
  UXML_LOCKED_VALUE: 'This value is locked, so the edit was not applied.',
  UXML_UID_UNKNOWN: 'That item is not in this revision.',
  UXML_DELTA_BASE_MISMATCH: 'This delta was made from a revision that is not open here.',
  UXML_DELTA_RESULT_MISMATCH: 'Applying this delta did not give the revision it claims; it was not applied.',
  NOTHING_TO_UNDO: 'Nothing to undo: the latest revision is the read or an undo.',
});

/** A new session from PS116 text. */
export function openPsi116(text, name = 'input.xml') {
  const doc = readPsi116V2(text, {fileSha256: sha256Hex(text)});
  return {name, revisions: [{doc, delta: null, diagnostics: [], refusals: []}]};
}

export const latest = session => session.revisions.at(-1);
const push = (session, step) => ({...session, revisions: [...session.revisions, step]});
const stageStep = ({uxml, delta, diagnostics, refusals}) => ({doc: uxml, delta, diagnostics, refusals});

/** Run the repair placeholder on the latest revision. */
export const runRepair = session => push(session, stageStep(runStage(repairPlaceholderStage, latest(session).doc)));

/** Owner edit of one value on the latest revision: {uid, key, v, lock}. */
export const setValue = (session, {uid, key, v, lock = false}) =>
  push(session, stageStep(runStage(setValueTestStage, latest(session).doc, {uid, key, v, src: 'owner', lock})));

/** Split one node of the latest revision (a new node after it, at the midpoint). */
export const splitNode = (session, {uid}) => push(session, stageStep(runStage(splitNodeTestStage, latest(session).doc, {uid})));

/**
 * Undo the latest stage result: a new revision whose content equals the one before it.
 * One level only: an undo itself is not undone (that would re-apply the step).
 */
export function undoLast(session) {
  const last = latest(session);
  if (!last.delta || last.doc.revision.stage === 'undo') throw new UxmlRefusal('NOTHING_TO_UNDO');
  const {uxml, delta} = undoDelta(last.doc, last.delta);
  return push(session, {doc: uxml, delta, diagnostics: [], refusals: []});
}

/** Apply a delta (parsed JSON) to the open revision it names as its base. */
export function openDelta(session, delta) {
  const base = session.revisions.find(r => r.doc.revision.id === delta?.base);
  if (!base) throw new UxmlRefusal('UXML_DELTA_BASE_MISMATCH', {base: delta?.base});
  return push(session, {doc: applyDelta(base.doc, delta), delta, diagnostics: [], refusals: []});
}

/** PS116 text of one revision. */
export const psi116Of = step => writePsi116FromUxmlV2(step.doc).text;

/** Plain-words line for a diagnostic or refusal. */
export const messageOf = item => MESSAGES[item?.code] || item?.message || String(item?.code || item);
