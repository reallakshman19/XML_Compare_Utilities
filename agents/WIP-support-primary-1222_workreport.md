# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222  
RELATED_TYPICALITY_ISSUE: #1179  
CHAIN: SUPPORT-PRIMARY-1222  
BRANCH: feature/support-primary-assembly-graph  
PR: 1223  
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581  
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0019  
LATEST_MATERIAL_LEG: LEG-010  
LATEST_MATERIAL_HEAD: a47af97cda0539751bfad2de5f8ee0844ce83fc6  
MERGE_AUTHORITY: OWNER_ONLY  
MERGE_AUTHORIZED: FALSE

## Mission

Move Support Report from flat location inference to an auditable hierarchy:

`zone -> PS/SL family -> Primary Support Assembly -> count/recovery -> structural + relationship + axis typicality -> TypicalityConsensusV1 -> governed publication`.

Optional Clash-within-Supports XML supplies PS/SL member connectivity only. It does not replace #1216 Support/Steel carrier/steel producer authority.

## Material history

### LEG-001 — explicit Primary Support Assembly topology
- `SupportPrimaryRelationshipBundle.v1` with deterministic assembly IDs;
- numeric members countable; DATUM/reference nodes symbolic/non-countable;
- support-member edges retained without mandatory pipe context;
- wording changed to `Multiple primary support`.

### LEG-002 — topology/location reconciliation
- explicit, geometry-only, partial, conflict and symbolic states;
- unsupported bundle schemas have no authority.

### LEG-003 — family count projection
- `TOTAL SUPPORT POINTS ON SECONDARY` consumes distinct countable assembly IDs;
- explicit components deduplicate geometry groups;
- unobserved countable explicit assemblies contribute;
- ambiguity cannot lower below legacy geometry evidence.

### LEG-004 — exact zone scope + current relationship XML
- two-column searchable Primary/piping-support and Secondary/support zone selectors;
- exact ancestor matching;
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

Explicit/partial/conflict/symbolic assignments are immutable; missing enabled-gate evidence fails closed; provisional pairing requires reciprocal uniqueness; branch override requires guarded >=3-point axis evidence.

### LEG-006 — release hardening
- production-named shared axis/bore exports;
- popup-scoped orphan config;
- multi-popup build lease;
- count field provenance aligned;
- nested browser cache routing hardened.

### LEG-007 — `RELATIONSHIP_TOPOLOGY_V1`
Independent family matcher with `MATCH | NO_MATCH | REVIEW | UNAVAILABLE`.

Signals include effective/explicit assembly count, concrete-member-count spectrum, normalized pipe-class population and nominal-bore population. Missing explicit authority is `UNAVAILABLE`; partial authority is `REVIEW`. Relationship-only evidence cannot promote structural rejection.

### LEG-008 — `AXIS_TYPICALITY_V1`
Independent intrinsic-geometry matcher using:
- DN-normalized axial/lateral support spacing;
- unsigned intra-model relative-axis angles `acos(|T1 dot T2|)`;
- traversal count, locations-per-traversal and return multiplicity;
- trusted/unavailable-axis and missing-bore metadata.

No raw global axis vectors are compared across XMLs. Partial evidence -> REVIEW; insufficient evidence -> UNAVAILABLE. Axis-only evidence cannot promote structural rejection. All three channels agreeing can yield `VERY_HIGH`; informed contradiction is fail-visible conflict/review.

### LEG-009 — symmetric reference-side relationship input
- optional `Reference Primary Support Relationship XML` UI input;
- reference Support Report evidence parsed first;
- reference relationship scope derived independently from the **deepest exact zone candidate on each reference path**;
- current-area selected zones are never reused on reference side;
- no exact reference zone => relationship rows parsed for diagnostics but zero authority;
- typed reference `SupportPrimaryRelationshipBundle.v1` feeds only the reference report;
- CURRENT and REFERENCE input audits remain separate;
- existing relationship matcher becomes capable of an informed two-sided verdict without matcher modification.

### LEG-010 — three-channel qualification + Column 22/23 publication governance
Added an explicit publication seam above the frozen matchers.

`SupportReportTypicalityPublication.v1` policy:
- final `TYPICAL` + retained structural candidate -> Column 22 `PUBLISHED`;
- `REVIEW` -> Column 22 `WITHHELD`;
- `AMBIGUOUS` -> `WITHHELD`;
- `NO_MATCH` -> `WITHHELD`;
- absent/non-typical -> `WITHHELD`;
- relationship-only or axis-only candidates cannot populate Column 22.

This removes the prior behavior where `REVIEW` could populate `TYPICAL STRUCTURE (PS NO.)`.

`SupportReportTypicalityRowAudit.v1` preserves independently:
- original structural matcher;
- arrangement-resolved structural result;
- relationship topology result/candidate/audit/failed signals;
- axis typicality result/candidate/audit/failed signals;
- final `TypicalityConsensusV1` result/confidence/basis;
- final result/reason/candidate;
- Column 22 publication status/reason.

