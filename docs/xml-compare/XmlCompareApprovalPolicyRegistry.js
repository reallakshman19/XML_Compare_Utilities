import { ISO_NOTE_COMPOSITE_ID_POLICY } from './XmlCompareIsoNoteIdentityAdapter.js';

// Domain adapters are registered here, not hard-coded in the generic reducer.
// Enforce a policy when loaded source/target roles permit a cross-partition
// correspondence; genuine same-role revision comparisons keep their own policy.
export const XML_COMPARE_APPROVAL_POLICY_REGISTRY_SCHEMA = 'xml-compare-approval-policy-registry/v1';
const POLICIES = Object.freeze([ISO_NOTE_COMPOSITE_ID_POLICY]);
const roles = rows => new Set(rows.map(record =>
  String(record?.lineKey || record?.sourceRole || '').trim()).filter(Boolean));

export function requiredCompositeApprovalPolicy(sourceRecords = [], targetRecords = []) {
  const source = roles(sourceRecords), target = roles(targetRecords);
  return POLICIES.find(policy =>
    (source.has(policy.sourceRole) && target.has(policy.targetRole)) ||
    (source.has(policy.targetRole) && target.has(policy.sourceRole))) || null;
}
