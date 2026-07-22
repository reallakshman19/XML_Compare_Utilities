import {
  buildPipelineProjectMigration,
  buildPipelineProjectOutputs,
} from './pipeline-3d-model-project-adapter.js?v=20260722-p3d-base-039-1';
import { CONFIG_FIELDS } from './pipeline-3d-model-config.js?v=20260722-p3d-base-039-1';
import { buildKeyPlanLegendHtml, paintKeyPlanCanvas } from './pipeline-3d-model-keyplan.js';
import { createTable2XSVG, createTable3XSVG } from './pipeline-3d-model-preview.js';
import { TABLE_HEADERS } from './pipeline-3d-model-cad-model.js';
import {
  addPipelineWarning,
  ensurePipelineWarningLog,
  renderPipelineWarningLog,
  warningFromError,
} from './pipeline-3d-model-warning-log.js?v=20260718-warning-log-1';

const INSTANCES = new WeakMap();
const CONFIG_KEYS = Object.freeze(CONFIG_FIELDS.map((field) => field.key));
const RAW_HEADERS = Object.freeze({
  'table2a-raw': TABLE_HEADERS.table2a,
  'table3a-raw': TABLE_HEADERS.table3a,
  'table3b-raw': TABLE_HEADERS.table3b,
  'table3c-raw': TABLE_HEADERS.table3c,
});

function find(dialog, selector) {
  return dialog.querySelector(selector);
}

function rawValue(dialog, name) {
  return find(dialog, `[data-p3d-split="${name}"]`)?.value || '';
}

function hasRawRows(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  return lines.length > 1 && lines.slice(1).some((line) => /\d/.test(line));
}

function hasAuthoritativeProfile(dialog) {
  return hasRawRows(rawValue(dialog, 'table2a-raw'))
    && hasRawRows(rawValue(dialog, 'table3a-raw'));
}

function readProfileRaw(dialog) {
  return Object.freeze({
    table2a: rawValue(dialog, 'table2a-raw'),
    table3a: rawValue(dialog, 'table3a-raw'),
    table3b: rawValue(dialog, 'table3b-raw'),
    table3c: rawValue(dialog, 'table3c-raw'),
  });
}

function readBranchInfo(dialog) {
  const value = (key) => find(dialog, `[data-p3d-field="${key}"]`)?.value?.trim() || '';
  return Object.fromEntries(CONFIG_KEYS.map((key) => [key, value(key)]));
}

function buildInput(dialog) {
  return {
    table1Text: find(dialog, '[data-p3d="table1"]')?.value || '',
    table2Text: find(dialog, '[data-p3d="table2"]')?.value || '',
    table3Text: find(dialog, '[data-p3d="table3"]')?.value || '',
    profileRaw: hasAuthoritativeProfile(dialog) ? readProfileRaw(dialog) : null,
    branchInfo: readBranchInfo(dialog),
  };
}

