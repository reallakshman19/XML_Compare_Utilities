import { validateCompositeCandidate } from './XmlCompareCompositeIdentityPolicy.js';

// Pure, workflow-scoped guard. A candidate approval requires every pair to
// exist and have the configured full composite identity; selection state,
// confidence score and auto-map flags are never accepted as identity evidence.
export const XML_COMPARE_COMPOSITE_APPROVAL_GATE_SCHEMA = 'xml-compare-composite-approval-gate/v1';
const approvalTypes = new Set(['accept-candidate', 'bulk-approve-candidate-pairs', 'approve-pending-connector']);
export function guardCompositeApprovalAction({
  scoped = false, action = {}, sourceRecords = [], targetRecords = [], pendingPreview = null, policy,
} = {}) {
  if (!scoped || !approvalTypes.has(action.type)) return Object.freeze({ blocked: false, reason: '', decisions: [] });
  if (!policy) return Object.freeze({ blocked: true, reason: 'MISSING_COMPOSITE_POLICY', decisions: [] });
  const pairs = action.type === 'bulk-approve-candidate-pairs' ? action.candidates || [] :
    action.type === 'approve-pending-connector' ? [pendingPreview || {}] : [action.candidate || {}];
  if (!pairs.length) return Object.freeze({ blocked: true, reason: 'NO_APPROVAL_CANDIDATES', decisions: [] });
  const decisions = pairs.map(pair => validateCompositeCandidate(pair, sourceRecords, targetRecords, policy));
  const rejected = decisions.find(result => !result.applicable || !result.valid);
  return Object.freeze({
    blocked: Boolean(rejected),
    reason: rejected?.reason || '',
    decisions: Object.freeze(decisions),
  });
}
