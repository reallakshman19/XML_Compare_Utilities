import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { normalizeUniversalCategorizerProfile } from '../xml-compare/universal-categorizer/universal-xml-categorizer-contracts.js';
import { createUniversalAttachmentPreview } from '../xml-compare/universal-categorizer/universal-attachment-preview.js';
import { createUniversalSourceRegistry } from '../xml-compare/universal-categorizer/universal-source-registry.js';
import { createLinewiseUniversalStructureRecipeBridgeModel, createUniversalStructureRecipeBridge, findForbiddenUxc002Changes, isForbiddenUxc002File } from '../xml-compare/universal-categorizer/universal-structure-recipe-bridge.js';

const profile = normalizeUniversalCategorizerProfile({
  profileId: 'uxc-structure-recipe-bridge-test',
  sources: [
    { sourceId: 'mainXml', role: 'primary', sourceKind: 'xml' },
    { sourceId: 'coordLookup', role: 'sideload', requiredColumns: ['NODE', 'GLOBAL_X'] },
    { sourceId: 'lineLookup', role: 'sideload', requiredColumns: ['FROM_NODE', 'TO_NODE', 'LINE_ID'] },
  ],
  levelDefinitions: [
    { levelId: 'documentRoot', displayName: 'DocumentRoot', children: ['element'] },
    { levelId: 'element', displayName: 'Element', children: ['node'] },
    { levelId: 'node', displayName: 'Node' },
  ],
  blockDefinitions: [
    { blockName: 'LineBlock', attachToLevelId: 'element' },
    { blockName: 'DerivedCoordinateBlock', attachToLevelId: 'node' },
  ],
  sideloadAttachments: [
    { ruleId: 'line-to-element', sourceId: 'lineLookup', attachToLevelId: 'element', sourceKey: 'FROM_NODE+TO_NODE', targetKey: 'elementKey', blockName: 'LineBlock', mode: 'enrich-existing' },
    { ruleId: 'coord-to-node', sourceId: 'coordLookup', attachToLevelId: 'node', sourceKey: 'NODE', targetKey: 'nodeNumber', blockName: 'DerivedCoordinateBlock', mode: 'create-block' },
  ],
});

const registry = createUniversalSourceRegistry(profile, {
  mainXml: { columns: ['DocumentRoot'] },
  coordLookup: { rows: [{ NODE: '10', GLOBAL_X: '1000' }] },
  lineLookup: { rows: [{ FROM_NODE: '10', TO_NODE: '20', LINE_ID: 'LINE-100' }] },
});

const attachmentPreview = createUniversalAttachmentPreview({
  profile,
  registry,
  targetRows: [
    { levelId: 'element', elementKey: '10+20', label: 'Element 10-20' },
    { levelId: 'node', nodeNumber: '10', label: 'Node 10' },
  ],
});

const bridge = createUniversalStructureRecipeBridge({ profile, registry, attachmentPreview, selectedLevelId: 'node' });
assert.equal(bridge.schema, 'universal-structure-recipe-bridge/v1-shadow');
assert.equal(bridge.profileId, 'uxc-structure-recipe-bridge-test');
assert.equal(bridge.status, 'ready');
assert.equal(bridge.selectedLevel.levelId, 'node');
assert.equal(bridge.recipeInputModel.sources.length, 3);
assert.equal(bridge.recipeInputModel.levels.length, 3);
assert.equal(bridge.registrySummary.sideloadSources, 2);
assert.equal(bridge.attachmentSummary.rules, 2);
assert.equal(bridge.attachmentSummary.matched, 2);

const elementCandidate = bridge.levelCandidates.find((level) => level.levelId === 'element');
assert.equal(elementCandidate.depth, 1);
assert.deepEqual(elementCandidate.blockNames, ['LineBlock']);
assert.equal(elementCandidate.resolverPreview.status, 'ready');
assert.deepEqual(elementCandidate.resolverPreview.targetKeyCandidates, ['elementKey']);
assert.deepEqual(elementCandidate.resolverPreview.sourceResolverRows[0].sourceKeyFields, ['FROM_NODE', 'TO_NODE']);
assert.equal(elementCandidate.attachmentTargetPreview.ruleTargets[0].matchedCount, 1);

