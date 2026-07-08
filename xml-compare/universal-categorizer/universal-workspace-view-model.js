import { createLinewiseUniversalPreset, normalizeUniversalCategorizerProfile, summarizeUniversalProfile } from './universal-xml-categorizer-contracts.js';
import { createLinewiseUniversalAttachmentPreviewModel, createUniversalAttachmentPreview } from './universal-attachment-preview.js';
import { createLinewiseUniversalCategorizedGraphPreview, createUniversalCategorizedGraphPreview } from './universal-graph-builder.js';
import { evaluateUniversalXmlExportGate } from './universal-export-gate.js';
import { createUniversalSourceRegistry } from './universal-source-registry.js';

export const UNIVERSAL_WORKSPACE_VIEW_MODEL_SCHEMA = 'universal-workspace-view-model/v1-shadow';

const freeze = (value) => Object.freeze(value);
const arr = (value) => Array.isArray(value) ? value : [];
const text = (value, fallback = '') => String(value ?? fallback).trim();

export function createLinewiseUniversalWorkspaceViewModel(profile = createLinewiseUniversalPreset()) {
  const normalizedProfile = normalizeUniversalCategorizerProfile(profile || createLinewiseUniversalPreset());
  const previewModel = createLinewiseUniversalAttachmentPreviewModel(normalizedProfile);
  const graph = createLinewiseUniversalCategorizedGraphPreview(normalizedProfile);
  const exportGate = evaluateUniversalXmlExportGate({ graph });
  return createUniversalWorkspaceViewModel({
    profile: normalizedProfile,
    registry: previewModel.registry,
    attachmentPreview: previewModel.preview,
    graph,
    exportGate,
  });
}

export function createUniversalWorkspaceViewModel(input = {}) {
  const profile = normalizeUniversalCategorizerProfile(input.profile || input.profileInput || createLinewiseUniversalPreset());
  const registry = input.registry?.schema === 'universal-source-registry/v1-shadow'
    ? input.registry
    : createUniversalSourceRegistry(profile, input.sourceInputs || input.sources || {});
  const attachmentPreview = input.attachmentPreview?.schema === 'universal-attachment-preview/v1-shadow'
    ? input.attachmentPreview
    : createUniversalAttachmentPreview({ profile, registry, targetRows: input.targetRows || [] });
  const graph = input.graph?.schema === 'CategorizedGraph.v1-preview-shadow'
    ? input.graph
    : createUniversalCategorizedGraphPreview({ profile, registry, targetRows: input.targetRows || attachmentPreview.targetRows || [] });
  const exportGate = input.exportGate?.schema === 'universal-export-gate/v1-shadow'
    ? input.exportGate
    : evaluateUniversalXmlExportGate({ graph });
  const summary = summarizeUniversalProfile(profile);

  return freeze({
    schema: UNIVERSAL_WORKSPACE_VIEW_MODEL_SCHEMA,
    profileId: profile.profileId,
    title: 'Build a governed XML / table hierarchy',
    eyebrow: 'Universal Categorizer Workspace',
    subtitle: 'Define sources, attach sideload data, preview the categorized graph, and keep export locked until graph proof is approved. Existing Line-wise and Table-to-Categorized workflows remain unchanged.',
    statusChips: freeze([
      statusChip('Shadow mode', 'shadow'),
      statusChip('Export locked', 'locked'),
    ]),
    workflowSteps: workflowSteps(),
    readinessCards: readinessCards(summary, graph, exportGate),
    designerActions: designerActions(),
    recipe: recipeSection(profile),
    sources: sourceSection(registry),
    attachments: attachmentSection(profile, attachmentPreview),
    attachmentPreview: attachmentDiagnosticsSection(attachmentPreview),
    graph: graphSection(graph),
    exportGate: exportGateSection(exportGate),
    boundary: boundarySection(),
  });
}

function workflowSteps() {
  return freeze([
    step('01', 'Source Registry', 'Normalize primary XML and sideload tables'),
    step('02', 'Attachment Rules', 'Map source keys into graph levels and blocks'),
    step('03', 'Graph Preview', 'Build CategorizedGraph.v1 in shadow mode'),
    step('04', 'Export Gate', 'Keep XML output locked until proof approval'),
  ]);
}

function readinessCards(summary, graph, exportGate) {
  return freeze([
    card('Sources', summary.sources, 'Registered inputs'),
    card('Sideloads', summary.sideloadSources, 'External enrichers'),
    card('Levels', summary.levels, 'Hierarchy depth'),
    card('Graph nodes', graph.summary?.nodes ?? graph.nodes?.length ?? 0, 'Preview output'),
    card('Export', exportGate.blocked ? 'Locked' : 'Open', exportGate.status),
  ]);
}

function designerActions() {
  return freeze([
    action('add-level', 'Add level', 'Define a new hierarchy level', 'locked-shadow-mode'),
    action('add-block', 'Add block', 'Attach a data block to a level', 'locked-shadow-mode'),
    action('map-source-field', 'Map source field', 'Map source columns into graph fields', 'locked-shadow-mode'),
    action('preview-pivot', 'Preview pivot', 'Preview pivot/table output from the graph', 'locked-export-gate'),
    action('export-xml', 'Export XML', 'Export categorized XML after approval', 'locked-export-gate'),
  ]);
}

function recipeSection(profile) {
  return freeze({
    title: 'Structure Recipe Builder bridge',
    kicker: 'Hierarchy design',
    status: 'Graph-first',
    description: 'The future editable builder owns the hierarchy. This preview shows the level/block structure before any XML export is allowed.',
    levels: freeze(rootLevels(profile).flatMap((level) => flattenLevel(level, profile, 0))),
  });
}

