import { CII_WORKSPACE_SCHEMAS, deepFreeze, stableId, stableStringify } from './cii-workspace-contracts.js';

function edgeMap(graph) { return new Map((graph?.edges || []).map((edge) => [String(edge.elementId), edge])); }
function nodeMap(graph) { return new Map((graph?.nodes || []).map((node) => [String(node.id), node])); }
function restraintMap(document) { return new Map((document?.parsed?.restraints || []).map((item) => [String(item.node), item])); }
function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function numberDelta(source, target) { const a = finite(source); const b = finite(target); return a == null || b == null ? null : b - a; }
function changedNumber(source, target, tolerance = 1e-9) { const delta = numberDelta(source, target); return delta == null ? false : Math.abs(delta) > tolerance; }
function vectorDistance(a, b) {
  if (!a || !b) return null;
  const ax = finite(a.x); const ay = finite(a.y); const az = finite(a.z);
  const bx = finite(b.x); const by = finite(b.y); const bz = finite(b.z);
  if ([ax, ay, az, bx, by, bz].some((value) => value == null)) return null;
  return Math.hypot(bx - ax, by - ay, bz - az);
}
function vectorDifference(source, target) {
  if (!source || !target) return null;
  const s = [finite(source.dx), finite(source.dy), finite(source.dz)];
  const t = [finite(target.dx), finite(target.dy), finite(target.dz)];
  if ([...s, ...t].some((value) => value == null)) return null;
  const direct = Math.hypot(t[0] - s[0], t[1] - s[1], t[2] - s[2]);
  const reversed = Math.hypot(-t[0] - s[0], -t[1] - s[1], -t[2] - s[2]);
  return direct <= reversed ? { distanceMm: direct, orientation: 'DIRECT' } : { distanceMm: reversed, orientation: 'REVERSED' };
}
function sourceIds(row) { return row?.sourceElementIds || (row?.sourceElementId ? [row.sourceElementId] : []); }
function targetIds(row) { return row?.targetElementIds || (row?.targetElementId ? [row.targetElementId] : []); }
function candidateEvidence(row) { return row?.evidence?.candidates || row?.evidence?.element?.candidates || null; }

export function ciiIdentityConfidence(row) {
  if (!row) return 'UNRESOLVED';
  if (row.status === 'LOCKED') return 'LOCKED';
  const candidates = candidateEvidence(row);
  const explicit = candidates?.winnerIdentityConfidence
    || row?.evidence?.identityConfidence
    || row?.evidence?.element?.identityConfidence;
  if (explicit) return explicit;
  if (row.status === 'HIGH') return 'HIGH';
  if (['UNRESOLVED', 'CONFLICT', 'DELETED', 'INSERTED'].includes(row.status)) return 'UNRESOLVED';
  return 'REVIEW';
}

export function ciiIdentityBound(row) {
  if (!row) return false;
  if (row.status === 'LOCKED' || row.status === 'HIGH') return true;
  if (['UNRESOLVED', 'CONFLICT', 'DELETED', 'INSERTED'].includes(row.status)) return false;
  if (row?.evidence?.nodeCustodyGate) return false;
  const candidates = candidateEvidence(row);
  if (candidates) return candidates.status === 'SUPPORTED';
  const evidence = row?.evidence?.element || row?.evidence;
  return evidence?.identitySupported === true;
}

function deltaRow(row, category, property, sourceValue, targetValue, config = {}) {
  const sourceIdentity = row.sourceNodeId || row.sourceComponentId || row.sourceElementId || sourceIds(row).join('|') || null;
  const targetIdentity = row.targetNodeId || row.targetComponentId || targetIds(row).join('|') || null;
  const changed = config.changed ?? stableStringify(sourceValue) !== stableStringify(targetValue);
  return deepFreeze({
    deltaId: stableId('delta', row.correspondenceId, category, property),
    correspondenceId: row.correspondenceId,
    identityKind: row.kind,
    sourceIdentity,
    targetIdentity,
    identityConfidence: ciiIdentityConfidence(row),
    category,
    property,
    sourceValue,
    targetValue,
    delta: config.delta ?? null,
    semanticChange: config.semanticChange || (changed ? 'CHANGED' : 'UNCHANGED'),
    changed: Boolean(changed),
    evidenceStatus: config.evidenceStatus || 'QUALIFIED',
    authority: config.authority || null,
    limitations: Object.freeze(config.limitations || []),
  });
}

