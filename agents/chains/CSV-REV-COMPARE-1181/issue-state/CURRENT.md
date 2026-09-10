ISSUE_CURRENT_STATE_VERSION: 3
CHAIN_ID: CSV-REV-COMPARE-1181
ISSUE_BASIS_ID: IB-CSV-REV-COMPARE-1181-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-CSVRC-0012
UPDATED_AT: 2026-09-10T22:58:31+04:00

# Original task / acceptance ledger

- TASK-001 | separate Utilities tile | MERGED — PR #1184
- TASK-002..TASK-006 | XML-first conversion/profile/parser/duplicate/parallel-list foundation | MERGED — PR #1184; parser physical-record integrity repaired in LEG-009
- TASK-007..TASK-013 | XML hierarchy, persistent identity, candidate outcomes/cardinality, semantic PIPE, coordinate frame, common-support topology | MERGED — PR #1184; audited lineage/common-support/candidate-authority defects repaired in LEG-009
- TASK-014..TASK-020 | component/load event semantics, structured event ledger, deterministic remarks, Hold exclusion and suppressed-field policy | MERGED — PR #1184; ambiguity event/output barrier and multiplicity fixes repaired in LEG-009
- TASK-021..TASK-024 | later-revision output/audit/staged UI/review | MERGED — PR #1184; review integrity/evidence and blocked-preview fixes repaired in LEG-009
- TASK-025 | owner benchmark behaviors | IN_PROGRESS — Phase 1 and Phase 2 qualified; Phase 3 awaits explicit Owner progression
- TASK-026 | surgical implementation/no competing authorities | REMEDIATED_AND_REGRESSION_QUALIFIED — existing XML Compare candidate-pair authority supplies candidate pairs/IDs; no parallel `srcand:*` pair authority
- TASK-027 | owner-only merge | PRESERVED — PR #1188 draft; merge not authorized

# Owner benchmark authority

- Unique SupportLocation item = `CIVIL SECONDARY SUPPORT (Tag provided by Civil) + PIPE`; Civil alone is not unique and must not be used as support-location identity.
- PIPE may change across revisions only when stronger lineage evidence establishes continuity, such as persistent primary-support reference overlap plus corroboration.
- R3 `REMARKS (IF ANY)` may be used as benchmark/oracle labels only. Oracle text is removed from comparison input before execution.
- Unsupported/non-mechanically-verifiable labels such as HOLD/Hold Removed are excluded from benchmark scoring/evidence.
- Bucket order is mandatory and sequential:
  1. Phase 1 `PS No. change`
  2. Phase 2 `Support location change`
  3. Phase 3 `Load change`
  4. Phase 4 `Total no of support change`
- Owner `proceed next` at 2026-09-10T22:58:31+04:00 authorized Phase 2 only. That command is consumed; Phase 3 requires a new explicit progression command.

# Remediation LEG-009

- PREWORK_ENDPOINT: EP-CSVRC-0010
- MATERIAL_BASE: ccdda3a5f367ff93c76b81a6657f974a3ba6bcf8
- FIRST_MATERIAL: f9920395f832eff274f18b4d8d10e0346119b28f
- MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
- RECEIPT: agents/chains/CSV-REV-COMPARE-1181/material-legs/LEG-009.md
- Regression-first repairs cover TSV inch-mark parsing, ambiguity fail-closed gating, XML candidate-pair authority reuse, equal-count N->M, stricter common support, continuing-anchor semantics, target-side review collisions, duplicate persistent-reference multiplicity, persistent-reference coordinate anchors, stable duplicate-load identity, and review evidence UI.

# Qualification evidence

