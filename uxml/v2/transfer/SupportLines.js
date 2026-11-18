/**
 * Supports from CAESAR II (Owner 18 Nov 2026), section 5's words for them. Pure functions over the receipt
 * written by prototypes/u2d-cii-source (summary.supports and the supports block). Nothing here applies a
 * support to the XML; step 3 does that under locks.
 */
const PLAIN = {
  U2D_SUPPORT_NEW_NODE: 'on a node the XML does not have',
  U2D_SUPPORT_AMBIGUOUS: 'at a point with several nodes',
  U2D_SUPPORT_TARGET_UNCLEAR: 'at a point where the XML node is unclear',
  U2D_SUPPORT_NOT_PAIRED: 'in the XML with no CII node at its point',
  U2D_SUPPORT_NOT_IN_CII: 'in the XML that step 10 does not write',
};
const KIND = {edited: 'support edited', added: 'support added', removed: 'support removed'};
const where = r => (r.ref ? `${r.ref.branchName} node ${r.ref.nodeNumber}` : `CII node ${r.ciiNode}`);

/** One line for the transfer summary: summary.supports counts in plain words. */
export function supportsLine(s) {
  const left = Object.entries(s.refused || {})
    .map(([code, n]) => `${n} ${n === 1 ? 'support' : 'supports'} ${PLAIN[code] || code}`).join(', ') || 'none';
  return `Supports (listed below, not applied to the XML yet): ${s.pointsSame} points the same, ${s.changes} changed in CAESAR II, `
    + `${s.step10Anchors} open-end anchors step 10 adds; not compared: ${left}.`;
}

/** The receipt's support changes and refusals as table rows. A receipt made before supports were read has no
 * supports block. Supports step 10 never writes (nodes numbered 0 or less) are counted in the line, not listed. */
export function supportRows(supports) {
  if (!supports) return {rows: [], refused: [], none: 'This receipt was made before supports were read; it lists none.'};
  const rows = supports.changes.map(c => [c.ref.branchName, c.ref.nodeNumber, KIND[c.kind] || c.kind, c.beforeText, c.afterText]);
  const refused = supports.refused.filter(r => r.code !== 'U2D_SUPPORT_NOT_IN_CII').map(r => [where(r), r.detail]);
  return {rows, refused, none: 'CAESAR II has the same supports as the XML on every paired node.'};
}
