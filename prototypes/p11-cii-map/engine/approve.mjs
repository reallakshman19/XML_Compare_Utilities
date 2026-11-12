import { require } from '../kit/core.mjs';
import { validateMap } from './map-validation.mjs';

function changeStatus(map, pairIds, status, { by, at } = {}) {
  validateMap(map);
  const ids = pairIds === 'all-exact' && status === 'approved'
    ? map.pairs.filter(p => p.evidence.rule === 'same-number-same-position' && p.status === 'candidate').map(p => p.pairId)
    : pairIds;
  require(Array.isArray(ids) && ids.every(id => typeof id === 'string'), 'MAP_EXPORT_INVALID', 'selection', 'select pair IDs');
  const selected = new Set(ids), known = new Set(map.pairs.map(p => p.pairId));
  require(ids.every(id => known.has(id)), 'MAP_EXPORT_INVALID', 'selection', 'a selected pair is not in this Map file');
  if (status === 'approved') require(typeof by === 'string' && by.trim() && typeof at === 'string' && at.trim(),
    'MAP_EXPORT_INVALID', 'approval', 'enter who approved and when');
  const next = structuredClone(map);
  for (const p of next.pairs) if (selected.has(p.pairId)) {
    p.status = status;
    if (status === 'approved') { p.approvedBy = by; p.approvedAt = at; }
    else { delete p.approvedBy; delete p.approvedAt; }
  }
  return validateMap(next); // atomic: original never changed, including on R10.
}
export const approvePairs = (map, pairIds, meta) => changeStatus(map, pairIds, 'approved', meta);
export const rejectPairs = (map, pairIds, meta) => changeStatus(map, pairIds, 'rejected', meta);
