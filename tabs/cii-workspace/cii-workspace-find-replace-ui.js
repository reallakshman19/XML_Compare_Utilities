import { renderFindReplacePanel } from './cii-workspace-find-replace.js';
import {
  appendFindReplaceManualRow,
  approveAllFindReplaceRows,
  createFindReplaceSession,
  decideFindReplaceRow,
  qualifyFindReplaceSession,
  resetFindReplaceDecisions,
  summarizeFindReplaceSession,
  withFindReplaceCsv,
  withFindReplaceMode,
  withFindReplaceTarget,
} from './cii-workspace-find-replace-session.js';

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

function defaultDownloadJson(documentRef, name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = href; link.download = name; link.hidden = true;
  documentRef.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(href);
}

function shortHash(value) {
  const text = String(value || '');
  return text ? `${text.slice(0, 16)}…` : '—';
}

function statusMessage(session, summary) {
  if (session.status === 'TARGET_VERSION_BLOCKED') return `Blocked: target is not CII v14 (${session.errors.join(', ')}).`;
  if (session.status === 'CSV_INVALID') return `CSV invalid: ${session.errors.join(', ')}`;
  if (session.status === 'VALIDATION_FAILED' || session.status === 'POSTIMAGE_BLOCKED' || session.status === 'QUALIFICATION_BLOCKED') {
    return `Blocked: ${session.errors.join(', ')}`;
  }
  if (session.status === 'QUALIFIED_PREVIEW') return `Qualified in-memory preview: ${session.qualification.preimage.claims.length} TARGET0-relative claim(s). File Apply remains disabled.`;
  if (!summary.targetLoaded) return 'Load a CII v14 target.';
  if (!session.rows.length) return 'Target loaded. Load CSV or add manual rows.';
  if (summary.blocked) return `${summary.blocked} row(s) blocked. Resolve before validation.`;
  if (summary.proposed) return `${summary.proposed} row(s) awaiting approval or rejection.`;
  if (summary.canValidate) return 'Review complete. Validate to build a qualified in-memory TARGET1 preview.';
  return 'Preview ready.';
}

function previewText(session) {
  const target1 = session.qualification?.postimage?.target1;
  if (!target1) return 'No qualified postimage yet.';
  const limit = 12000;
  return target1.length <= limit ? target1 : `${target1.slice(0, limit)}\n\n… preview truncated; full postimage retained in memory for validation only.`;
}

function manualInput(root) {
  return {
    from: root.querySelector('[data-ciifr-from]').value,
    to: root.querySelector('[data-ciifr-to]').value,
    block: root.querySelector('[data-ciifr-block]').value,
    findText: root.querySelector('[data-ciifr-find]').value,
    replaceText: root.querySelector('[data-ciifr-replace]').value,
    expectedMatches: root.querySelector('[data-ciifr-expected]').value,
  };
}

function clearManual(root) {
  root.querySelector('[data-ciifr-find]').value = '';
  root.querySelector('[data-ciifr-replace]').value = '';
  root.querySelector('[data-ciifr-expected]').value = '';
}

export function mountCiiFindReplaceShell(host, context = {}) {
  const documentRef = host.ownerDocument;
  const wrapper = documentRef.createElement('div');
  wrapper.innerHTML = renderFindReplacePanel();
  host.appendChild(wrapper);
  const root = wrapper.querySelector('[data-ciifr-workspace]');
  let session = createFindReplaceSession();

  const refs = {
    target: root.querySelector('[data-ciifr-target]'),
    csv: root.querySelector('[data-ciifr-csv]'),
    targetMeta: root.querySelector('[data-ciifr-target-meta]'),
    csvMeta: root.querySelector('[data-ciifr-csv-meta]'),
    body: root.querySelector('[data-ciifr-preview-body]'),
    status: root.querySelector('[data-ciifr-status]'),
    validate: root.querySelector('[data-ciifr-validate]'),
    approveAll: root.querySelector('[data-ciifr-approve-all]'),
    reset: root.querySelector('[data-ciifr-reset]'),
    audit: root.querySelector('[data-ciifr-export-audit]'),
  };

  function bindDecisionButtons() {
    for (const button of refs.body.querySelectorAll('[data-ciifr-decision]')) {
      button.addEventListener('click', () => {
        session = decideFindReplaceRow(session, Number(button.getAttribute('data-ciifr-sequence')), button.getAttribute('data-ciifr-decision'));
        render();
      });
    }
  }

  function renderRows() {
    refs.body.innerHTML = session.rows.length ? session.rows.map(rowHtml).join('') : '<tr><td colspan="8">Load CSV or add a manual row.</td></tr>';
    bindDecisionButtons();
  }

  function renderScope() {
    const showRange = session.mode !== 'DOCUMENT';
    const showBlock = session.mode === 'BLOCK';
    for (const field of root.querySelectorAll('[data-ciifr-range-field]')) field.hidden = !showRange;
    root.querySelector('[data-ciifr-block-field]').hidden = !showBlock;
  }

  function renderQualification(summary) {
    root.querySelector('[data-ciifr-source-hash]').textContent = shortHash(summary.sourceHash);
    root.querySelector('[data-ciifr-claims]').textContent = String(session.qualification?.preimage?.claims?.length || 0);
    root.querySelector('[data-ciifr-target-hash]').textContent = shortHash(session.qualification?.postimage?.audit?.targetHash);
    root.querySelector('[data-ciifr-qualification]').textContent = summary.qualified ? 'QUALIFIED PREVIEW' : 'Pending';
    root.querySelector('[data-ciifr-postimage-preview]').textContent = previewText(session);
  }

  function render() {
    const summary = summarizeFindReplaceSession(session);
    refs.targetMeta.textContent = session.target
      ? `${session.target.name} — v${session.target.version ?? '?'} — ${shortHash(session.target.hash)}`
      : 'No target loaded.';
    refs.csvMeta.textContent = session.csv ? `${session.csv.name} — ${session.csv.status}` : 'No CSV loaded. Manual rows may be entered below.';
    refs.status.textContent = statusMessage(session, summary);
    refs.validate.disabled = !summary.canValidate;
    refs.approveAll.disabled = summary.proposed === 0;
    refs.reset.disabled = (summary.approved + summary.rejected) === 0;
    refs.audit.disabled = !summary.qualified;
    root.querySelector('[data-ciifr-apply]').disabled = true;
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
    render();
  }

  function onAddRow() {
    session = appendFindReplaceManualRow(session, manualInput(root));
    clearManual(root); render();
  }

  function onApproveAll() { session = approveAllFindReplaceRows(session); render(); }
  function onReset() { session = resetFindReplaceDecisions(session); render(); }
  function onValidate() { session = qualifyFindReplaceSession(session); render(); }

  function onAudit() {
    const audit = session.qualification?.postimage?.audit;
    if (!audit) return;
    const download = context.downloadJson || ((name, value) => defaultDownloadJson(documentRef, name, value));
    download('cii-find-replace-audit.json', audit);
  }

  const listeners = [
    [refs.target, 'change', onTargetChange],
    [refs.csv, 'change', onCsvChange],
    [root.querySelector('[data-ciifr-add-row]'), 'click', onAddRow],
    [refs.approveAll, 'click', onApproveAll],
    [refs.reset, 'click', onReset],
    [refs.validate, 'click', onValidate],
    [refs.audit, 'click', onAudit],
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

export const _test = Object.freeze({ escapeHtml, ownerText, rowHtml, statusMessage, previewText });
