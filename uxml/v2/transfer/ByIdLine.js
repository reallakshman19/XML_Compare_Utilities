/**
 * T2 (Owner 22 Nov 2026): the line section 5 shows for a transfer by node id (receipt.byId, u2d_sidecar.py).
 * byIdLine(byId) -> text: which sidecar was used, the CAESAR II renumbering it followed, and where the position match
 * would have put an element end elsewhere (a cross-check only; the node id decides).
 */
const RENUMBER_SHOWN = 10;

export function byIdLine(byId) {
  const check = byId.positionCheck || {};
  const moved = byId.renumbered || [];
  const map = moved.slice(0, RENUMBER_SHOWN).map(([cii, step10]) => `CII ${cii} = step 10 node ${step10}`).join(', ');
  const renumbered = moved.length
    ? `${moved.length} node number(s) changed in CAESAR II were followed (${map}${moved.length > RENUMBER_SHOWN ? ', …' : ''})`
    : 'no node number changed in CAESAR II';
  const other = (check.otherPlace || []).length, unpaired = (check.notPairedByPosition || []).length;
  return `By node id with the CII sidecar ${byId.sidecarFileName || ''} (${String(byId.sidecarSha256 || '').slice(0, 12)}): `
    + `${byId.elements} CII elements followed to the node ids step 10 wrote; ${renumbered}. Position check: `
    + `${other} of ${check.ends} element end(s) sit at another XML node than the position match, ${unpaired} had no position match.`;
}
