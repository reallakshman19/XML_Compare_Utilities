/* Exact physical branch ownership gate; no geometry/path inference. */
export function branchContainsNode(parsed, field, branch) {
  if (field.owners.length !== 1 || field.shared || field.orphan) return false;
  const owner = parsed.elements.find((e) => e.witness === field.owners[0]);
  if (!owner || owner.branch !== branch) return false;
  const node = field.fieldIdentity === 'NODENAME.FROM' ? owner.from : owner.to;
  // A shared node is not branch-isolated merely because its named record is.
  return parsed.elements.every((e) => (e.from !== node && e.to !== node) || e.branch === branch);
}
