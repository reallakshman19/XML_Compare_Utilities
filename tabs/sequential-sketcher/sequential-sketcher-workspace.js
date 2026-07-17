import { parseStagedJson } from './sequential-sketcher-source.js';
import { sequentialSketcherMarkup } from './sequential-sketcher-markup.js';
import { buildSequentialEvidenceModel, indexSequentialEvidence } from './source/sequential-evidence-model.js';
import {
  advanceConstruction, applyConstructionDecision, createSequentialConstructionSession,
  runConstructionUntilBlocked,
} from './construction/sequential-construction-runtime.js';
import { createConfirmedSequentialConstruction } from './construction/sequential-construction-acceptance.js';
import { DECISION_ACTIONS } from './construction/sequential-construction-contract.js';
import { buildConfirmedConstructionSupportProjection } from './support/sequential-confirmed-support-projection.js';
import { buildSequentialProjectMigration } from './sequential-sketcher-project-adapter.js';
import {
  renderConstructionInspector, renderConstructionMetrics, renderConstructionSequence,
  renderSequentialConstructionCanvas,
} from './canvas/sequential-construction-svg.js';

function readFile(file) { return file ? file.text() : Promise.resolve(''); }
function required(root, selector) { const element = root.querySelector(selector); if (!element) throw new Error(`Sequential Sketcher element missing: ${selector}`); return element; }
function numberValue(element, fallback) { const value = Number(element.value); return Number.isFinite(value) ? value : fallback; }

