import { CII_WORKSPACE_SCHEMAS, deepFreeze, stableId, stableStringify } from './cii-workspace-contracts.js';
import { registeredCiiPoint } from './cii-workspace-geometry.js';

function edgeMap(graph) { return new Map((graph?.edges || []).map((edge) => [String(edge.elementId), edge])); }
function nodeMap(graph) { return new Map((graph?.nodes || []).map((node) => [String(node.id), node])); }
function capability(document, family) { return document?.capabilities?.families?.[family] || null; }
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
function sortedUniqueNumeric(values) { return [...new Set((values || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b); }
function sortedStable(values) { return [...(values || [])].sort((a, b) => stableStringify(a).localeCompare(stableStringify(b), undefined, { numeric: true })); }

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
    identityConfidence: config.identityConfidence || ciiIdentityConfidence(row),
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

function legacyRestraint(document, nodeId) {
  return (document?.parsed?.restraints || []).find((item) => String(item.node) === String(nodeId)) || null;
}
function restraintEvidence(document, nodeId) {
  const byNode = document?.auxiliaryEvidence?.restraints?.byNode;
  if (byNode && typeof byNode === 'object') {
    return { mode: 'AUXILIARY_QUALIFIED', records: [...(byNode[String(nodeId)] || [])] };
  }
  const legacy = legacyRestraint(document, nodeId);
  return { mode: 'LEGACY_PARTIAL', legacy, records: [] };
}
function qualifiedRestraintSet(records) {
  return sortedStable((records || []).map((record) => ({
    typeCode: Number(record.typeCode), stiffness: Number(record.stiffness), gap: Number(record.gap), friction: Number(record.friction),
    directionCosines: record.directionCosines || null,
  })));
}
function legacyRestraintDeltas(row, sourceRestraint, targetRestraint) {
  const deltas = []; const sourcePresent = Boolean(sourceRestraint); const targetPresent = Boolean(targetRestraint);
  if (!sourcePresent && !targetPresent) return deltas;
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint presence', sourcePresent, targetPresent, {
    changed: sourcePresent !== targetPresent, semanticChange: sourcePresent === targetPresent ? 'UNCHANGED' : (targetPresent ? 'ADDED_IN_TARGET' : 'REMOVED_IN_TARGET'),
    evidenceStatus: 'PARTIAL', authority: 'parser/sections/restraints.js', limitations: ['Legacy restraint evidence is partial; auxiliary fixed-field custody was not supplied.'],
  }));
  const sourceCodes = sortedUniqueNumeric(sourceRestraint?.dofs || []); const targetCodes = sortedUniqueNumeric(targetRestraint?.dofs || []);
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint code set', sourceCodes, targetCodes, {
    evidenceStatus: 'PARTIAL', authority: 'parser/sections/restraints.js#dofs',
    limitations: ['Numeric restraint codes are compared exactly; derived support type semantics are not authoritative for all CAESAR codes.'],
  }));
  const sourceRows = sortedStable([...(sourceRestraint?.rows || [])].map((item) => [...item]));
  const targetRows = sortedStable([...(targetRestraint?.rows || [])].map((item) => [...item]));
  deltas.push(deltaRow(row, 'RESTRAINT', 'Raw restraint records', sourceRows, targetRows, {
    evidenceStatus: 'PARTIAL', authority: 'parser/sections/restraints.js#rows',
    semanticChange: stableStringify(sourceRows) === stableStringify(targetRows) ? 'UNCHANGED' : 'RAW_ROWS_CHANGED',
    limitations: ['Raw numeric row differences are retained without labelling unqualified columns as gap or friction.'],
  }));
  return deltas;
}
function qualifiedRestraintDeltas(row, sourceRecords, targetRecords) {
  const deltas = []; const sourcePresent = sourceRecords.length > 0; const targetPresent = targetRecords.length > 0;
  if (!sourcePresent && !targetPresent) return deltas;
  const authority = 'PROTECTED_WRITER_RESTRANT_LINE1_LINE2';
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint presence', sourcePresent, targetPresent, {
    changed: sourcePresent !== targetPresent, semanticChange: sourcePresent === targetPresent ? 'UNCHANGED' : (targetPresent ? 'ADDED_IN_TARGET' : 'REMOVED_IN_TARGET'),
    authority,
  }));
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint code set', sortedUniqueNumeric(sourceRecords.map((record) => record.typeCode)), sortedUniqueNumeric(targetRecords.map((record) => record.typeCode)), {
    evidenceStatus: 'PARTIAL', authority,
    limitations: ['The numeric CAESAR restraint type field is source-qualified; human-readable meaning for every code 1..62 is not mapped here.'],
  }));
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint gap values', sortedUniqueNumeric(sourceRecords.map((record) => record.gap)), sortedUniqueNumeric(targetRecords.map((record) => record.gap)), { authority }));
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint friction values', sortedUniqueNumeric(sourceRecords.map((record) => record.friction)), sortedUniqueNumeric(targetRecords.map((record) => record.friction)), { authority }));
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint stiffness values', sortedUniqueNumeric(sourceRecords.map((record) => record.stiffness)), sortedUniqueNumeric(targetRecords.map((record) => record.stiffness)), { authority }));
  deltas.push(deltaRow(row, 'RESTRAINT', 'Restraint direction-cosine set', sortedStable(sourceRecords.map((record) => record.directionCosines)), sortedStable(targetRecords.map((record) => record.directionCosines)), { authority }));
  deltas.push(deltaRow(row, 'RESTRAINT', 'Qualified restraint numeric record set', qualifiedRestraintSet(sourceRecords), qualifiedRestraintSet(targetRecords), {
    evidenceStatus: 'PARTIAL', authority,
    limitations: ['Numeric fields are qualified by fixed position; restraint type-code descriptions remain intentionally unresolved.'],
  }));
  return deltas;
}