const nodeCandidate = bridge.levelCandidates.find((level) => level.levelId === 'node');
assert.equal(nodeCandidate.depth, 2);
assert.deepEqual(nodeCandidate.blockNames, ['DerivedCoordinateBlock']);
assert.deepEqual(nodeCandidate.resolverPreview.targetKeyCandidates, ['nodeNumber']);
assert.equal(nodeCandidate.attachmentTargetPreview.ruleTargets[0].blockResolvedAtLevel, true);
assert.ok(nodeCandidate.sourceFieldCandidates.some((source) => source.sourceId === 'coordLookup' && source.fields.some((field) => field.field === 'NODE' && field.usedAsSourceKey && field.suggestedForLevel)));

const linewiseBridge = createLinewiseUniversalStructureRecipeBridgeModel();
assert.ok(linewiseBridge.levelCandidates.some((level) => level.levelId === 'element' && level.resolverPreview.targetKeyCandidates.includes('elementKey')));
assert.ok(linewiseBridge.levelCandidates.some((level) => level.levelId === 'node' && level.attachmentTargetPreview.ruleTargets.some((rule) => rule.ruleId === 'coordinates-to-node')));

const invalidProfile = normalizeUniversalCategorizerProfile({
  profileId: 'uxc-structure-recipe-invalid-test',
  sources: [
    { sourceId: 'coordLookup', role: 'sideload', requiredColumns: ['NODE'] },
  ],
  levelDefinitions: [
    { levelId: 'node', displayName: 'Node' },
    { levelId: 'node', displayName: 'Node duplicate' },
  ],
  blockDefinitions: [
    { blockName: 'WrongBlock', attachToLevelId: 'missingLevel' },
    { blockName: 'OtherBlock', attachToLevelId: 'node' },
  ],
  sideloadAttachments: [
    { ruleId: 'bad-coord-to-node', sourceId: 'coordLookup', attachToLevelId: 'node', sourceKey: 'NODE+MISSING_FIELD', targetKey: 'nodeNumber', blockName: 'WrongBlock', mode: 'create-block' },
  ],
});
const invalidRegistry = createUniversalSourceRegistry(invalidProfile, { coordLookup: { rows: [{ NODE: '10' }] } });
const invalidBridge = createUniversalStructureRecipeBridge({ profile: invalidProfile, registry: invalidRegistry, targetRows: [{ levelId: 'node', nodeNumber: '10' }] });
assert.equal(invalidBridge.status, 'blocked');
assert.ok(invalidBridge.diagnostics.some((item) => item.code === 'UXC_RECIPE_LEVEL_ID_DUPLICATE'));
assert.ok(invalidBridge.diagnostics.some((item) => item.code === 'UXC_RECIPE_BLOCK_TARGET_INVALID'));
assert.ok(invalidBridge.diagnostics.some((item) => item.code === 'UXC_RECIPE_SOURCE_KEY_FIELDS_MISSING'));
assert.ok(invalidBridge.diagnostics.some((item) => item.code === 'UXC_RECIPE_ATTACHMENT_BLOCK_TARGET_INVALID'));

assert.equal(isForbiddenUxc002File('xml-compare/universal-categorizer/universal-structure-recipe-bridge.js'), false);
assert.equal(isForbiddenUxc002File('xml-compare/universal-categorizer/universal-xml-categorizer-shell.js'), false);
assert.equal(isForbiddenUxc002File('tests/xml-compare-universal-structure-recipe-bridge.test.js'), false);
assert.equal(isForbiddenUxc002File('package.json'), false);
assert.equal(isForbiddenUxc002File('xml-compare/table-categorizer/table-categorized-xml-controller.js'), true);
assert.equal(isForbiddenUxc002File('tabs/xml-compare-table-categorized-runtime.js'), true);
assert.deepEqual(findForbiddenUxc002Changes(['package.json', 'xml-compare/universal-categorizer/universal-structure-recipe-bridge.js']), []);

const changedForbiddenFiles = findForbiddenUxc002Changes(changedFilesFromGit());
assert.deepEqual(changedForbiddenFiles, [], `UXC-002 modified forbidden files: ${changedForbiddenFiles.join(', ')}`);

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

console.log('xml-compare-universal-structure-recipe-bridge tests passed');
