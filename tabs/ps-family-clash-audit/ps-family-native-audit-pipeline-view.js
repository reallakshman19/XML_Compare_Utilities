export function renderPsFamilyNativePipelinePanel() {
  return `<section class="psmap-card psfa-panel" aria-label="Native staged JSON audit pipeline"><div class="psmap-card-head"><b>Native Staged JSON Pipeline</b></div><div class="psmap-card-body"><div class="psfa-section-intro">Build support/steel relationships, resolve authoritative pipe/carrier objects, evaluate analytical support-to-carrier attachment candidates, and run the PS/SL evidence audit in one XML-free operation. Branch context is kept separate from physical carrier objects.</div><div class="psfa-native-actions"><button type="button" data-psfa="native-load-sample">Load PS-14259 Demo</button><button type="button" data-psfa="native-check-readiness">Check Native Readiness</button><button type="button" class="psfa-native-primary" data-psfa="native-build-audit">Build &amp; Audit</button></div><div class="psfa-native-input-grid">${sourceInput('native-support', 'Staged support JSON', 'Paste support hierarchy or PipeSupportProjectionBundle.v1')}${sourceInput('native-steel', 'Staged steel JSON', 'Paste structural hierarchy with transforms, axes or bounds')}</div><details class="psfa-native-config"><summary>Pipeline configuration</summary><div class="psfa-native-config-grid"><label>Steel projection tolerance mm<input data-psfa="native-projection-tolerance" type="number" min="0.001" step="0.5" value="25"></label><label>Member contact tolerance mm<input data-psfa="native-contact-tolerance" type="number" min="0" step="0.5" value="2"></label><label>Member candidate tolerance mm<input data-psfa="native-candidate-tolerance" type="number" min="0" step="1" value="25"></label><label>Carrier attachment tolerance mm<input data-psfa="native-carrier-contact-tolerance" type="number" min="0" step="0.5" value="2"></label><label>Carrier nearby tolerance mm<input data-psfa="native-carrier-candidate-tolerance" type="number" min="0" step="1" value="25"></label><label>Audit family filter<input data-psfa="native-source-family" placeholder="Optional, e.g. /PS-14259"></label></div></details><div class="psfa-native-run-state" data-psfa="native-run-state"><b>Not built</b><span>Load staged support and steel JSON, then run the native pipeline.</span></div><div data-psfa="native-results"></div><div class="psfa-native-export-actions"><button type="button" data-psfa="native-use-bundle">Use Bundle in Audit Input</button><button type="button" data-psfa="native-download-bundle">Download Relationship Bundle</button><button type="button" data-psfa="native-download-audit">Download Audit JSON</button><button type="button" data-psfa="native-download-package">Download Pipeline Package</button></div></div></section>`;
}

export function renderPsFamilyNativePipelineReadiness(readiness) {
  if (!readiness) return '';
  const summary = readiness.summary || {};
  const diagnostics = readiness.diagnostics || [];
  return `<div class="psfa-native-readiness ${readiness.blocking ? 'is-blocked' : 'is-ready'}"><b>${readiness.blocking ? 'Readiness blocked' : 'Native inputs ready'}</b><span>Support records: ${summary.supportRecordCount || 0} · Steel records: ${summary.steelRecordCount || 0} · XML required: No</span>${diagnostics.length ? `<ul>${diagnostics.map((row) => `<li><code>${h(row.code)}</code> ${h(row.message)}</li>`).join('')}</ul>` : ''}</div>`;
}

