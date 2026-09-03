import {
  ciiQualifiedLoopsForSuggestion,
  ciiSuggestionSelectionKey,
} from './cii-workspace-base-loop-selection.js';

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function manualPairs(manualBySource, sourceId) {
  return [...(manualBySource?.get?.(sourceId) || [])];
}

function automaticAuthorityRows(inspection, selectedBySource) {
  const rows = new Map();
  for (const member of inspection?.memberInspections || []) {
    const sourceId = String(member.sourceId || '');
    const selected = selectedBySource?.get?.(sourceId) || new Set();
    for (const suggestion of member?.inspection?.baseAnchorSuggestions || []) {
      const selectionKey = ciiSuggestionSelectionKey(suggestion);
      if (!selected.has(selectionKey)) continue;
      for (const loop of ciiQualifiedLoopsForSuggestion(suggestion)) {
        for (const pair of loop.anchorPairs || []) {
          const row = {
            sourceId,
            authority: loop.method === 'METHOD_A_SPATIAL' ? 'METHOD A' : 'METHOD B',
            sourceNodeId: String(pair.sourceNodeId || ''),
            targetNodeId: String(pair.targetNodeId || ''),
            selectionKey,
            baseId: String(loop.baseId || ''),
          };
          const key = `${sourceId}|${row.authority}|${row.baseId}|${row.sourceNodeId}|${row.targetNodeId}`;
          if (!rows.has(key)) rows.set(key, row);
        }
      }
    }
  }
  return [...rows.values()];
}

function manualAuthorityRows(inspection, manualBySource) {
  return (inspection?.memberInspections || []).flatMap((member) => manualPairs(manualBySource, member.sourceId)
    .map((pair, index) => ({
      sourceId: String(member.sourceId || ''),
      authority: 'USER LOCKED',
      sourceNodeId: String(pair.sourceNodeId || ''),
      targetNodeId: String(pair.targetNodeId || ''),
      manualIndex: index,
    })));
}

function fmt(value, digits = 3) {
  const number = Number(value); return Number.isFinite(number) ? Number(number.toFixed(digits)).toString() : '—';
}
function proposalRationaleRows(inspection) {
  return (inspection?.memberInspections || []).flatMap((member) => (member?.inspection?.baseAnchorSuggestions || []).map((row) => {
    const discovery = row?.candidateGeneration?.reviewDiscovery || null;
    const sourceRun = row?.methodB?.source?.runs?.[0] || null; const targetRun = row?.methodB?.target?.runs?.[0] || null;
    const sourceAxes = discovery?.sourceAxisCount ?? Number(row?.methodB?.source?.independentAxisRunCount || 0);
    const targetAxes = discovery?.targetAxisCount ?? Number(row?.methodB?.target?.independentAxisRunCount || 0);
    const network = discovery?.oneAxisCompatible
      ? `${sourceRun?.axisLabel || 'axis'} ${fmt(discovery.sourceLengthMm)} mm ↔ ${targetRun?.axisLabel || 'axis'} ${fmt(discovery.targetLengthMm)} mm · Δ ${fmt(discovery.lengthDeltaMm)} mm · tol ${fmt(discovery.toleranceMm)} mm · terminators agree`
      : (row?.methodB?.status === 'READY' ? `${sourceAxes}/${targetAxes} independent axes · Method B ${row?.basisMethod === 'METHOD_B_NETWORK' || row?.basisMethod === 'METHOD_A_AND_B' ? 'qualified' : 'review'}` : 'No qualified network corroboration');
    const authority = (row?.basisMethod === 'METHOD_A_SPATIAL' || row?.basisMethod === 'METHOD_B_NETWORK' || row?.basisMethod === 'METHOD_A_AND_B')
      ? `${row.confidence || 'REVIEW'} · ${String(row.basisMethod).replaceAll('_', ' ')}`
      : `REVIEW · ${sourceAxes}/${targetAxes} axes; automatic Method B requires at least 2/2`;
    return {
      sourceId: String(member?.sourceId || ''), sourceNodeId: String(row?.sourceNodeId || ''), targetNodeId: String(row?.targetNodeId || ''),
      nodeName: String(discovery?.nodeName || ''), network, authority, discovery: Boolean(discovery),
    };
  }));
}
function proposalRationaleMarkup(inspection) {
  const rows = proposalRationaleRows(inspection);
  if (!rows.length) return '';
  return `<section class="ciiw-ms-proposal-rationale" data-ciiw-ms-proposal-rationale="1"><header><div><b>Anchor proposal rationale</b><span>Human-readable summary before technical Method A/B evidence</span></div><span class="ciiw-corroboration">WHY PROPOSED</span></header><p>Node Name may surface a review candidate but never creates correspondence identity authority. The automatic Method B gate remains at least two independent axes on SOURCE and TARGET.</p><table class="ciiw-mini-grid"><thead><tr><th>Source</th><th>Proposed pair</th><th>Node Name basis</th><th>Network basis</th><th>Authority</th></tr></thead><tbody>${rows.map((row) => `<tr><td><b>${h(row.sourceId)}</b></td><td><b>${h(row.sourceNodeId)} ↔ ${h(row.targetNodeId)}</b></td><td>${row.discovery ? `<code>${h(row.nodeName)}</code><small>exact unique existing name · discovery only</small>` : '—'}</td><td>${h(row.network)}</td><td>${h(row.authority)}</td></tr>`).join('')}</tbody></table></section>`;
}

