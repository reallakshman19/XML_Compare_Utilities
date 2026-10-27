import {GEOMETRY_SCENE_CONTRACT} from './geo-scene.js';

/** A pixel hit is navigation evidence, never a chosen correspondence. */
export function resolveGeometryPick(scene, pick, currentBinding) {
  if (scene?.contract !== GEOMETRY_SCENE_CONTRACT || !currentBinding || scene.binding !== currentBinding)
    throw new Error('GEO_PICK_STALE_OR_INCOMPLETE');
  if (pick === null) return null;
  const object = Object.hasOwn(scene.objects, pick?.objectId) ? scene.objects[pick.objectId] : null;
  if (!object) throw new Error('GEO_PICK_UNKNOWN_IDENTITY');
  const side = object.side.toLowerCase();
  if (![side, scene.models[side].modelId].includes(pick.modelId) ||
      (pick.nodeId != null && String(pick.nodeId) !== object.nodeId))
    throw new Error('GEO_PICK_IDENTITY_MISMATCH');
  return object; // Frozen data preserves every sourceRows link, including target reuse.
}
