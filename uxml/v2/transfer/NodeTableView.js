/**
 * T4 (road map 26 Nov 2026): section 5's node table for a transfer by node id (receipt.nodeTable, u2d_plan.node_table).
 * Read only: one row per CII node, where it landed in the XML and what the transfer did there.
 *
 * NODE_FILTERS: the filter choices, value -> label.
 * nodeTableRows(rows, filter) -> [[CII node, step 10 node, XML node(s), position check, edits, supports, refused]]:
 *   the rows to show for that filter ('all', 'renumbered', 'refused', 'edited').
 */
export const NODE_FILTERS = {all: 'every node', renumbered: 'only renumbered in CAESAR II', refused: 'only refused',
  edited: 'only edited'};

const KEEP = {
  all: () => true,
  renumbered: r => r.step10 !== r.cii,
  refused: r => r.refused.length > 0,
  edited: r => r.edits > 0 || r.supports > 0,
};

function xmlCell(xml) {
  return xml.map(x => `${x.branch} #${x.node}${x.nodeNumber ? ` (${x.nodeNumber})` : ''}${x.name ? ` ${x.name}` : ''}`)
    .join('; ');
}

export function nodeTableRows(rows, filter = 'all') {
  const keep = KEEP[filter];
  if (!keep) throw new Error(`unknown node table filter ${filter}`);
  return rows.filter(keep).map(r => [r.cii, r.step10 === r.cii ? '' : r.step10, xmlCell(r.xml), r.check,
    String(r.edits), String(r.supports), r.refused.join(', ')]);
}
