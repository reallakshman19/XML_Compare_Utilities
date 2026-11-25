/**
 * Supports from CAESAR II (Owner 18 Nov 2026), section 5's words for them. Pure functions over the receipt
 * written by prototypes/u2d-cii-source (summary.supports and the supports block). Step 3 (Owner 18 Nov:
 * "Yes, allow and lock"): TransferStage.js applies the listed changes and locks them; this file only words them.
 */
const PLAIN = {
  U2D_SUPPORT_NEW_NODE: 'on a node the XML does not have',
  U2D_SUPPORT_AMBIGUOUS: 'at a point with several nodes',
  U2D_SUPPORT_TARGET_UNCLEAR: 'at a point where the XML node is unclear',
  U2D_SUPPORT_NOT_PAIRED: 'in the XML with no CII node at its point',
  U2D_SUPPORT_NOT_IN_CII: 'in the XML that step 10 does not write',
  // S-fix step 1 (Owner 23 Nov 2026): moved by step 10 from an unnumbered node, or made by its own rule; never applied
  U2D_SUPPORT_MAY_BE_STEP10: 'that step 10 may have written itself (not applied)',
  // S-fix step 3 (Owner 23 Nov 2026): compared with what step 10 wrote (the CII sidecar's support list)
  U2D_SUPPORT_RULE_REMOVED: "made by step 10's own rule and deleted in CAESAR II (not applied)",
  U2D_SUPPORT_OPEN_END_REMOVED: "that are step 10's open-end anchors, deleted in CAESAR II (not applied)",
  U2D_SUPPORT_SOURCE_UNKNOWN: 'whose source the sidecar does not give (not applied)',
  U2D_SUPPORT_MERGED_COPY: 'that step 10 wrote once from identical copies on several nodes (not applied)',
  U2D_SUPPORT_NOT_ON_NODE: 'whose XML node no longer holds them (not applied)',
  // S-fix step 3h (25 Nov 2026): step 10 writes every support of one XML node, copies included, so copies are written;
  // it merges identical supports of several XML nodes at one point, so there only one copy is written
  U2D_SUPPORT_COPIES_WRITTEN_ONCE: 'held more than once in CAESAR II where step 10 merges copies of several XML nodes '
    + '(written once)',
  U2D_SUPPORT_COPIES_NOT_LISTED: 'on an XML node whose supports the sidecar does not list one by one (not applied)',
};
const KIND = {edited: 'support edited', added: 'support added', removed: 'support removed'};
const where = r => (r.ref ? `${r.ref.branchName} node ${r.ref.nodeNumber}` : `CII node ${r.ciiNode}`);

/** One line for the transfer summary: summary.supports counts in plain words. */
export function supportsLine(s) {
  const left = Object.entries(s.refused || {})
    .map(([code, n]) => `${n} ${n === 1 ? 'support' : 'supports'} ${PLAIN[code] || code}`).join(', ') || 'none';
  const how = s.comparedWith === 'step10' ? ', compared with what step 10 wrote' : '';
  return `Supports (applied and locked, listed below${how}): ${s.pointsSame} points the same, ${s.changes} changed in CAESAR II, `
    + `${s.step10Anchors} open-end anchors step 10 adds; not compared: ${left}.`;
}

/** The receipt's support changes and refusals as table rows. A receipt made before supports were read has no
 * supports block. Supports step 10 never writes (nodes numbered 0 or less) are counted in the line, not listed. */
export function supportRows(supports, comparedWith) {
  if (!supports) return {rows: [], refused: [], none: 'This receipt was made before supports were read; it lists none.'};
  const rows = supports.changes.map(c => [c.ref.branchName, c.ref.nodeNumber, KIND[c.kind] || c.kind, c.beforeText, c.afterText]);
  const refused = supports.refused.filter(r => r.code !== 'U2D_SUPPORT_NOT_IN_CII').map(r => [where(r), r.detail]);
  const none = refused.length ? 'No support change was applied; the XML keeps its supports where the points listed below differ.'
    : comparedWith === 'step10' ? 'CAESAR II has the same supports as step 10 wrote, on every node.'
      : 'CAESAR II has the same supports as the XML on every paired node.';
  return {rows, refused, none};
}
