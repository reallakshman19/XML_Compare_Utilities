# SSRB Architecture Inventory 0001

BASIS_HEAD: c7d4afa4c2bab4528c6d499e9ceabe058e376348
WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1216
PROGRAM: github:reallaksh19/XML_Compare_Utilities#1215
STATUS: READ_ONLY_BASELINE

## 1. Production ingress

Current top-level producer accepts:

```text
input.combinedInput ?? input.stagedInput
  -> supportInput = combinedInput
  -> steelInput = combinedInput
```

`support-steel-evidence-bundle.js` therefore reconstructs support and steel evidence from the same combined hierarchy and reports `inputMode: COMBINED_STAGED_MODEL` whenever the combined input is supplied.

Compatibility-only separate `supportInput` / `steelInput` remains in the API. It must not redefine the public production workflow.

Current demo source is `SUPPORT_STEEL_SAMPLE_COMBINED` in `support-steel-relationship-samples.js`. It includes:

- carrier branch `/ASIM-1836-6"-P9001001/B1`;
- `/PS-14259/DATUM`, `/PS-14259.1`, `/PS-14259.2`;
- `/PS-14259/DATUM` explicit `STRUCTURE_REF=/SL-4201`;
- structural group `/SL-4201` with `/SL-4201/BEAM-01`;
- unresolved-like second family `/PS-14260` and non-analytical `/SL-4202` control context.

This is a production-shaped demo, not yet a frozen real acceptance fixture.

## 2. Canonical bundle orchestration

Current `buildSupportSteelRelationshipBundle()` orchestration:

```text
combined staged hierarchy
  -> core Support/Steel relationship bundle
  -> physical carrier resolution
  -> analytical carrier attachment
  -> carrier topology catalog
  -> carrier topology engine
  -> carrier-to-structure path bundle
  -> one enriched SupportSteelRelationshipBundle.v1
```

Top-level public schema:

```text
SupportSteelRelationshipBundle.v1
```

Top-level evidence source:

```text
STAGED_JSON_RELATIONSHIP_ENGINE
```

Known subordinate schema fields emitted by the top-level bundle:

```text
geometryEngineSchema
memberChainEngineSchema
carrierResolutionSchema
carrierCatalogSchema
carrierAttachmentSchema
carrierGeometrySchema = SupportCarrierAnalyticalGeometry.v1
carrierTopologyCatalogSchema
carrierTopologySchema
carrierToStructurePathSchema = SupportCarrierToStructurePathBundle.v1
```

LEG-001 must enumerate the exact current schema value for every field and classify it PUBLIC_API or INTERNAL_DETAIL. No schema rename is authorized by this baseline.

## 3. Relationship decision authority

Current family-to-steel selection order in `support-steel-relationship-engine.js`:

```text
1. explicit candidates
   - SAME_CANONICAL_ID
   - EXPLICIT_REFERENCE
2. spatial candidates
   - analytical geometry proximity preferred/required by default
3. unique shared-owner candidate
4. unresolved with nearest candidate retained diagnostically
```

Current statuses:

```text
RESOLVED_EXPLICIT
RESOLVED_SPATIAL
RESOLVED_SHARED_OWNER
AMBIGUOUS
UNRESOLVED
```

Current defaults:

```text
projectionToleranceMm = 25
ambiguityDeltaMm = 2
requireAnalyticalGeometryForSpatialResolution = true
memberContactToleranceMm = 2
memberCandidateToleranceMm = 25
```

Important fail-closed behavior already present:

- multiple explicit candidates => AMBIGUOUS, not first-hit;
- spatial top two within `ambiguityDeltaMm` => AMBIGUOUS;
- representative-point-only proximity does not resolve spatially when analytical geometry is required;
- unresolved rows may retain nearest steel/distance as diagnostic evidence without promoting it to a relationship.

No current recovery task authorizes changing these thresholds or precedence rules merely to improve benchmark agreement.

## 4. Carrier-to-structure completeness

`SupportCarrierToStructurePathBundle.v1` consumes five distinct evidence layers:

```text
carrier identity
analytical carrier attachment
connected carrier topology
support-member chain OR governed attachment-member-is-terminal exception
analytical structural terminal
```

Current positive synthetic contract in `tests/support-carrier-to-structure-path.test.js` uses:

