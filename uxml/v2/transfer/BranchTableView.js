/**
 * T3 (Owner 22 Nov 2026, T plan: "the branch table is filled from the ids and the user changes only what is wrong"):
 * section 5's branch table for a transfer by node id (receipt.branchTable, u2d_plan.branch_table).
 *
 * branchChoices(rows) -> [{ordinal, name}]: the XML branches the table names, by ordinal.
 * branchTableRows(rows) -> [[CII line, XML branch, how it was found]] for display.
 * branchMapFrom(rows, picks) -> {CII line: ordinal or null}: only the rows whose pick differs from the table
 *   (picks: {CII line: '' (as found) | 'skip' | ordinal as text}), plus the rows you set in an earlier run; an empty
 *   object when nothing changed.
 */
const BY = {ids: 'from the node ids', user: 'set by you'};

export function branchChoices(rows) {
  const seen = new Map();
  for (const r of rows) r.ordinals.forEach((o, i) => { if (!seen.has(o)) seen.set(o, r.branches[i]); });
  return [...seen].sort((a, b) => a[0] - b[0]).map(([ordinal, name]) => ({ordinal, name}));
}

export function branchTableRows(rows) {
  return rows.map(r => [r.line, r.branches.join(', ') || '(skipped)', BY[r.by] || r.by]);
}

export function branchMapFrom(rows, picks) {
  const out = {};
  for (const r of rows) {
    const pick = picks[r.line] ?? '';
    if (pick === '') {
      if (r.by === 'user') out[r.line] = r.ordinals.length ? r.ordinals[0] : null;   // keep the rows you set before
      continue;
    }
    if (pick === 'skip') { out[r.line] = null; continue; }
    const ordinal = Number(pick);
    if (!Number.isInteger(ordinal)) throw new Error(`U2D_BRANCH_MAP_INVALID: the pick for ${r.line} is not a branch`);
    if (r.ordinals.length !== 1 || r.ordinals[0] !== ordinal) out[r.line] = ordinal;
  }
  return out;
}
