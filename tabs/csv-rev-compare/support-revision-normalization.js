export const SUPPORT_REV_COMPARE_POLICY_V1 = Object.freeze({
  policyId: 'SUPPORT_REV_COMPARE_POLICY_V1',
  version: '1.0.0',
  coordinate: Object.freeze({
    roundingToleranceMm: 1,
    relocationToleranceMm: 5,
    anchorResidualLimitMm: 25,
  }),
  load: Object.freeze({
    absoluteTolerance: 0.001,
    relativeTolerance: 1e-9,
  }),
  candidate: Object.freeze({
    likelyScore: 55,
    ambiguityMargin: 8,
    coordinateNearMm: 50,
  }),
});

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();

export function parsePipeIdentity(rawValue) {
  const raw = clean(rawValue);
  const normalizedRaw = raw.replace(/&quot;/gi, '"').replace(/[“”]/g, '"');
  const tokens = normalizedRaw.split('-').map(clean).filter((token) => token !== '');
  const area = tokens.length >= 2 ? `${tokens[0]}-${tokens[1]}` : (tokens[0] || '');
  const scope = tokens[2] || '';
  const npsMatch = (tokens[3] || normalizedRaw).match(/(\d+(?:\.\d+)?)\s*"?/);
  const nps = npsMatch?.[1] || '';
  const lineToken = tokens[4] || '';
  const lineMatch = lineToken.match(/^([A-Za-z]+)?(\d+)$/);
  const service = lineMatch?.[1] || '';
  const lineNumber = lineMatch?.[2] || lineToken;
  const sequence = /^\d+$/.test(tokens.at(-1) || '') ? tokens.at(-1) : '';
  const middle = tokens.slice(5, sequence ? -1 : undefined);
  const qualifier = middle.find((token) => /^(PP|HOT|HT)$/i.test(token)) || '';
  const classSpec = middle.filter((token) => upper(token) !== upper(qualifier)).join('-');
  const normalizedCore = [area, scope, nps, service, lineNumber].map(upper).join('|');
  const normalizedFull = [normalizedCore, upper(classSpec), upper(qualifier), sequence].join('|');
  return Object.freeze({
    raw,
    normalizedRaw,
    area,
    scope,
    nps,
    service,
    lineNumber,
    classSpec,
    qualifier,
    sequence,
    normalizedCore,
    normalizedFull,
    tokens: Object.freeze(tokens),
  });
}

export function pipeTokenChanges(before, after) {
  const a = before?.normalizedCore ? before : parsePipeIdentity(before?.raw ?? before);
  const b = after?.normalizedCore ? after : parsePipeIdentity(after?.raw ?? after);
  const fields = ['area', 'scope', 'nps', 'service', 'lineNumber', 'classSpec', 'qualifier', 'sequence'];
  return Object.freeze(fields.flatMap((field) => upper(a[field]) === upper(b[field]) ? [] : [{ field, before: a[field], after: b[field] }]));
}

export function parseEngineeringCoordinate(rawValue, axis = '') {
  const raw = clean(rawValue);
  if (!raw) return Object.freeze({ raw, axis: upper(axis), direction: '', explicitSign: 0, magnitude: null, units: '', mm: null, directedMm: null, formatKey: 'EMPTY' });
  const direction = (raw.match(/\b([NSEW])\b/i) || raw.match(/^\s*([NSEW])/i))?.[1]?.toUpperCase() || '';
  const numberMatch = raw.replace(/,/g, '').match(/[-+]?\d+(?:\.\d+)?/);
  const number = numberMatch ? Number(numberMatch[0]) : null;
  const unitMatch = raw.match(/\b(mm|millimet(?:er|re)s?|m|met(?:er|re)s?)\b/i);
  const units = unitMatch?.[1]?.toLowerCase() || 'mm';
  const factor = /^m(?:$|et)/i.test(units) ? 1000 : 1;
  const magnitude = Number.isFinite(number) ? Math.abs(number) * factor : null;
  const explicitSign = Number.isFinite(number) ? Math.sign(number) || 1 : 0;
  const directionSign = ({ N: 1, E: 1, S: -1, W: -1 })[direction] || 0;
  const signedMm = Number.isFinite(number) ? number * factor : null;
  const directedMm = magnitude == null ? null : (directionSign ? directionSign * magnitude : signedMm);
  const formatKey = `${direction || 'NONE'}|${explicitSign < 0 ? '-' : '+'}|${units}`;
  return Object.freeze({ raw, axis: upper(axis), direction, explicitSign, magnitude, units, mm: signedMm, directedMm, formatKey });
}

export function parseSupportPosition(fields = {}) {
  return Object.freeze({
    x: parseEngineeringCoordinate(fields.eastWestRaw ?? fields.eastWest ?? '', 'X'),
    y: parseEngineeringCoordinate(fields.northSouthRaw ?? fields.northSouth ?? '', 'Y'),
    z: parseEngineeringCoordinate(fields.bopRaw ?? fields.bop ?? '', 'Z'),
  });
}

export function solveRevisionCoordinateFrame(anchorPairs = [], policy = SUPPORT_REV_COMPARE_POLICY_V1) {
  const axes = Object.freeze({
    x: solveAxis(anchorPairs, 'x', policy),
    y: solveAxis(anchorPairs, 'y', policy),
    z: solveAxis(anchorPairs, 'z', policy),
  });
  const usable = Object.values(axes).filter((axis) => axis.anchorCount > 0);
  return Object.freeze({
    schema: 'support-revision-coordinate-frame/v1',
    policyId: policy.policyId,
    axes,
    anchorCount: Math.max(0, ...usable.map((axis) => axis.anchorCount), 0),
    status: usable.length ? 'SOLVED' : 'UNPROVEN_DEFAULT',
  });
}

function solveAxis(anchorPairs, axis, policy) {
  const points = anchorPairs.flatMap((pair) => {
    const source = pair?.source?.position?.[axis]?.directedMm;
    const target = pair?.target?.position?.[axis]?.directedMm;
    return Number.isFinite(source) && Number.isFinite(target) ? [{ source, target }] : [];
  });
  if (!points.length) return Object.freeze({ sign: 1, offsetMm: 0, medianResidualMm: null, anchorCount: 0, status: 'DEFAULT' });
  const candidates = [1, -1].map((sign) => {
    const offsets = points.map(({ source, target }) => source - (sign * target));
    const offsetMm = median(offsets);
    const residuals = points.map(({ source, target }) => Math.abs(source - ((sign * target) + offsetMm)));
    return { sign, offsetMm, medianResidualMm: median(residuals) };
  }).sort((a, b) => a.medianResidualMm - b.medianResidualMm || b.sign - a.sign);
  const best = candidates[0];
  return Object.freeze({
    ...best,
    anchorCount: points.length,
    status: best.medianResidualMm <= policy.coordinate.anchorResidualLimitMm ? 'VALIDATED' : 'HIGH_RESIDUAL',
  });
}

export function applyCoordinateFrame(position, frame) {
  return Object.freeze(Object.fromEntries(['x', 'y', 'z'].map((axis) => {
    const raw = position?.[axis]?.directedMm;
    const transform = frame?.axes?.[axis] || { sign: 1, offsetMm: 0 };
    const value = Number.isFinite(raw) ? (transform.sign * raw) + Number(transform.offsetMm || 0) : null;
    return [axis, value];
  })));
}

export function coordinateDelta(sourcePosition, targetPosition, frame, policy = SUPPORT_REV_COMPARE_POLICY_V1) {
  const source = Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, sourcePosition?.[axis]?.directedMm ?? null]));
  const target = applyCoordinateFrame(targetPosition, frame);
  const deltas = Object.fromEntries(['x', 'y', 'z'].map((axis) => [axis, Number.isFinite(source[axis]) && Number.isFinite(target[axis]) ? target[axis] - source[axis] : null]));
  const finite = Object.values(deltas).filter(Number.isFinite);
  const residualMm = finite.length ? Math.sqrt(finite.reduce((sum, value) => sum + (value * value), 0)) : null;
  const rawChanged = ['x', 'y', 'z'].some((axis) => clean(sourcePosition?.[axis]?.raw) !== clean(targetPosition?.[axis]?.raw));
  let classification = 'UNCHANGED';
  if (rawChanged && residualMm != null && residualMm <= policy.coordinate.roundingToleranceMm) classification = 'FORMAT_CHANGED';
  if (residualMm != null && residualMm > policy.coordinate.roundingToleranceMm && residualMm <= policy.coordinate.relocationToleranceMm) classification = 'ROUNDING_ONLY';
  if (residualMm != null && residualMm > policy.coordinate.relocationToleranceMm) classification = 'ACTUAL_POSITION_CHANGED';
  return Object.freeze({ source, target, deltas: Object.freeze(deltas), residualMm, rawChanged, classification });
}

