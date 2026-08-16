import assert from 'assert';
import { attemptCiiTargetApply, canExportModifiedTargetCii, createCiiWorkspaceStageModel } from '../tabs/cii-workspace/cii-workspace-placeholders.js';

const stages = createCiiWorkspaceStageModel();
assert.strictEqual(stages.length, 7);
const stage06 = stages.find((stage) => stage.id === '06');
assert.strictEqual(stage06.status, 'NOT_IMPLEMENTED');
assert.strictEqual(stage06.actionEnabled, false);
assert(stage06.blockers.length > 0);
assert.strictEqual(stages.find((stage) => stage.id === '07').modifiedTargetCiiExportEnabled, false);
assert.strictEqual(canExportModifiedTargetCii(), false);
assert.throws(() => attemptCiiTargetApply({ schema: 'CIIWorkspaceTransferPlan.v1', status: 'READY' }, Symbol('forged')), /CII_APPLY_AUTHORITY_REQUIRED/);
assert(!JSON.stringify(stages).includes('"status":"READY"'));
console.log('CII Workspace placeholder gate checks passed.');