Column 23 wording now distinguishes:
- all three channels agree;
- structural + axis agree with relationship unavailable;
- structural + relationship agree with axis unavailable;
- structural-only acceptance with both secondary channels unavailable;
- relationship conflict;
- axis conflict;
- multi-channel conflict;
- incomplete relationship/axis evidence.

For retained review candidates, Column 23 explicitly says the candidate is withheld.

Trace/debug contracts intentionally advance to:
- `SupportReportTraceCsv.v4`;
- `SupportReportDebugExport.v4`.

Trace v4 exposes Column 22/23 values, final result/reason, consensus result/confidence, publication status/reason and compact independent channel audit. Operational Owner report CSV/XLSX columns remain unchanged.

## Protected benchmark/oracle ledger

| Family / control | Expected | Disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic topology/orphan controls committed; real relationship input NOT_RUN |
| PS-11236 | 4 | synthetic explicit-unobserved control committed; real relationship input NOT_RUN |
| PS-12060 | 1 | first-pass grouper unchanged; real suite NOT_RUN |
| PS-12877 | 4 | return/revisit protection unchanged; real suite NOT_RUN |
| PS-12860 | 6 | first-pass grouper unchanged; real suite NOT_RUN |
| PS-12120 | 14 | first-pass grouper unchanged; real suite NOT_RUN |
| PS-11168 -> PS-14168 | positive structural typicality | structural matcher protected; source control remains; repository execution NOT_RUN |

## Focused controls committed

Primary structure/count/zone/orphan/hardening controls remain in the existing `support-primary-*` and Support Report focused test files.

Typicality/reference/publication controls include:
- `tests/support-report-relationship-typicality.test.mjs`;
- `tests/support-report-axis-typicality.test.mjs`;
- `tests/support-report-axis-consensus.test.mjs`;
- `tests/support-report-reference-relationship-integration.test.mjs`;
- `tests/support-report-typicality-publication.test.mjs`;
- updated `tests/support-report-trace-export.test.mjs`;
- updated current/reference input and zone UI controls.

LEG-010 A-J controls cover:
- all-three agreement;
- one/both secondary channels unavailable;
- relationship conflict;
- axis conflict;
- multi-channel conflict;
- structural/location REVIEW;
- structural AMBIGUOUS / NO_MATCH;
- secondary-only non-promotion;
- Column 23 agreement/limitation/conflict wording;
- row-level channel/consensus/publication audit;
- Trace/Debug v4 publication evidence.

## Validation truth

PASS by source/material review through LEG-010:
- engineering-pr-delivery-v2 prework ordering preserved;
- material legs stayed inside authorized boundaries;
- structural matcher implementation unchanged by relationship/axis/publication legs;
- relationship matcher semantics unchanged by axis/publication legs;
- axis matcher semantics/thresholds unchanged by publication leg;
- grouping/count/orphan semantics unchanged by typicality publication work;
- #1216 producer authority unchanged;
- raw global axis vectors never compared across XMLs;
- missing/partial secondary evidence fails closed;
- secondary matchers cannot promote a structural rejection/ambiguity;
- Column 22 now publishes final `TYPICAL` only;
- browser cache routing reaches current modules;
- no unresolved inline review threads at LEG-010 material review.

PR COMMENT review records:
- LEG-007 `5212200167`;
- LEG-008 `5212752129`;
- LEG-009 `5212927412`;
- LEG-010 `5213502126`;
- no approval/requested-changes review.

NOT_RUN:
- committed Node tests under an executing GitHub runner;
- browser/deployed qualification;
- ZIP benchmark execution;
- real two-sided Owner relationship XML benchmark;
- real three-channel positive/negative qualification;
- real PS-11167/PS-11236 relationship qualification.

Actions at LEG-010 material head:
- qualification run `35000814103`: focused-node/browser jobs `steps=null`;
- ZIP run `35000814152`: benchmark job `steps=null`.

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
- Column 22 publishes only final `TYPICAL`.
- merge remains Owner-only.

## Current limitations

1. Real Owner Clash-within-Supports XML remains unpinned.
2. Repository/browser execution remains blocked by Actions jobs failing before steps.
3. Axis V1 still uses branch-global traversal axes; strongly bent local-axis refinement should be benchmark-driven.
4. Axis thresholds remain provisional/auditable rather than normal-UI editable.

## Recommended next bounded work

Prework **release-readiness / qualification consolidation for PR #1223** rather than another matcher:
- re-ground current `main` and PR diff;
- sweep protected count oracles and 11168->14168 positive control across touched seams;
- verify Owner report CSV/XLSX column contract stays stable while Trace/Debug intentionally remain v4;
- static invariant sweep for #1216 authority, explicit-topology precedence, DATUM non-countability, orphan fail-closed behavior, no secondary promotion and no raw axis-vector cross-comparison;
- browser contract review for current/reference relationship inputs, zones, orphan settings and Column 22/23 publication;
- rerun Actions if infrastructure begins executing steps;
- decide whether PR #1223 may leave draft state.

## EXACT_NEXT_ACTION

Stop at `EP-SUPPORT-PRIMARY-1222-0019`. On fresh Owner progression, create a new prework endpoint for release-readiness/qualification consolidation. Do not mark ready or merge without explicit Owner authorization.