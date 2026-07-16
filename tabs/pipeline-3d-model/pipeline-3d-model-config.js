import './pipeline-3d-model-cad-runtime-policy.js?v=20260713-cad-default-1';
import './pipeline-3d-model-cad-production-hardening.js?v=20260713-cad-hardening-1';
import './pipeline-3d-model-cad-interaction-quality.js?v=20260713-cad-quality-1';
import './pipeline-3d-model-cad-axis-history-fix.js?v=20260713-axis-history-1';
import './pipeline-3d-model-cad-layout-hardening.js?v=20260713-cad-layout-1';
import './pipeline-3d-model-cad-lifecycle-performance.js?v=20260713-cad-lifecycle-1';
import './pipeline-3d-model-cad-floating-preview.js?v=20260713-floating-preview-1';
import './pipeline-3d-model-cad-floating-preview-hardening.js?v=20260713-floating-preview-hardening-1';
import {
  installPipelineCadWorkspaceComposition,
} from './pipeline-3d-model-cad-workspace.js?v=20260715-pcad-002';
import './pipeline-3d-model-cad-selection-visibility.js?v=20260714-pcad-001-selection';

if (globalThis.document) installPipelineCadWorkspaceComposition(globalThis.document);

export const STORAGE_KEY = 'pipeline-3d-model-config-v1';

export const CONFIG_FIELDS = Object.freeze([
  { key: 'lineNo', label: 'Line No', unit: '', default: 'PL-XX' },
  { key: 'boreMm', label: 'Bore', unit: 'mm', default: '' },
  { key: 'wallThickness', label: 'Wall Thickness', unit: 'mm', default: '' },
  { key: 'p1', label: 'P1 (Design Pressure)', unit: '', default: '' },
  { key: 't1', label: 'T1', unit: 'Deg C', default: '120' },
  { key: 't2', label: 'T2', unit: 'Deg C', default: '90' },
  { key: 't3', label: 'T3', unit: 'Deg C', default: '5' },
  { key: 'fluidDensity', label: 'Fluid Density', unit: 'kg/m3', default: '100' },
  { key: 'materialCode', label: 'Material No (CAESAR MATERIAL_NUM)', unit: '', default: '106' },
  { key: 'corrosionAllowance', label: 'Corrosion Allowance', unit: 'mm', default: '0' },
  { key: 'insulationThickness', label: 'Insulation Thickness', unit: 'mm', default: '0' },
  { key: 'insulationDensity', label: 'Insulation Density', unit: 'kg/m3', default: '0' },
  { key: 'hydroPressure', label: 'Hydro Test Pressure', unit: '', default: '' },
]);

export function fieldLabel(field) {
  return field.unit ? `${field.label} (${field.unit})` : field.label;
}

function readStorage(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadConfigValues(storage = globalThis.localStorage) {
  const saved = storage ? readStorage(storage) : null;
  const values = {};
  CONFIG_FIELDS.forEach((field) => {
    const has = saved && Object.prototype.hasOwnProperty.call(saved, field.key);
    values[field.key] = has ? saved[field.key] : field.default;
  });
  return values;
}

export function saveConfigValues(values, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // localStorage persistence is best-effort only.
  }
}
