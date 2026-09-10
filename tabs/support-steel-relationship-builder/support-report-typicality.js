export const SUPPORT_REPORT_TYPICALITY_AUDIT_SCHEMA = 'SupportReportTypicalityAudit.v1';

export const PS_TYPICAL_V1_PROVISIONAL = Object.freeze({
  profileId: 'PS_TYPICAL_V1_PROVISIONAL',
  structural: Object.freeze({
    geometryEnvelopeToleranceMm: 50,
    pairDistanceMedianToleranceMm: 10,
    pairDistanceP95ToleranceMm: 25,
    pairDistanceMaxToleranceMm: 50,
  }),
});

export function buildSupportReportTypicalityAudit(leftEvidence, rightEvidence, options = {}) {
  const profile = options.profile || PS_TYPICAL_V1_PROVISIONAL;
  const leftFamilies = extractStructuralFamilyFeatures(leftEvidence);
  const rightFamilies = extractStructuralFamilyFeatures(rightEvidence);
  const familyComparisons = [];

  for (const left of leftFamilies) {
    for (const right of rightFamilies) {
      familyComparisons.push(compareStructuralFamilyFeatures(left, right, profile));
    }
  }

  const matches = leftFamilies.map((left) => selectFamilyMatch(
    left.familyId,
    familyComparisons.filter((item) => item.leftFamilyId === left.familyId),
  ));

  return Object.freeze({
    schema: SUPPORT_REPORT_TYPICALITY_AUDIT_SCHEMA,
    profileId: profile.profileId,
    leftFamilyCount: leftFamilies.length,
    rightFamilyCount: rightFamilies.length,
    leftFamilies,
    rightFamilies,
    familyComparisons: Object.freeze(familyComparisons),
    matches: Object.freeze(matches),
  });
}

export function extractStructuralFamilyFeatures(evidence = {}) {
  const familyIds = collectFamilyIds(evidence);
  return Object.freeze(familyIds.map((familyId) => familyFeatures(evidence, familyId)));
}

export function compareStructuralFamilyFeatures(left, right, profile = PS_TYPICAL_V1_PROVISIONAL) {
  const structural = profile.structural || {};
  const locationCount = exactSignal(
    'STRUCT_LOCATION_COUNT_EQUAL', left.locationCount, right.locationCount,
  );
  const memberMultiplicity = exactSignal(
    'STRUCT_MEMBER_MULTIPLICITY_EQUAL', left.memberMultiplicitySpectrum, right.memberMultiplicitySpectrum,
  );
  const pipeClasses = exactSignal(
    'STRUCT_PIPE_CLASS_POPULATION_EQUAL', left.normalizedPipeClassPopulation, right.normalizedPipeClassPopulation,
  );
  const rawPointCount = exactSignal(
    'STRUCT_RAW_CLASH_POINT_COUNT_EQUAL', left.rawClashPointCount, right.rawClashPointCount,
  );
  const envelope = envelopeSignal(left.geometryEnvelopeMm, right.geometryEnvelopeMm,
    structural.geometryEnvelopeToleranceMm);
  const pairDistance = pairDistanceSignal(left.pairDistanceSpectrumMm, right.pairDistanceSpectrumMm, structural);
  const signals = Object.freeze([
    locationCount, memberMultiplicity, pipeClasses, rawPointCount, envelope, pairDistance,
  ]);
  const accepted = locationCount.result === 'PASS'
    && memberMultiplicity.result === 'PASS'
    && pipeClasses.result === 'PASS'
    && envelope.result === 'PASS'
    && pairDistance.result === 'PASS';

  return Object.freeze({
    auditId: familyAuditId(left.familyId, right.familyId),
    leftFamilyId: left.familyId,
    rightFamilyId: right.familyId,
    result: accepted ? 'TYPICAL' : 'NOT_TYPICAL',
    reasonCode: accepted ? 'TYPICAL_ACCEPTED' : rejectionReason(signals),
    geometryCostMm: geometryCost(envelope, pairDistance),
    signals,
  });
}

export function supportTypeMultiset(value) {
  const tokens = Array.isArray(value) ? value : String(value ?? '').split(',');
  const counts = new Map();
  for (const raw of tokens) {
    const normalized = normalizeSupportTypeToken(raw);
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return Object.freeze(Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b))));
}

