/* Shared, fail-closed operation policy. Never permits overlapping approved claims. */
export const DEFAULT_POLICY = Object.freeze({
  conflictPolicy: 'ISOLATE_UNRELATED',
  unapprovedPolicy: 'UNCHANGED',
  approvalMode: 'LOGICAL_NODE'
});
const fail = code => { throw new Error(code); };
const choices = Object.freeze({
  conflictPolicy: ['ISOLATE_UNRELATED', 'BLOCK_PLAN'],
  unapprovedPolicy: ['UNCHANGED', 'BLOCK_PLAN'],
  approvalMode: ['LOGICAL_NODE', 'INDIVIDUAL']
});
const overlap = (a, b) => a.byteStart < b.byteEnd && b.byteStart < a.byteEnd;

export function resolvePolicy(input = DEFAULT_POLICY) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !(key in choices))) fail('POLICY_UNRECOGNIZED');
  const p = { ...DEFAULT_POLICY, ...input };
  if (Object.keys(choices).some(key => !choices[key].includes(p[key]))) fail('POLICY_UNRECOGNIZED');
  return Object.freeze(p);
}
function isolatedConflictDiagnostic(d, claims) {
  if (d?.code !== 'DUPLICATE_FIELD_CLAIM' || typeof d.detail !== 'string') return false;
  const colliding = claims.filter(c => c.status === 'CONFLICT' &&
    `${c.byteStart}:${c.byteEnd}` === d.detail);
  return colliding.length >= 2 && colliding.some(c => c.ruleId === d.ruleId) &&
    colliding.some((c, i) => colliding.some((other, j) => i !== j && overlap(c, other)));
}
export function enforcePlanPolicy(plan, approvedIds, input) {
  const p = resolvePolicy(input);
  if (!Array.isArray(plan?.claims) || !Array.isArray(approvedIds)) fail('POLICY_PLAN_INVALID');
  const claims = plan.claims, chosen = new Set(approvedIds);
  if (chosen.size !== approvedIds.length) fail('CLAIM_ID_DUPLICATE_OR_UNKNOWN');
  if (claims.some(c => !c || !Number.isSafeInteger(c.byteStart) ||
      !Number.isSafeInteger(c.byteEnd) || c.byteStart < 0 || c.byteEnd <= c.byteStart)) {
    fail('CLAIM_SPAN_INVALID');
  }
  if ((plan.diagnostics || []).some(d => d.severity === 'ERROR' &&
      !(p.conflictPolicy === 'ISOLATE_UNRELATED' && isolatedConflictDiagnostic(d, claims)))) {
    fail('PLAN_HAS_BLOCKING_DIAGNOSTICS');
  }
  if (p.unapprovedPolicy === 'BLOCK_PLAN' && claims.some(c => !chosen.has(c.id))) {
    fail('UNAPPROVED_CLAIMS_BLOCK_PLAN');
  }
  if (p.conflictPolicy === 'BLOCK_PLAN' && (claims.some(c => c.status === 'CONFLICT') ||
      claims.some((c, i) => claims.slice(i + 1).some(other => overlap(c, other))))) {
    fail('UNRESOLVED_CONFLICT_BLOCKS_PLAN');
  }
  for (const claim of claims.filter(c => chosen.has(c.id))) {
    if (claims.some(other => other !== claim && overlap(claim, other))) {
      fail('CLAIM_OVERLAP_OR_UNSUPPORTED');
    }
  }
  return p;
}
