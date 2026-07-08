import { createLinewiseUniversalPreset, normalizeUniversalCategorizerProfile } from './universal-xml-categorizer-contracts.js';
import { createUniversalAttachmentPreview, createLinewiseUniversalTargetPreviewRows } from './universal-attachment-preview.js';
import { parseUniversalKeyFields, uniqueText } from './universal-field-catalog.js';
import { createLinewiseUniversalSourcePreviewInputs, createUniversalSourceRegistry } from './universal-source-registry.js';

export const UNIVERSAL_STRUCTURE_RECIPE_BRIDGE_SCHEMA = 'universal-structure-recipe-bridge/v1-shadow';

export const UXC_002_ALLOWED_FILES = Object.freeze([
  'package.json',
  'xml-compare/universal-categorizer/universal-xml-categorizer-shell.js',
]);

export const UXC_002_ALLOWED_PREFIXES = Object.freeze([
  'xml-compare/universal-categorizer/',
  'tests/xml-compare-universal-',
]);

const freeze = (value) => Object.freeze(value);
const arr = (value) => Array.isArray(value) ? value : [];
const text = (value, fallback = '') => String(value ?? fallback).trim();

export function createUniversalStructureRecipeBridge(input = {}) {
  const profile = normalizeUniversalCategorizerProfile(input.profile || input.profileInput || createLinewiseUniversalPreset());
  const registry = isUniversalSourceRegistry(input.registry)
    ? input.registry
    : createUniversalSourceRegistry(profile, input.sourceInputs || input.sources || createLinewiseUniversalSourcePreviewInputs());
  const targetRows = arr(input.targetRows || input.targets || input.attachmentPreview?.targetRows || createLinewiseUniversalTargetPreviewRows());
  const attachmentPreview = input.attachmentPreview?.schema === 'universal-attachment-preview/v1-shadow'
    ? input.attachmentPreview
    : createUniversalAttachmentPreview({ profile, registry, targetRows });
  const levelIds = profile.levelDefinitions.map((level) => level.levelId);
  const duplicateLevelIds = findDuplicates(levelIds);
  const duplicateLevelDiagnostics = duplicateLevelIds.map((levelId) => diagnostic('error', 'UXC_RECIPE_LEVEL_ID_DUPLICATE', levelId, `Duplicate structure recipe level id "${levelId}".`));
  const invalidBlockTargetDiagnostics = findInvalidBlockTargetDiagnostics(profile, levelIds);
  const parentByLevelId = createParentIndex(profile.levelDefinitions);
  const levelCandidates = profile.levelDefinitions.map((level) => buildLevelCandidate({ level, profile, registry, attachmentPreview, parentByLevelId }));
  const levelDiagnostics = levelCandidates.flatMap((level) => level.diagnostics || []);
  const diagnostics = freeze([...duplicateLevelDiagnostics, ...invalidBlockTargetDiagnostics, ...levelDiagnostics]);
  const selectedLevelId = text(input.selectedLevelId, profile.levelDefinitions[0]?.levelId || '');

  return freeze({
    schema: UNIVERSAL_STRUCTURE_RECIPE_BRIDGE_SCHEMA,
    profileId: profile.profileId,
    selectedLevelId,
    recipeInputModel: createRecipeInputModel(profile, registry),
    levelCandidates: freeze(levelCandidates),
    selectedLevel: levelCandidates.find((level) => level.levelId === selectedLevelId) || levelCandidates[0] || null,
    registrySummary: freeze({
      sources: registry.sources.length,
      primarySources: registry.primarySources.length,
      sideloadSources: registry.sideloadSources.length,
      fields: registry.sources.reduce((sum, source) => sum + source.columns.length, 0),
      diagnostics: registry.diagnostics.length,
    }),
    attachmentSummary: freeze({
      rules: attachmentPreview.rules.length,
      matched: attachmentPreview.totals?.matched || 0,
      missingTargets: attachmentPreview.totals?.missingTargets || 0,
      unmatchedSources: attachmentPreview.totals?.unmatchedSources || 0,
    }),
    diagnostics,
    status: diagnostics.some((item) => item.severity === 'error') ? 'blocked' : diagnostics.length ? 'diagnostic' : 'ready',
  });
}

