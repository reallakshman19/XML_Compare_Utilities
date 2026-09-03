import { CII_WRITER_2_NODENAME_RELOCATION_POLICY } from './cii-workspace-writer2-nodename-relocation.js';
import { createCiiTransferScopeSelection } from './cii-workspace-transfer-scope.js';
import {
  assertCiiMsBm001Authority,
  ciiMsBm001GroupedKey,
  parseCiiMsBm001,
} from './cii-workspace-multisource-nodename-authority.js';

const NODE_PROPERTY = 'Node name / to-name';
const APPROVED = new Set(['REVIEWED', 'LOCKED']);
function text(value) { return String(value ?? '').trim(); }
function bm001GroupSet() {
  return new Set(parseCiiMsBm001().map((row) => ciiMsBm001GroupedKey(row.sourceNames, row.targetName)));
}
export function ciiExpectedNodeNameOperation(operation, expectedGroups = bm001GroupSet()) {
  const acceptance = operation?.bm001Acceptance;
  return operation?.family === 'NODE_NAME'
    && operation?.property === NODE_PROPERTY
    && ['CREATE', 'DELETE'].includes(operation?.action)
    && operation?.status === 'PREVIEW_READY'
    && operation?.policyAuthority === CII_WRITER_2_NODENAME_RELOCATION_POLICY
    && APPROVED.has(operation?.matchAuthority?.status)
    && acceptance?.benchmark === 'BM-001'
    && acceptance?.status === 'BOUND'
    && expectedGroups.has(text(acceptance?.groupedKey));
}
export async function createCiiExpectedNodeNameSourceSetSelection(plan, options = {}) {
  const sourceSetSha256 = text(plan?.sourceSetSha256 || plan?.sourceAuthority?.sourceSetSha256);
  const targetSha256 = text(plan?.targetAuthority?.originalSha256);
  const authority = await assertCiiMsBm001Authority(sourceSetSha256, targetSha256, options.cryptoRef);
  const expectedGroups = new Set(authority.rows.map((row) => ciiMsBm001GroupedKey(row.sourceNames, row.targetName)));
  const decisions = {};
  const candidates = [...(plan?.operations || []), ...(plan?.excludedOperations || [])];
  const seen = new Set(); const applied = []; const excluded = [];
  for (const operation of candidates) {
    const id = text(operation?.operationId); if (!id || seen.has(id) || operation?.action === 'KEEP') continue; seen.add(id);
    if (ciiExpectedNodeNameOperation(operation, expectedGroups)) { decisions[id] = 'APPLY'; applied.push(id); }
    else { decisions[id] = 'EXCLUDE'; excluded.push(id); }
  }
  if (!applied.length) throw new Error('CII_MS_EXPECTED_NODENAME_NO_APPLY_OPERATIONS');
  const selection = createCiiTransferScopeSelection(plan, decisions);
  return Object.freeze({
    selection,
    authority: Object.freeze({ benchmark: 'BM-001', rowCount: authority.rowCount, sha256: authority.sha256 }),
    appliedOperationIds: Object.freeze(applied.sort()),
    excludedOperationIds: Object.freeze(excluded.sort()),
  });
}

export const _test = Object.freeze({ bm001GroupSet });
