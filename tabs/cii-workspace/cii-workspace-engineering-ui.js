import { inspectCiiWorkspaceModels } from './cii-workspace-core.js';
import { mountCiiWorkspaceShell } from './cii-workspace-shell.js';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
function finite(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function fmt(value, digits = 3) {
  const number = finite(value); return number == null ? '—' : Number(number.toFixed(digits)).toString();
}
function methodLabel(method) {
  return ({
    METHOD_A_SPATIAL: 'METHOD A — Spatial',
    METHOD_B_NETWORK: 'METHOD B — Network',
    METHOD_A_AND_B: 'METHOD A + METHOD B',
    LANDMARK_ONLY: 'LANDMARK ONLY',
  })[method] || String(method || 'UNQUALIFIED');
}
function methodClass(method) {
  return ({
    METHOD_A_SPATIAL: 'method-a', METHOD_B_NETWORK: 'method-b',
    METHOD_A_AND_B: 'method-ab', LANDMARK_ONLY: 'landmark',
  })[method] || 'review';
}
function confidenceClass(confidence) {
  return ({ HIGH: 'high', MEDIUM: 'medium', REVIEW: 'review' })[confidence] || 'review';
}
function toleranceRange(policy) {
  const values = (policy?.anchorTolerances || []).map((row) => finite(row.toleranceMm)).filter((value) => value != null);
  if (!values.length) return policy?.basisAgreementToleranceMm == null ? '—' : `${fmt(policy.basisAgreementToleranceMm)} mm`;
  const minimum = Math.min(...values); const maximum = Math.max(...values);
  return Math.abs(maximum - minimum) < 1e-9 ? `${fmt(minimum)} mm` : `${fmt(minimum)}–${fmt(maximum)} mm`;
}
function matrixMarkup(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 3) return '<span>Unavailable</span>';
  return `<div class="ciiw-matrix">${matrix.map((row) => `<code>${(row || []).map((value) => fmt(value, 6).padStart(10, ' ')).join(' ')}</code>`).join('')}</div>`;
}
function translationMarkup(vector) {
  if (!Array.isArray(vector) || vector.length !== 3) return 'Unavailable';
  return `(${vector.map((value) => fmt(value, 6)).join(', ')}) mm`;
}
function methodAMarkup(row) {
  const evidence = row?.methodA; const base = evidence?.bestBase;
  if (evidence?.status !== 'READY' || !base) {
    return `<section class="ciiw-method-card is-review"><div class="ciiw-method-title"><b>Method A — Spatial</b><span>UNAVAILABLE</span></div><p>No qualified non-collinear local rigid-registration base contains this pair.</p></section>`;
  }
  const diagnostics = base.expansionDiagnostics || {};
  const ambiguous = [...(diagnostics.ambiguousSourceNodeIds || []).map((id) => `SOURCE ${id}`),
    ...(diagnostics.ambiguousTargetNodeIds || []).map((id) => `TARGET ${id}`)];
  const cap = base.automaticConfidenceCap
    ? `<div class="ciiw-method-warning">Automatic confidence capped at ${h(base.automaticConfidenceCap)} until ${h(base.automaticConfidenceMinimumAnchorCount)} anchors validate the transform.</div>` : '';
  const ambiguity = ambiguous.length
    ? `<div class="ciiw-method-warning">Equal-residual spatial candidates excluded: ${h(ambiguous.join(', '))}</div>` : '';
  return `<section class="ciiw-method-card"><div class="ciiw-method-title"><b>Method A — Spatial</b><span>${h(evidence.confidence || 'REVIEW')}</span></div>
<div class="ciiw-method-kpis"><div><b>${h(base.anchorCount)}</b><span>anchors</span></div><div><b>${h(base.validationAnchorCount)}</b><span>validation</span></div><div><b>${h(fmt(base.rmsResidualMm))} mm</b><span>RMS residual</span></div><div><b>${h(fmt(base.maxResidualMm))} mm</b><span>max residual</span></div><div><b>${h(toleranceRange(base.tolerancePolicy))}</b><span>OD-scaled tolerance</span></div><div><b>${h(fmt(base.weight?.total, 1))}/100</b><span>weight</span></div></div>
<p><b>Base:</b> ${h(base.baseId)} · <b>basis:</b> ${h(base.selectedBasisId)} · <b>minimum sin θ:</b> ${h(fmt(base.minimumAnchorSinAngle, 6))} · <b>max normalized residual:</b> ${h(fmt(base.maxNormalizedResidual, 4))}</p>${cap}${ambiguity}
<details><summary>Inspect transform evidence</summary><div class="ciiw-detail-grid"><div><b>Rotation matrix</b>${matrixMarkup(base.rotation)}</div><div><b>Translation</b><code>${h(translationMarkup(base.translation))}</code><p>Establishment anchors: ${h(base.establishmentAnchorCount)} · validation anchors: ${h(base.validationAnchorCount)}</p><p>Tolerance: ${h(base.tolerancePolicy?.factor ?? 2)} × SOURCE OD; OD is tolerance scale only.</p></div></div></details></section>`;
}
function runSummary(run) {
  const terminators = (run?.terminatorClasses || []).map((value) => String(value).split(':')[0]).filter(Boolean);
  return `${run?.axisLabel || 'SKEW'} · ${fmt(run?.totalLengthMm)} mm · ${run?.elementCount ?? '—'} element${Number(run?.elementCount) === 1 ? '' : 's'} · ${terminators.join('+') || 'terminator —'}`;
}
function runList(label, side) {
  const runs = side?.runs || [];
  if (!runs.length) return `<div><b>${h(label)}</b><p>No qualified PIPE run evidence.</p></div>`;
  return `<div><b>${h(label)}</b><ol class="ciiw-run-list">${runs.map((run) => `<li><span>${h(run.runId)}</span>${h(runSummary(run))}</li>`).join('')}</ol></div>`;
}
function mappingMarkup(selected) {
  const rows = selected?.mapping?.rows || [];
  if (!rows.length) return '<p>No selected compatible run mapping.</p>';
  return `<table class="ciiw-mini-grid"><thead><tr><th>SOURCE run</th><th>TARGET run</th><th>Length Δ</th><th>Terminator</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${h(item.sourceRunId)}</td><td>${h(item.targetRunId)}</td><td>${h(fmt(item.lengthDeltaMm))} mm</td><td>${item.terminatorsCompatible ? 'PASS' : 'REVIEW'}</td></tr>`).join('')}</tbody></table>`;
}
function methodBQualified(row) { return row?.basisMethod === 'METHOD_B_NETWORK' || row?.basisMethod === 'METHOD_A_AND_B'; }
function methodBMarkup(row) {
  const evidence = row?.methodB; const qualified = methodBQualified(row);
  if (!evidence) return `<section class="ciiw-method-card is-review"><div class="ciiw-method-title"><b>Method B — Network</b><span>UNAVAILABLE</span></div><p>No local pipe-run evidence is available.</p></section>`;
  const sourceRuns = evidence.source?.independentAxisRunCount ?? 0; const targetRuns = evidence.target?.independentAxisRunCount ?? 0;
  const gapPass = Number(row.winnerGap) >= Number(row.requiredWinnerGap);
  const mutualBest = Boolean(row.candidateGeneration?.mutualBest);
  const authorityStatus = qualified ? 'QUALIFIED' : 'REVIEW';
  const reason = evidence.status !== 'READY' ? evidence.reason
    : (!mutualBest ? 'STRUCTURAL_CANDIDATE_NOT_MUTUAL_BEST' : (!gapPass ? 'WINNER_GAP_GATE_NOT_MET' : 'QUALIFIED'));
  return `<section class="ciiw-method-card ${qualified ? '' : 'is-review'}"><div class="ciiw-method-title"><b>Method B — Network</b><span>${h(authorityStatus)}</span></div>