function nodeDeltas(rows, sourceDocument, targetDocument, sourceGraph, targetGraph, options) {
  const sourceNodes = nodeMap(sourceGraph); const targetNodes = nodeMap(targetGraph);
  const sourceRestraints = restraintMap(sourceDocument); const targetRestraints = restraintMap(targetDocument);
  const deltas = []; const toleranceMm = Number(options.engineeringGeometryToleranceMm ?? 0.01);
  for (const row of rows || []) {
    if (row.kind !== 'NODE' || !row.sourceNodeId || !row.targetNodeId || !ciiIdentityBound(row)) continue;
    const sourceNode = sourceNodes.get(String(row.sourceNodeId)); const targetNode = targetNodes.get(String(row.targetNodeId));
    const distanceMm = vectorDistance(sourceNode?.position, targetNode?.position);
    if (distanceMm != null) deltas.push(deltaRow(row, 'GEOMETRY', 'Node location', sourceNode.position, targetNode.position, {
      changed: distanceMm > toleranceMm, delta: { distanceMm }, authority: 'PARSED_NODE_COORDINATES',
    }));

    const sourceName = sourceDocument?.nodeNames?.[String(row.sourceNodeId)] || '';
    const targetName = targetDocument?.nodeNames?.[String(row.targetNodeId)] || '';
    deltas.push(deltaRow(row, 'NODE_NAME', 'Node name / to-name', sourceName, targetName, {
      authority: 'CII_NODENAME_FIXED_LAYOUT',
    }));

    const sourceRestraint = sourceRestraints.get(String(row.sourceNodeId)) || null;
    const targetRestraint = targetRestraints.get(String(row.targetNodeId)) || null;
    const sourcePresent = Boolean(sourceRestraint); const targetPresent = Boolean(targetRestraint);
    if (sourcePresent || targetPresent) {
      deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint presence', sourcePresent, targetPresent, {
        changed: sourcePresent !== targetPresent, semanticChange: sourcePresent === targetPresent ? 'UNCHANGED' : (targetPresent ? 'ADDED_IN_TARGET' : 'REMOVED_IN_TARGET'),
        evidenceStatus: 'PARTIAL', authority: 'parser/sections/restraints.js',
        limitations: ['Restraint family is only partially qualified.'],
      }));
      const sourceCodes = [...new Set(sourceRestraint?.dofs || [])].sort((a, b) => a - b);
      const targetCodes = [...new Set(targetRestraint?.dofs || [])].sort((a, b) => a - b);
      deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint code set', sourceCodes, targetCodes, {
        evidenceStatus: 'PARTIAL', authority: 'parser/sections/restraints.js#dofs',
        limitations: ['Numeric restraint codes are compared exactly; derived support type semantics are not authoritative for all CAESAR codes.'],
      }));
      const sourceRows = [...(sourceRestraint?.rows || [])].map((item) => [...item]).sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
      const targetRows = [...(targetRestraint?.rows || [])].map((item) => [...item]).sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
      deltas.push(deltaRow(row, 'RESTRAINT', 'Raw restraint records', sourceRows, targetRows, {
        evidenceStatus: 'PARTIAL', authority: 'parser/sections/restraints.js#rows',
        semanticChange: stableStringify(sourceRows) === stableStringify(targetRows) ? 'UNCHANGED' : 'RAW_ROWS_CHANGED',
        limitations: ['Raw numeric row differences are retained without labelling unqualified columns as gap or friction.'],
      }));
    }
  }
  return deltas;
}

function elementDeltas(rows, sourceGraph, targetGraph, options) {
  const sourceEdges = edgeMap(sourceGraph); const targetEdges = edgeMap(targetGraph); const deltas = [];
  const geometryToleranceMm = Number(options.engineeringGeometryToleranceMm ?? 0.01);
  const valueTolerance = Number(options.engineeringNumericTolerance ?? 1e-9);
  for (const row of rows || []) {
    if (row.kind !== 'ELEMENT' || !ciiIdentityBound(row)) continue;
    const sourceIdList = sourceIds(row); const targetIdList = targetIds(row);
    if (sourceIdList.length !== 1 || targetIdList.length !== 1) continue;
    const source = sourceEdges.get(String(sourceIdList[0])); const target = targetEdges.get(String(targetIdList[0]));
    if (!source || !target) continue;
    const vector = vectorDifference(source, target);
    if (vector) deltas.push(deltaRow(row, 'GEOMETRY', 'Element vector', { dx: source.dx, dy: source.dy, dz: source.dz }, { dx: target.dx, dy: target.dy, dz: target.dz }, {
      changed: vector.distanceMm > geometryToleranceMm, delta: vector, authority: 'PARSED_ELEMENT_GEOMETRY',
    }));
    deltas.push(deltaRow(row, 'GEOMETRY', 'Element length', source.lengthMm, target.lengthMm, {
      changed: changedNumber(source.lengthMm, target.lengthMm, geometryToleranceMm), delta: numberDelta(source.lengthMm, target.lengthMm), authority: 'PARSED_ELEMENT_GEOMETRY',
    }));
    for (const [category, property, key] of [['PIPE_SIZE', 'OD', 'diameter'], ['WALL', 'Wall thickness', 'wall']]) {
      deltas.push(deltaRow(row, category, property, source[key], target[key], {
        changed: changedNumber(source[key], target[key], valueTolerance), delta: numberDelta(source[key], target[key]), authority: 'PARSED_ELEMENT_PIPE_PROPERTY',
      }));
    }
    for (const [property, key] of [['P1', 'P1'], ['T1', 'T1']]) {
      deltas.push(deltaRow(row, 'PROCESS', property, source[key], target[key], {
        changed: changedNumber(source[key], target[key], valueTolerance), delta: numberDelta(source[key], target[key]), evidenceStatus: 'PARTIAL', authority: 'parser/sections/elements.js',
        limitations: ['P1/T1 are parsed element values; they are not a complete qualified load-case/process model.'],
      }));
    }
  }
  return deltas;
}