function nodeDeltas(rows, sourceDocument, targetDocument, sourceGraph, targetGraph, options) {
  const sourceNodes = nodeMap(sourceGraph); const targetNodes = nodeMap(targetGraph);
  const sourceNameCapability = capability(sourceDocument, 'nodeNames'); const targetNameCapability = capability(targetDocument, 'nodeNames');
  const nameQualified = sourceNameCapability?.qualification === 'QUALIFIED' && targetNameCapability?.qualification === 'QUALIFIED';
  const nameLimitations = [...(sourceNameCapability?.limitations || []), ...(targetNameCapability?.limitations || [])];
  const deltas = []; const toleranceMm = Number(options.engineeringGeometryToleranceMm ?? 0.01);
  for (const row of rows || []) {
    if (row.kind !== 'NODE' || !row.sourceNodeId || !row.targetNodeId || !ciiIdentityBound(row)) continue;
    const sourceNode = sourceNodes.get(String(row.sourceNodeId)); const targetNode = targetNodes.get(String(row.targetNodeId));
    const nativeDistanceMm = vectorDistance(sourceNode?.position, targetNode?.position);
    if (nativeDistanceMm != null) deltas.push(deltaRow(row, 'GEOMETRY', 'Node location (native basis)', sourceNode.position, targetNode.position, {
      changed: nativeDistanceMm > toleranceMm, delta: { distanceMm: nativeDistanceMm, basis: 'NATIVE' }, authority: 'PARSED_NATIVE_NODE_COORDINATES',
    }));
    const registeredSource = registeredCiiPoint(options.geometryTransform, sourceNode?.position);
    const registeredDistanceMm = registeredSource ? vectorDistance(registeredSource, targetNode?.position) : null;
    if (registeredDistanceMm != null) deltas.push(deltaRow(row, 'GEOMETRY', 'Node location (registered basis)', registeredSource, targetNode.position, {
      changed: registeredDistanceMm > toleranceMm,
      delta: { distanceMm: registeredDistanceMm, basis: 'REGISTERED_RIGID_3D' },
      authority: 'QUALIFIED_RIGID_3D_REGISTRATION',
    }));

    const sourceName = sourceDocument?.nodeNames?.[String(row.sourceNodeId)] || '';
    const targetName = targetDocument?.nodeNames?.[String(row.targetNodeId)] || '';
    if (nameQualified || sourceName || targetName) deltas.push(deltaRow(row, 'NODE_NAME', 'Node name / to-name', sourceName, targetName, {
      evidenceStatus: nameQualified ? 'QUALIFIED' : 'PARTIAL', authority: 'CII_NODENAME_FIXED_LAYOUT', limitations: nameLimitations,
    }));

    const sourceRestraint = restraintEvidence(sourceDocument, row.sourceNodeId);
    const targetRestraint = restraintEvidence(targetDocument, row.targetNodeId);
    if (sourceRestraint.mode === 'AUXILIARY_QUALIFIED' && targetRestraint.mode === 'AUXILIARY_QUALIFIED') {
      deltas.push(...qualifiedRestraintDeltas(row, sourceRestraint.records, targetRestraint.records));
    } else {
      deltas.push(...legacyRestraintDeltas(row, sourceRestraint.legacy, targetRestraint.legacy));
    }
  }
  return deltas;
}

