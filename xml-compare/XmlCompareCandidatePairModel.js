// Manual-anchor candidate pairs (2.2/2.3): given a user-selected base anchor pair, for EACH source node
// find the nearest target node under the anchor translation transform, score text similarity, and flag
// validity (valid | review | conflict). No automatic anchor search — the anchor is user-chosen.
import { anchorPoint, applyAnchorOffset, createAnchorOffset } from './XmlCompareAnchorTransform.js';
import { extractNumeric, extractToken, readFieldValue, textMatchPercent } from './XmlCompareFieldExtractor.js';

export const XML_COMPARE_CANDIDATE_PAIR_MODEL_SCHEMA = 'xml-compare-candidate-pair-model/v1';

const clean = (value) => String(value ?? '').trim();
function label(record = {}) {
  return clean(readFieldValue(record, 'displayName') || record.nodeName || record.nodeNumber || record.elementKey || record.uid);
}
function distance(a = null, b = null) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}
function byUid(records = []) {
  const map = new Map();
  for (const record of records || []) { const uid = clean(record.uid); if (uid && !map.has(uid)) map.set(uid, record); }
  return map;
}
// A physical node may appear as several role-split records (FROM of one element, TO of the next). Collapse
// them to one record per node so candidate pairing is per-node (and doesn't invent duplicate-target conflicts).
function physicalKey(record = {}) {
  return clean(record.stableKey) || (clean(record.nodeNumber) ? `${clean(record.lineNo || record.branchName)}::${clean(record.nodeNumber)}` : clean(record.uid));
}
function dedupeByNode(records = [], preferUids = new Set()) {
  const byKey = new Map();
  for (const record of records || []) {
    const key = physicalKey(record);
    if (!key) continue;
    if (!byKey.has(key) || preferUids.has(clean(record.uid))) byKey.set(key, record);
  }
  return [...byKey.values()];
}
function alignedTargets(targetRecords = [], offset = null) {
  return (targetRecords || []).map((record) => ({ record, point: applyAnchorOffset(anchorPoint(record), offset) })).filter((item) => item.point);
}
function nearest(sourcePoint, targets) {
  let best = null;
  for (const item of targets) {
    const deltaMm = distance(sourcePoint, item.point);
    if (!best || deltaMm < best.deltaMm) best = { record: item.record, deltaMm };
  }
  return best;
}
function statusFor({ isAnchor, deltaMm, matchPct, toleranceMm, textMatchThreshold, hasTarget, mode }) {
  if (isAnchor) return 'valid';
  if (!hasTarget) return 'no-target';
  const numericValid = Number.isFinite(deltaMm) && deltaMm <= toleranceMm;
  const textValid = matchPct >= textMatchThreshold;
  if (mode === 'numeric') return numericValid ? 'valid' : 'review';
  if (mode === 'text') return textValid ? 'valid' : 'review';
  return numericValid || textValid ? 'valid' : 'review';
}
function methodFor({ mode, numericField, deltaMm, toleranceMm, matchPct, textMatchThreshold }) {
  if (mode === 'text') return 'text';
  if (mode === 'numeric') return numericField ? 'numeric-regex' : 'coordinate';
  if (Number.isFinite(deltaMm) && deltaMm <= toleranceMm) return numericField ? 'numeric-regex' : 'coordinate';
  if (matchPct >= textMatchThreshold) return 'text';
  return numericField ? 'numeric-regex' : 'coordinate';
}
function sourcePointFor(record, numericField, numericOptions) {
  if (!numericField) return anchorPoint(record);
  const value = extractNumeric(record, numericField, numericOptions);
  return value == null ? null : Object.freeze({ x: value, y: 0, z: 0 });
}
// PS basis (AIM 2): the comparable node-name key, optionally the delimiter token at a 1-based position.
function nameKeyOf(record = {}, nameField = 'nodeName', nameDelimiter = '', namePosition = 0) {
  const raw = clean(readFieldValue(record, nameField) ?? record.nodeName ?? record.nodeNumber);
  if (!raw) return '';
  const key = nameDelimiter && namePosition ? extractToken(raw, { delimiter: nameDelimiter, position: namePosition, stripLeadingSlash: false, stripTrailingBranch: false }) : raw;
  return clean(key).toUpperCase();
}
function pairRow(source, target, { deltaMm, matchPct, status, isAnchor, method }) {
  return {
    id: `candidate:${clean(source.uid)}=>${clean(target?.uid)}`,
    sourceUid: clean(source.uid), targetUid: clean(target?.uid),
    sourceStableKey: clean(source.stableKey || source.uid), targetStableKey: clean(target?.stableKey || target?.uid),
    sourceLabel: label(source), targetLabel: target ? label(target) : '',
    method, deltaMm: Number.isFinite(deltaMm) ? deltaMm : null, matchPct, status, isAnchor,
  };
}

