# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222  
RELATED_TYPICALITY_ISSUE: #1179  
CHAIN: SUPPORT-PRIMARY-1222  
BRANCH: feature/support-primary-assembly-graph  
PR: 1223  
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581  
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0015  
LATEST_MATERIAL_LEG: LEG-008  
LATEST_MATERIAL_HEAD: c738c03ef0036fba37a23490f83990e5a19fccc5  
MERGE_AUTHORITY: OWNER_ONLY  
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat location-count inference toward an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> count/recovery -> independent typicality channels -> consensus`.

Optional Clash-within-Supports XML supplies support-member connectivity only. It does not replace #1216 Support/Steel carrier/steel producer authority.

## Implemented material legs

### LEG-001 — explicit Primary Support Assembly topology
- retained PS/SL member-to-member SupportChain evidence without mandatory pipe context;
- deterministic `SupportPrimaryRelationshipBundle.v1` assembly IDs;
- numeric members countable; DATUM/reference nodes symbolic and non-countable;
- report wording changed to `Multiple primary support`.

### LEG-002 — topology/location reconciliation
- maps geometry groups to explicit assemblies;
- explicit, geometry-only, partial, conflict and symbolic states remain visible;
- unsupported relationship schemas have no authority.

### LEG-003 — final family count projection
- `SupportPrimaryCountProjection.v1` supplies `TOTAL SUPPORT POINTS ON SECONDARY`;
- explicit components deduplicate geometry groups;
- unobserved countable explicit assemblies contribute;
- ambiguity cannot reduce below legacy geometry evidence.

### LEG-004 — exact zone scope + optional relationship XML UI
- exact ancestor-zone discovery/scoping;
- searchable two-column Primary/piping-support and Secondary/support zone selection;
- optional current-side `Primary Support Relationship XML / Clash within Supports` input;
- empty selection preserves all-zone behavior.

### LEG-005 — conservative orphan recovery
Second pass only; normal first-pass tolerance is not widened.

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

Explicit/partial/conflict/symbolic assignments are immutable; missing enabled-gate evidence fails closed; provisional pairing requires reciprocal uniqueness; branch override requires all guards plus >=3 independent axis points.

### LEG-006 — release hardening
- production-named shared geometry exports;
- popup-scoped orphan config passed explicitly;
- count provenance aligned;
- nested browser cache routing hardened.

### LEG-007 — `RELATIONSHIP_TOPOLOGY_V1`
Independent family matcher beside the existing structural matcher.

Result contract:
- `MATCH` complete explicit topology agrees;
- `NO_MATCH` complete explicit topology materially differs;
- `REVIEW` partial/ambiguous explicit authority;
- `UNAVAILABLE` explicit authority missing on either side.

Signals include effective/explicit assembly count, concrete-member-count spectrum, normalized pipe-class population and nominal-bore population.

`TypicalityConsensusV1` sits above structural/location + relationship results. Agreement raises confidence; unavailable evidence preserves structural candidate; informed contradiction yields REVIEW/CONFLICT; relationship-only evidence cannot promote structural rejection.

### LEG-008 — `AXIS_TYPICALITY_V1`
Third independent family matcher using only intrinsic geometry.

Schema/profile:
- `SupportReportAxisTypicalityAudit.v1`;
- `AXIS_TYPICALITY_V1`.

Intrinsic evidence:
- DN-normalized support-location pair descriptors:
  - `A = |D dot T|`, `A/Bore`;
  - `L = |D - (D dot T)T|`, `L/Bore`;
- unsigned relative traversal-axis angle spectrum `acos(|T1 dot T2|)` computed inside each model;
- traversal count, locations-per-traversal spectrum and normalized pipe-class return multiplicity;
- trusted/unavailable-axis and missing-bore evidence metadata.

Hard invariant: raw global axis vectors are never compared across XMLs.

Evidence authority:
- complete informed intrinsic evidence -> MATCH/NO_MATCH according to named tolerances;
- partial informed evidence -> REVIEW;
- insufficient axis evidence -> UNAVAILABLE.

Provisional auditable thresholds:
- axial-ratio residual `0.25`;
- lateral-ratio residual `0.25`;
- relative-axis-angle residual `5 deg`.

Candidate selection fails closed: a matching candidate is not declared uniquely selected while another candidate remains REVIEW/UNAVAILABLE.

Three-channel consensus:
- structural + axis agreement raises confidence even when relationship is unavailable;
- all structural + relationship + axis channels independently selecting the same candidate -> `ALL_CHANNELS_AGREE`, `VERY_HIGH`;
- informed axis contradiction -> REVIEW / `AXIS_CONFLICT`;
- relationship + axis contradiction -> multi-channel conflict;
- axis unavailable preserves the prior structural/relationship consensus;
- axis-only evidence cannot promote structural rejection/ambiguity.

## Source-review corrections in LEG-008

- replaced a two-axis flip fixture (proper rotation) with a true one-axis reflection so handedness invariance is actually exercised;
- blocked authoritative axis MATCH when any competing candidate is not sufficiently assessed;
- branch identity now aggregates group-level and evidence-row branch IDs; contradictory branch evidence becomes ambiguous rather than silently selected.

## Protected benchmark/oracle ledger

| Family / control | Expected | Current disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic topology/orphan controls committed; real relationship input NOT_RUN |
| PS-11236 | 4 | synthetic explicit-unobserved control committed; real relationship input NOT_RUN |
| PS-12060 | 1 | normal grouper unchanged; real suite NOT_RUN |
| PS-12877 | 4 | return/revisit protection unchanged; real suite NOT_RUN |
| PS-12860 | 6 | normal grouper unchanged; real suite NOT_RUN |
| PS-12120 | 14 | normal grouper unchanged; real suite NOT_RUN |
| PS-11168 -> PS-14168 | structural positive typicality | structural matcher protected; axis/relationship execution qualification NOT_RUN |

## Focused controls committed

Primary structure/count/zone/orphan/hardening controls remain in the existing `support-primary-*` and Support Report focused test files.

Typicality controls:
- `tests/support-report-relationship-typicality.test.mjs`;
- `tests/support-report-axis-typicality.test.mjs`;
- `tests/support-report-axis-consensus.test.mjs`.

LEG-008 focused source controls cover:
- arbitrary 3D rotation + translation invariance;
- true reflection / axis-sign invariance;
- DN-normalized spacing mismatch;
- relative-axis-angle mismatch;
- insufficient axis evidence => UNAVAILABLE;
- partial axis evidence => REVIEW;
- traversal/return mismatch;
- unassessed competing candidate fail-closed selection;
- structural matcher output invariance;
- relationship matcher output invariance;
- axis contradiction conflict;
- all-three agreement confidence;
- axis-only non-promotion;
- axis unavailable preserving prior consensus.

## Validation truth

PASS by source/material review through LEG-008:
- engineering-pr-delivery-v2 prework ordering;
- material boundaries stayed inside authorized paths;
- structural matcher implementation unchanged by LEG-007/008;
- relationship matcher implementation unchanged by LEG-008;
- first-pass grouping/count/orphan semantics unchanged by LEG-007/008;
- no raw cross-XML axis-vector comparison;
- fail-closed unavailable/partial evidence behavior;
- browser cache routing reaches bootstrap -> addon -> projection -> axis matcher;
- PR #1223 observed draft/open/mergeable;
- no unresolved inline review threads at LEG-008 material review.

PR source-review records:
- LEG-007 COMMENT review `5212200167`;
- LEG-008 COMMENT review `5212752129`;
- no approval/requested-changes review.

NOT_RUN:
- committed Node tests under an executing GitHub runner;
- browser/deployed qualification;
- ZIP benchmark execution;
- real three-channel positive/negative typicality qualification;
- real PS-11167/PS-11236 relationship qualification.

Actions at LEG-008 material head:
- qualification run `34994156760`: focused-node/browser jobs `steps=null`;
- ZIP benchmark run `34994156668`: benchmark job `steps=null`.

These are infrastructure/non-execution results, not product test failures.

## Authority / safety invariants

- #1216 remains canonical for Support/Steel production relationships.
- explicit support-member topology outranks geometric recovery.
- DATUM/reference nodes never inflate count.
- normal bore-axis grouping tolerance is not globally widened.
- explicit different assembly IDs cannot be joined by orphan recovery.
- structural, relationship and axis typicality remain separately auditable channels.
- unavailable evidence does not fabricate mismatch.
- secondary matchers cannot silently promote a structural rejection.
- merge remains Owner-only.

## Current limitations / next boundary

1. Real 1835 Clash-within-Supports XML remains unpinned.
2. Current UI has explicit relationship XML only for the left/current report. The reference report lacks symmetric explicit topology input, so `RELATIONSHIP_TOPOLOGY_V1` can legitimately remain UNAVAILABLE in a real UI comparison.
3. Axis V1 uses the current branch-global traversal-axis primitive; strongly bent traversal refinement should be benchmark-driven.
4. Axis thresholds are provisional and auditable, not yet normal-UI editable.
5. Repository/browser execution remains blocked by Actions jobs failing before steps.

## Recommended next bounded work

Add **reference-side Primary Support Relationship XML** input/bundle plumbing before further matcher sophistication:
- optional reference Clash-within-Supports XML;
- governed reference-side zone scope;
- typed reference `primaryRelationshipBundle`;
- pass explicit topology on both sides to `RELATIONSHIP_TOPOLOGY_V1`;
- preserve missing evidence as UNAVAILABLE;
- expose side-specific relationship authority in audit/UI;
- then qualify full three-channel consensus on governed positive/negative controls.

## EXACT_NEXT_ACTION

Stop at `EP-SUPPORT-PRIMARY-1222-0015`. On a fresh Owner progression command, create a new prework endpoint before implementing reference-side relationship input. Do not merge without fresh Owner authorization.
