# Support / Steel Relationship Builder — Authority Contract

Basis: `c7d4afa4c2bab4528c6d499e9ceabe058e376348`  
Recovery program: #1215  
Work package: #1216 (`WP-SSRB-P0`)

This document freezes the current authority seams before recovery work changes any relationship behavior. It is not permission to change engineering tolerances, source authority, or downstream ownership.

## 1. Production authority chain

```text
one combined staged-model hierarchy
  |
  +-> support family/member + line/carrier context
  +-> structural group/member geometry
  +-> carrier objects and analytical geometry
  |
  v
SupportSteelRelationshipBundle.v1
  |
  +-> family -> steel relationship evidence
  +-> support-member connectivity
  +-> carrier identity resolution
  +-> analytical carrier attachment
  +-> carrier topology
  +-> complete/incomplete carrier-to-structure path evidence
  |
  +-> PS / SL Family Evidence Audit (consumer)
  +-> Support Report enrichment (consumer)
```

The combined staged model is production-native evidence. Historical clash XML is validation/backward-compatibility evidence only. Expected report/workbook output is an oracle and must never be fed back as native staged input.

## 2. Canonical schemas

### Stable producer seams

| Contract | Schema | Role |
|---|---|---|
| Relationship aggregate | `SupportSteelRelationshipBundle.v1` | Primary producer/consumer seam |
| Carrier-to-structure path | `SupportCarrierToStructurePathBundle.v1` | Complete/incomplete path classification seam |

### Versioned subordinate evidence exposed by the aggregate

| Aggregate field / owner | Current schema | Classification |
|---|---|---|
| `geometryEngineSchema` | `SupportSteelAnalyticalGeometry.v1` | EXPOSED_INTERNAL_CONTRACT |
| `memberChainEngineSchema` | `SupportMemberChainBundle.v1` | EXPOSED_INTERNAL_CONTRACT |
| member-chain `geometrySchema` | `SupportMemberAnalyticalGeometry.v1` | EXPOSED_INTERNAL_CONTRACT |
| `carrierResolutionSchema` | `SupportCarrierResolution.v1` | EXPOSED_INTERNAL_CONTRACT |
| `carrierCatalogSchema` | `SupportCarrierCatalog.v1` | EXPOSED_INTERNAL_CONTRACT |
| `carrierAttachmentSchema` | `SupportCarrierAttachmentBundle.v1` | EXPOSED_INTERNAL_CONTRACT |
| `carrierGeometrySchema` | `SupportCarrierAnalyticalGeometry.v1` | EXPOSED_INTERNAL_CONTRACT |
| `carrierTopologyCatalogSchema` | `SupportCarrierTopologyCatalog.v1` | EXPOSED_INTERNAL_CONTRACT |
| `carrierTopologySchema` | `SupportCarrierTopologyBundle.v1` | EXPOSED_INTERNAL_CONTRACT |
| `carrierToStructurePathSchema` | `SupportCarrierToStructurePathBundle.v1` | STABLE_PRODUCER_SEAM |

A subordinate schema is versioned and auditable, but downstream applications should depend on the smallest stable top-level seam they require rather than importing producer internals to rebuild relationships.

## 3. Relationship resolution authority

Current strongest-evidence order is:

```text
1. SAME_CANONICAL_ID / EXPLICIT_REFERENCE
2. ANALYTICAL_GEOMETRY_PROXIMITY
3. unique SHARED_OWNER
4. UNRESOLVED, with nearest evidence retained diagnostically
```

Current statuses:

```text
RESOLVED_EXPLICIT
RESOLVED_SPATIAL
RESOLVED_SHARED_OWNER
AMBIGUOUS
UNRESOLVED
```

Current default policy values:

```text
projectionToleranceMm = 25
ambiguityDeltaMm = 2
requireAnalyticalGeometryForSpatialResolution = true
memberContactToleranceMm = 2
memberCandidateToleranceMm = 25
```

These values are governed producer policy. A failed benchmark does not authorize changing them. Any future change requires independent evidence showing the current producer policy is wrong, plus positive and deceptive-negative controls.

## 4. Fail-closed relationship rules

