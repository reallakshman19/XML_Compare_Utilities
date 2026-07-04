import assert from 'node:assert/strict';
import fs from 'node:fs';

import { applyXmlCompareCanvasAction, createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { createApprovedConnectorValidationModel } from '../xml-compare/XmlCompareApprovedConnectorModel.js';
import { createXmlCompareWorkspaceModel } from '../xml-compare/XmlCompareWorkspaceModel.js';
import { createXmlCompareTransferWorkflowGate, gateAllowsAction } from '../xml-compare/XmlCompareTransferWorkflowGateModel.js';
import { renderXmlCompareTransferWorkflowPanelHtml } from '../xml-compare/XmlCompareTransferWorkflowPanel.js';
import { createTransferProofSampleLoadState, loadTransferProofSampleTexts } from '../xml-compare/XmlCompareTransferProofSampleLoader.js';
import { _test as tabTest } from '../tabs/xml-compare-tab.js';

const root = new URL('../samples/xml-compare/transfer-proof/', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const sourceText = read('source-categorized.xml');
const targetText = read('target-categorized.xml');
const proofPlan = JSON.parse(read('transfer-proof-plan.json'));

function appState(overrides = {}) { return { fileA: null, fileB: null, textA: '', textB: '', workspaceRevision: 0, canvasState: createXmlCompareCanvasState(), ...overrides }; }
function workspace(state) { return createXmlCompareWorkspaceModel({ fileA: state.fileA, textA: state.textA, fileB: state.fileB, textB: state.textB, canvasState: state.canvasState }); }
function gate(state, readinessAudit = null) { return createXmlCompareTransferWorkflowGate({ state, workspace: workspace(state), readinessAudit }); }
function readyAudit({ sourceReady = true, targetReady = true, blockers = [] } = {}) { return { sourceA: { readyForConnector: sourceReady, diagnostics: blockers, recordCount: sourceReady ? 1 : 0, parseOk: sourceReady }, targetB: { readyForConnector: targetReady, diagnostics: blockers, recordCount: targetReady ? 1 : 0, parseOk: targetReady } }; }
function sampleApp() { return { ...createTransferProofSampleLoadState({ sourceText, targetText, previousRevision: 0 }), canvasState: createXmlCompareCanvasState() }; }
function approve(state) { return { ...state, canvasState: applyXmlCompareCanvasAction(state.canvasState, { type: 'accept-candidate', candidate: proofPlan.candidate }) }; }
function stageAndApply(state) {
  const validation = createApprovedConnectorValidationModel({ state: state.canvasState, sourceRecords: proofPlan.sourceRecords, targetRecords: proofPlan.targetRecords, compareFields: [] });
  let canvas = applyXmlCompareCanvasAction(state.canvasState, { type: 'stage-transfer', scope: 'node', selectedBlocks: proofPlan.selectedBlocks, sourceText: state.textA, targetText: state.textB, workspaceRevision: state.workspaceRevision, approvedMatchSet: state.canvasState.approvedMatchSet, approvedValidationModel: validation, sourceRecords: proofPlan.sourceRecords, targetRecords: proofPlan.targetRecords });
  canvas = applyXmlCompareCanvasAction(canvas, { type: 'apply-staged-transfer', sourceText: state.textA, targetText: state.textB, workspaceRevision: state.workspaceRevision });
  return { ...state, canvasState: canvas };
}

assert.equal(gate(appState()).blockerCodes.includes('SOURCE_NOT_READY'), true, 'missing Source A blocks workflow');
assert.equal(gate(appState({ textA: sourceText })).blockerCodes.includes('TARGET_NOT_READY'), true, 'missing Target B blocks workflow');
assert.equal(gate(sampleApp(), readyAudit({ blockers: [{ severity: 'BLOCKER', code: 'profile_bad', message: '<bad profile>' }] })).blockerCodes.includes('SOURCE_NOT_READY'), true, 'readiness blockers block workflow');
assert.equal(gate(sampleApp()).blockerCodes.includes('APPROVED_CONNECTOR_REQUIRED'), true, 'approved connector is required');

const approved = approve(sampleApp());
const readyGate = gate(approved);
assert.equal(readyGate.okForTransferStage, true, 'stage allowed after readiness-ready inputs and approved connector');
assert.equal(gateAllowsAction(readyGate, 'stage-transfer'), true);
assert.ok(tabTest.transferActionBlocked('stage-transfer', sampleApp()), 'handler blocks stage when gate is not ready');
assert.ok(tabTest.transferActionBlocked('apply-staged-transfer', approved), 'handler blocks apply before stage exists');
assert.ok(tabTest.transferActionBlocked('export-staged-transfer', approved), 'handler blocks export before apply');
assert.ok(tabTest.transferActionBlocked('download-transfer-proof-json', approved), 'handler blocks proof download before proof exists');
assert.ok(tabTest.transferActionBlocked('copy-patched-target-preview', approved), 'handler blocks copy before patched target exists');

let stagedOnly = applyXmlCompareCanvasAction(approved.canvasState, { type: 'stage-transfer', scope: 'node', selectedBlocks: proofPlan.selectedBlocks, sourceText: approved.textA, targetText: approved.textB, workspaceRevision: approved.workspaceRevision, approvedMatchSet: approved.canvasState.approvedMatchSet, approvedValidationModel: createApprovedConnectorValidationModel({ state: approved.canvasState, sourceRecords: proofPlan.sourceRecords, targetRecords: proofPlan.targetRecords, compareFields: [] }), sourceRecords: proofPlan.sourceRecords, targetRecords: proofPlan.targetRecords });
const stagedGate = gate({ ...approved, canvasState: stagedOnly });
assert.equal(stagedGate.okForApply, true, 'staging enables apply but does not mark transfer applied');
assert.equal(gateAllowsAction(stagedGate, 'apply-staged-transfer'), true);
assert.equal(stagedGate.okForExport, false, 'export waits for applied patched target');

const applied = stageAndApply(approved);
const appliedGate = gate(applied);
assert.equal(appliedGate.okForExport, true, 'workflow reports export ready after sample transfer apply');
assert.equal(gateAllowsAction(appliedGate, 'export-staged-transfer'), true);
assert.equal(gateAllowsAction(appliedGate, 'download-transfer-proof-json'), true);
assert.equal(gateAllowsAction(appliedGate, 'copy-patched-target-preview'), true);

const stale = { ...approved, workspaceRevision: 2, canvasState: stageAndApply(approved).canvasState };
assert.equal(gate(stale).blockerCodes.includes('TRANSFER_STAGE_BLOCKED'), true, 'stale stage is blocked by gate');

const loaded = await loadTransferProofSampleTexts({ fetchText: async (path) => path.includes('source') ? sourceText : targetText });
const sampleLoaded = { ...createTransferProofSampleLoadState({ ...loaded, previousRevision: 4 }), canvasState: createXmlCompareCanvasState() };
assert.equal(sampleLoaded.textA, sourceText, 'sample loader loads Source A');
assert.equal(sampleLoaded.textB, targetText, 'sample loader loads Target B');
assert.equal(sampleLoaded.canvasState.approvedMatchSet, null, 'sample loader does not auto-approve');
assert.equal(sampleLoaded.canvasState.transferStage, null, 'sample loader does not auto-stage');
assert.equal(sampleLoaded.canvasState.transferLastResult, null, 'sample loader does not auto-apply');

const html = renderXmlCompareTransferWorkflowPanelHtml({ gate: createXmlCompareTransferWorkflowGate({ state: sampleApp(), workspace: workspace(sampleApp()), readinessAudit: readyAudit({ sourceReady: false, blockers: [{ severity: 'BLOCKER', code: 'unsafe<code>', message: '<script>alert(1)</script>' }] }) }) });
assert.ok(html.includes('Transfer workflow readiness'));
assert.ok(html.includes('Next safe action'));
assert.ok(html.includes('unsafe&lt;code&gt;'), 'workflow panel escapes diagnostic code');
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'workflow panel escapes diagnostic message');

const tabSource = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
assert.equal(/querySelector\([^)]*(transfer-workflow|transfer-result|transfer-review)/i.test(tabSource), false, 'workflow/proof actions do not parse rendered DOM state');

console.log('XML Compare readiness gated transfer workflow tests passed');
