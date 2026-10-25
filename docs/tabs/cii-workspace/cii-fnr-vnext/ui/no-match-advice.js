/* Read-only planner advice. Never changes TARGET0, the rules, or writer authority. */
export function noMatchAssessment(plan, rules, sourceParsed = null) {
  if (!plan || !Array.isArray(rules)) return null;
  const zero = (plan.diagnostics || []).filter(d => d.severity === 'INFO' && d.code === 'ZERO_MATCHES');
  if (!zero.length) return null;
  const distinctFind = new Map();
  for (const rule of rules) {
    if (!rule.find) continue;
    if (!distinctFind.has(rule.find)) distinctFind.set(rule.find, new Set());
    distinctFind.get(rule.find).add(String(rule.replace ?? ''));
  }
  const ambiguous = [...distinctFind].filter(([, replacements]) => replacements.size > 1);
  const sourceFields = sourceParsed?.fields || null;
  const sourceNames = sourceFields?.map(f => f.before.trim()) || [];
  const sourceMatchedLabels = sourceFields
    ? [...distinctFind.keys()].filter(find => rules.some(rule => rule.find === find &&
        rule.mode === 'LITERAL') && sourceNames.some(name => name.includes(find)))
    : null;
  const total = rules.length;
  const zeroCount = zero.length;
  const completelyUnmatched = plan.claims.length === 0 &&
    zeroCount === total && !(plan.diagnostics || []).some(d => d.severity === 'ERROR');
  let advice;
  if (completelyUnmatched) {
    advice = `0 TARGET0 proposals: all ${total} Find rule(s) have zero matches. Check that the CSV describes names in TARGET0, not a different CII; SOURCE CII is reference-only.`;
  } else if (plan.claims.length === 0) {
    advice = `0 proposals. ${zeroCount} of ${total} Find rule(s) have no TARGET0 match; review other diagnostics before any edit.`;
  } else {
    advice = `${zeroCount} of ${total} Find rule(s) have no TARGET0 match; only the actual proposals may be reviewed.`;
  }
  if (sourceMatchedLabels !== null) {
    advice += ` ${sourceMatchedLabels.length} distinct literal Find value(s) also appear in SOURCE CII; they are not automatically eligible for editing TARGET0.`;
  }
  if (ambiguous.length) {
    advice += ` ${ambiguous.length} repeated Find label(s) have different replacements` +
      ` (e.g. ${ambiguous[0][0]}): explicit occurrence/branch identity is required, not broad Document scope.`;
  }
  return { advice, zeroCount, total, zeroRuleIds: zero.map(d => d.ruleId),
    ambiguousFindCount: ambiguous.length, sourceMatchedLabelCount: sourceMatchedLabels?.length ?? null,
    completelyUnmatched };
}
