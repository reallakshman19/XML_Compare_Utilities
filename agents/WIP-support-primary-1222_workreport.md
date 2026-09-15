# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222  
RELATED_TYPICALITY_ISSUE: #1179  
CHAIN: SUPPORT-PRIMARY-1222  
BRANCH: feature/support-primary-assembly-graph  
PR: 1223  
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581  
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0013  
LATEST_MATERIAL_LEG: LEG-007  
LATEST_MATERIAL_HEAD: a42a3e12cb6369b8c26f02a593ef0264860e3501  
MERGE_AUTHORITY: OWNER_ONLY  
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat location-count inference toward an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> members -> pipe/carrier evidence -> independent typicality channels -> consensus`.

Optional Clash-within-Supports XML supplies support-member connectivity only. It does not replace #1216 Support/Steel carrier/steel producer authority.

## Implemented material legs

### LEG-001 — explicit assembly topology
- retained PS/SL member-to-member SupportChain evidence without mandatory pipe context;
- deterministic `SupportPrimaryRelationshipBundle.v1` assembly IDs;
- numeric members countable; DATUM/reference nodes symbolic and non-countable;
- renamed report wording to `Multiple primary support`.

### LEG-002 — topology/location reconciliation
- `SupportPrimaryReconciliation.v1` maps geometry groups to explicit assemblies;
- explicit, geometry-only, partial, conflict and symbolic states remain visible;
- unsupported relationship bundle schemas have no authority.

### LEG-003 — final family count projection
- `SupportPrimaryCountProjection.v1` supplies `TOTAL SUPPORT POINTS ON SECONDARY`;
- explicit components deduplicate geometry groups;
- unobserved countable explicit assemblies contribute;
- ambiguity cannot lower the count below legacy geometry evidence.

### LEG-004 — exact zone scope + optional relationship XML UI
- exact ancestor-zone discovery/scoping;
- searchable two-column Primary/piping-support and Secondary/support multi-select UI;
- optional current-side `Primary Support Relationship XML / Clash within Supports` input;
- empty zone selections preserve all-zone behavior.

### LEG-005 — conservative orphan recovery
`SupportPrimaryOrphanRecovery.v1` runs only after normal grouping and explicit reconciliation.

Defaults:
```text
Enable orphan resolver            ON
Axial multiplier                  1.0
Lateral multiplier                2.0
Same PS/SL family                 ON
Same PIPE                         ON
Same Bore                         ON
Require unique target             ALWAYS ON
```

Safety:
- only geometry-only sources recover;
- explicit/partial/conflict/symbolic assignments are immutable;
- missing enabled-gate evidence fails closed;
- ambiguity never chooses nearest automatically;
- provisional pairing requires reciprocal uniqueness;
- branch override requires all three compatibility gates plus >=3-point pipe-axis evidence.

### LEG-006 — release hardening
- production-named shared bore/axis exports;
- popup-scoped orphan config passed explicitly into builds;
- field-level total-support count provenance aligned to assembly/orphan count basis;
- nested browser cache routing hardened;
- focused hardening tests committed.

### LEG-007 — `RELATIONSHIP_TOPOLOGY_V1`
Introduces a second independent family-level typicality channel beside the existing structural matcher.

Relationship decision contract:
- `MATCH` — both sides complete explicit authority and intrinsic signatures agree;
- `NO_MATCH` — both sides complete explicit authority and material topology differs;
- `REVIEW` — partial/ambiguous explicit authority or required intrinsic signal unavailable;
- `UNAVAILABLE` — explicit relationship authority missing on either side.

Current intrinsic signals:
- effective Primary Support Assembly count;
- explicit assembly count;
- concrete-member-count spectrum across explicit assemblies;
- normalized pipe-class population;
- nominal-bore population.

`TypicalityConsensusV1` sits above the unchanged structural/location result:
- independent agreement raises confidence;
- relationship `UNAVAILABLE` preserves structural candidate at reduced confidence;
- informed contradiction produces fail-visible `REVIEW / CONFLICT`;
- relationship-only match cannot promote a structural rejection/ambiguity in the first integration.

Human-facing Column 23 wording now distinguishes relationship conflict/incomplete evidence while machine reason codes remain authoritative.

## Protected benchmark/oracle ledger

| Family / control | Expected | Current disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic topology/orphan controls committed; real relationship input NOT_RUN |
| PS-11236 | 4 | synthetic explicit-unobserved control committed; real relationship input NOT_RUN |
| PS-12060 | 1 | normal grouper unchanged; real suite NOT_RUN |
| PS-12877 | 4 | return/revisit protection unchanged; real suite NOT_RUN |
| PS-12860 | 6 | normal grouper unchanged; real suite NOT_RUN |
| PS-12120 | 14 | normal grouper unchanged; real suite NOT_RUN |
| PS-11168 -> PS-14168 | structural positive typicality | existing structural matcher protected; relationship channel may be UNAVAILABLE until both sides have explicit relationship input |

## Focused controls committed

Primary structure/count/zone/orphan:
- `tests/support-primary-relationship.test.mjs`
- `tests/support-primary-reconciliation.test.mjs`
- `tests/support-primary-counting.test.mjs`
- `tests/support-primary-count-engine.test.mjs`
- `tests/support-report-zone-scope.test.mjs`
- `tests/support-primary-input.test.mjs`
- `tests/support-primary-zone-ui.test.mjs`
- `tests/support-primary-orphan-recovery.test.mjs`
- `tests/support-primary-orphan-safety.test.mjs`
- `tests/support-primary-orphan-ui.test.mjs`
- `tests/support-primary-orphan-engine-audit.test.mjs`
- `tests/support-primary-release-hardening.test.mjs`

Relationship typicality:
- `tests/support-report-relationship-typicality.test.mjs`

LEG-007 focused controls cover:
- topology match across different family IDs;
- assembly-count mismatch;
- member-count-spectrum mismatch;
- missing explicit authority => `UNAVAILABLE`;
- partial explicit authority => `REVIEW`;
- structural matcher output reproducibility;
- structural candidate retained when relationship is unavailable;
- informed contradiction => `REVIEW / CONFLICT`;
- relationship-only candidate cannot promote structural rejection.

## Validation truth

PASS by source/material review:
- engineering-pr-delivery-v2 prework ordering through LEG-007;
- structural matcher file `support-report-typicality.js` was not modified in LEG-007;
- normal support grouping/count/orphan semantics were not modified in LEG-007;
- relationship absence is explicitly unavailable rather than mismatch;
- consensus conflict is fail-visible;
- browser cache route reaches bootstrap -> addon -> projection;
- PR #1223 observed draft/open/mergeable;
- no unresolved review threads.

Review record:
- COMMENT review `5212200167` records LEG-007 source/material review;
- no approval or requested-changes review.

NOT_RUN:
- committed Node tests under an executing GitHub runner;
- browser/deployed qualification;
- complete protected Support Report benchmark suite;
- real PS-11167/PS-11236 relationship qualification;
- real two-sided `RELATIONSHIP_TOPOLOGY_V1` benchmark.

Infrastructure at LEG-007 material head:
- qualification workflow `34989138496`: focused-node/browser jobs `steps=null`;
- ZIP workflow `34989137742`: benchmark job `steps=null`.

These are not product test failures.

## Current limitations

1. Actual 1835 Clash-within-Supports XML remains unpinned.
2. Reference-side relationship XML input is not yet implemented; real two-sided relationship topology can therefore be `UNAVAILABLE`.
3. Relationship topology currently uses assembly count/member spectra plus report-derived pipe/bore populations; richer explicit edge-degree/connectivity descriptors can be added later.
4. Count deduplication changes family totals but does not collapse report row cardinality.
5. Axis Typicality V1 is not yet implemented.
6. Repository/browser test execution remains blocked by Actions jobs failing before steps.

## Authority / safety invariants

- #1216 remains canonical for Support/Steel production relationships.
- explicit support-member topology outranks geometric recovery.
- DATUM/reference nodes never inflate primary-support count.
- normal bore-axis grouping tolerance is not globally widened.
- explicit different assembly IDs cannot be joined by orphan recovery.
- unique orphan target remains mandatory.
- branch return/revisit protection remains mandatory.
- structural typicality matcher remains an independent frozen channel.
- relationship topology is independent and cannot silently overwrite structural conclusions.
- merge remains Owner-only.

## Recommended next bounded work

**LEG-008 — Axis Typicality V1**, after a new prework endpoint is committed.

Use intrinsic relative geometry only:
- local pipe/traversal axes;
- relative axis angles;
- axial/lateral spacing descriptors;
- pipe return/traversal topology;
- DN/bore-normalized ratios.

Do not compare raw global axis vectors across XMLs. Ambiguous or insufficient axis evidence must produce `UNAVAILABLE`, not rejection. Keep Axis Typicality independent and integrate it through consensus only after its own audit exists.

## EXACT_NEXT_ACTION

Create LEG-008 prework endpoint for Axis Typicality V1 before any production mutation. Do not merge without fresh Owner authorization.
