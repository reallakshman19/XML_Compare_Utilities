import {
  ciiQualifiedLoopsForSuggestion,
  ciiSuggestionSelectionKey,
} from './cii-workspace-base-loop-selection.js';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
function number(value, digits = 3) {
  const n = Number(value); return Number.isFinite(n) ? Number(n.toFixed(digits)).toString() : '—';
}
function methodName(value) {
  return ({ METHOD_A_SPATIAL: 'METHOD A', METHOD_B_NETWORK: 'METHOD B', METHOD_A_AND_B: 'METHOD A + B', LANDMARK_ONLY: 'REVIEW' })[value] || 'REVIEW';
}
function reviewDiscovery(row) { return row?.candidateGeneration?.reviewDiscovery || null; }
function run(row, side) { return row?.methodB?.[side]?.runs?.[0] || null; }
function axisCount(row, side) { return Number(row?.methodB?.[side]?.independentAxisRunCount || 0); }
function proposalReason(row) {
  const discovery = reviewDiscovery(row);
  if (!discovery) {
    return `<div class="ciiw-ms-proposal-reason"><p><b>Why proposed:</b> local topology/component context produced this structural candidate.</p><p><b>Automatic authority:</b> ${h(methodName(row?.basisMethod))} · ${h(row?.confidence || 'REVIEW')}.</p></div>`;
  }
  const sourceRun = run(row, 'source'); const targetRun = run(row, 'target');
  const sourceAxes = discovery.sourceAxisCount ?? axisCount(row, 'source'); const targetAxes = discovery.targetAxisCount ?? axisCount(row, 'target');
  const network = discovery.oneAxisCompatible
    ? `<p><b>Network match:</b> ${h(sourceRun?.axisLabel || 'axis')} ${h(number(discovery.sourceLengthMm))} mm ↔ ${h(targetRun?.axisLabel || 'axis')} ${h(number(discovery.targetLengthMm))} mm · Δ ${h(number(discovery.lengthDeltaMm))} mm · tolerance ${h(number(discovery.toleranceMm))} mm · terminators agree.</p>`
    : '<p><b>Network match:</b> one-axis corroboration is not compatible.</p>';
  return `<div class="ciiw-ms-proposal-reason"><p><b>Node Name match:</b> <code>${h(discovery.nodeName || '—')}</code> exists uniquely at this SOURCE/TARGET pair. It is review discovery only, not identity authority.</p>${network}<p><b>Why REVIEW:</b> ${h(sourceAxes)} / ${h(targetAxes)} independent axes are available; automatic Method B requires at least 2 / 2.</p></div>`;
}
function technical(row) {
  const basis = row?.basis || [];
  if (!basis.length) return '';
  return `<details class="ciiw-ms-proposal-technical"><summary>Technical evidence</summary><ul>${basis.map((item) => `<li>${h(item)}</li>`).join('')}</ul></details>`;
}
function proposalMarkup(row, index, selectedKeys) {
  const key = ciiSuggestionSelectionKey(row); const qualified = ciiQualifiedLoopsForSuggestion(row); const selected = selectedKeys.has(key);
  const discovery = reviewDiscovery(row); const badge = discovery ? 'NODE NAME + NETWORK' : methodName(row?.basisMethod);
  const action = qualified.length ? (selected ? 'Remove from base set' : `Add ${qualified.length > 1 ? `${qualified.length} OR bases` : 'base'}`) : 'Use manual anchor';
  const state = qualified.length ? `${row?.confidence || 'REVIEW'} · method-qualified candidate` : 'REVIEW · manual anchor only';
  return `<article class="ciiw-ms-proposal" data-ciiw-evidence-card="${h(key)}" data-selected="${selected ? 'true' : 'false'}"><header><div><span class="ciiw-anchor-index">B${index + 1}</span><h4>${h(row?.sourceNodeId)} <span>↔</span> ${h(row?.targetNodeId)}</h4></div><span class="ciiw-corroboration">${h(badge)}</span></header><p class="ciiw-ms-proposal-state">${h(state)}</p>${proposalReason(row)}${technical(row)}<footer><small>${qualified.length ? 'Selecting this adds only the qualified Method A/B base authority.' : 'Use manual anchor prefills the pair; Add reviewed anchor is the explicit USER LOCKED action.'}</small><button type="button" data-ciiw-evidence-accept data-ciiw-base-action data-ciiw-selection-key="${h(key)}" data-source-node="${h(row?.sourceNodeId)}" data-target-node="${h(row?.targetNodeId)}">${h(action)}</button></footer></article>`;
}

export function ciiMultiSourceReadableAnchorBasisMarkup(inspection, rawSelectedKeys = []) {
  const rows = inspection?.baseAnchorSuggestions || []; const selectedKeys = rawSelectedKeys instanceof Set ? rawSelectedKeys : new Set(rawSelectedKeys);
  const high = rows.filter((row) => row?.confidence === 'HIGH').length; const medium = rows.filter((row) => row?.confidence === 'MEDIUM').length;
  const review = rows.length - high - medium;
  if (!rows.length) return '<div class="ciiw-method-empty"><span class="ciiw-eyebrow">INPUTS &amp; MATCH BASIS</span><h3>Anchor proposals</h3><p>No proposal is available. Add a reviewed manual anchor below.</p></div>';
  return `<div class="ciiw-method-head"><div><span class="ciiw-eyebrow">INPUTS &amp; MATCH BASIS</span><h3>Anchor proposals — human review</h3><p>Read the reason first. Node Name can discover a review candidate but never creates identity authority; Method B remains automatic only with at least two independent axes on both sides.</p></div><div class="ciiw-method-counts"><span><b>${high}</b> HIGH</span><span><b>${medium}</b> MEDIUM</span><span><b>${review}</b> REVIEW</span></div></div><div class="ciiw-ms-proposal-list">${rows.map((row, index) => proposalMarkup(row, index, selectedKeys)).join('')}</div>`;
}

export const _test = Object.freeze({ proposalReason, proposalMarkup, reviewDiscovery, methodName });
