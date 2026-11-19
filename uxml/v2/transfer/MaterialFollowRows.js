/**
 * Review note N3.1 (Owner 19 Nov 2026, group 1): "material follows the branch" sets every node MaterialCode of a branch
 * whose MaterialNumber was transferred. A node whose own code differed from the branch's material before the transfer
 * (a deliberate node material) is overwritten too. The behaviour stays as today; these rows let section 5 show each one.
 *
 * Input: `doc`, the XML as opened (readPsi116V2, before the transfer); `receipt`, the U2d receipt.
 * Output: rows [branch, node, node material before, branch material before, branch material after].
 */
const MATERIAL_FIELD = 'Branch/MaterialNumber';
const text = value => String(value?.v ?? '').trim();

export function materialFollowRows(doc, receipt) {
  return (receipt?.changes || []).filter(c => c.field === MATERIAL_FIELD).flatMap(c => {
    const pipeline = doc?.pipelines?.[c.ref?.branchOrdinal];
    if (!pipeline) return [];
    const before = String(c.before ?? '').trim(), after = String(c.after ?? '').trim();
    return pipeline.components
      .filter(comp => text(comp.values?.MaterialCode) && ![before, after].includes(text(comp.values.MaterialCode)))
      .map(comp => [c.ref?.branchName ?? text(pipeline.values?.Branchname), text(comp.values?.NodeNumber), text(comp.values.MaterialCode), before, after]);
  });
}
