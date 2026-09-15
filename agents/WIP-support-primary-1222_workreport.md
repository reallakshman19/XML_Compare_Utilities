# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222
CHAIN: SUPPORT-PRIMARY-1222
BRANCH: feature/support-primary-assembly-graph
PR: 1223
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0008
LATEST_MATERIAL_LEG: LEG-004
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat location-count inference toward an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> concrete/symbolic members -> pipe/carrier evidence`.

Optional Clash-within-Supports XML supplies support-member connectivity only. It must not replace #1216 Support/Steel carrier/steel producer authority. Existing bore-axis grouping remains fallback evidence.

## Implemented through LEG-004

### LEG-001 — explicit assembly topology

- User-facing remark value is `Multiple primary support`; legacy exported constant remains an alias.
- `parseSupportMemberRelationshipXml()` reuses the existing PS/SL legacy parser owner and may retain SupportChain member-to-member edges without pipe context.
- Existing `parseSupportChangeXml()` remains pipe-required for legacy audit callers.
- `SupportPrimaryRelationshipBundle.v1` / `SUPPORT_PRIMARY_REL_V1` builds deterministic family-scoped connected components and stable IDs such as `PSA::PS-11167::M-2+11`.
- Concrete numeric members are countable; `DATUM` / `STRUCTURAL_REFERENCE` are symbolic and non-countable.
- Cross-family edges fail visibly; explicit connectivity never uses XYZ adjacency.

### LEG-002 — topology/location reconciliation

`SupportPrimaryReconciliation.v1` maps existing Support Report location groups against explicit topology without changing the bore-axis grouper.

States:
- `EXPLICIT_ASSEMBLY`;
- `GEOMETRY_ONLY`;
- `PARTIAL_EXPLICIT`;
- `CONFLICT`;
- `SYMBOLIC_ONLY`.

Unsupported/unversioned relationship bundle shapes cannot acquire explicit-assignment authority.

### LEG-003 — Support Report count migration

`SupportPrimaryCountProjection.v1` is applied before Support Report row projection.

Family policy:
1. No valid explicit relationship family -> preserve existing geometry-group count exactly.
2. Valid explicit family -> count every countable explicit assembly, including unobserved explicit assemblies.
3. Each `GEOMETRY_ONLY` group contributes one fallback occurrence.
4. Multiple geometry groups resolving to one explicit assembly deduplicate.
5. DATUM/reference-only evidence contributes zero.
6. PARTIAL/CONFLICT activates an ambiguity floor so count cannot fall below legacy geometry evidence.
7. Unsupported relationship schema has no count authority.
8. `Multiple primary support` follows final family count >1; `multipleLocationsOnPipe` remains audit evidence.

The engine accepts `primaryRelationshipBundle` separately from the existing staged Support/Steel `relationshipBundle` and carries assembly/count provenance into row evidence and JSON Trace.

### LEG-004 — exact zone scope + optional relationship XML UI

Introduces `SupportReportZoneScope.v1`:
- discovers exact ancestor zone nodes from primary Support Report evidence;
- understands actual raw parser rows (`primaryPath` / `secondaryPath`) and grouped plural-path rows;
- supports independent Primary/piping-support and Secondary/support selections;
- empty side selection means no restriction;
- active Primary+Secondary selections are conjunctive for report rows;
- similar substrings are not equivalent zone identity;
- emits an auditable scope summary.

Introduces `SupportPrimaryInput.v1`:
- parses optional Clash-within-Supports XML through the shared member-relationship parser;
- exact-path scopes relationship rows before topology authority exists;
- builds `SupportPrimaryRelationshipBundle.v1` only from scoped rows;
- exposes parsed/scoped/excluded counts and diagnostics.

Support Report UI now provides:
- optional **Primary Support Relationship XML** file/text input;
- **Support Report zone scope** panel;
- two searchable multi-select columns:
  - Primary / piping-support zones;
  - Secondary / support zones;
- exact-zone discovery button and row-evidence counts;
- clear/no-restriction controls;
- stale report invalidation when scope/input changes;
- end-to-end `primaryRelationshipBundle` construction and count consumption;
- report/debug audit snapshot for scope/catalog/relationship input.

Current-area zone scope deliberately does not filter typical-reference XML in LEG-004. Bootstrap/addon cache routing was advanced for this UI/input plane.

## Important integration finding corrected in LEG-004

Initial zone helper code used grouped `primaryPaths` / `secondaryPaths`. Review against the actual Support Report parser showed raw worker rows expose singular `primaryPath` / `secondaryPath`. The helper now supports both shapes, and focused tests use the raw row shape so the normal UI path is governed.

## Benchmark/oracle disposition

| Family | Expected | Current disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic explicit-dedupe count control committed; real relationship XML NOT_RUN |
| PS-11236 | 4 | synthetic unobserved `.4/.5 + DATUM` assembly control committed; real relationship XML NOT_RUN |
| PS-12060 | 1 | protected by unchanged geometry fallback; real suite NOT_RUN |
| PS-12877 | 4 | protected return/revisit control; real suite NOT_RUN |
| PS-12860 | 6 | protected by unchanged geometry fallback; real suite NOT_RUN |
| PS-12120 | 14 | protected by unchanged geometry fallback; real suite NOT_RUN |

Typicality `11168 <-> 14168` remains untouched.

## Validation truth

PASS:
- Common engineering-pr-delivery-v2 grounding and branch custody;
- immutable LEG-004 prework endpoint existed before product mutation;
- LEG-001 isolated parser behavior;
- LEG-002 isolated reconciliation behavior;
- LEG-003 isolated count-policy behavior;
- LEG-004 isolated exact-zone harness on raw parser row shape;
- material diff review confirms no orphan, tolerance, Column 22 or Support/Steel producer mutation;
- PR observed draft/open/mergeable with no reviews or review threads at LEG-004 material head.

PROCEDURAL NOTE:
- branch-local EP-0007 prework existed before LEG-004 mutation;
- the GitHub issue Active Handover mirror lagged during material work and is synchronized during EP-0008 closeout. No pre-mutation issue-comment synchronization is claimed.

NOT_RUN:
- committed repository topology/reconciliation/count/zone/input/UI tests under an executing GitHub runner;
- complete Support Report real benchmark suite;
- real PS-11167/PS-11236 relationship qualification;
- browser/deployed interaction qualification.

Infrastructure truth:
- LEG-004 workflow `34968126821` and ZIP workflow `34968126902` fail before test execution; jobs expose `steps=null`.
- These provide no product test result.

Input blocker:
- `benchmarks/1835.zip` contains only primary Support Report `1835.xml`.
- Real Owner 1835 Clash-within-Supports relationship XML is not pinned, therefore PS-11167=6 and PS-11236=4 remain NOT_RUN on real input.

## Current production files changed by the chain

Core topology/count:
- `tabs/ps-family-clash-audit/ps-family-psclash-xml-parser.js`
- `tabs/support-steel-relationship-builder/support-primary-relationship.js`
- `tabs/support-steel-relationship-builder/support-primary-reconciliation.js`
- `tabs/support-steel-relationship-builder/support-primary-counting.js`
- `tabs/support-steel-relationship-builder/support-primary-input.js`

Support Report integration/UI:
- `tabs/support-steel-relationship-builder/support-report-location-grouping.js`
- `tabs/support-steel-relationship-builder/support-report-engine.js`
- `tabs/support-steel-relationship-builder/support-report-row-enrichment.js`
- `tabs/support-steel-relationship-builder/support-report-zone-scope.js`
- `tabs/support-steel-relationship-builder/support-report-addon.js`
- `tabs/support-steel-relationship-builder/support-steel-relationship-bootstrap.js`

Focused tests include:
- `tests/support-primary-relationship.test.mjs`
- `tests/support-primary-reconciliation.test.mjs`
- `tests/support-primary-counting.test.mjs`
- `tests/support-primary-count-engine.test.mjs`
- `tests/support-report-zone-scope.test.mjs`
- `tests/support-primary-input.test.mjs`
- `tests/support-primary-zone-ui.test.mjs`

## Authority / safety invariants

- Explicit support-member connectivity is not carrier/steel authority.
- #1216 remains canonical for Support/Steel production relationships.
- DATUM/reference nodes never inflate primary-support count.
- Geometry cannot merge two different explicit assembly IDs.
- Empty zone scope preserves existing report population.
- Zone identity is exact ancestor-node identity, not substring matching.
- Missing/ambiguous evidence remains visible.
- No global tolerance widening has been introduced.
- No Column 22 decision-authority mutation has occurred.
- Merge remains Owner-only.

## Known follow-up caveats

1. Real 1835 Clash-within-Supports XML is still unavailable, so the newly accessible relationship path cannot yet be qualified on the Owner benchmark.
2. `totalSupportPointsOnSecondary` field-level provenance still reports the older clash-group source class; detailed row/JSON trace carries actual assembly count basis. Align before release.
3. Count dedupe changes family totals but does not collapse existing report rows mapping to one assembly.
4. Typical-reference zone scoping is not part of the current implementation.
5. Browser interaction qualification is still NOT_RUN because the Actions runner does not execute and no independent browser run has been completed.
6. Orphan resolver remains open.

## Recommended next bounded leg

WP-PSA-005 conservative orphan recovery:
- enabled by default;
- axial tolerance multiplier `1.0`;
- lateral tolerance multiplier `2.0`;
- configurable gates, all default ON:
  - Same PS/SL family;
  - Same PIPE;
  - Same Bore;
- unique qualifying target mandatory;
- partial/unknown enabled-gate evidence does not auto-pass;
- explicit different Primary Support Assembly IDs can never be joined;
- multiple qualifying targets -> `ORPHAN_AMBIGUOUS`, no merge;
- retain base and recovery axial/lateral values and merge basis in audit.

Column 22 remains deferred until the input -> relationship -> count -> fallback path is qualified end-to-end.

## EXACT_NEXT_ACTION

Synchronize EP-SUPPORT-PRIMARY-1222-0008 across issue/ACTIVE/CURRENT/PR. Stop there. On the next Owner `proceed`, prework WP-PSA-005 before any orphan-recovery mutation. Do not merge.
