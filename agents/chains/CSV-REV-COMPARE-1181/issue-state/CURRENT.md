ISSUE_CURRENT_STATE_VERSION: 3
CHAIN_ID: CSV-REV-COMPARE-1181
ISSUE_BASIS_ID: IB-CSV-REV-COMPARE-1181-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-CSVRC-0010
UPDATED_AT: 2026-09-10T21:50:04+04:00

# Original task / acceptance ledger

- TASK-001 | separate Utilities tile | MERGED — PR #1184
- TASK-002..TASK-006 | XML-first conversion/profile/parser/duplicate/parallel-list foundation | MERGED — PR #1184; audit remediation active for parser physical-record integrity
- TASK-007..TASK-013 | XML hierarchy, persistent identity, candidate outcomes/cardinality, semantic PIPE, coordinate frame, common-support topology | MERGED — PR #1184; P0/P1 lineage/common-support/candidate-authority remediation authorized in PR #1188
- TASK-014..TASK-020 | component/load event semantics, structured event ledger, deterministic remarks, Hold exclusion and suppressed-field policy | MERGED — PR #1184; P0/P1 ambiguity/event gating remediation authorized in PR #1188
- TASK-021..TASK-024 | later-revision output/audit/staged UI/review | MERGED — PR #1184; provisional-output/review-integrity remediation authorized in PR #1188
- TASK-025 | owner benchmark behaviors | IN_PROGRESS — Phase 1 has isolated real evidence; Phase 2 implementation/benchmark harness authored but current-head execution NOT_RUN; Phases 3..4 not started
- TASK-026 | surgical implementation/no competing authorities | REMEDIATION_IN_PROGRESS — audit found candidate-scoring/decision authority duplication to be consolidated onto existing XML Compare candidate/review authority
- TASK-027 | owner-only merge | PRESERVED — PR #1188 draft; merge not authorized

# Owner post-merge rules

- SUPPORT_LOCATION_IDENTITY = `CIVIL SECONDARY SUPPORT (Tag provided by Civil) + PIPE`; Civil alone is not a unique item.
- PIPE may change across revisions; continuity then requires stronger lineage evidence such as persistent primary-support references plus corroboration.
- PREV NAME carries explicit supporting weight but cannot establish lineage alone.
- SIZE (BORE) must be compatible for approximate lineage; a known mismatch hard-rejects the candidate.
- Coordinate deltas are auditable weighted evidence only after a trustworthy revision frame from >=3 anchors and >=2 validated axes.
- R3 remarks are benchmark oracle labels only and are removed from comparison input. Unsupported labels such as HOLD are excluded from scoring.
- Benchmark sequence: Phase 1 `PS No. change`; Phase 2 `Support location change`; Phase 3 `Load change`; Phase 4 `Total no of support change`.

# Owner audit-remediation instruction

- 2026-09-10T21:50:04+04:00 exact progression command: `proceed next`.
- Owner explicitly authorized fixing the audited implementation flaws before further phase progression and pinned Common protocol `engineering-pr-delivery-v2` at `af4c5c73b87b26187aa6c930b60172cbb1f0f3e2`.
- This bounded repair leg does not begin Phase 3, mutate benchmark/oracle authority, modify workflows, or authorize merge.
- P0/P1 repair targets: parser inch-mark physical-record integrity; ambiguity hard barrier before events/output; single candidate/review authority; common-support cardinality/anchor semantics; review one-to-one conflict integrity; persistent-reference multiplicity; persistent-reference coordinate-frame anchors.

# Phase 2 implementation contract

- Relocation is state after a lineage edge is accepted; relocation evidence never creates identity.
- Ordinary 1->1 relocation event: `SUPPORT_LOCATION_RELOCATED`.
- Common-support anchor relocation remains `COMMON_SUPPORT_ANCHOR_RELOCATED` and additionally requires persistent-reference continuity.
- Both require coordinate classification `ACTUAL_POSITION_CHANGED` under a trusted frame with `scoreFrameUsable`, >=3 anchors and >=2 validated axes.
- `FORMAT_CHANGED`, `ROUNDING_ONLY`, raw sign/text deltas, and movement under an under-anchored frame do not produce relocation remarks.
- Human projection for proven relocation is `Relocated Support`.
- Phase 2 benchmark strips remarks from R2 and R3 before engine execution, derives expected labels only from R3 oracle remarks, and includes Phase 1 metrics as a regression gate.

