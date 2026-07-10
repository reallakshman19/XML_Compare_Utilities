import { topologyDashboardCards } from './xml-cii-inputxml-topology-dashboard-model.js';

const STATE_KEY = '__xmlCiiInputXmlCompare5DState';
const DASHBOARD_ATTR = 'data-xml-cii-5d-topology-dashboard';
const STYLE_ID = 'xml-cii-5d-topology-dashboard-style';

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function esc(value) { return text(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function statusClass(value) { return Number(value || 0) ? 'is-ok' : 'is-warn'; }
function table(columns, rows, empty = 'No rows.') {
  if (!rows?.length) return `<div class="model-converters-workflow-detail-note">${esc(empty)}</div>`;
  return `<div class="xml-cii-native-table-wrap"><table class="xml-cii-native-table"><thead><tr>${columns.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map(([key]) => `<td>${esc(row?.[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function cardsHtml(dashboard) {
  return `<div class="xml-cii-native-status-list">${topologyDashboardCards(dashboard).map((card) => `<div class="xml-cii-native-status-row ${statusClass(card.value)}"><span class="xml-cii-native-status-icon">${Number(card.value || 0) ? 'OK' : 'INFO'}</span><span>${esc(card.label)}</span><strong>${esc(card.value)}</strong></div>`).join('')}</div>`;
}
function dashboardHtml(result) {
  const dashboard = result?.topologyDashboard;
  if (!dashboard) return '';
  const frameCols = [['mode', 'Mode'], ['confidence', 'Confidence'], ['translation', 'Translation'], ['referenceAnchor', 'Reference anchor'], ['targetAnchor', 'Target anchor'], ['note', 'Note']];
  const nodeCols = [['sourceNode', 'Source node'], ['targetNode', 'Target node'], ['hits', 'Hits'], ['confidence', 'Confidence'], ['basis', 'Basis'], ['conflicts', 'Conflicts'], ['scoreRange', 'Score range']];
  const criticalCols = [['issue', 'Issue'], ['item', 'Item'], ['detail', 'Detail']];
  const shiftCols = [['referencePath', 'Ref path'], ['targetPath', 'Target path'], ['referenceElement', 'Reference element'], ['targetElement', 'Target element'], ['referenceStationMm', 'Ref station'], ['targetStationMm', 'Target station'], ['stationDeltaMm', 'Δ station'], ['elementScore', 'Score']];
  const payloadCols = [['referenceElement', 'Reference element'], ['targetElement', 'Target element'], ['confidence', 'Confidence'], ['lengthDeltaMm', 'Δ length'], ['evidenceFlags', 'Evidence flags'], ['transferAction', 'Transfer action']];
  return `<section class="xml-cii-native-card" ${DASHBOARD_ATTR}="true">
    <div class="model-converters-workflow-section-title">Topology Compare Dashboard</div>
    <div class="model-converters-workflow-detail-note">Topo-first view: coordinate/frame evidence, node remap ledger, chain/station review, and payload review rows. Transfer remains unchanged.</div>
    ${cardsHtml(dashboard)}
    <details open><summary><strong>Coordinate / frame solution</strong></summary>${table(frameCols, dashboard.frameRows || [], 'No frame solution rows.')}</details>
    <details open><summary><strong>Node remap ledger</strong></summary>${table(nodeCols, dashboard.nodeRemapRows || [], 'No node remap rows.')}</details>
    <details><summary><strong>Critical topology issues</strong></summary>${table(criticalCols, dashboard.criticalRows || [], 'No critical topology issues.')}</details>
    <details><summary><strong>Station / split-shift review</strong></summary>${table(shiftCols, dashboard.stationShiftRows || [], 'No station shift rows above tolerance.')}</details>
    <details><summary><strong>Payload review rows</strong></summary>${table(payloadCols, dashboard.payloadDiffRows || [], 'No payload review rows.')}</details>
  </section>`;
}
function find5dStateHosts(doc = globalThis.document) {
  const roots = [];
  for (const textarea of doc.querySelectorAll?.('[data-xml-cii-5d-ref],[data-xml-cii-5d-target]') || []) {
    let node = textarea;
    while (node && node !== doc.body) {
      if (node[STATE_KEY]?.result) { roots.push(node); break; }
      node = node.parentElement;
    }
  }
  return [...new Set(roots)];
}
function injectStyle(doc = globalThis.document) {
  if (!doc?.head || doc.getElementById(STYLE_ID)) return false;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    [${DASHBOARD_ATTR}] details { margin-top: 10px; border: 1px solid rgba(148,163,184,.18); border-radius: 8px; padding: 8px; background: rgba(2,6,23,.22); }
    [${DASHBOARD_ATTR}] summary { cursor: pointer; color: #dbeafe; }
  `;
  doc.head.append(style);
  return true;
}
export function injectInputXmlTopologyDashboard(doc = globalThis.document) {
  injectStyle(doc);
  let inserted = 0;
  for (const host of find5dStateHosts(doc)) {
    const result = host[STATE_KEY]?.result;
    if (!result?.topologyDashboard) continue;
    host.querySelector?.(`[${DASHBOARD_ATTR}]`)?.remove();
    const marker = [...(host.querySelectorAll?.('.model-converters-workflow-section-title') || [])].find((node) => text(node.textContent) === '5D Summary')?.closest?.('.xml-cii-native-card');
    const html = dashboardHtml(result);
    if (marker) marker.insertAdjacentHTML('beforebegin', html);
    else host.insertAdjacentHTML('beforeend', html);
    inserted += 1;
  }
  return inserted;
}
export function installInputXmlTopologyDashboardSidecar(doc = globalThis.document) {
  if (!doc?.addEventListener) return false;
  injectInputXmlTopologyDashboard(doc);
  doc.addEventListener('click', () => queueMicrotask(() => injectInputXmlTopologyDashboard(doc)), { capture: true });
  doc.addEventListener('change', () => queueMicrotask(() => injectInputXmlTopologyDashboard(doc)), { capture: true });
  if (typeof MutationObserver !== 'undefined' && doc.body) {
    new MutationObserver(() => injectInputXmlTopologyDashboard(doc)).observe(doc.body, { childList: true, subtree: true });
  }
  return true;
}

installInputXmlTopologyDashboardSidecar();
