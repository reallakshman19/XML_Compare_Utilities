import { require } from '../kit/core.mjs';

// Keep each complete closure record on every affected pair. If no affected
// pair exists, preserve that record as map-wide evidence on the first pair.
export function addLoopNotes(pairs, notes) {
  const byPair = new Map();
  for (const note of notes) {
    const { side, closure } = note;
    require(['source', 'target'].includes(side) && Array.isArray(closure?.nodeIds) && closure.nodeIds.length > 0 &&
      Array.isArray(closure.elementIndices) && closure.elementIndices.length > 0,
    'MAP_EXPORT_INVALID', 'loop closures', 'closure membership is missing');
    const nodes = new Set(closure.nodeIds), elements = new Set(closure.elementIndices);
    const affected = pairs.filter(p => {
      const ref = p[side];
      return ref.kind === 'cii-node' ? nodes.has(ref.node) : ref.kind === 'cii' && elements.has(ref.elementIndex);
    });
    require(pairs.length > 0, 'MAP_EXPORT_INVALID', 'loop closures', 'no pair can carry the loop closure review notes');
    for (const p of affected.length ? affected : [pairs[0]]) {
      if (!byPair.has(p)) byPair.set(p, []);
      byPair.get(p).push(note);
    }
  }
  for (const [p, records] of byPair) p.evidence.detail += '\nMap-wide loop closure review notes (Owner limit ±6 mm): ' + JSON.stringify(records);
}
