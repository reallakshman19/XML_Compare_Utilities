import {
  ISO_NOTE_RECIPE_PROFILE,
  ISO_NOTE_TABLE_1_SAMPLE,
  ISO_NOTE_TABLE_2_SAMPLE,
} from '../xml-compare/table-categorizer/table-categorized-xml-pilot-profiles.js';
import {
  buildXmlArtifactFromTable,
  createConnectorPreviewByKey,
  createXmlCompareSourceHandoff,
  saveTableXmlRecipe,
} from '../xml-compare/table-categorizer/table-categorized-xml-recipe-workflow.js';

export const TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA = 'table-categorized-iso-sample-loader/v1-visible-sidecar';
export const ISO_SAMPLE_ACTION = 'load-isorecipe-dual-source-sample';

const PANEL_ATTR = 'data-table-categorized-iso-sample-panel';
const BUTTON_ATTR = 'data-table-categorized-iso-sample-loader';

export function buildIsoRecipeSampleWorkflow() {
  const saved = saveTableXmlRecipe(ISO_NOTE_RECIPE_PROFILE, {
    recipeId: 'ISOrecipe',
    displayName: 'ISOrecipe',
    connectorKeyField: 'connectorKey',
  });
  const sourceAArtifact = buildXmlArtifactFromTable({
    tableText: ISO_NOTE_TABLE_1_SAMPLE,
    sourceId: 'SourceA',
    sourceName: 'ISO Table 1',
    recipe: saved.recipe,
    delimiterMode: 'tab',
  });
  const sourceBArtifact = buildXmlArtifactFromTable({
    tableText: ISO_NOTE_TABLE_2_SAMPLE,
    sourceId: 'SourceB',
    sourceName: 'ISO Table 2',
    recipe: saved.recipe,
    delimiterMode: 'tab',
  });
  const sourceA = createXmlCompareSourceHandoff(sourceAArtifact, { side: 'sourceA', sourceLabel: 'Source A' });
  const sourceB = createXmlCompareSourceHandoff(sourceBArtifact, { side: 'sourceB', sourceLabel: 'Source B' });
  const connector = createConnectorPreviewByKey(sourceA, sourceB, 'SL-14143');
  return Object.freeze({
    schema: 'IsoRecipeSampleWorkflow.v1',
    savedRecipe: saved.recipe,
    savedRecipeJson: saved.json,
    sourceAArtifact,
    sourceBArtifact,
    sourceA,
    sourceB,
    connector,
    diagnostics: Object.freeze([
      ...(sourceAArtifact.validationResults || []),
      ...(sourceBArtifact.validationResults || []),
      ...(sourceA.diagnostics || []),
      ...(sourceB.diagnostics || []),
      ...(connector.diagnostics || []),
    ]),
  });
}

export function renderIsoRecipeSamplePanel(workflow = buildIsoRecipeSampleWorkflow()) {
  const a = workflow.sourceAArtifact?.records?.[0] || {};
  const b = workflow.sourceBArtifact?.records?.[0] || {};
  const connector = workflow.connector?.preview || null;
  return `<div class="table-categorized-shell-side-card" ${PANEL_ATTR}="IsoRecipeSampleWorkflow.v1">
    <h4>ISOrecipe Dual-Source Sample</h4>
    <p>This demonstrates the universal flow: Table 1 → XML1 → Source A, Table 2 → XML2 → Source B, then connectorKey <b>SL-14143</b>.</p>
    <table>
      <thead><tr><th>Side</th><th>connectorKey</th><th>Revision</th><th>Guide Gap</th></tr></thead>
      <tbody>
        <tr><td>Source A / XML1</td><td>${escapeHtml(a.connectorKey)}</td><td>${escapeHtml(a.fields?.revision)}</td><td>${escapeHtml(a.fields?.guideGapMm)} mm</td></tr>
        <tr><td>Source B / XML2</td><td>${escapeHtml(b.connectorKey)}</td><td>${escapeHtml(b.fields?.revision)}</td><td>${escapeHtml(b.fields?.guideGapMm)} mm</td></tr>
      </tbody>
    </table>
    <p><b>Connector preview:</b> ${connector ? `${escapeHtml(connector.sourceUid)} → ${escapeHtml(connector.targetUid)}` : 'not available'}</p>
    <div class="table-categorized-xml-actions">
      <button type="button" ${BUTTON_ATTR}="download-recipe">Download ISOrecipe JSON</button>
      <button type="button" ${BUTTON_ATTR}="download-xml1">Download XML1</button>
      <button type="button" ${BUTTON_ATTR}="download-xml2">Download XML2</button>
      <button type="button" ${BUTTON_ATTR}="download-handoff">Download Source A/B Handoff JSON</button>
    </div>
  </div>`;
}

