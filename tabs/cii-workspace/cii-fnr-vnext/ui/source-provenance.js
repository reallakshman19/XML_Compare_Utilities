/* Read-only SOURCE CII projection. No topology guesses or write authority. */
export function sourceBranchLabels(parsedSource) {
  if (!parsedSource?.elements) return [];
  return [...new Set(parsedSource.elements.map(e => e.branch).filter(b => typeof b === 'string' && b.startsWith('/')))]
    .sort((a, b) => a.localeCompare(b));
}

// Only same physical ordinal AND exact endpoints establish alignment between
// TARGET0 claim ownership and a SOURCE element. Differing layouts are unresolved.
export function sourceEvidenceForClaim(parsedTarget, parsedSource, claim) {
  if (!parsedSource?.elements || !parsedTarget?.fields || claim?.section !== 'NODENAME') return null;
  const field = parsedTarget.fields.find(f => f.byteStart === claim.byteStart &&
    f.byteEnd === claim.byteEnd && f.fieldIdentity === claim.fieldIdentity);
  if (!field || field.owners.length !== 1 || field.shared || field.orphan) return null;
  const targetElement = parsedTarget.elements.find(e => e.witness === field.owners[0]);
  if (!targetElement) return null;
  const sourceElement = parsedSource.elements[targetElement.index];
  if (!sourceElement || sourceElement.index !== targetElement.index ||
      sourceElement.from !== targetElement.from || sourceElement.to !== targetElement.to) return null;
  return { branch: sourceElement.branch || '(unlabeled)',
    from: String(sourceElement.from), to: String(sourceElement.to) };
}
