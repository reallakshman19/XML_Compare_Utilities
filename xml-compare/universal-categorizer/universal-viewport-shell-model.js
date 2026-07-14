import { buildWorkbenchViewportShellModel } from '../../../core/workbench-viewport/index.js';
import { selectedUniversalRecord } from './universal-viewport-state.js';

export const UNIVERSAL_VIEWPORT_SHELL_MODEL_SCHEMA = 'universal-viewport-shell-model/v1';

const freeze = (value) => Object.freeze(value);

function activeHost(hosts, mode) {
  return mode === 'pivot' ? hosts.pivot : hosts.tree;
}

function inspector(record, context) {
  if (!record) return freeze({ status: context.status, path: '—', level: '—', key: '—', block: '—', field: '—', value: '—', source: '—' });
  return freeze({
    status: context.status,
    path: record.path || record.label || '—',
    level: record.level || record.levelId || '—',
    key: record.key || '—',
    block: record.block || '—',
    field: record.field || '—',
    value: record.value || '—',
    source: record.source || '—',
  });
}

export function createUniversalViewportShellModel(input = {}) {
  const state = input.state;
  const host = activeHost(input.hosts, state.mode);
  const shell = buildWorkbenchViewportShellModel(host, {
    labels: { fit: 'Auto Fit', range: 'Custom Range', 'scale-ratio': 'Scale' },
    surfaces: [
      freeze({ id: 'tree', label: 'Tree' }),
      freeze({ id: 'pivot', label: 'Pivot' }),
    ],
    extensionActions: [
      { id: 'zoom-x-in', label: 'X +' },
      { id: 'zoom-x-out', label: 'X −' },
      { id: 'zoom-y-in', label: 'Y +' },
      { id: 'zoom-y-out', label: 'Y −' },
    ],
  });
  return freeze({
    schema: UNIVERSAL_VIEWPORT_SHELL_MODEL_SCHEMA,
    shell,
    mode: state.mode,
    modes: freeze([
      freeze({ id: 'tree', label: 'Tree' }),
      freeze({ id: 'pivot', label: 'Pivot' }),
      freeze({ id: 'side-by-side', label: 'Side by Side' }),
      freeze({ id: 'diagnostics', label: 'Diagnostics' }),
    ]),
    contextStatus: input.context.status,
    contextSignature: input.context.signature,
    diagnostics: input.context.diagnostics,
    exportLocked: true,
    inspector: inspector(selectedUniversalRecord(state), input.context),
  });
}

export const _test = freeze({ activeHost, inspector });
