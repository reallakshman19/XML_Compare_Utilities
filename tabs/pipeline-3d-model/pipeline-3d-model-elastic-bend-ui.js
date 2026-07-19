import { buildPipelineProjectOutputs } from './pipeline-3d-model-project-adapter.js?v=20260719-bend-hardening-1';
import {
  DEFAULT_ELASTIC_BEND_SETTINGS,
  loadElasticBendSettings,
  normalizeElasticBendSettings,
  saveElasticBendSettings,
} from './pipeline-3d-model-elastic-bend-settings.js';

const INSTALLED = new WeakSet();
const STYLE_ID = 'pipeline-elastic-bend-settings-style';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function field(page, key) { return page.querySelector(`[data-p3d-elastic-field="${key}"]`); }

function ensureStyle(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.pipeline-3d-model-dialog{position:relative}.p3d-elastic-open{margin-right:84px;background:#0c4a6e;color:#e0f2fe;border:1px solid #38bdf8;border-radius:7px;padding:6px 10px;cursor:pointer}
.p3d-elastic-page{position:absolute;inset:0;z-index:40;background:#0b1220;color:#e2e8f0;display:grid;grid-template-rows:auto minmax(0,1fr);border-radius:18px;overflow:hidden}.p3d-elastic-page[hidden]{display:none}
.p3d-elastic-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(148,163,184,.25);background:linear-gradient(90deg,#082f49,#0f172a)}.p3d-elastic-head h3{margin:0;color:#e0f2fe}.p3d-elastic-head p{margin:4px 0 0;color:#fbbf24;font-size:12px;max-width:940px}
.p3d-elastic-actions{display:flex;gap:8px;flex-wrap:wrap}.p3d-elastic-actions button{background:#334155;color:#e2e8f0;border:1px solid rgba(148,163,184,.4);border-radius:7px;padding:7px 11px;cursor:pointer}.p3d-elastic-actions button[data-primary]{background:#0369a1;border-color:#38bdf8}
.p3d-elastic-body{min-height:0;overflow:auto;padding:14px;display:grid;grid-template-columns:minmax(370px,470px) minmax(600px,1fr);gap:14px}.p3d-elastic-card{background:#101a2b;border:1px solid rgba(148,163,184,.25);border-radius:12px;padding:12px}.p3d-elastic-card h4{margin:0 0 10px;color:#bfdbfe}.p3d-elastic-note{font-size:11px;line-height:1.45;color:#cbd5e1;background:#020617;border:1px solid rgba(148,163,184,.2);border-radius:7px;padding:8px;margin-bottom:9px}.p3d-elastic-note b{color:#7dd3fc}
.p3d-elastic-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.p3d-elastic-grid label{display:flex;flex-direction:column;gap:4px;color:#94a3b8;font-size:12px}.p3d-elastic-grid label.wide{grid-column:1/-1}.p3d-elastic-grid input,.p3d-elastic-grid select{background:#020617;color:#e2e8f0;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:6px}.p3d-elastic-checks{display:grid;gap:7px;margin:8px 0}.p3d-elastic-checks label{font-size:12px;color:#cbd5e1}
.p3d-elastic-summary{display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:8px;margin-bottom:10px}.p3d-elastic-metric{background:#020617;border:1px solid rgba(148,163,184,.22);border-radius:8px;padding:8px}.p3d-elastic-metric span{display:block;color:#94a3b8;font-size:11px}.p3d-elastic-metric b{font-family:monospace;color:#e0f2fe}
.p3d-elastic-result{overflow:auto;max-height:520px}.p3d-elastic-result table{width:100%;border-collapse:collapse;font-size:11px;min-width:1450px}.p3d-elastic-result th,.p3d-elastic-result td{padding:6px;border-bottom:1px solid rgba(148,163,184,.18);text-align:left}.p3d-elastic-result th{position:sticky;top:0;background:#111c2f;color:#bfdbfe}.p3d-elastic-warnings{margin-top:10px;color:#fde68a;font-size:12px;white-space:pre-wrap}.p3d-elastic-status{min-height:18px;color:#bbf7d0;font-size:12px;margin-top:8px}
@media(max-width:1000px){.p3d-elastic-body{grid-template-columns:1fr}.p3d-elastic-summary{grid-template-columns:1fr 1fr}}
`;
  doc.head.appendChild(style);
}

function pageHtml() {
  return `<section class="p3d-elastic-page" data-p3d-elastic-page hidden>
<div class="p3d-elastic-head"><div><h3>Pipeline Bend Settings</h3><p>Engineering screening and geometry gate only. The resolver does not replace pressure, temperature, installation, free-span, local-buckling or global-buckling verification.</p></div><div class="p3d-elastic-actions"><button data-p3d-elastic-action="reset">Reset</button><button data-p3d-elastic-action="preview">Preview</button><button data-p3d-elastic-action="download">Download Ledger</button><button data-p3d-elastic-action="save" data-primary>Save & Apply</button><button data-p3d-elastic-action="close">Close</button></div></div>
<div class="p3d-elastic-body"><div class="p3d-elastic-card"><h4>Policy and geometry inputs</h4>
<div class="p3d-elastic-note"><b>Elastic:</b> R = E×D/(2×Sb), plus project routing guidance. <b>Cold field:</b> ASME B31.4-2025 404.2.2 normal bands are 18D / 21D / 24D / 27D / 30D. A qualified 18D alternative for NPS 14+ requires evidence. The approximately 2 m tangent in 434.7.1(d) is treated as preferred unless adopted as the mandatory retained-straight allowance. Table 3 remains marker-only and is excluded from InputXML geometry.</div>
<div class="p3d-elastic-checks"><label><input type="checkbox" data-p3d-elastic-field="enabled"> Enable bend processing</label><label><input type="checkbox" data-p3d-elastic-field="emitToInputXml"> Emit feasible bends to InputXML</label><label><input type="checkbox" data-p3d-elastic-field="screeningOnlyAcknowledged"> I acknowledge separate combined-load engineering review is required</label><label><input type="checkbox" data-p3d-elastic-field="detectHorizontal"> Detect horizontal turns</label><label><input type="checkbox" data-p3d-elastic-field="detectVertical"> Detect vertical/profile turns</label><label><input type="checkbox" data-p3d-elastic-field="detectCompound"> Detect compound turns</label><label><input type="checkbox" data-p3d-elastic-field="useFormulaMinimum"> Use E×D/(2×Sb) elastic minimum</label><label><input type="checkbox" data-p3d-elastic-field="usePracticalMinimum"> Use elastic project practical D multiplier</label><label><input type="checkbox" data-p3d-elastic-field="useColdFieldProjectMinimum"> Use cold-field project D multiplier</label><label><input type="checkbox" data-p3d-elastic-field="useQualified18DAlternative"> Request qualified 18D alternative</label><label><input type="checkbox" data-p3d-elastic-field="diameterBasisConfirmed"> Confirm selected diameter is outside diameter</label><label><input type="checkbox" data-p3d-elastic-field="emitNearPointNode"> Emit explicit near-point node at 0°</label><label><input type="checkbox" data-p3d-elastic-field="emitMidpointNode"> Emit explicit midpoint node</label></div>
<div class="p3d-elastic-grid"><label class="wide">Bend class<select data-p3d-elastic-field="bendClass"><option value="elastic">Elastic route bend</option><option value="cold-field">Cold field bend</option></select></label><label class="wide">Diameter source<select data-p3d-elastic-field="diameterSource"><option value="branch-diameter">Line / Branch Diameter field</option><option value="explicit-od">Explicit outside diameter</option></select></label><label>Explicit OD (mm)<input inputmode="decimal" data-p3d-elastic-field="explicitOutsideDiameterMm"></label><label>Nominal pipe size NPS<input inputmode="decimal" data-p3d-elastic-field="nominalPipeSizeNps"></label><label>Young's modulus E (MPa)<input inputmode="decimal" data-p3d-elastic-field="youngsModulusMpa"></label><label>Allowable bending stress Sb (MPa)<input inputmode="decimal" data-p3d-elastic-field="allowableBendingStressMpa"></label><label>Elastic practical radius (D)<input inputmode="decimal" data-p3d-elastic-field="practicalRadiusMultiplierD"></label><label>Cold-field project radius (D)<input inputmode="decimal" data-p3d-elastic-field="coldFieldProjectRadiusMultiplierD"></label><label>Procedure minimum radius (D)<input inputmode="decimal" data-p3d-elastic-field="coldFieldProcedureMinimumRadiusD"></label><label>Qualification evidence reference<input data-p3d-elastic-field="qualificationEvidenceId"></label><label>Minimum turn angle (deg)<input inputmode="decimal" data-p3d-elastic-field="minimumTurnAngleDeg"></label><label>Maximum turn angle (deg)<input inputmode="decimal" data-p3d-elastic-field="maximumTurnAngleDeg"></label><label>Mandatory retained straight (mm)<input inputmode="decimal" data-p3d-elastic-field="retainedStraightAllowanceMm"></label><label>Preferred straight tangent (mm)<input inputmode="decimal" data-p3d-elastic-field="preferredStraightTangentMm"></label><label>Bend type<select data-p3d-elastic-field="bendTypeCode"><option value="0">0 — Welded</option><option value="1">1 — Single flanged</option><option value="2">2 — Double flanged</option></select></label></div><div class="p3d-elastic-status" data-p3d-elastic-status></div></div>
<div class="p3d-elastic-card"><h4>Resolution and candidate ledger</h4><div class="p3d-elastic-summary" data-p3d-elastic-summary></div><div class="p3d-elastic-result" data-p3d-elastic-result>Preview to calculate.</div><div class="p3d-elastic-warnings" data-p3d-elastic-warnings></div></div></div></section>`;
}

function writeSettings(page, settings) {
  for (const [key, value] of Object.entries(settings)) {
    const input = field(page, key);
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else input.value = value ?? '';
  }
}
function readSettings(page) {
  const values = {};
  for (const input of page.querySelectorAll('[data-p3d-elastic-field]')) {
    values[input.dataset.p3dElasticField] = input.type === 'checkbox' ? input.checked : input.value;
  }
  return normalizeElasticBendSettings(values);
}
function raw(dialog, name) { return dialog.querySelector(`[data-p3d-split="${name}"]`)?.value || ''; }
function buildInput(dialog, settings) {
  const branchInfo = { branchName: 'B1' };
  for (const input of dialog.querySelectorAll('[data-p3d-field]')) branchInfo[input.dataset.p3dField] = input.value?.trim() || '';
  branchInfo.branchName = branchInfo.lineNo || 'B1';
  return {
    table1Text: dialog.querySelector('[data-p3d="table1"]')?.value || '',
    table2Text: dialog.querySelector('[data-p3d="table2"]')?.value || '',
    table3Text: dialog.querySelector('[data-p3d="table3"]')?.value || '',
    profileRaw: { table2a: raw(dialog, 'table2a-raw'), table3a: raw(dialog, 'table3a-raw'), table3b: raw(dialog, 'table3b-raw'), table3c: raw(dialog, 'table3c-raw') },
    branchInfo, elasticBendSettings: settings,
  };
}
function fmt(value, digits = 3) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'; }
function metric(label, value) { return `<div class="p3d-elastic-metric"><span>${h(label)}</span><b>${h(value)}</b></div>`; }

function renderSummary(page, output) {
  const screening = output.elasticBends.screening;
  const policy = screening.coldFieldPolicy;
  const radiusD = screening.governingRadiusMm && screening.outsideDiameterMm
    ? screening.governingRadiusMm / screening.outsideDiameterMm : null;
  page.querySelector('[data-p3d-elastic-summary]').innerHTML = [
    metric('Bend class', screening.settings.bendClass),
    metric('Outside diameter', `${fmt(screening.outsideDiameterMm)} mm`),
    metric('Governing radius', `${fmt(screening.governingRadiusMm)} mm`),
    metric('Governing radius / D', fmt(radiusD)),
    metric('Elastic formula radius', `${fmt(screening.formulaRadiusMm)} mm`),
    metric('Elastic practical radius', `${fmt(screening.practicalRadiusMm)} mm`),
    metric('B31.4 normal code radius', policy ? `${fmt(policy.normalCodeRadiusD)}D` : '—'),
    metric('Selected code radius', policy ? `${fmt(policy.selectedCodeRadiusD)}D` : '—'),
    metric('Blocking errors', String(output.elasticBends.diagnostics.blockedCount || 0)),
  ].join('');
}
function renderCandidates(page, output) {
  const rows = output.elasticBends.candidates.map((item) => {
    const near = item.curvatureNodes?.find((node) => node.role === 'NEAR_POINT')?.nodeNumber ?? '—';
    const mid = item.curvatureNodes?.find((node) => node.role === 'MIDPOINT')?.nodeNumber ?? '—';
    return `<tr><td>${h(item.previousNode)}</td><td>${h(item.cornerNode)}</td><td>${h(item.nextNode)}</td><td>${h(item.classification)}</td><td>${fmt(item.planAngleDeg)}</td><td>${fmt(item.profileAngleDeg)}</td><td>${fmt(item.turnAngleDeg)}</td><td>${fmt(item.radiusMm)}</td><td>${fmt(item.tangentMm)}</td><td>${fmt(item.retainedStraightAllowanceMm)}</td><td>${fmt(item.requiredIncomingMm)}</td><td>${fmt(item.incomingLengthMm)}</td><td>${fmt(item.outgoingLengthMm)}</td><td>${h(near)}</td><td>${h(mid)}</td><td>${h(item.status)}</td></tr>`;
  }).join('');
  page.querySelector('[data-p3d-elastic-result]').innerHTML = `<table><thead><tr><th>Previous</th><th>Corner</th><th>Next</th><th>Class</th><th>Plan°</th><th>Profile°</th><th>3D°</th><th>Radius mm</th><th>Tangent mm</th><th>Retained mm</th><th>Required mm</th><th>Incoming mm</th><th>Outgoing mm</th><th>Near node</th><th>Mid node</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="16">No direction-change candidates.</td></tr>'}</tbody></table>`;
  const diagnostics = [...output.elasticBends.errors, ...output.elasticBends.warnings];
  page.querySelector('[data-p3d-elastic-warnings]').textContent = diagnostics.map((item) => `${item.severity}: ${item.code}: ${item.message}`).join('\n');
}
function preview(dialog, page) {
  try {
    const output = buildPipelineProjectOutputs(buildInput(dialog, readSettings(page)));
    page._elasticOutput = output;
    renderSummary(page, output); renderCandidates(page, output);
    page.querySelector('[data-p3d-elastic-status]').textContent = `${output.elasticBends.diagnostics.candidateCount} candidate(s), ${output.elasticBends.diagnostics.emittedCount} resolved, ${output.elasticBends.diagnostics.blockedCount} blocking error(s).`;
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
  const url = URL.createObjectURL(blob), link = dialog.ownerDocument.createElement('a');
  link.href = url; link.download = 'pipeline-elastic-bends.tsv'; link.click(); URL.revokeObjectURL(url);
}
function action(dialog, page, name) {
  if (name === 'close') page.hidden = true;
  if (name === 'reset') { writeSettings(page, DEFAULT_ELASTIC_BEND_SETTINGS); preview(dialog, page); }
  if (name === 'preview') preview(dialog, page);
  if (name === 'download') download(page, dialog);
  if (name === 'save') {
    saveElasticBendSettings(readSettings(page)); preview(dialog, page);
    dialog.querySelector('[data-p3d="run"]')?.click();
    page.querySelector('[data-p3d-elastic-status]').textContent += ' Settings saved and Pipeline output refreshed.';
  }
}

export function installPipelineElasticBendSettingsUi(dialog) {
  if (!dialog || INSTALLED.has(dialog)) return Boolean(dialog);
  INSTALLED.add(dialog); ensureStyle(dialog.ownerDocument);
  const button = dialog.ownerDocument.createElement('button');
  button.type = 'button'; button.className = 'p3d-elastic-open'; button.textContent = 'Bend Settings'; button.dataset.p3dElasticOpen = '1';
  const close = dialog.querySelector('[data-p3d-close]');
  if (close) close.before(button); else (dialog.querySelector('.fixture-actions') || dialog).appendChild(button);
  dialog.insertAdjacentHTML('beforeend', pageHtml());
  const page = dialog.querySelector('[data-p3d-elastic-page]');
  button.addEventListener('click', () => { writeSettings(page, loadElasticBendSettings()); page.hidden = false; preview(dialog, page); });
  page.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    const name = target?.dataset.p3dElasticAction;
    if (name) action(dialog, page, name);
  });
  return true;
}

export const _test = Object.freeze({ pageHtml, readSettings, buildInput });
