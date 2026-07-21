export const GRE_PLACEHOLDER_SCHEMA = 'PipelineGreFittingPlaceholder.v1';

function product(left, right) {
  return left && right ? left * right : null;
}

export function resolveGreFittingPlaceholder(settings = {}) {
  const active = settings.designBasis === 'gre';
  const nominalBoreMm = settings.greNominalBoreMm || null;
  const bendBreakMultiplierBore = settings.greBendBreakMultiplierBore || 1.5;
  return Object.freeze({
    schema: GRE_PLACEHOLDER_SCHEMA,
    active,
    policyReady: false,
    resolverReady: false,
    geometryApplied: false,
    inputXmlApplied: false,
    requirementReference: settings.greRequirementReference || '',
    bend: Object.freeze({
      radiusBasis: 'GRE_PLACEHOLDER',
      radiusMm: settings.greBendRadiusMm || null,
      breakLengthBasis: 'NOMINAL_BORE',
      nominalBoreMm,
      breakMultiplierBore: bendBreakMultiplierBore,
      breakLengthMm: product(nominalBoreMm, bendBreakMultiplierBore),
      localThicknessMm: settings.greBendLocalThicknessMm || null,
      resolverReady: false,
    }),
    tee: Object.freeze({
      breakLengthBasis: 'CUSTOM_LENGTH',
      breakLengthMm: settings.greTeeBreakLengthMm || null,
      localThicknessMm: settings.greTeeLocalThicknessMm || null,
      resolverReady: false,
    }),
  });
}