QUALIFICATION_RUN: 34515414467
QUALIFICATION_JOB: phase1 / 102999470261
QUALIFICATION_CONCLUSION: SUCCESS
QUALIFICATION_VEHICLE: PR #1189 / `issue-1181-remediation-qualification` — qualification-only, never delivery/merge
DELIVERY_MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
DELIVERY_TABS_TREE: 231f54acf3fda90cd4bf302c8525d91619fa537a
QUALIFICATION_TABS_TREE: 231f54acf3fda90cd4bf302c8525d91619fa537a
DELIVERY_XML_COMPARE_TREE: 81454dc7f1ad9947767847d2269877bef68c6f4a
QUALIFICATION_XML_COMPARE_TREE: 81454dc7f1ad9947767847d2269877bef68c6f4a
PRODUCTION_EQUIVALENCE: PROVEN_FOR_TABS_AND_XML_COMPARE

# Benchmark ledger

- PHASE-1 | `PS No. change` | PASS
  - real `R2.zip -> R3.zip`: compareStage `READY_TO_EXPORT`, expected=1, detected=1, TP=1, FP=0, FN=0, precision=1, recall=1, F1=1
  - TP composite key: `SL-111001(REF)||BWGA-1000-FL-8"-M1610003-(FL-07)`
  - R3 `Hold removed` excluded from evidence/scoring
- PHASE-2 | `Support location change` | PASS_WITH_REAL_ORACLE_NEGATIVE_CONTROL_AND_DEDICATED_POSITIVE_REGRESSION
  - focused executable contract regression: PASS
  - positive proof: accepted common-support `1->N` topology + retained persistent ref + trusted coordinate frame emits exactly one `COMMON_SUPPORT_ANCHOR_RELOCATED` / `Relocated Support`
  - negatives: ordinary 1->1 drift, unchanged common anchor, row reorder, under-anchored frame and sign-format-only changes do not create relocation remarks; unresolved structural ambiguity blocks operational events/export
  - real `R2.zip -> R3.zip`: expected=0, detected=0, FP=0, FN=0; therefore real data is a negative control, not the sole positive proof
  - benchmark coordinate frame: 23 anchors, overall `SOLVED`, basis `UNIQUE_SUPPORT_LOCATION_IDENTITY+UNIQUE_PERSISTENT_REFERENCE_SET`; Y/Z validated, X high residual; scoreFrameUsable=true
- PHASE-3 | `Load change` | NOT_STARTED_AWAITING_OWNER_PROGRESSION
- PHASE-4 | `Total no of support change` | NOT_STARTED

# Current delivery status

ENGINEERING_STATE: PHASE2_QUALIFIED_PHASE3_GATED
CUSTODY_STATE: HELD
WRITE_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_AUTHORIZED_ISSUE_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR: 1188
PR_STATUS: OPEN_DRAFT_MERGEABLE
BRANCH: issue-1181-phase1-current-main
ACTIVE_ENDPOINT: EP-CSVRC-0012
LATEST_MATERIAL_LEG: LEG-009
MATERIAL_HEAD: ad8f936665b8bd66c15101fa64297261cb6a13de
MAIN_OBSERVED: 419c94cca7649626e0b3e641f20d5261967347ba
CURRENT_HEAD_VALIDATION: PHASE1_PASS_PHASE2_PASS_PRODUCTION_EQUIVALENT_EXECUTION
PHASE1_QUALIFICATION: PASS
PHASE2_QUALIFICATION: PASS_WITH_NONVACUOUS_REGRESSION
PHASE3_QUALIFICATION: NOT_STARTED
QUESTION_SET: QS-CSVRC-1181-0001 CURRENT / REUSED
QUALIFICATION_SCOPE: QSCOPE-XMLCOMPARE-1181-CSV-XML-LINEAGE
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5615807778
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP0012_COMMENT_SYNC
ENVIRONMENT_LIMITATION: local checkout cannot resolve github.com; successful execution was obtained through existing qualification-only workflow without workflow mutation
EXACT_NEXT_ACTION: stop at Phase 2. Await a new explicit Owner progression command before beginning Phase 3 `Load change`; before any Phase-3 production mutation, establish the required v2 pre-work endpoint and Issue checkpoint. Do not merge PR #1188 without explicit Owner merge authority.