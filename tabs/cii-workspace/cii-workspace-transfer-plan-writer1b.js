import { deepFreeze } from './cii-workspace-contracts.js';
import { createCiiTransferPreview } from './cii-workspace-transfer-plan.js';

export function createCiiWriter1BTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review, engineeringDeltas, options = {}) {
  const plan = createCiiTransferPreview(sourceDocument, targetDocument, sourceGraph, targetGraph, correspondence, review, engineeringDeltas, options);
  if (plan?.mutationAuthority === 'BLOCKED') return plan;
  return deepFreeze({
    ...plan,
    mutationAuthority: 'WRITER_1B_CONDITIONAL',
    policy: deepFreeze({
      geometryProtected: true,
      nodeNumberProtected: true,
      topologyProtected: true,
      odProtected: 'CONDITIONAL_WRITER_1B_PLAIN_PIPE_NO_REDUCER',
      wallProtected: false,
      processDefault: 'WRITER_1B_EXACT_FIXED_FIELDS_ONLY',
      restraintCardinality: 'EXISTING_24_ROW_BLOCK_ONE_SLOT_STEP_ONLY',
      sifTeeMutation: 'BLOCKED_SEMANTICS_UNQUALIFIED',
    }),
  });
}
