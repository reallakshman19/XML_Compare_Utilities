import { convertSupportRevisionPair } from './support-revision-pipeline.js';
import { buildSupportRevisionModel } from './support-revision-model.js';
import { buildSupportRevisionLineage } from './support-revision-lineage.js';
import { attachLineageEligibility, buildLineageEligibleModel } from './support-revision-lineage-eligibility.js';
import { resolveReviewedLineage } from './support-revision-review.js';
import { buildSupportRevisionEventLedger } from './support-revision-events.js';
import { renderSupportRevisionRemarks } from './support-revision-remarks.js';
import { buildRevisionOutputMatrix, buildSupportRevisionArtifacts } from './support-revision-export.js';
import { SUPPORT_REV_COMPARE_POLICY_V1 } from './support-revision-normalization.js';

export const SUPPORT_REVISION_ENGINE_SCHEMA = 'support-revision-xml-compare-engine/v1';

export function runSupportRevisionCompare(revision1Text, revision2Text, options = {}) {
  const policy = options.policy || SUPPORT_REV_COMPARE_POLICY_V1;
  const pair = convertSupportRevisionPair(revision1Text, revision2Text, options);
  if (!pair.ok) return Object.freeze({
    schema: SUPPORT_REVISION_ENGINE_SCHEMA,
    ok: false,
    stage: 'CONVERSION_BLOCKED',
    pair,
    diagnostics: pair.diagnostics,
  });
  const sourceModel = buildSupportRevisionModel(pair.rev1);
  const targetModel = buildSupportRevisionModel(pair.rev2);
  const sourceEligibility = buildLineageEligibleModel(sourceModel);
  const targetEligibility = buildLineageEligibleModel(targetModel);
  const rawLineage = buildSupportRevisionLineage(sourceEligibility.model, targetEligibility.model, { policy });
  const initialLineage = attachLineageEligibility(rawLineage, sourceEligibility, targetEligibility);
  const lineage = resolveReviewedLineage(initialLineage, sourceModel, targetModel, options.reviewDecisions || [], { policy });
  const ledger = buildSupportRevisionEventLedger(sourceModel, targetModel, lineage, { policy });
  const remarks = renderSupportRevisionRemarks(ledger, sourceModel, targetModel);
  const output = buildRevisionOutputMatrix(pair.rev1.source, pair.rev2.source, remarks);
  const result = {
    schema: SUPPORT_REVISION_ENGINE_SCHEMA,
    ok: lineage.ambiguous.length === 0,
    stage: lineage.ambiguous.length ? 'REVIEW_REQUIRED' : 'READY_TO_EXPORT',
    policyId: policy.policyId,
    pair,
    sourceModel,
    targetModel,
    lineage,
    ledger,
    remarks,
    output,
  };
  return Object.freeze({ ...result, artifacts: buildSupportRevisionArtifacts(result) });
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
