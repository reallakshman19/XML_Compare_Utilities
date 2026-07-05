import assert from 'node:assert/strict';
import fs from 'node:fs';

import { renderXmlCompareTabView } from '../xml-compare/XmlCompareTabView.js';
import { applyLinewiseAction, applyLinewiseSideload, importLinewiseText, previewText, regexSandboxResult } from '../xml-compare/XmlCompareLinewiseWorkflowActions.js';
import { createLinewiseWorkflowState } from '../xml-compare/XmlCompareLinewiseWorkflowState.js';
import { renderLinewiseWorkflowPopupHtml } from '../xml-compare/XmlCompareLinewiseWorkflowView.js';
import { installXmlCompareCategorizedConverterRuntime } from '../tabs/xml-compare-categorized-converter-runtime.js';
import { _test as tabTest } from '../tabs/xml-compare-tab.js';

const xml = '<ROOT><PIPINGELEMENT FROM_NODE="10" TO_NODE="20" LINE_ID="/PS-UNIT-12345-AA/B1" DELTA_X="100" DELTA_Y="0" DELTA_Z="0"><BEND /></PIPINGELEMENT><RESTRAINT NODE="10" TYPE="GUIDE" STIFFNESS="1" GAP="0" MU="0" CNODE="0" /></ROOT>';
const baseState = {
  fileA: null,
  fileB: null,
  textA: '',
  textB: '',
  report: null,
  filters: { severity: 'ALL', search: '' },
  selectedIssueId: '',
  hiddenComponentIds: new Set(),
  status: { kind: 'info', message: 'Ready.' },
  loadDiagnostics: {},
  linewiseWorkflow: createLinewiseWorkflowState(),
  sideload: {},
  enrichmentConfig: {},
};
const side = { records: [], levelView: { fields: [] }, diagnostics: [], logs: [] };
const workspace = { source: side, target: side, navStates: {}, manualConnectors: [], matchMap: null, connectorCandidates: null, compareFields: [], logs: [], diagnostics: [] };
const tabHtml = renderXmlCompareTabView({ state: baseState, workspace, issues: [] });
assert.ok(tabHtml.includes('data-xml-compare-categorized-open'), 'native tab view renders Line-wise toolbar button');
assert.equal(tabHtml.includes('data-xml-compare-categorized-popup'), false, 'popup is closed by default');

let wf = createLinewiseWorkflowState();
wf = applyLinewiseAction(wf, { type: 'open-linewise-workflow' });
assert.equal(wf.open, true, 'open action opens native workflow state');
assert.ok(renderLinewiseWorkflowPopupHtml(wf).includes('data-xml-compare-categorized-popup'));
wf = applyLinewiseAction(wf, { type: 'close-linewise-workflow' });
assert.equal(wf.open, false, 'close action closes native workflow state');

wf = importLinewiseText({ fileName: 'input.xml', text: xml });
assert.equal(wf.open, true);
assert.equal(wf.model.lineCount, 1);
assert.equal(wf.model.elementCount, 1);
assert.ok(renderLinewiseWorkflowPopupHtml(wf).includes('1 line(s), 1 element(s)'), 'import render shows model counts');

wf = applyLinewiseAction(wf, { type: 'set-linewise-tab', tab: 'lineview' });
assert.equal(wf.tab, 'lineview');
wf = applyLinewiseAction(wf, { type: 'set-linewise-line-index', index: 0 });
wf = applyLinewiseAction(wf, { type: 'set-linewise-element-index', index: 0 });
assert.ok(renderLinewiseWorkflowPopupHtml(wf).includes('10-&gt;20'), 'line/element selection renders selected details');

wf = applyLinewiseAction(wf, { type: 'set-linewise-sideload-field', field: 'lineIdText', value: 'FROM_NODE\tTO_NODE\tLINE_ID\n10\t20\t/NEW-LINE-99999/B1' });
assert.ok(wf.sideload.lineIdText.includes('99999'));
wf = applyLinewiseSideload(wf);
assert.equal(wf.lastSideloadReport.lineIdsApplied, 1, 'sideload rebuild records report');
assert.equal(regexSandboxResult(wf).sample, '/NEW-LINE-99999/B1', 'regex sandbox uses imported line IDs');
assert.equal(regexSandboxResult(wf).regexValue, '99999');

wf = applyLinewiseAction(wf, { type: 'set-linewise-preview-mode', previewMode: 'categorized' });
assert.ok(previewText(wf).includes('CategorizedInputXML'));
wf = applyLinewiseAction(wf, { type: 'set-linewise-preview-mode', previewMode: 'input' });
assert.ok(previewText(wf).includes('PIPINGELEMENT'));
wf = applyLinewiseAction(wf, { type: 'set-linewise-preview-mode', previewMode: 'element' });
assert.ok(previewText(wf).includes('PIPINGELEMENT'));

wf = applyLinewiseAction(wf, { type: 'open-linewise-info-rule' });
assert.equal(wf.infoRuleOpen, true);
assert.ok(renderLinewiseWorkflowPopupHtml(wf).includes('Line-wise XML ownership rule'));
wf = applyLinewiseAction(wf, { type: 'close-linewise-info-rule' });
assert.equal(wf.infoRuleOpen, false);

const nativeState = tabTest.createInitialState();
nativeState.linewiseWorkflow = importLinewiseText({ fileName: 'native.xml', text: xml });
tabTest.loadLinewiseToCanvas(nativeState, 'a');
assert.equal(nativeState.fileA.name, 'native_categorized_enriched.xml');
assert.ok(nativeState.textA.includes('CategorizedInputXML'));
assert.equal(nativeState.report, null);
assert.ok(nativeState.workspaceRevision > 0);
tabTest.loadLinewiseToCanvas(nativeState, 'b');
assert.equal(nativeState.fileB.name, 'native_categorized_enriched.xml');
assert.ok(nativeState.textB.includes('CategorizedInputXML'));

const runtimeSource = fs.readFileSync(new URL('../tabs/xml-compare-categorized-converter-runtime.js', import.meta.url), 'utf8');
const shellSource = fs.readFileSync(new URL('../xml-compare/XmlCompareWorkspaceShell.js', import.meta.url), 'utf8');
assert.equal(installXmlCompareCategorizedConverterRuntime(), false, 'old converter runtime is inert');
assert.equal(runtimeSource.includes('addEventListener'), false, 'converter runtime has no document listener');
assert.equal(runtimeSource.includes('insertAdjacentHTML'), false, 'converter runtime has no DOM popup injection');
assert.equal(runtimeSource.includes('document.body'), false, 'converter runtime has no body injection');
assert.equal(runtimeSource.includes('MutationObserver'), false, 'converter runtime has no mutation observer');
assert.equal(runtimeSource.includes('DataTransfer'), false, 'converter runtime has no synthetic file handoff');
assert.equal(/installXmlCompareCategorizedConverterRuntime\(\);/.test(runtimeSource), false, 'converter runtime has no auto-install call');
assert.equal(shellSource.includes('xml-compare-categorized-converter-runtime.js'), false, 'workspace shell no longer lazy-loads converter runtime');
assert.equal(shellSource.includes('loadCategorizedConverter'), false, 'workspace shell no longer tracks converter loader');

console.log('XML Compare native Line-wise workflow tests passed');
