/** I126 A01: original-byte Method C A-only interactive investigation.
 * This module consumes an immutable read-only sidecar, never certifies identity. */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
})[c]);
const ALLOWED = new Set(['INVESTIGATE', 'REJECT', 'EVIDENCE_REQUESTED']);
const fmt = x => typeof x === 'number' && Number.isFinite(x) ? String(Number(x.toFixed(3))) : '—';
const option = (value, label, current) =>
  '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + '>' + esc(label) + '</option>';

export function methodCAOnlyReviewCounts(rows) {
  return Object.freeze({
    total: rows.length,
    candidates: rows.filter(x => x.alternatives?.length > 0).length,
    segmentOnly: rows.filter(x => x.status === 'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT').length,
    outside: rows.filter(x => x.status === 'OUTSIDE_TOLERANCE').length,
  });
}
function validEvidence(evidence) {
  if (evidence?.authority !== 'READ_ONLY_UNVERIFIED_GEOMETRY' ||
      evidence?.qualifiedPhysicalIdentityCount !== 0 ||
      evidence?.writerEligible !== false || evidence?.applyAuthorized !== false ||
      !Array.isArray(evidence.rows) || evidence.rows.some(r => r.writerEligible || r.physicalIdentityQualified))
    throw new Error('METHOD_C_A_REVIEW_UNVERIFIED_EVIDENCE_REQUIRED');
}
export function methodCAOnlyReviewReceipt(evidence, decisions = new Map()) {
  validEvidence(evidence);
  const ids = new Set(evidence.rows.map(row => row.sourceNode));
  if (ids.size !== evidence.rows.length) throw new Error('METHOD_C_A_REVIEW_DUPLICATE_SOURCE_NODE');
  const review = [...decisions].map(([sourceNode, item]) => {
    if (!ids.has(sourceNode) || !ALLOWED.has(item?.disposition) ||
        typeof item.note !== 'string' || item.note.length > 400)
      throw new Error('METHOD_C_A_REVIEW_INVALID_DISPOSITION');
    return Object.freeze({ sourceNode, disposition: item.disposition, note: item.note });
  }).sort((a,b) => Number(a.sourceNode)-Number(b.sourceNode));
  return Object.freeze({
    schema: 'MethodC.AOnlyCandidateReview.v1',
    authority: 'REVIEW_ONLY_GEOMETRIC_EVIDENCE_NOT_PHYSICAL_CERTIFICATE',
    sourceId: evidence.sourceId,
    sourceSetSha256: evidence.sourceSetSha256,
    sourceOriginalSha256: evidence.sourceOriginalSha256,
    targetOriginalSha256: evidence.targetOriginalSha256,
    sessionEpoch: evidence.sessionEpoch,
    selectedPoseId: evidence.registration?.selectedPoseId ?? null,
    counts: methodCAOnlyReviewCounts(evidence.rows),
    observations: evidence.rows,
    geometry: evidence,
    dispositions: review,
    qualifiedPhysicalIdentityCount: 0,
    writerEligible: false,
    applyAuthorized: false,
    mutationOperations: Object.freeze([]),
  });
}
function rowMatches(row, filter, search) {
  const group = row.status === 'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT' ? 'SEGMENT' :
    row.status === 'OUTSIDE_TOLERANCE' ? 'OUTSIDE' :
    row.alternatives?.length ? 'CANDIDATE' : 'OTHER';
  if (filter !== 'ALL' && group !== filter) return false;
  const haystack = [row.sourceNode, row.status,
    ...(row.alternatives || []).map(x => x.target),
    ...(row.segmentOnly?.endpoints || [])].join(' ').toLowerCase();
  return !search || haystack.includes(search.toLowerCase());
}
function detailMarkup(row, review) {
  const targetRows = row.alternatives?.length ? row.alternatives.map(a =>
    '<li>TARGET NODE ' + esc(a.target) + ', ' + fmt(a.distanceMm) +
    ' mm; residual XYZ ' + esc(JSON.stringify(a.residual)) +
    '; OD ' + esc(a.od ?? '—') + '; wall ' + esc(a.wall ?? '—') +
    '; signed ELEMENT ' + esc(JSON.stringify(a.originalElementWitnesses || [])) + '</li>'
  ).join('') : '<li>No physical TARGET NODE candidate</li>';
  const segment = row.segmentOnly ?
    '<p>Original TARGET ELEMENT segment: ' + esc(row.segmentOnly.endpoints.join(' → ')) +
    '; fraction ' + fmt(row.segmentOnly.fraction) +
    '; distance ' + fmt(row.segmentOnly.distanceMm) +
    '; witness ' + esc(row.segmentOnly.originalWitness) + ' (not a TARGET NODE)</p>' : '';
  return '<section data-ciiw-candidate-detail><h5>SOURCE physical NODE ' + esc(row.sourceNode) +
    ' — ' + esc(row.status) + '</h5><p>' + esc(row.explanation) + '</p>' +
    '<p>Original SOURCE XYZ ' + esc(JSON.stringify(row.sourceXYZ)) +
    '; registered XYZ ' + esc(JSON.stringify(row.registeredXYZ)) +
    '; SOURCE OD ' + esc(row.sourceOD ?? '—') + '; wall ' + esc(row.sourceWall ?? '—') +
    '</p><p>Original SOURCE ELEMENT witnesses: ' +
    esc(JSON.stringify(row.originalSourceElementWitnesses || [])) + '</p>' +
    '<p>Contested TARGET NODEs: ' + esc((row.contestedTargets || []).join(', ') || 'none') +
    '</p><ul>' + targetRows + '</ul>' + segment +
    '<label>Investigation disposition <select data-ciiw-candidate-disposition>' +
    option('INVESTIGATE', 'Investigate', review?.disposition || 'INVESTIGATE') +
    option('REJECT', 'Reject this geometric hypothesis', review?.disposition) +
    option('EVIDENCE_REQUESTED', 'Evidence requested', review?.disposition) +
    '</select></label><label>Review note (not physical acceptance) ' +
    '<textarea data-ciiw-candidate-note maxlength="400" rows="2">' +
    esc(review?.note || '') + '</textarea></label>' +
    '<button type="button" data-ciiw-candidate-save>Save review note</button></section>';
}
function reviewMarkup(evidence, decisions, {open,selected,filter,search}) {
  const c = methodCAOnlyReviewCounts(evidence.rows);
  const rows = evidence.rows.filter(row => rowMatches(row, filter, search));
  const selectedRow = evidence.rows.find(row => row.sourceNode === selected) || null;
  return '<section data-ciiw-candidate-workbench aria-label="Method C geometric candidate investigation">' +
    '<p><strong>Method C A ready · physical verification pending · Transfer unavailable.</strong> ' +
    'No geometry-only candidate can be accepted as BOUND or sent to Writer2.</p>' +
    '<p>' + c.total + ' SOURCE nodes · ' + c.candidates + ' coordinate candidates · ' +
    c.segmentOnly + ' segment-only · ' + c.outside + ' outside tolerance · 0 Method C BOUND.</p>' +
    '<button type="button" data-ciiw-candidate-open aria-expanded="' + (open ? 'true' : 'false') +
    '">Review geometric candidates →</button>' +
    '<div data-ciiw-candidate-panel' + (open ? '' : ' hidden') + '>' +
    '<p><strong>Review-only investigation.</strong> Dispositions document doubts and requests; they never qualify identity.</p>' +
    '<label>Show <select data-ciiw-candidate-filter>' +
    option('ALL', 'All 57 original SOURCE observations', filter) +
    option('CANDIDATE', 'Coordinate candidates', filter) +
    option('SEGMENT', 'Segment only (no TARGET NODE)', filter) +
    option('OUTSIDE', 'Outside tolerance', filter) + '</select></label>' +
    '<label>Find SOURCE or TARGET node <input data-ciiw-candidate-search type="search" value="' +
    esc(search) + '"></label>' +
    '<p data-ciiw-candidate-visible>' + rows.length + ' visible of ' + c.total + '</p>' +
    '<div style="max-height:260px;overflow:auto"><table class="ciiw-grid"><thead><tr>' +
    '<th>SOURCE</th><th>Observation</th><th>Alternative</th><th>Action</th></tr></thead><tbody>' +
    rows.map(row => '<tr data-ciiw-a-review-row="' + esc(row.sourceNode) + '"><td>' +
      esc(row.sourceNode) + '</td><td>' + esc(row.status) + '</td><td>' +
      esc(row.alternatives?.map(a => a.target).join(', ') ||
        row.segmentOnly?.endpoints?.join(' → ') || 'No TARGET NODE') + '</td><td>' +
      '<button type="button" data-ciiw-candidate-select="' + esc(row.sourceNode) +
      '">Inspect</button></td></tr>').join('') +
    '</tbody></table></div>' +
    (selectedRow ? detailMarkup(selectedRow, decisions.get(selected)) :
      '<p>Select Inspect on any SOURCE node to see its original signed evidence.</p>') +
    '<p>Saved review notes: ' + decisions.size + '. Export includes every A-only observation, all SHA/epoch/pose evidence and review dispositions.</p>' +
    '<button type="button" data-ciiw-candidate-export>Download review-only JSON</button> ' +
    '<button type="button" data-ciiw-candidate-close>Close investigation</button></div></section>';
}
function downloadReceipt(documentRef, evidence, decisions) {
  const receipt = methodCAOnlyReviewReceipt(evidence, decisions);
  const blob = new Blob([JSON.stringify(receipt, null, 2) + '\n'], {type:'application/json'});
  const url = URL.createObjectURL(blob), link = documentRef.createElement('a');
  link.href = url;
  link.download = 'method-c-a-review-' + evidence.sourceId + '-' +
    evidence.sourceOriginalSha256.slice(0, 12) + '-epoch' + evidence.sessionEpoch + '.json';
  documentRef.body.appendChild(link);
  try { link.click(); } finally { link.remove(); URL.revokeObjectURL(url); }
}
/** Bind only inside the Method C sibling review section, never Writer2 correspondence. */
export function mountMethodCAOnlyCandidateWorkbench(root, {isCurrent} = {}) {
  if (!root || typeof isCurrent !== 'function') throw new Error('METHOD_C_A_REVIEW_HOST_REQUIRED');
  let evidence = null, selected = '', filter = 'ALL', search = '', open = false;
  const decisions = new Map();
  const panel = root.ownerDocument.createElement('div');
  const render = () => {
    panel.innerHTML = evidence ? reviewMarkup(evidence,decisions,{open,selected,filter,search}) : '';
    if (evidence && !panel.isConnected) {
      const section=root.querySelector('[data-ciiw-method-c-review]');
      section?.insertBefore(panel, section.querySelector('[data-ciiw-method-c-a-table]'));
    }
  };
  const current = () => Boolean(evidence && isCurrent(evidence));
  const clear = () => {
    evidence=null;selected='';filter='ALL';search='';open=false;decisions.clear();
    panel.remove();
  };
  const onClick = event => {
    const button=event.target.closest?.('button');
    if (!button || !panel.contains(button)) return;
    event.preventDefault();event.stopPropagation();
    if (!current()) {clear();return;}
    if (button.hasAttribute('data-ciiw-candidate-open')) {open=true;render();return;}
    if (button.hasAttribute('data-ciiw-candidate-close')) {open=false;render();return;}
    if (button.hasAttribute('data-ciiw-candidate-select')) {
      selected=button.getAttribute('data-ciiw-candidate-select');open=true;render();return;
    }
    if (button.hasAttribute('data-ciiw-candidate-save')) {
      const disposition=panel.querySelector('[data-ciiw-candidate-disposition]')?.value;
      const note=panel.querySelector('[data-ciiw-candidate-note]')?.value?.trim() || '';
      if (!ALLOWED.has(disposition) || note.length>400) throw new Error('METHOD_C_A_REVIEW_INVALID_DISPOSITION');
      decisions.set(selected, Object.freeze({disposition,note}));
      render();return;
    }
    if (button.hasAttribute('data-ciiw-candidate-export')) downloadReceipt(root.ownerDocument,evidence,decisions);
  };
  const onChanged = event => {
    if (!panel.contains(event.target) || !current()) return;
    if (event.target.matches('[data-ciiw-candidate-filter]')) {filter=event.target.value;render();}
    if (event.target.matches('[data-ciiw-candidate-search]')) {search=event.target.value;render();}
  };
  root.addEventListener('click',onClick);
  root.addEventListener('change',onChanged);
  return Object.freeze({
    setEvidence(next) {validEvidence(next);clear();evidence=next;render();},
    clear,
    getReceipt() {return current() ? methodCAOnlyReviewReceipt(evidence,decisions) : null;},
    destroy() {clear();root.removeEventListener('click',onClick);root.removeEventListener('change',onChanged);},
  });
}
