import {
  ISO_NOTE_RECIPE_PROFILE,
  ISO_NOTE_TABLE_1_SAMPLE,
  ISO_NOTE_TABLE_2_SAMPLE,
} from '../xml-compare/table-categorizer/table-categorized-xml-pilot-profiles.js';
import {
  buildXmlArtifactFromTable,
  createConnectorPreviewByKey,
  createXmlCompareSourceHandoff,
  loadTableXmlRecipe,
  saveTableXmlRecipe,
} from '../xml-compare/table-categorizer/table-categorized-xml-recipe-workflow.js';

export const TABLE_CATEGORIZED_ISO_SAMPLE_LOADER_SCHEMA = 'table-categorized-iso-sample-loader/v2-editable-template';
export const ISO_SAMPLE_ACTION = 'load-isorecipe-editable-template-sample';

const PANEL_ATTR = 'data-table-categorized-iso-sample-panel';
const BUTTON_ATTR = 'data-table-categorized-iso-sample-loader';
const FIELD_ATTR = 'data-table-categorized-iso-sample-field';

export function createIsoRecipeTemplateState({ table1Text = ISO_NOTE_TABLE_1_SAMPLE, table2Text = ISO_NOTE_TABLE_2_SAMPLE, recipeProfile = ISO_NOTE_RECIPE_PROFILE } = {}) {
  const saved = saveTableXmlRecipe(recipeProfile, {
    recipeId: recipeProfile.profileId || 'ISOrecipe',
    displayName: recipeProfile.displayName || 'ISOrecipe',
    connectorKeyField: recipeProfile.connectorKeyField || 'connectorKey',
    notes: ['Editable template sample: Table 1 and Table 2 remain user-editable before XML generation.'],
  });
  return Object.freeze({
    table1Text,
    table2Text,
    savedRecipeJson: saved.json,
    savedRecipe: saved.recipe,
  });
}

