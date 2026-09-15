# WIP-support-primary-1222 workreport

WORK_ITEM: github:reallaksh19/XML_Compare_Utilities#1222  
RELATED_TYPICALITY_ISSUE: #1179  
CHAIN: SUPPORT-PRIMARY-1222  
BRANCH: feature/support-primary-assembly-graph  
PR: 1223  
BASE_MAIN: 242fc1b1df7e398b64e15a1fd3e2f87d1ff5b581  
CURRENT_ENDPOINT: EP-SUPPORT-PRIMARY-1222-0021  
LATEST_MATERIAL_LEG: LEG-011  
LATEST_MATERIAL_HEAD: c65b58f17e2e455c9a507137c5ef945c13c58c53  
TECHNICAL_DISPOSITION: HOLD_DRAFT  
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
- searchable two-column Primary/piping-support and Secondary/support zone selectors;
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

Explicit/partial/conflict/symbolic assignments are immutable; missing enabled-gate evidence fails closed; provisional pairing requires reciprocal uniqueness; branch override uses guarded axis evidence.

### LEG-006 — release hardening
- production-named shared axis/bore exports;
- popup-scoped orphan config;
- multi-popup build lease;
- count provenance aligned;
- nested browser cache routing hardened for then-current modules.

### LEG-007 — `RELATIONSHIP_TOPOLOGY_V1`
Independent family matcher with `MATCH | NO_MATCH | REVIEW | UNAVAILABLE`. Missing explicit authority is `UNAVAILABLE`; partial authority is `REVIEW`; relationship-only evidence cannot promote structural rejection.

### LEG-008 — `AXIS_TYPICALITY_V1`
Independent intrinsic-geometry matcher using DN-normalized axial/lateral spacing, unsigned intra-model relative-axis angles, traversal count, locations-per-traversal and return multiplicity. No raw global axis vectors are compared across XMLs. Partial evidence -> REVIEW; insufficient evidence -> UNAVAILABLE; axis-only evidence cannot promote structural rejection.

### LEG-009 — symmetric reference-side relationship input
- optional `Reference Primary Support Relationship XML`;
- reference scope independently derived from deepest exact reference zone ancestry;
- current zone selections never reused on the reference side;
- no exact reference zone => zero topology authority;
- typed right-side relationship bundle feeds the reference report.

### LEG-010 — Column 22/23 publication governance
`SupportReportTypicalityPublication.v1` publishes Column 22 only for final `TYPICAL`; REVIEW/conflict/AMBIGUOUS/NO_MATCH/secondary-only candidates are withheld. `SupportReportTypicalityRowAudit.v1` preserves structural, arrangement-resolved structural, relationship, axis, consensus/final and publication evidence. Trace/Debug intentionally advance to `SupportReportTraceCsv.v4` / `SupportReportDebugExport.v4`; operational report columns remain unchanged.

### LEG-011 — release-readiness / qualification consolidation
Release-readiness found a count-authority defect: provisional geometry-only orphan recovery could cross **known different pipe traversals** when a trusted pipe-wide axis existed, weakening the original PS-12877 return/revisit protection.

Count authority now applies a traversal safety guard:
```text
ORPHAN_RECOVERED_GEOMETRY + DIFFERENT_TRAVERSAL
    -> ORPHAN_UNRESOLVED
       DIFFERENT_TRAVERSAL_GEOMETRY_RECOVERY_WITHHELD
```

Explicit assembly recovery remains permitted across traversal separation because explicit support-member topology outranks geometry.

Added:
- `ORPHAN_CROSS_TRAVERSAL_GEOMETRY_WITHHELD` diagnostic;
- `orphanCrossTraversalGeometryWithheldCount` summary;
- PS-12877-style >=3-point synthetic return/revisit control;
- nested engine -> count cache token `20260915-support-primary-traversal-safety-1`.

Technical disposition after the readiness sweep: **HOLD_DRAFT**.

## Protected benchmark/oracle ledger

