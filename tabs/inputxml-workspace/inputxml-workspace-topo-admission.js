/**
 * TOPO-B B2: fail-closed normal Workspace source-upload admission and preview.
 * The source bytes feed both the unchanged CleanXML textarea input and the strict
 * read-only F05/R4 admission. This module has no conversion, DOM, 5B or writer
 * dependencies. An edge is source evidence, not an engineering-approved connection.
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


/**
 * Revoke before any replacement I/O or manual source text edit. The epoch also
 * invalidates pending arrayBuffer() reads and pending async parser outcomes.
 */
export function revokeTopologyAdmission(state) {
  state.topologyAdmissionEpoch = (state.topologyAdmissionEpoch ?? 0) + 1;
  state.topologyAdmission = null;
  state.topologyAdmissionError = '';
  state.topologyAdmissionPhase = 'idle';
  state.topologyAdmissionSourceText = null;
  state.topologyAdmissionSourceKind = null;
  return state.topologyAdmissionEpoch;
}

/**
 * The normal Source XML upload's only read path. Byte snapshot is decoded with
 * browser File.text's UTF-8 semantics for the EXISTING CleanXML textarea; the
 * exact same bytes (not a text re-encoding) go to admitXmlBytes.
 *
 * Two distinct epoch checks: (1) after bytes are read, before source adoption or
 * invoking admission; (2) after async admission, before publishing any verdict.
 * A changed source or closed dialog cannot resurrect an old graph. All external
 * effects are callbacks, making the real handler contract directly unit-testable.
 */
export async function admitWorkspaceSourceUpload({
  state, file, admitBytes, onSourceText = () => {}, notify = () => {},
  isCurrent = () => true,
}) {
  if (!file) { revokeTopologyAdmission(state); notify(); return null; }
  const epoch = revokeTopologyAdmission(state);
  state.topologyAdmissionPhase = 'checking';
  notify();
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (epoch !== state.topologyAdmissionEpoch || !isCurrent()) return null; // guard after I/O
    const sourceText = new TextDecoder('utf-8').decode(bytes);
    onSourceText(sourceText, file.name);
    state.topologyAdmissionSourceKind = 'normal-source';
    state.topologyAdmissionSourceText = sourceText;
    notify();
    const verdict = await admitBytes(bytes, {name: file.name, epoch});
    if (epoch !== state.topologyAdmissionEpoch || !isCurrent()) return null; // guard after admission
    state.topologyAdmission = verdict;
    state.topologyAdmissionPhase = 'ready';
    notify();
    return verdict;
  } catch (error) {
    if (epoch !== state.topologyAdmissionEpoch || !isCurrent()) return null;
    state.topologyAdmission = null;
    state.topologyAdmissionPhase = 'failed';
    state.topologyAdmissionError = String(error?.message || error);
    notify();
    return null;
  }
}

/** Current, measured file-byte identity AND identical adopted source snapshot. */
export function workspaceTopologyGate(state) {
  const gate = topologyPreviewGate(state.topologyAdmission, state.topologyAdmissionEpoch);
  if (!gate.allowed) return gate;
  if (state.topologyAdmissionSourceKind !== 'normal-source' ||
      typeof state.topologyAdmissionSourceText !== 'string' ||
      !state.topologyAdmissionSourceText ||
      state.topologyAdmissionSourceText !== state.sourceXmlText)
    return Object.freeze({allowed: false, reason: 'SOURCE_BYTES_OR_TEXT_CHANGED'});
  return gate;
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
export function renderTopologyAdmission({phase = 'idle', admission = null, epoch = 0, error = '', sourceXmlText = '', sourceSnapshot = null, sourceKind = null} = {}) {
  const input = '<div class="ixw-note">Load or replace a file using <b>CleanXML → Source XML</b>. This exact normal Workspace upload is checked for read-only F05/R4 topology evidence.</div>';
  const note = '<div class="ixw-note">Only source records from that same measured file and epoch can be previewed; never an approved physical connection or CII writer. The legacy 5B paste/upload parser is not mounted in this lane.</div>';
  if (phase === 'checking') return `${input}<div class="ixw-note" role="status">Checking uploaded XML bytes and profile. Previous topology evidence cleared.</div>${note}`;
  if (phase === 'failed') return `${input}<div class="ixw-error" role="alert">Topology admission failed: ${esc(error || 'unavailable')}. Preview blocked.</div>${note}`;
  if (!admission) return `${input}<div class="ixw-note" role="status">No topology file admitted. Load an XML file to check its profile.</div>${note}`;

  const gate = workspaceTopologyGate({topologyAdmission: admission, topologyAdmissionEpoch: epoch,
    topologyAdmissionSourceKind: sourceKind, topologyAdmissionSourceText: sourceSnapshot, sourceXmlText});
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
    <div class="ixw-note">Schema: ${esc(admission.admittedProfile)} · units: ${esc(admission.units?.length || "unqualified")} · SHA-256: ${esc(sha)} (measured file bytes) · read-only</div>
    <details><summary>Source-element preview (${admission.elementCount} records; first ${Math.min(8, admission.edges.length)} shown)</summary>
      <div style="overflow:auto"><table class="ixw-table"><thead><tr><th>Source record</th><th>From</th><th>To</th><th>Signed Δ [mm]</th></tr></thead><tbody>${edges}</tbody></table></div>
    </details>${note}`;
}
