/**
 * TOPO-B B2: fail-closed presentation gate for a separate read-only topology upload.
 * This module deliberately has no parser, converter, Worker, DOM or writer dependencies.
 * Only the measured-byte admission result from xml-format-admission.js may enable a
 * source-element evidence preview. A preview is NOT a physical connectivity verdict.
 */
export const WORKSPACE_TOPO_ADMISSION_VIEW_SCHEMA = 'inputxml-workspace-topo-admission/v1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export function topologyPreviewGate(admission, epoch) {
  if (!admission) return Object.freeze({allowed: false, reason: 'NO_ADMISSION'});
  if (!Number.isSafeInteger(epoch) || admission.epoch !== epoch)
    return Object.freeze({allowed: false, reason: 'STALE_ADMISSION'});
  if (admission.status !== 'ADMITTED')
    return Object.freeze({allowed: false, reason: String(admission.reason || admission.status || 'NOT_ADMITTED')});
  if (admission.digest?.authority !== 'XML_FILE_BYTES_MEASURED' ||
      !/^[a-f0-9]{64}$/.test(admission.digest.sha256 || ''))
    return Object.freeze({allowed: false, reason: 'BYTE_IDENTITY_NOT_MEASURED'});
  if (!Number.isSafeInteger(admission.elementCount) || admission.elementCount < 1 ||
      !Number.isSafeInteger(admission.nodeCount) || admission.nodeCount < 1 ||
      !Array.isArray(admission.edges) || admission.edges.length !== admission.elementCount ||
      !Array.isArray(admission.nodes) || admission.nodes.length !== admission.nodeCount)
    return Object.freeze({allowed: false, reason: 'EMPTY_OR_INCONSISTENT_GRAPH'});
  if (admission.writerEligible !== false || admission.physicalIdentityQualified !== false)
    return Object.freeze({allowed: false, reason: 'UNEXPECTED_WRITE_AUTHORITY'});
  return Object.freeze({allowed: true, reason: null});
}

function geometryLabel(admission) {
  const statuses = new Set((admission.nodes || []).map(node => node.coordinateStatus));
  return statuses.size === 1 && statuses.has('ABSOLUTE_EXPLICIT_SEED') ? 'absolute'
    : statuses.size === 1 && statuses.has('RELATIVE_NO_SEED') ? 'relative (no global seed)'
    : 'mixed/undetermined frame';
}

function profileLabel(admission) {
  if (admission.admittedProfile === 'F05 RichInputXML-P1.v1.1') return 'F05 v1.1';
  if (admission.admittedProfile === 'R4 RichInputXMLv2.1') return 'R4 v2.1';
  return 'unqualified profile';
}

/**
 * The InputXML Workspace's existing CleanXML/5C/enrichment/Categorized controls are
 * independent of this isolated intake. It never invokes them or publishes a graph.
 */
export function renderTopologyAdmission({phase = 'idle', admission = null, epoch = 0, error = ''} = {}) {
  const input = `<div class="ixw-toolbar"><input type="file" accept=".xml,.txt,text/xml,application/xml" data-ixw-file="topologySource" aria-label="Read-only topology XML file"></div>`;
  const note = '<div class="ixw-note">Read-only F05/R4 source-element evidence, not an approved physical connection or CII writer. Other profiles are not admitted. Existing 5B topology tools below are separate.</div>';
  if (phase === 'checking') return `${input}<div class="ixw-note" role="status">Checking uploaded XML bytes and profile. Previous topology evidence cleared.</div>${note}`;
  if (phase === 'failed') return `${input}<div class="ixw-error" role="alert">Topology admission failed: ${esc(error || 'unavailable')}. Preview blocked.</div>${note}`;
  if (!admission) return `${input}<div class="ixw-note" role="status">No topology file admitted. Load an XML file to check its profile.</div>${note}`;

  const gate = topologyPreviewGate(admission, epoch);
  const sha = admission.digest?.sha256 ? String(admission.digest.sha256).slice(0, 12) : 'not measured';
  const measured = admission.digest?.authority === 'XML_FILE_BYTES_MEASURED';
  if (!gate.allowed) {
    const label = admission.status === 'UNSUPPORTED_INPUT' ? 'Not supported' :
      admission.status === 'INVALID' ? 'Invalid XML' : 'Topology preview blocked';
    return `${input}<div class="ixw-error" role="alert"><b>${label}</b> · ${esc(admission.recognizedFormat || admission.root?.localName || 'unknown input')} · reason: ${esc(gate.reason)}. No topology evidence preview.</div><div class="ixw-note">SHA-256: ${esc(sha)}${measured ? ' (measured file bytes)' : ' (unverified)'}. No zero-errors or empty-graph success is claimed.</div>${note}`;
  }

  const edges = admission.edges.slice(0, 8).map(edge =>
    `<tr><td>${esc(edge.recordId || edge.index)}</td><td>${esc(edge.from)}</td><td>${esc(edge.to)}</td><td>${esc((edge.delta || []).join(', '))}</td></tr>`).join('');
  return `${input}<div class="ixw-status" role="status"><b>Admitted · ${esc(profileLabel(admission))} · ${admission.elementCount} elements / ${admission.nodeCount} nodes · ${esc(geometryLabel(admission))}</b></div>
    <div class="ixw-note">Schema: ${esc(admission.admittedProfile)} · units: ${esc(admission.units)} · SHA-256: ${esc(sha)} (measured file bytes) · read-only</div>
    <details><summary>Source-element preview (${admission.elementCount} records; first ${Math.min(8, admission.edges.length)} shown)</summary>
      <div style="overflow:auto"><table class="ixw-table"><thead><tr><th>Source record</th><th>From</th><th>To</th><th>Signed Δ [mm]</th></tr></thead><tbody>${edges}</tbody></table></div>
    </details>${note}`;
}
