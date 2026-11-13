import { validate } from '../vendor/validate.mjs';
import { refuse } from '../kit/core.mjs';

export function validateMap(map) {
  const errors = validate(map);
  if (errors.some(e => e.code === 'R10'))
    refuse('MAP_NOT_ONE_TO_ONE', 'pairs', errors.filter(e => e.code === 'R10').map(e => e.msg).join('; '));
  if (errors.length || map.format !== 'topofix.map')
    refuse('MAP_EXPORT_INVALID', 'map', errors.map(e => `${e.code}: ${e.msg}`).join('; ') || 'not a Map file');
  return map;
}
