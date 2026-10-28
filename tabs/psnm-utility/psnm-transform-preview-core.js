import { PSNM_transformNodeToPsPosition } from './psnm-match-engine.js';

export function PSNM_previewMasterTransformRows(context, limit = 300) {
  if (!context?.masterReady || !context?.transform) return [];
  return (context.masterRows || []).slice(0, limit).filter(row =>
    [row.x, row.y, row.z].every(Number.isFinite)).map(row => ({
    ...row,
    transformed: PSNM_transformNodeToPsPosition({ x: row.x, y: row.y, z: row.z },
      context.transform, Number(context.coordinateDecimals ?? 0)),
  }));
}