export function normalizeLoadVector(loadNodes = []) {
  const slots = loadNodes.map((node) => {
    const raw = clean(node?.raw ?? node?.fields?.raw ?? '');
    const number = raw !== '' ? Number(raw) : Number.NaN;
    return Object.freeze({
      ordinal: Number(node?.ordinal ?? node?.fields?.ordinal ?? 0),
      columnOrdinal: Number(node?.columnOrdinal ?? node?.fields?.columnOrdinal ?? 0),
      columnId: clean(node?.columnId ?? node?.fields?.columnId),
      sourceHeader: clean(node?.sourceHeader ?? node?.fields?.sourceHeader),
      raw,
      value: Number.isFinite(number) ? number : null,
      sourceCellRef: clean(node?.sourceCellRef ?? node?.fields?.sourceCellRef),
    });
  });
  const nonEmptySlots = slots.filter((slot) => slot.raw !== '');
  const numericCount = nonEmptySlots.filter((slot) => slot.value != null).length;
  const state = nonEmptySlots.length === 0 ? 'EMPTY'
    : numericCount === nonEmptySlots.length ? 'NUMERIC'
      : numericCount === 0 ? 'SYMBOLIC'
        : 'MIXED';
  return Object.freeze({ state, slots: Object.freeze(slots) });
}

