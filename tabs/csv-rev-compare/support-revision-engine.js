import { convertSupportRevisionPair } from './support-revision-pipeline.js';
import { buildSupportRevisionModel } from './support-revision-model.js';
import { buildSupportRevisionLineage } from './support-revision-lineage.js';
import { resolveReviewedLineage, unresolvedLineageReviews } from './support-revision-review.js';
import { buildSupportRevisionEventLedger } from './support-revision-events.js';
import { renderSupportRevisionRemarks, SUPPORT_REV_REMARKS_V1 } from './support-revision-remarks.js';
import { buildRevisionOutputMatrix, buildSupportRevisionArtifacts } from './support-revision-export.js';
import { SUPPORT_REV_COMPARE_POLICY_V1 } from './support-revision-normalization.js';
import { SUPPORT_REV_LOAD_POLICY_V1 } from './support-revision-loads.js';

export const SUPPORT_REVISION_ENGINE_SCHEMA = 'support-revision-xml-compare-engine/v1';

export function runSupportRevisionCompare(revision1Text, revision2Text, options = {}) {
  const comparisonPolicy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const loadPolicy = options.loadPolicy || SUPPORT_REV_LOAD_POLICY_V1;
  const remarkPolicy = options.remarkPolicy || SUPPORT_REV_REMARKS_V1;
  const pair = convertSupportRevisionPair(revision1Text, revision2Text, options);
  if (!pair.ok) return conversionBlocked(pair, comparisonPolicy, loadPolicy, remarkPolicy);

  const sourceModel = buildSupportRevisionModel(pair.rev1);
  const targetModel = buildSupportRevisionModel(pair.rev2);
  const initialLineage = buildSupportRevisionLineage(sourceModel, targetModel, { policy: comparisonPolicy });
  const lineage = resolveReviewedLineage(initialLineage, sourceModel, targetModel, options.reviewDecisions || [], { policy: comparisonPolicy });
  const unresolvedReviews = unresolvedLineageReviews(lineage);
  const ledger = buildSupportRevisionEventLedger(sourceModel, targetModel, lineage, {
    policyId: comparisonPolicy.policyId,
    loadPolicy,
  });
  const remarks = renderSupportRevisionRemarks(ledger, sourceModel, targetModel, remarkPolicy);
  const output = buildRevisionOutputMatrix(pair.rev1.source, pair.rev2.source, remarks);
  const exportReady = unresolvedReviews.count === 0 && !(lineage.reviewDiagnostics || []).some((item) => item.severity === 'blocker');
  const core = Object.freeze({
    schema: SUPPORT_REVISION_ENGINE_SCHEMA,
    ok: exportReady,
    stage: exportReady ? 'READY_TO_EXPORT' : 'REVIEW_REQUIRED',
    exportReady,
    policyId: comparisonPolicy.policyId,
    loadPolicyId: loadPolicy.policyId,
    remarkPolicyId: remarkPolicy.policyId,
    pair,
    sourceModel,
    targetModel,
    initialLineage,
    lineage,
    unresolvedReviews,
    ledger,
    remarks,
    output,
    diagnostics: Object.freeze([
      ...(pair.diagnostics || []),
      ...(lineage.reviewDiagnostics || []),
    ]),
  });
  return Object.freeze({ ...core, artifacts: buildSupportRevisionArtifacts(core) });
}

function conversionBlocked(pair, comparisonPolicy, loadPolicy, remarkPolicy) {
  return Object.freeze({
    schema: SUPPORT_REVISION_ENGINE_SCHEMA,
    ok: false,
    stage: 'CONVERSION_BLOCKED',
    exportReady: false,
    policyId: comparisonPolicy.policyId,
    loadPolicyId: loadPolicy.policyId,
    remarkPolicyId: remarkPolicy.policyId,
    pair,
    diagnostics: pair.diagnostics,
  });
}

export const SUPPORT_REVISION_WORKFLOW_STAGES = Object.freeze([
  'Load Revision 1',
  'Load Revision 2',
  'Validate table schemas',
  'Convert Revision 1 to categorized XML',
  'Convert Revision 2 to categorized XML',
  'Inspect conversion diagnostics',
  'Generate Source/Target candidate pairs',
  'Review ambiguous lineage',
  'Build revision lineage graph',
  'Normalize coordinate frame',
  'Detect common-support topology',
  'Compare support components',
  'Compare load vectors',
  'Produce structured events',
  'Render human remarks',
  'Preview revision output',
  'Export CSV/XLSX/audit/XML/profile artifacts',
]);
