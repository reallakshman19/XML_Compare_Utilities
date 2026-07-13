import './pipeline-3d-model-cad-runtime-policy.js?v=20260713-cad-default-1';
import './pipeline-3d-model-cad-production-hardening.js?v=20260713-cad-hardening-1';
import './pipeline-3d-model-cad-interaction-quality.js?v=20260713-cad-quality-1';
import './pipeline-3d-model-cad-selection-visibility.js?v=20260713-cad-selection-1';
import './pipeline-3d-model-cad-axis-history-fix.js?v=20260713-axis-history-1';
import './pipeline-3d-model-cad-engineering-review.js?v=20260713-engineering-review-1';
import './pipeline-3d-model-cad-preview-modes.js?v=20260713-preview-modes-1';
import './pipeline-3d-model-cad-layout-hardening.js?v=20260713-cad-layout-1';
import './pipeline-3d-model-cad-authoring.js?v=20260713-cad-authoring-1';
import './pipeline-3d-model-cad-lifecycle-performance.js?v=20260713-cad-lifecycle-1';
import './pipeline-3d-model-cad-floating-preview.js?v=20260713-floating-preview-1';
import './pipeline-3d-model-cad-floating-preview-hardening.js?v=20260713-floating-preview-hardening-1';
import './pipeline-3d-model-cad-soak-evidence.js?v=20260713-cad-soak-1';
import './pipeline-3d-model-cad-soak-evidence-hardening.js?v=20260713-cad-soak-hardening-1';
import './pipeline-3d-model-cad-workspace.js?v=20260713-cad-workspace-1';

// Branch/config defaults + localStorage persistence for the Pipeline 3D Model tile.
// Defaults below are used ONLY when localStorage has no saved value for a field —
// every value is explicit here, nothing is silently defaulted elsewhere.

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

// Returns a plain { key: value } map, falling back to each field's explicit
// default only when localStorage is null/missing that key.
export function loadConfigValues(storage = globalThis.localStorage) {
  const saved = storage ? readStorage(storage) : null;
  const values = {};
  CONFIG_FIELDS.forEach((field) => {
    const savedValue = saved && Object.prototype.hasOwnProperty.call(saved, field.key) ? saved[field.key] : null;
    values[field.key] = savedValue == null ? field.default : savedValue;
  });
  return values;
}

export function saveConfigValues(values, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // localStorage unavailable/full — persistence is best-effort only.
  }
}
