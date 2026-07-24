/** Escaped presentation of explicit Revision Compare transfer intent and retained evidence. */
const DOWNLOADS = Object.freeze([
  ['data-revc-download-patched-json', 'Download patched target JSON'],
  ['data-revc-download-transfer-audit', 'Download transfer audit'],
  ['data-revc-download-transfer-proof', 'Download transfer proof'],
  ['data-revc-download-transfer-manifest', 'Download transfer manifest'],
]);
const TRANSFER_CSS = `.revc-transfer-section{display:grid;gap:1rem;padding:1rem;border:1px solid var(--border,#445);border-radius:.75rem}.revc-transfer-section>header,.revc-transfer-plan>header,.revc-transfer-result>header{display:flex;justify-content:space-between;gap:1rem}.revc-transfer-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.5rem}.revc-transfer-facts div{min-width:0}.revc-transfer-facts dd{overflow-wrap:anywhere}.revc-transfer-pair{display:grid;gap:.65rem;padding:.75rem;border:1px solid var(--border,#445);border-radius:.5rem}.revc-transfer-pair>label{display:grid;grid-template-columns:auto 1fr 1fr auto;gap:.75rem;align-items:start}.revc-transfer-field{display:flex;gap:.5rem;padding:.5rem}.revc-transfer-field span{display:grid;gap:.2rem;min-width:0}.revc-transfer-field code,.revc-transfer-operation-row code{overflow-wrap:anywhere}.revc-transfer-table-wrap{overflow:auto}.revc-transfer-section table{width:100%;border-collapse:collapse}.revc-transfer-section th,.revc-transfer-section td{padding:.5rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--border,#445)}.revc-transfer-section td small{display:block}.revc-transfer-invariants{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.4rem;list-style:none;padding:0}.revc-transfer-invariants li{display:flex;gap:.5rem}.revc-transfer-section pre{max-height:24rem;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}`;
const INVARIANTS = Object.freeze([
  ['jsonReparseSucceeded', 'JSON reparse succeeded'],
  ['supportedRootAndProfile', 'Root/profile preserved'],
  ['schemaAndEnvelopeUnchanged', 'Schema/envelope preserved'],
  ['entityCountUnchanged', 'Entity count preserved'],
  ['entityIdentitiesUnchanged', 'Entity identities preserved'],
  ['hierarchyAndTopologyUnchanged', 'Hierarchy/topology preserved'],
  ['arrayLengthsAndOrderUnchanged', 'Array lengths/order preserved'],
  ['objectKeyOrderPreserved', 'Object-key order preserved'],
  ['unknownFieldsRetained', 'Unknown fields retained'],
  ['unselectedValuesUnchanged', 'Unselected values unchanged'],
  ['everyMutationCoveredExactlyOnce', 'Every mutation covered exactly once'],
]);

export function escapeRevisionCompareTransferHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
function valueText(value) {
  if (value === undefined) return 'ABSENT';
  return typeof value === 'string' ? value : JSON.stringify(value);
}
function selectedPair(model, differenceId) {
  return model?.draft?.pairs?.find((pair) => pair.differenceId === differenceId) ?? null;
}
function messages(values, tone = 'blocker') {
  if (!values?.length) return '';
  return `<ul class="revc-transfer-messages" data-tone="${tone}">${values.map((value) => `<li>${escapeRevisionCompareTransferHtml(value)}</li>`).join('')}</ul>`;
}
function fieldMarkup(field, pair, differenceId) {
  const checked = pair?.fieldKeys.includes(field.fieldKey); const disabled = !pair || !field.eligible;
  const current = field.targetState === 'PRESENT' ? valueText(field.targetValue) : 'ABSENT';
  return `<label class="revc-transfer-field" data-policy="${escapeRevisionCompareTransferHtml(field.policy.classification.toLowerCase())}"><input type="checkbox" data-revc-transfer-field="${escapeRevisionCompareTransferHtml(field.fieldKey)}" data-revc-transfer-difference-id="${escapeRevisionCompareTransferHtml(differenceId)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span><b>${escapeRevisionCompareTransferHtml(field.propertyKey)}</b><code>${escapeRevisionCompareTransferHtml(field.targetFieldPath || 'Unresolved path')}</code><small>Current: ${escapeRevisionCompareTransferHtml(current)} · Donor: ${escapeRevisionCompareTransferHtml(valueText(field.sourceValue))}</small><em>${escapeRevisionCompareTransferHtml(field.policy.classification)} · ${escapeRevisionCompareTransferHtml(field.policy.ruleId)}</em>${messages(field.blockers)}</span></label>`;
}
function pairMarkup(candidate, model) {
  const pair = selectedPair(model, candidate.differenceId); const checked = Boolean(pair);
  return `<article class="revc-transfer-pair" data-revc-transfer-pair-row="${escapeRevisionCompareTransferHtml(candidate.differenceId)}"><label><input type="checkbox" data-revc-transfer-pair="${escapeRevisionCompareTransferHtml(candidate.differenceId)}" ${checked ? 'checked' : ''} ${candidate.eligible ? '' : 'disabled'}><span><b>${escapeRevisionCompareTransferHtml(candidate.sourceRecordId || 'Unresolved source')}</b><small>Rev A — donor</small></span><span><b>${escapeRevisionCompareTransferHtml(candidate.targetRecordId || 'Unresolved receiver')}</b><small>Rev B — receiver</small></span><em>${escapeRevisionCompareTransferHtml(candidate.matchCertainty)} · ${escapeRevisionCompareTransferHtml(candidate.decisionState)}</em></label>${messages(candidate.blockers)}<div class="revc-transfer-fields">${candidate.fields.map((field) => fieldMarkup(field, pair, candidate.differenceId)).join('')}</div></article>`;
}
function candidateMarkup(model) {
  if (!model?.candidates?.length) return '<p class="revc-empty">No current comparison rows expose transfer candidates.</p>';
  return `<div class="revc-transfer-candidates">${model.candidates.map((candidate) => pairMarkup(candidate, model)).join('')}</div>`;
}
function fact(label, value, selector = '') {
  return `<div><dt>${escapeRevisionCompareTransferHtml(label)}</dt><dd ${selector}>${escapeRevisionCompareTransferHtml(value ?? '—')}</dd></div>`;
}
function planSummary(plan) {
  const summary = plan.summary;
  return `<dl class="revc-transfer-facts">${fact('Selected items', summary.selectedItemCount)}${fact('Operations', summary.operationCount)}${fact('READY', summary.readyOperationCount)}${fact('BLOCKED', summary.blockedOperationCount)}${fact('Replace existing', summary.replaceExistingCount)}${fact('Add missing', summary.addMissingCount)}</dl>`;
}
function operationMarkup(operation) {
  const current = operation.expectedTargetState === 'PRESENT' ? valueText(operation.beforeValue) : 'ABSENT';
  const evidence = operation.evidenceReferences ?? {};
  return `<tr data-revc-transfer-operation-row="${escapeRevisionCompareTransferHtml(operation.operationId)}"><td><code>${escapeRevisionCompareTransferHtml(operation.sourceEntityId)}</code></td><td><code>${escapeRevisionCompareTransferHtml(operation.targetEntityId)}</code><small>${escapeRevisionCompareTransferHtml(operation.targetCanonicalPath)}</small></td><td><code>${escapeRevisionCompareTransferHtml(operation.fieldPath)}</code></td><td>${escapeRevisionCompareTransferHtml(current)}</td><td>${escapeRevisionCompareTransferHtml(valueText(operation.afterValue))}</td><td>${escapeRevisionCompareTransferHtml(operation.operationType)}<small>${escapeRevisionCompareTransferHtml(operation.transferPolicy?.classification)} · ${escapeRevisionCompareTransferHtml(operation.transferPolicy?.ruleId)}</small></td><td>${escapeRevisionCompareTransferHtml(evidence.reviewSessionId || 'Review evidence unavailable')}<small>${escapeRevisionCompareTransferHtml(evidence.decisionEventId || 'Decision not required')}</small></td><td><b data-status="${escapeRevisionCompareTransferHtml(operation.status.toLowerCase())}">${escapeRevisionCompareTransferHtml(operation.status)}</b>${messages(operation.blockers)}</td></tr>`;
}
function planMarkup(transfer) {
  const plan = transfer.plan; if (!plan) return '';
  return `<section class="revc-transfer-plan"><header><h3>Immutable transfer plan</h3><strong data-status="${escapeRevisionCompareTransferHtml(plan.status.toLowerCase())}">${escapeRevisionCompareTransferHtml(plan.status)}</strong></header><dl class="revc-transfer-facts">${fact('Direction', plan.direction)}${fact('Plan ID', plan.planId, 'data-revc-transfer-plan-id')}${fact('Plan content SHA-256', plan.contentSha256, 'data-revc-transfer-plan-sha')}</dl>${planSummary(plan)}${messages(plan.blockers)}<div class="revc-transfer-table-wrap"><table><thead><tr><th>Source entity</th><th>Target entity/path</th><th>Field</th><th>Current</th><th>Proposed</th><th>Operation/policy</th><th>Evidence</th><th>Status</th></tr></thead><tbody>${plan.operations.map(operationMarkup).join('')}</tbody></table></div></section>`;
}
function invariantMarkup(proof) {
  return `<ul class="revc-transfer-invariants">${INVARIANTS.map(([key, label]) => `<li data-status="${proof.invariants?.[key] ? 'ready' : 'blocked'}"><b>${proof.invariants?.[key] ? 'PASS' : 'FAIL'}</b><span>${escapeRevisionCompareTransferHtml(label)}</span></li>`).join('')}</ul>`;
}
function downloadMarkup(current) {
  return `<div class="revc-session-actions">${DOWNLOADS.map(([selector, label]) => `<button type="button" ${selector} ${current ? '' : 'disabled'}>${label}</button>`).join('')}</div>`;
}
function resultMarkup(transfer) {
  const result = transfer.result; if (!result) return '';
  const proof = transfer.proof; const current = transfer.status === 'APPLIED';
  return `<section class="revc-transfer-result"><header><h3>${current ? 'Applied transfer result' : 'Historical transfer result'}</h3><strong data-status="${escapeRevisionCompareTransferHtml(transfer.status.toLowerCase())}">${escapeRevisionCompareTransferHtml(transfer.status)}</strong></header><dl class="revc-transfer-facts">${fact('Result ID', result.resultId, 'data-revc-transfer-result-id')}${fact('Result content SHA-256', result.contentSha256, 'data-revc-transfer-result-sha')}${fact('Plan ID', result.planId)}${fact('Plan SHA-256', result.planContentSha256)}${fact('Original Rev B document', result.targetDocumentId)}${fact('Original Rev B SHA-256', result.originalTargetSha256)}${fact('Patched target document', result.patchedTargetDocumentId)}${fact('Patched target SHA-256', result.patchedTargetSha256, 'data-revc-transfer-patched-sha')}${fact('Created at', result.createdAt)}</dl><dl class="revc-transfer-facts">${fact('Plan operations', result.summary.planOperationCount)}${fact('Applied', result.summary.appliedOperationCount)}${fact('Skipped', result.summary.skippedOperationCount)}${fact('Blocked', result.summary.blockedOperationCount)}</dl><div data-revc-transfer-verification="${escapeRevisionCompareTransferHtml(proof?.status ?? 'UNAVAILABLE')}"><h4>Verification evidence</h4>${proof ? invariantMarkup(proof) : '<p>Verification proof unavailable.</p>'}${messages(proof?.errors)}</div><details><summary>Transfer audit details</summary><pre>${escapeRevisionCompareTransferHtml(JSON.stringify(transfer.audit, null, 2))}</pre></details><details><summary>Transfer proof details</summary><pre>${escapeRevisionCompareTransferHtml(JSON.stringify(proof, null, 2))}</pre></details>${current ? downloadMarkup(true) : `<p class="revc-stale-notice">Historical evidence is retained, but STALE transfer artifacts cannot download as current.</p>${downloadMarkup(false)}`}</section>`;
}
function transferStatus(transfer) {
  if (transfer.request) return 'PLANNING';
  return transfer.status;
}
export function revisionCompareTransferMarkup(state, model) {
  const transfer = state.transfer; const status = transferStatus(transfer);
  const eligible = model.candidates.filter((candidate) => candidate.eligible).length;
  const canPlan = model.counts.fieldCount > 0 && !transfer.request && transfer.status !== 'APPLYING';
  const canApply = transfer.status === 'PLANNED' && transfer.plan?.status === 'READY' && !transfer.applyRequest;
  return `<style>${TRANSFER_CSS}</style><section class="revc-transfer-section" data-revc-transfer-section><header><div><span>TRANSFER REVIEW</span><h2>Direct Staged-JSON transfer</h2><p>Explicitly choose reviewed Rev A donor values for the current Rev B receiver. Selection never follows viewer focus or inspection state.</p></div><strong data-revc-transfer-status="${escapeRevisionCompareTransferHtml(status)}" data-status="${escapeRevisionCompareTransferHtml(status.toLowerCase())}">${escapeRevisionCompareTransferHtml(status)}</strong></header><dl class="revc-transfer-facts">${fact('Direction', 'Rev A — donor → Rev B — receiver', 'data-revc-transfer-direction')}${fact('Eligible pairs', eligible, 'data-revc-transfer-eligible-count')}${fact('Selected pairs / fields', `${model.counts.pairCount} / ${model.counts.fieldCount}`, 'data-revc-transfer-selection-count')}</dl>${candidateMarkup(model)}<div class="revc-session-actions"><button type="button" class="revc-primary" data-revc-create-transfer-plan ${canPlan ? '' : 'disabled'}>Create transfer plan</button><button type="button" data-revc-apply-transfer ${canApply ? '' : 'disabled'}>Apply transfer plan</button></div>${transfer.error ? messages([transfer.error]) : ''}${planMarkup(transfer)}${resultMarkup(transfer)}</section>`;
}
export function renderRevisionCompareTransferSection(root, state, model) {
  const host = root.querySelector('.revc-review-side'); if (!host || !model) return null;
  host.insertAdjacentHTML('beforeend', revisionCompareTransferMarkup(state, model));
  return host.querySelector('[data-revc-transfer-section]');
}

export const _test = Object.freeze({ fieldMarkup, operationMarkup, resultMarkup, transferStatus, valueText });
