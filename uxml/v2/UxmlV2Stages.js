/**
 * UXML v2 stage registry (UXML revamp). Stages are pure: run(doc, inputs, settings) -> {ops, diagnostics};
 * the kernel's runStage enforces locks, declared layers and determinism, and seals the revision.
 *
 * Step 1 ships the `repair` placeholder (Lane A; TopoFix is not integrated yet) and two TEST-ONLY
 * stages used by the round-trip checks: set one value, and split one node.
 */
import {stageUid, makeValue} from './UxmlV2Kernel.js';

/** Lane A placeholder: same document, empty delta, diagnostic TOPOFIX_NOT_INTEGRATED. */
export const repairPlaceholderStage = Object.freeze({
  id: 'repair', rulesVersion: 'repair-placeholder/1', reads: ['topology'], writes: [],
  run: () => ({ops: [], diagnostics: [{code: 'TOPOFIX_NOT_INTEGRATED',
    message: 'TopoFix repair is a placeholder in the UXML route; nothing was changed.'}]}),
});

/** Stages in pipeline order (later steps add supports, engineering, transfer). */
export const STAGE_REGISTRY = Object.freeze([repairPlaceholderStage]);

/** TEST ONLY: set one value. inputs {uid, key, v, src?, layer?}. */
export const setValueTestStage = Object.freeze({
  id: 'test-set-value', rulesVersion: 'test/1', reads: [], writes: ['engineering', 'names', 'topology', 'supports', 'other'],
  run: (doc, {uid, key, v, src = 'owner'}) => ({ops: [{op: 'set', uid, path: 'values.' + key, after: makeValue(v, src, {rule: 'test-set'})}]}),
});

const positionOf = c => String(c?.values?.Position?.v ?? '').trim().split(/\s+/).map(Number);
/**
 * TEST ONLY: split node `uid` — a new node right after it, at the midpoint to the next node,
 * with a new NodeNumber; every other value copied from the source node (src 'stage').
 */
export const splitNodeTestStage = Object.freeze({
  id: 'test-split-node', rulesVersion: 'test/1', reads: ['topology'], writes: ['topology'],
  run: (doc, {uid}) => {
    for (const p of doc.pipelines) {
      const i = p.components.findIndex(c => c.uid === uid);
      if (i < 0) continue;
      const comp = p.components[i];
      const next = p.components[i + 1];
      const a = positionOf(comp), b = positionOf(next);
      const mid = a.length === 3 && b.length === 3 && [...a, ...b].every(Number.isFinite)
        ? a.map((x, k) => ((x + b[k]) / 2).toFixed(2)).join(' ') : comp.values.Position?.v;
      const maxNumber = Math.max(0, ...p.components.map(c => Number(c.values.NodeNumber?.v) || 0));
      const values = {};
      for (const [key, value] of Object.entries(comp.values)) values[key] = makeValue(value.v, 'stage', {text: value.text, rule: 'split-copy'});
      if (values.Position) values.Position = makeValue(mid, 'stage', {rule: 'split-midpoint'});
      if (values.NodeNumber) values.NodeNumber = makeValue(maxNumber + 1, 'stage', {rule: 'split-new-number'});
      const newUid = stageUid(doc.revision.id, 'test-split-node', 'split', [comp.uid], 0);
      return {ops: [{op: 'split', uid: newUid, parent: p.uid, after: comp.uid, kind: 'component', entity: {
        kind: 'component', sourceKey: comp.sourceKey + '+split',
        lineage: {op: 'split', from: [comp.uid], stage: 'test-split-node', rule: 'split'},
        fieldOrder: [...comp.fieldOrder], values, restraints: [],
      }}]};
    }
    return {ops: [], diagnostics: [{code: 'UXML_UID_UNKNOWN', uid}]};
  },
});