function sourceSection(registry) {
  return freeze({
    title: 'Universal source registry',
    kicker: 'Input readiness',
    status: `${registry.sources.length} sources`,
    description: 'Primary and sideload sources are normalized before graph build. Missing columns stay diagnostic-only.',
    rows: freeze(arr(registry.sources).map((source) => freeze({
      sourceId: source.sourceId,
      displayName: source.displayName || source.sourceKind,
      role: source.role,
      requiredColumns: source.requiredColumns,
      missingRequiredColumns: source.missingRequiredColumns,
      rowCount: source.rowCount,
      status: source.missingRequiredColumns.length ? source.missingRequiredColumns.join(', ') : 'Ready',
      statusKind: source.missingRequiredColumns.length ? 'warn' : 'ok',
    }))),
  });
}

function attachmentSection(profile, preview) {
  const previewByRule = Object.fromEntries(arr(preview.rules).map((rule) => [rule.ruleId, rule]));
  return freeze({
    title: 'Attachment rules',
    kicker: 'Sideload orchestration',
    status: 'Preview only',
    description: 'Each sideload source is mapped to a graph level and block through explicit keys, not hardcoded text areas.',
    rows: freeze(arr(profile.sideloadAttachments).map((rule) => {
      const rulePreview = previewByRule[rule.ruleId] || {};
      return freeze({
        ruleId: rule.ruleId,
        sourceId: rule.sourceId,
        attachToLevelId: rule.attachToLevelId,
        blockName: rule.blockName,
        sourceKey: rule.sourceKey,
        matched: rulePreview.matchedCount ?? 0,
        missingTarget: rulePreview.missingTargetRows?.length ?? 0,
      });
    })),
  });
}

function attachmentDiagnosticsSection(preview) {
  return freeze({
    title: 'Attachment preview',
    kicker: 'Match diagnostics',
    status: 'No mutation',
    description: 'Preview matched rows, source rows without keys, source rows with missing targets, and existing target rows without source matches.',
    rows: freeze(arr(preview.rules).map((rule) => freeze({
      ruleId: rule.ruleId,
      targetLevel: rule.targetLevel?.displayName || rule.targetLevelId,
      targetBlock: rule.targetBlock?.blockName,
      matched: rule.matchedCount,
      noKey: rule.unmatchedSourceRows?.length || 0,
      missing: rule.missingTargetRows?.length || 0,
      targetOnly: rule.targetRowsWithoutSource?.length || 0,
    }))),
  });
}

function graphSection(graph) {
  return freeze({
    title: 'CategorizedGraph.v1 preview',
    kicker: 'Graph result',
    status: graph.exportStatus,
    metrics: freeze([
      card('Graph nodes', graph.summary?.nodes ?? 0, 'Graph nodes'),
      card('Blocks', graph.summary?.blocks ?? 0, 'Blocks'),
      card('Sideload attachments', graph.summary?.sideloadAttachments ?? 0, 'Sideload attachments'),
      card('Diagnostics', graph.summary?.diagnostics ?? 0, 'Diagnostics'),
    ]),
    rows: freeze(arr(graph.nodes).map((node) => freeze({
      nodeId: node.nodeId,
      levelId: node.levelId,
      key: node.key,
      blocks: Object.keys(node.blocks || {}).join(', ') || '—',
      attachments: Object.values(node.blocks || {}).reduce((sum, block) => sum + (block.attachments?.length || 0), 0),
    }))),
  });
}

function exportGateSection(gate) {
  return freeze({
    title: 'XML export gate',
    kicker: 'Controlled output',
    status: gate.status,
    reason: gate.reason,
    allowed: gate.allowed,
    blocked: gate.blocked,
    graphSignature: gate.graphSignature || 'pending',
  });
}

function boundarySection() {
  return freeze({
    title: 'Shadow-mode boundary',
    kicker: 'Safety boundary',
    status: 'No production side effects',
    items: freeze([
      'No existing converter, sideload, enrichment, XML export, pivot, or canvas module is changed.',
      'This workspace proves source registry, attachment preview, graph preview, deterministic proof, and export gate in shadow mode only.',
      'Next approval point: editable recipe builder and deterministic graph parity review.',
    ]),
  });
}

function rootLevels(profile) {
  const referenced = new Set(profile.levelDefinitions.flatMap((level) => level.children || []));
  const roots = profile.levelDefinitions.filter((level) => !referenced.has(level.levelId));
  return roots.length ? roots : profile.levelDefinitions;
}

function flattenLevel(level, profile, depth) {
  const children = arr(level.children).map((id) => profile.levelDefinitions.find((item) => item.levelId === id)).filter(Boolean);
  return freeze([
    freeze({
      levelId: level.levelId,
      displayName: level.displayName,
      depth,
      blocks: blocksFor(profile, level.levelId),
    }),
    ...children.flatMap((child) => flattenLevel(child, profile, depth + 1)),
  ]);
}

function blocksFor(profile, levelId) {
  return freeze(profile.blockDefinitions.filter((block) => block.attachToLevelId === levelId).map((block) => block.blockName));
}

function step(number, title, caption) {
  return freeze({ number, title, caption });
}

function card(label, value, note) {
  return freeze({ label, value, note });
}

function action(actionId, label, description, lockedReason) {
  return freeze({ actionId, label, description, enabled: false, locked: true, lockedReason });
}

function statusChip(label, kind) {
  return freeze({ label, kind });
}

export const _test = freeze({
  workflowSteps,
  readinessCards,
  designerActions,
  recipeSection,
  sourceSection,
  attachmentSection,
  attachmentDiagnosticsSection,
  graphSection,
  exportGateSection,
  boundarySection,
  rootLevels,
  flattenLevel,
  blocksFor,
});
