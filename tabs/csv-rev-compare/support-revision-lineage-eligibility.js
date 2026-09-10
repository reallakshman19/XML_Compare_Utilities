const clean = (value) => String(value ?? '').trim();

/**
 * A Civil + PIPE pair is the logical support-location identity, but identity
 * text alone is not sufficient evidence that a row represents an active
 * support location. Empty retained rows remain in the source/model/output and
 * are excluded only from automatic lineage matching.
 */
export function classifySupportLocationEvidence(location) {
  const components = location?.components || [];
  const hasComponentEvidence = components.some((component) =>
    clean(component?.reference) || clean(component?.memberId) || clean(component?.supportType));
  const hasCoordinateEvidence = ['x', 'y', 'z'].some((axis) =>
    clean(location?.position?.[axis]?.raw) || Number.isFinite(location?.position?.[axis]?.directedMm));
  const hasLoadEvidence = (location?.loads?.slots || []).some((slot) => clean(slot?.raw));
  const hasSupportCountEvidence = clean(location?.sourceFields?.totalSupportPoints);
  const hasDescriptionEvidence = clean(location?.sourceFields?.primarySupportDescription);
  const activeEvidence = Object.freeze({
    hasComponentEvidence,
    hasCoordinateEvidence,
    hasLoadEvidence,
    hasSupportCountEvidence: Boolean(hasSupportCountEvidence),
    hasDescriptionEvidence: Boolean(hasDescriptionEvidence),
  });
  const eligible = Object.values(activeEvidence).some(Boolean);
  return Object.freeze({
    eligible,
    classification: eligible ? 'ACTIVE_ENGINEERING_LOCATION' : 'IDENTITY_ONLY_SHELL',
    reasonCode: eligible ? 'ENGINEERING_PAYLOAD_PRESENT' : 'IDENTITY_WITHOUT_ENGINEERING_PAYLOAD',
    evidence: activeEvidence,
  });
}

export function buildLineageEligibleModel(model) {
  const ignored = [];
  const locations = [];
  for (const location of model?.locations || []) {
    const assessment = classifySupportLocationEvidence(location);
    if (assessment.eligible) locations.push(location);
    else ignored.push(Object.freeze({
      nodeId: location.nodeId,
      sourceRowId: location.sourceRowId,
      supportLocationIdentity: location.supportLocationIdentity,
      ...assessment,
    }));
  }
  return Object.freeze({
    model: Object.freeze({ ...model, locations: Object.freeze(locations) }),
    ignored: Object.freeze(ignored),
  });
}

export function attachLineageEligibility(lineage, sourceEligibility, targetEligibility) {
  return Object.freeze({
    ...lineage,
    comparisonEligibility: Object.freeze({
      policy: 'Identity-only rows remain auditable/output-visible but cannot consume automatic active-support lineage.',
      ignoredSourceLocations: sourceEligibility.ignored,
      ignoredTargetLocations: targetEligibility.ignored,
    }),
  });
}