function componentDeltas(rows, sourceGraph, targetGraph, options) {
  const sourceEdges = edgeMap(sourceGraph); const targetEdges = edgeMap(targetGraph); const deltas = [];
  const tolerance = Number(options.engineeringMassTolerance ?? 1e-9);
  for (const row of rows || []) {
    if (row.kind !== 'COMPONENT' || row.componentKind !== 'RIGID' || !ciiIdentityBound(row)) continue;
    const source = sourceEdges.get(String(row.sourceElementId)); const target = targetEdges.get(String(targetIds(row)[0] || ''));
    if (!source || !target) continue;
    const sourceMass = source.rigidEvidence?.mass ?? null; const targetMass = target.rigidEvidence?.mass ?? null;
    if (sourceMass == null && targetMass == null) continue;
    deltas.push(deltaRow(row, 'WEIGHT_RIGID', 'Rigid mass', sourceMass, targetMass, {
      changed: changedNumber(sourceMass, targetMass, tolerance), delta: numberDelta(sourceMass, targetMass), authority: 'PARSED_RIGID_MASS',
    }));
  }
  return deltas;
}

function limitation(sourceDocument, targetDocument, family, label, forcedState = null, forcedReason = null) {
  const source = sourceDocument?.capabilities?.families?.[family] || null;
  const target = targetDocument?.capabilities?.families?.[family] || null;
  const sourceState = source?.state || 'UNAVAILABLE'; const targetState = target?.state || 'UNAVAILABLE';
  const sourceQualification = source?.qualification || 'NONE'; const targetQualification = target?.qualification || 'NONE';
  const comparisonState = forcedState || ((sourceQualification === 'QUALIFIED' && targetQualification === 'QUALIFIED') ? 'QUALIFIED' : 'LIMITED');
  return deepFreeze({
    family, label, sourceState, targetState, sourceQualification, targetQualification, comparisonState,
    reason: forcedReason || [...(source?.limitations || []), ...(target?.limitations || [])][0] || '',
  });
}

function capabilityLimitations(sourceDocument, targetDocument) {
  return Object.freeze([
    limitation(sourceDocument, targetDocument, 'restraints', 'Restraints', 'PARTIAL', 'Numeric restraint codes and raw rows are comparable; gap/friction semantic columns are not qualified.'),
    limitation(sourceDocument, targetDocument, 'hangers', 'Hangers'),
    limitation(sourceDocument, targetDocument, 'sifTee', 'SIF / Tee'),
    limitation(sourceDocument, targetDocument, 'weightData', 'General weight data'),
    limitation(sourceDocument, targetDocument, 'lineNumbers', 'Line numbers'),
    limitation(sourceDocument, targetDocument, 'process', 'Process P1/T1/T2', 'PARTIAL', 'Current process evidence is element-value level only.'),
  ]);
}

function familyCounts(rows) {
  const counts = {};
  for (const row of rows.filter((item) => item.changed)) counts[row.category] = (counts[row.category] || 0) + 1;
  return Object.freeze(counts);
}

export function buildCiiEngineeringDeltas(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, options = {}) {
  const rows = [
    ...nodeDeltas(correspondence?.nodeRows, sourceDocument, targetDocument, sourceGraph, targetGraph, options),
    ...elementDeltas(correspondence?.elementRows, sourceGraph, targetGraph, options),
    ...componentDeltas(correspondence?.componentRows, sourceGraph, targetGraph, options),
  ];
  rows.sort((a, b) => `${a.sourceIdentity}|${a.category}|${a.property}`.localeCompare(`${b.sourceIdentity}|${b.category}|${b.property}`, undefined, { numeric: true }));
  const changedRows = rows.filter((row) => row.changed);
  return deepFreeze({
    schema: CII_WORKSPACE_SCHEMAS.engineeringDeltaSet,
    direction: 'SOURCE_TO_TARGET',
    rows: Object.freeze(rows),
    changedRows: Object.freeze(changedRows),
    limitations: capabilityLimitations(sourceDocument, targetDocument),
    summary: Object.freeze({
      comparedPropertyCount: rows.length,
      engineeringChangeCount: changedRows.length,
      unchangedPropertyCount: rows.length - changedRows.length,
      changeFamilyCounts: familyCounts(rows),
      identityMutationAuthority: 'NONE_READ_ONLY_DOWNSTREAM',
    }),
  });
}
