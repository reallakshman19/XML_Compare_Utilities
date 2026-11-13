import { require } from '../kit/core.mjs';
import { RULES } from './compare.mjs';
import { validateMap } from './map-validation.mjs';
import { addLoopNotes } from './loop-notes.mjs';

const ref = (kind, value) => kind === 'node' ? { kind: 'cii-node', node: value } : {
  kind: 'cii', elementIndex: value.elementIndex, fromNode: value.fromNode, toNode: value.toNode
};

/** File descriptors are taken from the graphs read from the actual input bytes. */
export function toMapFile(compareResult, { sourceFile, targetFile, method = 'geometry-pair', createdAt = new Date().toISOString() } = {}) {
  const r = compareResult;
  require(r && Array.isArray(r.pairs) && r.loopClosures && Array.isArray(r.loopClosures.a) && Array.isArray(r.loopClosures.b),
    'MAP_EXPORT_INVALID', 'compare', 'a complete comparison is needed');
  const file = (input, expected) => {
    require(input && expected && input.sha256 === expected.sha256 && input.fileName && typeof input.fileName === 'string',
      'MAP_EXPORT_INVALID', 'file', 'file descriptor must match the compared graph');
    return { kind: 'cii', fileName: input.fileName, sha256: input.sha256 };
  };
  const source = file(sourceFile, r.inputs?.a), target = file(targetFile, r.inputs?.b);
  const pairs = r.pairs.map((p, i) => {
    require(p && ['node', 'element'].includes(p.kind) && p.a != null && p.b != null && RULES.includes(p.rule) &&
      Number.isFinite(p.distanceMm) && p.distanceMm >= 0, 'MAP_EXPORT_INVALID', 'pair ' + i, 'missing ref, rule or residual');
    return { pairId: 'pair-' + (i + 1), source: ref(p.kind, p.a), target: ref(p.kind, p.b), status: 'candidate',
      evidence: { rule: p.rule, detail: `Residual: ${p.distanceMm} mm` } };
  });
  const notes = [...r.loopClosures.a.map(c => ({ side: 'source', closure: c })), ...r.loopClosures.b.map(c => ({ side: 'target', closure: c }))];
  addLoopNotes(pairs, notes);
  return validateMap({ format: 'topofix.map', version: 1, createdAt, source, target, method, pairs });
}
