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

const pressureFields = Array.from({ length: 9 }, (_, index) => Object.freeze({
  key: `p${index + 1}`,
  label: `P${index + 1}${index === 0 ? ' (Design Pressure)' : ''}`,
  unit: '',
  default: '',
}));

const temperatureFields = Array.from({ length: 9 }, (_, index) => Object.freeze({
  key: `t${index + 1}`,
  label: `T${index + 1}`,
  unit: 'Deg C',
  default: index === 0 ? '120' : (index === 1 ? '90' : (index === 2 ? '5' : '')),
}));

export const CONFIG_FIELDS = Object.freeze([
  { key: 'jobName', label: 'Job Name', unit: '', default: 'PIPELINE_3D_MODEL' },
  { key: 'issueNo', label: 'Issue No', unit: '', default: '' },
  { key: 'caesarVersion', label: 'CAESAR Version', unit: '', default: '11.00' },
  { key: 'branchName', label: 'Branch Name', unit: '', default: 'B1' },
  { key: 'lineNo', label: 'Line No', unit: '', default: 'PL-XX' },
  { key: 'boreMm', label: 'Bore', unit: 'mm', default: '' },
  { key: 'wallThickness', label: 'Wall Thickness', unit: 'mm', default: '' },
  ...pressureFields,
  ...temperatureFields,
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