function sifTeeDeltas(row, source, target) {
  const sourceRecord = source?.sifTeeEvidence || null; const targetRecord = target?.sifTeeEvidence || null;
  if (!sourceRecord && !targetRecord) return [];
  const authority = 'ELEMENT_POINTER_TO_SIF_TEES_RAW_RECORD';
  const deltas = [deltaRow(row, 'SIF_TEE', 'SIF/Tee record presence', Boolean(sourceRecord), Boolean(targetRecord), {
    changed: Boolean(sourceRecord) !== Boolean(targetRecord), authority,
  })];
  if (sourceRecord || targetRecord) {
    deltas.push(deltaRow(row, 'SIF_TEE', 'SIF/Tee raw code (field 2)', sourceRecord?.rawCode ?? null, targetRecord?.rawCode ?? null, {
      evidenceStatus: 'PARTIAL', authority,
      limitations: ['The second numeric field is preserved as a raw code; its CAESAR semantic label is not asserted by the current source authority.'],
    }));
    deltas.push(deltaRow(row, 'SIF_TEE', 'SIF/Tee normalized raw payload', sourceRecord?.normalizedPayload ?? null, targetRecord?.normalizedPayload ?? null, {
      evidenceStatus: 'PARTIAL', authority,
      limitations: ['Node number is removed from the normalized first row so revision renumbering is not reported as a payload change.'],
    }));
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
    deltas.push(...sifTeeDeltas(row, source, target));
  }
  return deltas;
}

function componentDeltas(componentRows, elementRows, sourceGraph, targetGraph, options) {
  const sourceEdges = edgeMap(sourceGraph); const targetEdges = edgeMap(targetGraph); const deltas = [];
  const elementById = new Map((elementRows || []).map((row) => [row.correspondenceId, row]));
  const tolerance = Number(options.engineeringMassTolerance ?? 1e-9);
  for (const row of componentRows || []) {
    if (row.kind !== 'COMPONENT' || row.componentKind !== 'RIGID') continue;
    const parent = elementById.get(row.parentElementCorrespondenceId);
    if (!parent || !ciiIdentityBound(parent) || (row.evidence?.blockers || []).length) continue;
    const source = sourceEdges.get(String(row.sourceElementId)); const target = targetEdges.get(String(targetIds(row)[0] || ''));
    if (!source || !target) continue;
    const sourceWeight = source.rigidEvidence?.weight ?? source.rigidEvidence?.mass ?? null;
    const targetWeight = target.rigidEvidence?.weight ?? target.rigidEvidence?.mass ?? null;
    if (sourceWeight == null && targetWeight == null) continue;
    deltas.push(deltaRow(row, 'WEIGHT_RIGID', 'Rigid weight', sourceWeight, targetWeight, {
      changed: changedNumber(sourceWeight, targetWeight, tolerance), delta: numberDelta(sourceWeight, targetWeight), authority: 'ELEMENT_RIGID_POINTER_TO_RIGID_RECORD',
      identityConfidence: ciiIdentityConfidence(parent),
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
    limitation(sourceDocument, targetDocument, 'restraints', 'Restraints', 'PARTIAL', 'Numeric restraint type, stiffness, gap, friction and direction-cosine fields are source-qualified; type-code descriptions are not mapped.'),
    limitation(sourceDocument, targetDocument, 'hangers', 'Hangers'),
    limitation(sourceDocument, targetDocument, 'sifTee', 'SIF / Tee', 'PARTIAL', 'Pointer custody and raw SIF&TEES payload are qualified; raw code semantics remain unresolved.'),
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
    ...componentDeltas(correspondence?.componentRows, correspondence?.elementRows, sourceGraph, targetGraph, options),
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
      geometryBases: Object.freeze({ native: 'PARSED_NATIVE_NODE_COORDINATES', registered: options.geometryTransform?.status === 'READY' ? 'QUALIFIED_RIGID_3D_REGISTRATION' : 'UNAVAILABLE' }),
    }),
  });
}