| Family / control | Expected | Disposition |
|---|---:|---|
| PS-11167 | 6 | synthetic explicit-topology control committed; real relationship input NOT_RUN |
| PS-11236 | 4 | synthetic explicit-unobserved + DATUM control committed; real relationship input NOT_RUN |
| PS-12060 | 1 | existing real 1885 first-pass benchmark; exact final-path execution NOT_RUN |
| PS-12877 | 4 | existing real 1885 first-pass benchmark + new cross-traversal orphan guard; exact final-path execution NOT_RUN |
| PS-12860 | 6 | existing real 1885 first-pass benchmark; exact final-path execution NOT_RUN |
| PS-12120 | 14 | existing real 1885 first-pass benchmark; exact final-path execution NOT_RUN |
| PS-11168 -> PS-14168 | positive structural typicality | structural matcher protected; exact execution NOT_RUN |

## Contract / authority audit

PASS by source/material review through LEG-011:
- current `main` is unchanged; feature branch has no base divergence;
- #1216 Support/Steel producer authority is untouched;
- first-pass bore-axis grouping constants/traversal decisions are unchanged;
- DATUM/reference nodes are non-countable;
- partial/conflicting explicit evidence cannot reduce below legacy geometry evidence;
- provisional geometry cannot override known traversal separation for final count;
- explicit topology remains the permitted stronger override;
- structural, relationship and axis matchers remain separately auditable;
- secondary channels cannot promote structural rejection/ambiguity;
- Column 22 publishes only final `TYPICAL`;
- `support-report-contract.js`, `support-report-export.js`, and `support-report-xlsx.js` are not changed by PR #1223, so Owner operational report column identity/order is preserved;
- Trace/Debug v4 is diagnostic-only versioning;
- current/reference relationship scopes remain independent;
- no unresolved PR review threads at LEG-011 material review.

PR COMMENT reviews:
- LEG-007 `5212200167`;
- LEG-008 `5212752129`;
- LEG-009 `5212927412`;
- LEG-010 `5213502126`;
- LEG-011 `5213748178`.

No approval/requested-changes review has been submitted.

## Validation truth

Material head: `c65b58f17e2e455c9a507137c5ef945c13c58c53`.

Actions:
- qualification run `35003063812`:
  - focused-node `104495939947`: `steps=null`;
  - browser `104495940313`: `steps=null`;
- ZIP benchmark run `35003063942`:
  - benchmark `104495940581`: `steps=null`.

Therefore focused Node, browser and ZIP execution remain **NOT_RUN**. These workflow failures are infrastructure/non-execution results, not product failures.

Local public checkout is also unavailable in the execution environment due GitHub DNS failure, so no independent Node/ZIP result exists.

Real Owner 1835 Clash-within-Supports XML remains unpinned, therefore real PS-11167/PS-11236 relationship qualification is NOT_RUN.

## Current release blockers

1. **Hot-browser cache propagation:** `support-report-engine.js` now references the traversal-safe count token, but `support-report-addon.js` still imports the engine using the prior engine query URL. A fresh load sees current source; an already-open module graph can retain the pre-guard engine/count module. Bootstrap -> addon -> engine cache routing must be advanced.
2. **No executing qualification:** current-head Node/browser/ZIP Actions execute zero steps.
3. **Real relationship benchmark unavailable:** 1835 Clash-within-Supports input is not pinned.

## Current disposition

Source/material architecture after the traversal fix: **PASS WITH QUALIFICATION BLOCKERS**.  
Leave-draft / release disposition: **HOLD_DRAFT**.

PR #1223 must remain draft. This is not merge authorization.

## EXACT_NEXT_ACTION

On fresh Owner progression:
1. safely advance bootstrap -> addon -> engine browser cache routing for traversal-safety v1;
2. obtain an executing qualification path and run focused Node + browser + real 1885 ZIP controls on the exact resulting head;
3. when available, pin/run real 1835 relationship XML for PS-11167=6 and PS-11236=4;
4. repeat release-readiness disposition;
5. mark-ready and merge remain separate Owner-authorized transitions.