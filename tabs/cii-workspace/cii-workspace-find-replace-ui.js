import { renderFindReplacePanel } from './cii-workspace-find-replace.js';
import { buildFindReplaceDownloadArtifact } from './cii-workspace-find-replace-output.js';
import {
  applyFindReplaceToNewCopy,
  approveAllFindReplaceRows,
  createFindReplaceSession,
  decideFindReplaceRow,
  qualifyFindReplaceSession,
  replaceFindReplaceManualRows,
  resetFindReplaceDecisions,
  summarizeFindReplaceSession,
  withFindReplaceCsv,
  withFindReplaceMode,
  withFindReplaceTarget,
} from './cii-workspace-find-replace-session.js';

const GRID_FIELDS = Object.freeze({
  DOCUMENT: Object.freeze(['findText', 'replaceText', 'expectedMatches']),
  ELEMENT: Object.freeze(['from', 'to', 'findText', 'replaceText', 'expectedMatches']),
  BLOCK: Object.freeze(['from', 'to', 'block', 'findText', 'replaceText', 'expectedMatches']),
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function ownerText(row) {
  if (row.scope === 'DOCUMENT') return 'Whole document';
  const range = `${row.from ?? '?'} → ${row.to ?? '?'}`;
  return row.scope === 'BLOCK' ? `${range} / ${row.block || '?'}` : range;
}

function rowHtml(row) {
  const blocker = row.blockers?.length ? `<small>${escapeHtml(row.blockers.join(', '))}</small>` : '';
  const decisions = row.status === 'BLOCKED'
    ? 'Blocked'
    : `<button type="button" data-ciifr-decision="APPROVED" data-ciifr-sequence="${row.sequence}">Approve</button>
       <button type="button" data-ciifr-decision="REJECTED" data-ciifr-sequence="${row.sequence}">Reject</button>`;
  return `<tr>
    <td>${row.sequence}</td><td>${escapeHtml(row.source || '')}</td><td>${escapeHtml(row.scope)}</td>
    <td>${escapeHtml(ownerText(row))}</td><td><code>${escapeHtml(row.findText ?? row.before ?? '')}</code></td>
    <td><code>${escapeHtml(row.replaceText ?? row.after ?? '')}</code></td>
    <td><b>${escapeHtml(row.status)}</b>${blocker}</td><td>${decisions}</td>
  </tr>`;
}

function normalizeGridBlock(value) {
  const text = String(value ?? '').trim();
  const compact = text.toUpperCase().replace(/[\s_-]+/g, '');
  if (compact === 'NODENAME') return 'NODENAME';
  if (compact === 'DISPLACEMENT' || compact === 'DISPLMNT') return 'DISPLACEMENT';
  if (compact === 'FORCE' || compact === 'FORCMNT') return 'FORCE';
  return text.toUpperCase();
}

function blockOptions(selected = 'NODENAME') {
  const value = normalizeGridBlock(selected) || 'NODENAME';
  const base = [
    ['NODENAME', 'NODE NAME', false],
    ['DISPLACEMENT', 'DISPLACEMENT', false],
    ['FORCE', 'FORCE — qualification pending', true],
  ];
  if (value && !base.some(([candidate]) => candidate === value)) base.push([value, `${value} — unsupported`, false]);
  return base.map(([candidate, label, disabled]) =>
    `<option value="${escapeHtml(candidate)}"${candidate === value ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(label)}</option>`).join('');
}

function gridRowHtml(index, values = {}) {
  return `<tr data-ciifr-manual-row>
    <th class="ciifr-sheet-row-number" scope="row">${index + 1}</th>
    <td data-ciifr-grid-range><input type="number" min="0" step="1" data-ciifr-grid-field="from" value="${escapeHtml(values.from ?? '')}" aria-label="From row ${index + 1}"></td>
    <td data-ciifr-grid-range><input type="number" min="0" step="1" data-ciifr-grid-field="to" value="${escapeHtml(values.to ?? '')}" aria-label="To row ${index + 1}"></td>
    <td data-ciifr-grid-block><select data-ciifr-grid-field="block" aria-label="Block row ${index + 1}">${blockOptions(values.block)}</select></td>
    <td><input type="text" data-ciifr-grid-field="findText" value="${escapeHtml(values.findText ?? '')}" aria-label="Find Text row ${index + 1}"></td>
    <td><input type="text" data-ciifr-grid-field="replaceText" value="${escapeHtml(values.replaceText ?? '')}" aria-label="Replace Text row ${index + 1}"></td>
    <td><input type="number" min="0" step="1" data-ciifr-grid-field="expectedMatches" value="${escapeHtml(values.expectedMatches ?? '')}" aria-label="Expected Matches row ${index + 1}"></td>
    <td class="ciifr-sheet-action"><button type="button" data-ciifr-delete-row title="Delete row ${index + 1}" aria-label="Delete row ${index + 1}">×</button></td>
  </tr>`;
}

function visibleGridFields(mode) {
  return GRID_FIELDS[String(mode || 'DOCUMENT').toUpperCase()] || GRID_FIELDS.DOCUMENT;
}

function parseSpreadsheetPaste(text) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}

function isManualGridRowEmpty(input, mode) {
  return visibleGridFields(mode)
    .filter((field) => field !== 'block')
    .every((field) => String(input?.[field] ?? '').trim() === '');
}

function downloadBlob(documentRef, name, blob) {
  const href = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = href; link.download = name; link.hidden = true;
  documentRef.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(href);
}

function defaultDownloadJson(documentRef, name, value) {
  downloadBlob(documentRef, name, new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
}

function defaultDownloadText(documentRef, artifact) {
  downloadBlob(documentRef, artifact.fileName, new Blob([artifact.text], { type: artifact.mimeType }));
}

function shortHash(value) {
  const text = String(value || '');
  return text ? `${text.slice(0, 16)}…` : '—';
}

function statusMessage(session, summary) {
  if (session.status === 'TARGET_VERSION_BLOCKED') return `Blocked: target is not CII v14 (${session.errors.join(', ')}).`;
  if (session.status === 'CSV_INVALID') return `CSV invalid: ${session.errors.join(', ')}`;
  if (['VALIDATION_FAILED', 'POSTIMAGE_BLOCKED', 'QUALIFICATION_BLOCKED', 'APPLY_TO_NEW_COPY_BLOCKED'].includes(session.status)) {
    return `Blocked: ${session.errors.join(', ')}`;
  }
  if (summary.appliedToNewCopy) {
    return 'Applied to a new validated output copy. TARGET0 is unchanged; Download Modified CII is now available.';
  }
  if (session.status === 'QUALIFIED_PREVIEW') {
    return `Qualified preview: ${session.qualification.preimage.claims.length} TARGET0-relative claim(s). Click Apply to New Copy to explicitly release TARGET1; TARGET0 remains unchanged.`;
  }
  if (!summary.targetLoaded) return 'Load a CII v14 target.';
  if (!session.rows.length) return 'Target loaded. Load CSV or update the manual spreadsheet preview.';
  if (summary.blocked) return `${summary.blocked} row(s) blocked. Resolve before validation.`;
  if (summary.proposed) return `${summary.proposed} row(s) awaiting approval or rejection.`;
  if (summary.canValidate) return 'Review complete. Validate to build a qualified in-memory TARGET1 preview.';
  return 'Preview ready.';
}

function previewText(session) {
  const target1 = session.qualification?.postimage?.target1;
  if (!target1) return 'No qualified postimage yet.';
  const limit = 12000;
  return target1.length <= limit ? target1 : `${target1.slice(0, limit)}\n\n… preview truncated; full postimage retained in memory.`;
}

export function mountCiiFindReplaceShell(host, context = {}) {
  const documentRef = host.ownerDocument;
  const wrapper = documentRef.createElement('div');
  wrapper.innerHTML = renderFindReplacePanel();
  host.appendChild(wrapper);
  const root = wrapper.querySelector('[data-ciifr-workspace]');
  let session = createFindReplaceSession();
  let manualGridDirty = false;

  const refs = {
    target: root.querySelector('[data-ciifr-target]'),
    csv: root.querySelector('[data-ciifr-csv]'),
    targetMeta: root.querySelector('[data-ciifr-target-meta]'),
    csvMeta: root.querySelector('[data-ciifr-csv-meta]'),
    body: root.querySelector('[data-ciifr-preview-body]'),
    manualGrid: root.querySelector('[data-ciifr-manual-grid]'),
    manualBody: root.querySelector('[data-ciifr-manual-body]'),
    status: root.querySelector('[data-ciifr-status]'),
    validate: root.querySelector('[data-ciifr-validate]'),
    approveAll: root.querySelector('[data-ciifr-approve-all]'),
    reset: root.querySelector('[data-ciifr-reset]'),
    apply: root.querySelector('[data-ciifr-apply]'),
    audit: root.querySelector('[data-ciifr-export-audit]'),
    download: root.querySelector('[data-ciifr-download]'),
  };

  function manualRows() {
    return [...refs.manualBody.querySelectorAll('[data-ciifr-manual-row]')];
  }

  function renumberManualRows() {
    manualRows().forEach((row, index) => {
      const number = row.querySelector('.ciifr-sheet-row-number');
      if (number) number.textContent = String(index + 1);
      for (const control of row.querySelectorAll('[data-ciifr-grid-field]')) {
        const label = control.getAttribute('aria-label') || '';
        control.setAttribute('aria-label', label.replace(/row \d+$/i, `row ${index + 1}`));
      }
      const remove = row.querySelector('[data-ciifr-delete-row]');
      remove?.setAttribute('aria-label', `Delete row ${index + 1}`);
      remove?.setAttribute('title', `Delete row ${index + 1}`);
    });
  }

  function addManualRow(values = {}, focusField = null) {
    const index = manualRows().length;
    refs.manualBody.insertAdjacentHTML('beforeend', gridRowHtml(index, values));
    renderScope();
    if (focusField) refs.manualBody.lastElementChild?.querySelector(`[data-ciifr-grid-field="${focusField}"]`)?.focus();
  }

  function ensureManualRows(count) {
    while (manualRows().length < count) addManualRow();
  }

  function resetManualGrid(count = 3) {
    refs.manualBody.innerHTML = '';
    ensureManualRows(count);
  }

  function gridInput(row) {
    const value = (field) => row.querySelector(`[data-ciifr-grid-field="${field}"]`)?.value ?? '';
    return {
      from: value('from'),
      to: value('to'),
      block: value('block'),
      findText: value('findText'),
      replaceText: value('replaceText'),
      expectedMatches: value('expectedMatches'),
    };
  }

  function manualGridInputs() {
    return manualRows().map(gridInput).filter((input) => !isManualGridRowEmpty(input, session.mode));
  }

  function setGridCell(row, field, value) {
    const control = row.querySelector(`[data-ciifr-grid-field="${field}"]`);
    if (!control) return;
    if (field === 'block') {
      const normalized = normalizeGridBlock(value);
      if (normalized && ![...control.options].some((option) => option.value === normalized)) {
        const option = documentRef.createElement('option');
        option.value = normalized;
        option.textContent = `${normalized} — unsupported`;
        control.appendChild(option);
      }
      control.value = normalized || 'NODENAME';
      return;
    }
    control.value = String(value ?? '');
  }

  function markManualGridDirty() {
    if (manualGridDirty) return;
    if (session.qualification || session.release) {
      session = replaceFindReplaceManualRows(session, manualGridInputs());
    }
    manualGridDirty = true;
    render();
  }

  function bindDecisionButtons() {
    for (const button of refs.body.querySelectorAll('[data-ciifr-decision]')) {
      button.disabled = manualGridDirty;
      button.addEventListener('click', () => {
        if (manualGridDirty) return;
        session = decideFindReplaceRow(session, Number(button.getAttribute('data-ciifr-sequence')), button.getAttribute('data-ciifr-decision'));
        render();
      });
    }
  }

  function renderRows() {
    refs.body.innerHTML = session.rows.length ? session.rows.map(rowHtml).join('') : '<tr><td colspan="8">Load CSV or update the manual spreadsheet preview.</td></tr>';
    bindDecisionButtons();
  }

  function renderScope() {
    const showRange = session.mode !== 'DOCUMENT';
    const showBlock = session.mode === 'BLOCK';
    for (const field of root.querySelectorAll('[data-ciifr-grid-range]')) field.hidden = !showRange;
    for (const field of root.querySelectorAll('[data-ciifr-grid-block]')) field.hidden = !showBlock;
  }

  function renderQualification(summary) {
    root.querySelector('[data-ciifr-source-hash]').textContent = shortHash(summary.sourceHash);
    root.querySelector('[data-ciifr-claims]').textContent = String(session.qualification?.preimage?.claims?.length || 0);
    root.querySelector('[data-ciifr-target-hash]').textContent = shortHash(session.qualification?.postimage?.audit?.targetHash);
    root.querySelector('[data-ciifr-qualification]').textContent = summary.appliedToNewCopy
      ? 'APPLIED TO NEW COPY'
      : summary.qualified ? 'QUALIFIED PREVIEW' : 'Pending';
    root.querySelector('[data-ciifr-postimage-preview]').textContent = previewText(session);
  }

  function render() {
    const summary = summarizeFindReplaceSession(session);
    refs.targetMeta.textContent = session.target
      ? `${session.target.name} — v${session.target.version ?? '?'} — ${shortHash(session.target.hash)}`
      : 'No target loaded.';
    refs.csvMeta.textContent = session.csv ? `${session.csv.name} — ${session.csv.status}` : 'No CSV loaded. Manual spreadsheet rows may be entered below.';
    refs.status.textContent = manualGridDirty
      ? 'Manual spreadsheet changed. Click Update Preview before review, validation, Apply, or Download.'
      : statusMessage(session, summary);
    refs.validate.disabled = manualGridDirty || !summary.canValidate;
    refs.approveAll.disabled = manualGridDirty || summary.proposed === 0;
    refs.reset.disabled = manualGridDirty || (summary.approved + summary.rejected) === 0;
    refs.apply.disabled = manualGridDirty || !summary.canApplyToNewCopy;
    refs.audit.disabled = manualGridDirty || !summary.qualified;
    refs.download.disabled = manualGridDirty || !summary.canDownload;
    renderScope(); renderRows(); renderQualification(summary);
  }

  async function onTargetChange() {
    const file = refs.target.files?.[0];
    if (!file) return;
    session = withFindReplaceTarget(session, { name: file.name, text: await file.text() });
    render();
  }

  async function onCsvChange() {
    const file = refs.csv.files?.[0];
    if (!file) return;
    session = withFindReplaceCsv(session, { name: file.name, text: await file.text(), mode: session.mode });
    render();
  }

  function onScopeChange(event) {
    if (!event.target.checked) return;
    session = withFindReplaceMode(session, event.target.value);
    manualGridDirty = manualGridInputs().length > 0;
    render();
  }

  function onAddRow() {
    addManualRow({}, visibleGridFields(session.mode)[0]);
  }

  function onClearGrid() {
    resetManualGrid();
    session = replaceFindReplaceManualRows(session, []);
    manualGridDirty = false;
    render();
  }

  function onSyncGrid() {
    session = replaceFindReplaceManualRows(session, manualGridInputs());
    manualGridDirty = false;
    render();
  }

  function onGridInput() {
    markManualGridDirty();
  }

  function onDeleteGridRow(event) {
    const button = event.target.closest?.('[data-ciifr-delete-row]');
    if (!button) return;
    const row = button.closest('[data-ciifr-manual-row]');
    const changedOperationalData = row && !isManualGridRowEmpty(gridInput(row), session.mode);
    row?.remove();
    if (!manualRows().length) addManualRow();
    renumberManualRows();
    if (changedOperationalData) markManualGridDirty();
  }

  function onGridPaste(event) {
    const control = event.target.closest?.('[data-ciifr-grid-field]');
    if (!control) return;
    const text = event.clipboardData?.getData('text/plain');
    if (text == null) return;
    const matrix = parseSpreadsheetPaste(text);
    if (!matrix.length) return;
    event.preventDefault();
    const fields = visibleGridFields(session.mode);
    const startField = fields.indexOf(control.getAttribute('data-ciifr-grid-field'));
    if (startField < 0) return;
    const startRow = manualRows().indexOf(control.closest('[data-ciifr-manual-row]'));
    if (startRow < 0) return;
    ensureManualRows(startRow + matrix.length);
    const rows = manualRows();
    matrix.forEach((cells, rowOffset) => {
      cells.forEach((value, columnOffset) => {
        const field = fields[startField + columnOffset];
        if (field) setGridCell(rows[startRow + rowOffset], field, value);
      });
    });
    markManualGridDirty();
  }

  function onGridKeyDown(event) {
    const control = event.target.closest?.('[data-ciifr-grid-field]');
    if (!control || event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const field = control.getAttribute('data-ciifr-grid-field');
    const rowIndex = manualRows().indexOf(control.closest('[data-ciifr-manual-row]'));
    if (rowIndex < 0) return;
    ensureManualRows(rowIndex + 2);
    manualRows()[rowIndex + 1]?.querySelector(`[data-ciifr-grid-field="${field}"]`)?.focus();
  }

  function onApproveAll() {
    if (manualGridDirty) return;
    session = approveAllFindReplaceRows(session); render();
  }
  function onReset() {
    if (manualGridDirty) return;
    session = resetFindReplaceDecisions(session); render();
  }
  function onValidate() {
    if (manualGridDirty) return;
    session = qualifyFindReplaceSession(session); render();
  }
  function onApply() {
    if (manualGridDirty) return;
    session = applyFindReplaceToNewCopy(session); render();
  }

  function onAudit() {
    if (manualGridDirty) return;
    const audit = session.qualification?.postimage?.audit;
    if (!audit) return;
    const download = context.downloadJson || ((name, value) => defaultDownloadJson(documentRef, name, value));
    download('cii-find-replace-audit.json', audit);
  }

  function onDownload() {
    if (manualGridDirty || session.release?.status !== 'APPLIED_TO_NEW_COPY') return;
    const result = buildFindReplaceDownloadArtifact(session);
    if (result.status !== 'READY_FOR_DOWNLOAD') {
      context.showToast?.(`Download blocked: ${result.blockers.join(', ')}`);
      return;
    }
    if (result.artifact.receipt.targetHash !== session.release.targetHash) {
      context.showToast?.('Download blocked: applied TARGET1 hash no longer matches the qualified output.');
      return;
    }
    const download = context.downloadText || ((artifact) => defaultDownloadText(documentRef, artifact));
    download(result.artifact);
  }

  resetManualGrid();

  const listeners = [
    [refs.target, 'change', onTargetChange],
    [refs.csv, 'change', onCsvChange],
    [root.querySelector('[data-ciifr-add-row]'), 'click', onAddRow],
    [root.querySelector('[data-ciifr-clear-grid]'), 'click', onClearGrid],
    [root.querySelector('[data-ciifr-sync-grid]'), 'click', onSyncGrid],
    [refs.manualBody, 'click', onDeleteGridRow],
    [refs.manualGrid, 'input', onGridInput],
    [refs.manualGrid, 'paste', onGridPaste],
    [refs.manualGrid, 'keydown', onGridKeyDown],
    [refs.approveAll, 'click', onApproveAll],
    [refs.reset, 'click', onReset],
    [refs.validate, 'click', onValidate],
    [refs.apply, 'click', onApply],
    [refs.audit, 'click', onAudit],
    [refs.download, 'click', onDownload],
    [root.querySelector('[data-ciifr-close]'), 'click', context.close || (() => {})],
  ];
  for (const scope of root.querySelectorAll('[data-ciifr-scope]')) listeners.push([scope, 'change', onScopeChange]);
  for (const [node, type, handler] of listeners) node?.addEventListener(type, handler);

  render();
  return Object.freeze({
    destroy() {
      for (const [node, type, handler] of listeners) node?.removeEventListener(type, handler);
      wrapper.remove();
    },
    getSession() { return session; },
  });
}

export const _test = Object.freeze({
  escapeHtml,
  ownerText,
  rowHtml,
  statusMessage,
  previewText,
  normalizeGridBlock,
  visibleGridFields,
  parseSpreadsheetPaste,
  isManualGridRowEmpty,
});
