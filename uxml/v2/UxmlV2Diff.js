/**
 * UXML v2 revision diff (UXML revamp step 2): what changed between two revisions of one model,
 * by which stage and rule, and from which source. Pure; works on any two revisions of the same
 * read (a stage result, an undo, or a delta opened from a file), not only parent and child.
 *
 * diffRevisions(before, after) -> {before, after, changes[], counts}
 *   change: {type, uid, kind, pipeline, node, key, layer, before, after, src, rule, stage, lock,
 *            from (source uids), fromLabels (their node numbers or names)}
 *   type:   'set' (value changed; key 'frame' = a restraint's direction frame) | 'add-value' | 'remove-value' | 'lock' | 'unlock'
 *           | 'add' | 'split' | 'remove' (whole node or restraint)
 * The `rev` stamp alone is not a change; a value counts as changed when v, text, unit, src,
 * rule or lock differ.
 */
import {walkEntities, layerOf, entityLayer, canonicalJson} from './UxmlV2Kernel.js';

const LABEL_KEYS = Object.freeze({pipeline: ['Branchname'], component: ['NodeNumber', 'NodeName'], restraint: ['Type', 'RestraintType']});

/** Short human label of an entity: its name or number, else its source key. */
export function entityLabel(entity, kind) {
  for (const key of LABEL_KEYS[kind] || []) {
    const v = entity?.values?.[key]?.v;
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return String(entity?.sourceKey ?? entity?.uid ?? '');
}

const withoutRev = value => {
  if (!value) return null;
  const copy = {...value};
  delete copy.rev;
  return copy;
};
const sameValue = (a, b) => canonicalJson(withoutRev(a)) === canonicalJson(withoutRev(b));
const sameLock = (a, b) => canonicalJson(a?.lock ?? null) === canonicalJson(b?.lock ?? null);
const shown = value => (value == null ? null : (value.text ?? (value.v == null ? null : String(value.v))));

/** uid -> {entity, kind, pipeline label, node label} for one revision. */
function placeIndex(doc) {
  const map = new Map();
  for (const {entity, kind, parent} of walkEntities(doc)) {
    const pipeline = kind === 'pipeline' ? entity : kind === 'component' ? parent : null;
    map.set(entity.uid, {entity, kind, parentUid: parent?.uid ?? null, pipelineUid: pipeline?.uid ?? null});
  }
  for (const place of map.values()) {
    if (place.kind === 'restraint') place.pipelineUid = map.get(place.parentUid)?.pipelineUid ?? null;
  }
  return map;
}

function where(place, index) {
  const pipe = index.get(place.pipelineUid);
  const node = place.kind === 'component' ? place : place.kind === 'restraint' ? index.get(place.parentUid) : null;
  return {
    pipeline: pipe ? entityLabel(pipe.entity, 'pipeline') : '',
    node: node ? entityLabel(node.entity, 'component') : '',
  };
}

function valueChanges(uid, oldPlace, newPlace, index, stage) {
  const out = [];
  const a = oldPlace.entity.values || {};
  const b = newPlace.entity.values || {};
  const keys = [...new Set([...(oldPlace.entity.fieldOrder || []), ...(newPlace.entity.fieldOrder || []),
    ...Object.keys(a), ...Object.keys(b)])];
  for (const key of keys) {
    const before = a[key] ?? null;
    const after = b[key] ?? null;
    if (sameValue(before, after)) continue;
    const base = {uid, kind: newPlace.kind, ...where(newPlace, index), key, layer: layerOf(newPlace.kind, key),
      before: shown(before), after: shown(after), stage};
    const valueMoved = canonicalJson({...withoutRev(before), lock: null}) !== canonicalJson({...withoutRev(after), lock: null});
    if (valueMoved) {
      const type = before == null ? 'add-value' : after == null ? 'remove-value' : 'set';
      out.push({...base, type, src: (after ?? before).src ?? '', rule: (after ?? before).rule ?? '', lock: after?.lock ?? null});
    }
    if (!sameLock(before, after)) {
      out.push({...base, type: after?.lock ? 'lock' : 'unlock', src: after?.lock?.by ?? before?.lock?.by ?? '',
        rule: '', lock: after?.lock ?? null});
    }
  }
  const frameBefore = oldPlace.entity.frame ?? null;
  const frameAfter = newPlace.entity.frame ?? null;
  if (frameBefore !== frameAfter) {
    out.push({uid, kind: newPlace.kind, ...where(newPlace, index), key: 'frame', layer: 'supports',
      before: frameBefore, after: frameAfter, stage, type: 'set', src: 'stage', rule: '', lock: null});
  }
  return out;
}

function entityChange(type, uid, place, index, stage, oldIndex = index) {
  const lineage = place.entity.lineage || null;
  const fromLabels = (lineage?.from ?? []).map(u => {
    const source = oldIndex.get(u) || index.get(u);
    return source ? entityLabel(source.entity, source.kind) : u;
  });
  return {
    fromLabels,
    type, uid, kind: place.kind, ...where(place, index), key: '', layer: entityLayer(place.kind),
    before: type === 'remove' ? entityLabel(place.entity, place.kind) : null,
    after: type === 'remove' ? null : entityLabel(place.entity, place.kind),
    src: type === 'remove' ? '' : 'stage', rule: lineage?.rule ?? '', stage: lineage?.stage ?? stage,
    lock: null, from: lineage?.from ?? [],
  };
}

/** Every change from `before` to `after`, in the document order of `after` (removals last). */
export function diffRevisions(before, after) {
  const oldIndex = placeIndex(before);
  const newIndex = placeIndex(after);
  const stage = after.revision?.stage ?? '';
  const changes = [];
  for (const [uid, place] of newIndex) {
    const old = oldIndex.get(uid);
    if (!old) changes.push(entityChange(place.entity.lineage?.op === 'split' ? 'split' : 'add', uid, place, newIndex, stage, oldIndex));
    else changes.push(...valueChanges(uid, old, place, newIndex, stage));
  }
  for (const [uid, place] of oldIndex) {
    if (!newIndex.has(uid)) changes.push(entityChange('remove', uid, place, oldIndex, stage));
  }
  const counts = {};
  for (const c of changes) counts[c.type] = (counts[c.type] || 0) + 1;
  return {
    before: {id: before.revision?.id, seq: before.revision?.seq, stage: before.revision?.stage},
    after: {id: after.revision?.id, seq: after.revision?.seq, stage},
    changes, counts,
  };
}

/** Changes grouped by branch, then node: [{pipeline, nodes:[{node, changes[]}]}], in order. */
export function groupChanges(changes) {
  const pipes = new Map();
  for (const c of changes) {
    if (!pipes.has(c.pipeline)) pipes.set(c.pipeline, new Map());
    const nodes = pipes.get(c.pipeline);
    if (!nodes.has(c.node)) nodes.set(c.node, []);
    nodes.get(c.node).push(c);
  }
  return [...pipes].map(([pipeline, nodes]) => ({pipeline, nodes: [...nodes].map(([node, list]) => ({node, changes: list}))}));
}
