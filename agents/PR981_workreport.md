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
PRODUCT_CODE_HEAD: 5927971e00172b8892495fedfff3dc1ebb820346
VALIDATION_HEAD: 2b4caacfe4147d8b5f3c3d0bb724e445877a7eb1
MAIN_HEAD_LAST_CHECKED: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
MERGE_BASE: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
APPENDIX_A_STATUS: CURRENT / QUALIFIED
GROUNDING_EPOCH: GE-006
CURRENT_STAGE: NEW-FILE V1 NEAR COMPLETE / TWO PROTECTED AUTHORITY BLOCKERS
CURRENT_BLOCKERS:
- Stage01 zero/missing-OD compatibility: repository output.cii is rejected by protected parser/sections/elements.js element-start heuristic.
- Live Utilities registration: requires protected tabs/psnm-utility-tab.js edit.
EXACT_NEXT_ACTION: do not bypass either authority; only broader new-file fixtures remain executable without owner scope expansion.
```

## 2. Quantitative Status

Percentages are engineering completion estimates against Issue #980 acceptance, combining implemented behavior and observed validation. They are not GitHub-generated metrics.

| Stage | Effective | Observed evidence | Remaining |
|---|---:|---|---|
| **01 Intake & model summary** | **88%** | parser-backed real benchmark intake PASS; SHA identity PASS; fixed-width NODENAME pointer/conflict handling PASS; model summary shown in inspection UI | `output.cii` zero-OD first element is rejected by protected parser authority |
| **02 Anchors** | **96%** | manual engineer-locked anchors; 1/2/3+ geometry gates PASS; deterministic terminal/branch/size-transition/rigid/bend/name landmark suggestions; suggestions explicitly evidence-only | broader real-file landmark ranking examples |
| **03 Topology / path match** | **96%** | exact baseline path-aligner exports exercised; 1→N subdivision PASS; MATCH/INSERT/DELETE PASS; determinism PASS; gang/hard-conflict PASS; alternate-route/order/outside-span blockers PASS | broader large multi-span real CII pair corpus |
| **04 Correspondence review** | **96%** | accept/reject ledger; reviewed NodeName custody; shell analyze→accept→refresh PASS; file/anchor edits invalidate stale review and exports; destroy/reopen PASS | richer browser/manual UX only |
| **05 Property-transfer preview** | **94%** | NodeName/P1/T1 preview custody PASS; reducer/OD blockers PASS; rigid↔rigid custody PASS; ambiguous rigid fail-closed; shell review activates preview-only transfer | broader mixed-property real CII pair |
| **06 Apply to target CII** | **100% for V1 placeholder requirement** | visible stable `NOT_IMPLEMENTED`; disabled action; bypass test; no writer/download route | actual mutation intentionally 0% and outside this Work Pack |
| **07 Validation & export** | **95%** | deterministic correspondence and audit bytes; enriched CSV carries operation/confidence/authority/review/evidence/custody/status/blockers; shell CSV/JSON export PASS; modified target null | only broader real-file corpus |
| **Utilities registration** | **0% / BLOCKED** | new installer exists and exact-one lifecycle test PASS when invoked | existing registry edit explicitly forbidden by owner |

Aggregate:
- **new-file V1 implementation: ~96%**
- **authorized validation: ~94%**
- **seven-stage readiness excluding live Utilities registration: ~95%**
- **full product acceptance including required Utilities placement: ~83%**

The full-product number remains materially lower because the required live registry integration is deliberately 0%, not hidden behind a workaround.

## 3. GE-006 Completed Work

### Stage 03 — production topology validation
The exact baseline `tabs/model-converters/xml-cii-inputxml-path-aligner.js` implementation at `b0f13c99...` was exercised with current CII adapters in a disposable local validation slice. No protected repository file was modified.

PASS:
- anchored source-1→target-N subdivision with target internal node retained as `INSERTED`;
- deterministic repeated correspondence;
- explicit MATCH / INSERT_TARGET / DELETE_SOURCE rows;
- gang-of-nodes greedy-local regression protection;
- branch/rigid structural hard conflicts;
- alternate physical route blocks automatic custody;
- locked intermediate anchor order contradiction blocks;
- locked intermediate anchor outside anchor span blocks.

### Stage 01 — parser-backed qualification and blocker discovery
A real repository benchmark slice from `converters/scripts/inputxml_profile_bm_cii_2019.cii` parses through protected `parser/caesar-parser.js` and current intake with FROM 10 / TO 20 / OD 114.3 / wall 6 / T1 350 / P1 2.

`output.cii`, however, begins with an ELEMENTS row whose sixth field (diameter) is `0.00000`. The protected `parser/sections/elements.js` element-start heuristic requires the sixth value to be at least 10. That row therefore does not become an element and intake fails with `CII_WORKSPACE_ELEMENTS_REQUIRED`.

This is a **protected parsing-authority mismatch**, not an unexecuted test. The repository also contains `converters/xml-cii2019-core/output-normalizer.js::parseCiiElements`, but CII Workspace has **not** silently promoted that separate primitive into parser authority. Owner qualification/scope expansion is required before changing this boundary.

### Stage 02 — suggested landmark evidence
New `cii-workspace-landmarks.js` produces deterministic `CIIWorkspaceLandmarkSuggestion.v1` records from CII graph evidence:
- BRANCH;
- RIGID_ADJACENT;
- SIZE_TRANSITION;
- TERMINAL;
- BEND_ADJACENT;
- NAMED_NODE.

Every computed record is:
```text
status = SUGGESTED
authority = EVIDENCE_ONLY_ENGINEER_LOCK_REQUIRED
```

It can never create `LOCKED`. The shell now lets the engineer inspect both models and see summaries + suggested landmarks before entering the manual SOURCE/TARGET locked-anchor pairs.

### Stage 04 — review lifecycle and stale-state invalidation
A test-only minimal DOM harness exercises the actual new installer/shell without adding npm dependencies or editing package/workflow files:
- exactly one tile when installer invoked;
- all seven stages visible;
- Stage06 disabled;
- model inspection + suggested landmarks;
- manual locked anchors;
- analysis;
- engineer ACCEPT;
- refresh to preview-only transfer;
- CSV/JSON export;
- close/destroy;
- reopen;
- uninstall.

Changing locked anchors invalidates review/export state. Changing either CII file additionally clears previous landmark evidence. Stale review decisions cannot remain actionable against new inputs.

### Stage 05 — rigid custody
Unique supportable terminal RIGID records on SOURCE and TARGET produce reviewed `RIGID_COMPONENT` weight preview. Ambiguous rigid evidence stays unpromoted and fail-closed.

### Stage 07 — deterministic explainable audit exports
Correspondence CSV now includes:
- kind;
- operation (`MATCH`, `INSERT_TARGET`, `DELETE_SOURCE`, `SOURCE_1_TO_TARGET_N`);
- confidence;
- source / target;
- correspondence ID;
- authority;
- review decision;
- serialized evidence;
- transfer properties;
- transfer custodies;
- transfer statuses;
- blockers.

Same input state produces identical CSV and audit JSON bytes. `modifiedTargetCii` remains `null`; audit retains Stage06 `NOT_IMPLEMENTED`.

## 4. Fresh Validation Ledger

```text
VAL-301 PASS — all new/changed CII Workspace JS in disposable validation slice parses with node --check
VAL-302 PASS — every CII Workspace JS module remains <300 physical lines
VAL-303 PASS — 15/15 focused executable tests
VAL-304 PASS — exact baseline path-aligner integration: topology/subdivision
VAL-305 PASS — exact baseline path-aligner integration: determinism
VAL-306 PASS — alternate route / anchor order / outside-span fail-closed topology gates
VAL-307 PASS — parser-backed real benchmark intake
VAL-308 BLOCKED_BY_AUTHORITY — output.cii zero-OD first element vs protected parser heuristic
VAL-309 PASS — deterministic evidence-only landmark suggestions; computed evidence never LOCKED
VAL-310 PASS — shell/installer lifecycle with inspection, review, transfer preview, export, destroy/reopen
VAL-311 PASS — file/anchor changes invalidate stale review/export custody
VAL-312 PASS — rigid component custody + ambiguity fail closed
VAL-313 PASS — enriched deterministic CSV + audit JSON; modified CII blocked
VAL-314 NOT_APPLICABLE — live Utilities registry integration under current owner scope
```

Focused executable PASS set:
1. `cii-workspace-nodename.test.js`
2. `cii-workspace-landmarks.test.js`
3. `cii-workspace-geometry-authority.test.js`
4. `cii-workspace-alignment-semantics.test.js`
5. `cii-workspace-topology.test.js`
6. `cii-workspace-topology-route-gates.test.js`
7. `cii-workspace-determinism.test.js`
8. `cii-workspace-gang-ambiguity.test.js`
9. `cii-workspace-hard-conflict.test.js`
10. `cii-workspace-transfer-preview.test.js`
11. `cii-workspace-transfer-review.test.js`
12. `cii-workspace-rigid-custody.test.js`
13. `cii-workspace-intake-benchmark-slice.test.js`
14. `cii-workspace-export-audit.test.js`
15. `cii-workspace-shell-lifecycle.test.js`

## 5. Authority / Containment Invariants

Current write scope remains only:
- new `tabs/cii-workspace/**` paths relative to baseline;
- new `tests/cii-workspace-*` paths;
- PR recovery records.

Protected read-only authorities remain:
- `parser/**`;
- `tabs/model-converters/**`;
- `tabs/revision-compare/**`;
- `xml-compare/**`;
- existing converters/writers/navigation;
- `tabs/psnm-utility-tab.js`.

No private XML `_buildAdjacency` clone, auto-registration, global hook, MutationObserver, alternate navigation entry, target-CII writer, hidden mutation token, or modified-CII download exists.

## 6. Remaining Work / Hard Stops

| ID | Severity | State | Item |
|---|---|---|---|
| AUTH-001 | high | **OWNER DECISION REQUIRED** | Zero/missing-OD neutral CII compatibility. Decide whether protected parser authority may change or whether an existing neutral-block primitive may be explicitly qualified for adapter use. |
| AUTH-002 | high | **OWNER DECISION REQUIRED** | Register `installCiiWorkspaceTile` in existing `tabs/psnm-utility-tab.js`. No alternate launcher is acceptable. |
| VAL-315 | low/medium | optional under current authority | Add broader real multi-branch/mixed-property CII pair corpus without changing authorities. |

## 7. Continuation Rules

```text
DO NOT patch parser/sections/elements.js under current authority.
DO NOT silently switch parser authority to output-normalizer.js.
DO NOT edit tabs/psnm-utility-tab.js without explicit owner authorization.
DO NOT invent a launcher bypass.
DO NOT implement target-CII mutation or modified-target export.
KEEP PR draft; merge remains owner-only.
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

Status: **CURRENT / QUALIFIED**. Issue #980 qualification was completed against `main` at `b0f13c99...`. GE-006 stays within the narrower owner instruction and converts the major new-file-only acceptance gaps into observed, fail-closed validation evidence.
