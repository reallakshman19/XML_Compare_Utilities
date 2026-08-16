# PR981 — CII Workspace V1 Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION_TAKEOVER
PR_RECOVERY_STATE: HARDENED_NEW_FILE_CORE / VALIDATION_REQUIRED
TAKEOVER_AUTHORITY: WRITE_ALLOWED (NEW FILES ONLY)
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/XML_Compare_Utilities
SOURCE_TASK: Issue #980
PR_OR_WIP: PR981
BRANCH: agent/issue-980-cii-workspace-v1
MAIN_HEAD_LAST_CHECKED: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
MERGE_BASE: b0f13c99e036c590a281e2d10bd2b7f0d64e58eb
APPENDIX_A_STATUS: OWNER RECORDED QUALIFIED ON ISSUE #980
GROUNDING_EPOCH: GE-007 POST-AUDIT HARDENING
CURRENT_STAGE: NEW-FILE IMPLEMENTATION HARDENED; CURRENT HEAD REQUIRES FRESH EXECUTION VALIDATION
CURRENT_BLOCKERS:
- Stage01 zero/missing-OD compatibility: repository output.cii is rejected by protected parser/sections/elements.js element-start heuristic.
- Live Utilities registration: requires protected tabs/psnm-utility-tab.js edit.
- Fresh post-hardening execution evidence is not available from this connector-only environment; no GitHub Actions run is attached to the current head.
EXACT_NEXT_ACTION: run the full CII Workspace test set plus Issue #980 T1-T12 regressions in an authenticated checkout/CI, classify every oracle, then resolve only the remaining protected parser/Utilities decisions with owner authority.
```

## 2. Why the prior percentages were retired

The previous report used self-assigned percentages and a `15/15 focused executable tests PASS` headline. A fresh audit found that those numbers obscured mandatory Issue #980 gaps: candidate winner-gap evidence, true permutation invariance, review identity binding, explicit component correspondence, one-anchor behavior, and the difference between selected focused tests and the full required oracle.

GE-007 therefore removes percentages as the primary readiness signal. The prior 15-test execution is inherited historical evidence only; it predates the hardening changes below and must not be represented as validation of the current head.

## 3. Current acceptance matrix

| Area | Implementation state | Current evidence | Remaining |
|---|---|---|---|
| Intake / SHA / model summary | IMPLEMENTED for parser-supported neutral CII | code inspected; prior benchmark evidence inherited | root `output.cii` zero-OD parser-authority blocker; fresh run required |
| NODENAME fixed-width custody | HARDENED | raw ELEMENTS blocks now bind to parsed elements by FROM/TO identity rather than parsed ordinal | execute normal/conflict/skipped-raw-block fixtures |
| Manual anchors | HARDENED | `CIIWorkspaceAnchor.v1`; one or more locked pairs supported | fresh shell/core execution |
| Geometry authority | IMPLEMENTED | one/two anchors remain underdetermined; 3+ non-collinear registration remains bounded | execute coordinate-invariance fixture |
| Path/topology reuse | HARDENED | protected `buildElementPaths`, `scorePathMatch`, `alignElementSequence`, and `alignElementPaths` are consumed read-only | fresh production-path regression execution |
| Candidate ambiguity | HARDENED | bounded alternatives, winner/runner-up gap, thresholds, reasons and audit-visible alternatives | execute adversarial gang fixture and larger real pairs |
| Neighbourhood evidence | HARDENED | deterministic 1/2/3-hop degree/component/OD context | fresh fixture execution |
| Structural contradictions | HARDENED | branch, rigid-kind, size-transition-context and gross OD incompatibility fail closed | fresh contradiction suite |
| Determinism | HARDENED | element IDs no longer derive from parser record index; test now permutes source/target record order | execute permutation test and byte-identical audit check |
| Target custody | HARDENED | duplicate target element claims are retained as conflicts | execute one-anchor/global custody fixture |
| NODE custody | HARDENED | ambiguous adjacent element evidence downgrades non-locked node custody to REVIEW; LOCKED rows deduplicate and win authority | fresh execution |
| ELEMENT/PATH custody | IMPLEMENTED / HARDENED | 1->N subdivision plus candidate evidence; reducer context blocks subdivision transfer semantics | fresh execution |
| COMPONENT custody | HARDENED | explicit `COMPONENT` rigid correspondence exists separately from element rows | terminal-rigid slice only; broader interior rigid semantics remain conservative/unresolved |
| Review authority | HARDENED | `CIIWorkspaceReviewLedger.v1` binds source SHA, target SHA, anchors and full correspondence/evidence identity | execute stale-source/target/correspondence tests |
| Transfer preview | HARDENED | NodeName, P1/T1 and rigid weight require appropriate reviewed custody; reducer paths split/block; non-ready correspondence blocks plan | fresh execution |
| Stage 06 placeholder | IMPLEMENTED / FAIL-CLOSED | no writer or modified-CII export added | fresh placeholder regression |
| Audit / CSV | HARDENED | NODE + ELEMENT/PATH + COMPONENT evidence/custody exported; modified target remains null | fresh byte-determinism execution |
| Live Utilities placement | BLOCKED_BY_AUTHORITY | installer exists but is intentionally not registered | owner authorization for one `tabs/psnm-utility-tab.js` edit |
| XML topology regression | NOT_RUN for GE-007 | protected files not modified | execute existing XML topology/path fixtures |
| Revision Compare regression | NOT_RUN for GE-007 | protected files not modified | execute existing Revision Compare suite |

## 4. GE-007 hardening changes

### Candidate and path authority

- Added `CIIWorkspaceCandidateEvidence.v1` with bounded candidates, winner/runner-up scores, explicit winner gap, threshold, reasons, and deterministic ordering.
- Added read-only reuse of production `alignElementPaths()` for whole-path candidate/winner-gap audit evidence instead of relying only on one sequence alignment.
- Locked-span matching still uses the production sequence aligner but now attaches candidate-alternative evidence and retains ambiguity.
- Added target-custody conflict detection rather than allowing two source rows to silently claim one target.

### Evidence and hard conflicts

- Replaced placeholder `pathSequence: 0` and `rigidLength: 0` with actual evidence.
- Added deterministic multi-hop neighbourhood context through three hops.
- Added fail-closed size-transition context and gross-OD contradictions; aggregate score cannot rescue those conflicts.
- Path station evidence now normalizes both CII locked-span and reused production path-authority representations.

### Determinism

- CII topology element IDs are canonicalized from engineering content rather than parser record index.
- The determinism test now shuffles SOURCE and TARGET record order instead of merely running the same ordered input twice.
- Final correspondence identity is bound to source/target content hashes, anchors, row status/authority and evidence material.

### Review and transfer custody

- Added `CIIWorkspaceAnchor.v1`, `CIIWorkspaceReviewLedger.v1`, and `CIIWorkspaceCandidateEvidence.v1` contracts required by Issue #980.
- Review decisions are fail-closed unless bound to current source SHA, target SHA and correspondence identity.
- Node custody is downgraded when adjacent element correspondence remains ambiguous.
- Added explicit `COMPONENT` rows for supportable rigid correspondence. Rigid-weight preview now requires review of a COMPONENT row, not a rigid-looking element row.
- P1/T1 preview blocks reducer/size-transition paths and records a split-required blocker.
- A transfer plan cannot be preview-ready when correspondence itself is not READY or when every proposed operation is blocked.

### One-anchor workflow and UI review

- One locked anchor pair is now accepted as authority. It can bound local candidates but does not establish registered geometry or automatically create HIGH confidence; inferred rows remain review-gated unless evidence independently clears the high threshold.
- The review UI now exposes serialized evidence and candidate alternatives and includes COMPONENT rows.
- Model inspection shows node/element/bend/rigid summary counts.

### CII fixed-format NODENAME hardening

The previous NODENAME adapter assumed `parsed.elements[index]` corresponded to raw ELEMENTS block `index`. That assumption is unsafe when the protected parser skips a raw block, such as a zero-OD row. The adapter now reads raw fixed-format blocks, records FROM/TO + pointer identity, and maps each parsed element back to its matching raw block. A new fixture covers a skipped first raw element so the surviving element cannot inherit the wrong NODENAME pointer.

## 5. Validation ledger — current head

```text
GE007-VAL-001 PASS (INSPECTION) — GitHub compare remains based on b0f13c99; all changed paths are additions, no protected existing production file was modified.
GE007-VAL-002 PASS (INSPECTION) — every added CII Workspace JS file is below the repository's 300-physical-line limit in the compare metadata.
GE007-VAL-003 NOT_RUN — current hardened CII Workspace test set; connector environment has no local gh/authenticated checkout and current head has no GitHub Actions run.
GE007-VAL-004 NOT_RUN — permutation-invariance executable oracle.
GE007-VAL-005 NOT_RUN — adversarial gang/winner-gap executable oracle.
GE007-VAL-006 NOT_RUN — coordinate translation/rotation correspondence-invariance oracle.
GE007-VAL-007 NOT_RUN — bound review / stale-identity executable oracle.
GE007-VAL-008 NOT_RUN — explicit rigid COMPONENT custody executable oracle.
GE007-VAL-009 NOT_RUN — shell lifecycle against hardened review contract.
GE007-VAL-010 BLOCKED_BY_AUTHORITY — root output.cii first element has zero OD and protected parser/sections/elements.js rejects it under the current element-start heuristic.
GE007-VAL-011 NOT_RUN — existing XML topology/path regression suite.
GE007-VAL-012 NOT_RUN — existing Revision Compare regression suite.
GE007-VAL-013 BLOCKED_BY_AUTHORITY — live Utilities registry integration.
```

Oracle policy: do not promote any GE-007 NOT_RUN item to PASS from code inspection. The pre-GE-007 `15/15` result is stale after implementation changes and is not the current validation state.

## 6. Authority / containment invariants

Current write scope remains only:
- new `tabs/cii-workspace/**` paths relative to baseline;
- new `tests/cii-workspace-*` paths;
- PR recovery/status/claim records that were already new in this PR.

Protected read-only authorities remain untouched:
- `parser/**`;
- `tabs/model-converters/**`;
- `tabs/revision-compare/**`;
- `xml-compare/**`;
- existing converters/writers/navigation;
- `tabs/psnm-utility-tab.js`.

No alternate launcher, global hook, MutationObserver, target-CII writer, hidden mutation token, or modified-CII download was added.

## 7. Remaining hard stops / follow-up

| ID | State | Item |
|---|---|---|
| VAL-001 | REQUIRED | Execute all current CII Workspace tests in one real checkout and record exact commands/results. |
| VAL-002 | REQUIRED | Execute Issue #980 T11 XML topology regression and T12 Revision Compare regression. |
| VAL-003 | REQUIRED | Reconcile any failing old tests whose oracle encoded superseded behavior; do not weaken acceptance semantics to make them green. |
| AUTH-001 | OWNER DECISION REQUIRED | Decide zero/missing-OD neutral CII parsing authority; do not silently switch to a second parser. |
| AUTH-002 | OWNER DECISION REQUIRED | Authorize the single Utilities registry edit required for live `Utilities -> CII Workspace`. |
| RIGID-001 | REVIEW | Broader interior-rigid CII ownership remains unresolved unless authoritative parser/component semantics support it; current adapter deliberately fails closed outside the supportable unique-terminal slice. |

## 8. Continuation rules

```text
DO NOT patch parser/sections/elements.js without explicit owner authority.
DO NOT silently promote output-normalizer.js to parsing authority.
DO NOT edit tabs/psnm-utility-tab.js without explicit owner authorization.
DO NOT invent another launcher.
DO NOT implement target-CII mutation or modified-target export.
DO NOT restore percentage-based readiness or claim stale 15/15 validation for the hardened head.
KEEP PR DRAFT; merge remains owner-only.
```

# APPENDIX A — qualification provenance

GitHub Issue #980 contains an owner-authored `QUALIFIED` marker before the implementation commits. The issue does not itself contain the five scored screening answers required by the original text; treat the owner's recorded qualification as the authority marker, not as evidence that the full scoring trail is present in the issue discussion.