```text
IDENTITY-1
ATTACH-1
TOPOLOGY-1 / TOPOLOGY-EDGE-1
CHAIN-1
TERMINAL-1
```

Expected positive state:

```text
pathStatus = COMPLETE_CARRIER_TO_STRUCTURE_PATH
contactEvidenceStatus = ANALYTICAL_PATH_CANDIDATE
completePathCount = 1
completeFamilyCount = 1
```

Current negative contracts include:

```text
missing analytical attachment
  -> CARRIER_ATTACHMENT_NOT_PROVEN

clearance-only nearby attachment
  -> CARRIER_ATTACHMENT_CLEARANCE_ONLY

topology REVIEW_REQUIRED
  -> CARRIER_TOPOLOGY_PATH_REVIEW_REQUIRED

no route from attachment member to a different terminal member
  -> SUPPORT_CHAIN_TO_STRUCTURE_INCOMPLETE

CLEARANCE_ONLY structural terminal
  -> STRUCTURAL_TERMINAL_MISSING
```

The explicit attachment-member-is-structural-terminal exception remains governed and does not authorize skipping a required chain when the terminal belongs to another member.

## 5. Independent sample geometry check

From `SUPPORT_STEEL_SAMPLE_COMBINED`:

```text
/PS-14259.1 Z bounds: 2106 .. 2256 mm
/PS-14259.2 Z bounds: 2100 .. 2106 mm
/SL-4201/BEAM-01 Z bounds: 2000 .. 2100 mm
```

Hand interval separation:

```text
PS-14259.1 to beam = 2106 - 2100 = 6 mm
PS-14259.2 to beam = 2100 - 2100 = 0 mm
```

Against current defaults:

```text
contact <= 2 mm
nearby candidate <= 25 mm
```

Therefore, assuming X/Y overlap and the current bounds-based analytical primitive:

- `.2` is a contact-qualified geometric case;
- `.1` is not contact-qualified at 6 mm, but can remain a nearby candidate at 25 mm.

This arithmetic is an independent falsifier for future member-contact classification changes.

## 6. Downstream ownership seam

Current PS/SL graph-native audit declares:

```text
PS_FAMILY_EVIDENCE_MODE = RELATIONSHIP_BUNDLE
PS_FAMILY_EVIDENCE_SOURCE_SCHEMA = SupportSteelRelationshipBundle.v1
```

This is the intended consumer boundary. #1217 may audit/projection-transform this evidence but must not recreate the Support/Steel relationship selector.

Support Report under #1154 also consumes Support/Steel enrichment evidence. Its missing exact PS-007/SL-097 combined staged source remains an input-custody blocker, not permission to synthesize native values from the expected workbook.

## 7. Runtime/release coupling

Current Support/Steel bootstrap still contains hand-maintained query-string module identities, including an old `20260717-startup-parse-hotfix-1` token on the main tab/restraint imports while later Support Report imports use newer tokens.

This is a parent #1215 runtime/module-graph risk. #1216 must not solve it by adding more manual version tokens.

Current `main` deploy run `34674343442`:

```text
Verify Pages graph         PASS
Prepare Pages artifact     PASS
Upload Pages artifact      FAIL
Deploy                     SKIPPED
```

Last known successful Pages run inspected:

```text
34381085579
SHA 091d41d4daba80fd085eaf59cf448642daf22a32
```

Current main:

```text
c7d4afa4c2bab4528c6d499e9ceabe058e376348
```

Therefore deployed browser qualification for #1216 is currently BLOCKED by the parent release plane.

## 8. LEG-001 boundary

Authorized next material boundary is architecture/input determinism, not relationship-behavior tuning:

1. freeze one durable production-shaped combined-input acceptance fixture or manifest with provenance/hash;
2. enumerate every emitted schema and classify public vs internal;
3. create the source->candidate->gate->result->provenance matrix for each relationship/path class;
4. add/execute determinism and fail-closed tests on exact candidate SHA;
5. preserve all current relationship thresholds and semantics unless independent evidence exposes a specific defect.

NO-PATCH boundary:

- no expected workbook values as staged-model input;
- no clash XML or clash-imprinted geometry promoted to production authority;
- no tolerance widening to make a benchmark green;
- no Support Report field fixes inside Support/Steel;
- no PS/SL consumer-engine duplication;
- no deployment workflow change inside this child without explicit parent #1215 assignment.