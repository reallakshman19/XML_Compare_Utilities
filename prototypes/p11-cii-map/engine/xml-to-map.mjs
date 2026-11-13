import { require } from '../kit/core.mjs';
import { validateMap } from './map-validation.mjs';
import { addLoopNotes } from './loop-notes.mjs';

export function xmlMatchToMapFile(result, {xmlFile, ciiFile, createdAt = new Date().toISOString()} = {}) {
  require(Array.isArray(result?.nodePairs) && result.ok !== false, 'MAP_EXPORT_INVALID', 'match', 'complete XML match needed');
  const file = (kind, descriptor) => {
    require(descriptor && descriptor.sha256 === result.inputs?.[kind]?.sha256, 'MAP_EXPORT_INVALID', kind, 'descriptor must match input graph');
    return {kind, fileName: descriptor.fileName, sha256: descriptor.sha256};
  };
  const pairs = result.nodePairs.map(p => {
    require(Number.isFinite(p.distanceMm) && p.distanceMm >= 0 && ['same-run','same-position','nearest-within-tolerance'].includes(p.rule), 'MAP_EXPORT_INVALID', 'node pair', 'invalid distance or rule');
    return {pairId: 'xml-node-' + p.nodeOrdinal,
      source: {kind: 'xml', branchOrdinal: 0, branchName: '', nodeOrdinal: p.nodeOrdinal, nodeNumber: p.xml, componentRefNo: ''},
      target: {kind: 'cii-node', node: p.cii}, status: 'candidate', evidence: {rule: p.rule, detail: `${p.distanceMm} mm`}};
  });
  addLoopNotes(pairs, (result.loopClosures || []).map(closure => ({side: 'target', closure})));
  return validateMap({format: 'topofix.map', version: 1, createdAt, source: file('xml', xmlFile), target: file('cii', ciiFile), method: 'geometry-pair', pairs});
}