export function buildIsoRecipeSampleWorkflow(input = createIsoRecipeTemplateState()) {
  const template = normalizeWorkflowInput(input);
  const recipe = template.savedRecipe || loadTableXmlRecipe(template.savedRecipeJson);
  const sourceAArtifact = buildXmlArtifactFromTable({
    tableText: template.table1Text,
    sourceId: 'SourceA',
    sourceName: 'ISO Table 1',
    recipe,
    delimiterMode: 'tab',
  });
  const sourceBArtifact = buildXmlArtifactFromTable({
    tableText: template.table2Text,
    sourceId: 'SourceB',
    sourceName: 'ISO Table 2',
    recipe,
    delimiterMode: 'tab',
  });
  const sourceA = createXmlCompareSourceHandoff(sourceAArtifact, { side: 'sourceA', sourceLabel: 'Source A' });
  const sourceB = createXmlCompareSourceHandoff(sourceBArtifact, { side: 'sourceB', sourceLabel: 'Source B' });
  const connectorKey = sourceAArtifact.records?.[0]?.connectorKey || sourceBArtifact.records?.[0]?.connectorKey || 'SL-14143';
  const connector = createConnectorPreviewByKey(sourceA, sourceB, connectorKey);
  return Object.freeze({
    schema: 'IsoRecipeSampleWorkflow.v2',
    savedRecipe: recipe,
    savedRecipeJson: template.savedRecipeJson,
    table1Text: template.table1Text,
    table2Text: template.table2Text,
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
  const issues = workflow.connector?.diagnostics?.length || workflow.diagnostics?.filter((item) => ['BLOCKER', 'ERROR'].includes(item?.severity)).length || 0;
  return `<div class="table-categorized-shell-side-card" ${PANEL_ATTR}="IsoRecipeSampleWorkflow.v2">
    <h4>ISOrecipe Editable Template Sample</h4>
    <p><b>Recipe = template.</b> Edit Table 1, Table 2, or the ISOrecipe JSON, then rebuild. Outputs are generated from the edited content, not from hardcoded result defaults.</p>
    <label>Table 1 → XML1 → Source A<textarea ${FIELD_ATTR}="table1" rows="5">${escapeHtml(workflow.table1Text)}</textarea></label>
    <label>Table 2 → XML2 → Source B<textarea ${FIELD_ATTR}="table2" rows="5">${escapeHtml(workflow.table2Text)}</textarea></label>
    <details open>
      <summary>ISOrecipe template JSON</summary>
      <textarea ${FIELD_ATTR}="recipe" rows="10">${escapeHtml(workflow.savedRecipeJson)}</textarea>
    </details>
    <div class="table-categorized-xml-actions">
      <button type="button" ${BUTTON_ATTR}="rebuild">Confirm / Rebuild XML1 + XML2</button>
      <button type="button" ${BUTTON_ATTR}="download-recipe">Download ISOrecipe JSON</button>
      <button type="button" ${BUTTON_ATTR}="download-xml1">Download XML1</button>
      <button type="button" ${BUTTON_ATTR}="download-xml2">Download XML2</button>
      <button type="button" ${BUTTON_ATTR}="download-handoff">Download Source A/B Handoff JSON</button>
    </div>
    <table>
      <thead><tr><th>Side</th><th>connectorKey</th><th>Revision</th><th>Guide Gap</th></tr></thead>
      <tbody>
        <tr><td>Source A / XML1</td><td>${escapeHtml(a.connectorKey)}</td><td>${escapeHtml(a.fields?.revision)}</td><td>${escapeHtml(a.fields?.guideGapMm)} mm</td></tr>
        <tr><td>Source B / XML2</td><td>${escapeHtml(b.connectorKey)}</td><td>${escapeHtml(b.fields?.revision)}</td><td>${escapeHtml(b.fields?.guideGapMm)} mm</td></tr>
      </tbody>
    </table>
    <p><b>Connector preview:</b> ${connector ? `${escapeHtml(connector.sourceUid)} → ${escapeHtml(connector.targetUid)}` : 'not available'}${issues ? ` (${issues} issue(s))` : ''}</p>
    <p><small>Use the normal Column Builder and Structure Recipe Builder as the editing model for the recipe. This sample loads the same template contract in editable text form so you can change the source tables before download/handoff.</small></p>
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
  button.textContent = 'Load ISOrecipe Editable Template Sample';
  const fieldComparisonButton = container.querySelector('[data-table-categorized-action="load-field-comparison-sample"]');
  if (fieldComparisonButton) fieldComparisonButton.insertAdjacentElement('afterend', button);
  else container.append(button);
  return true;
}

export function showIsoRecipeSamplePanel(doc = globalThis.document, workflow = buildIsoRecipeSampleWorkflow()) {
  const popup = doc?.querySelector?.('[data-xml-compare-table-categorized-popup]');
  if (!popup) return false;
  popup.querySelector(`[${PANEL_ATTR}]`)?.remove();
  const side = popup.querySelector('.table-categorized-shell-side .table-categorized-shell-side-card') || popup.querySelector('.table-categorized-shell-side');
  if (!side) return false;
  side.insertAdjacentHTML('afterend', renderIsoRecipeSamplePanel(workflow));
  return true;
}

export function handleIsoRecipeSampleClick(event, doc = globalThis.document) {
  const button = event.target?.closest?.(`[${BUTTON_ATTR}]`);
  if (!button) return false;
  event.preventDefault();
  const action = button.getAttribute(BUTTON_ATTR);
  if (action === 'open') return showIsoRecipeSamplePanel(doc);
  if (action === 'rebuild') return showIsoRecipeSamplePanel(doc, workflowFromPanel(doc));
  const workflow = workflowFromPanel(doc);
  if (action === 'download-recipe') return downloadText('ISOrecipe.json', workflow.savedRecipeJson, 'application/json;charset=utf-8', doc);
  if (action === 'download-xml1') return downloadText('ISOrecipe-SourceA.xml', workflow.sourceAArtifact.xmlText, 'application/xml;charset=utf-8', doc);
  if (action === 'download-xml2') return downloadText('ISOrecipe-SourceB.xml', workflow.sourceBArtifact.xmlText, 'application/xml;charset=utf-8', doc);
  if (action === 'download-handoff') return downloadText('ISOrecipe-source-handoff.json', JSON.stringify({ sourceA: workflow.sourceA, sourceB: workflow.sourceB, connector: workflow.connector }, null, 2), 'application/json;charset=utf-8', doc);
  return false;
}

export function workflowFromPanel(doc = globalThis.document) {
  const panel = doc?.querySelector?.(`[${PANEL_ATTR}]`);
  if (!panel) return buildIsoRecipeSampleWorkflow();
  const table1Text = readField(panel, 'table1') || ISO_NOTE_TABLE_1_SAMPLE;
  const table2Text = readField(panel, 'table2') || ISO_NOTE_TABLE_2_SAMPLE;
  const savedRecipeJson = readField(panel, 'recipe') || createIsoRecipeTemplateState().savedRecipeJson;
  return buildIsoRecipeSampleWorkflow({ table1Text, table2Text, savedRecipeJson });
}

function normalizeWorkflowInput(input = {}) {
  if (input.savedRecipeJson || input.savedRecipe) return input;
  return createIsoRecipeTemplateState(input);
}

function readField(container, name) {
  return String(container.querySelector(`[${FIELD_ATTR}="${name}"]`)?.value || '');
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
