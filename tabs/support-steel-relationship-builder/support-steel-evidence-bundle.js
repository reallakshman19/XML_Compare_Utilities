import { buildSupportCarrierResolutionBundle } from './support-carrier-resolution.js';
import { buildSupportSteelRelationshipBundle as buildCoreRelationshipBundle } from './support-steel-relationship-engine.js';

export function buildSupportSteelRelationshipBundle(input = {}) {
  const coreBundle = buildCoreRelationshipBundle(input);
  const carrierResolution = buildSupportCarrierResolutionBundle({
    supportInput: input.supportInput,
    supportFamilies: coreBundle.supportFamilies,
  });
  return {
    ...coreBundle,
    carrierResolutionSchema: carrierResolution.schema,
    carrierCatalogSchema: carrierResolution.catalogSchema,
    bundlePurpose: 'RELATIONSHIP_MEMBER_CONNECTIVITY_AND_CARRIER_CONTEXT_INFERENCE',
    authoritativeCarrierObjectResolutionAvailable: carrierResolution.summary.carrierObjectCount > 0,
    supportFamilies: carrierResolution.supportFamilies,
    supportCarrierResolution: {
      ...carrierResolution,
      supportFamilies: undefined,
    },
    summary: {
      ...coreBundle.summary,
      carrierObjectCount: carrierResolution.summary.carrierObjectCount,
      resolvedPhysicalCarrierCount: carrierResolution.summary.resolvedPhysicalCarrierCount,
      branchContextOnlyCount: carrierResolution.summary.branchContextOnlyCount,
      ambiguousCarrierCount: carrierResolution.summary.ambiguousCarrierCount,
      unresolvedCarrierCount: carrierResolution.summary.unresolvedCarrierCount,
    },
    diagnostics: [
      ...(coreBundle.diagnostics || []),
      ...(carrierResolution.diagnostics || []),
    ],
  };
}
