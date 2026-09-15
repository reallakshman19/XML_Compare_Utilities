# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222
CHAIN: SUPPORT-PRIMARY-1222
BRANCH: feature/support-primary-assembly-graph
PR: 1223
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0006
LATEST_MATERIAL_LEG: LEG-003
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat location-count inference toward an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> concrete/symbolic members -> pipe/carrier evidence`.

Optional Clash-within-Supports XML supplies support-member connectivity only. It must not replace #1216 Support/Steel carrier/steel producer authority. Existing bore-axis grouping remains fallback evidence.

## Implemented through LEG-003

### LEG-001 — explicit assembly topology

- User-facing remark value is `Multiple primary support`; legacy exported constant remains an alias.
- `parseSupportMemberRelationshipXml()` reuses the existing PS/SL legacy parser owner but may retain SupportChain member-to-member edges when pipe context is unavailable.
- Existing `parseSupportChangeXml()` remains pipe-required for legacy audit callers.
- `SupportPrimaryRelationshipBundle.v1` / `SUPPORT_PRIMARY_REL_V1` builds deterministic family-scoped connected components and stable IDs such as `PSA::PS-11167::M-2+11`.
- Concrete numeric members are countable; `DATUM` / `STRUCTURAL_REFERENCE` are symbolic and non-countable.
- Cross-family edges fail visibly.
- Explicit connectivity does not use XYZ adjacency; coincident explicit components remain separate.

### LEG-002 — topology/location reconciliation

`SupportPrimaryReconciliation.v1` maps existing Support Report location groups against explicit topology without changing the bore-axis grouper.

States:
- `EXPLICIT_ASSEMBLY`: all observed concrete members map to one explicit assembly;
- `GEOMETRY_ONLY`: no explicit mapping; existing geometry stays fallback authority;
- `PARTIAL_EXPLICIT`: only part of observed concrete membership maps; automatic exact assignment withheld;
- `CONFLICT`: evidence spans multiple explicit assemblies; exact assignment withheld;
- `SYMBOLIC_ONLY`: non-countable DATUM/reference evidence.

Unsupported/unversioned relationship bundle shapes cannot acquire explicit-assignment authority.

### LEG-003 — Support Report count migration

Introduces `SupportPrimaryCountProjection.v1` and wires it before Support Report row projection.

Final family count policy:
1. No valid explicit relationship family -> preserve existing geometry-group count exactly.
2. Valid explicit family -> count every countable explicit assembly, including explicit assemblies not currently observed by a Support Report location group.
3. Each `GEOMETRY_ONLY` group contributes one fallback occurrence.
4. Multiple geometry groups resolving to one explicit assembly ID deduplicate.
5. DATUM/reference-only evidence contributes zero.
6. `PARTIAL_EXPLICIT` / `CONFLICT` activates an ambiguity floor; new total cannot fall below legacy geometry count.
7. Unsupported relationship schema has no count authority.
8. `Multiple primary support` is driven by final family count >1; legacy `multipleLocationsOnPipe` remains independent audit evidence.

Support Report engine now accepts optional `primaryRelationshipBundle` separately from existing staged Support/Steel `relationshipBundle` and emits:
- primary relationship schema/evidence mode;
- count projection schema;
- family count summaries;
- row-level assembly ID/status/basis/candidate/provisional IDs;
- family explicit assembly IDs, geometry fallback groups and ambiguity count;
- the same evidence in JSON Trace.

## Benchmark/oracle disposition

Owner-governed counts:

| Family | Expected | Current disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic 7->6 explicit-dedupe control committed; real relationship XML NOT_RUN |
| PS-11236 | 4 | synthetic unobserved `.4/.5 + DATUM` assembly control committed; real relationship XML NOT_RUN |
| PS-12060 | 1 | protected by no-explicit geometry fallback policy; real suite NOT_RUN |
| PS-12877 | 4 | synthetic four-group engine fallback control committed; real suite NOT_RUN |
| PS-12860 | 6 | protected by no-explicit geometry fallback policy; real suite NOT_RUN |
| PS-12120 | 14 | protected by no-explicit geometry fallback policy; real suite NOT_RUN |

Typicality `11168 <-> 14168` is untouched in these legs.

## Validation truth

PASS:
- Common engineering-pr-delivery-v2 grounding and custody ordering;
- live main/PR authority reconciliation before each material leg;
- LEG-001 isolated parser behavior;
- LEG-002 isolated reconciliation behavior including conflict/partial/DATUM/wrong-schema cases;
- LEG-003 isolated count-policy harness: legacy 1/4 preservation, explicit 7->6 dedupe, unobserved explicit component inclusion and ambiguity flooring;
- material diff inspections show no Support/Steel producer, grouping-tolerance, Column 22, workflow or zone-UI mutation.

NOT_RUN:
- committed repository topology/reconciliation/count tests under an executing repository runner;
- complete Support Report benchmark suite;
- real PS-11167/PS-11236 relationship qualification;
- browser/deployed qualification.

Infrastructure truth:
- GitHub Actions jobs continue to fail before checkout/test execution with `steps=null` / previously observed `runner_id=0`.
- These are infrastructure failures, not product-test results.

Input blocker:
- `benchmarks/1835.zip` contains only primary Support Report `1835.xml`.
- Real Owner 1835 Clash-within-Supports relationship XML is not pinned, therefore PS-11167=6 and PS-11236=4 are not claimed as real-input PASS.

## Current production files changed by the chain

- `tabs/ps-family-clash-audit/ps-family-psclash-xml-parser.js`
- `tabs/support-steel-relationship-builder/support-primary-relationship.js`
- `tabs/support-steel-relationship-builder/support-primary-reconciliation.js`
- `tabs/support-steel-relationship-builder/support-primary-counting.js`
- `tabs/support-steel-relationship-builder/support-report-location-grouping.js`
- `tabs/support-steel-relationship-builder/support-report-engine.js`
- `tabs/support-steel-relationship-builder/support-report-row-enrichment.js`

Focused tests:
- `tests/support-primary-relationship.test.mjs`
- `tests/support-primary-reconciliation.test.mjs`
- `tests/support-primary-counting.test.mjs`
- `tests/support-primary-count-engine.test.mjs`

## Authority / safety invariants

- Explicit support-member connectivity is not carrier/steel authority.
- #1216 remains canonical for Support/Steel production relationships.
- DATUM/reference nodes never inflate primary-support count.
- Geometry cannot merge two different explicit assembly IDs.
- Missing/ambiguous evidence remains visible.
- No global tolerance widening has been introduced.
- No Column 22 decision-authority mutation has occurred.
- Merge remains Owner-only.

## Known follow-up caveats

1. The Support Report UI does not yet let the user load/build/pass `primaryRelationshipBundle`; the current engine capability is not yet end-to-end accessible from the normal UI.
2. `totalSupportPointsOnSecondary` field-level provenance still reports the older clash-group source class; detailed row/JSON trace now carries the actual assembly count basis. Align field provenance before release.
3. Count deduplication does not collapse existing report rows that happen to resolve to one assembly. LEG-003 changes the family count, not row cardinality.
4. Browser import/query cache-bust propagation for the new engine dependency should be completed before release qualification.
5. Orphan resolver and zone scoping are not yet implemented.

## Recommended next bounded leg

WP-PSA-003:
- discover exact ancestor zone paths from loaded evidence;
- add two-column searchable multi-select for Primary/Piping-support zones and Secondary/Support zones;
- add optional Clash-within-Supports relationship XML input;
- parse/build `SupportPrimaryRelationshipBundle.v1` through the existing typed seams;
- pass it into Support Report as `primaryRelationshipBundle`;
- invalidate stale relationship/report state when zone/input selection changes;
- keep exact ancestor matching, not loose substring matching.

After that, implement the conservative orphan resolver as a separate bounded fallback leg. Relationship-aware Column 22 should remain later until the input -> relationship -> count path is auditable end-to-end.

## EXACT_NEXT_ACTION

Synchronize EP-SUPPORT-PRIMARY-1222-0006 across issue/ACTIVE/CURRENT/PR. Stop there. On the next Owner `proceed`, prework WP-PSA-003 before any UI/product mutation. Do not merge.