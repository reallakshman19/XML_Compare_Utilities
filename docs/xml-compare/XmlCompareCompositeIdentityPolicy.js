// Shared, domain-neutral composite identity and candidate approval policy.
// Engineering/domain adapters declare roles, fields and ID validity. This
// module deliberately does not know PS, ISO, pipes or revisions.
export const XML_COMPARE_COMPOSITE_IDENTITY_POLICY_SCHEMA = 'xml-compare-composite-identity-policy/v1';
const clean = v => String(v ?? '').trim();
export function normalizeIdentityPart(value, options = {}) {
  let v = clean(value);
  if (options.stripLeadingSlashes) v = v.replace(/^\/+/, '').trim();
  if (options.collapseWhitespace) v = v.replace(/\s+/g, ' ');
  if (options.caseFold !== false) v = v.toUpperCase();
  return v;
}
export function createCompositeIdentityPolicy({ id, sourceRole, targetRole, parts, validity = null } = {}) {
  if (!clean(id) || !clean(sourceRole) || !clean(targetRole) || !Array.isArray(parts) || !parts.length) {
    throw new Error('Composite identity policy needs an ID, two roles, and key parts.');
  }
  const safeParts = parts.map(p => {
    if (!p || !clean(p.sourceField) || !clean(p.targetField)) throw new Error('Every identity part needs sourceField and targetField.');
    return Object.freeze({ name: clean(p.name || p.sourceField), sourceField: clean(p.sourceField),
      targetField: clean(p.targetField), normalization: Object.freeze({ ...(p.normalization || {}) }) });
  });
  return Object.freeze({ id: clean(id), sourceRole: clean(sourceRole), targetRole: clean(targetRole),
    parts: Object.freeze(safeParts), validity });
}
export function resolveCompositeIdentity(record = {}, policy, side = 'source') {
  const parts = policy.parts.map(part => {
    const field = side === 'target' ? part.targetField : part.sourceField;
    const raw = clean(record[field]);
    return Object.freeze({ name: part.name, field, raw, normalized: normalizeIdentityPart(raw, part.normalization) });
  });
  const incomplete = parts.some(p => !p.normalized);
  const invalid = typeof policy.validity === 'function' ? policy.validity(parts, side, record) : '';
  return Object.freeze({ policyId: policy.id, side, parts: Object.freeze(parts),
    key: incomplete || invalid ? '' : JSON.stringify(parts.map(p => p.normalized)),
    valid: !incomplete && !invalid, reason: incomplete ? 'MISSING_IDENTITY_PART' : clean(invalid) });
}
export function compareCompositeIdentity(sourceRecord, targetRecord, policy) {
  const source = resolveCompositeIdentity(sourceRecord, policy, 'source');
  const target = resolveCompositeIdentity(targetRecord, policy, 'target');
  const valid = source.valid && target.valid && source.key === target.key;
  return Object.freeze({ applicable: true, valid, policyId: policy.id, source, target,
    reason: valid ? 'EXACT_COMPOSITE_IDENTITY'
      : !source.valid || !target.valid ? source.reason || target.reason || 'INCOMPLETE_IDENTITY'
        : 'COMPOSITE_IDENTITY_MISMATCH' });
}
export function validateCompositeCandidate(candidate = {}, sourceRecords = [], targetRecords = [], policy) {
  const source = sourceRecords.find(r => r.uid === candidate.sourceUid);
  const target = targetRecords.find(r => r.uid === candidate.targetUid);
  if (!source || !target) return Object.freeze({ applicable: false, valid: true, reason: 'RECORD_NOT_IN_SCOPE' });
  const sourceRole = clean(source.lineKey || source.sourceRole);
  const targetRole = clean(target.lineKey || target.sourceRole);
  // Unrelated XML and genuine same-role revision comparisons keep their own
  // identity policies. An ISO cross-partition candidate cannot bypass this
  // guard via an arbitrary text-similarity score.
  const reverse = sourceRole === policy.targetRole && targetRole === policy.sourceRole;
  const forward = sourceRole === policy.sourceRole && targetRole === policy.targetRole;
  if (!forward && !reverse) return Object.freeze({ applicable: false, valid: true, reason: 'POLICY_OUT_OF_SCOPE' });
  const check = forward ? compareCompositeIdentity(source, target, policy) : compareCompositeIdentity(target, source, policy);
  return Object.freeze({ applicable: true, valid: check.valid, policyId: policy.id,
    reason: check.valid ? 'EXACT_COMPOSITE_IDENTITY' :
      'Composite identity rejected: ' + check.reason + '. Text similarity cannot override identity requirements.',
    evidence: check });
}
export function summarizeCompositeCoverage(source = [], target = [], policy) {
  const keys = (items, side) => {
    const count = new Map(), noncanonical = [];
    for (const row of items) {
      const identity = resolveCompositeIdentity(row, policy, side);
      if (!identity.valid) { noncanonical.push(Object.freeze({ row, reason: identity.reason })); continue; }
      count.set(identity.key, (count.get(identity.key) || 0) + 1);
    }
    return { count, noncanonical };
  };
  const a = keys(source, 'source'), b = keys(target, 'target');
  const duplicatesA = [...a.count.values()].reduce((n, v) => n + (v > 1 ? v : 0), 0);
  const duplicatesB = [...b.count.values()].reduce((n, v) => n + (v > 1 ? v : 0), 0);
  const distinctSource = new Set(), distinctTarget = new Set();
  for (const row of source) {
    const identity = resolveCompositeIdentity(row, policy, 'source');
    if (identity.parts[0].normalized) distinctSource.add(identity.parts[0].normalized);
  }
  for (const row of target) {
    const identity = resolveCompositeIdentity(row, policy, 'target');
    if (identity.parts[0].normalized) distinctTarget.add(identity.parts[0].normalized);
  }
  const common = [...distinctSource].filter(k => distinctTarget.has(k));
  return Object.freeze({
    sourceRows: source.length, targetRows: target.length,
    sourceScopeCount: distinctSource.size, targetScopeCount: distinctTarget.size, sharedScopeCount: common.length,
    sourceOnlyScopes: Object.freeze([...distinctSource].filter(k => !distinctTarget.has(k))),
    targetOnlyScopes: Object.freeze([...distinctTarget].filter(k => !distinctSource.has(k))),
    sourceCompositeDuplicates: duplicatesA, targetCompositeDuplicates: duplicatesB,
    sourceNoncanonical: a.noncanonical.length, targetNoncanonical: b.noncanonical.length,
    coverageConfirmed: false,
    unmatchedPolicy: 'OUT_OF_SCOPE_OR_MISSING_REFERENCE',
  });
}
