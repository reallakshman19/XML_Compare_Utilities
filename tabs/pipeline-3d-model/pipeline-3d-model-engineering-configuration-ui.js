import {
  createEmptyPipelineEngineeringConfigurationDraft,
  setPipelineEngineeringConfigurationField,
  updatePipelineEngineeringConfigurationDraftCollections,
} from './pipeline-3d-model-engineering-configuration-fields.js';
import {
  PIPELINE_ENGINEERING_CONFIGURATION_STORAGE_KEY,
  confirmPipelineEngineeringConfigurationFields,
  loadPipelineEngineeringConfigurationDraft,
  rejectAllPipelineEngineeringLegacyFields,
  rejectPipelineEngineeringConfigurationFields,
  savePipelineEngineeringConfigurationDraft,
} from './pipeline-3d-model-engineering-configuration-storage.js';
import {
  buildPipelineEngineeringConfigurationPlan,
  buildPipelineEngineeringConfigurationTsv,
} from './pipeline-3d-model-engineering-configuration.js';
import {
  buildPipelineEngineeringConfigurationBlockerText,
  buildPipelineEngineeringConfigurationJson,
} from './pipeline-3d-model-engineering-configuration-contracts.js';
import {
  analysisSectionRowHtml,
  engineeringConfigurationEscapeHtml,
  engineeringConfigurationHtml,
} from './pipeline-3d-model-engineering-configuration-ui-view.js';

const INSTANCES = new WeakMap();
const STATUS = Object.freeze({ SOURCE_DERIVED: 'Source-derived', USER_ENTERED: 'User-entered',
  LEGACY_UNCONFIRMED: 'Legacy — confirmation required', CONFIRMED: 'Confirmed',
  UNSET: 'Missing', INVALID: 'Invalid', NOT_APPLICABLE: 'Not applicable' });
