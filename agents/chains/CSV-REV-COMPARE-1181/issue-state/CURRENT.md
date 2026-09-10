ISSUE_CURRENT_STATE_VERSION: 3
CHAIN_ID: CSV-REV-COMPARE-1181
ISSUE_BASIS_ID: IB-CSV-REV-COMPARE-1181-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-CSVRC-0013
UPDATED_AT: 2026-09-10T23:14:13+04:00

# Original task / acceptance ledger

- TASK-001 | separate Utilities tile | MERGED — PR #1184
- TASK-002..TASK-006 | XML-first conversion/profile/parser/duplicate/parallel-list foundation | MERGED — PR #1184; parser physical-record integrity repaired in LEG-009
- TASK-007..TASK-013 | XML hierarchy, persistent identity, candidate outcomes/cardinality, semantic PIPE, coordinate frame, common-support topology | MERGED — PR #1184; audited lineage/common-support/candidate-authority defects repaired in LEG-009
- TASK-014..TASK-020 | component/load event semantics, structured event ledger, deterministic remarks, Hold exclusion and suppressed-field policy | MERGED — PR #1184; ambiguity event/output barrier and multiplicity fixes repaired in LEG-009
- TASK-021..TASK-024 | later-revision output/audit/staged UI/review | MERGED — PR #1184; review integrity/evidence and blocked-preview fixes repaired in LEG-009
- TASK-025 | owner benchmark behaviors | IN_PROGRESS — Phase 1 and Phase 2 qualified; Phase 3 `Load change` authorized and in pre-work/qualification
- TASK-026 | surgical implementation/no competing authorities | REMEDIATED_AND_REGRESSION_QUALIFIED — existing XML Compare candidate-pair authority supplies candidate pairs/IDs; no parallel `srcand:*` pair authority
- TASK-027 | owner-only merge | PRESERVED — PR #1188 draft; merge not authorized

# Owner benchmark authority

- Unique SupportLocation item = `CIVIL SECONDARY SUPPORT (Tag provided by Civil) + PIPE`; Civil alone is not unique and must not be used as support-location identity.
- PIPE may change across revisions only when stronger lineage evidence establishes continuity, such as persistent primary-support reference overlap plus corroboration.
- R3 `REMARKS (IF ANY)` may be used as benchmark/oracle labels only. Oracle text is removed from comparison input before execution.
- Unsupported/non-mechanically-verifiable labels such as HOLD/Hold Removed are excluded from benchmark scoring/evidence.
- Bucket order is mandatory and sequential: Phase 1 `PS No. change`; Phase 2 `Support location change`; Phase 3 `Load change`; Phase 4 `Total no of support change`.
- Owner `proceed next` at 2026-09-10T19:14:13Z / 23:14:13+04:00 authorizes Phase 3 only. Phase 4 remains not authorized.

# Remediation LEG-009

- PREWORK_ENDPOINT: EP-CSVRC-0010
- MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
- RECEIPT: agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-009.md
- Regression-first repairs cover TSV inch-mark parsing, ambiguity fail-closed gating, XML candidate-pair authority reuse, equal-count N->M, stricter common support, continuing-anchor semantics, target-side review collisions, duplicate persistent-reference multiplicity, persistent-reference coordinate anchors, stable load-slot identity, and review evidence UI.

# Qualification evidence

QUALIFICATION_RUN: 34515414467
QUALIFICATION_JOB: phase1 / 102999470261
QUALIFICATION_CONCLUSION: SUCCESS
QUALIFICATION_VEHICLE: PR #1189 / `issue-1181-remediation-qualification` — qualification-only, never delivery/merge
DELIVERY_MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
PRODUCTION_EQUIVALENCE: PROVEN_FOR_TABS_AND_XML_COMPARE

# Benchmark ledger

