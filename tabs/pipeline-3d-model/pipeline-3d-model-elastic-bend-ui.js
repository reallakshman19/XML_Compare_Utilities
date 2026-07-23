import { buildPipelineProjectOutputs } from './pipeline-3d-model-project-adapter.js?v=20260722-p3d-base-039-1';
import {
  DEFAULT_ELASTIC_BEND_SETTINGS,
  loadElasticBendSettings,
  normalizeElasticBendSettings,
  saveElasticBendSettings,
} from './pipeline-3d-model-elastic-bend-settings.js?v=20260721-p3d-meta-phase1-2';
import { resolvePipelineIdentityContext } from './pipeline-3d-model-identity.js?v=20260722-p3d-identity-1';
import { renderBendCandidates, renderBendSummary } from './pipeline-3d-model-elastic-bend-ui-results.js?v=20260721-bend-policy-v3-1';
import { installBendSettingsStyle } from './pipeline-3d-model-elastic-bend-ui-style.js?v=20260721-bend-policy-v3-1';
import {
  bendField,
  bendSettingsPageHtml,
  readBendSettings,
  syncBendSettingsVisibility,
  writeBendSettings,
} from './pipeline-3d-model-elastic-bend-ui-view.js?v=20260721-p3d-meta-phase1-2';

const INSTALLED = new WeakSet();

function raw(dialog, name) {
  return dialog.querySelector(`[data-p3d-split="${name}"]`)?.value || '';
}

function buildBranchInfo(dialog) {
  const values = {};
  for (const input of dialog.querySelectorAll('[data-p3d-field]')) {
    values[input.dataset.p3dField] = input.value?.trim() || '';
  }
  const identity = resolvePipelineIdentityContext(values);
  return { ...values, branchName: identity.branchName, lineNo: identity.lineNo };
}

function buildInput(dialog, settings) {
  return {
    table1Text: dialog.querySelector('[data-p3d="table1"]')?.value || '',
    table2Text: dialog.querySelector('[data-p3d="table2"]')?.value || '',
    table3Text: dialog.querySelector('[data-p3d="table3"]')?.value || '',
    profileRaw: {
      table2a: raw(dialog, 'table2a-raw'),
      table3a: raw(dialog, 'table3a-raw'),
      table3b: raw(dialog, 'table3b-raw'),
      table3c: raw(dialog, 'table3c-raw'),
    },
    branchInfo: buildBranchInfo(dialog),
    elasticBendSettings: settings,
  };
}

function preview(dialog, page) {
  try {
    const settings = readBendSettings(page, normalizeElasticBendSettings);
    const output = buildPipelineProjectOutputs(buildInput(dialog, settings));
    page._elasticOutput = output;
    renderBendSummary(page, output);
    renderBendCandidates(page, output);
    page.querySelector('[data-p3d-elastic-status]').textContent = `${output.elasticBends.diagnostics.candidateCount} candidate(s), ${output.elasticBends.diagnostics.emittedCount} emitted, ${output.exportQualification.blockerCodes.length} document blocker(s).`;
    return output;
  } catch (error) {
    page.querySelector('[data-p3d-elastic-status]').textContent = `Preview unavailable: ${error.message}`;
    return null;
  }
}

function download(page, dialog) {
  const output = page._elasticOutput || preview(dialog, page);
  if (!output) return;
  const blob = new Blob([output.elasticBendText], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const link = dialog.ownerDocument.createElement('a');
  link.href = url;
  link.download = 'pipeline-bends.tsv';
  link.click();
  URL.revokeObjectURL(url);
}

function action(dialog, page, name) {
  if (name === 'close') page.hidden = true;
  if (name === 'reset') {
    writeBendSettings(page, DEFAULT_ELASTIC_BEND_SETTINGS);
    preview(dialog, page);
  }
  if (name === 'preview') preview(dialog, page);
  if (name === 'download') download(page, dialog);
  if (name === 'save') {
    const settings = readBendSettings(page, normalizeElasticBendSettings);
    saveElasticBendSettings(settings);
    preview(dialog, page);
    dialog.querySelector('[data-p3d="run"]')?.click();
    page.querySelector('[data-p3d-elastic-status]').textContent += ' Settings saved and Pipeline output refreshed.';
  }
}

function installChangeHandler(page) {
  page.addEventListener('change', (event) => {
    const preset = event.target instanceof Element
      ? event.target.closest('[data-p3d-cold-preset]') : null;
    if (preset && preset.value !== 'custom') {
      bendField(page, 'coldFieldRadiusMultiplierD').value = preset.value;
    }
    syncBendSettingsVisibility(page);
  });
}

export function installPipelineElasticBendSettingsUi(dialog) {
  if (!dialog || INSTALLED.has(dialog)) return Boolean(dialog);
  INSTALLED.add(dialog);
  installBendSettingsStyle(dialog.ownerDocument);
  const button = dialog.ownerDocument.createElement('button');
  button.type = 'button';
  button.className = 'p3d-elastic-open';
  button.textContent = 'Bend Settings';
  button.dataset.p3dElasticOpen = '1';
  const close = dialog.querySelector('[data-p3d-close]');
  if (close) close.before(button);
  else (dialog.querySelector('.fixture-actions') || dialog).appendChild(button);
  dialog.insertAdjacentHTML('beforeend', bendSettingsPageHtml());
  const page = dialog.querySelector('[data-p3d-elastic-page]');
  button.addEventListener('click', () => {
    writeBendSettings(page, loadElasticBendSettings());
    page.hidden = false;
    preview(dialog, page);
  });
  installChangeHandler(page);
  page.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    const name = target?.dataset.p3dElasticAction;
    if (name) action(dialog, page, name);
  });
  return true;
}

export const _test = Object.freeze({
  pageHtml: bendSettingsPageHtml,
  readSettings: (page) => readBendSettings(page, normalizeElasticBendSettings),
  buildInput,
  buildBranchInfo,
  syncVisibility: syncBendSettingsVisibility,
});