export function compareSupportTypeMultisets(left, right) {
  const leftCanonical = supportTypeMultiset(left);
  const rightCanonical = supportTypeMultiset(right);
  const missingFromRight = multisetDelta(leftCanonical, rightCanonical);
  const extraInRight = multisetDelta(rightCanonical, leftCanonical);
  const exact = !missingFromRight.length && !extraInRight.length;
  return Object.freeze({
    leftRaw: Object.freeze(rawSupportTypes(left)),
    rightRaw: Object.freeze(rawSupportTypes(right)),
    leftCanonical,
    rightCanonical,
    missingFromRight: Object.freeze(missingFromRight),
    extraInRight: Object.freeze(extraInRight),
    result: exact ? 'EXACT' : 'PARTIAL',
    reasonCodes: Object.freeze(exact
      ? ['SUPPORT_TYPE_MULTISET_EXACT']
      : [
        ...(missingFromRight.length ? ['SUPPORT_TYPE_MEMBER_MISSING'] : []),
        ...(extraInRight.length ? ['SUPPORT_TYPE_MEMBER_EXTRA'] : []),
      ]),
  });
}

export function normalizePipeClass(fullLineTag) {
  const text = clean(fullLineTag).replace(/^\/+/, '').toUpperCase();
  const sizeMatch = text.match(/-(\d+(?:\.\d+)?)"-/);
  if (!sizeMatch) return text;
  const tail = text.slice((sizeMatch.index || 0) + sizeMatch[0].length);
  const parts = tail.split('-').filter(Boolean);
  const service = parts[0]?.match(/^([A-Z]+)/)?.[1] || '';
  const specification = parts[1] || '';
  const qualifiers = parts.slice(2, -1).filter((part) => !/^\d+$/.test(part));
  return [sizeMatch[1], service, specification, ...qualifiers].filter(Boolean).join('|');
}

function familyFeatures(evidence, familyId) {
  const groups = (evidence.groups || []).filter((group) => token(group.secondarySupportFamilyId) === familyId);
  const rawClashes = (evidence.rawClashes || []).filter((clash) => (clash.familyIds || []).map(token).includes(familyId));
  const points = rawClashes.map((clash) => clash.clashPointGlobalMm).filter(validPoint);
  const memberIds = unique(groups.flatMap((group) => group.primarySupportMemberIds || []).map(token)
    .filter((value) => /\.\d+$/.test(value)));
  const memberMultiplicitySpectrum = groups.map((group) => unique((group.primarySupportMemberIds || [])
    .map(token).filter((value) => /\.\d+$/.test(value))).length).sort((a, b) => a - b);
  const normalizedPipeClassPopulation = groups.map((group) => normalizePipeClass(group.fullLineTag)).sort();
  return Object.freeze({
    familyId,
    locationCount: groups.length,
    numericPrimarySupportMemberCount: memberIds.length,
    numericPrimarySupportMemberIds: Object.freeze(memberIds.sort()),
    memberMultiplicitySpectrum: Object.freeze(memberMultiplicitySpectrum),
    normalizedPipeClassPopulation: Object.freeze(normalizedPipeClassPopulation),
    rawClashPointCount: points.length,
    geometryEnvelopeMm: geometryEnvelope(points),
    pairDistanceSpectrumMm: Object.freeze(pairDistanceSpectrum(points)),
    sourceClashGuids: Object.freeze(unique(rawClashes.map((clash) => clash.guid).filter(Boolean)).sort()),
  });
}

function collectFamilyIds(evidence) {
  const ids = [];
  for (const group of evidence.groups || []) ids.push(group.secondarySupportFamilyId);
  for (const clash of evidence.rawClashes || []) ids.push(...(clash.familyIds || []));
  return unique(ids.map(token).filter(Boolean)).sort();
}

function envelopeSignal(left, right, toleranceMm) {
  const leftSpan = left?.span || null;
  const rightSpan = right?.span || null;
  if (!leftSpan || !rightSpan) return signal('STRUCT_GEOMETRY_ENVELOPE_WITHIN_TOLERANCE', leftSpan, rightSpan, null, toleranceMm, 'FAIL');
  const residual = Math.max(
    Math.abs(leftSpan.x - rightSpan.x),
    Math.abs(leftSpan.y - rightSpan.y),
    Math.abs(leftSpan.z - rightSpan.z),
  );
  return signal('STRUCT_GEOMETRY_ENVELOPE_WITHIN_TOLERANCE', leftSpan, rightSpan,
    residual, toleranceMm, residual <= toleranceMm ? 'PASS' : 'FAIL');
}

function pairDistanceSignal(left, right, thresholds) {
  if (!left.length || left.length !== right.length) {
    return signal('STRUCT_PAIR_DISTANCE_WITHIN_TOLERANCE', left.length, right.length, null, thresholds, 'FAIL');
  }
  const residuals = left.map((value, index) => Math.abs(value - right[index])).sort((a, b) => a - b);
  const stats = Object.freeze({
    median: quantile(residuals, 0.5),
    p95: quantile(residuals, 0.95),
    max: residuals[residuals.length - 1] || 0,
  });
  const pass = stats.median <= thresholds.pairDistanceMedianToleranceMm
    && stats.p95 <= thresholds.pairDistanceP95ToleranceMm
    && stats.max <= thresholds.pairDistanceMaxToleranceMm;
  return signal('STRUCT_PAIR_DISTANCE_WITHIN_TOLERANCE', left.length, right.length, stats, Object.freeze({
    median: thresholds.pairDistanceMedianToleranceMm,
    p95: thresholds.pairDistanceP95ToleranceMm,
    max: thresholds.pairDistanceMaxToleranceMm,
  }), pass ? 'PASS' : 'FAIL');
}

function exactSignal(reasonCode, left, right) {
  return signal(reasonCode, left, right, null, 'EXACT', stable(left) === stable(right) ? 'PASS' : 'FAIL');
}
function signal(reasonCode, left, right, residual, threshold, result) {
  return Object.freeze({ reasonCode, left, right, residual, threshold, result });
}
function rejectionReason(signals) {
  const failed = signals.find((item) => item.result === 'FAIL');
  if (!failed) return 'TYPICAL_REJECTED_TOPOLOGY';
  if (failed.reasonCode.includes('GEOMETRY') || failed.reasonCode.includes('DISTANCE')) return 'TYPICAL_REJECTED_GEOMETRY';
  return 'TYPICAL_REJECTED_TOPOLOGY';
}
function geometryCost(envelope, pairDistance) {
  const envelopeCost = Number(envelope.residual) || 0;
  const pair = pairDistance.residual || {};
  return envelopeCost + (Number(pair.median) || 0) + (Number(pair.p95) || 0);
}
function selectFamilyMatch(leftFamilyId, comparisons) {
  const accepted = comparisons.filter((item) => item.result === 'TYPICAL')
    .sort((a, b) => a.geometryCostMm - b.geometryCostMm || a.rightFamilyId.localeCompare(b.rightFamilyId));
  if (accepted.length === 1) return Object.freeze({
    leftFamilyId, rightFamilyId: accepted[0].rightFamilyId, auditId: accepted[0].auditId,
    result: 'TYPICAL', reasonCode: 'TYPICAL_ACCEPTED',
  });
  if (accepted.length > 1) return Object.freeze({
    leftFamilyId, rightFamilyId: '', auditId: '', result: 'AMBIGUOUS', reasonCode: 'TYPICAL_AMBIGUOUS',
    candidateFamilyIds: Object.freeze(accepted.map((item) => item.rightFamilyId)),
  });
  return Object.freeze({
    leftFamilyId, rightFamilyId: '', auditId: '', result: 'NO_MATCH', reasonCode: 'TYPICAL_REJECTED_TOPOLOGY',
  });
}

function geometryEnvelope(points) {
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z);
  const min = Object.freeze({ x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) });
  const max = Object.freeze({ x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) });
  return Object.freeze({
    min, max,
    span: Object.freeze({ x: max.x - min.x, y: max.y - min.y, z: max.z - min.z }),
  });
}
function pairDistanceSpectrum(points) {
  const distances = [];
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const a = points[left];
      const b = points[right];
      distances.push(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
    }
  }
  return distances.sort((a, b) => a - b);
}
function multisetDelta(left, right) {
  return Object.keys(left).sort().flatMap((type) => {
    const count = Math.max(0, Number(left[type] || 0) - Number(right[type] || 0));
    return count ? [Object.freeze({ type, count })] : [];
  });
}
function rawSupportTypes(value) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(',');
  return values.map((item) => clean(item)).filter(Boolean);
}
function normalizeSupportTypeToken(value) { return clean(value).toUpperCase().replace(/\s+/g, ' '); }
function validPoint(point) { return point && [point.x, point.y, point.z].every(Number.isFinite); }
function quantile(sorted, ratio) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}
function familyAuditId(left, right) { return `TYP-${left}--${right}`.replace(/[^A-Z0-9-]+/gi, '-'); }
function stable(value) { return JSON.stringify(value); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function token(value) { return clean(value).replace(/^\/+/, '').replace(/\(REF\)$/iu, '').toUpperCase(); }
function unique(values) { return [...new Set(values || [])]; }