export function ciiMultiSourceAnchorLedgerRows(inspection, selectedBySource, manualBySource) {
  return Object.freeze([
    ...manualAuthorityRows(inspection, manualBySource),
    ...automaticAuthorityRows(inspection, selectedBySource),
  ]);
}

function summary(inspection, rows) {
  const memberIds = (inspection?.memberInspections || []).map((item) => String(item.sourceId || ''));
  const covered = new Set(rows.map((row) => row.sourceId));
  const manualCount = rows.filter((row) => row.authority === 'USER LOCKED').length;
  return {
    memberCount: memberIds.length,
    coveredCount: memberIds.filter((id) => covered.has(id)).length,
    manualCount,
    automaticCount: rows.length - manualCount,
  };
}

function manualRowMarkup(row) {
  return `<tr data-ciiw-ms-anchor-ledger-row="manual"><td><b>${h(row.sourceId)}</b></td><td><span class="ciiw-corroboration">USER LOCKED</span></td>
<td><input class="ciiw-ms-ledger-node" type="text" inputmode="numeric" value="${h(row.sourceNodeId)}" aria-label="${h(row.sourceId)} SOURCE anchor node" data-ciiw-ms-ledger-source data-ciiw-ms-ledger-source-id="${h(row.sourceId)}" data-ciiw-ms-ledger-index="${h(row.manualIndex)}"></td>
<td><input class="ciiw-ms-ledger-node" type="text" inputmode="numeric" value="${h(row.targetNodeId)}" aria-label="${h(row.sourceId)} TARGET anchor node" data-ciiw-ms-ledger-target data-ciiw-ms-ledger-source-id="${h(row.sourceId)}" data-ciiw-ms-ledger-index="${h(row.manualIndex)}"></td>
<td><b>LOCKED</b><small>reviewed node pair</small></td><td class="ciiw-ms-ledger-actions"><button class="ciiw-ms-inline-action" type="button" data-ciiw-ms-ledger-update data-ciiw-ms-ledger-source-id="${h(row.sourceId)}" data-ciiw-ms-ledger-index="${h(row.manualIndex)}">Update</button><button class="ciiw-ms-inline-action" type="button" data-ciiw-ms-ledger-remove data-ciiw-ms-ledger-source-id="${h(row.sourceId)}" data-ciiw-ms-ledger-index="${h(row.manualIndex)}">Remove</button></td></tr>`;
}

function automaticRowMarkup(row) {
  return `<tr data-ciiw-ms-anchor-ledger-row="automatic"><td><b>${h(row.sourceId)}</b></td><td><b>${h(row.authority)}</b><small>${h(row.baseId || 'qualified base')}</small></td><td>${h(row.sourceNodeId)}</td><td>${h(row.targetNodeId)}</td><td><b>SELECTED</b><small>method-qualified</small></td><td class="ciiw-ms-ledger-actions"><button class="ciiw-ms-inline-action" type="button" data-ciiw-ms-ledger-auto-remove data-ciiw-ms-ledger-source-id="${h(row.sourceId)}" data-ciiw-ms-ledger-selection-key="${h(row.selectionKey)}">Remove base</button></td></tr>`;
}

export function ciiMultiSourceAnchorLedgerMarkup(inspection, selectedBySource, manualBySource) {
  const rows = ciiMultiSourceAnchorLedgerRows(inspection, selectedBySource, manualBySource);
  const counts = summary(inspection, rows);
  const body = rows.length
    ? `<table class="ciiw-mini-grid ciiw-ms-anchor-ledger-table"><thead><tr><th>Source</th><th>Authority</th><th>SOURCE node</th><th>TARGET node</th><th>State</th><th>Action</th></tr></thead><tbody>${rows.map((row) => row.authority === 'USER LOCKED' ? manualRowMarkup(row) : automaticRowMarkup(row)).join('')}</tbody></table>`
    : '<p class="ciiw-ms-anchor-ledger-empty">No anchor authority selected yet. Choose a qualified Method A/B base or add a reviewed manual anchor below.</p>';
  return `<section class="ciiw-base-set ciiw-ms-anchor-ledger" data-ciiw-ms-anchor-ledger="1"><header><div><b>Source-set Anchor Authority</b><span>${h(counts.coveredCount)} / ${h(counts.memberCount)} SOURCE members covered · ${h(counts.manualCount)} manual locked · ${h(counts.automaticCount)} method-qualified</span></div><span class="ciiw-corroboration">MASTER LEDGER</span></header><p>This is the authoritative list of anchors currently chosen for S1/S2/S3. Manual rows are editable here; updating a row changes the next Compare input. A review-only proposal appears here only after you click <b>Add reviewed anchor</b>.</p>${body}</section>${proposalRationaleMarkup(inspection)}`;
}

export const _test = Object.freeze({ automaticAuthorityRows, manualAuthorityRows, summary, proposalRationaleRows, proposalRationaleMarkup });
