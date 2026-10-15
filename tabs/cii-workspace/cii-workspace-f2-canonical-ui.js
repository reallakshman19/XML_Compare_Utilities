/**
 * Browser projection ONLY. Exact physical graph resolution is owned by A2
 * canonical core and is performed off the main thread by the F2 module Worker.
 */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
export function ciiF2CanonicalPanelMarkup(report){
 const s=report?.summary;
 const rows=(report?.rows||[]).filter(x=>x.state==='CONFLICT').slice(0,40)
  .map(x=>'<tr><td>'+esc(x.sourceNodeKey)+'</td><td>'+esc(x.targetAlternatives.join(' / '))+'</td><td>'+esc(x.reasons.join(', '))+'</td></tr>').join('');
 return '<section class="ciiw-base-set" data-ciiw-f2-canonical="1">'
  +'<header><div><b>F2 · Joint AUTO + MANUAL physical graph</b><span>One canonical A2 solver · isolated Worker</span></div><span class="ciiw-corroboration">REVIEW ONLY</span></header>'
  +'<p>Retains both original automatic and reviewed manual claims. The active Compare, Transfer Preview and Writer remain unchanged. No recovered hypothesis is a certified physical identity.</p>'
  +'<button type="button" data-ciiw-f2-reconcile>Reconcile original physical graph</button>'
  +(s?'<p data-ciiw-f2-summary><b>'+esc(s.originalPhysicalSourceNodes)+'</b> original SOURCE NODEs · '
    +esc(s.jointHypotheses)+' candidate hypotheses · '+esc(s.conflictingSourceNodes)+' conflicting SOURCE nodes · '
    +esc(s.recoveredHypotheses)+' recovered hypotheses · '+esc(s.uniqueNewlyCoveredNodes)+' newly covered NODEs · '
    +esc(s.factorsWithoutTwoEndpointsAfterRecovery)+' incomplete endpoint factors · <b>0 certified / 0 Writer</b></p>'
    +(rows?'<details><summary>Conflicting SOURCE/TARGET identities</summary><table class="ciiw-grid"><thead><tr><th>SOURCE</th><th>TARGET alternatives</th><th>Why unresolved</th></tr></thead><tbody>'+rows+'</tbody></table></details>':'<p>No competing candidates observed; this does not certify completeness.</p>')
    +'<button type="button" data-ciiw-f2-export>Export read-only A2 graph evidence JSON</button>'
    :'<p data-ciiw-f2-empty>Run optional shadow graph reconciliation after Compare. No changes to operational matching are implied.</p>')
  +'</section>';
}
