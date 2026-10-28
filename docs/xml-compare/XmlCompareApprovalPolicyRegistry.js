import { ISO_NOTE_COMPOSITE_ID_POLICY } from './XmlCompareIsoNoteIdentityAdapter.js';

// Domain adapters are registered here, not hard-coded in the generic reducer.
// A caller's "generic" flag cannot override roles present in loaded records.
export const XML_COMPARE_APPROVAL_POLICY_REGISTRY_SCHEMA = 'xml-compare-approval-policy-registry/v1';
const POLICIES = Object.freeze([ISO_NOTE_COMPOSITE_ID_POLICY]);

export function requiredCompositeApprovalPolicy(sourceRecords = [], targetRecords = []) {
  const roles = new Set([...sourceRecords, ...targetRecords]
    .map(record => String(record?.lineKey || record?.sourceRole || '').trim()).filter(Boolean));
  return POLICIES.find(policy => roles.has(policy.sourceRole) || roles.has(policy.targetRole)) || null;
}
