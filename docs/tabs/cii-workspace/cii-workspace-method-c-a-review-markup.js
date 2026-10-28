/** I126-I03: read-only Method C A geometry inside Writer2 Compare Review. */
const h = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
})[char]);
const fmt = v => typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(3))) : '—';
export function methodCAReviewMarkup(evidence, error = null) {
  if (!evidence && !error) return '<section data-ciiw-method-c-review aria-label="Method C geometric evidence"><p>Method C has not been run for this Writer2 session.</p></section>';
  if (error) return `<section data-ciiw-method-c-review aria-live="polite"><h3>Method C · HOLD</h3><p>${h(error)}</p><p>A-only, no physical identity or Writer2 authority.</p></section>`;
  const rows = evidence.rows || [];
  const count = rows.length;
  const status = evidence.registration?.status || 'HOLD';
  const table = count ? `<table class="ciiw-grid" data-ciiw-method-c-a-table="1"><thead><tr><th>SOURCE physical NODE</th><th>Geometric observation</th><th>TARGET NODE alternatives</th><th>Segment witness / original ELEMENT</th></tr></thead><tbody>${rows.map(row => {
    const alternatives = row.alternatives.length ? row.alternatives
      .map(a => `${h(a.target)} (${fmt(a.distanceMm)} mm)`).join('; ') : 'No physical TARGET NODE candidate';
    const seg = row.segmentOnly ? `${h(row.segmentOnly.endpoints.join(' → '))}; original ${h(row.segmentOnly.originalWitness)}; fraction ${fmt(row.segmentOnly.fraction)}` : '—';
    return `<tr data-ciiw-method-c-candidate="1" data-source-node="${h(row.sourceNode)}" data-status="${h(row.status)}"><td>${h(row.sourceNode)}</td><td>${h(row.status)}<small>${h(row.explanation)}</small></td><td>${alternatives}</td><td>${seg}</td></tr>`;
  }).join('')}</tbody></table>` : '<p>No candidate NODE rows: orientation HOLD or invalidated.</p>';
  return `<section data-ciiw-method-c-review aria-label="Method C read-only geometry">
  <h3>Method C — signed original geometry (A-only)</h3>
  <p><strong>READ_ONLY_GEOMETRY · ${h(status)} · ${h(evidence.sourceId)}</strong> · ${count} physical SOURCE NODE observations. This evidence does not qualify BOUND or authorize Writer2 Apply.</p>
  <small>Source set ${h(evidence.sourceSetSha256)} · SOURCE original ${h(evidence.sourceOriginalSha256)} · TARGET original ${h(evidence.targetOriginalSha256)} · session epoch ${h(evidence.sessionEpoch)}</small>
  <p>Selected geometric hypothesis: ${h(evidence.registration?.selectedPoseId || 'HOLD')} · no authenticated Owner physical anchor</p>
  ${table}</section>`;
}