# Input ledger

- INPUT-001 | Issue #1181 full specification | AVAILABLE
- INPUT-002 | Table-to-Categorized-XML contracts/tests | AVAILABLE
- INPUT-003 | XML Compare candidate/review contracts | AVAILABLE; `XmlCompareCandidatePairModel` reuse required as production authority
- INPUT-004 | Owner real benchmark | AVAILABLE | `benchmarks/R2.zip` earlier vs `benchmarks/R3.zip` later
- INPUT-005 | Support Report export patterns | AVAILABLE

# Benchmark ledger

- PHASE-1 | `PS No. change` | PRIOR_ISOLATED_PASS / CURRENT_HEAD_NOT_RUN
  - prior evidence: GitHub Actions run 34499007825, head d5b83646b29550ff6ee29b29c9b98c6ec0387c0c
  - real R2->R3: expected 1; detected 1; TP 1; FP 0; FN 0; precision 1; recall 1; F1 1
  - exact PR #1188 current-head execution: NOT_RUN
- PHASE-2 | `Support location change` | IMPLEMENTED_NOT_QUALIFIED
  - material head: 7e3732be5a2ac0cd97acdc2a1a3d1a7b5de52c51
  - focused positive/negative fixture authored; executable status NOT_RUN
  - real R2.zip -> R3.zip benchmark harness authored; real execution NOT_RUN
  - Phase 1 guard included in the Phase 2 runner
- REMEDIATION-P0P1 | audited correctness repair | PREWORK_READY / TESTS_NOT_RUN
  - pre-work endpoint: EP-CSVRC-0010
  - regression tests must be authored before production behavior changes
  - executable local validation unavailable because github.com DNS resolution fails in the current environment
- PHASE-3 | `Load change` | NOT_STARTED / DEFERRED_UNTIL_REMEDIATION_AND_PHASE2_QUALIFICATION
- PHASE-4 | `Total no of support change` | NOT_STARTED

# Current delivery status

ENGINEERING_STATE: P0P1_REMEDIATION_PREWORK_READY
CUSTODY_STATE: HELD
WRITE_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_AUTHORIZED_ISSUE_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR: 1188
PR_STATUS: OPEN_DRAFT_MERGEABLE
BRANCH: issue-1181-phase1-current-main
PREWORK_HEAD: 0337147dd6a20fc925aed5a383a111064f8bae4e
MATERIAL_HEAD: 7e3732be5a2ac0cd97acdc2a1a3d1a7b5de52c51
MAIN_OBSERVED: 419c94cca7649626e0b3e641f20d5261967347ba
LATEST_MATERIAL_LEG: LEG-008
CURRENT_HEAD_VALIDATION: NOT_RUN
PRIOR_PHASE1_QUALIFICATION: PASS_EVIDENCE_ONLY
PHASE2_QUALIFICATION: NOT_RUN
QUESTION_SET: QS-CSVRC-1181-0001 CURRENT / REUSED
QUALIFICATION_SCOPE: QSCOPE-XMLCOMPARE-1181-CSV-XML-LINEAGE
TAKEOVER_QUALIFICATION_READY: TRUE
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5623086351
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5615807778
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
CONTROL_PLANE_RECOVERY: PR #1187/stale salvage history remains evidence-only; clean delivery and remediation work are on PR #1188
ENVIRONMENT_LIMITATION: connector exposes no workflow-dispatch action; local checkout still fails because github.com cannot resolve; workflow files remain unmodified without owner authorization
LOCAL_BACKUP_WORKLOG_DEFICIT: connector-only edits have Git blob pre-images but repository-local backup/.agent-worklogs cannot be created without an executable checkout
EXACT_NEXT_ACTION: author failing regression tests for the audited P0/P1 defects before production fixes, then patch the smallest owning seams. Do not begin Phase 3 or modify workflows.
