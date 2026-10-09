# SSRB Consumer / Validation Authority Audit 0002

Chain: `SUPPORT-STEEL-1216`  
Issue: #1216  
Program: #1215  
Audit basis main: `c7d4afa4c2bab4528c6d499e9ceabe058e376348`  
Observed PR #1219 head before this relay-only audit: `06200fa7734be0bd0dcf94af474d41248a70c1ca`  
Observation class: source inspection only  
Engineering benchmark status: **NOT_RUN unless explicitly stated otherwise**

## Purpose

Close the remaining downstream-authority inventory without changing production behavior. This audit answers two architecture questions:

1. Does Support Report rebuild Support/Steel engineering relationships, geometry, topology, member-chain or carrier-to-structure paths in parallel?
2. Can the historical PS-14396 clash conversion/control enter production authority?

The answer to both is **no on the inspected source basis**, with one provenance-semantics follow-up documented below.

## Support Report consumer boundary

### Canonical producer reuse

`tabs/support-steel-relationship-builder/support-report-addon.js` imports and calls:

```text
buildSupportSteelRelationshipBundle
  <- tabs/support-steel-relationship-builder/support-steel-evidence-bundle.js
```

When staged JSON is present, the Support Report UI:

```text
parseSupportSteelJson(combined staged model)
 -> buildSupportSteelRelationshipBundle({ combinedInput, config })
 -> buildSupportReportBundle({ clashEvidence, relationshipBundle })
```

Therefore Support Report does not own a second Support/Steel relationship engine. The engineering producer remains the canonical Support/Steel bundle builder.

### Allowed Support Report responsibilities

`support-report-engine.js`, `support-report-row-enrichment.js`, `support-report-json-trace.js`, and `support-report-field-projection.js` perform report-specific projection responsibilities over the canonical bundle and Navisworks report evidence:

- family lookup against `relationshipBundle.supportFamilies`;
- report-row member attribution by line/branch/direct clash identity;
- observed-member reconciliation including PREV-NAME aliases;
- selection of carrier records from `relationshipBundle.supportCarrierResolution.carrierObjects`;
- projection of native member/carrier attributes into report fields;
- Navisworks clash location as report-coordinate authority;
- JSON Trace/provenance and fail-visible conflict handling.

These modules do **not** construct support-to-steel relationship candidates, analytical structural geometry, carrier attachment, carrier topology, support-member chains, structural terminals, or complete carrier-to-structure paths.

### Carrier fallback invariant

The report row consumer has a deliberate two-tier distinction:

1. If selected native members carry an authoritative physical `carrierResolution.carrierObjectId`, `selectCarriersForGroup()` filters strictly to those IDs.
2. Only when no resolved member carrier exists may report projection select carrier-catalog records by exact line and then branch-only context.

Current regression source explicitly protects:

- branch fallback cannot override contradictory explicit full-line custody;
- resolved member carrier authority outranks same-line catalog order;
- a missing resolved carrier is not replaced by a convenient line fallback;
- conflicting equally authoritative carrier attributes blank the affected field and remain visible.

This is report metadata attribution over the producer's carrier catalog, not a new physical carrier-resolution engine.

## Provenance-semantics follow-up

`support-report-field-projection.js` labels selected carrier metadata as:

```text
AUTHORITATIVE_CARRIER_ATTRIBUTE
```

That source class describes the authority of the attribute on the selected carrier record. It must **not** be interpreted as proof that carrier identity itself was resolved by an authoritative member-to-carrier edge.

The report evidence already preserves the distinction:

```text
resolvedCarrierObjectIds  # authoritative member-resolution evidence
carrierObjectIds          # carrier records used for field projection
```

A fallback-selected carrier may therefore contribute an authoritative source attribute while `resolvedCarrierObjectIds` remains empty.

Classification: **semantic provenance ambiguity / documentation risk, not producer duplication**. Any future tightening of the source-class name or export semantics belongs to the Support Report product boundary (#1154) or a shared provenance-schema change; it is not a justified #1216 producer behavior patch from this audit alone.

## PS/SL Evidence Audit boundary

The graph-native PS/SL Evidence Audit declares:

```text
PS_FAMILY_EVIDENCE_MODE = RELATIONSHIP_BUNDLE
PS_FAMILY_EVIDENCE_SOURCE_SCHEMA = SupportSteelRelationshipBundle.v1
```

This preserves #1216 as producer authority. #1217 may audit/project the evidence but must not introduce a parallel Support/Steel relationship engine.

## Historical PS-14396 validation boundary

`ps-family-default-clash-json-converter.js` exposes two explicit validation conversion modes:

```text
STRICT_RELATIONSHIP_PRESERVING
CLASH_IMPRINTED_GEOMETRY_CONTROL
```

Converted models are labeled:

```text
validationOnly: true
productionDependency: false
```

The strict mode preserves identities, hierarchy, line context, clash points and explicit references while explicitly refusing to invent absent solids, axes or extents.

The clash-imprinted control states that its geometry is derived from the same clash graph and is circular validation evidence that must never be used in production.

`ps-family-default-clash-benchmark.js` preserves the same boundary and reports gaps instead of auto-correcting the native producer to the clash reference. Its diagnostics include missing authoritative carrier geometry, incomplete carrier-to-structure benchmarkability and circular-control warnings.

No inspected production Support/Steel ingress imports `convertPsFamilyClashXmlToCombinedModel`; its inspected usages remain inside PS-family validation/benchmark surfaces.

## Authority classification after audit

| Item | Classification | Execution status |
|---|---|---|
| Support Report consumer | canonical producer reused; report-only row/member/carrier projection | SOURCE_INSPECTED |
| PS/SL Evidence Audit consumer | `RELATIONSHIP_BUNDLE` / `SupportSteelRelationshipBundle.v1` consumer | SOURCE_INSPECTED |
| Historical PS-14396 clash input | validation-only reference | SOURCE_INSPECTED |
| Strict clash conversion | validation-only relationship-preserving adapter | SOURCE_INSPECTED |
| Clash-imprinted geometry | circular validation control; production-prohibited | SOURCE_INSPECTED |
| BM-005 historical benchmark | no current PR-head execution | NOT_RUN |
| BM-006 containment benchmark | no current PR-head execution | NOT_RUN |

## Executable qualification constraint

PR #1219 currently has no matching pull-request check run that executes the new Support/Steel producer contract. The existing Support Report Typicality workflow is path-filtered to `support-report-*` surfaces and does not cover `tests/support-steel-authority-contract.test.js`.

Repository policy prohibits workflow mutation unless explicitly authorized. Therefore this audit does not create or modify a workflow merely to manufacture a check surface.

Result:

```text
producer contract execution = NOT_RUN
behavior mutation = BLOCKED
workflow mutation = NOT_AUTHORIZED
read-only architecture/provenance audit = COMPLETE
```

## Disposition

- `TASK-004 downstream consumer boundary`: **COMPLETE_CONSUMER_BOUNDARY_WITH_PROVENANCE_FOLLOWUP**.
- INPUT-003/004/005 authority inventory: **DURABLY_CLASSIFIED**.
- BM-005/BM-006 remain **NOT_RUN**; source inspection is not promoted to benchmark PASS.
- No tolerance, relationship rule, Support Report field behavior, PS/SL audit behavior, workflow, oracle or deployment configuration changed.
- Exact next engineering gate remains executable qualification of the #1219 producer contract before any producer behavior mutation.