export function createXmlCompareCandidatePairs({
  sourceRecords = [], targetRecords = [], anchor = null, toleranceMm = 6,
  textField = 'displayName', textMatchThreshold = 0.6, textOptions = {},
  numericField = null, numericOptions = {}, mode = 'both',
  basis = 'coordinate', nameField = 'nodeName', nameDelimiter = '', namePosition = 0,
} = {}) {
  const anchorSource = anchor ? byUid(sourceRecords).get(clean(anchor.sourceUid)) : null;
  const anchorTarget = anchor ? byUid(targetRecords).get(clean(anchor.targetUid)) : null;
  const offset = createAnchorOffset({ sourceAnchor: anchorSource, targetAnchor: anchorTarget });
  const sourceNodes = dedupeByNode(sourceRecords, new Set([clean(anchor?.sourceUid)]));
  const targetNodes = dedupeByNode(targetRecords, new Set([clean(anchor?.targetUid)]));

  let rows;
  if (basis === 'name') {
    const targetByName = new Map();
    for (const record of targetNodes) { const key = nameKeyOf(record, nameField, nameDelimiter, namePosition); if (key && !targetByName.has(key)) targetByName.set(key, record); }
    rows = sourceNodes.map((source) => {
      const key = nameKeyOf(source, nameField, nameDelimiter, namePosition);
      const target = key ? targetByName.get(key) || null : null;
      return pairRow(source, target, { deltaMm: null, matchPct: target ? 1 : 0, status: target ? 'valid' : 'no-target', isAnchor: false, method: 'name' });
    });
  } else {
    const targets = numericField
      ? targetNodes.map((record) => ({ record, point: sourcePointFor(record, numericField, numericOptions) })).filter((item) => item.point)
      : alignedTargets(targetNodes, offset);
    rows = sourceNodes.map((source) => {
      const isAnchor = Boolean(anchor && clean(source.uid) === clean(anchor.sourceUid));
      const sourcePoint = sourcePointFor(source, numericField, numericOptions);
      const best = sourcePoint ? nearest(sourcePoint, targets) : null;
      const target = isAnchor && anchorTarget ? anchorTarget : best?.record || null;
      const deltaMm = isAnchor ? 0 : (best ? best.deltaMm : Number.POSITIVE_INFINITY);
      const matchPct = target ? textMatchPercent(readFieldValue(source, textField), readFieldValue(target, textField), textOptions) : 0;
      const status = statusFor({ isAnchor, deltaMm, matchPct, toleranceMm, textMatchThreshold, hasTarget: Boolean(target), mode });
      return pairRow(source, target, { deltaMm, matchPct, status, isAnchor, method: methodFor({ mode, numericField, deltaMm, toleranceMm, matchPct, textMatchThreshold }) });
    });
  }

  markConflicts(rows);
  return Object.freeze({ schema: XML_COMPARE_CANDIDATE_PAIR_MODEL_SCHEMA, anchor: anchor || null, offset, basis, mode, toleranceMm, textMatchThreshold, pairs: Object.freeze(rows.map(Object.freeze)), summary: summarize(rows) });
}

// A target claimed by more than one non-anchor source is a conflict for those pairs.
function markConflicts(rows = []) {
  const claims = new Map();
  for (const row of rows) { if (!row.targetUid || row.isAnchor) continue; claims.set(row.targetUid, (claims.get(row.targetUid) || 0) + 1); }
  for (const row of rows) if (!row.isAnchor && row.targetUid && claims.get(row.targetUid) > 1) row.status = 'conflict';
}
function summarize(rows = []) {
  const by = (status) => rows.filter((row) => row.status === status).length;
  return Object.freeze({ pairCount: rows.length, validCount: by('valid'), reviewCount: by('review'), conflictCount: by('conflict'), noTargetCount: by('no-target') });
}

export const _test = Object.freeze({ clean, label, distance, nearest, statusFor, markConflicts, summarize, physicalKey, dedupeByNode, nameKeyOf });
