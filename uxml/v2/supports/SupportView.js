/**
 * Support view (UXML step 3): a plain, mutable-free picture of a UXML v2 document that the
 * support sub-stages read and return, the way today's code reads and edits the XML DOM.
 *
 * viewOf(doc) -> {nodes: [ViewNode]}
 *   ViewNode = {uid, sourceKey, branch, nodeIndex, values: {tag: text}, prov: {tag: {src, rule}},
 *               restraints: [{uid|null, fields: {tag: text}, src, rule}]}
 *   `values` holds every leaf of the node as text (repeats joined ' | ', as in the support table).
 * tableOfView(view) -> the support table (same shape as supportTableOf).
 * opsFromView(doc, view) -> kernel ops that turn `doc` into the view:
 *   node values: only the supports keys (DTXR_*, CMPSUPGAP*) may change; any other change refuses;
 *   restraints: index i keeps its uid (set per changed field, frame set when cosines appear),
 *   extra ones are added after the last, surplus ones are removed.
 */
import {stageUid, makeValue, layerOf, UxmlRefusal} from '../UxmlV2Kernel.js';
import {parseLiteral} from '../UxmlV2Psi116Reader.js';
import {SUPPORT_FIELD, leafTexts, valueText} from './SupportTable.js';

const STAGE = 'supports';
const escapeXml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hasCosines = fields => Object.keys(fields).some(k => /^DirectionCosine[XYZ]$/.test(k));

/** A stage-written value from display text: v parsed like the reader, text kept for the writer. */
export function supportValue(text, src, rule) {
  const literal = escapeXml(text);
  return makeValue(parseLiteral(literal), src, {text: literal, rule});
}

export function viewOf(doc) {
  const nodes = (doc.pipelines || []).flatMap(p => (p.components || []).map((c, nodeIndex) => Object.freeze({
    uid: c.uid, sourceKey: c.sourceKey, branch: valueText(p.values?.Branchname), nodeIndex,
    values: Object.freeze(leafTexts(c)), prov: Object.freeze({}),
    restraints: Object.freeze((c.restraints || []).map(r => Object.freeze({
      uid: r.uid, fields: Object.freeze(leafTexts(r, {join: false})), src: 'psi116', rule: ''}))),
  })));
  return Object.freeze({nodes: Object.freeze(nodes)});
}

export function tableOfView(view) {
  return view.nodes.map(n => ({
    branch: n.branch, nodeIndex: n.nodeIndex,
    NodeNumber: n.values.NodeNumber ?? '', NodeName: n.values.NodeName ?? '', ComponentType: n.values.ComponentType ?? '',
    support: Object.fromEntries(Object.entries(n.values).filter(([tag]) => SUPPORT_FIELD.test(tag))),
    restraints: n.restraints.map(r => ({...r.fields})),
  }));
}

function nodeValueOps(component, node) {
  const before = leafTexts(component);
  const ops = [];
  for (const tag of new Set([...Object.keys(before), ...Object.keys(node.values)])) {
    if (before[tag] === node.values[tag]) continue;
    if (layerOf('component', tag) !== 'supports') {
      throw new UxmlRefusal('UXML_SUPPORTS_NON_SUPPORT_WRITE', {uid: node.uid, key: tag});
    }
    const p = node.prov[tag] || {src: 'supportMapper', rule: ''};
    ops.push({op: 'set', uid: node.uid, path: 'values.' + tag,
      after: node.values[tag] === undefined ? null : supportValue(node.values[tag], p.src, p.rule)});
  }
  return ops;
}

function restraintFieldOps(entity, next) {
  const before = leafTexts(entity, {join: false});
  const ops = [];
  for (const tag of new Set([...Object.keys(before), ...Object.keys(next.fields)])) {
    if (before[tag] === next.fields[tag]) continue;
    ops.push({op: 'set', uid: entity.uid, path: 'values.' + tag,
      after: next.fields[tag] === undefined ? null : supportValue(next.fields[tag], next.src, next.rule)});
  }
  const wantFrame = hasCosines(next.fields) ? (entity.frame ?? 'CII_XYZ') : null;
  if ((entity.frame ?? null) !== wantFrame) ops.push({op: 'set', uid: entity.uid, path: 'frame', after: wantFrame});
  return ops;
}

function newRestraint(doc, component, next, ordinal, after) {
  const uid = stageUid(doc.revision.id, STAGE, next.rule || 'add', [component.uid], ordinal);
  const keys = Object.keys(next.fields);
  const entity = {
    kind: 'restraint', sourceKey: component.sourceKey + ':S' + ordinal,
    lineage: {op: 'add', from: [component.uid], stage: STAGE, rule: next.rule || ''},
    fieldOrder: keys, values: Object.fromEntries(keys.map(k => [k, supportValue(next.fields[k], next.src, next.rule)])),
    ...(hasCosines(next.fields) ? {frame: 'CII_XYZ'} : {}),
  };
  return {op: 'add', uid, parent: component.uid, after, kind: 'restraint', entity};
}

function restraintOps(doc, component, node) {
  const old = component.restraints || [];
  const ops = [];
  node.restraints.forEach((next, i) => {
    if (i < old.length) ops.push(...restraintFieldOps(old[i], next));
    else {
      const previous = ops.filter(o => o.op === 'add').at(-1)?.uid ?? old.at(-1)?.uid ?? null;
      ops.push(newRestraint(doc, component, next, i, previous));
    }
  });
  for (const r of old.slice(node.restraints.length)) ops.push({op: 'remove', uid: r.uid});
  return ops;
}

export function opsFromView(doc, view) {
  const byUid = new Map(view.nodes.map(n => [n.uid, n]));
  const ops = [];
  for (const p of doc.pipelines || []) {
    for (const c of p.components || []) {
      const node = byUid.get(c.uid);
      if (!node) throw new UxmlRefusal('UXML_SUPPORTS_VIEW_NODE_MISSING', {uid: c.uid});
      ops.push(...nodeValueOps(c, node), ...restraintOps(doc, c, node));
    }
  }
  return ops;
}