const STYLE_ID = 'pipeline-engineering-configuration-style';
function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style'); style.id = STYLE_ID;
  style.textContent = `.p3d-engineering-config{width:min(1180px,96vw);max-height:94vh;padding:0;background:#07101d;color:#e2e8f0;border:1px solid #475569;border-radius:12px}
.p3d-engineering-config::backdrop{background:rgba(2,6,23,.78)}.p3d-engineering-config header,.p3d-engineering-config footer{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 16px;background:#0f172a;position:sticky;z-index:3}.p3d-engineering-config header{top:0}.p3d-engineering-config footer{bottom:0;flex-wrap:wrap}.p3d-engineering-config h3,.p3d-engineering-config h4,.p3d-engineering-config h5{margin:0 0 8px}.p3d-engineering-config p{margin:3px 0}.p3d-config-body{padding:12px;display:grid;gap:10px}.p3d-config-section{border:1px solid #334155;border-radius:9px;padding:11px;background:#0b1220}.p3d-config-grid,.p3d-config-section-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px}.p3d-config-section-row{border-top:1px solid #334155;padding:10px 0}.p3d-config-section label{display:grid;gap:4px;font-size:12px}.p3d-config-section input,.p3d-config-section select{background:#020617;color:#e2e8f0;border:1px solid #475569;border-radius:6px;padding:7px}.p3d-config-section small{color:#94a3b8}.p3d-config-section small[data-state="INVALID"],.p3d-config-section small[data-state="LEGACY_UNCONFIRMED"]{color:#fca5a5}.p3d-config-check{grid-template-columns:auto 1fr;align-items:center}.p3d-config-check small{grid-column:2}.p3d-config-actions{display:flex;gap:7px;flex-wrap:wrap}.p3d-config-actions button{border:1px solid #475569;border-radius:7px;background:#1e293b;color:#fff;padding:7px 10px}.p3d-config-actions button:disabled{opacity:.45}.p3d-config-actions.compact{margin-top:8px}.p3d-config-note{color:#cbd5e1;font-size:12px}.p3d-engineering-config pre{white-space:pre-wrap;max-height:280px;overflow:auto;background:#020617;padding:9px;border-radius:6px}.p3d-config-legacy-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1e293b}`;
  doc.head.appendChild(style);
}
function saveText(doc, name, content, mime) {
  const blob = new Blob([content], { type: mime }), url = URL.createObjectURL(blob);
  const link = doc.createElement('a'); link.href = url; link.download = name;
  doc.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function toolbarButton(host) {
  const existing = host.querySelector('[data-p3d-engineering-config-open]'); if (existing) return existing;
  const button = host.ownerDocument.createElement('button'); button.type = 'button';
  button.dataset.p3dEngineeringConfigOpen = 'true'; button.textContent = 'Engineering Configuration';
  const anchor = host.querySelector('[data-p3d="run"]')?.parentElement || host.querySelector('.p3d-toolbar') || host;
  anchor.appendChild(button); return button;
}
function fieldElement(modal, fieldId) {
  return modal.querySelector(`[data-p3d-config-field="${CSS.escape(fieldId)}"]`);
}
function renderField(modal, field) {
  const element = fieldElement(modal, field.fieldId); if (!element) return;
  if (element.type === 'checkbox') element.checked = field.value === true;
  else element.value = field.value ?? '';
  const status = modal.querySelector(`[data-p3d-config-status="${CSS.escape(field.fieldId)}"]`);
  if (status) { status.textContent = STATUS[field.state] || field.state; status.dataset.state = field.state; }
}
function sectionValue(section, key) { return section?.[key] ?? ''; }
function renderSections(instance) {
  const host = instance.modal.querySelector('[data-p3d-config-sections]'); if (!host) return;
  const sections = instance.draft.sections.length ? instance.draft.sections : [{}];
  host.innerHTML = sections.map((section, index) => analysisSectionRowHtml(section, index)).join('');
  sections.forEach((section, index) => {
    for (const key of ['startElementIndex', 'profileId', 'outsideDiameterMm',
      'nominalPipeSizeNps', 'greVendorNominalBoreMm']) {
      const element = fieldElement(instance.modal, `section:${index}:${key}`);
      if (element) element.value = sectionValue(section, key);
    }
  });
}
function renderLegacy(instance) {
  const host = instance.modal.querySelector('[data-p3d-config-legacy]'); if (!host) return;
  const fields = Object.values(instance.draft.fields).filter((item) => item.legacyObserved);
  if (!fields.length) { host.textContent = 'No legacy evidence observed.'; return; }
  host.innerHTML = fields.map((item) => `<div class="p3d-config-legacy-row"><code>${engineeringConfigurationEscapeHtml(item.fieldId)}</code>
<span>${engineeringConfigurationEscapeHtml(item.value)}</span><span>${STATUS[item.state] || item.state}</span>
<button type="button" data-p3d-config-confirm="${engineeringConfigurationEscapeHtml(item.fieldId)}">Confirm</button>
<button type="button" data-p3d-config-reject="${engineeringConfigurationEscapeHtml(item.fieldId)}">Reject</button></div>`).join('')
    + '<div class="p3d-config-actions compact"><button type="button" data-p3d-config-action="confirm-legacy">Confirm all observed</button><button type="button" data-p3d-config-action="reject-legacy">Reject all legacy</button></div>';
}
function render(instance, validate = true) {
  Object.values(instance.draft.fields).forEach((field) => renderField(instance.modal, field));
  renderSections(instance); renderLegacy(instance);
  if (validate) instance.plan = buildPipelineEngineeringConfigurationPlan(instance.draft);
  const summary = instance.modal.querySelector('[data-p3d-config-summary]');
  if (summary) summary.textContent = instance.plan?.ready
    ? 'Ready — all required evidence is explicit.'
    : `Blocked — ${instance.plan?.blockerCodes?.length || 0} blocker(s).`;
  const preview = instance.modal.querySelector('[data-p3d-config-preview]');
  if (preview) preview.textContent = buildPipelineEngineeringConfigurationJson(instance.plan || instance.draft);
  const diameter = instance.modal.querySelector('[data-p3d-config-diameter-preview]');
  if (diameter) diameter.textContent = (instance.plan?.analysisSections || []).map((section) =>
    `${section.analysisSectionId}: ${section.profileId || 'Missing profile'} — OD ${section.outsideDiameterMm ?? 'Missing'} mm — ${section.ready ? 'Ready' : 'Blocked'}`).join('\n') || 'No sections configured.';
  const apply = instance.modal.querySelector('[data-p3d-config-action="apply"]');
  if (apply) apply.disabled = instance.plan?.ready !== true;
}
function sectionInput(instance, fieldId, raw) {
  const [, indexText, key] = fieldId.split(':'), index = Number(indexText);
  const sections = instance.draft.sections.length ? instance.draft.sections.map((item) => ({ ...item })) : [{}];
  if (!sections[index]) sections[index] = {};
  sections[index][key] = raw === '' ? null : (['profileId'].includes(key) ? raw : Number(raw));
  instance.draft = updatePipelineEngineeringConfigurationDraftCollections(instance.draft, { sections });
}
function onField(instance, target) {
  const fieldId = target.dataset.p3dConfigField; if (!fieldId) return;
  const raw = target.type === 'checkbox' ? target.checked : target.value;
  if (fieldId.startsWith('section:')) sectionInput(instance, fieldId, raw);
  else instance.draft = setPipelineEngineeringConfigurationField(instance.draft, fieldId, raw);
  render(instance);
}
function addSection(instance) {
  const sections = instance.draft.sections.length ? [...instance.draft.sections] : [{}];
  sections.push({}); instance.draft = updatePipelineEngineeringConfigurationDraftCollections(instance.draft, { sections });
  render(instance);
}
function removeSection(instance, index) {
  const sections = instance.draft.sections.filter((_, itemIndex) => itemIndex !== index);
  instance.draft = updatePipelineEngineeringConfigurationDraftCollections(instance.draft, { sections }); render(instance);
}
function apply(instance) {
  render(instance); if (!instance.plan.ready) return;
  instance.draft = savePipelineEngineeringConfigurationDraft(instance.draft);
  instance.host.dispatchEvent(new CustomEvent('pipeline-engineering-configuration-apply', {
    bubbles: true, detail: { draft: instance.draft, plan: instance.plan },
  }));
  instance.host.querySelector('[data-p3d="run"]')?.click();
}
function importVisibleBranch(instance) {
  const mapping = { jobName: 'jobName', issueNo: 'issueNo', caesarVersion: 'caesarVersion',
    branchName: 'branchName', lineNo: 'lineNo', outsideDiameterMm: 'outsideDiameterMm',
    wallThickness: 'wallThickness', materialCode: 'materialNumber',
    corrosionAllowance: 'corrosionAllowance', insulationThickness: 'insulationThickness',
    insulationDensity: 'insulationDensity', fluidDensity: 'fluidDensity', hydroPressure: 'hydroPressure' };
  for (let index = 1; index <= 9; index += 1) {
    mapping[`p${index}`] = `pressure${index}`; mapping[`t${index}`] = `temperature${index}`;
  }
  let draft = instance.draft;
  for (const [sourceKey, fieldId] of Object.entries(mapping)) {
    const raw = instance.host.querySelector(`[data-p3d-field="${sourceKey}"]`)?.value;
    if (raw === undefined || raw === '') continue;
    draft = setPipelineEngineeringConfigurationField(draft, fieldId, raw, {
      state: 'CONFIRMED', sourceKind: 'BRANCH_INPUT_BLOCK', userConfirmed: true,
      sourceReference: `visible-branch-block:${sourceKey}`,
    });
  }
  instance.draft = draft; render(instance);
}
function action(instance, name) {
  if (name === 'close') { instance.modal.close(); return; }
  if (name === 'save') { instance.draft = savePipelineEngineeringConfigurationDraft(instance.draft); render(instance); return; }
  if (name === 'validate') { render(instance); return; }
  if (name === 'apply') { apply(instance); return; }
  if (name === 'import-branch') { importVisibleBranch(instance); return; }
  if (name === 'clear') { instance.draft = createEmptyPipelineEngineeringConfigurationDraft(
    PIPELINE_ENGINEERING_CONFIGURATION_STORAGE_KEY); render(instance); return; }
  if (name === 'confirm-legacy') { instance.draft = confirmPipelineEngineeringConfigurationFields(instance.draft,
    Object.values(instance.draft.fields).filter((item) => item.legacyObserved).map((item) => item.fieldId)); render(instance); return; }
  if (name === 'reject-legacy') { instance.draft = rejectAllPipelineEngineeringLegacyFields(instance.draft); render(instance); return; }
  const exports = {
    'export-json': ['pipeline-engineering-configuration.json', buildPipelineEngineeringConfigurationJson(instance.plan), 'application/json'],
    'export-tsv': ['pipeline-engineering-configuration.tsv', buildPipelineEngineeringConfigurationTsv(instance.plan), 'text/tab-separated-values'],
    'export-blockers': ['pipeline-engineering-configuration-blockers.tsv', buildPipelineEngineeringConfigurationBlockerText(instance.plan), 'text/tab-separated-values'],
  };
  if (exports[name]) saveText(instance.modal.ownerDocument, ...exports[name]);
}
export function installPipelineEngineeringConfigurationUi(host) {
  if (!host || INSTANCES.has(host)) return INSTANCES.get(host)?.destroy || null;
  const doc = host.ownerDocument; ensureStyle(doc); host.insertAdjacentHTML('beforeend', engineeringConfigurationHtml());
  const modal = host.querySelector('[data-p3d-engineering-config]'), open = toolbarButton(host);
  const instance = { host, modal, draft: loadPipelineEngineeringConfigurationDraft(), plan: null };
  const controller = new AbortController();
  open.addEventListener('click', () => { render(instance); modal.showModal(); }, { signal: controller.signal });
  modal.addEventListener('input', (event) => onField(instance, event.target), { signal: controller.signal });
  modal.addEventListener('change', (event) => onField(instance, event.target), { signal: controller.signal });
  modal.addEventListener('click', (event) => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.p3dConfigRemoveSection !== undefined) removeSection(instance,
      Number(button.dataset.p3dConfigRemoveSection));
    else if (button.dataset.p3dConfigConfirm) { instance.draft = confirmPipelineEngineeringConfigurationFields(
      instance.draft, [button.dataset.p3dConfigConfirm]); render(instance); }
    else if (button.dataset.p3dConfigReject) { instance.draft = rejectPipelineEngineeringConfigurationFields(
      instance.draft, [button.dataset.p3dConfigReject]); render(instance); }
    else if (button.dataset.p3dConfigAction === 'add-section') addSection(instance);
    else if (button.dataset.p3dConfigAction) action(instance, button.dataset.p3dConfigAction);
  }, { signal: controller.signal });
  render(instance);
  instance.destroy = () => { controller.abort(); modal.remove(); open.remove(); INSTANCES.delete(host); };
  INSTANCES.set(host, instance); return instance.destroy;
}
export const _test = Object.freeze({ STATUS, sectionInput });