- PHASE-1 | `PS No. change` | PASS
  - real `R2.zip -> R3.zip`: compareStage `READY_TO_EXPORT`, expected=1, detected=1, TP=1, FP=0, FN=0, precision=1, recall=1, F1=1
  - TP composite key: `SL-111001(REF)||BWGA-1000-FL-8"-M1610003-(FL-07)`
  - R3 `Hold removed` excluded from evidence/scoring
- PHASE-2 | `Support location change` | PASS_WITH_REAL_ORACLE_NEGATIVE_CONTROL_AND_DEDICATED_POSITIVE_REGRESSION
  - focused executable contract regression: PASS
  - real `R2.zip -> R3.zip`: expected=0, detected=0, FP=0, FN=0; real data used as negative control only
- PHASE-3 | `Load change` | AUTHORIZED_PREWORK
  - pre-work endpoint: EP-CSVRC-0013
  - hypothesis: existing versioned load comparator/event ledger is sufficient; begin qualification-first
  - expected keys: later-revision composite Civil+PIPE identity from mechanically checkable R3 load-change remarks
  - detector: typed load events (`LOAD_BECAME_NUMERIC`, `LOAD_SIGNATURE_CHANGED`) on accepted XML lineage; generated remarks are not detector authority
  - duplicate load headings align by stable `columnId`/column ordinal; numeric deltas use `SUPPORT_REV_LOAD_POLICY_V1`
  - R3 remarks blanked before production comparison; HOLD excluded
  - Phase 1 and Phase 2 retained as regression guards
  - real benchmark: NOT_RUN
- PHASE-4 | `Total no of support change` | NOT_STARTED_NOT_AUTHORIZED

# Phase 3 hypothesis / falsifier

HYPOTHESIS: no production load-semantics change is required; Phase 3 can be qualified by adding a benchmark harness and focused regressions around existing load/event authorities.
FALSIFIER: real R2->R3 oracle mismatch or focused regression failure in stable-column alignment, numeric/symbolic state classification, tolerance handling, duplicate-heading handling, or structural-lineage load comparison.
PATCH_RULE: if falsified, patch only the smallest owning load/event seam after recording a failing regression; do not alter oracle expectations to match production output.

# Current delivery status

ENGINEERING_STATE: PHASE3_LOAD_CHANGE_PREWORK
CUSTODY_STATE: HELD
WRITE_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_AUTHORIZED_PHASE3_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR: 1188
PR_STATUS: OPEN_DRAFT_MERGEABLE
BRANCH: issue-1181-phase1-current-main
ACTIVE_ENDPOINT: EP-CSVRC-0013
LATEST_MATERIAL_LEG: LEG-009
MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
MAIN_OBSERVED: 419c94cca7649626e0b3e641f20d5261967347ba
CURRENT_HEAD_VALIDATION: PHASE1_PASS_PHASE2_PASS_PHASE3_NOT_RUN
PHASE1_QUALIFICATION: PASS
PHASE2_QUALIFICATION: PASS_WITH_NONVACUOUS_REGRESSION
PHASE3_QUALIFICATION: NOT_RUN
PHASE4_QUALIFICATION: NOT_STARTED_NOT_AUTHORIZED
QUESTION_SET: QS-CSVRC-1181-0001 CURRENT / REUSED
QUALIFICATION_SCOPE: QSCOPE-XMLCOMPARE-1181-CSV-XML-LINEAGE
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5615807778
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5623990967
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP0013_COMMENT_SYNC
QUALIFICATION_VEHICLE: PR #1189 remains qualification-only and must never be merged as delivery
ENVIRONMENT_LIMITATION: local checkout previously could not resolve github.com; existing qualification-only workflow lane may be reused without workflow mutation
EXACT_NEXT_ACTION: author the Phase-3 `Load change` benchmark module and focused regressions first, preserving typed load events as detector authority and R3 remarks as stripped oracle-only labels. Execute real R2.zip->R3.zip through the existing qualification-only lane. If falsified, remain in Phase 3 and repair only the isolated load/event defect. Do not begin Phase 4 and do not merge PR #1188 without explicit Owner authority.