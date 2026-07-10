function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function fmt(value, places = 3) { const n = Number(value); return Number.isFinite(n) ? Number(n.toFixed(places)) : 0; }
function splitFromTo(value) {
  const parts = text(value).split('->').map(text);
  return parts.length === 2 && parts[0] && parts[1] ? parts : ['', ''];
}
function nodeSort(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }); }
function addNode(map, sourceNode, targetNode, evidence = {}) {
  const s = text(sourceNode), t = text(targetNode);
  if (!s || !t) return;
  if (!map.has(s)) {
    map.set(s, { sourceNode: s, targetNode: t, hits: 0, conflicts: new Set(), basis: new Set(), minElementScore: Number.POSITIVE_INFINITY, maxElementScore: 0 });
  }
  const row = map.get(s);
  if (row.targetNode !== t) row.conflicts.add(t);
  row.hits += 1;
  for (const item of evidence.basis || []) row.basis.add(item);
  const score = Number(evidence.elementScore || evidence.score || 0);
  if (Number.isFinite(score)) {
    row.minElementScore = Math.min(row.minElementScore, score);
    row.maxElementScore = Math.max(row.maxElementScore, score);
  }
}

export function solveInputXmlNodeRemap({ elementMappings = [], frameSolution = null } = {}) {
  const map = new Map();
  for (const row of elementMappings || []) {
    const [refFrom, refTo] = splitFromTo(row.referenceFromTo);
    const [targetFrom, targetTo] = splitFromTo(row.targetFromTo);
    const basis = ['path-aligned-element', 'canonical-from-to'];
    if (frameSolution?.ok) basis.push(frameSolution.mode === 'TRANSLATION_ONLY' ? 'coordinate-frame' : 'relative-topology-frame');
    addNode(map, refFrom, targetFrom, { ...row, basis });
    addNode(map, refTo, targetTo, { ...row, basis });
  }
  const rows = [...map.values()].map((row) => {
    const confidence = row.conflicts.size ? 'CONFLICT' : row.hits >= 2 ? 'HIGH' : row.hits === 1 ? 'MEDIUM' : 'LOW';
    return Object.freeze({
      sourceNode: row.sourceNode,
      targetNode: row.targetNode,
      hits: row.hits,
      confidence,
      basis: [...row.basis].sort().join(';'),
      conflicts: [...row.conflicts].sort(nodeSort).join(';'),
      scoreRange: row.minElementScore === Number.POSITIVE_INFINITY ? '' : `${fmt(row.minElementScore, 1)}-${fmt(row.maxElementScore, 1)}`,
    });
  }).sort((a, b) => nodeSort(a.sourceNode, b.sourceNode));
  return Object.freeze({
    schema: 'CiiInputXmlNodeRemapLedger.v1',
    rows: Object.freeze(rows),
    summary: Object.freeze({
      mappedNodeCount: rows.length,
      highConfidenceNodeCount: rows.filter((row) => row.confidence === 'HIGH').length,
      mediumConfidenceNodeCount: rows.filter((row) => row.confidence === 'MEDIUM').length,
      conflictNodeCount: rows.filter((row) => row.confidence === 'CONFLICT').length,
    }),
  });
}