export function renderPsFamilyNativePipelineResults(pipeline) {
  if (!pipeline) return '<div class="psmap-help-text">Run the native pipeline to inspect results.</div>';
  const summary = pipeline.summary || {};
  const exceptions = pipeline.audit?.supportExceptionRows || [];
  const relationships = pipeline.relationshipBundle?.relationships || [];
  const carriers = pipeline.audit?.carrierResolutionRows || [];
  const attachments = pipeline.audit?.carrierAttachmentEvaluationRows || [];
  return `<div class="psfa-native-results"><div class="psfa-native-summary">${card('Pipeline status', summary.status)}${card('Support families', summary.supportFamilyCount)}${card('Resolved / unresolved', `${summary.resolvedFamilyCount} / ${summary.unresolvedFamilyCount}`)}${card('Carrier objects', summary.carrierObjectCount)}${card('Analytical carriers', summary.analyticalCarrierGeometryCount)}${card('Resolved carriers', summary.resolvedPhysicalCarrierCount)}${card('Carrier attachments', summary.carrierAttachmentCandidateCount)}${card('Carrier nearby', summary.nearbyCarrierAttachmentCandidateCount)}${card('Attachment unresolved', summary.unresolvedCarrierAttachmentCount)}${card('Member chain edges', summary.supportChainEdgeCount)}${card('Structural terminals', summary.structuralTerminalCount)}${card('Audit exceptions', summary.auditExceptionCount)}</div><div class="psfa-native-result-grid"><section><h4>Relationship outcomes</h4>${relationshipTable(relationships)}</section><section><h4>Carrier-object resolution</h4>${carrierTable(carriers)}</section><section><h4>Carrier attachment geometry</h4>${attachmentTable(attachments)}</section><section><h4>Audit exceptions</h4>${exceptionTable(exceptions)}</section></div><details><summary>Artifact schemas and pipeline guarantees</summary><dl class="psfa-native-contract"><dt>Pipeline</dt><dd>${h(pipeline.schema)}</dd><dt>Relationship bundle</dt><dd>${h(pipeline.outputSchemas?.relationshipBundle)}</dd><dt>Member chain</dt><dd>${h(pipeline.outputSchemas?.memberChain || 'None')}</dd><dt>Carrier catalog</dt><dd>${h(pipeline.outputSchemas?.carrierCatalog || 'None')}</dd><dt>Carrier resolution</dt><dd>${h(pipeline.outputSchemas?.carrierResolution || 'None')}</dd><dt>Carrier geometry</dt><dd>${h(pipeline.outputSchemas?.carrierGeometry || 'None')}</dd><dt>Carrier attachment</dt><dd>${h(pipeline.outputSchemas?.carrierAttachment || 'None')}</dd><dt>Graph audit</dt><dd>${h(pipeline.outputSchemas?.audit)}</dd><dt>XML required</dt><dd>${pipeline.xmlRequired ? 'Yes' : 'No'}</dd><dt>XML consumed</dt><dd>${pipeline.xmlConsumed ? 'Yes' : 'No'}</dd><dt>Carrier identity contact proof</dt><dd>Not proven</dd><dt>Attachment classification</dt><dd>Analytical candidate only</dd></dl></details></div>`;
}

function sourceInput(key, label, placeholder) {
  return `<label>${h(label)}<textarea data-psfa="${h(key)}" rows="16" spellcheck="false" placeholder="${h(placeholder)}"></textarea><span data-psfa="${h(key)}-status" class="psmap-help-text">No source loaded</span></label>`;
}

function relationshipTable(rows) {
  if (!rows.length) return '<div class="psmap-help-text">No relationship rows.</div>';
  return `<div class="psmap-table-wrap"><table class="psmap-table"><thead><tr><th>Support family</th><th>Steel group</th><th>Status</th><th>Method</th><th>Distance</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${h(row.supportFamilyId)}</td><td>${h(row.steelGroupId || row.nearestSteelGroupId || 'UNRESOLVED')}</td><td>${h(row.relationshipStatus)}</td><td>${h(row.geometryMethod || 'UNAVAILABLE')}</td><td>${row.distanceMm ?? '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

function carrierTable(rows) {
  if (!rows.length) return '<div class="psmap-help-text">No carrier resolution rows.</div>';
  return `<div class="psmap-table-wrap"><table class="psmap-table"><thead><tr><th>Support member</th><th>Carrier object</th><th>Status</th><th>Confidence</th><th>Contact proof</th></tr></thead><tbody>${rows.slice(0, 40).map((row) => `<tr><td>${h(row.supportMemberId)}</td><td>${h(row.carrierObjectId || row.branchContextId || 'UNRESOLVED')}</td><td>${h(row.resolutionStatus)}</td><td>${h(row.confidence)}</td><td>${h(row.contactEvidenceStatus || 'NOT_PROVEN')}</td></tr>`).join('')}</tbody></table></div>`;
}

function attachmentTable(rows) {
  if (!rows.length) return '<div class="psmap-help-text">No carrier attachment evaluations.</div>';
  return `<div class="psmap-table-wrap"><table class="psmap-table"><thead><tr><th>Support member</th><th>Carrier</th><th>Status</th><th>Geometry</th><th>Distance mm</th><th>Evidence</th></tr></thead><tbody>${rows.slice(0, 40).map((row) => `<tr><td>${h(row.supportMemberId)}</td><td>${h(row.carrierObjectId)}</td><td>${h(row.attachmentStatus)}</td><td>${h(row.geometryMethod || 'UNAVAILABLE')}</td><td>${row.distanceMm ?? '—'}</td><td>${h(row.contactEvidenceStatus || 'NOT_PROVEN')}</td></tr>`).join('')}</tbody></table></div>`;
}

function exceptionTable(rows) {
  if (!rows.length) return '<div class="psfa-native-ok">No audit exceptions.</div>';
  return `<div class="psmap-table-wrap"><table class="psmap-table"><thead><tr><th>Severity</th><th>Code</th><th>Support group</th><th>Reason</th></tr></thead><tbody>${rows.slice(0, 30).map((row) => `<tr><td>${h(row.severity)}</td><td>${h(row.exceptionCode)}</td><td>${h(row.supportGroup)}</td><td>${h(row.reason)}</td></tr>`).join('')}</tbody></table></div>`;
}

function card(label, value) {
  return `<article><span>${h(label)}</span><strong>${h(value ?? 0)}</strong></article>`;
}

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}
