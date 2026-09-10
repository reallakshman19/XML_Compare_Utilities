ISSUE_CURRENT_STATE_VERSION: 3
CHAIN_ID: CSV-REV-COMPARE-1181
ISSUE_BASIS_ID: IB-CSV-REV-COMPARE-1181-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-CSVRC-0011
UPDATED_AT: 2026-09-10T22:32:17+04:00

# Original task / acceptance ledger

- TASK-001 | separate Utilities tile | MERGED — PR #1184
- TASK-002..TASK-006 | XML-first conversion/profile/parser/duplicate/parallel-list foundation | MERGED — PR #1184; parser physical-record integrity repaired in LEG-009
- TASK-007..TASK-013 | XML hierarchy, persistent identity, candidate outcomes/cardinality, semantic PIPE, coordinate frame, common-support topology | MERGED — PR #1184; audited lineage/common-support/candidate-authority defects repaired in LEG-009
- TASK-014..TASK-020 | component/load event semantics, structured event ledger, deterministic remarks, Hold exclusion and suppressed-field policy | MERGED — PR #1184; ambiguity event/output barrier and multiplicity fixes repaired in LEG-009
- TASK-021..TASK-024 | later-revision output/audit/staged UI/review | MERGED — PR #1184; review integrity/evidence and blocked-preview fixes repaired in LEG-009
- TASK-025 | owner benchmark behaviors | IN_PROGRESS — execute current repaired head Phase 1 `PS No. change` only; later buckets remain separate
- TASK-026 | surgical implementation/no competing authorities | REMEDIATED_PENDING_EXECUTION — existing XML Compare candidate-pair authority now supplies candidate pairs/IDs; no parallel `srcand:*` pair authority
- TASK-027 | owner-only merge | PRESERVED — PR #1188 draft; merge not authorized

# Owner benchmark authority — latest instruction

- Unique SupportLocation item = `CIVIL SECONDARY SUPPORT (Tag provided by Civil) + PIPE`; Civil alone is not unique and must not be used as support-location identity.
- PIPE may change across revisions only when stronger lineage evidence establishes continuity, such as persistent primary-support reference overlap plus corroboration.
- R3 `REMARKS (IF ANY)` may be used as benchmark/oracle labels only. Oracle text is removed from comparison input before execution.
- Unsupported/non-mechanically-verifiable labels such as HOLD/Hold Removed are excluded from benchmark scoring/evidence.
- Bucket order is mandatory and sequential:
  1. Phase 1 `PS No. change`
  2. Phase 2 `Support location change`
  3. Phase 3 `Load change`
  4. Phase 4 `Total no of support change`
- Current requested execution boundary: Phase 1 only, one bucket at a time.

# Phase 1 benchmark contract

- Input: `benchmarks/R2.zip` earlier, Git blob `e80acc441108fbf5bdb4639b5c9a94f292258e68`.
- Oracle/later: `benchmarks/R3.zip`, Git blob `fb1ecd917e083a9543e394cc23aa3f938d8d87fb`.
- Harness: `support-revision-phase1-benchmark/v1`, bucket `PS No. change`.
- Expected and detected keys are the composite `Civil + PIPE` SupportLocation identity.
- R3 remarks are read only to derive expected Phase-1 labels and then blanked before `runSupportRevisionCompare`.
- HOLD is not a Phase-1 failure/evidence token.
- Prior isolated run 34499007825 is evidence only for old head `d5b83646b29550ff6ee29b29c9b98c6ec0387c0c`: expected 1, detected 1, TP 1, FP 0, FN 0, precision/recall/F1 1.
- Prior oracle-positive composite key: `SL-111001(REF)||BWGA-1000-FL-8"-M1610003-(FL-07)`.
- The corresponding prior R2 source had the same Civil family but a different PIPE and was linked by persistent-reference overlap, demonstrating why Civil alone is not the identity key.

# Remediation LEG-009

- PREWORK_ENDPOINT: EP-CSVRC-0010
- MATERIAL_BASE: ccdda3a5f367ff93c76b81a6657f974a3ba6bcf8
- FIRST_MATERIAL: f9920395f832eff274f18b4d8d10e0346119b28f
- MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
- RECEIPT: agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-009.md
- Regression-first repairs cover TSV inch-mark parsing, ambiguity fail-closed gating, XML candidate-pair authority reuse, equal-count N->M, stricter common support, continuing-anchor semantics, target-side review collisions, duplicate persistent-reference multiplicity, persistent-reference coordinate anchors, stable duplicate-load identity, and review evidence UI.
- Current repaired head execution status remains NOT_RUN until the qualification workflow produces exact-head evidence.

# Input ledger

- INPUT-001 | Issue #1181 full specification | AVAILABLE
- INPUT-002 | Table-to-Categorized-XML contracts/tests | AVAILABLE
- INPUT-003 | XML Compare candidate/review contracts | AVAILABLE; canonical candidate-pair authority reused
- INPUT-004 | Owner real benchmark | AVAILABLE | `benchmarks/R2.zip` -> `benchmarks/R3.zip`
- INPUT-005 | Support Report export patterns | AVAILABLE

# Benchmark ledger

- PHASE-1 | `PS No. change` | CURRENT_REPAIRED_HEAD_NOT_RUN
  - current material head: `ad8f936665b8bd66c15101fa64297261cb6a13de`
  - exact next action: run real R2->R3 Phase-1 workflow and record composite-key TP/FP/FN
  - prior evidence: run 34499007825, expected=1 detected=1 TP=1 FP=0 FN=0; old-head evidence only
- PHASE-2 | `Support location change` | IMPLEMENTED_NOT_QUALIFIED / OUTSIDE_CURRENT_BUCKET
- PHASE-3 | `Load change` | NOT_STARTED
- PHASE-4 | `Total no of support change` | NOT_STARTED

# Current delivery status

ENGINEERING_STATE: PHASE1_QUALIFICATION_READY_AFTER_REMEDIATION
CUSTODY_STATE: HELD
WRITE_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_AUTHORIZED_ISSUE_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR: 1188
PR_STATUS: OPEN_DRAFT_MERGEABLE
BRANCH: issue-1181-phase1-current-main
ACTIVE_ENDPOINT: EP-CSVRC-0011
LATEST_MATERIAL_LEG: LEG-009
MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
MAIN_OBSERVED: 419c94cca7649626e0b3e641f20d5261967347ba
CURRENT_HEAD_VALIDATION: PHASE1_NOT_RUN
PRIOR_PHASE1_QUALIFICATION: PASS_EVIDENCE_ONLY
PHASE2_QUALIFICATION: NOT_RUN
QUESTION_SET: QS-CSVRC-1181-0001 CURRENT / REUSED
QUALIFICATION_SCOPE: QSCOPE-XMLCOMPARE-1181-CSV-XML-LINEAGE
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5615807778
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP0011_COMMENT_SYNC
QUALIFICATION_VEHICLE: PR #1187 is qualification-only, never delivery/merge
ENVIRONMENT_LIMITATION: local checkout cannot resolve github.com; direct workflow dispatch unavailable; existing qualification-only PR workflow may be reused without modifying workflow files
EXACT_NEXT_ACTION: execute only Phase 1 `PS No. change` on real R2.zip vs R3.zip against the repaired current branch, record expected/detected TP/FP/FN and exact composite Civil+PIPE keys. Do not begin or score Phase 2/3/4.