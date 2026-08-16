# PR981 — CII Workspace V1 Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WITH_EXTERNAL_AUTHORITY_BLOCKERS
TAKEOVER_AUTHORITY: WRITE_ALLOWED (NEW FILES ONLY)
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #980
PR_OR_WIP: PR981
BRANCH: agent/issue-980-cii-workspace-v1
PRODUCT_AND_VALIDATION_HEAD: d34f26a39da232b50c859b0b4cf6b398ca2edaee
MAIN_HEAD_LAST_CHECKED: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
MERGE_BASE: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
APPENDIX_A_STATUS: CURRENT / QUALIFIED
GROUNDING_EPOCH: GE-005
CURRENT_STAGE: STAGE03_VALIDATED / STAGE07_HARDENED / AUTHORITY_BLOCKERS_EXPLICIT
CURRENT_BLOCKERS:
- Stage01: output.cii first ELEMENTS row has OD=0; protected parser/sections/elements.js rejects that row as an element start. Do not add a local parser bypass.
- Integration: live Utilities registration requires editing protected tabs/psnm-utility-tab.js.
EXACT_NEXT_ACTION: validate Stage04 shell lifecycle with new-file-only test machinery; keep parser and Utilities registry untouched unless owner expands authority.
```

## 2. Quantitative V1 State

Percentages are engineering completion estimates against Issue #980 acceptance, combining implementation and observed validation. They are not GitHub-generated metrics.

| Stage | Effective | Evidence now observed | Remaining |
|---|---:|---|---|
| 01 Intake & model summary | **88%** | parser-backed real repository benchmark slice PASS; SHA/NODENAME fixtures PASS | zero/missing-OD neutral-file authority mismatch demonstrated on `output.cii` |
| 02 Anchors | **82%** | 1/2/3+ anchor geometry authority, corrupted and near-collinear cases PASS | broader suggested-anchor UX/fixtures |
| 03 Topology / path match | **92%** | exact baseline path-aligner exports executed; 1→N subdivision PASS; determinism PASS; insert/delete/gang/hard-conflict fixtures PASS | broader real multi-branch/multi-span files |
| 04 Correspondence review | **82%** | reviewed NODE custody PASS; immutable accept/reject inputs implemented | shell/browser lifecycle test |
| 05 Property-transfer preview | **90%** | NodeName/P1/T1 custody PASS; OD transition blockers PASS; unique rigid↔rigid custody PASS; ambiguous rigid fail-closed PASS | real two-file end-to-end preview fixture |
| 06 Apply to target CII | **100% for V1 placeholder requirement** | visible `NOT_IMPLEMENTED`, disabled action, bypass test PASS | actual mutation intentionally 0% and outside this V1 |
| 07 Validation & export | **90%** | deterministic correspondence + audit bytes PASS; CSV now includes operation/confidence/review/evidence/custody/status/blockers; modified target remains null | shell-driven artifact lifecycle |
| Utilities registration | **0% / BLOCKED** | installer exists as new file | one protected registry edit requires explicit owner authorization |

Approximate aggregate state:
- new-file V1 implementation: **~92%**
- validation of authorized implementation: **~85%**
- seven-stage readiness excluding live registry integration: **~89%**
- full product acceptance including required Utilities placement: **~80%**, dominated by the explicit 0% registry gate and Stage01 parser-authority mismatch.

## 3. What Changed in GE-005

### Stage03 validation moved from NOT_RUN to PASS
The baseline `tabs/model-converters/xml-cii-inputxml-path-aligner.js` was fetched at exact issue baseline `b0f13c99...`. It is import-free, so a local validation slice could execute the exact exported `buildElementPaths`, `scorePathMatch`, and `alignElementSequence` implementation together with the current CII Workspace modules without modifying or cloning repository authority.

PASS:
- `tests/cii-workspace-topology.test.js` — SOURCE `100→200` maps to TARGET `5000→5010→5020`, with target node `5010` retained as `INSERTED`.
- `tests/cii-workspace-determinism.test.js` — repeated identical graph/anchor inputs serialize identically.
- `tests/cii-workspace-alignment-semantics.test.js` — MATCH/INSERT_TARGET/DELETE_SOURCE and safe internal node boundaries retained.
- gang-of-nodes and hard structural-conflict fixtures remain PASS.

### Stage01 parser-backed qualification found one PASS path and one protected-authority blocker
A slice copied from repository benchmark `converters/scripts/inputxml_profile_bm_cii_2019.cii` parses through the protected `parser/caesar-parser.js` and current CII Workspace intake:
- FROM 10 / TO 20
- OD 114.3
- wall 6
- T1 350
- P1 2
- NEUTRAL format, parser alias and SHA path valid.

New durable test: `tests/cii-workspace-intake-benchmark-slice.test.js` — PASS.

However, repository `output.cii` begins its first ELEMENTS row with:
`100 110 6700 0 -370 0.00000`

The protected `parser/sections/elements.js` identifies an element-start row only when its sixth value (OD heuristic) is at least 10 mm. Therefore this actual row is rejected and CII Workspace intake reaches `CII_WORKSPACE_ELEMENTS_REQUIRED`. The writer schema confirms the sixth row-1 field is diameter, so this is a real zero/missing-OD compatibility case, not a column misunderstanding.

This is now an **authority blocker**, not a missing test. Under owner instruction, do not edit the parser and do not invent a parallel neutral parser. An existing read-only primitive `converters/xml-cii2019-core/output-normalizer.js::parseCiiElements` was identified for future authority discussion, but it has not been promoted into CII Workspace parsing authority.

### Stage05 rigid custody moved to observed PASS
New durable test: `tests/cii-workspace-rigid-custody.test.js`.
- one uniquely supportable terminal RIGID record on SOURCE and TARGET promotes both edges to `RIGID`;
- reviewed correspondence yields `rigidWeight` `PREVIEW_READY`, custody `RIGID_COMPONENT`, SOURCE→TARGET;
- records at both terminal endpoints are `AMBIGUOUS` and do not promote the edge to RIGID.

### Stage07 export completeness was hardened
`cii-workspace-export.js` now emits deterministic correspondence CSV columns for:
- kind
- correspondence operation (`MATCH`, `INSERT_TARGET`, `DELETE_SOURCE`, `SOURCE_1_TO_TARGET_N`)
- confidence
- source / target
- correspondence ID
- authority
- review decision
- serialized evidence
- transfer properties
- transfer custodies
- transfer statuses
- blockers

New durable test: `tests/cii-workspace-export-audit.test.js`.
It proves repeated identical state produces identical CSV and JSON bytes, Stage06 remains `NOT_IMPLEMENTED` in audit, and `modifiedTargetCii` remains `null`.

## 4. Fresh Validation Ledger

```text
VAL-201 PASS — topology/subdivision through exact baseline path-aligner implementation
VAL-202 PASS — deterministic repeated correspondence through exact baseline path-aligner implementation
VAL-203 PASS — parser-backed intake of real repository benchmark CII slice
VAL-204 BLOCKED_BY_AUTHORITY — output.cii zero-OD first element is rejected by protected parser heuristic
VAL-205 PASS — unique rigid component custody and ambiguous-rigid fail-closed behavior
VAL-206 PASS — deterministic enriched correspondence CSV and audit JSON; no modified CII artifact
VAL-207 PASS — complete locally executable focused suite: 12 tests
VAL-208 PASS — syntax check of reconstructed dependency slice and current CII Workspace tests/modules
VAL-209 PASS — GitHub compare from b0f13c99... to pre-recovery product head shows additions only; no existing-file mutation
VAL-210 NOT_APPLICABLE — live Utilities exact-once integration remains owner-authority blocked
```

Locally executable PASS set at GE-005:
1. `cii-workspace-nodename.test.js`
2. `cii-workspace-geometry-authority.test.js`
3. `cii-workspace-alignment-semantics.test.js`
4. `cii-workspace-topology.test.js`
5. `cii-workspace-determinism.test.js`
6. `cii-workspace-gang-ambiguity.test.js`
7. `cii-workspace-hard-conflict.test.js`
8. `cii-workspace-transfer-preview.test.js`
9. `cii-workspace-transfer-review.test.js`
10. `cii-workspace-rigid-custody.test.js`
11. `cii-workspace-intake-benchmark-slice.test.js`
12. `cii-workspace-export-audit.test.js`

The local validation tree is disposable evidence only. Protected repository modules were fetched read-only at the baseline SHA and were not committed or altered.

## 5. Scope and Containment

Owner boundary is unchanged:
- write: new `tabs/cii-workspace/**`, new `tests/cii-workspace-*`, PR recovery files;
- read-only: `parser/**`, `tabs/model-converters/**`, `tabs/revision-compare/**`, `xml-compare/**`, existing converters/writers/navigation;
- forbidden without explicit authorization: `tabs/psnm-utility-tab.js`.

No auto-registration, global hook, MutationObserver, Model Converter navigation entry, XML Compare entry, alternate launcher, writer, or hidden Stage06 authority exists.

At product/validation head `d34f26a...`, all PR paths still originate as additions relative to `b0f13c99...`; no baseline production module is intentionally in the write set.

## 6. Remaining Engineering Items

| ID | Severity | State | Item |
|---|---|---|---|
| AUTH-001 | high | BLOCKED | Decide whether zero/missing-OD CII files require an approved parser authority change or an explicitly qualified existing neutral-block primitive. Current CII Workspace must fail closed. |
| VAL-211 | medium | NEXT | Stage04 shell lifecycle: construct/open/analyze/review/export/close/destroy/reopen using new-file-only test harness. |
| VAL-212 | medium | NEXT | Stage07 shell-driven artifact download enable/disable state and Stage06 disabled state. |
| VAL-213 | medium | pending | broader real multi-branch / multi-span CII pair fixture. |
| AUTH-002 | high | BLOCKED | Live Utilities registration via existing `tabs/psnm-utility-tab.js` requires explicit owner authorization. |

## 7. Continuation Rules

```text
DO NEXT: Stage04 shell lifecycle and Stage07 shell artifact behavior with new-file-only tests.
DO NOT: patch parser/sections/elements.js to accept OD=0 under current authority.
DO NOT: silently switch CII Workspace to output-normalizer.js as parser authority without qualification/owner approval.
DO NOT: edit tabs/psnm-utility-tab.js or invent an alternate launcher.
DO NOT: implement target-CII mutation or modified-CII export.
KEEP PR: draft; merge owner-only.
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

Status: **CURRENT / QUALIFIED**. Issue #980 qualification was completed against `main` at `b0f13c99...`. GE-005 does not expand authority; it converts previously missing validation into observed PASS results and records a protected parsing-authority blocker discovered from repository data.
