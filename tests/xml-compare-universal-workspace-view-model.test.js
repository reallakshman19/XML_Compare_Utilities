import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createLinewiseUniversalWorkspaceViewModel, createUniversalWorkspaceViewModel, UNIVERSAL_WORKSPACE_VIEW_MODEL_SCHEMA } from '../xml-compare/universal-categorizer/universal-workspace-view-model.js';
import { createLinewiseUniversalPreset, normalizeUniversalCategorizerProfile } from '../xml-compare/universal-categorizer/universal-xml-categorizer-contracts.js';
import { createUniversalSourceRegistry, findForbiddenUxc001Changes } from '../xml-compare/universal-categorizer/universal-source-registry.js';
import { createUniversalAttachmentPreview } from '../xml-compare/universal-categorizer/universal-attachment-preview.js';
import { createUniversalCategorizedGraphPreview } from '../xml-compare/universal-categorizer/universal-graph-builder.js';
import { evaluateUniversalXmlExportGate } from '../xml-compare/universal-categorizer/universal-export-gate.js';

const linewise = createLinewiseUniversalWorkspaceViewModel(createLinewiseUniversalPreset());
assert.equal(linewise.schema, UNIVERSAL_WORKSPACE_VIEW_MODEL_SCHEMA);
assert.equal(linewise.eyebrow, 'Universal Categorizer Workspace');
assert.equal(linewise.statusChips.some((chip) => chip.label === 'Shadow mode'), true);
assert.deepEqual(linewise.workflowSteps.map((step) => step.title), ['Source Registry', 'Attachment Rules', 'Graph Preview', 'Export Gate']);
assert.equal(linewise.readinessCards.some((card) => card.label === 'Export' && card.value === 'Locked'), true);
assert.equal(linewise.recipe.title, 'Structure Recipe Builder bridge');
assert.ok(linewise.recipe.levels.length >= 1);
assert.ok(linewise.sources.rows.some((source) => source.sourceId === 'coordinateLookup'));
assert.ok(linewise.attachments.rows.some((rule) => rule.ruleId === 'coordinate-to-node'));
assert.equal(linewise.graph.title, 'CategorizedGraph.v1 preview');
assert.equal(linewise.exportGate.title, 'XML export gate');
assert.equal(linewise.exportGate.blocked, true);
assert.equal(linewise.boundary.items.some((item) => item.includes('No existing converter')), true);

const actionLabels = linewise.designerActions.map((action) => action.label);
assert.deepEqual(actionLabels, ['Add level', 'Add block', 'Map source field', 'Preview pivot', 'Export XML']);
for (const action of linewise.designerActions) {
  assert.equal(action.enabled, false);
  assert.equal(action.locked, true);
  assert.ok(action.lockedReason);
}

const profile = normalizeUniversalCategorizerProfile({
  profileId: 'uxc-workspace-vm-test',
  sources: [
    { sourceId: 'mainXml', role: 'primary', sourceKind: 'xml' },
    { sourceId: 'coordLookup', role: 'sideload', requiredColumns: ['NODE', 'GLOBAL_X'] },
  ],
  levelDefinitions: [
    { levelId: 'root', displayName: 'Root', children: ['node'] },
    { levelId: 'node', displayName: 'Node' },
  ],
  blockDefinitions: [
    { blockName: 'CoordinateBlock', attachToLevelId: 'node' },
  ],
  sideloadAttachments: [
    { ruleId: 'coord-to-node', sourceId: 'coordLookup', attachToLevelId: 'node', sourceKey: 'NODE', targetKey: 'nodeNumber', blockName: 'CoordinateBlock', mode: 'create-block', fieldBindings: [{ sourceField: 'GLOBAL_X', targetField: 'x' }] },
  ],
});
const sourceInputsA = {
  mainXml: { columns: ['DocumentRoot'] },
  coordLookup: { rows: [{ GLOBAL_X: '1000', NODE: '10' }] },
};
const sourceInputsB = {
  coordLookup: { rows: [{ NODE: '10', GLOBAL_X: '1000' }] },
  mainXml: { columns: ['DocumentRoot'] },
};
const targetRows = [{ nodeNumber: '10', levelId: 'node', label: 'Node 10' }];

function makeVm(sourceInputs) {
  const registry = createUniversalSourceRegistry(profile, sourceInputs);
  const attachmentPreview = createUniversalAttachmentPreview({ profile, registry, targetRows });
  const graph = createUniversalCategorizedGraphPreview({ profile, registry, targetRows });
  const exportGate = evaluateUniversalXmlExportGate({ graph });
  return createUniversalWorkspaceViewModel({ profile, registry, attachmentPreview, graph, exportGate });
}

const vmA = makeVm(sourceInputsA);
const vmB = makeVm(sourceInputsB);
assert.equal(JSON.stringify(vmA), JSON.stringify(vmB), 'Workspace view model must be deterministic for equivalent inputs');
assert.equal(vmA.sources.rows[1].status, 'Ready');
assert.equal(vmA.attachments.rows[0].matched, 1);
assert.equal(vmA.graph.rows[0].blocks, 'CoordinateBlock');
assert.equal(vmA.exportGate.allowed, false);

const changedForbiddenFiles = findForbiddenUxc001Changes(changedFilesFromGit());
assert.deepEqual(changedForbiddenFiles, [], `UXC-005 modified forbidden files: ${changedForbiddenFiles.join(', ')}`);

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

console.log('xml-compare-universal-workspace-view-model tests passed');