<div class="ciiw-method-kpis"><div><b>${h(sourceRuns)} / ${h(targetRuns)}</b><span>independent runs S/T</span></div><div><b>${h(evidence.weight?.compatibleDimension || '—')}</b><span>compatible dimension</span></div><div><b>${h(fmt(evidence.tolerancePolicy?.toleranceMm))} mm</b><span>OD-scaled tolerance</span></div><div><b>${h(fmt(row.methodBWeight?.total, 1))}/100</b><span>display weight</span></div><div><b>${h(fmt(row.winnerGap, 1))} / ${h(fmt(row.requiredWinnerGap, 1))}</b><span>winner gap</span></div><div><b>${mutualBest ? 'PASS' : 'REVIEW'}</b><span>mutual best</span></div></div>
<p><b>Run basis:</b> ${h(evidence.status)} · <b>authority:</b> ${h(authorityStatus)} · <b>reason:</b> ${h(reason)} · <b>candidate rank:</b> ${h(row.candidateGeneration?.sourceRank ?? '—')}/${h(row.candidateGeneration?.targetRank ?? '—')}</p>
<div class="ciiw-run-grid">${runList('SOURCE runs', evidence.source)}${runList('TARGET runs', evidence.target)}</div>
<details><summary>Inspect network evidence</summary><p>Compatible basis count: ${h(evidence.compatibleBasisCount ?? 0)} · compatible independent runs: ${h(evidence.weight?.compatibleIndependentRunCount ?? 0)} · maximum normalized geometric error: ${h(fmt(evidence.selectedBasis?.maxNormalizedGeometricError, 4))}</p>${mappingMarkup(evidence.selectedBasis)}</details></section>`;
}
function candidateMarkup(row, index) {
  const method = row?.basisMethod || 'LANDMARK_ONLY';
  const exclusions = (row?.identityExclusions || []).map((item) => String(item).replace(/_/g, ' ').toLowerCase()).join(' · ');
  const corroboration = method === 'METHOD_A_AND_B' ? '<span class="ciiw-corroboration">A + B corroborated</span>' : '';
  return `<article class="ciiw-anchor-card ${h(methodClass(method))}" data-ciiw-evidence-card="${h(row.sourceNodeId)}:${h(row.targetNodeId)}">
