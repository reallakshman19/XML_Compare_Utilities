ISSUE_CURRENT_STATE_VERSION: 2
CHAIN_ID: CSV-REV-COMPARE-1181
ISSUE_BASIS_ID: IB-CSV-REV-COMPARE-1181-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-CSVRC-0008
UPDATED_AT: 2026-09-10T20:23:40+04:00

# Original task / acceptance ledger

- TASK-001 | separate Utilities tile | MERGED — PR #1184
- TASK-002..TASK-006 | XML-first conversion/profile/parser/duplicate/parallel-list foundation | MERGED — PR #1184
- TASK-007..TASK-013 | XML hierarchy, persistent identity, candidate outcomes/cardinality, semantic PIPE, coordinate frame, common-support topology | MERGED — PR #1184; Phase 1 lineage hardening re-grounded in PR #1188
- TASK-014..TASK-020 | component/load event semantics, structured event ledger, deterministic remarks, Hold exclusion and suppressed-field policy | MERGED — PR #1184; Phase 1 line-change projection hardened in PR #1188
- TASK-021..TASK-024 | later-revision output/audit/staged UI/review | MERGED — PR #1184
- TASK-025 | owner benchmark behaviors | IN_PROGRESS — real R2/R3 benchmark now available; Phase 1 qualified on isolated evidence branch and re-grounded on current main; Phases 2..4 not started
- TASK-026 | surgical implementation/no competing authorities | PRESERVED — governed categorized XML/graph remains comparison authority
- TASK-027 | owner-only merge | PRESERVED — PR #1188 draft; merge not authorized

# Owner post-merge rules

- SUPPORT_LOCATION_IDENTITY = `CIVIL SECONDARY SUPPORT (Tag provided by Civil) + PIPE`; Civil alone is not a unique item.
- PIPE may change across revisions. In that case continuity requires stronger lineage evidence such as persistent primary-support references plus corroboration; the changed PIPE is state, not identity proof.
- PREV NAME carries explicit supporting weight but cannot establish lineage alone.
- SIZE (BORE) must be compatible for approximate lineage; a known mismatch hard-rejects the candidate.
- Coordinate deltas are auditable weighted evidence only after a trustworthy revision frame is established from >=3 anchors and >=2 validated axes.
- R3 remarks are benchmark oracle labels only and are removed from comparison input. Unsupported/non-mechanically-checkable labels such as HOLD are excluded from scoring.
- Benchmark buckets are sequential: Phase 1 `PS No. change`; Phase 2 `Support location change`; Phase 3 `Load change`; Phase 4 `Total no of support change`.

# Input ledger

- INPUT-001 | Issue #1181 full specification | AVAILABLE
- INPUT-002 | Table-to-Categorized-XML contracts/tests | AVAILABLE
- INPUT-003 | XML Compare candidate/review contracts | AVAILABLE; `XmlCompareCandidatePairModel` reuse retained
- INPUT-004 | Owner real benchmark | AVAILABLE | `benchmarks/R2.zip` earlier vs `benchmarks/R3.zip` later
- INPUT-005 | Support Report export patterns | AVAILABLE

# Benchmark ledger

- PHASE-1 | `PS No. change` | PRIOR_ISOLATED_PASS / CURRENT_HEAD_NOT_RUN
  - prior evidence: GitHub Actions run 34499007825, head d5b83646b29550ff6ee29b29c9b98c6ec0387c0c
  - real R2->R3: expected 1; detected 1; TP 1; FP 0; FN 0; precision 1; recall 1; F1 1
  - clean delivery: PR #1188 head material commit ad0906521f15423d025b7d68b25f8cc2c15a36b8 based directly on current main
  - exact clean-head execution: NOT_RUN; no PR workflow run / no connector dispatch action
- PHASE-2 | `Support location change` | NOT_STARTED
- PHASE-3 | `Load change` | NOT_STARTED
- PHASE-4 | `Total no of support change` | NOT_STARTED

# Current delivery status

ENGINEERING_STATE: PHASE1_IMPLEMENTED_PHASE2_NOT_STARTED
CUSTODY_STATE: HELD
WRITE_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_AUTHORIZED_ISSUE_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
PR: 1188
PR_STATUS: OPEN_DRAFT_MERGEABLE
BRANCH: issue-1181-phase1-current-main
MATERIAL_HEAD: ad0906521f15423d025b7d68b25f8cc2c15a36b8
MAIN_OBSERVED: 419c94cca7649626e0b3e641f20d5261967347ba
LATEST_MATERIAL_LEG: LEG-007
CURRENT_HEAD_VALIDATION: NOT_RUN
PRIOR_PHASE1_QUALIFICATION: PASS_EVIDENCE_ONLY
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP0008_PUBLICATION
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5615807778
ISSUE_HANDOVER_SYNC_STATUS: REPOSITORY_UPDATED_ISSUE_SYNC_PENDING
CONTROL_PLANE_RECOVERY: PR #1187/stale salvage history is retained only as Phase 1 qualification evidence; clean current-main delivery is PR #1188
ENVIRONMENT_LIMITATION: no current-head PR workflow run and no workflow-dispatch connector action; workflow files remain unmodified without owner authorization
LOCAL_BACKUP_WORKLOG_DEFICIT: Git blob pre-images available; repository-local backup/.agent-worklogs unavailable in connector-only execution
EXACT_NEXT_ACTION: publish EP-CSVRC-0008 to issue #1181, update mutable Active Handover, record comment ID/sync IN_SYNC, then stop. Next exact `proceed next` starts Phase 2 Support location change.
