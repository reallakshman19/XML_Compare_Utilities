/**
 * Section 5's plain refusal (Owner 18 Nov 2026, EF-05 recovery).
 *
 * The run under locks lets the supports and engineering stage change values only. On an XML that has
 * not been through step 10 (a raw model such as EF-05-PRO.TEST.xml) that stage still removes
 * duplicate nodes, adds restraints and adds tags, so the run refuses with
 * UXML_ENGINEERING_STRUCTURE_CHANGED. The transfer is post-processing (Owner 13 Nov): it belongs in
 * the Enriched XML step 10 writes, where the stage changes nothing structural.
 *
 * runUnderLocksOrExplain runs the locked stage as before. Only when it refuses for structure does it
 * run the stage once on the XML as opened (before the transfer). If that changes the structure too,
 * the refusal is the plain message below with the counts; otherwise the original refusal stands,
 * since then the transfer itself caused the change.
 */
import {sha256Hex} from '../UxmlV2Kernel.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';
import {withoutTransferNote} from './TransferNote.js';
import {runEngineeringUnderLocks} from './LockedEngineering.js';

export const NOT_THROUGH_STEP_10 = 'UXML_TRANSFER_TARGET_NOT_STEP10';

const tags = values => Object.keys(values || {}).sort().join('|');
const restraintCount = branch => branch.components.reduce((n, c) => n + c.restraints.length, 0);

/** What the stage changes in structure on `doc`: branch, node and restraint counts, and nodes whose value tags differ. */
export function structureChanges(doc, runText) {
  const outText = runText(withoutTransferNote(writePsi116FromUxmlV2(doc).text));
  const out = readPsi116V2(outText, {fileSha256: sha256Hex(outText)});
  const c = {branches: [doc.pipelines.length, out.pipelines.length], nodesRemoved: 0, nodesAdded: 0,
    restraintsAdded: 0, restraintsRemoved: 0, nodesWithOtherTags: 0};
  const n = Math.max(doc.pipelines.length, out.pipelines.length);
  for (let i = 0; i < n; i++) {
    const p = doc.pipelines[i], q = out.pipelines[i];
    const nodes = (q?.components.length ?? 0) - (p?.components.length ?? 0);
    const restraints = (q ? restraintCount(q) : 0) - (p ? restraintCount(p) : 0);
    if (nodes > 0) c.nodesAdded += nodes; else c.nodesRemoved -= nodes;
    if (restraints > 0) c.restraintsAdded += restraints; else c.restraintsRemoved -= restraints;
    if (p && q && nodes === 0) p.components.forEach((m, j) => { if (tags(m.values) !== tags(q.components[j].values)) c.nodesWithOtherTags++; });
  }
  c.any = c.branches[0] !== c.branches[1] || c.nodesRemoved + c.nodesAdded + c.restraintsAdded + c.restraintsRemoved + c.nodesWithOtherTags > 0;
  return c;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The message the page shows, in plain words. */
export function notThroughStep10Message(c) {
  const parts = [];
  if (c.branches[0] !== c.branches[1]) parts.push(`${c.branches[0]} branches become ${c.branches[1]}`);
  if (c.nodesRemoved) parts.push(plural(c.nodesRemoved, 'node') + ' removed');
  if (c.nodesAdded) parts.push(plural(c.nodesAdded, 'node') + ' added');
  if (c.restraintsAdded) parts.push(plural(c.restraintsAdded, 'restraint') + ' added');
  if (c.restraintsRemoved) parts.push(plural(c.restraintsRemoved, 'restraint') + ' removed');
  if (c.nodesWithOtherTags) parts.push(`tags added or removed on ${plural(c.nodesWithOtherTags, 'node')}`);
  return `This XML has not been through step 10: the supports step would still change its structure (${parts.join(', ')}). `
    + 'Run it through step 10 (the XML to CII tab) and transfer into the Enriched XML that step 10 writes. Nothing was transferred.';
}

/** runEngineeringUnderLocks, with the plain refusal for an XML that has not been through step 10. */
export function runUnderLocksOrExplain(transferDoc, openedDoc, runText) {
  try {
    return runEngineeringUnderLocks(transferDoc, runText);
  } catch (error) {
    if (error?.code !== 'UXML_ENGINEERING_STRUCTURE_CHANGED') throw error;
    const counts = structureChanges(openedDoc, runText);
    if (!counts.any) throw error;
    const plain = new Error(notThroughStep10Message(counts));
    plain.code = NOT_THROUGH_STEP_10;
    plain.counts = counts;
    plain.cause = error;
    throw plain;
  }
}