export function createLinewiseUniversalStructureRecipeBridgeModel(profile = createLinewiseUniversalPreset()) {
  const normalizedProfile = normalizeUniversalCategorizerProfile(profile || createLinewiseUniversalPreset());
  const sourceInputs = createLinewiseUniversalSourcePreviewInputs();
  const targetRows = createLinewiseUniversalTargetPreviewRows();
  const registry = createUniversalSourceRegistry(normalizedProfile, sourceInputs);
  const attachmentPreview = createUniversalAttachmentPreview({ profile: normalizedProfile, registry, targetRows });
  return createUniversalStructureRecipeBridge({ profile: normalizedProfile, registry, attachmentPreview, targetRows });
}

export function findForbiddenUxc002Changes(paths = []) {
  return freeze(arr(paths).map((path) => text(path)).filter(isForbiddenUxc002File));
}

export function isForbiddenUxc002File(path = '') {
  const normalized = text(path).replaceAll('\\', '/');
  if (!normalized) return false;
  if (UXC_002_ALLOWED_FILES.includes(normalized)) return false;
  if (UXC_002_ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  return true;
}

function createRecipeInputModel(profile, registry) {
  return freeze({
    schema: 'UniversalStructureRecipeInput.v1-shadow',
    profileId: profile.profileId,
    sources: freeze(registry.sources.map((source) => freeze({
      sourceId: source.sourceId,
      displayName: source.displayName,
      role: source.role,
      sourceKind: source.sourceKind,
      rowCount: source.rowCount,
      columns: source.columns,
      requiredColumns: source.requiredColumns,
      missingRequiredColumns: source.missingRequiredColumns,
      status: source.status,
    }))),
    levels: freeze(profile.levelDefinitions.map((level) => freeze({
      levelId: level.levelId,
      displayName: level.displayName,
      childLevelIds: freeze(arr(level.children)),
      blockNames: freeze(profile.blockDefinitions.filter((block) => block.attachToLevelId === level.levelId).map((block) => block.blockName)),
      attachmentRuleIds: freeze(profile.sideloadAttachments.filter((rule) => rule.attachToLevelId === level.levelId).map((rule) => rule.ruleId)),
    }))),
    blocks: freeze(profile.blockDefinitions.map((block) => freeze({
      blockName: block.blockName,
      attachToLevelId: block.attachToLevelId,
      createMode: block.createMode,
    }))),
    attachments: freeze(profile.sideloadAttachments.map((rule) => freeze({
      ruleId: rule.ruleId,
      sourceId: rule.sourceId,
      attachToLevelId: rule.attachToLevelId,
      blockName: rule.blockName,
      sourceKey: rule.sourceKey,
      targetKey: rule.targetKey,
      mode: rule.mode,
    }))),
  });
}

function buildLevelCandidate({ level, profile, registry, attachmentPreview, parentByLevelId }) {
  const childLevelIds = freeze(arr(level.children));
  const blocks = profile.blockDefinitions.filter((block) => block.attachToLevelId === level.levelId);
  const rules = profile.sideloadAttachments.filter((rule) => rule.attachToLevelId === level.levelId);
  const previewRules = attachmentPreview.rules.filter((rule) => rule.targetLevelId === level.levelId);
  const resolverPreview = createLevelResolverPreview(level, rules, registry);
  const attachmentTargetPreview = createLevelAttachmentTargetPreview(level, blocks, rules, previewRules);
  const sourceFieldCandidates = createSourceFieldCandidates(level, registry, rules);
  const diagnostics = freeze([...resolverPreview.diagnostics, ...attachmentTargetPreview.diagnostics]);
  const status = diagnostics.some((item) => item.severity === 'error') ? 'blocked' : diagnostics.length ? 'diagnostic' : (rules.length || blocks.length ? 'ready' : 'structure-only');

  return freeze({
    schema: 'UniversalStructureLevelCandidate.v1-shadow',
    levelId: level.levelId,
    displayName: level.displayName,
    depth: computeLevelDepth(level.levelId, parentByLevelId),
    childLevelIds,
    blockNames: freeze(blocks.map((block) => block.blockName)),
    sourceFieldCandidates,
    resolverPreview,
    attachmentTargetPreview,
    diagnostics,
    status,
  });
}

function createLevelResolverPreview(level, rules, registry) {
  const sourceResolverRows = rules.map((rule) => {
    const source = registry.sourceMap?.[rule.sourceId] || null;
    const sourceKeyFields = parseUniversalKeyFields(rule.sourceKey);
    const missingSourceKeyFields = source ? sourceKeyFields.filter((field) => !source.columns.includes(field)) : sourceKeyFields;
    return freeze({
      ruleId: rule.ruleId,
      sourceId: rule.sourceId,
      sourceResolved: Boolean(source),
      sourceKey: rule.sourceKey,
      sourceKeyFields,
      missingSourceKeyFields: freeze(missingSourceKeyFields),
      targetKey: rule.targetKey,
      blockName: rule.blockName,
      mode: rule.mode,
      status: !source ? 'missing-source' : missingSourceKeyFields.length ? 'missing-key-fields' : 'ready',
    });
  });
  const diagnostics = sourceResolverRows.flatMap((row) => [
    ...(!row.sourceResolved ? [diagnostic('error', 'UXC_RECIPE_RESOLVER_SOURCE_NOT_FOUND', row.ruleId, `Resolver for level "${level.levelId}" references missing source "${row.sourceId}".`)] : []),
    ...(row.missingSourceKeyFields.length ? [diagnostic('error', 'UXC_RECIPE_SOURCE_KEY_FIELDS_MISSING', row.ruleId, `Resolver for level "${level.levelId}" is missing source key field(s): ${row.missingSourceKeyFields.join(', ')}.`)] : []),
  ]);

  return freeze({
    schema: 'UniversalLevelResolverPreview.v1-shadow',
    levelId: level.levelId,
    sourceKeyExpressions: uniqueText(sourceResolverRows.map((row) => row.sourceKey)),
    targetKeyCandidates: uniqueText(sourceResolverRows.map((row) => row.targetKey)),
    sourceResolverRows: freeze(sourceResolverRows),
    diagnostics: freeze(diagnostics),
    status: !sourceResolverRows.length ? 'no-sideload-resolver' : diagnostics.length ? 'blocked' : 'ready',
  });
}

function createLevelAttachmentTargetPreview(level, blocks, rules, previewRules) {
  const blockByName = Object.fromEntries(blocks.map((block) => [block.blockName, block]));
  const previewByRule = Object.fromEntries(previewRules.map((rule) => [rule.ruleId, rule]));
  const ruleTargets = rules.map((rule) => {
    const block = blockByName[rule.blockName] || null;
    const preview = previewByRule[rule.ruleId] || null;
    return freeze({
      ruleId: rule.ruleId,
      sourceId: rule.sourceId,
      blockName: rule.blockName,
      blockResolvedAtLevel: Boolean(block),
      mode: rule.mode,
      matchedCount: preview?.matchedCount || 0,
      unmatchedSourceRows: preview?.unmatchedSourceRows?.length || 0,
      missingTargetRows: preview?.missingTargetRows?.length || 0,
      targetRowsWithoutSource: preview?.targetRowsWithoutSource?.length || 0,
    });
  });
  const diagnostics = ruleTargets
    .filter((target) => !target.blockResolvedAtLevel)
    .map((target) => diagnostic('error', 'UXC_RECIPE_ATTACHMENT_BLOCK_TARGET_INVALID', target.ruleId, `Attachment rule "${target.ruleId}" targets block "${target.blockName}" outside level "${level.levelId}".`));

  return freeze({
    schema: 'UniversalAttachmentTargetPreview.v1-shadow',
    levelId: level.levelId,
    targetBlocks: freeze(blocks.map((block) => freeze({ blockName: block.blockName, createMode: block.createMode }))),
    ruleTargets: freeze(ruleTargets),
    diagnostics: freeze(diagnostics),
    status: diagnostics.length ? 'blocked' : ruleTargets.length ? 'ready' : 'no-attachments',
  });
}

function createSourceFieldCandidates(level, registry, rules) {
  const sourceKeyFieldsBySource = {};
  for (const rule of rules) {
    const fields = parseUniversalKeyFields(rule.sourceKey);
    sourceKeyFieldsBySource[rule.sourceId] = uniqueText([...(sourceKeyFieldsBySource[rule.sourceId] || []), ...fields]);
  }
  return freeze(registry.sources.map((source) => {
    const keyFields = sourceKeyFieldsBySource[source.sourceId] || freeze([]);
    return freeze({
      sourceId: source.sourceId,
      role: source.role,
      rowCount: source.rowCount,
      fields: freeze(source.columns.map((field) => freeze({
        field,
        required: source.requiredColumns.includes(field),
        missingRequired: source.missingRequiredColumns.includes(field),
        usedAsSourceKey: keyFields.includes(field),
        suggestedForLevel: isSuggestedFieldForLevel(field, level, keyFields),
      }))),
    });
  }));
}

function isSuggestedFieldForLevel(field, level, keyFields = []) {
  if (keyFields.includes(field)) return true;
  const normalizedField = text(field).toLowerCase();
  const hints = uniqueText([level.levelId, level.displayName]).map((item) => item.toLowerCase()).filter(Boolean);
  return hints.some((hint) => normalizedField.includes(hint)) || /(^|_)(id|key|number|node|line)($|_)/i.test(text(field));
}

function findInvalidBlockTargetDiagnostics(profile, levelIds) {
  return freeze(profile.blockDefinitions
    .filter((block) => block.attachToLevelId && !levelIds.includes(block.attachToLevelId))
    .map((block) => diagnostic('error', 'UXC_RECIPE_BLOCK_TARGET_INVALID', block.blockName, `Block "${block.blockName}" targets missing level "${block.attachToLevelId}".`)));
}

function createParentIndex(levels = []) {
  const parentByLevelId = {};
  for (const parent of arr(levels)) {
    for (const childId of arr(parent.children)) {
      if (!parentByLevelId[childId]) parentByLevelId[childId] = parent.levelId;
    }
  }
  return freeze(parentByLevelId);
}

function computeLevelDepth(levelId, parentByLevelId, seen = new Set()) {
  const parentId = parentByLevelId[levelId];
  if (!parentId || seen.has(levelId)) return 0;
  seen.add(levelId);
  return 1 + computeLevelDepth(parentId, parentByLevelId, seen);
}

function findDuplicates(values = []) {
  const seen = new Set(), duplicates = [];
  for (const value of arr(values)) {
    const normalized = text(value);
    if (!normalized) continue;
    if (seen.has(normalized) && !duplicates.includes(normalized)) duplicates.push(normalized);
    seen.add(normalized);
  }
  return freeze(duplicates);
}

function isUniversalSourceRegistry(value) {
  return value?.schema === 'universal-source-registry/v1-shadow';
}

function diagnostic(severity, code, subjectId, message) {
  return freeze({ severity, code, subjectId, message });
}

export const _test = freeze({
  buildLevelCandidate,
  createLevelResolverPreview,
  createLevelAttachmentTargetPreview,
  createSourceFieldCandidates,
  createParentIndex,
  computeLevelDepth,
  findDuplicates,
  diagnostic,
});
