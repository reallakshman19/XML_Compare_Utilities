import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createXmlCompareCanvasState } from '../xml-compare/XmlCompareCanvasStateController.js';
import { createXmlCompareTransferWorkflowGate, gateAllowsAction } from '../xml-compare/XmlCompareTransferWorkflowGateModel.js';
import { renderXmlCompareTransferWorkflowPanelHtml } from '../xml-compare/XmlCompareTransferWorkflowPanel.js';
import { _test as modalTest } from '../xml-compare/XmlCompareTransferModalPopup.js';

function state(overrides = {}) {
  return { fileA: null, fileB: null, textA: '', textB: '', workspaceRevision: 0, canvasState: createXmlCompareCanvasState(), ...overrides };
}
function readiness({ sourceReady = true, targetReady = true, blockers = [] } = {}) {
  return {
    sourceA: { readyForConnector: sourceReady, diagnostics: blockers, recordCount: sourceReady ? 1 : 0, parseOk: sourceReady },
    targetB: { readyForConnector: targetReady, diagnostics: blockers, recordCount: targetReady ? 1 : 0, parseOk: targetReady },
  };
}
function gate(appState = state(), audit = readiness()) {
  return createXmlCompareTransferWorkflowGate({ state: appState, workspace: {}, readinessAudit: audit });
}

const emptyGate = gate(state(), readiness({ sourceReady: false, targetReady: false }));
assert.equal(emptyGate.blockerCodes.includes('SOURCE_NOT_READY'), true, 'missing Source A blocks workflow');
assert.equal(emptyGate.blockerCodes.includes('TARGET_NOT_READY'), true, 'missing Target B blocks workflow');
assert.equal(gateAllowsAction(emptyGate, 'stage-transfer'), false, 'stage is blocked before readiness');

const blockedGate = gate(state(), readiness({ blockers: [{ severity: 'BLOCKER', code: 'profile_bad', message: '<bad profile>' }] }));
assert.equal(blockedGate.blockerCodes.includes('SOURCE_NOT_READY'), true, 'readiness blockers block source workflow');
assert.equal(blockedGate.blockerCodes.includes('TARGET_NOT_READY'), true, 'readiness blockers block target workflow');

const approvedState = state({
  canvasState: createXmlCompareCanvasState({
    approvedMatchSet: { summary: { approvedCount: 1 }, approvedMatches: [{ sourceUid: 'S1', targetUid: 'T1' }] },
  }),
});
const readyGate = gate(approvedState, readiness());
assert.equal(readyGate.okForTransferStage, true, 'stage is allowed after source, target, and approved connector are ready');
assert.equal(gateAllowsAction(readyGate, 'stage-transfer'), true, 'gateAllowsAction mirrors stage readiness');
assert.equal(gateAllowsAction(readyGate, 'apply-staged-transfer'), false, 'apply is blocked before a valid stage exists');
assert.equal(gateAllowsAction(readyGate, 'export-staged-transfer'), false, 'export is blocked before apply');
assert.equal(gateAllowsAction(readyGate, 'download-transfer-proof-json'), false, 'proof download is blocked before export readiness');
assert.equal(gateAllowsAction(readyGate, 'copy-patched-target-preview'), false, 'copy is blocked before patched target exists');

const html = renderXmlCompareTransferWorkflowPanelHtml({ gate: createXmlCompareTransferWorkflowGate({ state: state(), workspace: {}, readinessAudit: readiness({ sourceReady: false, blockers: [{ severity: 'BLOCKER', code: 'unsafe<code>', message: '<script>alert(1)</script>' }] }) }) });
assert.ok(html.includes('Transfer workflow readiness'));
assert.ok(html.includes('Next safe action'));
assert.ok(html.includes('unsafe&lt;code&gt;'), 'workflow panel escapes diagnostic code');
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'workflow panel escapes diagnostic message');

const exportMeta = modalTest.outputActionMeta('export-staged-transfer');
assert.equal(exportMeta.icon, '⬇', 'export XML action has a visible icon badge');
assert.equal(exportMeta.kind, 'export', 'export XML action has a stable CSS hook');

const outputCss = fs.readFileSync(new URL('../tabs/xml-compare-transfer-output-ui.css', import.meta.url), 'utf8');
assert.ok(outputCss.includes('.xmlc-transfer-output {'), 'transfer output CSS is present');
assert.ok(outputCss.includes('position: sticky;'), 'output action band remains visible while scrolling long transfer review');
assert.ok(outputCss.includes('grid-template-columns: repeat(auto-fit'), 'output actions use responsive grid layout');
assert.ok(outputCss.includes('.xmlc-transfer-action-icon'), 'export icon badge is styled');
assert.ok(outputCss.includes('.xmlc-transfer-action.is-primary'), 'primary export action has visible styling');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(indexHtml.includes('xml-compare-transfer-output-ui.css'), 'transfer output CSS is loaded by index.html');

const tabSource = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
assert.equal(/querySelector\([^)]*(transfer-workflow|transfer-result|transfer-review)/i.test(tabSource), false, 'workflow/proof actions do not parse rendered DOM state');
assert.ok(tabSource.includes('TRANSFER_STATE_BUTTON_SELECTOR'), 'tab owns current transfer state button selector');
assert.ok(tabSource.includes('handleTransferStateButton'), 'tab owns transfer state button handler');
assert.ok(tabSource.includes('data-xml-compare-candidate-approve'), 'tab owns current candidate approve selector');
assert.ok(tabSource.includes('data-xml-compare-candidate-reject'), 'tab owns current candidate reject selector');

const shellSource = fs.readFileSync(new URL('../xml-compare/XmlCompareWorkspaceShell.js', import.meta.url), 'utf8');
assert.equal(shellSource.includes('xml-compare-candidate-review-runtime'), false, 'workspace shell no longer imports candidate review runtime');
assert.equal(shellSource.includes('xml-compare-transfer-apply-runtime'), false, 'workspace shell no longer imports transfer apply runtime');

const candidateRuntimeSource = fs.readFileSync(new URL('../tabs/xml-compare-candidate-review-runtime.js', import.meta.url), 'utf8');
assert.equal(candidateRuntimeSource.includes('addEventListener'), false, 'candidate sidecar has no document listener');
assert.equal(candidateRuntimeSource.includes('data-xml-compare-candidate-action'), false, 'candidate sidecar no longer owns stale selector');

const transferRuntimeSource = fs.readFileSync(new URL('../tabs/xml-compare-transfer-apply-runtime.js', import.meta.url), 'utf8');
assert.equal(transferRuntimeSource.includes('addEventListener'), false, 'transfer sidecar has no document listener');
assert.equal(transferRuntimeSource.includes('stopImmediatePropagation'), false, 'transfer path does not require stopImmediatePropagation');
assert.equal(transferRuntimeSource.includes('data-xml-compare-automap-popup'), false, 'transfer sidecar has no legacy automap popup dependency');
assert.equal(transferRuntimeSource.includes('injectStyle'), false, 'transfer sidecar no longer injects dead styles');

console.log('XML Compare readiness gated transfer workflow tests passed');
