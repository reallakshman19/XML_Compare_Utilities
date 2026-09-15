# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222
CHAIN: SUPPORT-PRIMARY-1222
BRANCH: feature/support-primary-assembly-graph
PR: 1223
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0010
LATEST_MATERIAL_LEG: LEG-005
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat location-count inference toward an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> concrete/symbolic members -> pipe/carrier evidence`.

Optional Clash-within-Supports XML supplies support-member connectivity only. It does not replace #1216 Support/Steel carrier/steel producer authority. Existing bore-axis grouping remains the first geometry authority; LEG-005 adds only a guarded second-pass fallback.

## Implemented material legs

### LEG-001 — explicit assembly topology

- `parseSupportMemberRelationshipXml()` retains SupportChain member relationships even when pipe context is absent.
- legacy `parseSupportChangeXml()` remains pipe-required.
- `SupportPrimaryRelationshipBundle.v1` builds deterministic family-scoped components such as `PSA::PS-11167::M-2+11`.
- numeric members are countable; DATUM / STRUCTURAL_REFERENCE are symbolic and non-countable.
- explicit topology never uses XYZ proximity.
- user-facing remark is `Multiple primary support`.

### LEG-002 — topology/location reconciliation

`SupportPrimaryReconciliation.v1` maps current location groups to explicit topology with states:
- `EXPLICIT_ASSEMBLY`;
- `GEOMETRY_ONLY`;
- `PARTIAL_EXPLICIT`;
- `CONFLICT`;
- `SYMBOLIC_ONLY`.

Unsupported relationship bundle schemas have no authority.

### LEG-003 — family count migration

`SupportPrimaryCountProjection.v1` supplies the final `TOTAL SUPPORT POINTS ON SECONDARY` value.

- no valid explicit family => existing geometry count;
- explicit components deduplicate location groups sharing one assembly;
- countable unobserved explicit assemblies contribute;
- DATUM/reference-only evidence contributes zero;
- geometry-only groups remain fallback occurrences;
- PARTIAL/CONFLICT ambiguity cannot lower below legacy geometry evidence;
- `Multiple primary support` follows final family count >1.

### LEG-004 — exact zone scope + optional relationship XML UI

- `SupportReportZoneScope.v1` discovers/scopes exact ancestor identities, not substrings;
- handles raw `primaryPath`/`secondaryPath` and grouped plural paths;
- Support Report UI has searchable Primary/piping-support and Secondary/support multi-selects;
- empty selections preserve all-zone behavior;
- optional `Primary Support Relationship XML / Clash within Supports` input is parsed, exact-path scoped, then converted into `SupportPrimaryRelationshipBundle.v1`;
- scope/catalog/input summaries are retained in report/debug state;
- typical-reference XML is not zone-filtered in this leg.

### LEG-005 — conservative orphan recovery

Introduces `SupportPrimaryOrphanRecovery.v1` after explicit reconciliation and before final count projection.

Governed defaults:
```text
Enable orphan resolver            ON
Axial multiplier                  1.0
Lateral multiplier                2.0
Same PS/SL family                 ON
Same PIPE                         ON
Same Bore                         ON
Require unique target             ALWAYS ON
```

Safety rules:
- source must be `GEOMETRY_ONLY`;
- explicit/partial/conflict/symbolic assignments are immutable;
- enabled missing gate evidence fails closed;
- multiple target identities => `ORPHAN_AMBIGUOUS`, no merge;
- provisional-to-provisional recovery requires reciprocal unique targeting;
- distinct explicit assemblies never join;
- different branch/traversal nodes can only recover when all three compatibility gates are enabled and pass;
- pipe-wide branch-override axis must contain >=3 independent points, so the source/target pair cannot define its own axis.

Geometry uses the same bore-axis model:
```text
axialMm   = |D dot T|
lateralMm = |D - (D dot T)T|
base axial   = 4 * Bore
base lateral = 0.5 * Bore + 25 mm
recovery axial   = base axial * multiplier
recovery lateral = base lateral * multiplier
```

Count integration:
- unique explicit recovery contributes no extra geometry occurrence;
- reciprocal recovered geometry pair shares one deterministic occurrence ID;
- non-recoverable/unrelated legacy groups remain independently countable;
- ambiguity floor remains intact.

UI/audit:
- new `Conservative orphan recovery` card exposes requested editable controls and fixed unique-target policy;
- engine accepts explicit `orphanRecoveryConfig`;
- report top-level exposes orphan schema/profile/config/summary;
- row evidence/debug JSON exposes recovery status, basis, targets/candidates, axial/lateral residuals, base/recovery thresholds, axis basis/confidence and branch relationship.

## Benchmark/oracle disposition

| Family | Expected | Current disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic explicit/orphan controls committed; real relationship input NOT_RUN |
| PS-11236 | 4 | synthetic explicit unobserved assembly control committed; real relationship input NOT_RUN |
| PS-12060 | 1 | normal grouper unchanged; real suite NOT_RUN |
| PS-12877 | 4 | return/revisit protected negative; real suite NOT_RUN |
| PS-12860 | 6 | normal grouper unchanged; real suite NOT_RUN |
| PS-12120 | 14 | normal grouper unchanged; real suite NOT_RUN |

Typicality `11168 <-> 14168` remains untouched through LEG-005.

## Focused controls committed

Topology/count/zone:
- `tests/support-primary-relationship.test.mjs`
- `tests/support-primary-reconciliation.test.mjs`
- `tests/support-primary-counting.test.mjs`
- `tests/support-primary-count-engine.test.mjs`
- `tests/support-report-zone-scope.test.mjs`
- `tests/support-primary-input.test.mjs`
- `tests/support-primary-zone-ui.test.mjs`

Orphan recovery:
- `tests/support-primary-orphan-recovery.test.mjs`
- `tests/support-primary-orphan-safety.test.mjs`
- `tests/support-primary-orphan-ui.test.mjs`
- `tests/support-primary-orphan-engine-audit.test.mjs`

## Validation truth

PASS by source/material review:
- engineering-pr-delivery-v2 custody/prework ordering;
- EP-0009 and Issue mirror existed before LEG-005 product mutation;
- material diff stayed inside the preworked orphan/count/UI/audit boundary;
- no normal grouping acceptance/tolerance mutation;
- explicit topology immutability, unique-target and reciprocal safety logic reviewed;
- branch override requires all guards plus >=3-point pipe axis;
- unrelated legacy groups remain countable;
- engine explicit config/audit path committed;
- PR observed draft/open/mergeable with no reviews or unresolved threads at LEG-005 material review.

NOT_RUN:
- committed repository tests under an executing GitHub runner;
- browser/deployed qualification;
- complete real Support Report benchmark suite;
- real PS-11167/PS-11236 relationship qualification.

Infrastructure:
- LEG-005 qualification workflow `34978272498` and ZIP workflow `34978272204` fail before any steps (`steps=null`). These are not product test results.

Input blocker:
- `benchmarks/1835.zip` contains only primary `1835.xml`;
- real Owner 1835 Clash-within-Supports XML remains unpinned.

## Authority / safety invariants

- #1216 remains canonical for Support/Steel production relationships.
- explicit support-member topology outranks geometric recovery.
- DATUM/reference nodes never inflate count or become recovery sources.
- normal grouping tolerance is not globally widened.
- explicit different assembly IDs cannot be joined by recovery.
- unique target is fixed; ambiguity remains visible.
- branch return/revisit protection remains mandatory.
- no Column 22 decision-authority mutation has occurred.
- merge remains Owner-only.

## Known release-hardening caveats

1. Orphan recovery currently consumes shared axis/bore helpers through `support-report-location-grouping.js`'s `_test` namespace. It reuses the canonical implementation but should move to production-named exports.
2. Normal UI mirrors orphan config through module-global runtime state. The engine now supports explicit `orphanRecoveryConfig`; popup-scoped passing should replace the runtime mirror before hardening.
3. Nested engine/count query tokens need hot-session browser cache hardening; fresh-page source correctness is unaffected.
4. `totalSupportPointsOnSecondary` field-level provenance still uses the older clash-group source class; row/debug audit contains the newer assembly/orphan count basis.
5. Count deduplication changes family totals but not report row cardinality.
6. Real relationship input and browser interaction qualification remain unavailable/NOT_RUN.

## Recommended next bounded work

Before Owner qualification of this PR, use one separate release-hardening leg to:
- expose production-named shared bore/axis geometry helpers;
- pass popup-scoped orphan configuration directly into the build;
- align field-level count provenance;
- propagate nested browser cache tokens;
- rerun real/focused qualification if runner/input become available.

After that, proceed to Column 22 `RELATIONSHIP_TOPOLOGY_V1` as an **independent** matcher and feed it into the planned TypicalityConsensus layer. Do not retune/overwrite the existing matcher merely to force agreement.

## EXACT_NEXT_ACTION

Stop at EP-SUPPORT-PRIMARY-1222-0010 and synchronize Issue #1222 + PR #1223. Do not merge without fresh Owner authorization.