export function mountSequentialSketcherWorkspace(root, context = {}) {
  root.innerHTML = sequentialSketcherMarkup();
  const elements = {
    source: required(root, '[data-ssk-source]'), branch: required(root, '[data-ssk-branch]'),
    exactTolerance: required(root, '[data-ssk-exact-tolerance]'), repairTolerance: required(root, '[data-ssk-repair-tolerance]'),
    candidateRadius: required(root, '[data-ssk-candidate-radius]'), status: required(root, '[data-ssk-status]'),
    canvas: required(root, '[data-ssk-canvas]'), metrics: required(root, '[data-ssk-metrics]'),
    sequence: required(root, '[data-ssk-sequence]'), inspector: required(root, '[data-ssk-inspector]'),
    stepLabel: required(root, '[data-ssk-step-label]'),
  };
  const model = {
    records: null,
    evidence: null,
    indexes: null,
    session: null,
    confirmedConstruction: null,
    supportProjection: null,
    restoredDecisionRegister: null,
    mode: 'ISO',
    selectedCandidateId: '',
  };
  const setStatus = (message, state = 'info') => { elements.status.textContent = message; elements.status.dataset.state = state; };
  const engineOptions = () => ({
    exactToleranceMm: numberValue(elements.exactTolerance, 1),
    autoRepairToleranceMm: Math.min(25, numberValue(elements.repairTolerance, 25)),
    candidateSearchRadiusMm: numberValue(elements.candidateRadius, 250),
  });

  function clearDownstream() {
    model.confirmedConstruction = null;
    model.supportProjection = null;
  }
  function refreshDownstream() {
    clearDownstream();
    if (model.session?.state !== 'ROUTE_COMPLETE') return;
    model.confirmedConstruction = createConfirmedSequentialConstruction(model.session, model.indexes);
    model.supportProjection = buildConfirmedConstructionSupportProjection(
      model.confirmedConstruction,
      model.indexes,
      {
        projectionToleranceMm: 50,
        onCenterlineToleranceMm: 0.001,
        ambiguityToleranceMm: 1,
      },
    );
  }

  function branchSnapshot() {
    return {
      session: model.session,
      confirmedConstruction: model.confirmedConstruction,
      supportProjection: model.supportProjection,
      selectedCandidateId: model.selectedCandidateId,
    };
  }
  function saveActiveBranch() {
    const branchId = model.session?.rootBranchId;
    if (branchId) model.branchRegistry.save(branchId, branchSnapshot());
  }
  function populateBranchOptions(ids) {
    elements.branch.innerHTML = `<option value="">Select authoritative start branch (${ids.length})</option>${ids.map(() => '<option></option>').join('')}`;
    [...elements.branch.options].slice(1).forEach((option, index) => {
      option.value = ids[index];
      option.textContent = ids[index];
    });
  }
  function syncBranchOptions() {
    const ids = model.branchRegistry.ids();
    [...elements.branch.options].slice(1).forEach((option, index) => {
      const branchId = ids[index];
      if (!branchId) return;
      const state = model.branchRegistry.status(branchId);
      option.textContent = `${branchStateLabel(state)} ${branchId}`;
      option.title = `${branchId} · ${state.replaceAll('_', ' ').toLowerCase()}`;
    });
  }
  function syncBranchNavigator() {
    const activeBranchId = model.session?.rootBranchId || '';
    const selectedBranchId = elements.branch.value || activeBranchId;
    const position = model.branchRegistry.position(selectedBranchId);
    elements.branchPosition.textContent = position.index >= 0 ? `${position.index + 1} / ${position.count}` : `0 / ${position.count}`;
    elements.activeBranch.textContent = activeBranchId || 'No active branch';
    elements.activeBranch.title = activeBranchId;
    elements.activeBranchChip.textContent = activeBranchId ? `Active · ${activeBranchId}` : 'No branch open';
    elements.activeBranchChip.title = activeBranchId;
    elements.savedBranches.textContent = `${model.branchRegistry.savedCount()} saved`;
    elements.branchPrev.disabled = position.index <= 0;
    elements.branchNext.disabled = position.index < 0 || position.index >= position.count - 1;
    elements.startLabel.textContent = activeBranchId && selectedBranchId === activeBranchId ? 'Restart branch' : 'Start selected';
    syncBranchOptions();
  }

  function inspect() {
    model.records = parseStagedJson(elements.source.value);
    model.evidence = buildSequentialEvidenceModel(model.records);
    model.indexes = indexSequentialEvidence(model.evidence);
    const ids = model.evidence.branches.map((branch) => branch.branchId).sort((a, b) => a.localeCompare(b));
    populateBranchOptions(ids);
    model.branchRegistry.reset(ids);
    model.session = null;
    model.selectedCandidateId = '';
    model.restoredDecisionRegister = null;
    clearDownstream();
    reviewController?.reset();
    repaint();
    setStatus(`${ids.length} branches indexed as immutable evidence. Select a branch or explicitly build the blocked review queue.`, 'ok');
  }

  function repaint() {
    if (!model.session) return;
    renderSequentialConstructionCanvas(elements.canvas, model.session, {
      mode: model.mode,
      selectedCandidateId: model.selectedCandidateId,
      supportProjection: model.supportProjection,
    });
    renderConstructionMetrics(elements.metrics, model.session, model.supportProjection);
    renderConstructionSequence(elements.sequence, model.session);
    renderConstructionInspector(elements.inspector, model.session, model.indexes, model.selectedCandidateId, model.supportProjection);
    elements.stepLabel.textContent = `${model.session.strokeLedger.length} committed operations`;
  }

  function reportOutcome(outcome) {
    const session = model.session;
    if (!session) return;
    if (session.state === 'USER_DECISION_REQUIRED') {
      const count = session.currentDecisionRequest?.candidates?.length || 0;
      setStatus(`Construction stopped: ${session.currentDecisionRequest?.reason || 'decision required'}. ${count} candidate${count === 1 ? '' : 's'} shown in dotted lines.`, 'warning');
    } else if (session.state === 'ROUTE_COMPLETE') {
      const supports = model.supportProjection;
      setStatus(`Route accepted: ${session.confirmedComponentIds.length} components, ${session.committedConnections.length} connections, ${session.repairLedger.length} repairs, ${supports?.supportGlyphs.length || 0} supports projected${supports?.unresolvedSupportFamilies.length ? `, ${supports.unresolvedSupportFamilies.length} unresolved` : ''}.`, supports?.unresolvedSupportFamilies.length ? 'warning' : 'ok');
    } else if (session.state === 'FAILED') {
      setStatus(`Construction failed: ${session.diagnostics.at(-1)?.code || outcome}.`, 'error');
    } else {
      setStatus(`${outcome}: active branch ${session.activeBranchId}; ${session.confirmedComponentIds.length} components confirmed.`, 'ok');
    }
  }

  function applyResult(result) {
    model.session = result.session;
    model.selectedCandidateId = '';
    refreshDownstream();
    repaint();
    reportOutcome(result.outcome);
  }
  function ensureEvidence() { if (!model.evidence || !model.indexes) inspect(); }
  function openBranch(branchId) {
    ensureEvidence();
    if (!branchId) return;
    saveActiveBranch();
    const opened = model.branchRegistry.open(branchId, createSequentialConstructionSession);
    model.session = opened.snapshot.session;
    model.confirmedConstruction = opened.snapshot.confirmedConstruction;
    model.supportProjection = opened.snapshot.supportProjection;
    model.selectedCandidateId = opened.snapshot.selectedCandidateId;
    if (model.session?.state === 'ROUTE_COMPLETE' && !model.confirmedConstruction) {
      refreshDownstream();
      saveActiveBranch();
    }
    elements.branch.value = branchId;
    reviewController?.selectBranch(branchId);
    repaint();
    const detail = opened.restored
      ? `Restored ${model.session.strokeLedger.length} committed operations, ${model.session.transactionLedger.length} transactions; state ${model.session.state}.`
      : 'Opened a clean workspace. No construction was committed by the branch switch.';
    setStatus(`Branch ${opened.index + 1} of ${opened.count}: ${branchId}. ${detail}`, opened.restored ? 'ok' : 'info');
  }
  function navigateBranch(delta) {
    ensureEvidence();
    const current = elements.branch.value || model.session?.rootBranchId || model.branchRegistry.ids()[0];
    const branchId = model.branchRegistry.adjacent(current, delta);
    if (branchId) openBranch(branchId);
  }
  function start() {
    ensureEvidence();
    const branchId = elements.branch.value;
    if (!branchId) throw new Error('Select one authoritative start branch.');
    model.session = createSequentialConstructionSession(branchId);
    clearDownstream();
    applyResult(advanceConstruction(model.session, model.evidence, model.indexes, engineOptions()));
  }
  function advance() {
    if (!model.session) return start();
    applyResult(advanceConstruction(model.session, model.evidence, model.indexes, engineOptions()));
  }
  function run() {
    if (!model.session) start();
    if (!model.session || model.session.state === 'USER_DECISION_REQUIRED') { repaint(); return; }
    const result = runConstructionUntilBlocked(model.session, model.evidence, model.indexes, engineOptions());
    applyResult({ session: result.session, outcome: result.outcomes.at(-1) || 'NO_CHANGE' });
  }
  function decide(action, candidateId = '') {
    if (!model.session) return;
    applyResult(applyConstructionDecision(model.session, model.evidence, model.indexes, action, { candidateId }, engineOptions()));
  }
  function restorePackage(restoration) {
    if (restoration?.schema !== 'SequentialWorkspaceRestoration.v1') {
      throw new Error('Sequential workspace restoration schema is invalid.');
    }
    model.records = restoration.records;
    model.evidence = restoration.evidence;
    model.indexes = restoration.indexes;
    model.session = null;
    model.selectedCandidateId = '';
    model.restoredDecisionRegister = restoration.decisionRegister || null;
    clearDownstream();
    elements.source.value = JSON.stringify(restoration.records, null, 2);
    populateBranchOptions(restoration.branchIds);
    model.branchRegistry.replace(restoration.branchIds, restoration.workspaces);
    reviewController?.reset();
    if (restoration.activeBranchId) openBranch(restoration.activeBranchId);
    else repaint();
    const register = restoration.decisionRegister?.summary;
    setStatus(
      `Verified workspace package restored: ${restoration.workspaces.length} saved branches${register ? `; ${register.unresolvedCount || 0} unresolved and ${register.manualResolutionCount || 0} manual register rows retained` : ''}.`,
      'ok',
    );
    return restoration;
  }

  async function onChange(event) {
    if (event.target?.dataset?.sskFile !== 'source') return;
    elements.source.value = await readFile(event.target.files?.[0]);
    model.records = null;
    model.evidence = null;
    model.indexes = null;
    model.session = null;
    model.restoredDecisionRegister = null;
    clearDownstream();
    inspect();
  }

  function downloadArtifact(artifact) {
    const blob = new Blob([artifact.text], { type: `${artifact.mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = artifact.name; anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportProject() {
    if (!model.evidence || !model.session) throw new Error('Inspect and construct a route before export.');
    const migration = await buildSequentialProjectMigration({
      sourceText: elements.source.value, sourceName: model.sourceName,
      evidence: model.evidence, session: model.session,
      confirmedConstruction: model.confirmedConstruction, supportProjection: model.supportProjection,
      createdAt: new Date().toISOString(), cryptoRef: globalThis.crypto,
    });
    if (migration.exportPlan.gate.status !== 'READY') throw new Error(migration.exportPlan.gate.blockers.join(' '));
    model.platformMigration = migration;
    downloadArtifact(migration.outputs[0]);
    setStatus('Accepted construction and support evidence exported.', 'ok');
  }

  async function onClick(event) {
    const view = event.target?.closest?.('[data-ssk-view]')?.dataset?.sskView;
    if (view) { model.mode = view; root.querySelectorAll('[data-ssk-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.sskView === view)); repaint(); return; }
    const canvasCandidate = event.target?.closest?.('[data-ssk-candidate-id]')?.dataset?.sskCandidateId;
    const selected = event.target?.closest?.('[data-ssk-select-candidate]')?.dataset?.sskSelectCandidate;
    if (canvasCandidate || selected) { model.selectedCandidateId = canvasCandidate || selected; repaint(); return; }
    const connect = event.target?.closest?.('[data-ssk-connect-candidate]')?.dataset?.sskConnectCandidate;
    if (connect) { decide(DECISION_ACTIONS.CONNECT, connect); return; }
    const reject = event.target?.closest?.('[data-ssk-reject-candidate]')?.dataset?.sskRejectCandidate;
    if (reject) { decide(DECISION_ACTIONS.REJECT_CANDIDATE, reject); return; }
    const decisionAction = event.target?.closest?.('[data-ssk-decision-action]')?.dataset?.sskDecisionAction;
    if (decisionAction) { decide(decisionAction); return; }
    const action = event.target?.closest?.('[data-ssk-action]')?.dataset?.sskAction;
    if (!action) return;
    try {
      if (action === 'inspect') inspect();
      if (action === 'start') start();
      if (action === 'advance') advance();
      if (action === 'run') run();
      if (action === 'export') await exportProject();
      if (action === 'close') context.close?.();
    } catch (error) { setStatus(error.message || String(error), 'error'); context.showToast?.(error.message || String(error), 'error'); }
  }

  reviewController = mountSequentialReviewQueueController(root, {
    ensureEvidence,
    getEvidence: () => model.evidence,
    getIndexes: () => model.indexes,
    getEngineOptions: engineOptions,
    getBranchRegistry: () => model.branchRegistry,
    saveActiveBranch,
    openBranch,
    setStatus,
    showToast: context.showToast,
  });
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('keydown', onKeyDown);
  syncBranchNavigator();
  return Object.freeze({
    getModel: () => model,
    getReviewQueue: () => reviewController?.getQueue() || null,
    saveActiveBranch,
    restorePackage,
    destroy: () => {
      reviewController?.destroy();
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('keydown', onKeyDown);
      root.innerHTML = '';
    },
  });
}
