/**
 * T3 (Owner 22 Nov 2026, T plan: "the branch table is filled from the ids and the user changes only what is wrong"):
 * section 5's branch table for a transfer by node id (receipt.branchTable, u2d_plan.branch_table).
 *
 * branchChoices(rows, xmlBranches) -> [{ordinal, name}]: every XML branch (receipt.xmlBranches), by ordinal; without
 *   that list, the branches the table names.
 * branchTableRows(rows) -> [[CII line, elements, XML branch, how it was found]] for display.
 * branchMapFrom(rows, picks) -> {CII line: ordinal or null}: the rows you change and the rows you set in an earlier run
 *   (picks: {CII line: '' (as it is) | 'ids' (back to the node ids) | 'skip' | ordinal as text}); a pick equal to a
 *   row found from the ids is no change. An empty object when nothing changed.
 */
const BY = {ids: 'from the node ids', user: 'set by you'};

export function branchChoices(rows, xmlBranches = null) {
  if (xmlBranches) return [...xmlBranches].sort((a, b) => a.ordinal - b.ordinal);
  const seen = new Map();
  for (const r of rows) r.ordinals.forEach((o, i) => { if (!seen.has(o)) seen.set(o, r.branches[i]); });
  return [...seen].sort((a, b) => a[0] - b[0]).map(([ordinal, name]) => ({ordinal, name}));
}

function found(r) {
  if (r.by !== 'ids') return BY[r.by] || r.by;
  return r.ordinals.length > 1 ? 'from the node ids: several branches' : r.ordinals.length ? BY.ids : 'none';
}

export function branchTableRows(rows) {
  return rows.map(r => [r.line, String(r.elements ?? ''), r.branches.join(', ') || '(skipped)', found(r)]);
}

export function branchMapFrom(rows, picks) {
  const out = {};
  for (const r of rows) {
    const pick = picks[r.line] ?? '';
    if (pick === 'ids') continue;                                    // the row goes back to the node ids
    if (pick === '') {
      if (r.by === 'user') out[r.line] = r.ordinals.length ? r.ordinals[0] : null;   // keep the rows you set before
      continue;
    }
    if (pick === 'skip') { out[r.line] = null; continue; }
    const ordinal = Number(pick);
    if (!Number.isInteger(ordinal)) throw new Error(`U2D_BRANCH_MAP_INVALID: the pick for ${r.line} is not a branch`);
    if (r.by === 'user' || r.ordinals.length !== 1 || r.ordinals[0] !== ordinal) out[r.line] = ordinal;
  }
  return out;
}