<header><div><span class="ciiw-anchor-index">B${index + 1}</span><h4>${h(row.sourceNodeId)} <span>↔</span> ${h(row.targetNodeId)}</h4></div><div class="ciiw-anchor-badges"><span class="ciiw-basis-badge">${h(methodLabel(method))}</span><span class="ciiw-confidence ${h(confidenceClass(row.confidence))}">${h(row.confidence || 'REVIEW')}</span>${corroboration}</div></header>
<p class="ciiw-candidate-line">Structural candidate score ${h(fmt(row.score, 1))} · rank ${h(row.candidateGeneration?.sourceRank ?? '—')}/${h(row.candidateGeneration?.targetRank ?? '—')} · winner gap ${h(fmt(row.winnerGap, 1))}/${h(fmt(row.requiredWinnerGap, 1))} · engineer review required</p>
<div class="ciiw-method-grid">${methodAMarkup(row)}${methodBMarkup(row)}</div>
<footer><small>Identity exclusions: ${h(exclusions || 'node-number offset, OD identity and wall identity remain excluded')}</small><button type="button" data-ciiw-evidence-accept data-source-node="${h(row.sourceNodeId)}" data-target-node="${h(row.targetNodeId)}">Accept base anchor</button></footer></article>`;
}
export function baseAnchorEvidenceMarkup(inspection) {
  const rows = inspection?.baseAnchorSuggestions || [];
  if (!rows.length) return '<div class="ciiw-method-empty"><h3>Match Basis</h3><p>No method-qualified Base Anchor suggestion is available. Enter reviewed anchors manually.</p></div>';
  const high = rows.filter((row) => row.confidence === 'HIGH').length;
  const medium = rows.filter((row) => row.confidence === 'MEDIUM').length;
  const review = rows.length - high - medium;
  return `<div class="ciiw-method-head"><div><span class="ciiw-eyebrow">INPUTS &amp; MATCH BASIS</span><h3>Method-qualified Base Anchor review</h3><p>Method A and Method B remain independent OR evidence. No candidate becomes authoritative until engineer acceptance.</p></div><div class="ciiw-method-counts"><span><b>${high}</b> HIGH</span><span><b>${medium}</b> MEDIUM</span><span><b>${review}</b> REVIEW</span></div></div><div class="ciiw-anchor-card-list">${rows.map(candidateMarkup).join('')}</div>`;
}

function fileIdentity(input) { return input?.files?.[0]?.name || 'Not loaded'; }
function addEngineeringChrome(container, legacy, options) {
  const documentRef = container.ownerDocument; const sourceInput = container.querySelector('[data-ciiw-source]');
  const targetInput = container.querySelector('[data-ciiw-target]'); const inspectButton = container.querySelector('[data-ciiw-inspect]');
  const inputsPanel = container.querySelector('[data-ciiw-panel="inputs"]'); const closeButton = container.querySelector('[data-ciiw-close]');
  const status = container.querySelector('[data-ciiw-status]'); if (!sourceInput || !targetInput || !inspectButton || !inputsPanel) return () => {};
  container.setAttribute('data-ciiw-layout', 'full');
  const identity = documentRef.createElement('div'); identity.className = 'ciiw-identity-strip'; identity.setAttribute('data-ciiw-identity-strip', '1');
  const toggle = documentRef.createElement('button'); toggle.type = 'button'; toggle.className = 'ciiw-layout-toggle'; toggle.setAttribute('data-ciiw-layout-toggle', '1');
  const evidence = documentRef.createElement('section'); evidence.className = 'ciiw-method-evidence'; evidence.setAttribute('data-ciiw-method-evidence', '1');
  inputsPanel.appendChild(evidence); (closeButton?.parentNode || container).appendChild(identity); (closeButton?.parentNode || container).appendChild(toggle);
  let disposed = false; let layout = 'full'; let inspectionReady = false;
  const updateIdentity = () => {
    const current = legacy.getCurrentResult?.();
    const readiness = current ? `Correspondence ${current.correspondence?.status || '—'} · Writer 1B ${current.writerReadiness?.status || '—'}`
      : (inspectionReady ? 'Match basis review' : 'Input required');
    identity.innerHTML = `<div><span>SOURCE</span><b>${h(fileIdentity(sourceInput))}</b></div><span class="ciiw-identity-arrow">→</span><div><span>TARGET</span><b>${h(fileIdentity(targetInput))}</b></div><span class="ciiw-readiness">${h(readiness)}</span>`;
    toggle.textContent = layout === 'full' ? 'Compact view' : 'Full view';
  };
  const setLayout = (next) => { layout = next; container.setAttribute('data-ciiw-layout', layout); updateIdentity(); };
  const clearEvidence = () => { inspectionReady = false; evidence.innerHTML = ''; updateIdentity(); };
  const bindAccept = () => {
    evidence.querySelectorAll('[data-ciiw-evidence-accept]').forEach((button) => button.addEventListener('click', async () => {
      const legacyButton = [...container.querySelectorAll('[data-ciiw-accept-anchor]')].find((item) => item.dataset.sourceNode === button.dataset.sourceNode && item.dataset.targetNode === button.dataset.targetNode);
      if (legacyButton) await legacyButton.click();
      evidence.querySelectorAll('[data-ciiw-evidence-card]').forEach((card) => card.setAttribute('data-selected', card.dataset.ciiwEvidenceCard === `${button.dataset.sourceNode}:${button.dataset.targetNode}` ? 'true' : 'false'));
    }));
  };
  const inspectEvidence = async () => {
    try {
      const sourceFile = sourceInput.files?.[0]; const targetFile = targetInput.files?.[0]; if (!sourceFile || !targetFile) return;
      evidence.innerHTML = '<div class="ciiw-method-loading">Building Method A / Method B evidence…</div>';
      const inspection = await inspectCiiWorkspaceModels({ sourceText: await sourceFile.text(), sourceFileName: sourceFile.name,
        targetText: await targetFile.text(), targetFileName: targetFile.name }, { cryptoRef: options.cryptoRef });
      if (disposed) return; inspectionReady = true; evidence.innerHTML = baseAnchorEvidenceMarkup(inspection); bindAccept(); updateIdentity();
    } catch (error) {
      if (!disposed) evidence.innerHTML = `<div class="ciiw-method-empty"><b>Evidence view unavailable</b><p>${h(error?.message || error)}</p></div>`;
    }
  };
  const onSource = () => { clearEvidence(); }; const onTarget = () => { clearEvidence(); };
  const onInspect = () => { void inspectEvidence(); }; const onToggle = () => setLayout(layout === 'full' ? 'compact' : 'full');
  sourceInput.addEventListener('change', onSource); targetInput.addEventListener('change', onTarget); inspectButton.addEventListener('click', onInspect); toggle.addEventListener('click', onToggle);
  const MutationObserverRef = documentRef.defaultView?.MutationObserver || globalThis.MutationObserver;
  const observer = status && MutationObserverRef ? new MutationObserverRef(updateIdentity) : null;
  observer?.observe(status, { childList: true, subtree: true, characterData: true }); updateIdentity();
  return () => { disposed = true; observer?.disconnect(); sourceInput.removeEventListener('change', onSource); targetInput.removeEventListener('change', onTarget); inspectButton.removeEventListener('click', onInspect); toggle.removeEventListener('click', onToggle); };
}

export function mountCiiWorkspaceEngineeringShell(container, options = {}) {
  const legacy = mountCiiWorkspaceShell(container, options); const disposeChrome = addEngineeringChrome(container, legacy, options);
  return { destroy() { disposeChrome(); legacy.destroy(); }, getCurrentResult() { return legacy.getCurrentResult?.(); } };
}

export const _test = Object.freeze({ methodLabel, methodClass, confidenceClass, toleranceRange, methodAMarkup, methodBMarkup, candidateMarkup });