export function injectIsoRecipeSampleLoader(doc = globalThis.document) {
  if (!doc?.querySelector) return false;
  const popup = doc.querySelector('[data-xml-compare-table-categorized-popup]');
  if (!popup || popup.querySelector(`[${BUTTON_ATTR}="open"]`)) return false;
  const templateHeader = [...popup.querySelectorAll('h4')].find((node) => node.textContent?.trim() === 'Load Template');
  const container = templateHeader?.parentElement;
  if (!container) return false;
  const button = doc.createElement('button');
  button.type = 'button';
  button.setAttribute(BUTTON_ATTR, 'open');
  button.textContent = 'Load ISOrecipe Dual-Source Sample';
  const fieldComparisonButton = container.querySelector('[data-table-categorized-action="load-field-comparison-sample"]');
  if (fieldComparisonButton) fieldComparisonButton.insertAdjacentElement('afterend', button);
  else container.append(button);
  return true;
}

export function showIsoRecipeSamplePanel(doc = globalThis.document) {
  const popup = doc?.querySelector?.('[data-xml-compare-table-categorized-popup]');
  if (!popup) return false;
  popup.querySelector(`[${PANEL_ATTR}]`)?.remove();
  const side = popup.querySelector('.table-categorized-shell-side .table-categorized-shell-side-card') || popup.querySelector('.table-categorized-shell-side');
  if (!side) return false;
  side.insertAdjacentHTML('afterend', renderIsoRecipeSamplePanel());
  return true;
}

export function handleIsoRecipeSampleClick(event, doc = globalThis.document) {
  const button = event.target?.closest?.(`[${BUTTON_ATTR}]`);
  if (!button) return false;
  event.preventDefault();
  const action = button.getAttribute(BUTTON_ATTR);
  if (action === 'open') return showIsoRecipeSamplePanel(doc);
  const workflow = buildIsoRecipeSampleWorkflow();
  if (action === 'download-recipe') return downloadText('ISOrecipe.json', workflow.savedRecipeJson, 'application/json;charset=utf-8', doc);
  if (action === 'download-xml1') return downloadText('ISOrecipe-SourceA.xml', workflow.sourceAArtifact.xmlText, 'application/xml;charset=utf-8', doc);
  if (action === 'download-xml2') return downloadText('ISOrecipe-SourceB.xml', workflow.sourceBArtifact.xmlText, 'application/xml;charset=utf-8', doc);
  if (action === 'download-handoff') return downloadText('ISOrecipe-source-handoff.json', JSON.stringify({ sourceA: workflow.sourceA, sourceB: workflow.sourceB, connector: workflow.connector }, null, 2), 'application/json;charset=utf-8', doc);
  return false;
}

function downloadText(name, text, type, doc = globalThis.document) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = name;
  doc.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function installIsoRecipeSampleLoader(doc = globalThis.document) {
  if (!doc?.addEventListener) return false;
  doc.addEventListener('click', (event) => handleIsoRecipeSampleClick(event, doc), { capture: true });
  injectIsoRecipeSampleLoader(doc);
  if (typeof MutationObserver !== 'undefined' && doc.body) {
    new MutationObserver(() => injectIsoRecipeSampleLoader(doc)).observe(doc.body, { childList: true, subtree: true });
  }
  return true;
}

installIsoRecipeSampleLoader();