function setTextArea(dialog, name, value) {
  const element = find(dialog, `[data-p3d="${name}"]`);
  if (!element) return;
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function splitTsv(text) {
  return String(text || '').split(/\r?\n/).filter((line) => line.trim()).map((line) => line.split('\t'));
}

function renderTsvGrid(text) {
  const [headers = [], ...rows] = splitTsv(text);
  const head = `<tr>${headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr>`;
  const body = rows.map((row) => `<tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] ?? '')}</td>`).join('')}</tr>`).join('');
  return `<div class="p3d-derived-grid"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

function markerPoints(output) {
  return output.combined.filter((point) => point.sources?.includes('marker'));
}

function ensureTooltip(dialog) {
  let tooltip = find(dialog, '.p3d-tooltip');
  if (tooltip) return tooltip;
  tooltip = dialog.ownerDocument.createElement('div');
  tooltip.className = 'p3d-tooltip';
  dialog.appendChild(tooltip);
  return tooltip;
}

function renderProfileOutputs(dialog, output) {
  setTextArea(dialog, 'table2', output.table2Text);
  setTextArea(dialog, 'table3', output.table3Text);
  const table2Grid = find(dialog, '[data-p3d="table2x-output"]');
  const table3Grid = find(dialog, '[data-p3d="table3x-output"]');
  if (table2Grid) table2Grid.innerHTML = renderTsvGrid(output.table2XText);
  if (table3Grid) table3Grid.innerHTML = renderTsvGrid(output.table3XText);
  const table2Svg = find(dialog, '[data-p3d-split="table2x-preview"]');
  const table3Svg = find(dialog, '[data-p3d-split="table3x-preview"]');
  if (table2Svg) table2Svg.innerHTML = createTable2XSVG(output.table2XText);
  if (table3Svg) table3Svg.innerHTML = createTable3XSVG(output.table3XText);
  const table1Out = find(dialog, '[data-p3d="table1-output"]');
  const coordinateOut = find(dialog, '[data-p3d="coordinate-output"]');
  const xmlOut = find(dialog, '[data-p3d="xml-output"]');
  if (table1Out) table1Out.textContent = output.table1OutputText;
  if (coordinateOut) coordinateOut.textContent = output.coordinateText;
  if (xmlOut) xmlOut.textContent = output.xmlText;
}

function renderKeyPlan(dialog, output) {
  const legend = find(dialog, '[data-p3d="keyplan-legend"]');
  const legendHtml = buildKeyPlanLegendHtml(output.table1Points, output.sheets);
  if (legend) {
    legend.innerHTML = legendHtml;
    legend.hidden = !legendHtml;
  }
  const canvas = find(dialog, '[data-p3d="canvas-keyplan"]');
  if (canvas) paintKeyPlanCanvas(canvas, output.table1Points, output.sheets, ensureTooltip(dialog), markerPoints(output));
}

function clearLegacyError(dialog) {
  const element = find(dialog, '[data-p3d="error-message"]');
  if (element) element.style.display = 'none';
}

function setWarnings(dialog, instance, warnings = []) {
  instance.warnings = [...warnings];
  renderPipelineWarningLog(dialog, instance.warnings);
}

function logWarning(dialog, instance, code, error, details = null) {
  const warning = warningFromError(error, code);
  addPipelineWarning(instance.warnings, warning.code, warning.message, details);
  renderPipelineWarningLog(dialog, instance.warnings);
}

function buildAndRender(dialog, instance) {
  const input = buildInput(dialog);
  try { globalThis.localStorage?.setItem('pipeline-3d-model-config-v1', JSON.stringify(input.branchInfo)); } catch {}
  const output = buildPipelineProjectOutputs(input);
  instance.output = output;
  renderProfileOutputs(dialog, output);
  renderKeyPlan(dialog, output);
  clearLegacyError(dialog);
  setWarnings(dialog, instance, output.warnings || []);
  return { input, output };
}

async function updateMigration(instance, input) {
  instance.migration = await buildPipelineProjectMigration({
    ...input,
    sourceName: 'pipeline-3d-model-session.json',
    createdAt: new Date().toISOString(),
    cryptoRef: globalThis.crypto,
  });
}

function run(dialog, instance) {
  try {
    const { input, output } = buildAndRender(dialog, instance);
    updateMigration(instance, input).catch((error) => logWarning(dialog, instance, 'migration_warning', error));
    return output;
  } catch (error) {
    logWarning(dialog, instance, 'propagation_unavailable', error);
    return null;
  }
}

function saveTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function download(dialog, instance, kind) {
  const output = instance.output || run(dialog, instance);
  if (!output) {
    logWarning(dialog, instance, 'download_unavailable', 'Output could not be built; no file was downloaded.');
    return;
  }
  if (kind === 'coordinate') {
    saveTextFile('pipeline-coordinate-tab.tsv', output.coordinateText, 'text/tab-separated-values');
    return;
  }
  if (!output.xmlText) {
    logWarning(dialog, instance, 'inputxml_blocked', `Canonical InputXML is blocked: ${output.exportQualification?.blockerCodes?.join(', ') || 'unknown blocker'}.`);
    return;
  }
  saveTextFile('pipeline-3d-model.xml', output.xmlText, 'application/xml');
}

function rawTextFromPreview(panel) {
  const name = panel.dataset.p3dSplitPanel;
  const headers = RAW_HEADERS[name];
  if (!headers) return null;
  const rows = Array.from(panel.querySelectorAll('[data-p3d-split-row]')).map((row) =>
    headers.map((_, index) => row.querySelector(`[data-p3d-split-cell$=":${index}"]`)?.value?.trim() || '—'));
  return { name, text: [headers, ...rows].map((row) => row.join('\t')).join('\n') };
}

function repairPreviewInput(dialog, event) {
  const target = event.target instanceof Element ? event.target : null;
  const cell = target?.closest('[data-p3d-split-cell]');
  if (!cell) return false;
  const panel = cell.closest('[data-p3d-split-panel]');
  const update = panel ? rawTextFromPreview(panel) : null;
  if (!update) return false;
  event.stopImmediatePropagation();
  const raw = find(dialog, `[data-p3d-split="${update.name}"]`);
  if (raw) {
    raw.value = update.text;
    queueMicrotask(() => raw.dispatchEvent(new Event('input', { bubbles: true })));
  }
  return true;
}

function scheduleRefresh(dialog, instance) {
  if (instance.refreshQueued) return;
  instance.refreshQueued = true;
  queueMicrotask(() => {
    instance.refreshQueued = false;
    run(dialog, instance);
  });
}

function onInput(dialog, instance, event) {
  if (repairPreviewInput(dialog, event)) return;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.matches('[data-p3d-split$="-raw"]') && hasAuthoritativeProfile(dialog)) scheduleRefresh(dialog, instance);
}

function onClick(dialog, instance, event) {
  const target = event.target instanceof Element ? event.target.closest('button') : null;
  const action = target?.dataset.p3d;
  if (!['run', 'download-coordinate', 'download-xml'].includes(action)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (action === 'run') run(dialog, instance);
  if (action === 'download-coordinate') download(dialog, instance, 'coordinate');
  if (action === 'download-xml') download(dialog, instance, 'xml');
}

export function installPipelineProfilePropagation(dialog) {
  if (!dialog || INSTANCES.has(dialog)) return INSTANCES.get(dialog)?.destroy || null;
  const controller = new AbortController();
  const instance = { output: null, migration: null, refreshQueued: false, warnings: [] };
  ensurePipelineWarningLog(dialog);
  renderPipelineWarningLog(dialog, []);
  dialog.addEventListener('click', (event) => onClick(dialog, instance, event), { capture: true, signal: controller.signal });
  dialog.addEventListener('input', (event) => onInput(dialog, instance, event), { capture: true, signal: controller.signal });
  instance.destroy = () => {
    controller.abort();
    INSTANCES.delete(dialog);
  };
  INSTANCES.set(dialog, instance);
  return instance.destroy;
}

export const _test = Object.freeze({
  buildInput, readBranchInfo, hasAuthoritativeProfile, rawTextFromPreview,
  renderTsvGrid, setWarnings,
});