export function compareLoadVectors(before, after, policy = SUPPORT_REV_COMPARE_POLICY_V1) {
  const a = before?.state ? before : normalizeLoadVector(before || []);
  const b = after?.state ? after : normalizeLoadVector(after || []);
  if (a.state === 'EMPTY' && b.state === 'NUMERIC') return Object.freeze({ classification: 'LOAD_BECAME_NUMERIC', before: a, after: b, deltas: loadDeltas(a, b, policy) });
  if (a.state === 'NUMERIC' && b.state === 'NUMERIC') {
    const deltas = loadDeltas(a, b, policy);
    return Object.freeze({ classification: deltas.some((item) => !item.equal) ? 'LOAD_SIGNATURE_CHANGED' : 'UNCHANGED', before: a, after: b, deltas });
  }
  if (a.state !== b.state || loadRawSignature(a) !== loadRawSignature(b)) return Object.freeze({ classification: 'LOAD_SIGNATURE_CHANGED', before: a, after: b, deltas: loadDeltas(a, b, policy) });
  return Object.freeze({ classification: 'UNCHANGED', before: a, after: b, deltas: Object.freeze([]) });
}

function loadDeltas(before, after, policy) {
  const key = (slot) => `${slot.sourceHeader.toUpperCase()}#${slot.ordinal}`;
  const a = new Map(before.slots.map((slot) => [key(slot), slot]));
  const b = new Map(after.slots.map((slot) => [key(slot), slot]));
  return Object.freeze([...new Set([...a.keys(), ...b.keys()])].map((slotKey) => {
    const left = a.get(slotKey) || null;
    const right = b.get(slotKey) || null;
    const delta = left?.value != null && right?.value != null ? right.value - left.value : null;
    const scale = Math.max(Math.abs(left?.value || 0), Math.abs(right?.value || 0), 1);
    const tolerance = Math.max(policy.load.absoluteTolerance, scale * policy.load.relativeTolerance);
    const equal = delta != null ? Math.abs(delta) <= tolerance : clean(left?.raw) === clean(right?.raw);
    return Object.freeze({ slotKey, before: left, after: right, delta, tolerance, equal });
  }));
}

function loadRawSignature(vector) {
  return vector.slots.map((slot) => `${slot.sourceHeader.toUpperCase()}#${slot.ordinal}=${slot.raw}`).join('|');
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export const _test = Object.freeze({ median, loadRawSignature });
