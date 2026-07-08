import { createLinewiseUniversalPreset } from './universal-xml-categorizer-contracts.js';
import { createUniversalRecipeDesignerModel } from './universal-recipe-designer-model.js';
import { evaluateUniversalXmlExportGate } from './universal-export-gate.js';

export const UNIVERSAL_COMMAND_PLANNER_SCHEMA = 'universal-command-planner/v1-shadow';

const freeze = (value) => Object.freeze(value);
const arr = (value) => Array.isArray(value) ? value : [];

export function createLinewiseUniversalCommandPlanner(profile = createLinewiseUniversalPreset()) {
  const recipeDesigner = createUniversalRecipeDesignerModel(profile || createLinewiseUniversalPreset());
  const exportGate = evaluateUniversalXmlExportGate({});
  return createUniversalCommandPlanner({ recipeDesigner, exportGate });
}

export function createUniversalCommandPlanner(input = {}) {
  const recipeDesigner = input.recipeDesigner?.schema === 'universal-recipe-designer-model/v1-shadow'
    ? input.recipeDesigner
    : createUniversalRecipeDesignerModel(input.profile || createLinewiseUniversalPreset());
  const exportGate = input.exportGate?.schema === 'universal-export-gate/v1-shadow'
    ? input.exportGate
    : evaluateUniversalXmlExportGate(input.exportGateInput || {});
  const receipts = designerCommands(recipeDesigner).map((command) => commandReceipt(command, recipeDesigner, exportGate));
  return freeze({
    schema: UNIVERSAL_COMMAND_PLANNER_SCHEMA,
    profileId: recipeDesigner.profileId,
    status: 'locked-shadow-only',
    summary: freeze({
      commands: receipts.length,
      locked: receipts.filter((receipt) => receipt.locked).length,
      mutationAllowed: receipts.filter((receipt) => receipt.mutationAllowed).length,
      exportAllowed: receipts.filter((receipt) => receipt.exportAllowed).length,
      pivotAllowed: receipts.filter((receipt) => receipt.pivotAllowed).length,
      canvasAllowed: receipts.filter((receipt) => receipt.canvasAllowed).length,
    }),
    receipts: freeze(receipts),
  });
}

function designerCommands(recipeDesigner) {
  const commands = arr(recipeDesigner.commands);
  if (commands.length) return commands;
  return [
    command('add-level', 'Add level', 'Create a new hierarchy level draft.'),
    command('add-block', 'Add block', 'Create a block draft under a level.'),
    command('map-source-field', 'Map source field', 'Map source columns to graph/block fields.'),
    command('preview-pivot', 'Preview pivot', 'Preview pivot/table projection after graph approval.'),
    command('export-xml', 'Export XML', 'Export XML only after gate approval.'),
  ];
}

function command(commandId, label, description) {
  return freeze({ commandId, label, description, enabled: false, locked: true, lockedReason: 'locked-shadow-mode' });
}

function commandReceipt(command, recipeDesigner, exportGate) {
  const target = commandTarget(command.commandId);
  const policy = commandPolicy(command.commandId, recipeDesigner, exportGate);
  return freeze({
    receiptId: `uxc-command-${command.commandId}`,
    commandId: command.commandId,
    label: command.label,
    description: command.description,
    targetArea: target,
    locked: true,
    enabled: false,
    lockedReason: command.lockedReason || policy.lockedReason,
    blockedReason: policy.blockedReason,
    preconditions: freeze(policy.preconditions),
    mutationAllowed: false,
    exportAllowed: false,
    pivotAllowed: false,
    canvasAllowed: false,
    dryRunOnly: true,
  });
}

function commandTarget(commandId) {
  return {
    'add-level': 'hierarchy-levels',
    'add-block': 'data-blocks',
    'map-source-field': 'source-field-mapping',
    'preview-pivot': 'pivot-preview',
    'export-xml': 'xml-export',
  }[commandId] || 'recipe-designer';
}

function commandPolicy(commandId, recipeDesigner, exportGate) {
  const validationReady = !recipeDesigner.summary?.errors;
  const validationText = validationReady ? 'Recipe validation has no blocking errors.' : 'Recipe validation has blocking errors.';
  const lockedReason = commandId === 'preview-pivot' || commandId === 'export-xml' ? 'locked-export-gate' : 'locked-shadow-mode';
  const exportLocked = exportGate?.blocked !== false;
  const base = {
    lockedReason,
    preconditions: [validationText, 'Designer mutation runtime is not enabled.'],
    blockedReason: 'Command planner is shadow-only; no recipe mutation handlers are installed.',
  };
  if (commandId === 'preview-pivot') {
    return freeze({
      lockedReason,
      preconditions: freeze([validationText, 'Pivot projection requires approved graph/export policy.']),
      blockedReason: exportLocked ? 'Pivot preview is blocked until graph proof/export policy is approved.' : 'Pivot preview remains disabled in shadow mode.',
    });
  }
  if (commandId === 'export-xml') {
    return freeze({
      lockedReason,
      preconditions: freeze([validationText, 'XML export requires open export gate.']),
      blockedReason: exportLocked ? 'XML export is blocked by the Universal export gate.' : 'XML export remains disabled in shadow mode.',
    });
  }
  return freeze({ ...base, preconditions: freeze(base.preconditions) });
}

export const _test = freeze({ designerCommands, command, commandReceipt, commandTarget, commandPolicy });
