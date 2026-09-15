CHAIN_STATE_VERSION: 3
HANDOVER_PROTOCOL_VERSION: 2
CHAIN_ID: SUPPORT-PRIMARY-1222
ENDPOINT_ID: EP-SUPPORT-PRIMARY-1222-0014
PREVIOUS_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0013
WORK_ITEM_KEY: github:reallaksh19/XML_Compare_Utilities#1222
RELATED_TYPICALITY_ISSUE: github:reallaksh19/XML_Compare_Utilities#1179
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: fed57820909f4984a97d67437340df952b73a5ab
ISSUE_BASIS_ID: IB-SUPPORT-PRIMARY-1222-0001
MAIN_OBSERVED: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581
BRANCH: feature/support-primary-assembly-graph
PR: 1223
MATERIAL_LEG: LEG-008
MATERIAL_BASE: fefa4d24ac2bd3254252a38d516abbb6e389153b
ENGINEERING_STATE: ACTIVE
CUSTODY_STATE: HELD
WRITE_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
QUALIFICATION_SCOPE_ID: QSCOPE-SUPPORT-PRIMARY-1222-ASSEMBLY-SEAM
QUESTION_SET_ID: QS-SUPPORT-PRIMARY-1222-0001
QUESTION_SET_STATUS: CURRENT

# LEG-008 prework — Axis Typicality V1

Owner progression command: `proceed next`.

This leg adds a **third independent family-level typicality evidence channel** named `AXIS_TYPICALITY_V1`. It must reuse the canonical Support Report pipe-axis primitive but compare only intrinsic, translation/rotation/reflection-safe descriptors. The existing structural matcher and `RELATIONSHIP_TOPOLOGY_V1` remain read-only decision channels.

## Core invariants

- NEVER compare raw global axis vectors between XMLs.
- NEVER require the two models to share global orientation or origin.
- Reuse production-named geometry helpers from `support-report-location-grouping.js`; do not duplicate PCA/power-iteration math.
- Axis ambiguity or insufficient evidence is `UNAVAILABLE`, not `NO_MATCH`.
- Axis evidence alone must not promote an existing structural `NO_MATCH`/`AMBIGUOUS` into a Column 22 match in this leg.
- No mutation of first-pass support grouping, orphan recovery, count policy, #1216 producer authority, or structural typicality scoring/gates.

## Intended intrinsic family signature

For each PS/SL family, derive per-location/traversal descriptors using current logical support groups and report rows:

1. **Trusted local traversal axis evidence**
   - bucket raw/evidence points by normalized pipe + branch/traversal identity;
   - reuse `buildSupportReportTraversalGeometryIndex()` / canonical principal-axis confidence;
   - only trusted axes contribute orientation-sensitive descriptors.

2. **DN-normalized along/lateral spacing fingerprint**
   - for pairs of support locations on a trusted common traversal, decompose delta against the local axis:
     - `A = |D dot T|`
     - `L = |D - (D dot T)T|`
   - normalize by nominal bore where available: `A/Bore`, `L/Bore`;
   - store sorted, directionless pair descriptors.

3. **Relative axis-angle spectrum**
   - for trusted traversal axes within a family, compare axes only to each other inside the same model;
   - use unsigned angle `acos(|T1 dot T2|)` so axis sign and model reflection do not matter;
   - store sorted angle spectrum, never raw vectors.

4. **Traversal / return topology**
   - counts/spectra of locations per traversal;
   - branch/traversal cardinality;
   - repeated normalized pipe-class traversal population where available;
   - retain return/revisit ambiguity as explicit evidence, not an automatic merge.

5. **Availability metadata**
   - trusted-axis count;
   - unavailable-axis count;
   - DN-normalized pair count;
   - source location count and source traversal count.

## Decision contract

Matcher/channel schema target: `SupportReportAxisTypicalityAudit.v1`; profile ID `AXIS_TYPICALITY_V1`.

Result enum: `MATCH | NO_MATCH | REVIEW | UNAVAILABLE`.

Initial conservative rules:
- insufficient trusted axis/pair evidence on either side -> `UNAVAILABLE`;
- materially incomplete family evidence -> `REVIEW` if enough informed evidence exists but required descriptors are missing;
- exact traversal-cardinality/location-per-traversal descriptors plus intrinsic spectra within governed tolerances -> `MATCH`;
- informed hard descriptor mismatch -> `NO_MATCH`.

Thresholds must be named/versioned, not inline. Initial values may be provisional and must be surfaced in the audit.

## Consensus integration boundary

Extend `TypicalityConsensusV1` above all channels while retaining each original result independently.

Conservative policy:
- structural candidate + relationship same candidate + axis same candidate -> strongest confidence;
- structural candidate + relationship unavailable + axis same candidate -> higher confidence than structural-only;
- structural candidate + axis `UNAVAILABLE` -> retain current consensus result;
- structural candidate + informed axis contradiction -> `REVIEW / CONFLICT`;
- relationship/axis-only candidate must not promote a structural rejection in LEG-008.

Column 23 may expose a concise human-readable reason for axis conflict/unavailability, while machine audit fields remain authoritative.

## Allowed production paths

- new `tabs/support-steel-relationship-builder/support-report-axis-typicality.js`;
- `support-report-typicality-projection.js` for attaching axis audit + consensus only;
- `support-report-addon.js` / bootstrap only for cache routing if required;
- focused tests;
- chain/workreport/Issue/PR control-plane files.

Read-only reference paths:
- `support-report-typicality.js`;
- `support-report-relationship-typicality.js` except import/reference behavior only if absolutely required;
- `support-report-location-grouping.js` canonical geometry implementation;
- `support-report-typicality-location.js` existing assignment engine;
- support primary grouping/count/orphan modules.

## Hard prohibitions

- no raw global axis-vector equality or dot-product comparison across the two XMLs;
- no structural matcher retuning;
- no first-pass grouping/orphan/count mutation;
- no relationship-topology decision-policy mutation;
- no #1216 producer mutation;
- no workflow mutation;
- no merge.

## Required focused controls

1. same intrinsic geometry under translation + arbitrary 3D rotation -> axis `MATCH`;
2. axis sign reversal / reflected coordinate orientation -> still `MATCH`;
3. same location count but materially different DN-normalized axial/lateral spacing -> `NO_MATCH`;
4. same spacing but different relative traversal-angle spectrum -> `NO_MATCH`;
5. insufficient/low-confidence axis evidence on either side -> `UNAVAILABLE`, not mismatch;
6. traversal/return topology mismatch -> informed `NO_MATCH` or `REVIEW` according to availability;
7. structural matcher output remains byte-for-byte reproducible when axis channel is attached;
8. existing relationship matcher output remains reproducible when axis channel is attached;
9. structural candidate + axis contradiction -> fail-visible `REVIEW / CONFLICT`;
10. axis-only candidate cannot promote structural rejection.

Repository/browser/real benchmark execution remains NOT_RUN unless actual runner steps execute. No merge.