import { requiredCompositeApprovalPolicy } from './XmlCompareApprovalPolicyRegistry.js';

// A workspace-bound approval scope, not a per-command caller-provided context.
// WeakSet branding prevents passing an arbitrary {scoped:false, records:[]}
// object to downgrade an already-bound ISO session.
export const XML_COMPARE_APPROVAL_AUTHORITY_SCHEMA = 'xml-compare-approval-authority/v1';
const issued = new WeakSet();
export function createBoundApprovalAuthority({ sourceRecords, targetRecords } = {}) {
  if (!Array.isArray(sourceRecords) || !Array.isArray(targetRecords))
    throw new TypeError('Approval authority requires parsed source and target records.');
  const freezeRows = rows => Object.freeze(rows.map(row =>
    Object.freeze({ ...row })));
  const source = freezeRows(sourceRecords), target = freezeRows(targetRecords);
  const policy = requiredCompositeApprovalPolicy(source, target);
  const authority = Object.freeze({
    schema: XML_COMPARE_APPROVAL_AUTHORITY_SCHEMA,
    sourceRecords: source, targetRecords: target,
    scoped: Boolean(policy), policy: policy || null,
  });
  issued.add(authority);
  return authority;
}
export function isBoundApprovalAuthority(value) {
  return Boolean(value && typeof value === 'object' && issued.has(value));
}
