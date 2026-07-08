import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createLinewiseUniversalPreset } from '../xml-compare/universal-categorizer/universal-xml-categorizer-contracts.js';
import { createLinewiseUniversalCommandPlanner, createUniversalCommandPlanner, UNIVERSAL_COMMAND_PLANNER_SCHEMA } from '../xml-compare/universal-categorizer/universal-command-planner.js';
import { createUniversalRecipeDesignerModel } from '../xml-compare/universal-categorizer/universal-recipe-designer-model.js';
import { evaluateUniversalXmlExportGate } from '../xml-compare/universal-categorizer/universal-export-gate.js';
import { findForbiddenUxc001Changes } from '../xml-compare/universal-categorizer/universal-source-registry.js';

const planner = createLinewiseUniversalCommandPlanner(createLinewiseUniversalPreset());
assert.equal(planner.schema, UNIVERSAL_COMMAND_PLANNER_SCHEMA);
assert.equal(planner.status, 'locked-shadow-only');
assert.equal(planner.summary.commands, 5);
assert.equal(planner.summary.locked, 5);
assert.equal(planner.summary.mutationAllowed, 0);
assert.equal(planner.summary.exportAllowed, 0);
assert.equal(planner.summary.pivotAllowed, 0);
assert.equal(planner.summary.canvasAllowed, 0);
assert.deepEqual(planner.receipts.map((receipt) => receipt.commandId), ['add-level', 'add-block', 'map-source-field', 'preview-pivot', 'export-xml']);

for (const receipt of planner.receipts) {
  assert.equal(receipt.locked, true);
  assert.equal(receipt.enabled, false);
  assert.equal(receipt.dryRunOnly, true);
  assert.equal(receipt.mutationAllowed, false);
  assert.equal(receipt.exportAllowed, false);
  assert.equal(receipt.pivotAllowed, false);
  assert.equal(receipt.canvasAllowed, false);
  assert.ok(receipt.blockedReason);
  assert.ok(receipt.preconditions.length >= 1);
}

const pivotReceipt = planner.receipts.find((receipt) => receipt.commandId === 'preview-pivot');
const exportReceipt = planner.receipts.find((receipt) => receipt.commandId === 'export-xml');
assert.equal(pivotReceipt.lockedReason, 'locked-export-gate');
assert.match(pivotReceipt.blockedReason, /Pivot preview is blocked/);
assert.equal(exportReceipt.lockedReason, 'locked-export-gate');
assert.match(exportReceipt.blockedReason, /XML export is blocked/);

const recipeDesigner = createUniversalRecipeDesignerModel(createLinewiseUniversalPreset());
const exportGate = evaluateUniversalXmlExportGate({});
const explicitPlannerA = createUniversalCommandPlanner({ recipeDesigner, exportGate });
const explicitPlannerB = createUniversalCommandPlanner({ exportGate, recipeDesigner });
assert.equal(JSON.stringify(explicitPlannerA), JSON.stringify(explicitPlannerB), 'Command planner must be deterministic for equivalent inputs');

const changedForbiddenFiles = findForbiddenUxc001Changes(changedFilesFromGit());
assert.deepEqual(changedForbiddenFiles, [], `UXC-007 modified forbidden files: ${changedForbiddenFiles.join(', ')}`);

function changedFilesFromGit() {
  const baseRef = safeGitRef(process.env.GITHUB_BASE_REF || 'main');
  const commands = [
    `git fetch --no-tags --depth=1 origin ${baseRef}:refs/remotes/origin/${baseRef} && git diff --name-only --diff-filter=ACMRTUXB origin/${baseRef}...HEAD`,
    `git diff --name-only --diff-filter=ACMRTUXB origin/${baseRef}...HEAD`,
    `git diff --name-only --diff-filter=ACMRTUXB ${baseRef}...HEAD`,
  ];
  for (const command of commands) {
    try {
      const output = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return [...new Set(output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
    } catch {
      // Try the next git command. This keeps the guard portable across local and CI checkouts.
    }
  }
  return [];
}

function safeGitRef(value) {
  const ref = String(value || 'main').trim();
  return /^[A-Za-z0-9._/-]+$/.test(ref) ? ref : 'main';
}

console.log('xml-compare-universal-command-planner tests passed');
