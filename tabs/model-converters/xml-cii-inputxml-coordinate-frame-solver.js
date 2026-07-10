const DEFAULT_LENGTH_TOL_MM = 6;

function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function fmt(value, places = 3) { const n = Number(value); return Number.isFinite(n) ? Number(n.toFixed(places)) : 0; }
function vec(x = 0, y = 0, z = 0) { return Object.freeze({ x: fmt(x), y: fmt(y), z: fmt(z) }); }
function edgeKey(edge) { return edge?.normalizedFromTo || `${edge?.canonicalFrom || edge?.from || ''}->${edge?.canonicalTo || edge?.to || ''}`; }
function edgeLabel(edge) { return edge ? `${edge.elementId || ''} ${edgeKey(edge)}`.trim() : ''; }
function edgeLength(edge) { return Math.hypot(Number(edge?.dx || 0), Number(edge?.dy || 0), Number(edge?.dz || 0)); }
function packetSet(edge) { return new Set([...(edge?.packetEvidence || []), ...(edge?.flags || [])].filter(Boolean)); }
function packetOverlap(a, b) {
  const left = packetSet(a);
  const right = packetSet(b);
  if (!left.size && !right.size) return 1;
  let hit = 0;
  for (const item of left) if (right.has(item)) hit += 1;
  return hit / Math.max(left.size, right.size, 1);
}
function coord(value) {
  if (!value) return null;
  const x = finite(value.x), y = finite(value.y), z = finite(value.z);
  return x === null || y === null || z === null ? null : { x, y, z };
}
function coordFromEdge(edge, kind = 'start') {
  return coord(kind === 'end' ? edge?.toCoord : edge?.fromCoord)
    || coord(kind === 'end' ? edge?.pathEndCoord : edge?.pathStartCoord)
    || coord(kind === 'end' ? edge?.pathMidCoord : edge?.pathMidCoord)
    || null;
}
function subtract(a, b) { return vec(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.y || 0) - Number(b?.y || 0), Number(a?.z || 0) - Number(b?.z || 0)); }
function chooseAnchorPair(reference, target, options = {}) {
  const tolerance = Number(options.lengthToleranceMm || DEFAULT_LENGTH_TOL_MM);
  let best = null;
  for (const refEdge of reference?.edges || []) {
    for (const targetEdge of target?.edges || []) {
      const lengthDelta = Math.abs(edgeLength(refEdge) - edgeLength(targetEdge));
      const lengthScore = Math.max(0, 1 - lengthDelta / Math.max(tolerance * 8, 1));
      const packetScore = packetOverlap(refEdge, targetEdge);
      const anchorScore = ((refEdge.anchorFlags || []).length && (targetEdge.anchorFlags || []).length) ? 0.15 : 0;
      const score = lengthScore * 0.65 + packetScore * 0.25 + anchorScore;
      if (!best || score > best.score) best = { refEdge, targetEdge, score, lengthDelta };
    }
  }
  return best;
}

export function solveInputXmlCoordinateFrame(reference, target, options = {}) {
  const anchor = chooseAnchorPair(reference, target, options);
  if (!anchor?.refEdge || !anchor?.targetEdge) {
    return Object.freeze({ schema: 'CiiCoordinateFrameSolution.v1', ok: false, mode: 'UNSOLVED', confidence: 0, translation: vec(0, 0, 0), anchor: Object.freeze({}), diagnostic: 'No comparable anchor edges were available.' });
  }
  const refStart = coordFromEdge(anchor.refEdge, 'start');
  const targetStart = coordFromEdge(anchor.targetEdge, 'start');
  const hasAbsolute = Boolean(anchor.refEdge.fromCoord && anchor.targetEdge.fromCoord);
  const hasRelative = Boolean(refStart && targetStart);
  const translation = hasRelative ? subtract(targetStart, refStart) : vec(0, 0, 0);
  const mode = hasAbsolute ? 'TRANSLATION_ONLY' : hasRelative ? 'PATH_RELATIVE_TOPOLOGY_FRAME' : 'TOPOLOGY_ONLY_NO_COORDINATES';
  const confidence = Math.max(0, Math.min(1, Number(anchor.score || 0)));
  return Object.freeze({
    schema: 'CiiCoordinateFrameSolution.v1',
    ok: true,
    mode,
    confidence: fmt(confidence, 3),
    translation,
    anchor: Object.freeze({
      referenceElement: edgeLabel(anchor.refEdge),
      targetElement: edgeLabel(anchor.targetEdge),
      referenceFromTo: edgeKey(anchor.refEdge),
      targetFromTo: edgeKey(anchor.targetEdge),
      referenceStart: refStart ? vec(refStart.x, refStart.y, refStart.z) : null,
      targetStart: targetStart ? vec(targetStart.x, targetStart.y, targetStart.z) : null,
      lengthDeltaMm: fmt(anchor.lengthDelta || 0),
      packetOverlap: fmt(packetOverlap(anchor.refEdge, anchor.targetEdge), 3),
    }),
    note: hasAbsolute ? 'Absolute coordinates available; translation is target-start minus reference-start.' : hasRelative ? 'Frame solved in path-relative topology coordinates.' : 'No coordinate evidence available; topology/path evidence only.',
  });
}

export function frameSolutionRows(frameSolution = {}) {
  return [Object.freeze({
    mode: frameSolution.mode || 'UNSOLVED',
    confidence: frameSolution.confidence ?? 0,
    translation: `${fmt(frameSolution.translation?.x)}, ${fmt(frameSolution.translation?.y)}, ${fmt(frameSolution.translation?.z)}`,
    referenceAnchor: frameSolution.anchor?.referenceElement || '',
    targetAnchor: frameSolution.anchor?.targetElement || '',
    note: frameSolution.note || frameSolution.diagnostic || '',
  })];
}
