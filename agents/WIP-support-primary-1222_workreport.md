# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222  
RELATED_TYPICALITY_ISSUE: #1179  
CHAIN: SUPPORT-PRIMARY-1222  
BRANCH: feature/support-primary-assembly-graph  
PR: 1223  
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581  
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0017  
LATEST_MATERIAL_LEG: LEG-009  
LATEST_MATERIAL_HEAD: 18938c15695453b476192f21b742fe57caae7754  
MERGE_AUTHORITY: OWNER_ONLY  
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat location inference to an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> count/recovery -> structural + relationship + axis typicality -> TypicalityConsensusV1`.

Optional Clash-within-Supports XML supplies PS/SL member connectivity only. It does not replace #1216 Support/Steel carrier/steel producer authority.

## Material history

### LEG-001 — explicit Primary Support Assembly topology
- `SupportPrimaryRelationshipBundle.v1` with deterministic assembly IDs;
- numeric members countable; DATUM/reference nodes symbolic/non-countable;
- support-member edges retained without mandatory pipe context;
- user wording changed to `Multiple primary support`.

### LEG-002 — topology/location reconciliation
- explicit, geometry-only, partial, conflict and symbolic states;
- unsupported bundle schemas have no authority.

### LEG-003 — family count projection
- `TOTAL SUPPORT POINTS ON SECONDARY` consumes distinct countable assembly IDs;
- explicit components deduplicate geometry groups;
- unobserved countable explicit assemblies contribute;
- ambiguity cannot lower below legacy geometry evidence.

### LEG-004 — current-side exact zone scope + optional relationship XML
- two-column searchable Primary/piping-support and Secondary/support zone selectors;
- exact ancestor matching, not substring matching;
- optional current-area Clash-within-Supports input.

### LEG-005 — conservative orphan recovery
Second pass only; normal grouping tolerance remains unchanged.

Defaults:
```text
Enable resolver                    ON
Axial multiplier                  1.0
Lateral multiplier                2.0
Same PS/SL family                 ON
Same PIPE                         ON
Same Bore                         ON
Require unique target             ALWAYS ON
```

Explicit/partial/conflict/symbolic assignments are immutable; enabled missing gates fail closed; provisional pairing requires reciprocal uniqueness; branch override requires guarded >=3-point axis evidence.

### LEG-006 — release hardening
- production-named shared axis/bore exports;
- popup-scoped orphan config;
- count field provenance aligned;
- nested browser cache routing hardened.

### LEG-007 — `RELATIONSHIP_TOPOLOGY_V1`
Independent matcher with `MATCH | NO_MATCH | REVIEW | UNAVAILABLE`.

Signals include effective/explicit assembly count, concrete-member-count spectrum, normalized pipe-class population and nominal-bore population. Missing explicit authority is `UNAVAILABLE`; partial authority is `REVIEW`. Relationship-only evidence cannot promote structural rejection.

### LEG-008 — `AXIS_TYPICALITY_V1`
Independent intrinsic-geometry matcher.

Evidence:
- DN-normalized axial/lateral support spacing;
- unsigned intra-model relative-axis angles `acos(|T1 dot T2|)`;
- traversal count, locations-per-traversal and return multiplicity;
- trusted/unavailable-axis and missing-bore metadata.

No raw global axis vectors are compared across XMLs. Partial evidence -> REVIEW; insufficient evidence -> UNAVAILABLE. Axis-only evidence cannot promote structural rejection. All three channels agreeing can yield `VERY_HIGH`; informed contradiction is fail-visible conflict/review.

### LEG-009 — symmetric reference-side relationship input
- new optional `Reference Primary Support Relationship XML` UI input;
- reference Support Report evidence is parsed first;
- reference relationship scope is derived independently using the **deepest exact zone candidate on each reference path**;
- current-area selected zones are never reused on the reference side;
- no exact reference zone => relationship rows parsed for diagnostics but zero rows receive authority;
- typed reference `SupportPrimaryRelationshipBundle.v1` is passed only to the right/reference report;
- CURRENT and REFERENCE input audits retain scope basis/availability, exact zones, parsed/scoped/excluded counts and bundle summary;
- existing `RELATIONSHIP_TOPOLOGY_V1` becomes capable of an informed two-sided verdict without matcher modification.

## Protected benchmark/oracle ledger

| Family / control | Expected | Disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic topology/orphan controls committed; real relationship input NOT_RUN |
| PS-11236 | 4 | synthetic explicit-unobserved control committed; real relationship input NOT_RUN |
| PS-12060 | 1 | first-pass grouper unchanged; real suite NOT_RUN |
| PS-12877 | 4 | return/revisit protection unchanged; real suite NOT_RUN |
| PS-12860 | 6 | first-pass grouper unchanged; real suite NOT_RUN |
| PS-12120 | 14 | first-pass grouper unchanged; real suite NOT_RUN |
| PS-11168 -> PS-14168 | positive structural typicality | structural matcher protected; three-channel execution NOT_RUN |

## Focused controls committed

Core assembly/count/zone/orphan/hardening tests remain in the `support-primary-*` and Support Report focused test files.

Typicality/reference controls include:
- `tests/support-report-relationship-typicality.test.mjs`;
- `tests/support-report-axis-typicality.test.mjs`;
- `tests/support-report-axis-consensus.test.mjs`;
- `tests/support-report-reference-relationship-integration.test.mjs`;
- updated `tests/support-primary-input.test.mjs` and `tests/support-primary-zone-ui.test.mjs`.

LEG-009 controls cover:
- reference relationship input absent -> existing behavior preserved;
- reference relationship scope derived from reference evidence, not current selected zones;
- deepest-zone scoping excludes sibling zones sharing broad parents;
- no discoverable reference zone fails closed;
- side-specific CURRENT/REFERENCE audit metadata;
- typed right-side explicit bundle reaches the reference report;
- existing relationship matcher becomes informed on both sides without matcher-code changes.

## Validation truth

PASS by source/material review through LEG-009:
- engineering-pr-delivery-v2 prework ordering preserved;
- LEG-009 diff stayed inside input/scope/UI/cache/test/control-plane boundary;
- structural matcher unchanged;
- relationship matcher unchanged;
- axis matcher unchanged;
- consensus policy unchanged;
- grouping/count/orphan semantics unchanged;
- #1216 producer authority unchanged;
- broad-parent reference scope leakage found during review and corrected to deepest exact zones;
- PR #1223 observed draft/open/mergeable;
- no unresolved inline review threads.

PR source-review records:
- LEG-007 COMMENT review `5212200167`;
- LEG-008 COMMENT review `5212752129`;
- LEG-009 COMMENT review `5212927412`;
- no approval/requested-changes review.

NOT_RUN:
- committed Node tests under an executing GitHub runner;
- browser/deployed qualification;
- ZIP benchmark execution;
- real two-sided relationship XML benchmark;
- real three-channel positive/negative qualification;
- real PS-11167/PS-11236 relationship qualification.

Actions at LEG-009 material head:
- qualification run `34995811707`: focused-node/browser jobs `steps=null`;
- ZIP run `34995811885`: benchmark job `steps=null`.

These are infrastructure/non-execution results, not product failures.

## Authority / safety invariants

- #1216 remains canonical for Support/Steel production relationships.
- explicit support-member topology outranks geometric recovery.
- DATUM/reference nodes never inflate count.
- normal bore-axis grouping tolerance is not globally widened.
- explicit distinct assembly IDs cannot be joined by orphan recovery.
- current and reference relationship scopes are independent.
- structural, relationship and axis matchers remain independently auditable.
- unavailable evidence never fabricates mismatch.
- secondary matchers cannot promote structural rejection/ambiguity.
- merge remains Owner-only.

## Current limitations

1. Real Owner Clash-within-Supports XML remains unpinned.
2. Repository/browser execution remains blocked by Actions jobs failing before steps.
3. Axis V1 still uses branch-global traversal axes; strongly bent local-axis refinement should be benchmark-driven.
4. Axis thresholds remain provisional/auditable rather than normal-UI editable.
5. Full three-channel Column 22/23 publication behavior still needs a dedicated qualification/presentation audit.

## Recommended next bounded work

Prework a **three-channel qualification + Column 22/23 publication/presentation** leg:
- synthetic A/B/C/D matrix for agreement, conflict and unavailable combinations;
- verify exact Column 22 candidate-publication rules under `TypicalityConsensusV1`;
- verify Column 23 human wording for all agreement/conflict/unavailable states;
- ensure Debug JSON/Trace exposes each channel and final consensus independently;
- preserve matcher outputs and thresholds; do not retune merely to force agreement.

## EXACT_NEXT_ACTION

Stop at `EP-SUPPORT-PRIMARY-1222-0017`. On fresh Owner progression, create a new prework endpoint for the qualification/presentation leg before any product mutation. Do not merge without fresh Owner authorization.