- More than one strongest explicit candidate is `AMBIGUOUS`; never select first-hit.
- Spatial candidates inside the configured ambiguity delta are `AMBIGUOUS`.
- Representative-point proximity is diagnostic-only by default; it cannot resolve a spatial relationship without analytical geometry while `requireAnalyticalGeometryForSpatialResolution=true`.
- `UNRESOLVED` may carry nearest steel/distance diagnostics without creating an engineering edge.
- Unique shared-owner resolution is explicitly low-confidence and cannot masquerade as explicit/native-reference evidence.

## 5. Complete carrier-to-structure path

A `COMPLETE_CARRIER_TO_STRUCTURE_PATH` requires independently governed evidence for:

```text
support/member -> authoritative carrier identity
carrier analytical attachment
connected carrier topology
support-member route to the terminal
analytical structural terminal
```

The only documented chain shortcut is when the attachment member itself is the qualified structural terminal. That exception does not permit skipping a missing member-chain route when the terminal belongs to a different member.

Current fail-visible exception classes include:

```text
CARRIER_ATTACHMENT_NOT_PROVEN
CARRIER_ATTACHMENT_CLEARANCE_ONLY
CARRIER_TOPOLOGY_PATH_REVIEW_REQUIRED
SUPPORT_CHAIN_TO_STRUCTURE_INCOMPLETE
STRUCTURAL_TERMINAL_MISSING
```

Nearby/clearance-only evidence, disconnected/review-required topology, and unproven structural terminals remain incomplete.

## 6. Independent PS-14259 geometry control

The frozen production-shaped fixture contains:

```text
/PS-14259.1 bounds Z = 2106..2256 mm
/PS-14259.2 bounds Z = 2100..2106 mm
/SL-4201/BEAM-01 bounds Z = 2000..2100 mm
```

Independent interval arithmetic gives:

```text
separation(.1, beam) = 6 mm
separation(.2, beam) = 0 mm
```

Against the current 2 mm contact / 25 mm nearby-candidate policy, `.2` is the contact-positive control while `.1` cannot be promoted to contact solely by vertical separation. X/Y analytical overlap and the actual governed geometry primitive still apply.

This arithmetic is a falsifier, not a new geometry engine.

## 7. Input custody classes

| Class | Example | Production authority |
|---|---|---|
| Owner/native combined staged model | future real acceptance fixture | YES |
| Production-shaped deterministic demo | frozen PS-14259 fixture | NO — architecture/regression qualification only |
| Historical clash benchmark | PS-14396 | NO — validation/comparison only |
| Clash-imprinted synthetic geometry | circular test control | NO — never acceptance truth |
| Expected workbook/report values | #1154 oracle | NO — output oracle only |

The #1154 PS-007/SL-097 exact combined staged input remains unresolved. No recovery work may synthesize it from the expected workbook.

## 8. Downstream ownership boundary

The graph-native PS/SL audit declares:

```text
PS_FAMILY_EVIDENCE_MODE = RELATIONSHIP_BUNDLE
PS_FAMILY_EVIDENCE_SOURCE_SCHEMA = SupportSteelRelationshipBundle.v1
```

Therefore downstream audit code may classify, summarize, compare and render evidence, but may not create a parallel family-to-steel/carrier relationship selector.

Support Report may enrich from this producer but does not own Support/Steel relationship policy. Report grouping, DATUM display fallback, typicality and XLSX projection must not leak back into producer identity/topology authority.

## 9. Runtime/release boundary

The producer's browser bootstrap still participates in the repository's hand-maintained `?v=` ESM URL topology. That is a parent #1215 release/runtime defect class. #1216 must not solve it by adding more cache-version strings.

Current main does not equal the last known successfully deployed Pages SHA. Deployed browser qualification therefore remains blocked until #1215 repairs/proves the release plane.

## 10. Recovery change policy

Allowed in the current #1216 architecture leg:

- durable input custody and hash manifests;
- explicit schema/public-API inventory;
- source -> candidate -> gate -> result -> provenance documentation;
- deterministic serialization/identity checks;
- positive and fail-closed regression tests;
- performance measurement without invented acceptance thresholds.

Not authorized without new evidence/Owner boundary:

- widening relationship/contact/ambiguity tolerances;
- using clash or expected output as production input;
- moving Support Report or PS/SL display policy into the producer;
- adding a second relationship resolver in a downstream utility;
- deployment workflow changes inside #1216;
- hand-maintained ESM cache-key propagation as a feature fix.
