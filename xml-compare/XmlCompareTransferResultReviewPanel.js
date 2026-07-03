import { createTransferProof, snippet } from './XmlCompareTransferProofModel.js';

export const XML_COMPARE_TRANSFER_RESULT_REVIEW_PANEL_SCHEMA = 'xml-compare-transfer-result-review-panel/v1';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const clean = (value) => String(value ?? '').trim();
const shortHash = (value = '') => clean(value).replace(/^fnv1a32:/, '') || '-';

function metric(label, value) {
  return `<span><b>${esc(label)}</b><br>${esc(value)}</span>`;
}

function sourceTarget(row = {}) {
  const source = [row.sourceLine, row.sourceElement, row.sourceNode].map(clean).filter(Boolean).join(' / ');
  const target = [row.targetLine, row.targetElement, row.targetNode].map(clean).filter(Boolean).join(' / ');
  return `${source || '-'} → ${target || '-'}`;
}

function rowHtml(row = {}) {
  return `<article class="xml-compare-transfer-review-row"><header><b>${esc(row.blockName || '-')}</b><span>${esc(row.status || '-')}</span></header><small>${esc(row.scope || 'node')} · ${esc(sourceTarget(row))}</small><div class="xml-compare-transfer-review-snippets"><pre>${esc(snippet(row.beforeXml || ''))}</pre><pre>${esc(snippet(row.afterXml || ''))}</pre></div></article>`;
}

function rowsHtml(proof = {}) {
  const rows = proof.changedBlocks || [];
  if (!rows.length) return '<small>No changed block rows available yet. Apply or export a staged transfer to populate review data.</small>';
  return `<div class="xml-compare-transfer-review-list">${rows.map(rowHtml).join('')}</div>`;
}

function actions(proof = {}) {
  const disabled = proof.changedBlocks?.length ? '' : 'disabled';
  return `<div class="xml-compare-transfer-apply-actions"><button type="button" data-xml-compare-action="download-transfer-proof-json" ${disabled}>Download Transfer Proof JSON</button><button type="button" data-xml-compare-action="copy-patched-target-preview" ${disabled}>Copy Patched Target Preview</button></div>`;
}

export function renderXmlCompareTransferResultReviewPanelHtml({ transferState = null } = {}) {
  const proof = createTransferProof({ transferAudit: transferState?.transferAudit, postTransferValidation: transferState?.postTransferValidation, transferLastResult: transferState?.transferLastResult });
  return `<section class="xml-compare-automap-panel" data-xml-compare-transfer-result-review><header><b>Transfer result review</b><span>${esc(proof.schema)}</span></header><div class="xml-compare-validation-summary">${metric('Updated', proof.updatedCount)}${metric('Skipped', proof.skippedCount)}${metric('Blocked', proof.blockedCount)}${metric('Result hash', shortHash(proof.resultHash))}</div>${actions(proof)}${rowsHtml(proof)}</section>`;
}

export const _test = Object.freeze({ esc, clean, shortHash, metric, sourceTarget, rowHtml, rowsHtml, actions });
