/** Pure HTML builders for the Edit Draft inspector, timeline, and metrics. */

import { asArray, cleanText, escapeMarkup, objectRecord } from './topology-validator-values.js';
import { objectForSelection, uniqueContextEdges } from './topology-edit-controller-helpers.js';

/** @param {Record<string, unknown>} input @returns {string} */
export function buildTopologyEditInspectorMarkup(input) {
  const { canonical, validation, selection, contextEdgeId } = input;
  if (!canonical) return '<div class="ttv-inspector-empty">Edit Draft is not initialized.</div>';
  const active = selection.at(-1), value = active ? objectForSelection(canonical, active, validation) : null;
  if (!active || !value) {
    return '<div class="ttv-edit-inspector-intro"><h2>Edit Draft</h2><p>Select a node or edge. Ctrl/Cmd adds to selection; Shift selects the shortest connected path; Shift-drag draws a selection box.</p><p>Source JSON, CanonicalTopology.v1, Trace Ledger, and InputXML remain immutable.</p></div>';
  }
  const node = active.kind === 'node' ? value : null, edge = active.kind === 'edge' ? value : null;
  const incident = node ? asArray(canonical.edges).map(objectRecord).filter((row) => row.fromNodeId === node.id || row.toNodeId === node.id) : [];
  const contexts = uniqueContextEdges(canonical, selection, contextEdgeId);
  const supports = node ? asArray(canonical.supports).map(objectRecord).filter((row) => row.nodeId === node.id) : [];
  const rigids = edge ? asArray(canonical.rigids).map(objectRecord).filter((row) => row.edgeId === edge.id) : [];
  const findings = asArray(validation.findings).map(objectRecord).filter((row) => asArray(row.objectIds).map(cleanText).includes(active.id));
  const contextOptions = contexts.map((row) => `<option value="${escapeMarkup(row.id)}"${row.id === contextEdgeId ? ' selected' : ''}>${escapeMarkup(row.id)} · ${escapeMarkup(row.segmentRole)}</option>`).join('');
  const nodeForm = node ? `<div class="ttv-edit-coordinate-grid">${['x', 'y', 'z'].map((axis) => `<label>${axis.toUpperCase()}<input type="number" step="any" data-ttv-edit-coordinate="${axis}" value="${node.position[axis]}"></label>`).join('')}</div><button type="button" data-ttv-edit-inspector-action="MOVE_EXACT">Apply exact XYZ</button><h3>Add straight element</h3><div class="ttv-edit-coordinate-grid">${['x', 'y', 'z'].map((axis) => `<label>${axis.toUpperCase()}<input type="number" step="any" data-ttv-edit-target="${axis}"></label>`).join('')}</div><button type="button" data-ttv-edit-inspector-action="ADD">Add with context</button>` : '';
  const edgeForm = edge ? `<dl><div><dt>From</dt><dd>${escapeMarkup(edge.fromNodeId)}</dd></div><div><dt>To</dt><dd>${escapeMarkup(edge.toNodeId)}</dd></div><div><dt>Role</dt><dd>${escapeMarkup(edge.segmentRole)}</dd></div></dl><label>Split fraction<input type="number" min="0.001" max="0.999" step="0.001" value="0.5" data-ttv-edit-split-fraction></label><button type="button" data-ttv-edit-inspector-action="SPLIT">Split edge</button><label>Disconnect endpoint<select data-ttv-edit-disconnect-endpoint><option value="FROM">FROM</option><option value="TO">TO</option></select></label><button type="button" data-ttv-edit-inspector-action="DISCONNECT">Disconnect endpoint</button>` : '';
  const findingMarkup = findings.length ? findings.map((row) => `<p class="${row.blocking ? 'is-blocking' : ''}" style="border-inline-start:3px solid ${escapeMarkup(cleanText(row.color) || '#ef4444')};padding-inline-start:8px"><b>${escapeMarkup(row.code)}</b> · ${escapeMarkup(row.message)}${row.canvasFix ? `<br><small>Canvas fix: ${escapeMarkup(row.canvasFix)}</small>` : ''}</p>`).join('') : '<p>No findings for this object.</p>';
  return `<section><h2>${escapeMarkup(active.kind.toUpperCase())} · ${escapeMarkup(active.id)}</h2><label>Engineering context edge<select data-ttv-edit-context><option value="">Select explicit authority…</option>${contextOptions}</select></label>${nodeForm}${edgeForm}<h3>Geometry details</h3><dl><div><dt>Selection</dt><dd>${selection.length} object(s)</dd></div>${node ? `<div><dt>Incidence</dt><dd>${incident.length}</dd></div>` : ''}<div><dt>Supports</dt><dd>${supports.map((row) => escapeMarkup(row.tag || row.id)).join(', ') || 'None'}</dd></div><div><dt>Rigids</dt><dd>${rigids.length}</dd></div></dl><h3>Validation</h3>${findingMarkup}<details><summary>Lineage and record</summary><pre>${escapeMarkup(JSON.stringify(value, null, 2))}</pre></details></section>`;
}

/** @param {Record<string, unknown>} draft @returns {string} */
export function buildTopologyEditTimelineMarkup(draft) {
  const commands = asArray(draft.commands).map(objectRecord);
  return `<h3>Command timeline</h3>${commands.length ? `<ol>${commands.map((command) => `<li><b>${escapeMarkup(command.id)}</b><span>${escapeMarkup(command.type)}</span><code>${escapeMarkup(JSON.stringify(command.payload))}</code></li>`).join('')}</ol>` : '<p>No draft commands. Base hash is unchanged.</p>'}`;
}

/** @param {Record<string, unknown>} validation @returns {string} */
export function buildTopologyEditValidationMarkup(validation) {
  const findings = asArray(validation.findings).map(objectRecord);
  return `<h3>Blocking findings</h3>${findings.length ? `<ul>${findings.map((row) => `<li class="${row.blocking ? 'is-blocking' : ''}"><b>${escapeMarkup(row.code)}</b> ${escapeMarkup(row.message)}</li>`).join('')}</ul>` : '<p>No blocking findings. Export is enabled.</p>'}`;
}

/** @param {Record<string, unknown>} input @returns {string} */
export function buildTopologyEditMetricsMarkup(input) {
  const { baseArtifacts, canonical, draft, validation, lastRegenerationMs } = input;
  const rows = [
    ['Base hash', cleanText(baseArtifacts?.canonicalTopology?.canonicalTopologyHash).slice(-12) || '—'],
    ['Draft hash', cleanText(canonical?.canonicalTopologyHash).slice(-12) || '—'],
    ['Commands', draft?.commands?.length ?? 0], ['Nodes', canonical?.nodes?.length ?? 0], ['Elements', canonical?.edges?.length ?? 0],
    ['Restraints', asArray(canonical?.supports).reduce((sum, row) => sum + asArray(objectRecord(row).restraints).length, 0)],
    ['Rigid bodies', canonical?.rigids?.length ?? 0], ['Blocking', objectRecord(validation.summary).blockingCount ?? 0],
    ['Regeneration', `${lastRegenerationMs.toFixed(0)} ms`],
  ];
  return rows.map(([label, value]) => `<span><b>${escapeMarkup(label)}</b>${escapeMarkup(value)}</span>`).join('');
}
